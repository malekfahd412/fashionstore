import { Router, type IRouter } from "express";
import { db, couponsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth, requireRole, optionalAuth } from "../middlewares/auth";
import { CreateCouponBody, UpdateCouponBody, UpdateCouponParams, DeleteCouponParams, ValidateCouponBody } from "@workspace/api-zod";

const router: IRouter = Router();

function formatCoupon(c: typeof couponsTable.$inferSelect) {
  return {
    ...c,
    discountValue: Number(c.discountValue),
    startDate: c.startDate ? c.startDate.toISOString() : null,
    endDate: c.endDate ? c.endDate.toISOString() : null,
  };
}

router.get("/coupons", requireAuth, requireRole("admin"), async (_req, res): Promise<void> => {
  const coupons = await db.select().from(couponsTable).orderBy(couponsTable.createdAt);
  res.json(coupons.map(formatCoupon));
});

router.post("/coupons/validate", optionalAuth, async (req, res): Promise<void> => {
  const parsed = ValidateCouponBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [coupon] = await db.select().from(couponsTable).where(eq(couponsTable.code, parsed.data.code));
  if (!coupon || !coupon.active) { res.status(404).json({ error: "Invalid coupon" }); return; }
  const now = new Date();
  if (coupon.startDate && coupon.startDate > now) { res.status(400).json({ error: "Coupon not yet active" }); return; }
  if (coupon.endDate && coupon.endDate < now) { res.status(400).json({ error: "Coupon expired" }); return; }
  if (coupon.usageLimit != null && coupon.usageCount >= coupon.usageLimit) { res.status(400).json({ error: "Coupon usage limit reached" }); return; }
  res.json(formatCoupon(coupon));
});

router.post("/coupons", requireAuth, requireRole("admin"), async (req, res): Promise<void> => {
  const parsed = CreateCouponBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [coupon] = await db.insert(couponsTable).values({
    ...parsed.data,
    discountValue: String(parsed.data.discountValue),
    startDate: parsed.data.startDate ? new Date(parsed.data.startDate) : null,
    endDate: parsed.data.endDate ? new Date(parsed.data.endDate) : null,
  }).returning();
  res.status(201).json(formatCoupon(coupon));
});

router.patch("/coupons/:id", requireAuth, requireRole("admin"), async (req, res): Promise<void> => {
  const params = UpdateCouponParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }
  const parsed = UpdateCouponBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const { discountValue, startDate, endDate, ...rest } = parsed.data;
  const updates: Record<string, unknown> = { ...rest };
  if (discountValue != null) updates.discountValue = String(discountValue);
  if (startDate) updates.startDate = new Date(startDate);
  if (endDate) updates.endDate = new Date(endDate);
  const [coupon] = await db.update(couponsTable).set(updates).where(eq(couponsTable.id, params.data.id)).returning();
  if (!coupon) { res.status(404).json({ error: "Coupon not found" }); return; }
  res.json(formatCoupon(coupon));
});

router.delete("/coupons/:id", requireAuth, requireRole("admin"), async (req, res): Promise<void> => {
  const params = DeleteCouponParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }
  await db.delete(couponsTable).where(eq(couponsTable.id, params.data.id));
  res.json({ message: "Coupon deleted" });
});

export default router;
