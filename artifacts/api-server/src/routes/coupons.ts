import { Router, type IRouter } from "express";
import { db, couponsTable, ordersTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth, requireRole, optionalAuth } from "../middlewares/auth";
import { z } from "zod";

const router: IRouter = Router();

function formatCoupon(c: typeof couponsTable.$inferSelect) {
  return {
    ...c,
    discountValue: Number(c.discountValue),
    minOrderAmount: c.minOrderAmount != null ? Number(c.minOrderAmount) : null,
    maxDiscountAmount: c.maxDiscountAmount != null ? Number(c.maxDiscountAmount) : null,
    startDate: c.startDate ? c.startDate.toISOString() : null,
    endDate: c.endDate ? c.endDate.toISOString() : null,
  };
}

const CreateCouponSchema = z.object({
  code: z.string().min(1).max(50).toUpperCase(),
  discountType: z.enum(["percentage", "fixed"]),
  discountValue: z.number().positive(),
  minOrderAmount: z.number().min(0).nullable().optional(),
  maxDiscountAmount: z.number().positive().nullable().optional(),
  oneUsePerUser: z.boolean().optional(),
  startDate: z.string().nullable().optional(),
  endDate: z.string().nullable().optional(),
  usageLimit: z.number().int().min(1).nullable().optional(),
  active: z.boolean().optional(),
});

const UpdateCouponSchema = CreateCouponSchema.partial();

const ValidateCouponSchema = z.object({
  code: z.string().min(1),
  orderTotal: z.number().min(0).optional(),
});

router.get("/coupons", requireAuth, requireRole("admin"), async (_req, res): Promise<void> => {
  const coupons = await db.select().from(couponsTable).orderBy(couponsTable.createdAt);
  res.json(coupons.map(formatCoupon));
});

router.post("/coupons/validate", optionalAuth, async (req, res): Promise<void> => {
  const parsed = ValidateCouponSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const { code, orderTotal } = parsed.data;

  const [coupon] = await db.select().from(couponsTable).where(eq(couponsTable.code, code));
  if (!coupon || !coupon.active) { res.status(404).json({ error: "Invalid coupon" }); return; }

  const now = new Date();
  if (coupon.startDate && coupon.startDate > now) { res.status(400).json({ error: "Coupon not yet active" }); return; }
  if (coupon.endDate && coupon.endDate < now) { res.status(400).json({ error: "Coupon expired" }); return; }
  if (coupon.usageLimit != null && coupon.usageCount >= coupon.usageLimit) { res.status(400).json({ error: "Coupon usage limit reached" }); return; }

  const minAmount = coupon.minOrderAmount != null ? Number(coupon.minOrderAmount) : null;
  if (minAmount !== null && orderTotal !== undefined && orderTotal < minAmount) {
    res.status(400).json({ error: `Minimum order amount of ${minAmount.toFixed(2)} EGP required for this coupon` }); return;
  }

  // Per-user usage check (requires auth)
  if (coupon.oneUsePerUser && req.user) {
    const [used] = await db.select({ id: ordersTable.id })
      .from(ordersTable)
      .where(and(eq(ordersTable.userId, req.user.id), eq(ordersTable.couponCode, code)))
      .limit(1);
    if (used) { res.status(400).json({ error: "You have already used this coupon" }); return; }
  }

  res.json(formatCoupon(coupon));
});

router.post("/coupons", requireAuth, requireRole("admin"), async (req, res): Promise<void> => {
  const parsed = CreateCouponSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const { discountValue, minOrderAmount, maxDiscountAmount, startDate, endDate, ...rest } = parsed.data;
  const [coupon] = await db.insert(couponsTable).values({
    ...rest,
    discountValue: String(discountValue),
    minOrderAmount: minOrderAmount != null ? String(minOrderAmount) : null,
    maxDiscountAmount: maxDiscountAmount != null ? String(maxDiscountAmount) : null,
    startDate: startDate ? new Date(startDate) : null,
    endDate: endDate ? new Date(endDate) : null,
  }).returning();
  res.status(201).json(formatCoupon(coupon));
});

router.patch("/coupons/:id", requireAuth, requireRole("admin"), async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!id) { res.status(400).json({ error: "Invalid id" }); return; }
  const parsed = UpdateCouponSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const { discountValue, minOrderAmount, maxDiscountAmount, startDate, endDate, ...rest } = parsed.data;
  const updates: Record<string, unknown> = { ...rest };
  if (discountValue != null) updates.discountValue = String(discountValue);
  if (minOrderAmount !== undefined) updates.minOrderAmount = minOrderAmount != null ? String(minOrderAmount) : null;
  if (maxDiscountAmount !== undefined) updates.maxDiscountAmount = maxDiscountAmount != null ? String(maxDiscountAmount) : null;
  if (startDate !== undefined) updates.startDate = startDate ? new Date(startDate) : null;
  if (endDate !== undefined) updates.endDate = endDate ? new Date(endDate) : null;
  const [coupon] = await db.update(couponsTable).set(updates).where(eq(couponsTable.id, id)).returning();
  if (!coupon) { res.status(404).json({ error: "Coupon not found" }); return; }
  res.json(formatCoupon(coupon));
});

router.delete("/coupons/:id", requireAuth, requireRole("admin"), async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!id) { res.status(400).json({ error: "Invalid id" }); return; }
  await db.delete(couponsTable).where(eq(couponsTable.id, id));
  res.json({ message: "Coupon deleted" });
});

export default router;
