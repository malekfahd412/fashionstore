import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import crypto from "node:crypto";
import jwt from "jsonwebtoken";

// ---------------------------------------------------------------------------
// Helpers that mirror the production implementations
// ---------------------------------------------------------------------------

const SECRET = "test-secret-key-for-refresh-token-tests";

function signToken(
  user: { id: number; email: string; role: string },
  expiresIn: string | number = "7d",
): string {
  return jwt.sign(user, SECRET, { expiresIn } as jwt.SignOptions);
}

function verifyToken(token: string): { id: number; email: string; role: string } | null {
  try {
    return jwt.verify(token, SECRET) as { id: number; email: string; role: string };
  } catch {
    return null;
  }
}

function generateRefreshToken(): { raw: string; hash: string } {
  const raw = crypto.randomBytes(32).toString("hex");
  const hash = crypto.createHash("sha256").update(raw).digest("hex");
  return { raw, hash };
}

function hashToken(raw: string): string {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

// Minimal in-memory token store (mirrors refresh_tokens table behaviour)
interface StoredToken {
  id: number;
  userId: number;
  tokenHash: string;
  expiresAt: Date;
  revokedAt: Date | null;
}

let tokenStore: StoredToken[] = [];
let nextId = 1;

function storeRefreshToken(userId: number, raw: string, ttlMs: number): StoredToken {
  const record: StoredToken = {
    id: nextId++,
    userId,
    tokenHash: hashToken(raw),
    expiresAt: new Date(Date.now() + ttlMs),
    revokedAt: null,
  };
  tokenStore.push(record);
  return record;
}

function findActiveToken(raw: string): StoredToken | undefined {
  const hash = hashToken(raw);
  return tokenStore.find(
    (t) => t.tokenHash === hash && t.revokedAt === null && t.expiresAt > new Date(),
  );
}

function revokeToken(id: number): void {
  const t = tokenStore.find((t) => t.id === id);
  if (t) t.revokedAt = new Date();
}

// Simulates what the backend refresh endpoint does:
// 1. Look up the incoming refresh token
// 2. Revoke it (rotation)
// 3. Issue a new access + refresh token pair
function performRefresh(
  incomingRaw: string,
): { accessToken: string; refreshToken: string } | null {
  const record = findActiveToken(incomingRaw);
  if (!record) return null; // expired or revoked

  revokeToken(record.id);

  const accessToken = signToken({ id: record.userId, email: "user@test.com", role: "customer" });
  const { raw: newRaw } = generateRefreshToken();
  storeRefreshToken(record.userId, newRaw, 30 * 24 * 60 * 60 * 1000);

  return { accessToken, refreshToken: newRaw };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  tokenStore = [];
  nextId = 1;
});

afterEach(() => {
  vi.useRealTimers();
});

// ── 1. Token expiry ──────────────────────────────────────────────────────────

describe("Access token expiry", () => {
  it("verifyToken returns null for an expired access token", () => {
    const token = signToken({ id: 1, email: "a@b.com", role: "customer" }, -1); // expired 1 sec ago
    expect(verifyToken(token)).toBeNull();
  });

  it("verifyToken returns the payload for a valid token", () => {
    const token = signToken({ id: 1, email: "a@b.com", role: "customer" }, "1h");
    const payload = verifyToken(token);
    expect(payload).not.toBeNull();
    expect(payload!.id).toBe(1);
  });

  it("refresh token is expired when expiresAt is in the past", () => {
    const { raw } = generateRefreshToken();
    // Store with a TTL that expired 1 ms ago
    const record: StoredToken = {
      id: nextId++,
      userId: 1,
      tokenHash: hashToken(raw),
      expiresAt: new Date(Date.now() - 1),
      revokedAt: null,
    };
    tokenStore.push(record);

    expect(findActiveToken(raw)).toBeUndefined();
  });

  it("refresh token is active when expiresAt is in the future", () => {
    const { raw } = generateRefreshToken();
    storeRefreshToken(1, raw, 30 * 24 * 60 * 60 * 1000);
    expect(findActiveToken(raw)).toBeDefined();
  });
});

// ── 2. Successful refresh ────────────────────────────────────────────────────

describe("Successful token refresh", () => {
  it("returns a new access token and refresh token on success", () => {
    const { raw } = generateRefreshToken();
    storeRefreshToken(1, raw, 30 * 24 * 60 * 60 * 1000);

    const result = performRefresh(raw);

    expect(result).not.toBeNull();
    expect(typeof result!.accessToken).toBe("string");
    expect(typeof result!.refreshToken).toBe("string");
    expect(result!.refreshToken).not.toBe(raw); // must be a new token
  });

  it("new access token is a valid JWT", () => {
    const { raw } = generateRefreshToken();
    storeRefreshToken(1, raw, 30 * 24 * 60 * 60 * 1000);

    const result = performRefresh(raw)!;
    const payload = verifyToken(result.accessToken);

    expect(payload).not.toBeNull();
    expect(payload!.id).toBe(1);
  });

  it("new refresh token is stored and the old one is revoked", () => {
    const { raw: oldRaw } = generateRefreshToken();
    storeRefreshToken(1, oldRaw, 30 * 24 * 60 * 60 * 1000);

    const result = performRefresh(oldRaw)!;

    // Old token revoked
    expect(findActiveToken(oldRaw)).toBeUndefined();
    // New token active
    expect(findActiveToken(result.refreshToken)).toBeDefined();
  });

  it("returns null for an unknown refresh token", () => {
    const { raw } = generateRefreshToken(); // never stored
    expect(performRefresh(raw)).toBeNull();
  });
});

// ── 3. Refresh token rotation ────────────────────────────────────────────────

describe("Refresh token rotation", () => {
  it("each rotation produces a distinct refresh token", () => {
    const { raw: first } = generateRefreshToken();
    storeRefreshToken(1, first, 30 * 24 * 60 * 60 * 1000);

    const r1 = performRefresh(first)!;
    const r2 = performRefresh(r1.refreshToken)!;
    const r3 = performRefresh(r2.refreshToken)!;

    const tokens = [first, r1.refreshToken, r2.refreshToken, r3.refreshToken];
    const uniqueTokens = new Set(tokens);
    expect(uniqueTokens.size).toBe(4);
  });

  it("a rotated-out token cannot be reused (replay attack)", () => {
    const { raw } = generateRefreshToken();
    storeRefreshToken(1, raw, 30 * 24 * 60 * 60 * 1000);

    performRefresh(raw); // rotates raw → new token
    const result = performRefresh(raw); // replaying the old raw token

    expect(result).toBeNull();
  });

  it("second rotation succeeds only with the latest token", () => {
    const { raw: t1 } = generateRefreshToken();
    storeRefreshToken(1, t1, 30 * 24 * 60 * 60 * 1000);

    const { refreshToken: t2 } = performRefresh(t1)!;
    const result = performRefresh(t2);

    expect(result).not.toBeNull();
  });
});

// ── 4. Refresh failure ───────────────────────────────────────────────────────

describe("Refresh failure handling", () => {
  it("returns null when the refresh token was never issued", () => {
    expect(performRefresh("completely-random-garbage")).toBeNull();
  });

  it("returns null when the refresh token is already revoked", () => {
    const { raw } = generateRefreshToken();
    const record = storeRefreshToken(1, raw, 30 * 24 * 60 * 60 * 1000);
    revokeToken(record.id);

    expect(performRefresh(raw)).toBeNull();
  });

  it("returns null for an expired refresh token", () => {
    const { raw } = generateRefreshToken();
    const record: StoredToken = {
      id: nextId++,
      userId: 1,
      tokenHash: hashToken(raw),
      expiresAt: new Date(Date.now() - 1000),
      revokedAt: null,
    };
    tokenStore.push(record);

    expect(performRefresh(raw)).toBeNull();
  });

  it("returns null when token hash does not match stored hash", () => {
    const { raw } = generateRefreshToken();
    storeRefreshToken(1, raw, 30 * 24 * 60 * 60 * 1000);

    const tampered = raw.slice(0, -4) + "XXXX";
    expect(performRefresh(tampered)).toBeNull();
  });
});

// ── 5. Logout invalidation ───────────────────────────────────────────────────

describe("Logout invalidation", () => {
  it("revoking a token prevents it from being used for refresh", () => {
    const { raw } = generateRefreshToken();
    const record = storeRefreshToken(1, raw, 30 * 24 * 60 * 60 * 1000);

    revokeToken(record.id);

    expect(performRefresh(raw)).toBeNull();
  });

  it("revoking one user's token does not affect another user's token", () => {
    const { raw: raw1 } = generateRefreshToken();
    const { raw: raw2 } = generateRefreshToken();

    const record1 = storeRefreshToken(1, raw1, 30 * 24 * 60 * 60 * 1000);
    storeRefreshToken(2, raw2, 30 * 24 * 60 * 60 * 1000);

    revokeToken(record1.id);

    expect(findActiveToken(raw1)).toBeUndefined(); // user 1: gone
    expect(findActiveToken(raw2)).toBeDefined();   // user 2: unaffected
  });

  it("revokedAt timestamp is recorded on logout", () => {
    const { raw } = generateRefreshToken();
    const record = storeRefreshToken(1, raw, 30 * 24 * 60 * 60 * 1000);

    expect(record.revokedAt).toBeNull();
    revokeToken(record.id);
    expect(record.revokedAt).toBeInstanceOf(Date);
  });

  it("token store holds only active tokens for a user after logout", () => {
    const { raw: raw1 } = generateRefreshToken();
    const { raw: raw2 } = generateRefreshToken();

    const r1 = storeRefreshToken(1, raw1, 30 * 24 * 60 * 60 * 1000);
    storeRefreshToken(1, raw2, 30 * 24 * 60 * 60 * 1000);

    revokeToken(r1.id);

    const activeForUser1 = tokenStore.filter(
      (t) => t.userId === 1 && t.revokedAt === null && t.expiresAt > new Date(),
    );
    expect(activeForUser1).toHaveLength(1);
    expect(activeForUser1[0].tokenHash).toBe(hashToken(raw2));
  });
});
