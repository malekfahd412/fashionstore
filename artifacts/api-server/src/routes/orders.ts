import { Router, type IRouter } from "express";
import { db, ordersTable, orderItemsTable, productVariantsTable, productsTable, productImagesTable, usersTable, notificationsTable, couponsTable, paymentsTable } from "@workspace/db";
import { eq, and, SQL, desc, inArray, gt, isNull } from "drizzle-orm";
import { requireAuth, requireRole } from "../middlewares/auth";
import { CreateOrderBody, GetOrderParams, UpdateOrderStatusParams, UpdateOrderStatusBody, ListOrdersQueryParams } from "@workspace/api-zod";
import { auditLog } from "../lib/audit";
import { sendOrderConfirmationEmail, sendOrderStatusEmail, sendVendorNewOrderEmail } from "../lib/email";

const router: IRouter = Router();

// ── Batch-enrichment for orders (eliminates N+1) ──────────────────────────────
async function batchEnrichOrders(orders: (typeof ordersTable.$inferSelect)[]) {
  if (orders.length === 0) return [];
  const orderIds = orders.map(o => o.id);
  const userIds = [...new Set(orders.map(o => o.userId))];

  const [allItems, allUsers] = await Promise.all([
    db.select().from(orderItemsTable).where(inArray(orderItemsTable.orderId, orderIds)),
    db.select({ id: usersTable.id, name: usersTable.name }).from(usersTable).where(inArray(usersTable.id, userIds)),
  ]);

  const variantIds = [...new Set(allItems.map(i => i.productVariantId))];
  const variants = variantIds.length
    ? await db.select().from(productVariantsTable).where(inArray(productVariantsTable.id, variantIds))
    : [];

  const productIds = [...new Set(variants.map(v => v.productId))];
  const [products, images] = productIds.length
    ? await Promise.all([
        db.select({ id: productsTable.id, nameEn: productsTable.nameEn, nameAr: productsTable.nameAr, vendorId: productsTable.vendorId }).from(productsTable).where(inArray(productsTable.id, productIds)),
        db.select().from(productImagesTable).where(and(inArray(productImagesTable.productId, productIds), eq(productImagesTable.isPrimary, true))),
      ])
    : [[], []];

  // Fetch latest payment record per order to derive paymentStatus
  const allPayments = orderIds.length
    ? await db.select({ orderId: paymentsTable.orderId, status: paymentsTable.status, createdAt: paymentsTable.createdAt })
        .from(paymentsTable)
        .where(inArray(paymentsTable.orderId, orderIds))
        .orderBy(desc(paymentsTable.createdAt))
    : [];

  // Keep only the most recent payment per order
  const latestPaymentByOrder = new Map<number, string>();
  for (const p of allPayments) {
    if (!latestPaymentByOrder.has(p.orderId)) latestPaymentByOrder.set(p.orderId, p.status);
  }

  const variantMap = new Map(variants.map(v => [v.id, v]));
  const productMap = new Map(products.map(p => [p.id, p]));
  const imageMap = new Map(images.map(img => [img.productId, img.imageUrl]));
  const userMap = new Map(allUsers.map(u => [u.id, u.name]));
  const itemsByOrder = new Map<number, typeof allItems>();
  for (const item of allItems) {
    if (!itemsByOrder.has(item.orderId)) itemsByOrder.set(item.orderId, []);
    itemsByOrder.get(item.orderId)!.push(item);
  }

  return orders.map(order => {
    let paymentStatus: string;
    if (order.paymentMethod === "cash_on_delivery") {
      paymentStatus = "cod";
    } else {
      const ps = latestPaymentByOrder.get(order.id);
      paymentStatus = ps === "paid" ? "paid" : ps === "failed" ? "failed" : "pending";
    }
    return {
    ...order,
    totalPrice: Number(order.totalPrice),
    discount: order.discount ? Number(order.discount) : null,
    userName: userMap.get(order.userId) ?? "",
    paymentStatus,
    items: (itemsByOrder.get(order.id) ?? []).map(item => {
      const variant = variantMap.get(item.productVariantId);
      const product = variant ? productMap.get(variant.productId) : null;
      return {
        id: item.id,
        productId: product?.id ?? 0,
        productNameEn: product?.nameEn ?? "",
        productNameAr: product?.nameAr ?? "",
        nameEn: product?.nameEn ?? "",
        nameAr: product?.nameAr ?? "",
        vendorId: product?.vendorId ?? null,
        imageUrl: product ? (imageMap.get(product.id) ?? null) : null,
        color: variant?.color ?? null,
        size: variant?.size ?? null,
        quantity: item.quantity,
        price: Number(item.price),
      };
    }),
  };
  });
}

async function enrichOrder(order: typeof ordersTable.$inferSelect) {
  const [enriched] = await batchEnrichOrders([order]);
  return enriched;
}

router.get("/orders", requireAuth, async (req, res): Promise<void> => {
  const query = ListOrdersQueryParams.safeParse(req.query);
  const { status, userId, page = 1, limit = 20 } = query.success ? query.data : {};
  const conditions: SQL[] = [];
  if (req.user!.role === "customer") conditions.push(eq(ordersTable.userId, req.user!.id));
  else if (userId) conditions.push(eq(ordersTable.userId, Number(userId)));
  if (status) conditions.push(eq(ordersTable.status, status));

  const [orders, total] = await Promise.all([
    db.select().from(ordersTable)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(ordersTable.createdAt))
      .limit(Math.min(Number(limit), 100))
      .offset((Number(page) - 1) * Math.min(Number(limit), 100)),
    db.$count(ordersTable, conditions.length > 0 ? and(...conditions) : undefined),
  ]);
  res.json({ orders: await batchEnrichOrders(orders), total, page: Number(page), limit: Number(limit) });
});

router.get("/orders/:id", requireAuth, async (req, res): Promise<void> => {
  const params = GetOrderParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }
  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, params.data.id));
  if (!order) { res.status(404).json({ error: "Order not found" }); return; }
  if (req.user!.role === "customer" && order.userId !== req.user!.id) { res.status(403).json({ error: "Forbidden" }); return; }
  res.json(await enrichOrder(order));
});

// ── Create order with full ACID transaction ───────────────────────────────────
router.post("/orders", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateOrderBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const { paymentMethod, couponCode, items } = parsed.data;
  if (!items || items.length === 0) { res.status(400).json({ error: "Order must contain at least one item" }); return; }
  if (items.length > 20) { res.status(400).json({ error: "Order cannot exceed 20 distinct items" }); return; }

  let order!: typeof ordersTable.$inferSelect;

  try {
    order = await db.transaction(async (tx) => {
      // ── Step 1: Server-side price + stock lookup (prevents price tampering) ──
      const lineItems: { productVariantId: number; quantity: number; unitPrice: number }[] = [];
      for (const item of items) {
        // Join variant → product to get authoritative price in one query
        const [row] = await tx.select({
          stockQuantity: productVariantsTable.stockQuantity,
          price: productsTable.price,
          salePrice: productsTable.salePrice,
          active: productsTable.active,
        })
          .from(productVariantsTable)
          .innerJoin(productsTable, eq(productsTable.id, productVariantsTable.productId))
          .where(eq(productVariantsTable.id, item.productVariantId));

        if (!row) throw Object.assign(new Error(`Product variant ${item.productVariantId} not found`), { status: 400 });
        if (!row.active) throw Object.assign(new Error(`Product variant ${item.productVariantId} is not available`), { status: 400 });
        if (row.stockQuantity < item.quantity) throw Object.assign(new Error(`Insufficient stock for variant ${item.productVariantId} (available: ${row.stockQuantity})`), { status: 409 });

        // Use server-authoritative price (sale price if set, otherwise list price)
        const unitPrice = Number(row.salePrice ?? row.price);
        lineItems.push({ productVariantId: item.productVariantId, quantity: item.quantity, unitPrice });
      }

      // ── Step 2: Deduct stock ──────────────────────────────────────────────────
      for (const li of lineItems) {
        const [v] = await tx.select({ stockQuantity: productVariantsTable.stockQuantity })
          .from(productVariantsTable).where(eq(productVariantsTable.id, li.productVariantId));
        await tx.update(productVariantsTable)
          .set({ stockQuantity: v!.stockQuantity - li.quantity })
          .where(eq(productVariantsTable.id, li.productVariantId));
      }

      // ── Step 3: Validate and apply coupon ─────────────────────────────────────
      const subtotal = lineItems.reduce((s, li) => s + li.unitPrice * li.quantity, 0);
      let discount = 0;
      if (couponCode) {
        const [coupon] = await tx.select().from(couponsTable).where(
          and(eq(couponsTable.code, couponCode), eq(couponsTable.active, true))
        );
        if (!coupon) throw Object.assign(new Error("Invalid coupon code"), { status: 400 });
        if (coupon.endDate && coupon.endDate < new Date()) throw Object.assign(new Error("Coupon has expired"), { status: 400 });
        if (coupon.usageLimit != null && coupon.usageCount >= coupon.usageLimit) throw Object.assign(new Error("Coupon usage limit reached"), { status: 400 });
        discount = coupon.discountType === "percentage"
          ? Math.min((subtotal * Number(coupon.discountValue)) / 100, subtotal)
          : Math.min(Number(coupon.discountValue), subtotal);
        await tx.update(couponsTable).set({ usageCount: coupon.usageCount + 1 }).where(eq(couponsTable.id, coupon.id));
      }

      // ── Step 4: Insert order + line items ────────────────────────────────────
      const totalPrice = Math.max(0, subtotal - discount);
      const [newOrder] = await tx.insert(ordersTable).values({
        userId: req.user!.id,
        totalPrice: String(totalPrice),
        paymentMethod,
        couponCode: couponCode ?? null,
        discount: String(discount),
        status: "new",
      }).returning();

      await tx.insert(orderItemsTable).values(lineItems.map(li => ({
        orderId: newOrder.id,
        productVariantId: li.productVariantId,
        quantity: li.quantity,
        price: String(li.unitPrice),          // server-authoritative price stored
      })));

      // ── Step 5: Notification ──────────────────────────────────────────────────
      await tx.insert(notificationsTable).values({
        userId: req.user!.id,
        title: "Order Placed",
        message: `Your order #${newOrder.id} has been placed successfully. Total: $${totalPrice.toFixed(2)}`,
      });

      return newOrder;
    });
  } catch (err: unknown) {
    const status = (err as { status?: number }).status ?? 500;
    const message = (err as Error).message ?? "Order creation failed";
    res.status(status).json({ error: message }); return;
  }

  const enriched = await enrichOrder(order);
  res.status(201).json(enriched);

  // Send order confirmation + vendor notifications (non-blocking, after response sent)
  const [customer] = await db.select({ email: usersTable.email, name: usersTable.name, emailPreferences: usersTable.emailPreferences })
    .from(usersTable).where(eq(usersTable.id, order.userId));
  if (customer) {
    type EnrichedItem = { nameEn: string; vendorId: number | null; quantity: number; price: number };
    const emailItems = (enriched.items as EnrichedItem[]).map(i => ({
      nameEn: i.nameEn, quantity: i.quantity, price: i.price,
    }));
    // Respect customer email preferences — orderUpdates defaults to true
    const wantsOrderUpdates = customer.emailPreferences?.orderUpdates !== false;
    if (wantsOrderUpdates) {
      sendOrderConfirmationEmail(customer.email, customer.name, order.id, Number(order.totalPrice), emailItems).catch(() => {});
    }

    // Notify each vendor whose products are in this order (vendor preference not applicable here)
    const vendorIds = [...new Set((enriched.items as EnrichedItem[]).map(i => i.vendorId).filter((v): v is number => v !== null))];
    for (const vid of vendorIds) {
      const [vendor] = await db.select({ email: usersTable.email, name: usersTable.name })
        .from(usersTable).where(eq(usersTable.id, vid));
      if (vendor) {
        const vendorItems = (enriched.items as EnrichedItem[]).filter(i => i.vendorId === vid);
        sendVendorNewOrderEmail(vendor.email, vendor.name, order.id, vendorItems.length, Number(order.totalPrice)).catch(() => {});
      }
    }
  }
});

// ── Update order status ───────────────────────────────────────────────────────
router.patch("/orders/:id", requireAuth, requireRole("admin", "vendor"), async (req, res): Promise<void> => {
  const params = UpdateOrderStatusParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }
  const parsed = UpdateOrderStatusBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [before] = await db.select().from(ordersTable).where(eq(ordersTable.id, params.data.id));
  if (!before) { res.status(404).json({ error: "Order not found" }); return; }

  const newStatus = parsed.data.status;
  const { trackingNote } = req.body as { trackingNote?: string };
  const statusTimestamps: Partial<typeof ordersTable.$inferInsert> = {};
  if (newStatus === "paid") statusTimestamps.paidAt = new Date();
  else if (newStatus === "processing") statusTimestamps.processingAt = new Date();
  else if (newStatus === "packed") statusTimestamps.packedAt = new Date();
  else if (newStatus === "shipped") statusTimestamps.shippedAt = new Date();
  else if (newStatus === "out_for_delivery") statusTimestamps.outForDeliveryAt = new Date();
  else if (newStatus === "delivered") statusTimestamps.deliveredAt = new Date();

  const [order] = await db.update(ordersTable)
    .set({ status: newStatus, ...statusTimestamps, ...(trackingNote !== undefined ? { trackingNote } : {}) })
    .where(eq(ordersTable.id, params.data.id))
    .returning();

  await Promise.all([
    db.insert(notificationsTable).values({
      userId: order.userId,
      title: "Order Status Updated",
      message: `Your order #${order.id} status changed to: ${parsed.data.status}`,
    }),
    auditLog(req, "UPDATE", "order", order.id, { status: before.status }, { status: parsed.data.status }),
  ]);

  res.json(await enrichOrder(order));

  // Send status update email (non-blocking, after response sent)
  const [customer] = await db.select({ email: usersTable.email, name: usersTable.name, emailPreferences: usersTable.emailPreferences })
    .from(usersTable).where(eq(usersTable.id, order.userId));
  if (customer) {
    // Respect customer email preferences — orderUpdates defaults to true
    const wantsOrderUpdates = customer.emailPreferences?.orderUpdates !== false;
    if (wantsOrderUpdates) {
      sendOrderStatusEmail(customer.email, customer.name, order.id, parsed.data.status).catch(() => {});
    }
  }
});

export default router;
