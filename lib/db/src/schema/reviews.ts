import { pgTable, serial, integer, text, boolean, timestamp, index, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const reviewsTable = pgTable("reviews", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").notNull(),
  userId: integer("user_id").notNull(),
  orderId: integer("order_id"),
  rating: integer("rating").notNull(),
  title: text("title"),
  comment: text("comment"),
  verifiedPurchase: boolean("verified_purchase").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (t) => [
  index("reviews_product_id_idx").on(t.productId),
  index("reviews_user_id_idx").on(t.userId),
  index("reviews_rating_idx").on(t.rating),
  index("reviews_created_at_idx").on(t.createdAt),
  unique("reviews_product_user_unique").on(t.productId, t.userId),
]);

export const insertReviewSchema = createInsertSchema(reviewsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertReview = z.infer<typeof insertReviewSchema>;
export type Review = typeof reviewsTable.$inferSelect;
