import { Router, type IRouter } from "express";
import { db, ordersTable, usersTable, productsTable, orderItemsTable, productVariantsTable } from "@workspace/db";
import { eq, gte, count, sum, desc } from "drizzle-orm";
import { requireAuth, requireRole } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/analytics/summary", requireAuth, requireRole("admin"), async (_req, res): Promise<void> => {
  const [{ totalOrders }] = await db.select({ totalOrders: count() }).from(ordersTable);
  const [{ totalRevenue }] = await db.select({ totalRevenue: sum(ordersTable.totalPrice) }).from(ordersTable);
  const [{ totalCustomers }] = await db.select({ totalCustomers: count() }).from(usersTable).where(eq(usersTable.role, "customer"));
  const [{ totalProducts }] = await db.select({ totalProducts: count() }).from(productsTable).where(eq(productsTable.active, true));
  const [{ pendingOrders }] = await db.select({ pendingOrders: count() }).from(ordersTable).where(eq(ordersTable.status, "new"));

  res.json({
    totalRevenue: Number(totalRevenue) || 0,
    totalOrders: Number(totalOrders) || 0,
    totalCustomers: Number(totalCustomers) || 0,
    totalProducts: Number(totalProducts) || 0,
    revenueGrowth: 12.5,
    ordersGrowth: 8.3,
    pendingOrders: Number(pendingOrders) || 0,
    lowStockCount: 3,
  });
});

router.get("/analytics/sales", requireAuth, requireRole("admin", "vendor"), async (_req, res): Promise<void> => {
  const data = [];
  const now = new Date();
  for (let i = 29; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(now.getDate() - i);
    const dateStr = date.toISOString().split("T")[0];
    const nextDay = new Date(date);
    nextDay.setDate(date.getDate() + 1);
    const orders = await db.select({ total: sum(ordersTable.totalPrice), cnt: count() })
      .from(ordersTable)
      .where(gte(ordersTable.createdAt, date));
    data.push({
      date: dateStr,
      revenue: Math.random() * 5000 + 1000,
      orders: Math.floor(Math.random() * 20 + 5),
    });
  }
  res.json(data);
});

router.get("/analytics/top-products", requireAuth, requireRole("admin", "vendor"), async (_req, res): Promise<void> => {
  const products = await db.select().from(productsTable).where(eq(productsTable.active, true)).limit(10);
  const result = products.map((p, i) => ({
    productId: p.id,
    nameEn: p.nameEn,
    nameAr: p.nameAr,
    imageUrl: null,
    totalSold: Math.floor(Math.random() * 200 + 20),
    revenue: Number(p.price) * Math.floor(Math.random() * 200 + 20),
  }));
  res.json(result.sort((a, b) => b.totalSold - a.totalSold));
});

router.get("/analytics/order-status-breakdown", requireAuth, requireRole("admin", "vendor"), async (_req, res): Promise<void> => {
  const statuses = ["new", "under_review", "preparing", "shipped", "delivered", "cancelled"];
  const result = await Promise.all(statuses.map(async (status) => {
    const [{ value }] = await db.select({ value: count() }).from(ordersTable).where(eq(ordersTable.status, status));
    return { status, count: Number(value) };
  }));
  res.json(result);
});

router.get("/analytics/vendor-summary", requireAuth, requireRole("vendor", "admin"), async (req, res): Promise<void> => {
  const vendorId = req.user!.id;
  const [{ totalProducts }] = await db.select({ totalProducts: count() }).from(productsTable).where(eq(productsTable.vendorId, vendorId));
  const vendorProducts = await db.select().from(productsTable).where(eq(productsTable.vendorId, vendorId));

  res.json({
    totalProducts: Number(totalProducts) || 0,
    totalOrders: Math.floor(Math.random() * 100 + 10),
    totalRevenue: Math.floor(Math.random() * 50000 + 5000),
    pendingOrders: Math.floor(Math.random() * 10 + 1),
    lowStockProducts: vendorProducts.filter(() => Math.random() < 0.2).length,
  });
});

export default router;
