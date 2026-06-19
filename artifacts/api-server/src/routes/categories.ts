import { Router, type IRouter } from "express";
import { db, categoriesTable, productsTable } from "@workspace/db";
import { eq, count, inArray } from "drizzle-orm";
import { requireAuth, requireRole } from "../middlewares/auth";
import { CreateCategoryBody, UpdateCategoryBody, UpdateCategoryParams, DeleteCategoryParams } from "@workspace/api-zod";

const router: IRouter = Router();

async function getCategoriesWithCount() {
  const [cats, counts] = await Promise.all([
    db.select().from(categoriesTable).orderBy(categoriesTable.nameEn),
    db.select({ categoryId: productsTable.categoryId, productCount: count() })
      .from(productsTable)
      .groupBy(productsTable.categoryId),
  ]);
  const countMap = new Map(counts.map(c => [c.categoryId, Number(c.productCount)]));
  return cats.map(cat => ({ ...cat, productCount: countMap.get(cat.id) ?? 0 }));
}

router.get("/categories", async (_req, res): Promise<void> => {
  const cats = await getCategoriesWithCount();
  res.json(cats);
});

router.post("/categories", requireAuth, requireRole("admin"), async (req, res): Promise<void> => {
  const parsed = CreateCategoryBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const slug = parsed.data.slug || parsed.data.nameEn.toLowerCase().replace(/\s+/g, "-");
  const [cat] = await db.insert(categoriesTable).values({ ...parsed.data, slug }).returning();
  res.status(201).json({ ...cat, productCount: 0 });
});

router.patch("/categories/:id", requireAuth, requireRole("admin"), async (req, res): Promise<void> => {
  const params = UpdateCategoryParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }
  const parsed = UpdateCategoryBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [cat] = await db.update(categoriesTable).set(parsed.data).where(eq(categoriesTable.id, params.data.id)).returning();
  if (!cat) { res.status(404).json({ error: "Category not found" }); return; }
  const [{ value }] = await db.select({ value: count() }).from(productsTable).where(eq(productsTable.categoryId, cat.id));
  res.json({ ...cat, productCount: Number(value) });
});

router.delete("/categories/:id", requireAuth, requireRole("admin"), async (req, res): Promise<void> => {
  const params = DeleteCategoryParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }
  await db.delete(categoriesTable).where(eq(categoriesTable.id, params.data.id));
  res.json({ message: "Category deleted" });
});

export default router;
