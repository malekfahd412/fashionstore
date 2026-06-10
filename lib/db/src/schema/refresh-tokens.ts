import { pgTable, serial, integer, text, timestamp, index } from "drizzle-orm/pg-core";

export const refreshTokensTable = pgTable("refresh_tokens", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  tokenHash: text("token_hash").notNull().unique(),
  userAgent: text("user_agent"),
  ip: text("ip"),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("refresh_tokens_user_id_idx").on(t.userId),
  index("refresh_tokens_token_hash_idx").on(t.tokenHash),
]);

export type RefreshToken = typeof refreshTokensTable.$inferSelect;
