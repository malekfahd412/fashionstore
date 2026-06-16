import { Router, type IRouter } from "express";
import {
  db,
  cartItemsTable,
  productVariantsTable,
  productsTable,
  usersTable,
  ordersTable,
  abandonedCartRemindersTable,
  storeSettingsTable,
  userAddressesTable,
  newsletterSubscribersTable,
} from "@workspace/db";
import { eq, lt, sql, and, desc, isNull, count, gte } from "drizzle-orm";
import { requireAuth, requireRole } from "../middlewares/auth";
import { sendAbandonedCartEmail } from "../lib/email";
import { sendAbandonedCartWhatsApp } from "../lib/whatsapp";

const router: IRouter = Router();

async function getThresholdHours(): Promise<number> {
  const [row] = await db
    .select({ value: storeSettingsTable.value })
    .from(storeSettingsTable)
    .where(eq(storeSettingsTable.key, "abandoned_cart_threshold_hours"));
  const h = Number(row?.value ?? "1");
  return isNaN(h) || h < 0.1 ? 1 : h;
}

async function isAbandonedCartEnabled(): Promise<boolean> {
  const [row] = await db
    .select({ value: storeSettingsTable.value })
    .from(storeSettingsTable)
    .where(eq(storeSettingsTable.key, "abandoned_cart_enabled"));
  return (row?.value ?? "true") === "true";
}

// ── Admin: list abandoned carts ──────────────────────────────────────────────
router.get("/abandoned-carts/admin", requireAuth, requireRole("admin"), async (req, res): Promise<void> => {
  const thresholdHours = await getThresholdHours();
  const thresholdDate = new Date(Date.now() - thresholdHours * 60 * 60 * 1000);

  // Users with cart items not updated since threshold, grouped by user
  const cartRows = await db
    .select({
      userId: cartItemsTable.userId,
      itemCount: count(cartItemsTable.id),
      lastActivity: sql<string>`MAX(${cartItemsTable.updatedAt})`,
    })
    .from(cartItemsTable)
    .where(lt(cartItemsTable.updatedAt, thresholdDate))
    .groupBy(cartItemsTable.userId);

  if (!cartRows.length) { res.json({ carts: [], stats: { total: 0, emailSent: 0, recovered: 0, thresholdHours } }); return; }

  const userIds = cartRows.map((r) => r.userId);

  // Filter out users who placed an order after last cart activity
  const recentOrders = await db
    .select({ userId: ordersTable.userId })
    .from(ordersTable)
    .where(and(
      sql`${ordersTable.userId} = ANY(${sql`ARRAY[${sql.join(userIds.map(id => sql`${id}`), sql`, `)}]`})`,
      gte(ordersTable.createdAt, thresholdDate),
    ));
  const usersWithRecentOrders = new Set(recentOrders.map((o) => o.userId));

  const abandonedUserIds = userIds.filter((id) => !usersWithRecentOrders.has(id));
  if (!abandonedUserIds.length) { res.json({ carts: [], stats: { total: 0, emailSent: 0, recovered: 0, thresholdHours } }); return; }

  const users = await db
    .select({ id: usersTable.id, name: usersTable.name, email: usersTable.email })
    .from(usersTable)
    .where(sql`${usersTable.id} = ANY(${sql`ARRAY[${sql.join(abandonedUserIds.map(id => sql`${id}`), sql`, `)}]`})`);

  const reminders = await db
    .select()
    .from(abandonedCartRemindersTable)
    .where(sql`${abandonedCartRemindersTable.userId} = ANY(${sql`ARRAY[${sql.join(abandonedUserIds.map(id => sql`${id}`), sql`, `)}]`})`);

  const reminderMap = new Map(reminders.map((r) => [r.userId, r]));
  const userMap = new Map(users.map((u) => [u.id, u]));

  const carts = cartRows
    .filter((r) => abandonedUserIds.includes(r.userId))
    .map((r) => {
      const user = userMap.get(r.userId);
      const reminder = reminderMap.get(r.userId);
      return {
        userId: r.userId,
        userName: user?.name ?? "Unknown",
        userEmail: user?.email ?? "",
        itemCount: Number(r.itemCount),
        lastActivity: r.lastActivity,
        emailSentAt: reminder?.emailSentAt ?? null,
        whatsappSentAt: reminder?.whatsappSentAt ?? null,
        recoveredAt: reminder?.recoveredAt ?? null,
        recovered: !!reminder?.recoveredAt,
      };
    })
    .sort((a, b) => new Date(a.lastActivity).getTime() - new Date(b.lastActivity).getTime());

  const emailSent = carts.filter((c) => c.emailSentAt).length;
  const recovered = carts.filter((c) => c.recovered).length;

  res.json({
    carts,
    stats: { total: carts.length, emailSent, recovered, thresholdHours },
  });
});

// ── Admin: send per-user recovery reminder ───────────────────────────────────
router.post("/abandoned-carts/admin/send-reminder", requireAuth, requireRole("admin"), async (req, res): Promise<void> => {
  const { userId, type } = req.body as { userId?: number; type?: "email" | "whatsapp" };
  if (!userId || !type) { res.status(400).json({ error: "userId and type required" }); return; }

  const [user] = await db.select({ id: usersTable.id, name: usersTable.name, email: usersTable.email })
    .from(usersTable).where(eq(usersTable.id, userId));
  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  const appUrl = process.env.APP_URL ?? "";
  const cartUrl = `${appUrl}/cart`;

  if (type === "email") {
    await sendAbandonedCartEmail(user.email, user.name, 0, cartUrl).catch(() => {});
    await db.insert(abandonedCartRemindersTable)
      .values({ userId: user.id, cartItemsCount: 0, emailSentAt: new Date() })
      .onConflictDoUpdate({ target: abandonedCartRemindersTable.userId, set: { emailSentAt: new Date() } });
  } else {
    const [addr] = await db.select({ phone: userAddressesTable.phone }).from(userAddressesTable)
      .where(eq(userAddressesTable.userId, user.id)).limit(1);
    await sendAbandonedCartWhatsApp(addr?.phone, cartUrl);
    await db.insert(abandonedCartRemindersTable)
      .values({ userId: user.id, cartItemsCount: 0, whatsappSentAt: new Date() })
      .onConflictDoUpdate({ target: abandonedCartRemindersTable.userId, set: { whatsappSentAt: new Date() } });
  }
  res.json({ ok: true });
});

// ── Admin: send bulk recovery reminders ─────────────────────────────────────
router.post("/abandoned-carts/admin/send-reminders", requireAuth, requireRole("admin"), async (req, res): Promise<void> => {
  const enabled = await isAbandonedCartEnabled();
  if (!enabled) { res.status(400).json({ error: "Abandoned cart recovery is disabled" }); return; }

  const thresholdHours = await getThresholdHours();
  const thresholdDate = new Date(Date.now() - thresholdHours * 60 * 60 * 1000);

  const cartRows = await db
    .select({
      userId: cartItemsTable.userId,
      itemCount: count(cartItemsTable.id),
    })
    .from(cartItemsTable)
    .where(lt(cartItemsTable.updatedAt, thresholdDate))
    .groupBy(cartItemsTable.userId);

  if (!cartRows.length) { res.json({ sent: 0, skipped: 0 }); return; }

  const userIds = cartRows.map((r) => r.userId);

  // Exclude already-sent + recovered
  const existing = await db
    .select()
    .from(abandonedCartRemindersTable)
    .where(sql`${abandonedCartRemindersTable.userId} = ANY(${sql`ARRAY[${sql.join(userIds.map(id => sql`${id}`), sql`, `)}]`})`);
  const alreadySent = new Set(
    existing.filter((r) => r.emailSentAt || r.recoveredAt).map((r) => r.userId)
  );

  const toProcess = cartRows.filter((r) => !alreadySent.has(r.userId));
  if (!toProcess.length) { res.json({ sent: 0, skipped: existing.length }); return; }

  const toProcessIds = toProcess.map((r) => r.userId);

  // Check newsletter opt-in (only send to subscribers)
  const users = await db
    .select({ id: usersTable.id, name: usersTable.name, email: usersTable.email })
    .from(usersTable)
    .where(sql`${usersTable.id} = ANY(${sql`ARRAY[${sql.join(toProcessIds.map(id => sql`${id}`), sql`, `)}]`})`);

  const subscribers = await db
    .select({ email: newsletterSubscribersTable.email })
    .from(newsletterSubscribersTable)
    .where(eq(newsletterSubscribersTable.active, true));
  const subscribedEmails = new Set(subscribers.map((s) => s.email));

  const addresses = await db
    .select({ userId: userAddressesTable.userId, phone: userAddressesTable.phone })
    .from(userAddressesTable)
    .where(sql`${userAddressesTable.userId} = ANY(${sql`ARRAY[${sql.join(toProcessIds.map(id => sql`${id}`), sql`, `)}]`})`);
  const phoneMap = new Map<number, string>();
  for (const a of addresses) {
    if (!phoneMap.has(a.userId)) phoneMap.set(a.userId, a.phone);
  }

  let sent = 0;
  const appUrl = process.env.APP_URL ?? "";
  const cartUrl = `${appUrl}/cart`;

  for (const user of users) {
    const isOptedIn = subscribedEmails.has(user.email);
    if (!isOptedIn) continue;

    const itemCount = toProcess.find((r) => r.userId === user.id)?.itemCount ?? 0;

    await sendAbandonedCartEmail(user.email, user.name, Number(itemCount), cartUrl).catch(() => {});
    await sendAbandonedCartWhatsApp(phoneMap.get(user.id), cartUrl);

    await db
      .insert(abandonedCartRemindersTable)
      .values({ userId: user.id, cartItemsCount: Number(itemCount), emailSentAt: new Date() })
      .onConflictDoUpdate({
        target: abandonedCartRemindersTable.userId,
        set: { emailSentAt: new Date(), cartItemsCount: Number(itemCount) },
      });

    sent++;
  }

  res.json({ sent, skipped: cartRows.length - toProcess.length + (toProcess.length - sent) });
});

// ── Admin: mark cart as recovered ───────────────────────────────────────────
router.post("/abandoned-carts/admin/:userId/recover", requireAuth, requireRole("admin"), async (req, res): Promise<void> => {
  const userId = Number(req.params.userId);
  if (!userId) { res.status(400).json({ error: "Invalid userId" }); return; }
  await db
    .insert(abandonedCartRemindersTable)
    .values({ userId, cartItemsCount: 0, recoveredAt: new Date() })
    .onConflictDoUpdate({
      target: abandonedCartRemindersTable.userId,
      set: { recoveredAt: new Date() },
    });
  res.json({ ok: true });
});

// ── System: mark cart recovered on new order (called internally) ─────────────
export async function markCartRecovered(userId: number): Promise<void> {
  try {
    await db
      .insert(abandonedCartRemindersTable)
      .values({ userId, cartItemsCount: 0, recoveredAt: new Date() })
      .onConflictDoUpdate({
        target: abandonedCartRemindersTable.userId,
        set: { recoveredAt: new Date() },
      });
  } catch {
    // non-blocking
  }
}

export default router;
