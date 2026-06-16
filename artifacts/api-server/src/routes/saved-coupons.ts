import { Router, type IRouter } from "express";
import { db, savedCouponsTable, couponsTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

// ── List saved coupons ───────────────────────────────────────────────────────
router.get("/saved-coupons", requireAuth, async (req, res): Promise<void> => {
  const userId = req.user!.id;

  const saved = await db
    .select({
      id: savedCouponsTable.id,
      couponCode: savedCouponsTable.couponCode,
      savedAt: savedCouponsTable.savedAt,
      discountType: couponsTable.discountType,
      discountValue: couponsTable.discountValue,
      endDate: couponsTable.endDate,
      active: couponsTable.active,
      usageCount: couponsTable.usageCount,
      usageLimit: couponsTable.usageLimit,
    })
    .from(savedCouponsTable)
    .leftJoin(couponsTable, eq(savedCouponsTable.couponCode, couponsTable.code))
    .where(eq(savedCouponsTable.userId, userId))
    .orderBy(desc(savedCouponsTable.savedAt));

  res.json(saved);
});

// ── Save a coupon ────────────────────────────────────────────────────────────
router.post("/saved-coupons", requireAuth, async (req, res): Promise<void> => {
  const userId = req.user!.id;
  const { couponCode } = req.body ?? {};
  if (!couponCode || typeof couponCode !== "string") {
    res.status(400).json({ error: "couponCode is required" }); return;
  }
  const code = couponCode.trim().toUpperCase();

  // Verify coupon exists
  const [coupon] = await db.select().from(couponsTable).where(eq(couponsTable.code, code));
  if (!coupon) { res.status(404).json({ error: "Coupon not found" }); return; }

  const [saved] = await db
    .insert(savedCouponsTable)
    .values({ userId, couponCode: code })
    .onConflictDoNothing()
    .returning();

  res.status(201).json(saved ?? { userId, couponCode: code, alreadySaved: true });
});

// ── Remove a saved coupon ────────────────────────────────────────────────────
router.delete("/saved-coupons/:code", requireAuth, async (req, res): Promise<void> => {
  const userId = req.user!.id;
  const code = String(req.params.code).toUpperCase();

  await db
    .delete(savedCouponsTable)
    .where(and(eq(savedCouponsTable.userId, userId), eq(savedCouponsTable.couponCode, code)));

  res.json({ ok: true });
});

export default router;
