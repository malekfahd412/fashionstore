import { pgTable, serial, integer, bigint, text, jsonb, timestamp, index } from "drizzle-orm/pg-core";

export const paymentsTable = pgTable("payments", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull(),
  paymobOrderId: bigint("paymob_order_id", { mode: "number" }),
  transactionId: bigint("transaction_id", { mode: "number" }),
  status: text("status").notNull().default("pending"),
  amountCents: integer("amount_cents").notNull(),
  currency: text("currency").notNull().default("EGP"),
  method: text("method").notNull(),
  rawData: jsonb("raw_data"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (t) => [
  index("payments_order_id_idx").on(t.orderId),
  index("payments_paymob_order_id_idx").on(t.paymobOrderId),
  index("payments_transaction_id_idx").on(t.transactionId),
]);

export type Payment = typeof paymentsTable.$inferSelect;
