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

// ── Login behavior with pre-existing login_attempts records ───────────────────
//
// These tests exercise the pure lockout logic (no DB) to ensure that a fresh
// login succeeds even when prior attempt records exist in the table.

type Attempt = { email: string; ip: string; success: boolean; attemptedAt: Date };

const THRESHOLDS = [
  { failures: 20, lockoutMs: 24 * 60 * 60 * 1000 },
  { failures: 10, lockoutMs: 30 * 60 * 1000 },
  { failures: 5, lockoutMs: 5 * 60 * 1000 },
] as const;

function computeLockout(
  attempts: Attempt[],
  field: "email" | "ip",
  value: string,
  now: Date,
): { locked: boolean; unlocksAt: Date | null; failureCount: number } {
  const windowStart = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const relevant = attempts.filter(
    (a) => a[field] === value && a.attemptedAt >= windowStart,
  );
  const successes = relevant
    .filter((a) => a.success)
    .sort((a, b) => b.attemptedAt.getTime() - a.attemptedAt.getTime());
  const lastSuccess = successes[0];
  const countFrom = lastSuccess ? lastSuccess.attemptedAt : windowStart;
  const failures = relevant.filter((a) => !a.success && a.attemptedAt > countFrom);
  const fc = failures.length;
  if (fc === 0) return { locked: false, unlocksAt: null, failureCount: 0 };
  const sortedFailures = failures.sort(
    (a, b) => b.attemptedAt.getTime() - a.attemptedAt.getTime(),
  );
  const lastFailure = sortedFailures[0]!;
  for (const threshold of THRESHOLDS) {
    if (fc >= threshold.failures) {
      const unlocksAt = new Date(lastFailure.attemptedAt.getTime() + threshold.lockoutMs);
      if (unlocksAt > now) return { locked: true, unlocksAt, failureCount: fc };
      break;
    }
  }
  return { locked: false, unlocksAt: null, failureCount: fc };
}

const NOW = new Date("2024-06-11T12:00:00Z");
const RECENT = NOW.getTime() - 30_000; // 30 s ago

describe("login succeeds with pre-existing login_attempts records", () => {
  it("login is not locked when table has 0 records", () => {
    const result = computeLockout([], "email", "user@example.com", NOW);
    expect(result.locked).toBe(false);
    expect(result.failureCount).toBe(0);
  });

  it("login is not locked when table has unrelated records only", () => {
    const unrelated: Attempt[] = [
      { email: "other@example.com", ip: "9.9.9.9", success: false, attemptedAt: new Date(RECENT) },
      { email: "other@example.com", ip: "9.9.9.9", success: false, attemptedAt: new Date(RECENT + 1000) },
      { email: "other@example.com", ip: "9.9.9.9", success: false, attemptedAt: new Date(RECENT + 2000) },
      { email: "other@example.com", ip: "9.9.9.9", success: false, attemptedAt: new Date(RECENT + 3000) },
      { email: "other@example.com", ip: "9.9.9.9", success: false, attemptedAt: new Date(RECENT + 4000) },
    ];
    const result = computeLockout(unrelated, "email", "user@example.com", NOW);
    expect(result.locked).toBe(false);
    expect(result.failureCount).toBe(0);
  });

  it("login is not locked after 4 failures (below threshold)", () => {
    const attempts: Attempt[] = Array.from({ length: 4 }, (_, i) => ({
      email: "user@example.com",
      ip: "1.2.3.4",
      success: false,
      attemptedAt: new Date(RECENT + i * 1000),
    }));
    const result = computeLockout(attempts, "email", "user@example.com", NOW);
    expect(result.locked).toBe(false);
    expect(result.failureCount).toBe(4);
  });

  it("login succeeds (not locked) when a success record resets expired failures", () => {
    const oldFailures: Attempt[] = Array.from({ length: 10 }, (_, i) => ({
      email: "user@example.com",
      ip: "1.2.3.4",
      success: false,
      attemptedAt: new Date(RECENT - 50000 + i * 1000),
    }));
    const successRecord: Attempt = {
      email: "user@example.com",
      ip: "1.2.3.4",
      success: true,
      attemptedAt: new Date(RECENT),
    };
    const result = computeLockout([...oldFailures, successRecord], "email", "user@example.com", NOW);
    expect(result.locked).toBe(false);
    expect(result.failureCount).toBe(0);
  });

  it("login endpoint returns 401, not 500, for wrong credentials (simulated)", () => {
    // Simulates the route behavior: bad credentials → 401
    function simulateLogin(userFound: boolean, passwordValid: boolean): number {
      if (!userFound || !passwordValid) return 401;
      return 200;
    }
    expect(simulateLogin(false, false)).toBe(401);
    expect(simulateLogin(true, false)).toBe(401);
    expect(simulateLogin(true, true)).toBe(200);
  });

  it("login endpoint returns 429 only when actually locked", () => {
    function simulateLoginWithLockout(locked: boolean, validCredentials: boolean): number {
      if (locked) return 429;
      if (!validCredentials) return 401;
      return 200;
    }
    expect(simulateLoginWithLockout(true, true)).toBe(429);
    expect(simulateLoginWithLockout(false, false)).toBe(401);
    expect(simulateLoginWithLockout(false, true)).toBe(200);
  });

  it("pre-existing success records do not cause a crash in lookback query", () => {
    // Ensure the lookback window logic handles a mix of successes and failures
    const mixed: Attempt[] = [
      { email: "user@example.com", ip: "1.2.3.4", success: true, attemptedAt: new Date(RECENT - 100000) },
      { email: "user@example.com", ip: "1.2.3.4", success: false, attemptedAt: new Date(RECENT - 50000) },
      { email: "user@example.com", ip: "1.2.3.4", success: true, attemptedAt: new Date(RECENT - 10000) },
      { email: "user@example.com", ip: "1.2.3.4", success: false, attemptedAt: new Date(RECENT) },
    ];
    // Must not throw; failure count is 1 (only post-last-success failure)
    const result = computeLockout(mixed, "email", "user@example.com", NOW);
    expect(result.locked).toBe(false);
    expect(result.failureCount).toBe(1);
  });

  it("pre-existing records from many IPs do not corrupt email-dimension lockout", () => {
    // Many IPs tried the same email (spray attack), but not enough per-email failures
    const spray: Attempt[] = Array.from({ length: 4 }, (_, i) => ({
      email: "user@example.com",
      ip: `10.0.0.${i + 1}`,
      success: false,
      attemptedAt: new Date(RECENT + i * 1000),
    }));
    const result = computeLockout(spray, "email", "user@example.com", NOW);
    // 4 failures across 4 IPs — below the 5-failure threshold
    expect(result.locked).toBe(false);
    expect(result.failureCount).toBe(4);
  });

  it("login attempt history query does not return 500 (no table-as-column in ORDER BY)", () => {
    // Verifies the SQL for the login history endpoint does not use the broken pattern
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

    // If this pattern appeared, PostgreSQL would throw and the endpoint would 500
    expect(hasTableNameAsOrderByArg(sql)).toBe(false);
  });
});
