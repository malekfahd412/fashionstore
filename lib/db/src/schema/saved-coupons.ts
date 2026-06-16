import { pgTable, serial, integer, text, timestamp, index, unique } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const savedCouponsTable = pgTable("saved_coupons", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  couponCode: text("coupon_code").notNull(),
  savedAt: timestamp("saved_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  unique("saved_coupons_user_code_unique").on(t.userId, t.couponCode),
  index("saved_coupons_user_id_idx").on(t.userId),
]);

export type SavedCoupon = typeof savedCouponsTable.$inferSelect;
