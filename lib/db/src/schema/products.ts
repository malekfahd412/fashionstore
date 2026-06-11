import { pgTable, serial, text, integer, numeric, boolean, timestamp, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const productsTable = pgTable("products", {
  id: serial("id").primaryKey(),
  nameEn: text("name_en").notNull(),
  nameAr: text("name_ar").notNull(),
  descriptionEn: text("description_en"),
  descriptionAr: text("description_ar"),
  categoryId: integer("category_id").notNull(),
  vendorId: integer("vendor_id").notNull(),
  price: numeric("price", { precision: 10, scale: 2 }).notNull(),
  salePrice: numeric("sale_price", { precision: 10, scale: 2 }),
  sku: text("sku"),
  featured: boolean("featured").notNull().default(false),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (t) => [
  index("products_category_id_idx").on(t.categoryId),
  index("products_vendor_id_idx").on(t.vendorId),
  index("products_active_idx").on(t.active),
  index("products_featured_idx").on(t.featured),
  index("products_created_at_idx").on(t.createdAt),
  // Composite: active catalog by category (primary browse query)
  index("products_active_category_id_idx").on(t.active, t.categoryId),
  // Composite: active + featured (homepage featured listing)
  index("products_active_featured_idx").on(t.active, t.featured),
  // Composite: active + vendor (vendor product management)
  index("products_active_vendor_id_idx").on(t.active, t.vendorId),
  // Composite: active + date (new-arrivals and sorting by date)
  index("products_active_created_at_idx").on(t.active, t.createdAt),
]);

export const productVariantsTable = pgTable("product_variants", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").notNull(),
  color: text("color").notNull(),
  size: text("size").notNull(),
  stockQuantity: integer("stock_quantity").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("product_variants_product_id_idx").on(t.productId),
  // Stock monitoring: variants with low stock (admin dashboard)
  index("product_variants_stock_quantity_idx").on(t.stockQuantity),
]);

export const productImagesTable = pgTable("product_images", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").notNull(),
  imageUrl: text("image_url").notNull(),
  cloudinaryPublicId: text("cloudinary_public_id"),
  isPrimary: boolean("is_primary").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("product_images_product_id_idx").on(t.productId),
  // Composite: primary image lookup per product (heavily used in enrichment)
  index("product_images_product_id_is_primary_idx").on(t.productId, t.isPrimary),
]);

export const insertProductSchema = createInsertSchema(productsTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertProductVariantSchema = createInsertSchema(productVariantsTable).omit({ id: true, createdAt: true });
export const insertProductImageSchema = createInsertSchema(productImagesTable).omit({ id: true, createdAt: true });

export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof productsTable.$inferSelect;
export type ProductVariant = typeof productVariantsTable.$inferSelect;
export type ProductImage = typeof productImagesTable.$inferSelect;
