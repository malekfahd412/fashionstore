import { pgTable, serial, integer, text, boolean, timestamp, index } from "drizzle-orm/pg-core";

export const loginAttemptsTable = pgTable("login_attempts", {
  id: serial("id").primaryKey(),
  email: text("email").notNull(),
  ip: text("ip").notNull(),
  userId: integer("user_id"),
  userAgent: text("user_agent"),
  success: boolean("success").notNull().default(false),
  attemptedAt: timestamp("attempted_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("login_attempts_email_idx").on(t.email),
  index("login_attempts_ip_idx").on(t.ip),
  index("login_attempts_email_success_at_idx").on(t.email, t.success, t.attemptedAt),
  index("login_attempts_ip_success_at_idx").on(t.ip, t.success, t.attemptedAt),
  index("login_attempts_attempted_at_idx").on(t.attemptedAt),
]);

export type LoginAttempt = typeof loginAttemptsTable.$inferSelect;
