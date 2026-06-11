import { Router, type IRouter } from "express";
import crypto from "node:crypto";
import rateLimit from "express-rate-limit";
import { db, loginAttemptsTable, usersTable, refreshTokensTable, passwordResetTokensTable, auditLogsTable } from "@workspace/db";
import { and, sql, count, gte, eq, isNull } from "drizzle-orm";
import { requireAuth, requireRole } from "../middlewares/auth";
import {
  getLockedAccounts,
  getLoginHistory,
  getSuspiciousActivity,
  unlockAccount,
  getCompromisedAccounts,
} from "../lib/loginProtection";
import { sendForcePasswordResetEmail } from "../lib/email";
import { logger } from "../lib/logger";

const router: IRouter = Router();

const APP_URL = () => process.env.APP_URL ?? "https://luxestore.com";

function sha256(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function generateToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

// ── Rate limiter: 5 force-reset actions per 15 min per admin ─────────────────
const forceResetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const user = (req as typeof req & { user?: { id: number } }).user;
    return user ? `force-reset:admin:${user.id}` : req.ip ?? "unknown";
  },
  validate: { keyGeneratorIpFallback: false },
  message: { error: "Too many forced reset actions. Please wait before trying again." },
});

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
    db.select({ failedLast24h: count() })
      .from(loginAttemptsTable)
      .where(and(
        sql`${loginAttemptsTable.success} = false`,
        gte(loginAttemptsTable.attemptedAt, since24h),
      )),
    db.select({ successLast24h: count() })
      .from(loginAttemptsTable)
      .where(and(
        sql`${loginAttemptsTable.success} = true`,
        gte(loginAttemptsTable.attemptedAt, since24h),
      )),
    getLockedAccounts(),
    getSuspiciousActivity(),
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

// ── POST /admin/security/force-password-reset ────────────────────────────────
router.post(
  "/admin/security/force-password-reset",
  requireAuth,
  requireRole("admin"),
  forceResetLimiter,
  async (req, res): Promise<void> => {
    const { email, blockLogin = true, suspiciousIp, loginTime } = req.body as {
      email?: string;
      blockLogin?: boolean;
      suspiciousIp?: string;
      loginTime?: string;
    };

    if (!email || typeof email !== "string") {
      res.status(400).json({ error: "email is required" });
      return;
    }

    const normalised = email.toLowerCase().trim();

    // ── 1. Resolve target user ────────────────────────────────────────────────
    const [user] = await db
      .select({ id: usersTable.id, name: usersTable.name, email: usersTable.email, role: usersTable.role })
      .from(usersTable)
      .where(eq(usersTable.email, normalised));

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const adminIp =
      (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ??
      req.socket?.remoteAddress ??
      null;

    // ── 2. Atomic transaction ─────────────────────────────────────────────────
    const now = new Date();
    const RESET_EXPIRY_MS = 60 * 60 * 1000;

    let sessionCount = 0;
    let rawResetToken = "";

    await db.transaction(async (tx) => {
      // a) Revoke all active refresh tokens (logout from all devices)
      const revoked = await tx
        .update(refreshTokensTable)
        .set({ revokedAt: now })
        .where(and(eq(refreshTokensTable.userId, user.id), isNull(refreshTokensTable.revokedAt)))
        .returning({ id: refreshTokensTable.id });
      sessionCount = revoked.length;

      // b) Invalidate any existing password reset tokens
      await tx
        .update(passwordResetTokensTable)
        .set({ usedAt: now })
        .where(and(eq(passwordResetTokensTable.userId, user.id), isNull(passwordResetTokensTable.usedAt)));

      // c) Create a fresh password reset token
      rawResetToken = generateToken();
      const tokenHash = sha256(rawResetToken);
      await tx.insert(passwordResetTokensTable).values({
        userId: user.id,
        tokenHash,
        expiresAt: new Date(now.getTime() + RESET_EXPIRY_MS),
      });

      // d) Audit log
      await tx.insert(auditLogsTable).values({
        userId: req.user!.id,
        userEmail: req.user!.email,
        action: "FORCE_PASSWORD_RESET",
        resource: "user",
        resourceId: String(user.id),
        before: JSON.stringify({ email: user.email, role: user.role }),
        after: JSON.stringify({
          reason: "Compromised account detected",
          suspiciousIp: suspiciousIp ?? null,
          sessionsRevoked: sessionCount,
          loginBlockApplied: blockLogin,
        }),
        ip: adminIp,
      });
    });

    // ── 3. Optional temporary login block (~5 min via synthetic failures) ─────
    if (blockLogin) {
      const syntheticFailures = Array.from({ length: 5 }, () => ({
        email: normalised,
        ip: "admin-force-reset",
        userId: user.id,
        userAgent: "admin-action",
        success: false as const,
      }));
      await db.insert(loginAttemptsTable).values(syntheticFailures).catch(() => {});
    }

    // ── 4. Send notification email (non-blocking) ─────────────────────────────
    const resetUrl = `${APP_URL()}/reset-password?token=${rawResetToken}`;
    void sendForcePasswordResetEmail({
      email: user.email,
      name: user.name,
      resetUrl,
      suspiciousIp: suspiciousIp ?? "unknown",
      loginTime: loginTime ? new Date(loginTime) : now,
    }).catch((err: unknown) => {
      logger.error({ err, targetEmail: user.email }, "Force-reset email send failed");
    });

    logger.info(
      { adminId: req.user!.id, adminEmail: req.user!.email, targetUserId: user.id, targetEmail: user.email, sessionCount, blockLogin },
      "Force password reset applied",
    );

    res.json({
      message: "Password reset forced successfully",
      affectedUser: { id: user.id, email: user.email, name: user.name },
      sessionCount,
      blockApplied: blockLogin,
      ...(process.env.NODE_ENV !== "production" ? { resetToken: rawResetToken } : {}),
    });
  },
);

export default router;
