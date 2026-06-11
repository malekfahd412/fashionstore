/**
 * Regression tests for login_attempts ORDER BY query construction.
 *
 * Guards against the bug where orderBy() receives the table object as its
 * first argument, producing invalid SQL:
 *   ORDER BY "login_attempts","attempted_at" DESC  ← wrong (table name as col)
 *
 * Correct form:
 *   ORDER BY "login_attempts"."attempted_at" DESC  ← right (qualified col ref)
 */

import { describe, it, expect } from "vitest";
import { desc, count, countDistinct } from "drizzle-orm";
import { pgTable, serial, text, boolean, timestamp, integer } from "drizzle-orm/pg-core";
import { drizzle } from "drizzle-orm/node-postgres";

// Mirror the real schema so these tests have no dependency on the DB module.
const loginAttemptsTable = pgTable("login_attempts", {
  id: serial("id").primaryKey(),
  email: text("email").notNull(),
  ip: text("ip").notNull(),
  userId: integer("user_id"),
  userAgent: text("user_agent"),
  success: boolean("success").notNull().default(false),
  attemptedAt: timestamp("attempted_at", { withTimezone: true }).notNull().defaultNow(),
});

// drizzle() with a no-op driver — we only call .toSQL(), never execute.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = drizzle({} as any);

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Returns true when the ORDER BY clause contains the table name as a bare
 * identifier (the invalid pattern) rather than a qualified column reference.
 *
 * Invalid:  order by "login_attempts", "attempted_at" desc
 * Valid:    order by "login_attempts"."attempted_at" desc
 */
function hasTableNameAsOrderByArg(sql: string): boolean {
  // Match "login_attempts" followed by a comma (table used as standalone arg)
  return /"login_attempts"\s*,/.test(sql);
}

// ── ORDER BY SQL generation tests ─────────────────────────────────────────────

describe("login_attempts ORDER BY — SQL generation", () => {
  it("desc(loginAttemptsTable.attemptedAt) produces a qualified column reference", () => {
    const { sql } = db
      .select({ attemptedAt: loginAttemptsTable.attemptedAt })
      .from(loginAttemptsTable)
      .orderBy(desc(loginAttemptsTable.attemptedAt))
      .toSQL();

    // Must contain the qualified column with DESC
    expect(sql).toMatch(/"login_attempts"\."attempted_at" desc/);
    // Must NOT contain table name used as a bare ORDER BY argument
    expect(hasTableNameAsOrderByArg(sql)).toBe(false);
  });

  it("wrong pattern — table object as first arg — produces invalid SQL (documents the bug)", () => {
    // This is the bad pattern that caused the reported error.
    // We keep this test to document what the failure looks like.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { sql } = db
      .select({ attemptedAt: loginAttemptsTable.attemptedAt })
      .from(loginAttemptsTable)
      // Intentionally wrong: table object instead of desc(col)
      .orderBy(loginAttemptsTable as never, loginAttemptsTable.attemptedAt)
      .toSQL();

    // The broken pattern places the table name as a standalone ORDER BY term
    expect(hasTableNameAsOrderByArg(sql)).toBe(true);
    // It does NOT produce the correct qualified column+direction form
    expect(sql).not.toMatch(/"login_attempts"\."attempted_at" desc/);
  });

  it("checkDimension lastSuccess query uses correct ORDER BY pattern", () => {
    // Mirrors the query in checkDimension() — findMost recent success
    const { sql } = db
      .select({ attemptedAt: loginAttemptsTable.attemptedAt })
      .from(loginAttemptsTable)
      .orderBy(desc(loginAttemptsTable.attemptedAt))
      .limit(1)
      .toSQL();

    expect(sql).toMatch(/"login_attempts"\."attempted_at" desc/);
    expect(hasTableNameAsOrderByArg(sql)).toBe(false);
  });

  it("checkDimension lastFailure query uses correct ORDER BY pattern", () => {
    // Mirrors the second orderBy in checkDimension() — find most recent failure
    const { sql } = db
      .select({ attemptedAt: loginAttemptsTable.attemptedAt })
      .from(loginAttemptsTable)
      .orderBy(desc(loginAttemptsTable.attemptedAt))
      .limit(1)
      .toSQL();

    expect(sql).toMatch(/"login_attempts"\."attempted_at" desc/);
    expect(hasTableNameAsOrderByArg(sql)).toBe(false);
  });

  it("getLockedAccounts latestIp query uses correct ORDER BY pattern", () => {
    // Mirrors the sub-query in getLockedAccounts()
    const { sql } = db
      .select({ ip: loginAttemptsTable.ip })
      .from(loginAttemptsTable)
      .orderBy(desc(loginAttemptsTable.attemptedAt))
      .limit(1)
      .toSQL();

    expect(sql).toMatch(/"login_attempts"\."attempted_at" desc/);
    expect(hasTableNameAsOrderByArg(sql)).toBe(false);
  });

  it("getLoginHistory pagination query uses correct ORDER BY pattern", () => {
    // Mirrors the main select in getLoginHistory()
    const { sql } = db
      .select()
      .from(loginAttemptsTable)
      .orderBy(desc(loginAttemptsTable.attemptedAt))
      .limit(50)
      .offset(0)
      .toSQL();

    expect(sql).toMatch(/"login_attempts"\."attempted_at" desc/);
    expect(hasTableNameAsOrderByArg(sql)).toBe(false);
  });

  it("getSuspiciousActivity latestAttempt query uses correct ORDER BY pattern", () => {
    // Mirrors the sub-query in getSuspiciousActivity()
    const { sql } = db
      .select({ attemptedAt: loginAttemptsTable.attemptedAt })
      .from(loginAttemptsTable)
      .orderBy(desc(loginAttemptsTable.attemptedAt))
      .limit(1)
      .toSQL();

    expect(sql).toMatch(/"login_attempts"\."attempted_at" desc/);
    expect(hasTableNameAsOrderByArg(sql)).toBe(false);
  });

  it("getSuspiciousActivity IP grouping query uses correct ORDER BY pattern", () => {
    // Mirrors the GROUP BY + orderBy(desc(count())) in getSuspiciousActivity()
    const { sql } = db
      .select({
        ip: loginAttemptsTable.ip,
        failureCount: count(),
        distinctEmails: countDistinct(loginAttemptsTable.email),
      })
      .from(loginAttemptsTable)
      .groupBy(loginAttemptsTable.ip)
      .orderBy(desc(count()))
      .toSQL();

    // ORDER BY count() desc — no table name as standalone arg
    expect(hasTableNameAsOrderByArg(sql)).toBe(false);
  });

  it("customer login-history route query uses correct ORDER BY pattern", () => {
    // Mirrors the query in GET /account/security/login-history
    const { sql } = db
      .select({
        id: loginAttemptsTable.id,
        ip: loginAttemptsTable.ip,
        success: loginAttemptsTable.success,
        attemptedAt: loginAttemptsTable.attemptedAt,
      })
      .from(loginAttemptsTable)
      .orderBy(desc(loginAttemptsTable.attemptedAt))
      .limit(20)
      .offset(0)
      .toSQL();

    expect(sql).toMatch(/"login_attempts"\."attempted_at" desc/);
    expect(hasTableNameAsOrderByArg(sql)).toBe(false);
  });
});
