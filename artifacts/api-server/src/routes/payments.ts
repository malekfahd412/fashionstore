import { Router, type IRouter } from "express";
import crypto from "node:crypto";
import { db, paymentsTable, ordersTable, usersTable, storeSettingsTable, notificationsTable, manualPaymentsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { requireAuth, requireRole } from "../middlewares/auth";
import { logger } from "../lib/logger";
import { sendPaymentSuccessEmail, sendPaymentFailedEmail } from "../lib/email";

const router: IRouter = Router();

const PAYMOB_API_BASE = "https://accept.paymob.com/api";

async function getSetting(key: string): Promise<string> {
  const [row] = await db.select().from(storeSettingsTable).where(eq(storeSettingsTable.key, key));
  return row?.value ?? "";
}

// ── Step 1: Authenticate with Paymob ─────────────────────────────────────────
async function paymobAuthenticate(): Promise<string> {
  const apiKey = process.env.PAYMOB_API_KEY;
  if (!apiKey) throw new Error("PAYMOB_API_KEY not configured");
  const res = await fetch(`${PAYMOB_API_BASE}/auth/tokens`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ api_key: apiKey }),
  });
  const data = await res.json() as { token?: string };
  if (!data.token) throw new Error("Paymob authentication failed");
  return data.token;
}

// ── Step 2: Register order with Paymob ────────────────────────────────────────
async function paymobCreateOrder(token: string, amountCents: number, merchantOrderId: number): Promise<number> {
  const res = await fetch(`${PAYMOB_API_BASE}/ecommerce/orders`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      auth_token: token,
      delivery_needed: false,
      amount_cents: amountCents,
      currency: "EGP",
      merchant_order_id: String(merchantOrderId),
      items: [],
    }),
  });
  const data = await res.json() as { id?: number };
  if (!data.id) throw new Error("Paymob order creation failed");
  return data.id;
}

// ── Step 3: Get payment key ────────────────────────────────────────────────────
async function paymobPaymentKey(
  token: string,
  paymobOrderId: number,
  amountCents: number,
  integrationId: string,
  billingData: Record<string, string>
): Promise<string> {
  const res = await fetch(`${PAYMOB_API_BASE}/acceptance/payment_keys`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      auth_token: token,
      amount_cents: amountCents,
      expiration: 3600,
      order_id: paymobOrderId,
      billing_data: {
        apartment: "N/A",
        email: billingData.email,
        floor: "N/A",
        first_name: billingData.firstName,
        street: billingData.address ?? "N/A",
        building: "N/A",
        phone_number: billingData.phone,
        shipping_method: "PKG",
        postal_code: "N/A",
        city: billingData.city ?? "Cairo",
        country: "EG",
        last_name: billingData.lastName,
        state: billingData.city ?? "Cairo",
      },
      currency: "EGP",
      integration_id: parseInt(integrationId, 10),
      lock_order_when_paid: false,
    }),
  });
  const data = await res.json() as { token?: string };
  if (!data.token) throw new Error("Paymob payment key creation failed");
  return data.token;
}

interface BillingData {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
}

// ── POST /payments/paymob/initiate ────────────────────────────────────────────
router.post("/payments/paymob/initiate", requireAuth, async (req, res): Promise<void> => {
  const { orderId, method = "card", billingData = {} } = req.body as {
    orderId?: number;
    method?: "card" | "meeza" | "vodafone";
    billingData?: BillingData;
  };

  if (!orderId) { res.status(400).json({ error: "orderId is required" }); return; }

  // Validate order belongs to this user
  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId));
  if (!order) { res.status(404).json({ error: "Order not found" }); return; }
  if (order.userId !== req.user!.id) { res.status(403).json({ error: "Forbidden" }); return; }

  // Get integration IDs from settings
  const integrationIdMap: Record<string, string> = {
    card: await getSetting("paymob_integration_id_card"),
    meeza: await getSetting("paymob_integration_id_meeza"),
    vodafone: await getSetting("paymob_integration_id_vodafone"),
  };
  const iframeId = await getSetting("paymob_iframe_id");
  const integrationId = integrationIdMap[method] || integrationIdMap.card;

  if (!integrationId) {
    res.status(503).json({ error: `Paymob integration ID for '${method}' not configured. Configure it in Admin → Settings.` });
    return;
  }

  const amountCents = Math.round(Number(order.totalPrice) * 100);

  // Get user info for billing
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.user!.id));
  const bill: BillingData = {
    firstName: billingData.firstName ?? user?.name?.split(" ")[0] ?? "Customer",
    lastName: billingData.lastName ?? (user?.name?.split(" ").slice(1).join(" ") || "N/A"),
    email: billingData.email ?? user?.email ?? "customer@example.com",
    phone: billingData.phone ?? "+201000000000",
    address: billingData.address ?? "N/A",
    city: billingData.city ?? "Cairo",
  };

  try {
    // 3-step Paymob flow
    const authToken = await paymobAuthenticate();
    const paymobOrderId = await paymobCreateOrder(authToken, amountCents, orderId);
    const paymentToken = await paymobPaymentKey(authToken, paymobOrderId, amountCents, integrationId, bill as Record<string, string>);

    // Persist pending payment record
    await db.insert(paymentsTable).values({
      orderId,
      paymobOrderId,
      status: "pending",
      amountCents,
      currency: "EGP",
      method,
    });

    const checkoutUrl = iframeId
      ? `https://accept.paymob.com/api/acceptance/iframes/${iframeId}?payment_token=${paymentToken}`
      : `https://accept.paymob.com/api/acceptance/iframes/default?payment_token=${paymentToken}`;

    res.json({ checkoutUrl, paymentToken, paymobOrderId });
  } catch (err) {
    logger.error({ err }, "Paymob initiation failed");
    res.status(502).json({ error: (err as Error).message ?? "Payment initiation failed" });
  }
});

// ── POST /payments/paymob/webhook ─────────────────────────────────────────────
// Paymob sends a POST with transaction data + HMAC signature
router.post("/payments/paymob/webhook", async (req, res): Promise<void> => {
  const hmacSecret = process.env.PAYMOB_HMAC_SECRET;
  const reqHmac = (req.query.hmac ?? req.body?.hmac) as string | undefined;

  if (hmacSecret) {
    if (!reqHmac) {
      logger.warn("Paymob webhook received without HMAC signature — rejecting");
      res.status(401).json({ error: "Missing HMAC signature" }); return;
    }
    // Verify HMAC-SHA512
    const body = req.body as Record<string, unknown>;
    const obj = body?.obj as Record<string, unknown> ?? {};
    const concatStr = [
      obj.amount_cents,
      obj.created_at,
      obj.currency,
      (obj.error_occured as boolean)?.toString(),
      (obj.has_parent_transaction as boolean)?.toString(),
      obj.id,
      (obj.integration_id as number)?.toString(),
      (obj.is_3d_secure as boolean)?.toString(),
      (obj.is_auth as boolean)?.toString(),
      (obj.is_capture as boolean)?.toString(),
      (obj.is_refunded as boolean)?.toString(),
      (obj.is_standalone_payment as boolean)?.toString(),
      (obj.is_voided as boolean)?.toString(),
      obj.order,
      obj.owner,
      obj.pending,
      obj.source_data_pan,
      obj.source_data_sub_type,
      obj.source_data_type,
      obj.success,
    ].join("");
    const computed = crypto.createHmac("sha512", hmacSecret).update(concatStr).digest("hex");
    if (computed !== reqHmac) {
      logger.warn({ reqHmac }, "Paymob webhook HMAC mismatch");
      res.status(401).json({ error: "Invalid HMAC" }); return;
    }
  } else {
    const isProduction = (process.env.NODE_ENV ?? "development") === "production";
    if (isProduction) {
      logger.error("PAYMOB_HMAC_SECRET is not set in production — rejecting unverified webhook");
      res.status(503).json({ error: "Webhook verification is not configured. Set PAYMOB_HMAC_SECRET." }); return;
    }
    logger.warn("PAYMOB_HMAC_SECRET not set — webhook HMAC verification skipped (required in production)");
  }

  const body = req.body as { type?: string; obj?: Record<string, unknown> };
  if (body.type !== "TRANSACTION") { res.json({ received: true }); return; }

  const txn = body.obj ?? {};
  const transactionId = txn.id as number;
  const success = txn.success as boolean;
  const paymobOrderId = (txn.order as { id?: number })?.id;
  const amountCents = txn.amount_cents as number;
  const method = (txn.source_data as { type?: string })?.type ?? "card";

  // Find our payment record
  const [payment] = paymobOrderId
    ? await db.select().from(paymentsTable).where(eq(paymentsTable.paymobOrderId, paymobOrderId))
    : [];

  if (payment) {
    const newStatus = success ? "paid" : "failed";
    await db.update(paymentsTable)
      .set({ status: newStatus, transactionId, rawData: txn })
      .where(eq(paymentsTable.id, payment.id));

    if (success) {
      // Find our payment record again to be sure (within the check)
      const [p] = await db.select().from(paymentsTable).where(eq(paymentsTable.id, payment.id));
      if (p.status === "paid") {
        logger.info({ transactionId }, "Paymob webhook: Payment already processed (idempotency)");
        res.json({ received: true });
        return;
      }

      // Advance order to "paid" — aligned with canonical status pipeline
      const [order] = await db.update(ordersTable)
        .set({ status: "paid", paidAt: new Date() })
        .where(eq(ordersTable.id, payment.orderId))
        .returning();

      if (order) {
        const [user] = await db.select({
          email: usersTable.email,
          name: usersTable.name,
          emailPreferences: usersTable.emailPreferences,
        }).from(usersTable).where(eq(usersTable.id, order.userId));

        if (user) {
          // In-app notification (same pattern as orders.ts status updates)
          db.insert(notificationsTable).values({
            userId: order.userId,
            title: "Payment Confirmed",
            message: `Your payment for order #${order.id} was successful. We're processing your order now.`,
          }).catch(() => {});

          // Respect customer email preferences — orderUpdates defaults to true
          const wantsOrderUpdates = user.emailPreferences?.orderUpdates !== false;
          if (wantsOrderUpdates) {
            sendPaymentSuccessEmail(
              user.email,
              user.name,
              order.id,
              Number(order.totalPrice),
              method
            ).catch(() => {});
          }
        }
      }
    } else {
      // Payment failed — notify customer
      if (payment) {
        const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, payment.orderId));
        if (order) {
          const [user] = await db.select({
            email: usersTable.email,
            name: usersTable.name,
            emailPreferences: usersTable.emailPreferences,
          }).from(usersTable).where(eq(usersTable.id, order.userId));

          if (user) {
            // In-app notification for failed payment
            db.insert(notificationsTable).values({
              userId: order.userId,
              title: "Payment Failed",
              message: `Your payment for order #${order.id} could not be processed. Please try again.`,
            }).catch(() => {});

            // Email notification (gated on preferences)
            const wantsOrderUpdates = user.emailPreferences?.orderUpdates !== false;
            if (wantsOrderUpdates) {
              sendPaymentFailedEmail(
                user.email,
                user.name,
                order.id,
                Number(order.totalPrice)
              ).catch(() => {});
            }
          }
        }
      }
    }
  }

  logger.info({ transactionId, success, paymobOrderId, amountCents, method }, "Paymob webhook processed");
  res.json({ received: true });
});

// ── GET /payments/manual/settings (public) ───────────────────────────────────
router.get("/payments/manual/settings", async (_req, res): Promise<void> => {
  const keys = [
    "payment_vodafone_cash_enabled", "vodafone_cash_number",
    "payment_etisalat_cash_enabled", "etisalat_cash_number",
    "payment_instapay_enabled", "instapay_address",
    "paymob_integration_id_card",
  ];
  const map: Record<string, string> = {};
  for (const k of keys) {
    const [row] = await db.select().from(storeSettingsTable).where(eq(storeSettingsTable.key, k));
    map[k] = row?.value ?? "";
  }
  res.json({
    vodafone_cash_enabled: map.payment_vodafone_cash_enabled === "true",
    vodafone_cash_number: map.vodafone_cash_number,
    etisalat_cash_enabled: map.payment_etisalat_cash_enabled === "true",
    etisalat_cash_number: map.etisalat_cash_number,
    instapay_enabled: map.payment_instapay_enabled === "true",
    instapay_address: map.instapay_address,
    paymob_enabled: !!(map.paymob_integration_id_card),
  });
});

// ── POST /payments/manual ──────────────────────────────────────────────────
router.post("/payments/manual", requireAuth, async (req, res): Promise<void> => {
  const { orderId, method, referenceNumber } = req.body as {
    orderId?: number;
    method?: string;
    referenceNumber?: string | null;
  };

  if (!orderId || !method) {
    res.status(400).json({ error: "orderId and method are required" }); return;
  }

  const VALID_METHODS = ["vodafone_cash", "etisalat_cash", "instapay"];
  if (!VALID_METHODS.includes(method)) {
    res.status(400).json({ error: "Invalid manual payment method" }); return;
  }

  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId));
  if (!order) { res.status(404).json({ error: "Order not found" }); return; }
  if (order.userId !== req.user!.id) { res.status(403).json({ error: "Forbidden" }); return; }

  const [existing] = await db.select().from(manualPaymentsTable).where(eq(manualPaymentsTable.orderId, orderId));
  if (existing) {
    const [updated] = await db.update(manualPaymentsTable)
      .set({ referenceNumber: referenceNumber ?? null, method, status: "pending" })
      .where(eq(manualPaymentsTable.orderId, orderId))
      .returning();
    res.json(updated); return;
  }

  const [record] = await db.insert(manualPaymentsTable).values({
    orderId,
    method,
    referenceNumber: referenceNumber ?? null,
    status: "pending",
  }).returning();

  res.status(201).json(record);
});

// ── GET /payments/my — Customer payment history ───────────────────────────────
router.get("/payments/my", requireAuth, async (req, res): Promise<void> => {
  const userId = req.user!.id;

  const paymobPayments = await db
    .select({
      id: paymentsTable.id,
      orderId: paymentsTable.orderId,
      amountCents: paymentsTable.amountCents,
      currency: paymentsTable.currency,
      status: paymentsTable.status,
      method: paymentsTable.method,
      createdAt: paymentsTable.createdAt,
    })
    .from(paymentsTable)
    .innerJoin(ordersTable, eq(paymentsTable.orderId, ordersTable.id))
    .where(eq(ordersTable.userId, userId))
    .orderBy(desc(paymentsTable.createdAt));

  const manualPayments = await db
    .select({
      id: manualPaymentsTable.id,
      orderId: manualPaymentsTable.orderId,
      method: manualPaymentsTable.method,
      status: manualPaymentsTable.status,
      referenceNumber: manualPaymentsTable.referenceNumber,
      adminNote: manualPaymentsTable.adminNote,
      createdAt: manualPaymentsTable.createdAt,
      orderTotal: ordersTable.totalPrice,
    })
    .from(manualPaymentsTable)
    .innerJoin(ordersTable, eq(manualPaymentsTable.orderId, ordersTable.id))
    .where(eq(ordersTable.userId, userId))
    .orderBy(desc(manualPaymentsTable.createdAt));

  res.json({ paymob: paymobPayments, manual: manualPayments });
});

// ── GET /admin/payments/manual ────────────────────────────────────────────
router.get("/admin/payments/manual", requireAuth, requireRole("admin"), async (req, res): Promise<void> => {
  const status = req.query.status as string | undefined;

  let query = db.select({
    id: manualPaymentsTable.id,
    orderId: manualPaymentsTable.orderId,
    method: manualPaymentsTable.method,
    referenceNumber: manualPaymentsTable.referenceNumber,
    status: manualPaymentsTable.status,
    adminNote: manualPaymentsTable.adminNote,
    reviewedBy: manualPaymentsTable.reviewedBy,
    reviewedAt: manualPaymentsTable.reviewedAt,
    createdAt: manualPaymentsTable.createdAt,
    orderTotal: ordersTable.totalPrice,
    userName: usersTable.name,
    userEmail: usersTable.email,
  })
  .from(manualPaymentsTable)
  .leftJoin(ordersTable, eq(ordersTable.id, manualPaymentsTable.orderId))
  .leftJoin(usersTable, eq(usersTable.id, ordersTable.userId))
  .orderBy(desc(manualPaymentsTable.createdAt))
  .$dynamic();

  const payments = await query;
  const filtered = status ? payments.filter(p => p.status === status) : payments;

  res.json({ payments: filtered, total: filtered.length });
});

// ── PATCH /admin/payments/manual/:id ─────────────────────────────────────
router.patch("/admin/payments/manual/:id", requireAuth, requireRole("admin"), async (req, res): Promise<void> => {
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }

  const { status, adminNote } = req.body as { status?: "approved" | "rejected"; adminNote?: string | null };
  if (!status || !["approved", "rejected"].includes(status)) {
    res.status(400).json({ error: "status must be 'approved' or 'rejected'" }); return;
  }

  const [existing] = await db.select().from(manualPaymentsTable).where(eq(manualPaymentsTable.id, id));
  if (!existing) { res.status(404).json({ error: "Manual payment not found" }); return; }

  const [updated] = await db.update(manualPaymentsTable)
    .set({
      status,
      adminNote: adminNote ?? null,
      reviewedBy: req.user!.id,
      reviewedAt: new Date(),
    })
    .where(eq(manualPaymentsTable.id, id))
    .returning();

  if (status === "approved") {
    await db.update(ordersTable)
      .set({ status: "processing" })
      .where(eq(ordersTable.id, existing.orderId));
  }

  res.json(updated);
});

export default router;
