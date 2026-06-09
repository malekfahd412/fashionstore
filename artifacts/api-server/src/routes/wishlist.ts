import { Router, type IRouter } from "express";
import { db, wishlistTable, productsTable, productImagesTable, productVariantsTable, categoriesTable, usersTable, reviewsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import { AddToWishlistParams, RemoveFromWishlistParams } from "@workspace/api-zod";

const router: IRouter = Router();

async function enrichProduct(product: typeof productsTable.$inferSelect) {
  const variants = await db.select().from(productVariantsTable).where(eq(productVariantsTable.productId, product.id));
  const images = await db.select().from(productImagesTable).where(eq(productImagesTable.productId, product.id));
  const [cat] = await db.select().from(categoriesTable).where(eq(categoriesTable.id, product.categoryId));
  const [vendor] = await db.select().from(usersTable).where(eq(usersTable.id, product.vendorId));
  const reviews = await db.select({ rating: reviewsTable.rating }).from(reviewsTable).where(eq(reviewsTable.productId, product.id));
  const reviewCount = reviews.length;
  const averageRating = reviewCount > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / reviewCount : 0;
  return {
    ...product,
    price: Number(product.price),
    salePrice: product.salePrice ? Number(product.salePrice) : null,
    categoryName: cat?.nameEn ?? "",
    vendorName: vendor?.name ?? "",
    averageRating: Math.round(averageRating * 10) / 10,
    reviewCount,
    images,
    variants,
  };
}

router.get("/wishlist", requireAuth, async (req, res): Promise<void> => {
  const items = await db.select().from(wishlistTable).where(eq(wishlistTable.userId, req.user!.id));
  const enriched = await Promise.all(items.map(async (item) => {
    const [product] = await db.select().from(productsTable).where(eq(productsTable.id, item.productId));
    if (!product) return null;
    return { productId: item.productId, product: await enrichProduct(product) };
  }));
  res.json(enriched.filter(Boolean));
});

router.post("/wishlist/:productId", requireAuth, async (req, res): Promise<void> => {
  const params = AddToWishlistParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }
  const existing = await db.select().from(wishlistTable)
    .where(and(eq(wishlistTable.userId, req.user!.id), eq(wishlistTable.productId, params.data.productId)));
  if (existing.length === 0) {
    await db.insert(wishlistTable).values({ userId: req.user!.id, productId: params.data.productId });
  }
  res.json({ message: "Added to wishlist" });
});

router.delete("/wishlist/:productId", requireAuth, async (req, res): Promise<void> => {
  const params = RemoveFromWishlistParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }
  await db.delete(wishlistTable).where(and(eq(wishlistTable.userId, req.user!.id), eq(wishlistTable.productId, params.data.productId)));
  res.json({ message: "Removed from wishlist" });
});

export default router;
