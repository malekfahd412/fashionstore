import { Router, type IRouter } from "express";
import { db, wishlistTable, productsTable, productImagesTable, productVariantsTable, categoriesTable, usersTable, reviewsTable } from "@workspace/db";
import { eq, and, inArray } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import { AddToWishlistParams, RemoveFromWishlistParams } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/wishlist", requireAuth, async (req, res): Promise<void> => {
  const items = await db.select().from(wishlistTable).where(eq(wishlistTable.userId, req.user!.id));
  if (items.length === 0) { res.json([]); return; }

  const productIds = items.map(i => i.productId);
  const products = await db.select().from(productsTable).where(inArray(productsTable.id, productIds));
  if (products.length === 0) { res.json([]); return; }

  const catIds = [...new Set(products.map(p => p.categoryId))];
  const vendorIds = [...new Set(products.map(p => p.vendorId))];

  const [variants, images, categories, vendors, reviews] = await Promise.all([
    db.select().from(productVariantsTable).where(inArray(productVariantsTable.productId, productIds)),
    db.select().from(productImagesTable).where(inArray(productImagesTable.productId, productIds)),
    catIds.length ? db.select().from(categoriesTable).where(inArray(categoriesTable.id, catIds)) : Promise.resolve([]),
    vendorIds.length ? db.select().from(usersTable).where(inArray(usersTable.id, vendorIds)) : Promise.resolve([]),
    db.select({ productId: reviewsTable.productId, rating: reviewsTable.rating })
      .from(reviewsTable)
      .where(inArray(reviewsTable.productId, productIds)),
  ]);

  const variantsByProduct = new Map<number, typeof variants>();
  for (const v of variants) {
    if (!variantsByProduct.has(v.productId)) variantsByProduct.set(v.productId, []);
    variantsByProduct.get(v.productId)!.push(v);
  }
  const imagesByProduct = new Map<number, typeof images>();
  for (const img of images) {
    if (!imagesByProduct.has(img.productId)) imagesByProduct.set(img.productId, []);
    imagesByProduct.get(img.productId)!.push(img);
  }
  const catMap = new Map((categories as (typeof categoriesTable.$inferSelect)[]).map(c => [c.id, c]));
  const vendorMap = new Map((vendors as (typeof usersTable.$inferSelect)[]).map(v => [v.id, v]));
  const reviewsByProduct = new Map<number, { rating: number }[]>();
  for (const r of reviews) {
    if (!reviewsByProduct.has(r.productId)) reviewsByProduct.set(r.productId, []);
    reviewsByProduct.get(r.productId)!.push({ rating: r.rating });
  }

  const productMap = new Map(products.map(p => [p.id, p]));
  const enriched = items.map(item => {
    const product = productMap.get(item.productId);
    if (!product) return null;
    const productReviews = reviewsByProduct.get(product.id) ?? [];
    const reviewCount = productReviews.length;
    const averageRating = reviewCount > 0
      ? productReviews.reduce((s, r) => s + r.rating, 0) / reviewCount
      : 0;
    const cat = catMap.get(product.categoryId);
    const vendor = vendorMap.get(product.vendorId);
    return {
      productId: item.productId,
      product: {
        ...product,
        price: Number(product.price),
        salePrice: product.salePrice ? Number(product.salePrice) : null,
        categoryName: cat?.nameEn ?? "",
        vendorName: vendor?.name ?? "",
        averageRating: Math.round(averageRating * 10) / 10,
        reviewCount,
        images: imagesByProduct.get(product.id) ?? [],
        variants: variantsByProduct.get(product.id) ?? [],
      },
    };
  }).filter(Boolean);

  res.json(enriched);
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
