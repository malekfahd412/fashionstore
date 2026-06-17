import { pgTable, serial, integer, timestamp, index, unique } from "drizzle-orm/pg-core";

export const stockNotificationsTable = pgTable("stock_notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  variantId: integer("variant_id").notNull(),
  notifiedAt: timestamp("notified_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("stock_notif_user_idx").on(t.userId),
  index("stock_notif_variant_idx").on(t.variantId),
  unique("stock_notif_unique").on(t.userId, t.variantId),
]);

export type StockNotification = typeof stockNotificationsTable.$inferSelect;
