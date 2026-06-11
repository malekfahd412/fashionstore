import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { db, usersTable, loginAttemptsTable, refreshTokensTable } from "@workspace/db";
import { eq, and, or, desc, gt, isNull, count } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import {
  listTrustedDevices,
  removeTrustedDevice,
  getSecurityPrefs,
  upsertSecurityPrefs,
} from "../lib/deviceRecognition";

const router: IRouter = Router();

// ── GET /account/security/prefs ───────────────────────────────────────────────
router.get("/account/security/prefs", requireAuth, async (req, res): Promise<void> => {
  const prefs = await getSecurityPrefs(req.user!.id);
  res.json(prefs);
});

// ── PATCH /account/security/prefs ─────────────────────────────────────────────
router.patch("/account/security/prefs", requireAuth, async (req, res): Promise<void> => {
  const { loginAlertsEnabled } = req.body as { loginAlertsEnabled?: unknown };
  if (typeof loginAlertsEnabled !== "boolean") {
    res.status(400).json({ error: "loginAlertsEnabled must be a boolean" });
    return;
  }
  await upsertSecurityPrefs(req.user!.id, loginAlertsEnabled);
  res.json({ loginAlertsEnabled });
});

// ── GET /account/security/devices ─────────────────────────────────────────────
router.get("/account/security/devices", requireAuth, async (req, res): Promise<void> => {
  const devices = await listTrustedDevices(req.user!.id);
  res.json(devices);
});

// ── DELETE /account/security/devices/:id ──────────────────────────────────────
router.delete("/account/security/devices/:id", requireAuth, async (req, res): Promise<void> => {
  const deviceId = parseInt(req.params.id as string, 10);
  if (isNaN(deviceId)) { res.status(400).json({ error: "Invalid device id" }); return; }
  const removed = await removeTrustedDevice(req.user!.id, deviceId);
  if (!removed) { res.status(404).json({ error: "Device not found" }); return; }
  res.json({ message: "Trusted device removed" });
});

// ── GET /account/security/login-history ───────────────────────────────────────
router.get("/account/security/login-history", requireAuth, async (req, res): Promise<void> => {
  const { page = "1", limit = "20" } = req.query as Record<string, string>;
  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.min(50, parseInt(limit, 10) || 20);
  const offset = (pageNum - 1) * limitNum;

  const userId = req.user!.id;
  const userEmail = req.user!.email;

  // Show attempts by userId OR by email (catches pre-auth failures on their email)
  const where = or(
    eq(loginAttemptsTable.userId, userId),
    and(eq(loginAttemptsTable.email, userEmail), isNull(loginAttemptsTable.userId)),
  );

  const [entries, [{ total }]] = await Promise.all([
    db.select({
      id: loginAttemptsTable.id,
      ip: loginAttemptsTable.ip,
      userAgent: loginAttemptsTable.userAgent,
      success: loginAttemptsTable.success,
      attemptedAt: loginAttemptsTable.attemptedAt,
    })
      .from(loginAttemptsTable)
      .where(where)
      .orderBy(desc(loginAttemptsTable.attemptedAt))
      .limit(limitNum)
      .offset(offset),
    db.select({ total: count() }).from(loginAttemptsTable).where(where),
  ]);

  res.json({ entries, total: Number(total), page: pageNum, limit: limitNum });
});

// ── GET /account/security/sessions ────────────────────────────────────────────
router.get("/account/security/sessions", requireAuth, async (req, res): Promise<void> => {
  const sessions = await db
    .select({
      id: refreshTokensTable.id,
      userAgent: refreshTokensTable.userAgent,
      ip: refreshTokensTable.ip,
      lastUsedAt: refreshTokensTable.lastUsedAt,
      createdAt: refreshTokensTable.createdAt,
      expiresAt: refreshTokensTable.expiresAt,
    })
    .from(refreshTokensTable)
    .where(
      and(
        eq(refreshTokensTable.userId, req.user!.id),
        isNull(refreshTokensTable.revokedAt),
        gt(refreshTokensTable.expiresAt, new Date()),
      ),
    )
    .orderBy(desc(refreshTokensTable.lastUsedAt));
  res.json(sessions);
});

// ── DELETE /account/security/sessions/:id ────────────────────────────────────
router.delete("/account/security/sessions/:id", requireAuth, async (req, res): Promise<void> => {
  const sessionId = parseInt(req.params.id as string, 10);
  if (isNaN(sessionId)) { res.status(400).json({ error: "Invalid session id" }); return; }
  const [session] = await db
    .select()
    .from(refreshTokensTable)
    .where(eq(refreshTokensTable.id, sessionId));
  if (!session || session.userId !== req.user!.id) {
    res.status(404).json({ error: "Session not found" }); return;
  }
  await db
    .update(refreshTokensTable)
    .set({ revokedAt: new Date() })
    .where(eq(refreshTokensTable.id, sessionId));
  res.json({ message: "Session revoked" });
});

// ── POST /account/security/change-password ────────────────────────────────────
router.post("/account/security/change-password", requireAuth, async (req, res): Promise<void> => {
  const { currentPassword, newPassword } = req.body as { currentPassword?: unknown; newPassword?: unknown };

  if (typeof currentPassword !== "string" || !currentPassword) {
    res.status(400).json({ error: "currentPassword is required" }); return;
  }
  if (typeof newPassword !== "string" || newPassword.length < 8) {
    res.status(400).json({ error: "newPassword must be at least 8 characters" }); return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.user!.id));
  if (!user || !user.password) {
    res.status(404).json({ error: "User not found" }); return;
  }

  const valid = await bcrypt.compare(currentPassword, user.password);
  if (!valid) {
    res.status(401).json({ error: "Current password is incorrect" }); return;
  }

  const hashed = await bcrypt.hash(newPassword, 12);
  await db.update(usersTable).set({ password: hashed }).where(eq(usersTable.id, user.id));

  // Revoke all existing refresh tokens so other sessions must re-authenticate
  await db
    .update(refreshTokensTable)
    .set({ revokedAt: new Date() })
    .where(and(eq(refreshTokensTable.userId, user.id), isNull(refreshTokensTable.revokedAt)));

  res.json({ message: "Password changed successfully" });
});

// ── DELETE /account/security/sessions (revoke all) ────────────────────────────
router.delete("/account/security/sessions", requireAuth, async (req, res): Promise<void> => {
  await db
    .update(refreshTokensTable)
    .set({ revokedAt: new Date() })
    .where(
      and(eq(refreshTokensTable.userId, req.user!.id), isNull(refreshTokensTable.revokedAt)),
    );
  res.json({ message: "All sessions revoked" });
});

export default router;
