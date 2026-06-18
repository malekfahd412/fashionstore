import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { upload, uploadImage, deleteImage, isCloudinaryConfigured } from "../lib/cloudinary";
import { requireAuth, requireRole } from "../middlewares/auth";
import { db, productImagesTable, productsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

const router: IRouter = Router();

function handleMulterError(err: unknown, _req: Request, res: Response, next: NextFunction): void {
  if (err instanceof Error && err.message.includes("Only image")) {
    res.status(400).json({ error: err.message }); return;
  }
  if (err instanceof Error && (err as { code?: string }).code === "LIMIT_FILE_SIZE") {
    res.status(400).json({ error: "File too large — maximum size is 15 MB" }); return;
  }
  next(err);
}

// ── Upload product image ───────────────────────────────────────────────────────
router.post(
  "/uploads/image",
  requireAuth,
  requireRole("admin", "vendor"),
  upload.single("image"),
  handleMulterError,
  async (req: Request, res: Response): Promise<void> => {
    if (!isCloudinaryConfigured()) {
      res.status(503).json({ error: "Image uploads are not configured. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET." });
      return;
    }
    if (!req.file) {
      res.status(400).json({ error: "No image file provided. Send a multipart/form-data request with field name 'image'." });
      return;
    }
    const folder = (req.body as { folder?: string }).folder ?? "products";
    const result = await uploadImage(req.file.buffer, folder);
    res.json(result);
  }
);

// ── Delete a Cloudinary image and remove from DB ───────────────────────────────
router.delete(
  "/uploads/image/:imageId",
  requireAuth,
  requireRole("admin", "vendor"),
  async (req: Request, res: Response): Promise<void> => {
    const imageId = parseInt(req.params.imageId as string, 10);
    if (isNaN(imageId)) { res.status(400).json({ error: "Invalid imageId" }); return; }

    const [img] = await db.select().from(productImagesTable).where(eq(productImagesTable.id, imageId));
    if (!img) { res.status(404).json({ error: "Image not found" }); return; }

    // Vendor isolation for deletion
    if (req.user!.role === "vendor") {
      const [product] = await db.select({ vendorId: productsTable.vendorId })
        .from(productsTable).where(eq(productsTable.id, img.productId));
      if (!product || product.vendorId !== req.user!.id) {
        res.status(403).json({ error: "Forbidden: you can only delete images of your own products" });
        return;
      }
    }

    // Delete from Cloudinary if we have the publicId
    if (img.cloudinaryPublicId) {
      await deleteImage(img.cloudinaryPublicId);
    }
    await db.delete(productImagesTable).where(eq(productImagesTable.id, imageId));
    res.json({ deleted: true });
  }
);

// ── Set primary image ──────────────────────────────────────────────────────────
router.patch(
  "/uploads/image/:imageId/primary",
  requireAuth,
  requireRole("admin", "vendor"),
  async (req: Request, res: Response): Promise<void> => {
    const imageId = parseInt(req.params.imageId as string, 10);
    if (isNaN(imageId)) { res.status(400).json({ error: "Invalid imageId" }); return; }

    const [img] = await db.select().from(productImagesTable).where(eq(productImagesTable.id, imageId));
    if (!img) { res.status(404).json({ error: "Image not found" }); return; }

    // Vendor isolation for primary image selection
    if (req.user!.role === "vendor") {
      const [product] = await db.select({ vendorId: productsTable.vendorId })
        .from(productsTable).where(eq(productsTable.id, img.productId));
      if (!product || product.vendorId !== req.user!.id) {
        res.status(403).json({ error: "Forbidden: you can only manage images of your own products" });
        return;
      }
    }

    // Unset all primary for this product, then set this one
    await db.update(productImagesTable).set({ isPrimary: false }).where(eq(productImagesTable.productId, img.productId));
    await db.update(productImagesTable).set({ isPrimary: true }).where(
      and(eq(productImagesTable.id, imageId), eq(productImagesTable.productId, img.productId))
    );
    res.json({ success: true });
  }
);

export default router;
