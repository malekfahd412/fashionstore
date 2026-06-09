import { Router, type IRouter } from "express";
import { db, productsTable, productVariantsTable, productImagesTable, categoriesTable, usersTable, reviewsTable } from "@workspace/db";
import { eq, and, ilike, gte, lte, desc, asc, count, avg, inArray, SQL } from "drizzle-orm";
import { requireAuth, requireRole, optionalAuth } from "../middlewares/auth";
import {
  CreateProductBody, UpdateProductBody, GetProductParams, UpdateProductParams,
  DeleteProductParams, ListProductsQueryParams,
} from "@workspace/api-zod";

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

router.get("/products", optionalAuth, async (req, res): Promise<void> => {
  const query = ListProductsQueryParams.safeParse(req.query);
  const params = query.success ? query.data : {};
  const { search, categoryId, vendorId, minPrice, maxPrice, featured, sortBy, page = 1, limit = 20 } = params;

  const conditions: SQL[] = [eq(productsTable.active, true)];
  if (search) conditions.push(ilike(productsTable.nameEn, `%${search}%`));
  if (categoryId) conditions.push(eq(productsTable.categoryId, Number(categoryId)));
  if (vendorId) conditions.push(eq(productsTable.vendorId, Number(vendorId)));
  if (minPrice) conditions.push(gte(productsTable.price, String(minPrice)));
  if (maxPrice) conditions.push(lte(productsTable.price, String(maxPrice)));
  if (featured === true || featured === "true" as unknown) conditions.push(eq(productsTable.featured, true));

  let orderBy = desc(productsTable.createdAt);
  if (sortBy === "price_asc") orderBy = asc(productsTable.price);
  else if (sortBy === "price_desc") orderBy = desc(productsTable.price);

  const products = await db.select().from(productsTable)
    .where(and(...conditions))
    .orderBy(orderBy)
    .limit(Number(limit))
    .offset((Number(page) - 1) * Number(limit));

  const total = await db.$count(productsTable, and(...conditions));
  const enriched = await Promise.all(products.map(enrichProduct));

  res.json({ products: enriched, total, page: Number(page), limit: Number(limit) });
});

router.get("/products/featured", async (_req, res): Promise<void> => {
  const products = await db.select().from(productsTable)
    .where(and(eq(productsTable.featured, true), eq(productsTable.active, true)))
    .orderBy(desc(productsTable.createdAt)).limit(8);
  const enriched = await Promise.all(products.map(enrichProduct));
  res.json(enriched);
});

router.get("/products/new-arrivals", async (_req, res): Promise<void> => {
  const products = await db.select().from(productsTable)
    .where(eq(productsTable.active, true))
    .orderBy(desc(productsTable.createdAt)).limit(8);
  const enriched = await Promise.all(products.map(enrichProduct));
  res.json(enriched);
});

router.get("/products/best-sellers", async (_req, res): Promise<void> => {
  const products = await db.select().from(productsTable)
    .where(eq(productsTable.active, true))
    .orderBy(desc(productsTable.createdAt)).limit(8);
  const enriched = await Promise.all(products.map(enrichProduct));
  res.json(enriched);
});

router.get("/products/:id", optionalAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const [product] = await db.select().from(productsTable).where(eq(productsTable.id, id));
  if (!product) { res.status(404).json({ error: "Product not found" }); return; }
  const enriched = await enrichProduct(product);
  res.json(enriched);
});

router.get("/products/:id/related", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const [product] = await db.select().from(productsTable).where(eq(productsTable.id, id));
  if (!product) { res.json([]); return; }
  const related = await db.select().from(productsTable)
    .where(and(eq(productsTable.categoryId, product.categoryId), eq(productsTable.active, true)))
    .orderBy(desc(productsTable.createdAt)).limit(6);
  const enriched = await Promise.all(related.filter(p => p.id !== id).map(enrichProduct));
  res.json(enriched);
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
  const enriched = await enrichProduct(product);
  res.status(201).json(enriched);
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
  const enriched = await enrichProduct(product);
  res.json(enriched);
});

router.delete("/products/:id", requireAuth, requireRole("admin", "vendor"), async (req, res): Promise<void> => {
  const params = DeleteProductParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }
  await db.delete(productsTable).where(eq(productsTable.id, params.data.id));
  res.json({ message: "Product deleted" });
});

export default router;
