import { Router, type IRouter } from "express";
import { db, reviewsTable, usersTable, ordersTable, orderItemsTable, productVariantsTable, productsTable } from "@workspace/db";
import { eq, and, desc, asc, count, avg, sql, inArray, ilike, or } from "drizzle-orm";
import { requireAuth, requireRole, optionalAuth } from "../middlewares/auth";
import { z } from "zod";

const router: IRouter = Router();

const IdParam = z.object({ id: z.coerce.number().int().min(1) });

const ReviewInputSchema = z.object({
  rating: z.number().int().min(1).max(5),
  title: z.string().max(120).optional(),
  comment: z.string().min(10).max(2000).optional(),
  orderId: z.number().int().optional(),
});

const ReviewUpdateSchema = z.object({
  rating: z.number().int().min(1).max(5).optional(),
  title: z.string().max(120).optional(),
  comment: z.string().min(10).max(2000).optional(),
});

async function enrichReviews(rawReviews: Array<typeof reviewsTable.$inferSelect>) {
  if (!rawReviews.length) return [];

  const userIds = [...new Set(rawReviews.map(r => r.userId))];
  const productIds = [...new Set(rawReviews.map(r => r.productId))];

  const [users, products] = await Promise.all([
    db.select({ id: usersTable.id, name: usersTable.name, avatar: usersTable.avatar })
      .from(usersTable).where(inArray(usersTable.id, userIds)),
    db.select({ id: productsTable.id, nameEn: productsTable.nameEn })
      .from(productsTable).where(inArray(productsTable.id, productIds)),
  ]);

  const userMap = new Map(users.map(u => [u.id, u]));
  const productMap = new Map(products.map(p => [p.id, p]));

  return rawReviews.map(r => ({
    ...r,
    userName: userMap.get(r.userId)?.name ?? "Anonymous",
    userAvatar: userMap.get(r.userId)?.avatar ?? null,
    productNameEn: productMap.get(r.productId)?.nameEn ?? null,
    productImageUrl: null as string | null,
  }));
}

async function hasVerifiedPurchase(userId: number, productId: number): Promise<{ verified: boolean; orderId: number | null }> {
  const rows = await db
    .select({ orderId: ordersTable.id })
    .from(ordersTable)
    .innerJoin(orderItemsTable, eq(orderItemsTable.orderId, ordersTable.id))
    .innerJoin(productVariantsTable, eq(productVariantsTable.id, orderItemsTable.productVariantId))
    .where(and(
      eq(ordersTable.userId, userId),
      eq(ordersTable.status, "delivered"),
      eq(productVariantsTable.productId, productId),
    ))
    .limit(1);
  return { verified: rows.length > 0, orderId: rows[0]?.orderId ?? null };
}

// GET /products/:id/reviews — with stats, pagination, sorting
router.get("/products/:id/reviews", optionalAuth, async (req, res): Promise<void> => {
  const { id: productId } = IdParam.parse(req.params);
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(50, Number(req.query.limit) || 10);
  const sort = (req.query.sort as string) || "newest";
  const offset = (page - 1) * limit;

  const orderBy =
    sort === "oldest" ? asc(reviewsTable.createdAt) :
    sort === "highest" ? desc(reviewsTable.rating) :
    sort === "lowest" ? asc(reviewsTable.rating) :
    desc(reviewsTable.createdAt);

  const [statsRows, reviews, totalRows] = await Promise.all([
    db.select({
      avgRating: avg(reviewsTable.rating),
      total: count(reviewsTable.id),
      dist1: sql<number>`COUNT(*) FILTER (WHERE ${reviewsTable.rating} = 1)`,
      dist2: sql<number>`COUNT(*) FILTER (WHERE ${reviewsTable.rating} = 2)`,
      dist3: sql<number>`COUNT(*) FILTER (WHERE ${reviewsTable.rating} = 3)`,
      dist4: sql<number>`COUNT(*) FILTER (WHERE ${reviewsTable.rating} = 4)`,
      dist5: sql<number>`COUNT(*) FILTER (WHERE ${reviewsTable.rating} = 5)`,
    }).from(reviewsTable).where(eq(reviewsTable.productId, productId)),
    db.select().from(reviewsTable)
      .where(eq(reviewsTable.productId, productId))
      .orderBy(orderBy)
      .limit(limit)
      .offset(offset),
    db.select({ c: count() }).from(reviewsTable).where(eq(reviewsTable.productId, productId)),
  ]);

  const statsRow = statsRows[0];
  const stats = {
    averageRating: Number(statsRow?.avgRating ?? 0),
    totalReviews: Number(statsRow?.total ?? 0),
    distribution: {
      "1": Number(statsRow?.dist1 ?? 0),
      "2": Number(statsRow?.dist2 ?? 0),
      "3": Number(statsRow?.dist3 ?? 0),
      "4": Number(statsRow?.dist4 ?? 0),
      "5": Number(statsRow?.dist5 ?? 0),
    },
  };

  const enriched = await enrichReviews(reviews);

  let canReview = false;
  let userReview: (typeof enriched)[0] | undefined;

  if (req.user) {
    const [existingReview, { verified }] = await Promise.all([
      db.select().from(reviewsTable)
        .where(and(eq(reviewsTable.productId, productId), eq(reviewsTable.userId, req.user.id)))
        .limit(1),
      hasVerifiedPurchase(req.user.id, productId),
    ]);
    canReview = verified && !existingReview.length;
    if (existingReview.length) {
      const [enrichedExisting] = await enrichReviews(existingReview);
      userReview = enrichedExisting;
    }
  }

  res.json({
    stats,
    reviews: enriched,
    total: Number(totalRows[0]?.c ?? 0),
    page,
    limit,
    canReview,
    userReview: userReview ?? null,
  });
});

// POST /products/:id/reviews — create review
router.post("/products/:id/reviews", requireAuth, async (req, res): Promise<void> => {
  const { id: productId } = IdParam.parse(req.params);
  const parsed = ReviewInputSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const { rating, title, comment, orderId } = parsed.data;
  const userId = req.user!.id;

  // Check for duplicate review by this user for this product
  const [existing] = await db.select().from(reviewsTable)
    .where(and(eq(reviewsTable.productId, productId), eq(reviewsTable.userId, userId)));
  if (existing) { res.status(409).json({ error: "You have already reviewed this product" }); return; }

  const { verified, orderId: derivedOrderId } = await hasVerifiedPurchase(userId, productId);
  if (!verified) { res.status(403).json({ error: "You can only review products from delivered orders you have purchased" }); return; }

  // If orderId is provided, verify it belongs to the user and contains the product and is delivered
  if (orderId) {
    const [specificOrder] = await db
      .select({ id: ordersTable.id })
      .from(ordersTable)
      .innerJoin(orderItemsTable, eq(orderItemsTable.orderId, ordersTable.id))
      .innerJoin(productVariantsTable, eq(productVariantsTable.id, orderItemsTable.productVariantId))
      .where(and(
        eq(ordersTable.id, orderId),
        eq(ordersTable.userId, userId),
        eq(ordersTable.status, "delivered"),
        eq(productVariantsTable.productId, productId)
      ))
      .limit(1);
    if (!specificOrder) { res.status(400).json({ error: "Invalid orderId for this product" }); return; }
  }

  const [review] = await db.insert(reviewsTable).values({
    productId,
    userId,
    orderId: orderId ?? derivedOrderId,
    rating,
    title: title ?? null,
    comment: comment ?? null,
    verifiedPurchase: true,
  }).returning();

  const [enriched] = await enrichReviews([review]);
  res.status(201).json(enriched);
});

// GET /reviews/my — current user's reviews
router.get("/reviews/my", requireAuth, async (req, res): Promise<void> => {
  const reviews = await db.select().from(reviewsTable)
    .where(eq(reviewsTable.userId, req.user!.id))
    .orderBy(desc(reviewsTable.createdAt));
  const enriched = await enrichReviews(reviews);
  res.json(enriched);
});

// PATCH /reviews/:id — edit own review
router.patch("/reviews/:id", requireAuth, async (req, res): Promise<void> => {
  const { id } = IdParam.parse(req.params);
  const parsed = ReviewUpdateSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [review] = await db.select().from(reviewsTable).where(eq(reviewsTable.id, id));
  if (!review) { res.status(404).json({ error: "Review not found" }); return; }
  if (review.userId !== req.user!.id) { res.status(403).json({ error: "Forbidden" }); return; }

  const { rating, title, comment } = parsed.data;
  const updates: Partial<typeof reviewsTable.$inferInsert> = {};
  if (rating !== undefined) updates.rating = rating;
  if (title !== undefined) updates.title = title;
  if (comment !== undefined) updates.comment = comment;

  const [updated] = await db.update(reviewsTable).set(updates).where(eq(reviewsTable.id, id)).returning();
  const [enriched] = await enrichReviews([updated]);
  res.json(enriched);
});

// DELETE /reviews/:id — delete own or admin
router.delete("/reviews/:id", requireAuth, async (req, res): Promise<void> => {
  const { id } = IdParam.parse(req.params);
  const [review] = await db.select().from(reviewsTable).where(eq(reviewsTable.id, id));
  if (!review) { res.status(404).json({ error: "Review not found" }); return; }
  if (req.user!.role !== "admin" && review.userId !== req.user!.id) {
    res.status(403).json({ error: "Forbidden" }); return;
  }
  await db.delete(reviewsTable).where(eq(reviewsTable.id, id));
  res.json({ message: "Review deleted" });
});

// GET /admin/reviews — admin review management
router.get("/admin/reviews", requireAuth, requireRole("admin"), async (req, res): Promise<void> => {

  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Number(req.query.limit) || 20);
  const offset = (page - 1) * limit;
  const ratingFilter = req.query.rating ? Number(req.query.rating) : undefined;
  const productIdFilter = req.query.productId ? Number(req.query.productId) : undefined;
  const search = req.query.search ? String(req.query.search) : undefined;

  const conditions = [];
  if (ratingFilter) conditions.push(eq(reviewsTable.rating, ratingFilter));
  if (productIdFilter) conditions.push(eq(reviewsTable.productId, productIdFilter));
  if (search) {
    conditions.push(or(
      ilike(reviewsTable.comment, `%${search}%`),
      ilike(reviewsTable.title, `%${search}%`),
    ));
  }

  const where = conditions.length ? and(...conditions) : undefined;

  const [reviews, totalRows] = await Promise.all([
    db.select().from(reviewsTable)
      .where(where)
      .orderBy(desc(reviewsTable.createdAt))
      .limit(limit).offset(offset),
    db.select({ c: count() }).from(reviewsTable).where(where),
  ]);

  const enriched = await enrichReviews(reviews);
  res.json({
    reviews: enriched,
    total: Number(totalRows[0]?.c ?? 0),
    page,
    limit,
  });
});

export default router;
