import { Router, type IRouter } from "express";
import { db, productsTable, productVariantsTable, productImagesTable, categoriesTable, usersTable, reviewsTable } from "@workspace/db";
import { eq, and, ilike, gte, lte, desc, asc, count, avg, inArray, SQL } from "drizzle-orm";
import { requireAuth, requireRole, optionalAuth } from "../middlewares/auth";
import {
  CreateProductBody, UpdateProductBody, GetProductParams, UpdateProductParams,
  DeleteProductParams, ListProductsQueryParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

// ── Batch-enrichment (eliminates N+1 queries) ─────────────────────────────────
async function batchEnrichProducts(products: (typeof productsTable.$inferSelect)[]) {
  if (products.length === 0) return [];
  const ids = products.map(p => p.id);
  const catIds = [...new Set(products.map(p => p.categoryId))];
  const vendorIds = [...new Set(products.map(p => p.vendorId))];

  const [variants, images, categories, vendors, reviews] = await Promise.all([
    db.select().from(productVariantsTable).where(inArray(productVariantsTable.productId, ids)),
    db.select().from(productImagesTable).where(inArray(productImagesTable.productId, ids)),
    db.select({ id: categoriesTable.id, nameEn: categoriesTable.nameEn }).from(categoriesTable).where(inArray(categoriesTable.id, catIds)),
    db.select({ id: usersTable.id, name: usersTable.name }).from(usersTable).where(inArray(usersTable.id, vendorIds)),
    db.select({ productId: reviewsTable.productId, rating: reviewsTable.rating }).from(reviewsTable).where(inArray(reviewsTable.productId, ids)),
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
  const reviewsByProduct = new Map<number, number[]>();
  for (const r of reviews) {
    if (!reviewsByProduct.has(r.productId)) reviewsByProduct.set(r.productId, []);
    reviewsByProduct.get(r.productId)!.push(r.rating);
  }
  const catMap = new Map(categories.map(c => [c.id, c.nameEn]));
  const vendorMap = new Map(vendors.map(v => [v.id, v.name]));

  return products.map(p => {
    const ratings = reviewsByProduct.get(p.id) ?? [];
    const averageRating = ratings.length > 0 ? Math.round((ratings.reduce((s, r) => s + r, 0) / ratings.length) * 10) / 10 : 0;
    return {
      ...p,
      price: Number(p.price),
      salePrice: p.salePrice ? Number(p.salePrice) : null,
      categoryName: catMap.get(p.categoryId) ?? "",
      vendorName: vendorMap.get(p.vendorId) ?? "",
      averageRating,
      reviewCount: ratings.length,
      images: imagesByProduct.get(p.id) ?? [],
      variants: variantsByProduct.get(p.id) ?? [],
    };
  });
}

// Keep single-product helper (used in create/update responses)
async function enrichProduct(product: typeof productsTable.$inferSelect) {
  const [enriched] = await batchEnrichProducts([product]);
  return enriched;
}

router.get("/products", optionalAuth, async (req, res): Promise<void> => {
  const query = ListProductsQueryParams.safeParse(req.query);
  const params = query.success ? query.data : {};
  const { search, categoryId, vendorId, minPrice, maxPrice, featured, sortBy, page = 1, limit = 20 } = params;

  const isAdminShowAll = req.user?.role === "admin" && req.query.showAll === "true";
  const conditions: SQL[] = [];
  if (!isAdminShowAll) conditions.push(eq(productsTable.active, true));
  if (search) conditions.push(ilike(productsTable.nameEn, `%${search}%`));
  if (categoryId) conditions.push(eq(productsTable.categoryId, Number(categoryId)));
  if (vendorId) conditions.push(eq(productsTable.vendorId, Number(vendorId)));
  if (minPrice) conditions.push(gte(productsTable.price, String(minPrice)));
  if (maxPrice) conditions.push(lte(productsTable.price, String(maxPrice)));
  if (featured === true || featured === "true" as unknown) conditions.push(eq(productsTable.featured, true));

  let orderBy = desc(productsTable.createdAt);
  if (sortBy === "price_asc") orderBy = asc(productsTable.price);
  else if (sortBy === "price_desc") orderBy = desc(productsTable.price);

  const [products, total] = await Promise.all([
    db.select().from(productsTable)
      .where(and(...conditions))
      .orderBy(orderBy)
      .limit(Math.min(Number(limit), 100))
      .offset((Number(page) - 1) * Math.min(Number(limit), 100)),
    db.$count(productsTable, and(...conditions)),
  ]);

  const enriched = await batchEnrichProducts(products);
  res.json({ products: enriched, total, page: Number(page), limit: Number(limit) });
});

router.get("/products/featured", async (_req, res): Promise<void> => {
  const products = await db.select().from(productsTable)
    .where(and(eq(productsTable.featured, true), eq(productsTable.active, true)))
    .orderBy(desc(productsTable.createdAt)).limit(8);
  res.json(await batchEnrichProducts(products));
});

router.get("/products/new-arrivals", async (_req, res): Promise<void> => {
  const products = await db.select().from(productsTable)
    .where(eq(productsTable.active, true))
    .orderBy(desc(productsTable.createdAt)).limit(8);
  res.json(await batchEnrichProducts(products));
});

router.get("/products/best-sellers", async (_req, res): Promise<void> => {
  const products = await db.select().from(productsTable)
    .where(eq(productsTable.active, true))
    .orderBy(desc(productsTable.createdAt)).limit(8);
  res.json(await batchEnrichProducts(products));
});

router.get("/products/:id", optionalAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid product id" }); return; }
  const [product] = await db.select().from(productsTable).where(eq(productsTable.id, id));
  if (!product) { res.status(404).json({ error: "Product not found" }); return; }
  res.json(await enrichProduct(product));
});

router.get("/products/:id/related", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.json([]); return; }
  const [product] = await db.select().from(productsTable).where(eq(productsTable.id, id));
  if (!product) { res.json([]); return; }
  const related = await db.select().from(productsTable)
    .where(and(eq(productsTable.categoryId, product.categoryId), eq(productsTable.active, true)))
    .orderBy(desc(productsTable.createdAt)).limit(7);
  res.json(await batchEnrichProducts(related.filter(p => p.id !== id)));
});

router.post("/products", requireAuth, requireRole("admin", "vendor"), async (req, res): Promise<void> => {
  const parsed = CreateProductBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const { images, variants, ...productData } = parsed.data as typeof parsed.data & { images?: string[]; variants?: Array<{color:string;size:string;stockQuantity:number}> };
  const vendorId = req.user!.role === "vendor" ? req.user!.id : (productData as {vendorId?: number}).vendorId ?? req.user!.id;
  const [product] = await db.insert(productsTable).values({
    ...productData,
    vendorId,
    price: String(productData.price),
    salePrice: productData.salePrice != null ? String(productData.salePrice) : null,
  }).returning();
  if (images?.length) {
    await db.insert(productImagesTable).values(images.map((url, i) => ({ productId: product.id, imageUrl: url, isPrimary: i === 0 })));
  }
  if (variants?.length) {
    await db.insert(productVariantsTable).values(variants.map(v => ({ ...v, productId: product.id })));
  }
  res.status(201).json(await enrichProduct(product));
});

router.patch("/products/:id", requireAuth, requireRole("admin", "vendor"), async (req, res): Promise<void> => {
  const params = UpdateProductParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }
  const parsed = UpdateProductBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const { price, salePrice, ...restData } = parsed.data;
  const updates: Record<string, unknown> = { ...restData };
  if (price != null) updates.price = String(price);
  if (salePrice != null) updates.salePrice = String(salePrice);
  const [product] = await db.update(productsTable).set(updates).where(eq(productsTable.id, params.data.id)).returning();
  if (!product) { res.status(404).json({ error: "Product not found" }); return; }
  res.json(await enrichProduct(product));
});

router.delete("/products/:id", requireAuth, requireRole("admin", "vendor"), async (req, res): Promise<void> => {
  const params = DeleteProductParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }
  await db.delete(productsTable).where(eq(productsTable.id, params.data.id));
  res.json({ message: "Product deleted" });
});

export default router;
