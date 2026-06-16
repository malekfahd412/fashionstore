import { pgTable, serial, integer, timestamp, index, unique } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { productsTable } from "./products";

export const recentlyViewedTable = pgTable("recently_viewed", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  productId: integer("product_id").notNull().references(() => productsTable.id, { onDelete: "cascade" }),
  viewedAt: timestamp("viewed_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (t) => [
  unique("recently_viewed_user_product_unique").on(t.userId, t.productId),
  index("recently_viewed_user_id_idx").on(t.userId),
  index("recently_viewed_viewed_at_idx").on(t.viewedAt),
]);

export type RecentlyViewed = typeof recentlyViewedTable.$inferSelect;
