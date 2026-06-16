import { pgTable, serial, integer, timestamp, numeric } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const abandonedCartRemindersTable = pgTable("abandoned_cart_reminders", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().unique().references(() => usersTable.id, { onDelete: "cascade" }),
  cartItemsCount: integer("cart_items_count").notNull().default(0),
  cartValue: numeric("cart_value", { precision: 10, scale: 2 }),
  detectedAt: timestamp("detected_at", { withTimezone: true }).notNull().defaultNow(),
  emailSentAt: timestamp("email_sent_at", { withTimezone: true }),
  whatsappSentAt: timestamp("whatsapp_sent_at", { withTimezone: true }),
  recoveredAt: timestamp("recovered_at", { withTimezone: true }),
});

export type AbandonedCartReminder = typeof abandonedCartRemindersTable.$inferSelect;
