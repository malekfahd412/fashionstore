import { pgTable, serial, integer, text, timestamp, index } from "drizzle-orm/pg-core";

export const manualPaymentsTable = pgTable("manual_payments", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull(),
  method: text("method").notNull(),
  referenceNumber: text("reference_number"),
  status: text("status").notNull().default("pending"),
  adminNote: text("admin_note"),
  reviewedBy: integer("reviewed_by"),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (t) => [
  index("manual_payments_order_id_idx").on(t.orderId),
  index("manual_payments_status_idx").on(t.status),
]);

export type ManualPayment = typeof manualPaymentsTable.$inferSelect;
