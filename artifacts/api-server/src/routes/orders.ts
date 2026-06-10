import { Router, type IRouter } from "express";
import { db, ordersTable, orderItemsTable, productVariantsTable, productsTable, productImagesTable, usersTable, notificationsTable, couponsTable } from "@workspace/db";
import { eq, and, SQL, desc, inArray, gt, isNull } from "drizzle-orm";
import { requireAuth, requireRole } from "../middlewares/auth";
import { CreateOrderBody, GetOrderParams, UpdateOrderStatusParams, UpdateOrderStatusBody, ListOrdersQueryParams } from "@workspace/api-zod";
import { auditLog } from "../lib/audit";

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
        db.select({ id: productsTable.id, nameEn: productsTable.nameEn, nameAr: productsTable.nameAr }).from(productsTable).where(inArray(productsTable.id, productIds)),
        db.select().from(productImagesTable).where(and(inArray(productImagesTable.productId, productIds), eq(productImagesTable.isPrimary, true))),
      ])
    : [[], []];

  const variantMap = new Map(variants.map(v => [v.id, v]));
  const productMap = new Map(products.map(p => [p.id, p]));
  const imageMap = new Map(images.map(img => [img.productId, img.imageUrl]));
  const userMap = new Map(allUsers.map(u => [u.id, u.name]));
  const itemsByOrder = new Map<number, typeof allItems>();
  for (const item of allItems) {
    if (!itemsByOrder.has(item.orderId)) itemsByOrder.set(item.orderId, []);
    itemsByOrder.get(item.orderId)!.push(item);
  }

  return orders.map(order => ({
    ...order,
    totalPrice: Number(order.totalPrice),
    discount: order.discount ? Number(order.discount) : null,
    userName: userMap.get(order.userId) ?? "",
    items: (itemsByOrder.get(order.id) ?? []).map(item => {
      const variant = variantMap.get(item.productVariantId);
      const product = variant ? productMap.get(variant.productId) : null;
      return {
        id: item.id,
        productId: product?.id ?? 0,
        productNameEn: product?.nameEn ?? "",
        productNameAr: product?.nameAr ?? "",
        imageUrl: product ? (imageMap.get(product.id) ?? null) : null,
        color: variant?.color ?? null,
        size: variant?.size ?? null,
        quantity: item.quantity,
        price: Number(item.price),
      };
    }),
  }));
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

  let order!: typeof ordersTable.$inferSelect;

  try {
    order = await db.transaction(async (tx) => {
      // 1. Validate and lock coupon
      let discount = 0;
      if (couponCode) {
        const [coupon] = await tx.select().from(couponsTable).where(
          and(eq(couponsTable.code, couponCode), eq(couponsTable.active, true))
        );
        if (!coupon) throw Object.assign(new Error("Invalid coupon code"), { status: 400 });
        if (coupon.endDate && coupon.endDate < new Date()) throw Object.assign(new Error("Coupon has expired"), { status: 400 });
        if (coupon.usageLimit != null && coupon.usageCount >= coupon.usageLimit) throw Object.assign(new Error("Coupon usage limit reached"), { status: 400 });
        discount = coupon.discountType === "percentage"
          ? (items.reduce((s, i) => s + i.price * i.quantity, 0) * Number(coupon.discountValue)) / 100
          : Number(coupon.discountValue);
        // Increment usage atomically
        await tx.update(couponsTable).set({ usageCount: coupon.usageCount + 1 }).where(eq(couponsTable.id, coupon.id));
      }

      // 2. Check and deduct stock for each variant
      for (const item of items) {
        const [variant] = await tx.select().from(productVariantsTable).where(eq(productVariantsTable.id, item.productVariantId));
        if (!variant) throw Object.assign(new Error(`Product variant ${item.productVariantId} not found`), { status: 400 });
        if (variant.stockQuantity < item.quantity) throw Object.assign(new Error(`Insufficient stock for variant ${item.productVariantId}`), { status: 409 });
        await tx.update(productVariantsTable)
          .set({ stockQuantity: variant.stockQuantity - item.quantity })
          .where(eq(productVariantsTable.id, item.productVariantId));
      }

      // 3. Calculate totals
      const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
      const totalPrice = Math.max(0, subtotal - discount);

      // 4. Insert order + items
      const [newOrder] = await tx.insert(ordersTable).values({
        userId: req.user!.id,
        totalPrice: String(totalPrice),
        paymentMethod,
        couponCode: couponCode ?? null,
        discount: String(discount),
        status: "new",
      }).returning();

      await tx.insert(orderItemsTable).values(items.map(i => ({
        orderId: newOrder.id,
        productVariantId: i.productVariantId,
        quantity: i.quantity,
        price: String(i.price),
      })));

      // 5. Notification
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

  res.status(201).json(await enrichOrder(order));
});

// ── Update order status ───────────────────────────────────────────────────────
router.patch("/orders/:id", requireAuth, requireRole("admin", "vendor"), async (req, res): Promise<void> => {
  const params = UpdateOrderStatusParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }
  const parsed = UpdateOrderStatusBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [before] = await db.select().from(ordersTable).where(eq(ordersTable.id, params.data.id));
  if (!before) { res.status(404).json({ error: "Order not found" }); return; }

  const [order] = await db.update(ordersTable).set({ status: parsed.data.status }).where(eq(ordersTable.id, params.data.id)).returning();

  await Promise.all([
    db.insert(notificationsTable).values({
      userId: order.userId,
      title: "Order Status Updated",
      message: `Your order #${order.id} status changed to: ${parsed.data.status}`,
    }),
    auditLog(req, "UPDATE", "order", order.id, { status: before.status }, { status: parsed.data.status }),
  ]);

  res.json(await enrichOrder(order));
});

export default router;
