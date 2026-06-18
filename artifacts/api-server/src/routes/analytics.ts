import { Router, type IRouter } from "express";
import { db, ordersTable, usersTable, productsTable, orderItemsTable, productVariantsTable, categoriesTable, recentlyViewedTable, wishlistTable } from "@workspace/db";
import { eq, gte, lte, count, sum, avg, desc, and, sql, inArray } from "drizzle-orm";
import { requireAuth, requireRole } from "../middlewares/auth";

const router: IRouter = Router();

function startOf(unit: "day" | "week" | "month"): Date {
  const d = new Date();
  if (unit === "day") { d.setHours(0, 0, 0, 0); return d; }
  if (unit === "week") { d.setDate(d.getDate() - d.getDay()); d.setHours(0, 0, 0, 0); return d; }
  d.setDate(1); d.setHours(0, 0, 0, 0); return d;
}

// ── Platform summary ──────────────────────────────────────────────────────────
router.get("/analytics/summary", requireAuth, requireRole("admin"), async (_req, res): Promise<void> => {
  const now = new Date();
  const monthStart = startOf("month");
  const lastMonthStart = new Date(monthStart); lastMonthStart.setMonth(lastMonthStart.getMonth() - 1);
  const lastMonthEnd = new Date(monthStart); lastMonthEnd.setMilliseconds(-1);

  const [[orders, revenue, customers, products], thisMonth, lastMonth, pending, lowStock] = await Promise.all([
    Promise.all([
      db.select({ v: count() }).from(ordersTable),
      db.select({ v: sum(ordersTable.totalPrice) }).from(ordersTable),
      db.select({ v: count() }).from(usersTable).where(eq(usersTable.role, "customer")),
      db.select({ v: count() }).from(productsTable).where(eq(productsTable.active, true)),
    ]),
    db.select({ v: sum(ordersTable.totalPrice) }).from(ordersTable).where(gte(ordersTable.createdAt, monthStart)),
    db.select({ v: sum(ordersTable.totalPrice) }).from(ordersTable).where(and(gte(ordersTable.createdAt, lastMonthStart), lte(ordersTable.createdAt, lastMonthEnd))),
    db.select({ v: count() }).from(ordersTable).where(eq(ordersTable.status, "new")),
    db.select({ v: count() }).from(productVariantsTable).where(lte(productVariantsTable.stockQuantity, 5)),
  ]);

  const totalOrders = orders[0]?.v;
  const totalRevenue = revenue[0]?.v;
  const totalCustomers = customers[0]?.v;
  const totalProducts = products[0]?.v;
  const thisMonthRev = Number(thisMonth[0]?.v) || 0;
  const lastMonthRev = Number(lastMonth[0]?.v) || 0;
  const revenueGrowth = lastMonthRev > 0 ? Math.round(((thisMonthRev - lastMonthRev) / lastMonthRev) * 1000) / 10 : 0;

  res.json({
    totalRevenue: Number(totalRevenue) || 0,
    totalOrders: Number(totalOrders) || 0,
    totalCustomers: Number(totalCustomers) || 0,
    totalProducts: Number(totalProducts) || 0,
    revenueGrowth,
    ordersGrowth: 0,
    pendingOrders: Number(pending[0]?.v) || 0,
    lowStockCount: Number(lowStock[0]?.v) || 0,
  });
});

// ── Revenue timeline ──────────────────────────────────────────────────────────
router.get("/analytics/sales", requireAuth, requireRole("admin", "vendor"), async (req, res): Promise<void> => {
  const days = parseInt((req.query.days as string) || "30", 10);
  const result: { date: string; revenue: number; orders: number }[] = [];
  const now = new Date();
  const isVendor = req.user!.role === "vendor";

  // For vendors, pre-fetch the set of order IDs that contain their products
  let vendorOrderIds: Set<number> | null = null;
  if (isVendor) {
    const rows = await db
      .selectDistinct({ orderId: orderItemsTable.orderId })
      .from(orderItemsTable)
      .innerJoin(productVariantsTable, eq(orderItemsTable.productVariantId, productVariantsTable.id))
      .innerJoin(productsTable, eq(productVariantsTable.productId, productsTable.id))
      .where(eq(productsTable.vendorId, req.user!.id));
    vendorOrderIds = new Set(rows.map(r => r.orderId));
  }

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(now.getDate() - i);
    date.setHours(0, 0, 0, 0);
    const nextDay = new Date(date);
    nextDay.setDate(date.getDate() + 1);

    const dateCondition = and(gte(ordersTable.createdAt, date), lte(ordersTable.createdAt, nextDay));
    const vendorCondition = vendorOrderIds && vendorOrderIds.size > 0
      ? and(dateCondition, inArray(ordersTable.id, [...vendorOrderIds]))
      : vendorOrderIds && vendorOrderIds.size === 0
        ? undefined
        : dateCondition;

    if (vendorCondition === undefined) {
      result.push({ date: date.toISOString().split("T")[0], revenue: 0, orders: 0 });
      continue;
    }

    const [{ revenue, cnt }] = await db.select({
      revenue: sum(ordersTable.totalPrice),
      cnt: count(),
    }).from(ordersTable).where(vendorCondition);

    result.push({
      date: date.toISOString().split("T")[0],
      revenue: Number(revenue) || 0,
      orders: Number(cnt) || 0,
    });
  }
  res.json(result);
});

// ── Business Intelligence ─────────────────────────────────────────────────────
router.get("/analytics/bi", requireAuth, requireRole("admin"), async (_req, res): Promise<void> => {
  const [dailyRev, weeklyRev, monthlyRev, aov, returningCustomers, totalCustomers] = await Promise.all([
    db.select({ v: sum(ordersTable.totalPrice) }).from(ordersTable).where(gte(ordersTable.createdAt, startOf("day"))),
    db.select({ v: sum(ordersTable.totalPrice) }).from(ordersTable).where(gte(ordersTable.createdAt, startOf("week"))),
    db.select({ v: sum(ordersTable.totalPrice) }).from(ordersTable).where(gte(ordersTable.createdAt, startOf("month"))),
    db.select({ v: avg(ordersTable.totalPrice) }).from(ordersTable),
    db.execute(sql`SELECT COUNT(*) as v FROM (SELECT user_id FROM orders GROUP BY user_id HAVING COUNT(*) > 1) AS sub`),
    db.select({ v: count() }).from(usersTable).where(eq(usersTable.role, "customer")),
  ]);

  const totalC = Number(totalCustomers[0]?.v) || 0;
  const returning = Number((returningCustomers.rows?.[0] as { v: string })?.v) || 0;
  const repeatRate = totalC > 0 ? Math.round((returning / totalC) * 1000) / 10 : 0;

  res.json({
    dailyRevenue: Number(dailyRev[0]?.v) || 0,
    weeklyRevenue: Number(weeklyRev[0]?.v) || 0,
    monthlyRevenue: Number(monthlyRev[0]?.v) || 0,
    averageOrderValue: Math.round((Number(aov[0]?.v) || 0) * 100) / 100,
    returningCustomers: returning,
    totalCustomers: totalC,
    repeatPurchaseRate: repeatRate,
  });
});

// ── Top products (real data) ──────────────────────────────────────────────────
router.get("/analytics/top-products", requireAuth, requireRole("admin", "vendor"), async (_req, res): Promise<void> => {
  const rows = await db.execute(sql`
    SELECT
      p.id,
      p.name_en,
      p.name_ar,
      p.price,
      COALESCE(SUM(oi.quantity), 0) AS total_sold,
      COALESCE(SUM(oi.quantity * oi.price::numeric), 0) AS revenue
    FROM products p
    LEFT JOIN product_variants pv ON pv.product_id = p.id
    LEFT JOIN order_items oi ON oi.product_variant_id = pv.id
    WHERE p.active = true
    GROUP BY p.id
    ORDER BY total_sold DESC
    LIMIT 10
  `);
  res.json((rows.rows as Array<Record<string, unknown>>).map(r => ({
    productId: r.id,
    nameEn: r.name_en,
    nameAr: r.name_ar,
    totalSold: Number(r.total_sold),
    revenue: Number(r.revenue),
  })));
});

// ── Top categories ────────────────────────────────────────────────────────────
router.get("/analytics/top-categories", requireAuth, requireRole("admin"), async (_req, res): Promise<void> => {
  const rows = await db.execute(sql`
    SELECT
      c.id,
      c.name_en,
      c.name_ar,
      COALESCE(SUM(oi.quantity), 0) AS total_sold,
      COALESCE(SUM(oi.quantity * oi.price::numeric), 0) AS revenue
    FROM categories c
    LEFT JOIN products p ON p.category_id = c.id
    LEFT JOIN product_variants pv ON pv.product_id = p.id
    LEFT JOIN order_items oi ON oi.product_variant_id = pv.id
    GROUP BY c.id
    ORDER BY revenue DESC
    LIMIT 10
  `);
  res.json((rows.rows as Array<Record<string, unknown>>).map(r => ({
    categoryId: r.id,
    nameEn: r.name_en,
    nameAr: r.name_ar,
    totalSold: Number(r.total_sold),
    revenue: Number(r.revenue),
  })));
});

// ── Vendor performance ────────────────────────────────────────────────────────
router.get("/analytics/vendor-performance", requireAuth, requireRole("admin"), async (_req, res): Promise<void> => {
  const rows = await db.execute(sql`
    SELECT
      u.id,
      u.name,
      u.email,
      COUNT(DISTINCT p.id) AS product_count,
      COALESCE(SUM(oi.quantity), 0) AS total_sold,
      COALESCE(SUM(oi.quantity * oi.price::numeric), 0) AS revenue
    FROM users u
    LEFT JOIN products p ON p.vendor_id = u.id AND p.active = true
    LEFT JOIN product_variants pv ON pv.product_id = p.id
    LEFT JOIN order_items oi ON oi.product_variant_id = pv.id
    WHERE u.role = 'vendor'
    GROUP BY u.id
    ORDER BY revenue DESC
  `);
  res.json((rows.rows as Array<Record<string, unknown>>).map(r => ({
    vendorId: r.id,
    name: r.name,
    email: r.email,
    productCount: Number(r.product_count),
    totalSold: Number(r.total_sold),
    revenue: Number(r.revenue),
  })));
});

// ── Order status breakdown ────────────────────────────────────────────────────
router.get("/analytics/order-status-breakdown", requireAuth, requireRole("admin", "vendor"), async (_req, res): Promise<void> => {
  const statuses = ["new", "paid", "processing", "shipped", "delivered", "cancelled"];
  const result = await Promise.all(statuses.map(async (status) => {
    const [{ v }] = await db.select({ v: count() }).from(ordersTable).where(eq(ordersTable.status, status));
    return { status, count: Number(v) };
  }));
  res.json(result);
});

// ── Vendor summary (for vendor dashboard) ─────────────────────────────────────
router.get("/analytics/vendor-summary", requireAuth, requireRole("vendor", "admin"), async (req, res): Promise<void> => {
  const vendorId = req.user!.id;
  const rows = await db.execute(sql`
    SELECT
      COUNT(DISTINCT p.id) AS total_products,
      COALESCE(SUM(oi.quantity), 0) AS total_sold,
      COALESCE(SUM(oi.quantity * oi.price::numeric), 0) AS revenue,
      COUNT(DISTINCT o.id) AS total_orders,
      SUM(CASE WHEN pv.stock_quantity <= 5 THEN 1 ELSE 0 END) AS low_stock
    FROM products p
    LEFT JOIN product_variants pv ON pv.product_id = p.id
    LEFT JOIN order_items oi ON oi.product_variant_id = pv.id
    LEFT JOIN orders o ON o.id = oi.order_id
    WHERE p.vendor_id = ${vendorId} AND p.active = true
  `);
  const r = (rows.rows[0] || {}) as Record<string, unknown>;
  res.json({
    totalProducts: Number(r.total_products) || 0,
    totalOrders: Number(r.total_orders) || 0,
    totalRevenue: Number(r.revenue) || 0,
    pendingOrders: 0,
    lowStockProducts: Number(r.low_stock) || 0,
  });
});

// ── Product performance (admin) ───────────────────────────────────────────────
router.get("/admin/analytics/product-performance", requireAuth, requireRole("admin"), async (_req, res): Promise<void> => {
  const limitParam = Number((_req as { query: Record<string, string> }).query.limit) || 20;
  const rows = await db.execute(sql`
    WITH
      views_cte AS (
        SELECT product_id, COUNT(DISTINCT user_id)::int AS view_count
        FROM recently_viewed
        GROUP BY product_id
      ),
      wishlist_cte AS (
        SELECT product_id, COUNT(*)::int AS wishlist_count
        FROM wishlist
        GROUP BY product_id
      ),
      orders_cte AS (
        SELECT pv.product_id,
               SUM(oi.quantity)::int                             AS units_sold,
               COALESCE(SUM(oi.quantity * oi.price::numeric), 0)::numeric AS revenue
        FROM order_items oi
        JOIN product_variants pv ON pv.id = oi.product_variant_id
        GROUP BY pv.product_id
      ),
      stock_cte AS (
        SELECT product_id, SUM(stock_quantity)::int AS total_stock
        FROM product_variants
        GROUP BY product_id
      )
    SELECT
      p.id,
      p.name_en,
      p.name_ar,
      p.price,
      p.sale_price,
      p.featured,
      p.created_at,
      COALESCE(v.view_count, 0)     AS view_count,
      COALESCE(w.wishlist_count, 0) AS wishlist_count,
      COALESCE(o.units_sold, 0)     AS units_sold,
      COALESCE(o.revenue, 0)        AS revenue,
      COALESCE(s.total_stock, 0)    AS total_stock
    FROM products p
    LEFT JOIN views_cte   v ON v.product_id   = p.id
    LEFT JOIN wishlist_cte w ON w.product_id  = p.id
    LEFT JOIN orders_cte  o ON o.product_id   = p.id
    LEFT JOIN stock_cte   s ON s.product_id   = p.id
    WHERE p.active = true
    ORDER BY COALESCE(o.revenue, 0) DESC, COALESCE(o.units_sold, 0) DESC
    LIMIT ${limitParam}
  `);
  res.json((rows.rows as Array<Record<string, unknown>>).map(r => ({
    id: Number(r.id),
    nameEn: r.name_en as string,
    nameAr: r.name_ar as string,
    price: Number(r.price),
    salePrice: r.sale_price ? Number(r.sale_price) : null,
    featured: Boolean(r.featured),
    createdAt: r.created_at as string,
    viewCount: Number(r.view_count),
    wishlistCount: Number(r.wishlist_count),
    unitsSold: Number(r.units_sold),
    revenue: Number(r.revenue),
    totalStock: Number(r.total_stock),
  })));
});

export default router;
