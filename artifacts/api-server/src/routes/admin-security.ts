import { Router, type IRouter } from "express";
import { db, loginAttemptsTable } from "@workspace/db";
import { and, sql, count, gte } from "drizzle-orm";
import { requireAuth, requireRole } from "../middlewares/auth";
import {
  getLockedAccounts,
  getLoginHistory,
  getSuspiciousActivity,
  unlockAccount,
  getCompromisedAccounts,
} from "../lib/loginProtection";

const router: IRouter = Router();

// ── GET /admin/security/overview ─────────────────────────────────────────────
router.get("/admin/security/overview", requireAuth, requireRole("admin"), async (_req, res): Promise<void> => {
  const now = new Date();
  const since24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const since7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [
    [{ failedLast24h }],
    [{ successLast24h }],
    lockedAccounts,
    suspicious,
    trendRows,
  ] = await Promise.all([
    // Failed in last 24h
    db.select({ failedLast24h: count() })
      .from(loginAttemptsTable)
      .where(and(
        sql`${loginAttemptsTable.success} = false`,
        gte(loginAttemptsTable.attemptedAt, since24h),
      )),
    // Successful in last 24h
    db.select({ successLast24h: count() })
      .from(loginAttemptsTable)
      .where(and(
        sql`${loginAttemptsTable.success} = true`,
        gte(loginAttemptsTable.attemptedAt, since24h),
      )),
    // Currently locked accounts
    getLockedAccounts(),
    // Suspicious activity
    getSuspiciousActivity(),
    // 7-day trend — raw SQL for FILTER aggregation
    db.execute<{ date: string; failures: string; successes: string }>(sql`
      SELECT
        DATE(attempted_at AT TIME ZONE 'UTC') AS date,
        COUNT(*) FILTER (WHERE success = false) AS failures,
        COUNT(*) FILTER (WHERE success = true)  AS successes
      FROM login_attempts
      WHERE attempted_at >= ${since7d}
      GROUP BY DATE(attempted_at AT TIME ZONE 'UTC')
      ORDER BY date ASC
    `),
  ]);

  const trend = (trendRows.rows ?? trendRows).map((r: { date: string; failures: string | number; successes: string | number }) => ({
    date: String(r.date),
    failures: Number(r.failures),
    successes: Number(r.successes),
  }));

  res.json({
    failedLast24h: Number(failedLast24h),
    successLast24h: Number(successLast24h),
    lockedCount: lockedAccounts.length,
    suspiciousIpCount: suspicious.suspiciousIps.length,
    trend,
  });
});

// ── GET /admin/security/locked-accounts ──────────────────────────────────────
router.get("/admin/security/locked-accounts", requireAuth, requireRole("admin"), async (_req, res): Promise<void> => {
  const accounts = await getLockedAccounts();
  res.json({ accounts });
});

// ── GET /admin/security/login-history ────────────────────────────────────────
router.get("/admin/security/login-history", requireAuth, requireRole("admin"), async (req, res): Promise<void> => {
  const {
    email,
    ip,
    success,
    from,
    to,
    page = "1",
    limit = "50",
  } = req.query as Record<string, string>;

  const result = await getLoginHistory({
    email: email || undefined,
    ip: ip || undefined,
    success: success === "true" ? true : success === "false" ? false : undefined,
    from: from ? new Date(from) : undefined,
    to: to ? new Date(to) : undefined,
    page: parseInt(page, 10),
    limit: parseInt(limit, 10),
  });

  res.json(result);
});

// ── GET /admin/security/suspicious-activity ───────────────────────────────────
router.get("/admin/security/suspicious-activity", requireAuth, requireRole("admin"), async (_req, res): Promise<void> => {
  const activity = await getSuspiciousActivity();
  res.json(activity);
});

// ── POST /admin/security/unlock ───────────────────────────────────────────────
router.post("/admin/security/unlock", requireAuth, requireRole("admin"), async (req, res): Promise<void> => {
  const { email, ip } = req.body as { email?: string; ip?: string };
  if (!email && !ip) {
    res.status(400).json({ error: "Provide email or ip to unlock" });
    return;
  }
  await unlockAccount(email, ip);
  res.json({ message: "Account unlocked", email, ip });
});

// ── GET /admin/security/compromised-accounts ──────────────────────────────────
router.get("/admin/security/compromised-accounts", requireAuth, requireRole("admin"), async (_req, res): Promise<void> => {
  const accounts = await getCompromisedAccounts();
  res.json({ accounts });
});

export default router;
