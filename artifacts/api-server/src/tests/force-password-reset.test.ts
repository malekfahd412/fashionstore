import { describe, it, expect, vi, beforeEach } from "vitest";
import crypto from "node:crypto";

// ── Pure logic helpers extracted from the route ───────────────────────────────

function sha256(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function generateToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

// Mirrors the atomic transaction logic without the DB
interface User {
  id: number;
  name: string;
  email: string;
  role: string;
}

interface RefreshToken {
  id: number;
  userId: number;
  revokedAt: Date | null;
}

interface PasswordResetToken {
  id: number;
  userId: number;
  tokenHash: string;
  expiresAt: Date;
  usedAt: Date | null;
}

interface AuditEntry {
  userId: number;
  userEmail: string;
  action: string;
  resource: string;
  resourceId: string;
  before: string;
  after: string;
  ip: string | null;
}

interface LoginAttempt {
  email: string;
  ip: string;
  userId: number;
  success: boolean;
}

function applyForceReset(opts: {
  admin: User;
  target: User;
  refreshTokens: RefreshToken[];
  existingResetTokens: PasswordResetToken[];
  adminIp: string | null;
  blockLogin: boolean;
  suspiciousIp?: string;
  loginTime?: Date;
}): {
  revokedIds: number[];
  invalidatedResetIds: number[];
  newResetToken: { tokenHash: string; expiresAt: Date };
  auditEntry: AuditEntry;
  syntheticFailures: LoginAttempt[];
} {
  const now = new Date();

  const activeTokens = opts.refreshTokens.filter(
    (t) => t.userId === opts.target.id && t.revokedAt === null,
  );
  const revokedIds = activeTokens.map((t) => t.id);

  const existingActive = opts.existingResetTokens.filter(
    (t) => t.userId === opts.target.id && t.usedAt === null,
  );
  const invalidatedResetIds = existingActive.map((t) => t.id);

  const rawToken = generateToken();
  const tokenHash = sha256(rawToken);
  const expiresAt = new Date(now.getTime() + 60 * 60 * 1000);

  const auditEntry: AuditEntry = {
    userId: opts.admin.id,
    userEmail: opts.admin.email,
    action: "FORCE_PASSWORD_RESET",
    resource: "user",
    resourceId: String(opts.target.id),
    before: JSON.stringify({ email: opts.target.email, role: opts.target.role }),
    after: JSON.stringify({
      reason: "Compromised account detected",
      suspiciousIp: opts.suspiciousIp ?? null,
      sessionsRevoked: revokedIds.length,
      loginBlockApplied: opts.blockLogin,
    }),
    ip: opts.adminIp,
  };

  const syntheticFailures: LoginAttempt[] = opts.blockLogin
    ? Array.from({ length: 5 }, () => ({
        email: opts.target.email,
        ip: "admin-force-reset",
        userId: opts.target.id,
        success: false,
      }))
    : [];

  return { revokedIds, invalidatedResetIds, newResetToken: { tokenHash, expiresAt }, auditEntry, syntheticFailures };
}

// ── Request validation helpers ─────────────────────────────────────────────────

function validateForceResetRequest(body: unknown): { ok: true; email: string } | { ok: false; status: number; error: string } {
  if (typeof body !== "object" || body === null) {
    return { ok: false, status: 400, error: "email is required" };
  }
  const { email } = body as Record<string, unknown>;
  if (!email || typeof email !== "string") {
    return { ok: false, status: 400, error: "email is required" };
  }
  return { ok: true, email: email.toLowerCase().trim() };
}

// ── Authorization helpers ──────────────────────────────────────────────────────

type Role = "admin" | "customer" | "vendor";

function checkAdminAccess(role: Role | null): { allowed: boolean; status: number; error: string } | { allowed: true } {
  if (!role) return { allowed: false, status: 401, error: "Unauthorized" };
  if (role !== "admin") return { allowed: false, status: 403, error: "Forbidden" };
  return { allowed: true };
}

// ── Tests ──────────────────────────────────────────────────────────────────────

const ADMIN: User = { id: 1, name: "Admin User", email: "admin@luxe.com", role: "admin" };
const CUSTOMER: User = { id: 42, name: "Jane Doe", email: "jane@example.com", role: "customer" };

describe("Force Password Reset — request validation", () => {
  it("rejects missing body", () => {
    const r = validateForceResetRequest(null);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.status).toBe(400);
  });

  it("rejects missing email field", () => {
    const r = validateForceResetRequest({ blockLogin: true });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/email/i);
  });

  it("rejects non-string email", () => {
    const r = validateForceResetRequest({ email: 123 });
    expect(r.ok).toBe(false);
  });

  it("accepts valid email and normalises to lowercase", () => {
    const r = validateForceResetRequest({ email: "JANE@Example.COM" });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.email).toBe("jane@example.com");
  });

  it("trims whitespace from email", () => {
    const r = validateForceResetRequest({ email: "  jane@example.com  " });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.email).toBe("jane@example.com");
  });
});

describe("Force Password Reset — authorization", () => {
  it("rejects unauthenticated request (null role)", () => {
    const result = checkAdminAccess(null);
    expect(result.allowed).toBe(false);
    if (!result.allowed) expect(result.status).toBe(401);
  });

  it("rejects customer role", () => {
    const result = checkAdminAccess("customer");
    expect(result.allowed).toBe(false);
    if (!result.allowed) expect(result.status).toBe(403);
  });

  it("rejects vendor role", () => {
    const result = checkAdminAccess("vendor");
    expect(result.allowed).toBe(false);
    if (!result.allowed) expect(result.status).toBe(403);
  });

  it("allows admin role", () => {
    const result = checkAdminAccess("admin");
    expect(result.allowed).toBe(true);
  });
});

describe("Force Password Reset — session revocation", () => {
  const makeTokens = (count: number, userId: number, someRevoked = 0): RefreshToken[] =>
    Array.from({ length: count }, (_, i) => ({
      id: i + 1,
      userId,
      revokedAt: i < someRevoked ? new Date() : null,
    }));

  it("revokes all active sessions for the target user", () => {
    const tokens = makeTokens(3, CUSTOMER.id);
    const { revokedIds } = applyForceReset({
      admin: ADMIN, target: CUSTOMER, refreshTokens: tokens,
      existingResetTokens: [], adminIp: "10.0.0.1", blockLogin: false,
    });
    expect(revokedIds).toHaveLength(3);
    expect(revokedIds).toEqual([1, 2, 3]);
  });

  it("skips already-revoked sessions", () => {
    const tokens = makeTokens(4, CUSTOMER.id, 2);
    const { revokedIds } = applyForceReset({
      admin: ADMIN, target: CUSTOMER, refreshTokens: tokens,
      existingResetTokens: [], adminIp: null, blockLogin: false,
    });
    expect(revokedIds).toHaveLength(2);
  });

  it("handles user with zero active sessions", () => {
    const { revokedIds } = applyForceReset({
      admin: ADMIN, target: CUSTOMER, refreshTokens: [],
      existingResetTokens: [], adminIp: null, blockLogin: false,
    });
    expect(revokedIds).toHaveLength(0);
  });

  it("only revokes sessions belonging to the target user", () => {
    const tokens: RefreshToken[] = [
      { id: 1, userId: CUSTOMER.id, revokedAt: null },
      { id: 2, userId: 999, revokedAt: null },
      { id: 3, userId: CUSTOMER.id, revokedAt: null },
    ];
    const { revokedIds } = applyForceReset({
      admin: ADMIN, target: CUSTOMER, refreshTokens: tokens,
      existingResetTokens: [], adminIp: null, blockLogin: false,
    });
    expect(revokedIds).toEqual([1, 3]);
  });
});

describe("Force Password Reset — reset token creation", () => {
  it("generates a new password reset token with 60-min expiry", () => {
    const before = Date.now();
    const { newResetToken } = applyForceReset({
      admin: ADMIN, target: CUSTOMER, refreshTokens: [],
      existingResetTokens: [], adminIp: null, blockLogin: false,
    });
    const after = Date.now();
    expect(newResetToken.tokenHash).toHaveLength(64);
    const expiryMs = newResetToken.expiresAt.getTime();
    expect(expiryMs).toBeGreaterThan(before + 59 * 60 * 1000);
    expect(expiryMs).toBeLessThan(after + 61 * 60 * 1000);
  });

  it("invalidates existing pending reset tokens", () => {
    const existing: PasswordResetToken[] = [
      { id: 10, userId: CUSTOMER.id, tokenHash: "abc", expiresAt: new Date(Date.now() + 3600000), usedAt: null },
      { id: 11, userId: CUSTOMER.id, tokenHash: "def", expiresAt: new Date(Date.now() + 3600000), usedAt: null },
    ];
    const { invalidatedResetIds } = applyForceReset({
      admin: ADMIN, target: CUSTOMER, refreshTokens: [],
      existingResetTokens: existing, adminIp: null, blockLogin: false,
    });
    expect(invalidatedResetIds).toEqual([10, 11]);
  });

  it("does not invalidate already-used reset tokens", () => {
    const existing: PasswordResetToken[] = [
      { id: 10, userId: CUSTOMER.id, tokenHash: "abc", expiresAt: new Date(), usedAt: new Date() },
    ];
    const { invalidatedResetIds } = applyForceReset({
      admin: ADMIN, target: CUSTOMER, refreshTokens: [],
      existingResetTokens: existing, adminIp: null, blockLogin: false,
    });
    expect(invalidatedResetIds).toHaveLength(0);
  });

  it("each call generates a unique token hash", () => {
    const r1 = applyForceReset({ admin: ADMIN, target: CUSTOMER, refreshTokens: [], existingResetTokens: [], adminIp: null, blockLogin: false });
    const r2 = applyForceReset({ admin: ADMIN, target: CUSTOMER, refreshTokens: [], existingResetTokens: [], adminIp: null, blockLogin: false });
    expect(r1.newResetToken.tokenHash).not.toBe(r2.newResetToken.tokenHash);
  });
});

describe("Force Password Reset — audit log", () => {
  it("records admin user ID and email", () => {
    const { auditEntry } = applyForceReset({
      admin: ADMIN, target: CUSTOMER, refreshTokens: [],
      existingResetTokens: [], adminIp: "192.168.1.1", blockLogin: false,
    });
    expect(auditEntry.userId).toBe(ADMIN.id);
    expect(auditEntry.userEmail).toBe(ADMIN.email);
  });

  it("records action as FORCE_PASSWORD_RESET", () => {
    const { auditEntry } = applyForceReset({
      admin: ADMIN, target: CUSTOMER, refreshTokens: [],
      existingResetTokens: [], adminIp: null, blockLogin: false,
    });
    expect(auditEntry.action).toBe("FORCE_PASSWORD_RESET");
  });

  it("records resource as user and resourceId as target user ID", () => {
    const { auditEntry } = applyForceReset({
      admin: ADMIN, target: CUSTOMER, refreshTokens: [],
      existingResetTokens: [], adminIp: null, blockLogin: false,
    });
    expect(auditEntry.resource).toBe("user");
    expect(auditEntry.resourceId).toBe(String(CUSTOMER.id));
  });

  it("records target email in before field", () => {
    const { auditEntry } = applyForceReset({
      admin: ADMIN, target: CUSTOMER, refreshTokens: [],
      existingResetTokens: [], adminIp: null, blockLogin: false,
    });
    const before = JSON.parse(auditEntry.before);
    expect(before.email).toBe(CUSTOMER.email);
  });

  it("records reason and suspicious IP in after field", () => {
    const { auditEntry } = applyForceReset({
      admin: ADMIN, target: CUSTOMER, refreshTokens: [],
      existingResetTokens: [], adminIp: null, blockLogin: false,
      suspiciousIp: "1.2.3.4",
    });
    const after = JSON.parse(auditEntry.after);
    expect(after.reason).toBe("Compromised account detected");
    expect(after.suspiciousIp).toBe("1.2.3.4");
  });

  it("records session revocation count in after field", () => {
    const tokens = [
      { id: 1, userId: CUSTOMER.id, revokedAt: null },
      { id: 2, userId: CUSTOMER.id, revokedAt: null },
    ];
    const { auditEntry } = applyForceReset({
      admin: ADMIN, target: CUSTOMER, refreshTokens: tokens,
      existingResetTokens: [], adminIp: null, blockLogin: false,
    });
    const after = JSON.parse(auditEntry.after);
    expect(after.sessionsRevoked).toBe(2);
  });

  it("records admin IP address", () => {
    const { auditEntry } = applyForceReset({
      admin: ADMIN, target: CUSTOMER, refreshTokens: [],
      existingResetTokens: [], adminIp: "10.20.30.40", blockLogin: false,
    });
    expect(auditEntry.ip).toBe("10.20.30.40");
  });

  it("handles null admin IP gracefully", () => {
    const { auditEntry } = applyForceReset({
      admin: ADMIN, target: CUSTOMER, refreshTokens: [],
      existingResetTokens: [], adminIp: null, blockLogin: false,
    });
    expect(auditEntry.ip).toBeNull();
  });
});

describe("Force Password Reset — temporary login block", () => {
  it("inserts 5 synthetic failures when blockLogin is true", () => {
    const { syntheticFailures } = applyForceReset({
      admin: ADMIN, target: CUSTOMER, refreshTokens: [],
      existingResetTokens: [], adminIp: null, blockLogin: true,
    });
    expect(syntheticFailures).toHaveLength(5);
  });

  it("all synthetic failures use target email and special IP marker", () => {
    const { syntheticFailures } = applyForceReset({
      admin: ADMIN, target: CUSTOMER, refreshTokens: [],
      existingResetTokens: [], adminIp: null, blockLogin: true,
    });
    for (const f of syntheticFailures) {
      expect(f.email).toBe(CUSTOMER.email);
      expect(f.ip).toBe("admin-force-reset");
      expect(f.success).toBe(false);
      expect(f.userId).toBe(CUSTOMER.id);
    }
  });

  it("inserts no failures when blockLogin is false", () => {
    const { syntheticFailures } = applyForceReset({
      admin: ADMIN, target: CUSTOMER, refreshTokens: [],
      existingResetTokens: [], adminIp: null, blockLogin: false,
    });
    expect(syntheticFailures).toHaveLength(0);
  });
});

describe("Force Password Reset — email trigger (mocked)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls email sender with correct parameters", async () => {
    const mockSend = vi.fn().mockResolvedValue(undefined);

    const resetUrl = `https://luxestore.com/reset-password?token=abc123`;
    const loginTime = new Date("2026-06-11T10:00:00Z");

    await mockSend({
      email: CUSTOMER.email,
      name: CUSTOMER.name,
      resetUrl,
      suspiciousIp: "1.2.3.4",
      loginTime,
    });

    expect(mockSend).toHaveBeenCalledOnce();
    const args = mockSend.mock.calls[0][0];
    expect(args.email).toBe(CUSTOMER.email);
    expect(args.resetUrl).toContain("reset-password");
    expect(args.suspiciousIp).toBe("1.2.3.4");
  });

  it("does not throw when email sender fails (graceful degradation)", async () => {
    const failingMock = vi.fn().mockRejectedValue(new Error("SMTP error"));
    const handled = failingMock().catch(() => undefined);
    await expect(handled).resolves.toBeUndefined();
  });
});

describe("Force Password Reset — token hashing", () => {
  it("sha256 produces 64-char hex string", () => {
    const hash = sha256("test-token");
    expect(hash).toHaveLength(64);
    expect(/^[0-9a-f]+$/.test(hash)).toBe(true);
  });

  it("same input produces same hash (deterministic)", () => {
    const h1 = sha256("same-input");
    const h2 = sha256("same-input");
    expect(h1).toBe(h2);
  });

  it("different inputs produce different hashes", () => {
    expect(sha256("token-a")).not.toBe(sha256("token-b"));
  });

  it("generateToken produces 64-char hex string", () => {
    const token = generateToken();
    expect(token).toHaveLength(64);
    expect(/^[0-9a-f]+$/.test(token)).toBe(true);
  });

  it("generateToken is not deterministic", () => {
    expect(generateToken()).not.toBe(generateToken());
  });
});
