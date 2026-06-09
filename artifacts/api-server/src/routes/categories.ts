import { Router, type IRouter } from "express";
import { db, categoriesTable, productsTable } from "@workspace/db";
import { eq, count } from "drizzle-orm";
import { requireAuth, requireRole } from "../middlewares/auth";
import { CreateCategoryBody, UpdateCategoryBody, UpdateCategoryParams, DeleteCategoryParams } from "@workspace/api-zod";

const router: IRouter = Router();

async function getCategoriesWithCount() {
  const cats = await db.select().from(categoriesTable).orderBy(categoriesTable.nameEn);
  const result = await Promise.all(cats.map(async (cat) => {
    const [{ value }] = await db.select({ value: count() }).from(productsTable).where(eq(productsTable.categoryId, cat.id));
    return { ...cat, productCount: Number(value) };
  }));
  return result;
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
