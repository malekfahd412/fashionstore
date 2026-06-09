import { Router, type IRouter } from "express";
import { db, cartItemsTable, productVariantsTable, productsTable, productImagesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import { AddToCartBody, UpdateCartItemBody, UpdateCartItemParams, RemoveFromCartParams } from "@workspace/api-zod";

const router: IRouter = Router();

async function buildCart(userId: number) {
  const items = await db.select().from(cartItemsTable).where(eq(cartItemsTable.userId, userId));
  const enriched = await Promise.all(items.map(async (item) => {
    const [variant] = await db.select().from(productVariantsTable).where(eq(productVariantsTable.id, item.productVariantId));
    if (!variant) return null;
    const [product] = await db.select().from(productsTable).where(eq(productsTable.id, variant.productId));
    if (!product) return null;
    const [primaryImage] = await db.select().from(productImagesTable)
      .where(and(eq(productImagesTable.productId, product.id), eq(productImagesTable.isPrimary, true)));
    return {
      variantId: variant.id,
      productId: product.id,
      nameEn: product.nameEn,
      nameAr: product.nameAr,
      imageUrl: primaryImage?.imageUrl ?? null,
      price: Number(product.price),
      salePrice: product.salePrice ? Number(product.salePrice) : null,
      quantity: item.quantity,
      color: variant.color,
      size: variant.size,
      stockQuantity: variant.stockQuantity,
    };
  }));
  const validItems = enriched.filter(Boolean) as NonNullable<(typeof enriched)[0]>[];
  const subtotal = validItems.reduce((s, i) => s + (i.salePrice ?? i.price) * i.quantity, 0);
  return { items: validItems, subtotal, discount: 0, total: subtotal };
}

router.get("/cart", requireAuth, async (req, res): Promise<void> => {
  res.json(await buildCart(req.user!.id));
});

router.post("/cart/items", requireAuth, async (req, res): Promise<void> => {
  const parsed = AddToCartBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const existing = await db.select().from(cartItemsTable)
    .where(and(eq(cartItemsTable.userId, req.user!.id), eq(cartItemsTable.productVariantId, parsed.data.variantId)));
  if (existing.length > 0) {
    await db.update(cartItemsTable).set({ quantity: existing[0].quantity + parsed.data.quantity })
      .where(eq(cartItemsTable.id, existing[0].id));
  } else {
    await db.insert(cartItemsTable).values({ userId: req.user!.id, productVariantId: parsed.data.variantId, quantity: parsed.data.quantity });
  }
  res.json(await buildCart(req.user!.id));
});

router.patch("/cart/items/:variantId", requireAuth, async (req, res): Promise<void> => {
  const params = UpdateCartItemParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }
  const parsed = UpdateCartItemBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  await db.update(cartItemsTable).set({ quantity: parsed.data.quantity })
    .where(and(eq(cartItemsTable.userId, req.user!.id), eq(cartItemsTable.productVariantId, params.data.variantId)));
  res.json(await buildCart(req.user!.id));
});

router.delete("/cart/clear", requireAuth, async (req, res): Promise<void> => {
  await db.delete(cartItemsTable).where(eq(cartItemsTable.userId, req.user!.id));
  res.json({ message: "Cart cleared" });
});

router.delete("/cart/items/:variantId", requireAuth, async (req, res): Promise<void> => {
  const params = RemoveFromCartParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }
  await db.delete(cartItemsTable)
    .where(and(eq(cartItemsTable.userId, req.user!.id), eq(cartItemsTable.productVariantId, params.data.variantId)));
  res.json(await buildCart(req.user!.id));
});

export default router;
