import { db, loginAttemptsTable } from "@workspace/db";
import { eq, and, gte, desc, count, ne, countDistinct, sql } from "drizzle-orm";
import { safeOrderBy } from "./drizzleOrderBy";

// ── Lockout thresholds (most severe first) ────────────────────────────────────
const THRESHOLDS = [
  { failures: 20, lockoutMs: 24 * 60 * 60 * 1000, label: "24 hours" },
  { failures: 10, lockoutMs: 30 * 60 * 1000, label: "30 minutes" },
  { failures: 5, lockoutMs: 5 * 60 * 1000, label: "5 minutes" },
] as const;

const WINDOW_MS = 24 * 60 * 60 * 1000; // look-back window

export type LockoutResult =
  | { locked: true; reason: "email" | "ip"; unlocksAt: Date; failureCount: number; retryAfterSeconds: number }
  | { locked: false; reason: null; unlocksAt: null; failureCount: number };

// ── Helper: extract IP from request ───────────────────────────────────────────
export function extractIp(req: { headers: Record<string, string | string[] | undefined>; socket?: { remoteAddress?: string } }): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (forwarded) {
    const raw = Array.isArray(forwarded) ? forwarded[0] : forwarded;
    const ip = raw.split(",")[0]?.trim() ?? "";
    return ip.replace(/^::ffff:/, "");
  }
  const addr = req.socket?.remoteAddress ?? "unknown";
  return addr.replace(/^::ffff:/, "");
}

// ── Core: check lockout for a single dimension (email or ip) ─────────────────
async function checkDimension(
  field: "email" | "ip",
  value: string,
): Promise<{ locked: boolean; unlocksAt: Date | null; failureCount: number }> {
  const now = new Date();
  const windowStart = new Date(now.getTime() - WINDOW_MS);

  const col = field === "email" ? loginAttemptsTable.email : loginAttemptsTable.ip;

  // Find the most recent successful login in the window (acts as reset marker)
  const [lastSuccess] = await db
    .select({ attemptedAt: loginAttemptsTable.attemptedAt })
    .from(loginAttemptsTable)
    .where(and(eq(col, value), eq(loginAttemptsTable.success, true), gte(loginAttemptsTable.attemptedAt, windowStart)))
    .orderBy(safeOrderBy(loginAttemptsTable.attemptedAt, "desc"))
    .limit(1);

  const countFrom = lastSuccess ? lastSuccess.attemptedAt : windowStart;

  // Count failures since last success (or start of window)
  const failureWhere = and(
    eq(col, value),
    eq(loginAttemptsTable.success, false),
    gte(loginAttemptsTable.attemptedAt, countFrom),
  );

  const [{ failureCount }] = await db
    .select({ failureCount: count() })
    .from(loginAttemptsTable)
    .where(failureWhere);

  const fc = Number(failureCount);
  if (fc === 0) return { locked: false, unlocksAt: null, failureCount: 0 };

  // Find most recent failure to compute lockout expiry
  const [lastFailure] = await db
    .select({ attemptedAt: loginAttemptsTable.attemptedAt })
    .from(loginAttemptsTable)
    .where(failureWhere)
    .orderBy(safeOrderBy(loginAttemptsTable.attemptedAt, "desc"))
    .limit(1);

  if (!lastFailure) return { locked: false, unlocksAt: null, failureCount: fc };

  for (const threshold of THRESHOLDS) {
    if (fc >= threshold.failures) {
      const unlocksAt = new Date(lastFailure.attemptedAt.getTime() + threshold.lockoutMs);
      if (unlocksAt > now) {
        return { locked: true, unlocksAt, failureCount: fc };
      }
      // Lockout window has passed — not locked despite high count
      break;
    }
  }

  return { locked: false, unlocksAt: null, failureCount: fc };
}

// ── Public: check both email and IP ───────────────────────────────────────────
export async function checkLockout(email: string, ip: string): Promise<LockoutResult> {
  const [emailResult, ipResult] = await Promise.all([
    checkDimension("email", email),
    checkDimension("ip", ip),
  ]);

  for (const [reason, result] of [["email", emailResult], ["ip", ipResult]] as const) {
    if (result.locked && result.unlocksAt) {
      const retryAfterSeconds = Math.ceil((result.unlocksAt.getTime() - Date.now()) / 1000);
      return {
        locked: true,
        reason,
        unlocksAt: result.unlocksAt,
        failureCount: result.failureCount,
        retryAfterSeconds,
      };
    }
  }

  return {
    locked: false,
    reason: null,
    unlocksAt: null,
    failureCount: Math.max(emailResult.failureCount, ipResult.failureCount),
  };
}

// ── Public: record a login attempt ────────────────────────────────────────────
export async function recordAttempt(opts: {
  email: string;
  ip: string;
  success: boolean;
  userId?: number;
  userAgent?: string;
}): Promise<void> {
  await db.insert(loginAttemptsTable).values({
    email: opts.email,
    ip: opts.ip,
    success: opts.success,
    userId: opts.userId ?? null,
    userAgent: opts.userAgent ?? null,
    attemptedAt: new Date(),
  });
}

// ── Public: manual unlock — insert success marker for email/IP ────────────────
export async function unlockAccount(email?: string, ip?: string): Promise<void> {
  const now = new Date();
  if (email) {
    await db.insert(loginAttemptsTable).values({ email, ip: "admin-unlock", success: true, attemptedAt: now });
  }
  if (ip && !email) {
    // For IP-only unlock, we need a placeholder email
    await db.insert(loginAttemptsTable).values({ email: "admin-unlock", ip, success: true, attemptedAt: now });
  }
}

// ── Admin queries ─────────────────────────────────────────────────────────[...]

export type LockedAccount = {
  email: string;
  failureCount: number;
  unlocksAt: Date;
  latestIp: string;
  reason: "email";
};

export async function getLockedAccounts(): Promise<LockedAccount[]> {
  const now = new Date();
  const windowStart = new Date(now.getTime() - WINDOW_MS);

  // Get all distinct emails with recent failures
  const rows = await db
    .selectDistinct({ email: loginAttemptsTable.email })
    .from(loginAttemptsTable)
    .where(and(eq(loginAttemptsTable.success, false), gte(loginAttemptsTable.attemptedAt, windowStart)));

  const locked: LockedAccount[] = [];
  for (const row of rows) {
    const result = await checkDimension("email", row.email);
    if (result.locked && result.unlocksAt) {
      // Get latest IP for this email
      const [latest] = await db
        .select({ ip: loginAttemptsTable.ip })
        .from(loginAttemptsTable)
        .where(and(eq(loginAttemptsTable.email, row.email), eq(loginAttemptsTable.success, false)))
        .orderBy(safeOrderBy(loginAttemptsTable.attemptedAt, "desc"))
        .limit(1);

      locked.push({
        email: row.email,
        failureCount: result.failureCount,
        unlocksAt: result.unlocksAt,
        latestIp: latest?.ip ?? "unknown",
        reason: "email",
      });
    }
  }
  return locked;
}

export type LoginHistoryEntry = {
  id: number;
  email: string;
  ip: string;
  success: boolean;
  userId: number | null;
  userAgent: string | null;
  attemptedAt: Date;
};

export async function getLoginHistory(opts: {
  email?: string;
  ip?: string;
  success?: boolean;
  from?: Date;
  to?: Date;
  page?: number;
  limit?: number;
}): Promise<{ entries: LoginHistoryEntry[]; total: number }> {
  const { page = 1, limit = 50 } = opts;
  const limitNum = Math.min(100, limit);
  const offset = (Math.max(1, page) - 1) * limitNum;

  const conditions = [];
  if (opts.email) conditions.push(eq(loginAttemptsTable.email, opts.email));
  if (opts.ip) conditions.push(eq(loginAttemptsTable.ip, opts.ip));
  if (opts.success !== undefined) conditions.push(eq(loginAttemptsTable.success, opts.success));
  if (opts.from) conditions.push(gte(loginAttemptsTable.attemptedAt, opts.from));
  if (opts.to) conditions.push(gte(loginAttemptsTable.attemptedAt, opts.to));

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [entries, [{ total }]] = await Promise.all([
    db.select().from(loginAttemptsTable).where(where).orderBy(safeOrderBy(loginAttemptsTable.attemptedAt, "desc")).limit(limitNum).offset(offset),
    db.select({ total: count() }).from(loginAttemptsTable).where(where),
  ]);

  return { entries, total: Number(total) };
}

export type SuspiciousIp = {
  ip: string;
  failureCount: number;
  distinctEmails: number;
  latestAttempt: Date;
};

export async function getSuspiciousActivity(): Promise<{ suspiciousIps: SuspiciousIp[]; targetedEmails: string[] }> {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

  const ipRows = await db
    .select({
      ip: loginAttemptsTable.ip,
      failureCount: count(),
      distinctEmails: countDistinct(loginAttemptsTable.email),
    })
    .from(loginAttemptsTable)
    .where(and(eq(loginAttemptsTable.success, false), gte(loginAttemptsTable.attemptedAt, oneHourAgo), ne(loginAttemptsTable.ip, "admin-unlock")))
    .groupBy(loginAttemptsTable.ip)
    .orderBy(safeOrderBy(count(), "desc"));

  const suspiciousIps: SuspiciousIp[] = [];
  for (const row of ipRows) {
    if (Number(row.failureCount) >= 10 || Number(row.distinctEmails) >= 3) {
      const [latest] = await db
        .select({ attemptedAt: loginAttemptsTable.attemptedAt })
        .from(loginAttemptsTable)
        .where(and(eq(loginAttemptsTable.ip, row.ip), eq(loginAttemptsTable.success, false)))
        .orderBy(safeOrderBy(loginAttemptsTable.attemptedAt, "desc"))
        .limit(1);

      suspiciousIps.push({
        ip: row.ip,
        failureCount: Number(row.failureCount),
        distinctEmails: Number(row.distinctEmails),
        latestAttempt: latest?.attemptedAt ?? new Date(),
      });
    }
  }

  // Emails targeted by 3+ distinct IPs in the last hour
  const emailRows = await db
    .select({
      email: loginAttemptsTable.email,
      distinctIps: countDistinct(loginAttemptsTable.ip),
    })
    .from(loginAttemptsTable)
    .where(and(eq(loginAttemptsTable.success, false), gte(loginAttemptsTable.attemptedAt, oneHourAgo), ne(loginAttemptsTable.email, "admin-unlock")))
    .groupBy(loginAttemptsTable.email)
    .having(({ distinctIps }) => gte(distinctIps, 3))
    .orderBy(safeOrderBy(countDistinct(loginAttemptsTable.ip), "desc"));

  return {
    suspiciousIps,
    targetedEmails: emailRows.map((r) => r.email),
  };
}

// ── Compromised account indicators ────────────────────────────────────────────
// Accounts where a successful login came from an IP that also had failures on
// 2+ OTHER email addresses in the last 24h — a strong credential-stuffing signal.

export type CompromisedAccountIndicator = {
  email: string;
  userId: number;
  ip: string;
  loginAt: Date;
  ipFailuresOnOthers: number;
  distinctEmailsFromIp: number;
  riskLevel: "high" | "medium";
};

export async function getCompromisedAccounts(): Promise<CompromisedAccountIndicator[]> {
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

  // Raw SQL: join successful logins with failure counts from same IP on other accounts
  const rows = await db.execute<{
    email: string;
    user_id: number;
    ip: string;
    login_at: Date;
    ip_failures: string;
    distinct_emails: string;
  }>(sql`
    SELECT
      ls.email,
      ls.user_id,
      ls.ip,
      ls.attempted_at AS login_at,
      COUNT(lf.id)                      AS ip_failures,
      COUNT(DISTINCT lf.email)           AS distinct_emails
    FROM login_attempts ls
    JOIN login_attempts lf
      ON  lf.ip        = ls.ip
      AND lf.success   = false
      AND lf.email    != ls.email
      AND lf.attempted_at >= ${since24h}
    WHERE ls.success      = true
      AND ls.attempted_at >= ${since24h}
      AND ls.user_id IS NOT NULL
      AND ls.email   != 'admin-unlock'
    GROUP BY ls.id, ls.email, ls.user_id, ls.ip, ls.attempted_at
    HAVING COUNT(DISTINCT lf.email) >= 2
    ORDER BY ls.attempted_at DESC
    LIMIT 100
  `);

  const data = (rows.rows ?? rows) as {
    email: string;
    user_id: number;
    ip: string;
    login_at: Date | string;
    ip_failures: string;
    distinct_emails: string;
  }[];

  return data.map((r) => {
    const ipFailures = Number(r.ip_failures);
    const distinctEmails = Number(r.distinct_emails);
    const riskLevel: "high" | "medium" = ipFailures >= 10 || distinctEmails >= 5 ? "high" : "medium";
    return {
      email: r.email,
      userId: Number(r.user_id),
      ip: r.ip,
      loginAt: r.login_at instanceof Date ? r.login_at : new Date(r.login_at),
      ipFailuresOnOthers: ipFailures,
      distinctEmailsFromIp: distinctEmails,
      riskLevel,
    };
  });
}
