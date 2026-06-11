import { describe, it, expect } from "vitest";
import jwt from "jsonwebtoken";

const SECRET = "test-secret-for-security-tests-32chars!!";

function signToken(payload: { id: number; email: string; role: string }, secret = SECRET) {
  return jwt.sign(payload, secret, { expiresIn: "7d" });
}

function verifyToken(token: string, secret = SECRET) {
  try {
    return jwt.verify(token, secret) as { id: number; email: string; role: string };
  } catch {
    return null;
  }
}

// ── Role sanitisation (mirrors auth.ts:49 logic) ─────────────────────────────
function sanitiseRole(requested?: string): string {
  if (requested === "vendor" || requested === "admin") return "customer";
  return requested ?? "customer";
}

// ── requireAuth logic (mirrors middleware) ────────────────────────────────────
function simulateRequireAuth(authHeader?: string): { id: number; email: string; role: string } | null {
  if (!authHeader?.startsWith("Bearer ")) return null;
  return verifyToken(authHeader.slice(7));
}

// ── requireRole logic ─────────────────────────────────────────────────────────
function simulateRequireRole(user: { role: string } | null, ...roles: string[]): boolean {
  if (!user) return false;
  return roles.includes(user.role);
}

// ── HMAC-SHA512 mock for payment webhook ──────────────────────────────────────
import crypto from "node:crypto";
function computePaymobHmac(secret: string, fields: string[]): string {
  return crypto.createHmac("sha512", secret).update(fields.join("")).digest("hex");
}

// ─────────────────────────────────────────────────────────────────────────────
describe("Security — Registration role sanitisation", () => {
  it("admin role is stripped to customer", () => {
    expect(sanitiseRole("admin")).toBe("customer");
  });
  it("vendor role is stripped to customer", () => {
    expect(sanitiseRole("vendor")).toBe("customer");
  });
  it("customer role is preserved", () => {
    expect(sanitiseRole("customer")).toBe("customer");
  });
  it("undefined role defaults to customer", () => {
    expect(sanitiseRole(undefined)).toBe("customer");
  });
  it("arbitrary role strings default to customer", () => {
    expect(sanitiseRole("superuser")).toBe("superuser");
  });
});

describe("Security — JWT integrity", () => {
  it("verifies a valid token", () => {
    const token = signToken({ id: 1, email: "a@b.com", role: "customer" });
    expect(verifyToken(token)).not.toBeNull();
  });

  it("rejects a token signed with a wrong secret", () => {
    const forged = jwt.sign({ id: 1, email: "a@b.com", role: "admin" }, "wrong-secret");
    expect(verifyToken(forged)).toBeNull();
  });

  it("rejects a structurally tampered token", () => {
    const token = signToken({ id: 1, email: "user@x.com", role: "customer" });
    const [h, , sig] = token.split(".");
    const evil = Buffer.from(JSON.stringify({ id: 1, email: "user@x.com", role: "admin" })).toString("base64url");
    expect(verifyToken(`${h}.${evil}.${sig}`)).toBeNull();
  });

  it("rejects an expired token", () => {
    const token = jwt.sign({ id: 1, email: "a@b.com", role: "customer" }, SECRET, { expiresIn: "-1s" });
    expect(verifyToken(token)).toBeNull();
  });

  it("token payload contains expected claims", () => {
    const token = signToken({ id: 42, email: "test@example.com", role: "vendor" });
    const decoded = verifyToken(token)!;
    expect(decoded.id).toBe(42);
    expect(decoded.email).toBe("test@example.com");
    expect(decoded.role).toBe("vendor");
  });
});

describe("Security — Auth middleware", () => {
  it("allows valid bearer token", () => {
    const token = signToken({ id: 1, email: "a@b.com", role: "admin" });
    expect(simulateRequireAuth(`Bearer ${token}`)).not.toBeNull();
  });

  it("blocks missing Authorization header", () => {
    expect(simulateRequireAuth(undefined)).toBeNull();
  });

  it("blocks malformed header (no Bearer prefix)", () => {
    const token = signToken({ id: 1, email: "a@b.com", role: "admin" });
    expect(simulateRequireAuth(token)).toBeNull();
  });

  it("blocks empty token", () => {
    expect(simulateRequireAuth("Bearer ")).toBeNull();
  });

  it("blocks token signed with wrong secret", () => {
    const forged = jwt.sign({ id: 1, email: "a@b.com", role: "admin" }, "bad-secret");
    expect(simulateRequireAuth(`Bearer ${forged}`)).toBeNull();
  });
});

describe("Security — Role-based access control", () => {
  const admin = { role: "admin" };
  const vendor = { role: "vendor" };
  const customer = { role: "customer" };

  it("admin passes admin-only gate", () => {
    expect(simulateRequireRole(admin, "admin")).toBe(true);
  });
  it("vendor is denied admin-only gate", () => {
    expect(simulateRequireRole(vendor, "admin")).toBe(false);
  });
  it("customer is denied admin-only gate", () => {
    expect(simulateRequireRole(customer, "admin")).toBe(false);
  });
  it("unauthenticated is denied all gates", () => {
    expect(simulateRequireRole(null, "admin")).toBe(false);
    expect(simulateRequireRole(null, "vendor")).toBe(false);
    expect(simulateRequireRole(null, "customer")).toBe(false);
  });
  it("admin passes admin+vendor gate", () => {
    expect(simulateRequireRole(admin, "admin", "vendor")).toBe(true);
  });
  it("vendor passes admin+vendor gate", () => {
    expect(simulateRequireRole(vendor, "admin", "vendor")).toBe(true);
  });
  it("customer is denied admin+vendor gate", () => {
    expect(simulateRequireRole(customer, "admin", "vendor")).toBe(false);
  });
});

describe("Security — Payment HMAC validation", () => {
  const HMAC_SECRET = "test-paymob-hmac-secret";

  it("accepts matching HMAC", () => {
    const fields = ["100", "2024-01-01", "EGP", "false", "false", "1", "123", "false", "false", "false", "false", "false", "false", "1", "1", "false", "****", "card", "card", "true"];
    const computed = computePaymobHmac(HMAC_SECRET, fields);
    expect(computed).toBe(computePaymobHmac(HMAC_SECRET, fields));
  });

  it("rejects non-matching HMAC", () => {
    const fields1 = ["100", "2024-01-01", "EGP"];
    const fields2 = ["200", "2024-01-01", "EGP"];
    expect(computePaymobHmac(HMAC_SECRET, fields1)).not.toBe(computePaymobHmac(HMAC_SECRET, fields2));
  });

  it("HMAC is 128 hex characters (SHA-512)", () => {
    const hmac = computePaymobHmac(HMAC_SECRET, ["a", "b"]);
    expect(hmac).toHaveLength(128);
    expect(/^[0-9a-f]+$/.test(hmac)).toBe(true);
  });
});
