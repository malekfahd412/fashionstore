import { pgTable, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";

export const userSecurityPrefsTable = pgTable("user_security_prefs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().unique(),
  loginAlertsEnabled: boolean("login_alerts_enabled").notNull().default(true),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type UserSecurityPrefs = typeof userSecurityPrefsTable.$inferSelect;
