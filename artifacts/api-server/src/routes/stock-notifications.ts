import { Router, type IRouter } from "express";
import {
  db,
  stockNotificationsTable,
  productVariantsTable,
  productsTable,
  productImagesTable,
  usersTable,
} from "@workspace/db";
import { eq, and, isNull, inArray } from "drizzle-orm";
import { requireAuth, requireRole } from "../middlewares/auth";
import { sendBackInStockEmail } from "../lib/email";

const router: IRouter = Router();

// ── Check subscription status ─────────────────────────────────────────────────
router.get("/products/variants/:variantId/notify", requireAuth, async (req, res): Promise<void> => {
  const variantId = Number(req.params.variantId);
  if (!variantId) { res.status(400).json({ error: "Invalid variantId" }); return; }
  const userId = req.user!.id;

  const [sub] = await db
    .select({ id: stockNotificationsTable.id, notifiedAt: stockNotificationsTable.notifiedAt })
    .from(stockNotificationsTable)
    .where(and(eq(stockNotificationsTable.userId, userId), eq(stockNotificationsTable.variantId, variantId)))
    .limit(1);

  res.json({ subscribed: !!sub && sub.notifiedAt === null });
});

// ── Subscribe to back-in-stock notification ───────────────────────────────────
router.post("/products/variants/:variantId/notify", requireAuth, async (req, res): Promise<void> => {
  const variantId = Number(req.params.variantId);
  if (!variantId) { res.status(400).json({ error: "Invalid variantId" }); return; }
  const userId = req.user!.id;

  const [variant] = await db
    .select({ id: productVariantsTable.id, stockQuantity: productVariantsTable.stockQuantity })
    .from(productVariantsTable)
    .where(eq(productVariantsTable.id, variantId))
    .limit(1);
  if (!variant) { res.status(404).json({ error: "Variant not found" }); return; }
  if (variant.stockQuantity > 0) { res.status(400).json({ error: "Item is already in stock" }); return; }

  await db
    .insert(stockNotificationsTable)
    .values({ userId, variantId, notifiedAt: null })
    .onConflictDoUpdate({
      target: [stockNotificationsTable.userId, stockNotificationsTable.variantId],
      set: { notifiedAt: null, createdAt: new Date() },
    });

  res.status(201).json({ subscribed: true });
});

// ── Unsubscribe ───────────────────────────────────────────────────────────────
router.delete("/products/variants/:variantId/notify", requireAuth, async (req, res): Promise<void> => {
  const variantId = Number(req.params.variantId);
  if (!variantId) { res.status(400).json({ error: "Invalid variantId" }); return; }
  const userId = req.user!.id;

  await db
    .delete(stockNotificationsTable)
    .where(and(eq(stockNotificationsTable.userId, userId), eq(stockNotificationsTable.variantId, variantId)));

  res.json({ subscribed: false });
});

// ── Admin/vendor: update variant stock ────────────────────────────────────────
router.patch("/products/variants/:variantId", requireAuth, requireRole("admin", "vendor"), async (req, res): Promise<void> => {
  const variantId = Number(req.params.variantId);
  if (!variantId) { res.status(400).json({ error: "Invalid variantId" }); return; }

  const { stockQuantity, color, size } = req.body ?? {};
  if (stockQuantity === undefined && color === undefined && size === undefined) {
    res.status(400).json({ error: "No fields to update" }); return;
  }
  if (stockQuantity !== undefined && (typeof stockQuantity !== "number" || !Number.isInteger(stockQuantity) || stockQuantity < 0)) {
    res.status(400).json({ error: "stockQuantity must be a non-negative integer" }); return;
  }

  const [existing] = await db
    .select({
      id: productVariantsTable.id,
      stockQuantity: productVariantsTable.stockQuantity,
      productId: productVariantsTable.productId,
      color: productVariantsTable.color,
      size: productVariantsTable.size,
      vendorId: productsTable.vendorId,
    })
    .from(productVariantsTable)
    .innerJoin(productsTable, eq(productsTable.id, productVariantsTable.productId))
    .where(eq(productVariantsTable.id, variantId))
    .limit(1);

  if (!existing) { res.status(404).json({ error: "Variant not found" }); return; }
  if (req.user!.role === "vendor" && existing.vendorId !== req.user!.id) {
    res.status(403).json({ error: "Forbidden: not your product" }); return;
  }

  const updates: Record<string, unknown> = {};
  if (stockQuantity !== undefined) updates.stockQuantity = stockQuantity;
  if (color !== undefined) updates.color = String(color);
  if (size !== undefined) updates.size = String(size);

  const [updated] = await db
    .update(productVariantsTable)
    .set(updates)
    .where(eq(productVariantsTable.id, variantId))
    .returning();

  res.json(updated);

  // Back-in-stock emails (non-blocking): old stock was 0, new stock > 0
  if (stockQuantity !== undefined && existing.stockQuantity === 0 && stockQuantity > 0) {
    void (async () => {
      const subscribers = await db
        .select({ userId: stockNotificationsTable.userId })
        .from(stockNotificationsTable)
        .where(
          and(
            eq(stockNotificationsTable.variantId, variantId),
            isNull(stockNotificationsTable.notifiedAt),
          )
        );

      if (subscribers.length === 0) return;

      const [product] = await db
        .select({
          id: productsTable.id,
          nameEn: productsTable.nameEn,
          imageUrl: productImagesTable.imageUrl,
        })
        .from(productsTable)
        .leftJoin(productImagesTable, and(eq(productImagesTable.productId, productsTable.id), eq(productImagesTable.isPrimary, true)))
        .where(eq(productsTable.id, existing.productId))
        .limit(1);

      if (!product) return;

      const userIds = subscribers.map(s => s.userId);
      const users = await db
        .select({ id: usersTable.id, email: usersTable.email, name: usersTable.name })
        .from(usersTable)
        .where(inArray(usersTable.id, userIds));

      await Promise.all(
        users.map(u =>
          sendBackInStockEmail(u.email, u.name, {
            id: product.id,
            nameEn: product.nameEn,
            color: existing.color,
            size: existing.size,
            imageUrl: product.imageUrl,
          })
        )
      );

      // Mark all as notified
      await db
        .update(stockNotificationsTable)
        .set({ notifiedAt: new Date() })
        .where(
          and(
            eq(stockNotificationsTable.variantId, variantId),
            isNull(stockNotificationsTable.notifiedAt),
          )
        );
    })();
  }
});

export default router;
