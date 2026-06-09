import { Router, type IRouter } from "express";
import { db, reviewsTable, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth, optionalAuth } from "../middlewares/auth";
import { CreateReviewBody, CreateReviewParams, ListProductReviewsParams, DeleteReviewParams } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/products/:id/reviews", optionalAuth, async (req, res): Promise<void> => {
  const params = ListProductReviewsParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }
  const reviews = await db.select().from(reviewsTable).where(eq(reviewsTable.productId, params.data.id));
  const enriched = await Promise.all(reviews.map(async (r) => {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, r.userId));
    return { ...r, userName: user?.name ?? "Anonymous", userAvatar: user?.avatar ?? null };
  }));
  res.json(enriched);
});

router.post("/products/:id/reviews", requireAuth, async (req, res): Promise<void> => {
  const params = CreateReviewParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }
  const parsed = CreateReviewBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [review] = await db.insert(reviewsTable).values({
    productId: params.data.id,
    userId: req.user!.id,
    rating: parsed.data.rating,
    comment: parsed.data.comment ?? null,
  }).returning();
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.user!.id));
  res.status(201).json({ ...review, userName: user?.name ?? "Anonymous", userAvatar: user?.avatar ?? null });
});

router.delete("/reviews/:id", requireAuth, async (req, res): Promise<void> => {
  const params = DeleteReviewParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }
  const [review] = await db.select().from(reviewsTable).where(eq(reviewsTable.id, params.data.id));
  if (!review) { res.status(404).json({ error: "Review not found" }); return; }
  if (req.user!.role !== "admin" && review.userId !== req.user!.id) {
    res.status(403).json({ error: "Forbidden" }); return;
  }
  await db.delete(reviewsTable).where(eq(reviewsTable.id, params.data.id));
  res.json({ message: "Review deleted" });
});

export default router;
