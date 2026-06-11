import { Router, type IRouter } from "express";
import { db, bannersTable } from "@workspace/db";
import { eq, asc } from "drizzle-orm";
import { requireAuth, requireRole } from "../middlewares/auth";
import { CreateBannerBody, UpdateBannerBody, UpdateBannerParams, DeleteBannerParams } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/banners", async (_req, res): Promise<void> => {
  const banners = await db.select().from(bannersTable)
    .where(eq(bannersTable.active, true))
    .orderBy(asc(bannersTable.sortOrder));
  res.json(banners);
});

router.get("/banners/all", requireAuth, requireRole("admin"), async (_req, res): Promise<void> => {
  const banners = await db.select().from(bannersTable).orderBy(asc(bannersTable.sortOrder));
  res.json(banners);
});

router.post("/banners", requireAuth, requireRole("admin"), async (req, res): Promise<void> => {
  const parsed = CreateBannerBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [banner] = await db.insert(bannersTable).values(parsed.data).returning();
  res.status(201).json(banner);
});

router.patch("/banners/:id", requireAuth, requireRole("admin"), async (req, res): Promise<void> => {
  const params = UpdateBannerParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }
  const parsed = UpdateBannerBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [banner] = await db.update(bannersTable).set(parsed.data).where(eq(bannersTable.id, params.data.id)).returning();
  if (!banner) { res.status(404).json({ error: "Banner not found" }); return; }
  res.json(banner);
});

router.delete("/banners/:id", requireAuth, requireRole("admin"), async (req, res): Promise<void> => {
  const params = DeleteBannerParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }
  await db.delete(bannersTable).where(eq(bannersTable.id, params.data.id));
  res.json({ message: "Banner deleted" });
});

export default router;
