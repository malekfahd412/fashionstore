import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { db, usersTable, refreshTokensTable, passwordResetTokensTable } from "@workspace/db";
import { eq, and, gt, isNull } from "drizzle-orm";
import { requireAuth, signToken } from "../middlewares/auth";
import { RegisterBody, LoginBody } from "@workspace/api-zod";
import { sendVerificationEmail, sendPasswordResetEmail, sendWelcomeEmail, sendNewLoginEmail } from "../lib/email";
import { checkLockout, recordAttempt, extractIp } from "../lib/loginProtection";
import {
  computeDeviceHash,
  parseUserAgent,
  isKnownDevice,
  hasAnyTrustedDevice,
  trustDevice,
  getSecurityPrefs,
} from "../lib/deviceRecognition";
import { getIpLocation } from "../lib/ipGeo";

const router: IRouter = Router();

const REFRESH_TOKEN_EXPIRY_DAYS = 30;
const RESET_TOKEN_EXPIRY_MINUTES = 60;

function sha256(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function generateToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

function refreshTokenExpiry(): Date {
  const d = new Date();
  d.setDate(d.getDate() + REFRESH_TOKEN_EXPIRY_DAYS);
  return d;
}

async function createRefreshToken(userId: number, req: { headers: Record<string, string | string[] | undefined>; socket: { remoteAddress?: string } }): Promise<string> {
  const raw = generateToken();
  const hash = sha256(raw);
  const ua = req.headers["user-agent"] as string | undefined;
  const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ?? req.socket.remoteAddress ?? null;
  await db.insert(refreshTokensTable).values({
    userId,
    tokenHash: hash,
    userAgent: ua ?? null,
    ip: ip ?? null,
    expiresAt: refreshTokenExpiry(),
  });
  return raw;
}

// ── Register ───────────────────────────────────────────────────────────[...]
router.post("/auth/register", async (req, res): Promise<void> => {
  const parsed = RegisterBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const { name, email, password, role: requestedRole } = parsed.data;
  const role = requestedRole === "vendor" || requestedRole === "admin" ? "customer" : (requestedRole ?? "customer");
  
  // BUGFIX: Normalize email to lowercase before checking
  const normalizedEmail = email.toLowerCase().trim();
  
  const existing = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.email, normalizedEmail));
  if (existing.length > 0) { res.status(409).json({ error: "Email already registered" }); return; }
  const hashed = await bcrypt.hash(password, 12);

  // Generate email verification token
  const verificationToken = generateToken();
  const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  const [user] = await db.insert(usersTable).values({
    name, email: normalizedEmail, password: hashed, role,
    emailVerificationToken: verificationToken,
    emailVerificationExpires: verificationExpires,
  }).returning();

  const token = signToken({ id: user.id, email: user.email, role: user.role });
  const refreshToken = await createRefreshToken(user.id, req);

  // Send verification + welcome emails (non-blocking)
  sendVerificationEmail(normalizedEmail, name, verificationToken).catch(() => {});
  sendWelcomeEmail(normalizedEmail, name).catch(() => {});

  res.status(201).json({
    token,
    refreshToken,
    user: { id: user.id, name: user.name, email: user.email, role: user.role, avatar: user.avatar, emailVerified: user.emailVerified, createdAt: user.createdAt },
  });
});

// ── Verify email ───────────────────────────────────────────────────────────[...]
router.get("/auth/verify-email", async (req, res): Promise<void> => {
  const { token } = req.query as { token?: string };
  if (!token) { res.status(400).json({ error: "Verification token is required" }); return; }

  const [user] = await db.select().from(usersTable).where(
    eq(usersTable.emailVerificationToken, token)
  );
  if (!user || !user.emailVerificationToken) {
    res.status(400).json({ error: "Invalid or already-used verification token" }); return;
  }
  if (user.emailVerificationExpires && user.emailVerificationExpires < new Date()) {
    res.status(400).json({ error: "Verification token has expired. Please request a new one." }); return;
  }

  await db.update(usersTable).set({
    emailVerified: true,
    emailVerificationToken: null,
    emailVerificationExpires: null,
  }).where(eq(usersTable.id, user.id));

  res.json({ message: "Email verified successfully. You can now sign in." });
});

// ── Resend verification email ─────────────────────────────────────────────────
router.post("/auth/resend-verification", requireAuth, async (req, res): Promise<void> => {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.user!.id));
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  if (user.emailVerified) { res.json({ message: "Email is already verified" }); return; }

  const verificationToken = generateToken();
  const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await db.update(usersTable).set({
    emailVerificationToken: verificationToken,
    emailVerificationExpires: verificationExpires,
  }).where(eq(usersTable.id, user.id));

  sendVerificationEmail(user.email, user.name, verificationToken).catch(() => {});
  res.json({ message: "Verification email sent" });
});

// ── Login ─────────────────────────────────────────────────────────────[...]
router.post("/auth/login", async (req, res): Promise<void> => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const { email, password, rememberDevice = true } = parsed.data;

  // BUGFIX: Normalize email to lowercase
  const normalizedEmail = email.toLowerCase().trim();

  const ip = extractIp(req as Parameters<typeof extractIp>[0]);
  const ua = req.headers["user-agent"] as string | undefined;

  // Check lockout before touching the DB — blocks brute-force early
  const lockout = await checkLockout(normalizedEmail, ip);
  if (lockout.locked) {
    res.setHeader("Retry-After", String(lockout.retryAfterSeconds));
    res.status(429).json({ error: "Too many failed login attempts. Please try again later." });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, normalizedEmail));
  if (!user || !user.password) {
    await bcrypt.hash("dummy", 12);
    await recordAttempt({ email: normalizedEmail, ip, success: false, userAgent: ua }).catch(() => {});
    res.status(401).json({ error: "Invalid credentials" }); return;
  }
  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    await recordAttempt({ email: normalizedEmail, ip, success: false, userId: user.id, userAgent: ua }).catch(() => {});
    res.status(401).json({ error: "Invalid credentials" }); return;
  }
  // Success — record attempt (acts as counter-reset marker)
  await recordAttempt({ email: normalizedEmail, ip, success: true, userId: user.id, userAgent: ua }).catch(() => {});

  // Device recognition + new-login notification (fully non-blocking)
  void (async () => {
    try {
      const userAgent = ua ?? "";
      const deviceHash = computeDeviceHash(userAgent);
      const { browser, os, deviceName } = parseUserAgent(userAgent);
      const known = await isKnownDevice(user.id, deviceHash);
      const hasDevices = known || await hasAnyTrustedDevice(user.id);
      if (rememberDevice) {
        await trustDevice({ userId: user.id, deviceHash, deviceName, browser, os, ip: ip ?? null });
      }
      if (!known && hasDevices) {
        const prefs = await getSecurityPrefs(user.id);
        if (prefs.loginAlertsEnabled) {
          const resolvedIp = ip ?? "unknown";
          const location = await getIpLocation(resolvedIp).catch(() => "");
          sendNewLoginEmail({
            email: user.email,
            name: user.name,
            deviceName,
            browser,
            os,
            ip: resolvedIp,
            location: location || undefined,
            time: new Date(),
          }).catch(() => {});
        }
      }
    } catch {
      // Non-blocking — never fail the login
    }
  })();

  const token = signToken({ id: user.id, email: user.email, role: user.role });
  const refreshToken = await createRefreshToken(user.id, req);
  res.json({
    token,
    refreshToken,
    user: { id: user.id, name: user.name, email: user.email, role: user.role, avatar: user.avatar, createdAt: user.createdAt },
  });
});

// ── Refresh Access Token ──────────────────────────────────────────────────────
router.post("/auth/refresh", async (req, res): Promise<void> => {
  const { refreshToken } = req.body as { refreshToken?: string };
  if (!refreshToken || typeof refreshToken !== "string") {
    res.status(400).json({ error: "refreshToken is required" }); return;
  }
  const hash = sha256(refreshToken);
  const now = new Date();
  const [stored] = await db.select().from(refreshTokensTable).where(
    and(eq(refreshTokensTable.tokenHash, hash), isNull(refreshTokensTable.revokedAt), gt(refreshTokensTable.expiresAt, now))
  );
  if (!stored) { res.status(401).json({ error: "Invalid or expired refresh token" }); return; }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, stored.userId));
  if (!user || !user.active) { res.status(401).json({ error: "User not found or inactive" }); return; }

  // Token rotation — revoke old, issue new
  const newRaw = generateToken();
  const newHash = sha256(newRaw);
  const ua = req.headers["user-agent"] as string | undefined;
  const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ?? req.socket.remoteAddress ?? null;

  await db.transaction(async (tx) => {
    await tx.update(refreshTokensTable).set({ revokedAt: now }).where(eq(refreshTokensTable.id, stored.id));
    await tx.insert(refreshTokensTable).values({
      userId: user.id,
      tokenHash: newHash,
      userAgent: ua ?? null,
      ip: ip ?? null,
      expiresAt: refreshTokenExpiry(),
      lastUsedAt: now,
    });
  });

  const accessToken = signToken({ id: user.id, email: user.email, role: user.role });
  res.json({ token: accessToken, refreshToken: newRaw });
});

// ── Logout (revoke single refresh token) ──────────────────────────────────────
router.post("/auth/logout", async (req, res): Promise<void> => {
  const { refreshToken } = req.body as { refreshToken?: string };
  if (refreshToken) {
    const hash = sha256(refreshToken);
    await db.update(refreshTokensTable).set({ revokedAt: new Date() }).where(eq(refreshTokensTable.tokenHash, hash));
  }
  res.json({ message: "Logged out successfully" });
});

// ── Logout all sessions ───────────────────────────────────────────────────────
router.post("/auth/logout-all", requireAuth, async (req, res): Promise<void> => {
  await db.update(refreshTokensTable)
    .set({ revokedAt: new Date() })
    .where(and(eq(refreshTokensTable.userId, req.user!.id), isNull(refreshTokensTable.revokedAt)));
  res.json({ message: "All sessions revoked" });
});

// ── Active sessions ────────────────────────────────────────────────────────–[...]
router.get("/auth/sessions", requireAuth, async (req, res): Promise<void> => {
  const sessions = await db.select({
    id: refreshTokensTable.id,
    userAgent: refreshTokensTable.userAgent,
    ip: refreshTokensTable.ip,
    lastUsedAt: refreshTokensTable.lastUsedAt,
    createdAt: refreshTokensTable.createdAt,
    expiresAt: refreshTokensTable.expiresAt,
  }).from(refreshTokensTable).where(
    and(eq(refreshTokensTable.userId, req.user!.id), isNull(refreshTokensTable.revokedAt), gt(refreshTokensTable.expiresAt, new Date()))
  );
  res.json(sessions);
});

// ── Revoke single session ─────────────────────────────────────────────────────
router.delete("/auth/sessions/:id", requireAuth, async (req, res): Promise<void> => {
  const sessionId = parseInt(req.params.id as string, 10);
  if (isNaN(sessionId)) { res.status(400).json({ error: "Invalid session id" }); return; }
  const [session] = await db.select().from(refreshTokensTable).where(eq(refreshTokensTable.id, sessionId));
  if (!session || session.userId !== req.user!.id) { res.status(404).json({ error: "Session not found" }); return; }
  await db.update(refreshTokensTable).set({ revokedAt: new Date() }).where(eq(refreshTokensTable.id, sessionId));
  res.json({ message: "Session revoked" });
});

// ── Forgot Password ────────────────────────────────────────────────────────–[...]
router.post("/auth/forgot-password", async (req, res): Promise<void> => {
  const { email } = req.body as { email?: string };
  // Always return 200 to prevent user enumeration
  if (!email || typeof email !== "string") { res.json({ message: "If that email exists, a reset link has been sent." }); return; }
  const normalizedEmail = email.toLowerCase().trim();
  const [user] = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.email, normalizedEmail));
  if (!user) { res.json({ message: "If that email exists, a reset link has been sent." }); return; }

  // Invalidate any existing reset tokens for this user
  await db.update(passwordResetTokensTable)
    .set({ usedAt: new Date() })
    .where(and(eq(passwordResetTokensTable.userId, user.id), isNull(passwordResetTokensTable.usedAt)));

  const raw = generateToken();
  const hash = sha256(raw);
  const expiresAt = new Date(Date.now() + RESET_TOKEN_EXPIRY_MINUTES * 60 * 1000);
  await db.insert(passwordResetTokensTable).values({ userId: user.id, tokenHash: hash, expiresAt });

  req.log?.info({ userId: user.id }, "Password reset token generated");

  // Send password reset email (non-blocking)
  const [fullUser] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, user.id));
  sendPasswordResetEmail(normalizedEmail, fullUser?.name ?? "Customer", raw).catch(() => {});

  res.json({ message: "If that email exists, a reset link has been sent.", ...(process.env.NODE_ENV !== "production" ? { resetToken: raw } : {}) });
});

// ── Reset Password ────────────────────────────────────────────────────────––[...]
router.post("/auth/reset-password", async (req, res): Promise<void> => {
  const { token, newPassword } = req.body as { token?: string; newPassword?: string };
  if (!token || !newPassword || typeof token !== "string" || typeof newPassword !== "string") {
    res.status(400).json({ error: "token and newPassword are required" }); return;
  }
  if (newPassword.length < 8) { res.status(400).json({ error: "Password must be at least 8 characters" }); return; }
  const hash = sha256(token);
  const now = new Date();
  const [stored] = await db.select().from(passwordResetTokensTable).where(
    and(eq(passwordResetTokensTable.tokenHash, hash), isNull(passwordResetTokensTable.usedAt), gt(passwordResetTokensTable.expiresAt, now))
  );
  if (!stored) { res.status(400).json({ error: "Invalid or expired reset token" }); return; }

  const hashed = await bcrypt.hash(newPassword, 12);
  await db.transaction(async (tx) => {
    await tx.update(usersTable).set({ password: hashed }).where(eq(usersTable.id, stored.userId));
    await tx.update(passwordResetTokensTable).set({ usedAt: now }).where(eq(passwordResetTokensTable.id, stored.id));
    // Revoke all refresh tokens on password change
    await tx.update(refreshTokensTable).set({ revokedAt: now }).where(
      and(eq(refreshTokensTable.userId, stored.userId), isNull(refreshTokensTable.revokedAt))
    );
  });
  res.json({ message: "Password updated successfully. Please log in again." });
});

// ── Get current user ────────────────────────────────────────────────────────[...]
router.get("/auth/me", requireAuth, async (req, res): Promise<void> => {
  const [user] = await db.select({
    id: usersTable.id, name: usersTable.name, email: usersTable.email,
    role: usersTable.role, avatar: usersTable.avatar, createdAt: usersTable.createdAt,
  }).from(usersTable).where(eq(usersTable.id, req.user!.id));
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  res.json(user);
});

export default router;
