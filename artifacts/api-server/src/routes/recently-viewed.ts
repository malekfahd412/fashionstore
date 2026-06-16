import { Router, type IRouter } from "express";
import {
  db,
  recentlyViewedTable,
  productsTable,
  productVariantsTable,
  productImagesTable,
} from "@workspace/db";
import { eq, desc, sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

// ── Track a product view ─────────────────────────────────────────────────────
router.post("/recently-viewed/:productId", requireAuth, async (req, res): Promise<void> => {
  const userId = req.user!.id;
  const productId = Number(req.params.productId);
  if (!productId) { res.status(400).json({ error: "Invalid productId" }); return; }

  await db
    .insert(recentlyViewedTable)
    .values({ userId, productId })
    .onConflictDoUpdate({
      target: [recentlyViewedTable.userId, recentlyViewedTable.productId],
      set: { viewedAt: new Date() },
    });

  // Keep only 20 most recent per user
  const oldest = await db
    .select({ id: recentlyViewedTable.id })
    .from(recentlyViewedTable)
    .where(eq(recentlyViewedTable.userId, userId))
    .orderBy(desc(recentlyViewedTable.viewedAt))
    .offset(20);

  if (oldest.length) {
    await db.delete(recentlyViewedTable).where(
      sql`${recentlyViewedTable.id} = ANY(${sql`ARRAY[${sql.join(oldest.map((r) => sql`${r.id}`), sql`, `)}]`})`
    );
  }

  res.status(200).json({ ok: true });
});

// ── Get recently viewed products ─────────────────────────────────────────────
router.get("/recently-viewed", requireAuth, async (req, res): Promise<void> => {
  const userId = req.user!.id;
  const limit = Math.min(20, Number(req.query.limit) || 8);

  const rows = await db
    .select({
      productId: recentlyViewedTable.productId,
      viewedAt: recentlyViewedTable.viewedAt,
      nameEn: productsTable.nameEn,
      nameAr: productsTable.nameAr,
      slug: productsTable.slug,
    })
    .from(recentlyViewedTable)
    .leftJoin(productsTable, eq(recentlyViewedTable.productId, productsTable.id))
    .where(eq(recentlyViewedTable.userId, userId))
    .orderBy(desc(recentlyViewedTable.viewedAt))
    .limit(limit);

  if (!rows.length) { res.json([]); return; }

  const productIds = rows.map((r) => r.productId);

  // Fetch first image + lowest price variant per product
  const images = await db
    .select({ productId: productImagesTable.productId, url: productImagesTable.url })
    .from(productImagesTable)
    .where(
      sql`${productImagesTable.productId} = ANY(${sql`ARRAY[${sql.join(productIds.map(id => sql`${id}`), sql`, `)}]`})`
    )
    .orderBy(productImagesTable.position);

  const variants = await db
    .select({
      productId: productVariantsTable.productId,
      price: sql<string>`MIN(${productVariantsTable.price})`,
    })
    .from(productVariantsTable)
    .where(
      sql`${productVariantsTable.productId} = ANY(${sql`ARRAY[${sql.join(productIds.map(id => sql`${id}`), sql`, `)}]`})`
    )
    .groupBy(productVariantsTable.productId);

  const imageMap = new Map<number, string>();
  for (const img of images) {
    if (!imageMap.has(img.productId)) imageMap.set(img.productId, img.url);
  }
  const priceMap = new Map(variants.map((v) => [v.productId, v.price]));

  const result = rows.map((r) => ({
    productId: r.productId,
    nameEn: r.nameEn,
    nameAr: r.nameAr,
    slug: r.slug,
    imageUrl: imageMap.get(r.productId) ?? null,
    price: priceMap.get(r.productId) ?? null,
    viewedAt: r.viewedAt,
  }));

  res.json(result);
});

export default router;
