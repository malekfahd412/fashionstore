import { Router, type IRouter } from "express";
import { db, ordersTable, orderItemsTable, productVariantsTable, productsTable, usersTable, notificationsTable } from "@workspace/db";
import { eq, and, SQL, desc } from "drizzle-orm";
import { requireAuth, requireRole } from "../middlewares/auth";
import { CreateOrderBody, GetOrderParams, UpdateOrderStatusParams, UpdateOrderStatusBody, ListOrdersQueryParams } from "@workspace/api-zod";

const router: IRouter = Router();

async function enrichOrder(order: typeof ordersTable.$inferSelect) {
  const items = await db.select().from(orderItemsTable).where(eq(orderItemsTable.orderId, order.id));
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, order.userId));
  const enrichedItems = await Promise.all(items.map(async (item) => {
    const [variant] = await db.select().from(productVariantsTable).where(eq(productVariantsTable.id, item.productVariantId));
    const [product] = variant ? await db.select().from(productsTable).where(eq(productsTable.id, variant.productId)) : [null];
    return {
      id: item.id,
      productId: product?.id ?? 0,
      productNameEn: product?.nameEn ?? "",
      productNameAr: product?.nameAr ?? "",
      imageUrl: null,
      color: variant?.color ?? null,
      size: variant?.size ?? null,
      quantity: item.quantity,
      price: Number(item.price),
    };
  }));
  return {
    ...order,
    totalPrice: Number(order.totalPrice),
    discount: order.discount ? Number(order.discount) : null,
    userName: user?.name ?? "",
    items: enrichedItems,
  };
}

router.get("/orders", requireAuth, async (req, res): Promise<void> => {
  const query = ListOrdersQueryParams.safeParse(req.query);
  const { status, userId, page = 1, limit = 20 } = query.success ? query.data : {};
  const conditions: SQL[] = [];
  if (req.user!.role === "customer") conditions.push(eq(ordersTable.userId, req.user!.id));
  else if (userId) conditions.push(eq(ordersTable.userId, Number(userId)));
  if (status) conditions.push(eq(ordersTable.status, status));
  const orders = await db.select().from(ordersTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(ordersTable.createdAt))
    .limit(Number(limit))
    .offset((Number(page) - 1) * Number(limit));
  const total = await db.$count(ordersTable, conditions.length > 0 ? and(...conditions) : undefined);
  const enriched = await Promise.all(orders.map(enrichOrder));
  res.json({ orders: enriched, total, page: Number(page), limit: Number(limit) });
});

router.get("/orders/:id", requireAuth, async (req, res): Promise<void> => {
  const params = GetOrderParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }
  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, params.data.id));
  if (!order) { res.status(404).json({ error: "Order not found" }); return; }
  if (req.user!.role === "customer" && order.userId !== req.user!.id) {
    res.status(403).json({ error: "Forbidden" }); return;
  }
  res.json(await enrichOrder(order));
});

router.post("/orders", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateOrderBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const { paymentMethod, couponCode, items } = parsed.data;
  const totalPrice = items.reduce((s, i) => s + i.price * i.quantity, 0);
  const [order] = await db.insert(ordersTable).values({
    userId: req.user!.id,
    totalPrice: String(totalPrice),
    paymentMethod,
    couponCode: couponCode ?? null,
    status: "new",
  }).returning();
  await db.insert(orderItemsTable).values(items.map(i => ({
    orderId: order.id,
    productVariantId: i.productVariantId,
    quantity: i.quantity,
    price: String(i.price),
  })));
  // Create notification
  await db.insert(notificationsTable).values({
    userId: req.user!.id,
    title: "Order Placed",
    message: `Your order #${order.id} has been placed successfully.`,
  });
  res.status(201).json(await enrichOrder(order));
});

router.patch("/orders/:id", requireAuth, requireRole("admin", "vendor"), async (req, res): Promise<void> => {
  const params = UpdateOrderStatusParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }
  const parsed = UpdateOrderStatusBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [order] = await db.update(ordersTable).set({ status: parsed.data.status }).where(eq(ordersTable.id, params.data.id)).returning();
  if (!order) { res.status(404).json({ error: "Order not found" }); return; }
  // Notify customer
  await db.insert(notificationsTable).values({
    userId: order.userId,
    title: "Order Status Updated",
    message: `Your order #${order.id} status changed to: ${parsed.data.status}`,
  });
  res.json(await enrichOrder(order));
});

export default router;
