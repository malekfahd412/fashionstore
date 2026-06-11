import { pgTable, serial, integer, text, timestamp, uniqueIndex, index } from "drizzle-orm/pg-core";

export const trustedDevicesTable = pgTable("trusted_devices", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  deviceHash: text("device_hash").notNull(),
  deviceName: text("device_name").notNull(),
  browser: text("browser"),
  os: text("os"),
  ip: text("ip"),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex("trusted_devices_user_device_idx").on(t.userId, t.deviceHash),
  index("trusted_devices_user_id_idx").on(t.userId),
]);

export type TrustedDevice = typeof trustedDevicesTable.$inferSelect;
