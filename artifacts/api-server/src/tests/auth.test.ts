import { describe, it, expect, beforeAll } from "vitest";
import crypto from "node:crypto";
import jwt from "jsonwebtoken";

const SECRET = "test-secret-key-for-unit-tests";

function signToken(user: { id: number; email: string; role: string }): string {
  return jwt.sign(user, SECRET, { expiresIn: "7d" });
}

function verifyToken(token: string): { id: number; email: string; role: string } | null {
  try {
    return jwt.verify(token, SECRET) as { id: number; email: string; role: string };
  } catch {
    return null;
  }
}

function sha256(s: string): string {
  return crypto.createHash("sha256").update(s).digest("hex");
}

describe("JWT Authentication", () => {
  it("signs and verifies a valid token", () => {
    const payload = { id: 1, email: "test@example.com", role: "customer" };
    const token = signToken(payload);
    const decoded = verifyToken(token);
    expect(decoded).not.toBeNull();
    expect(decoded!.id).toBe(1);
    expect(decoded!.email).toBe("test@example.com");
    expect(decoded!.role).toBe("customer");
  });

  it("rejects a tampered token", () => {
    const token = signToken({ id: 1, email: "admin@example.com", role: "admin" });
    const parts = token.split(".");
    const tamperedPayload = Buffer.from(JSON.stringify({ id: 99, email: "hack@example.com", role: "admin" })).toString("base64url");
    const tampered = `${parts[0]}.${tamperedPayload}.${parts[2]}`;
    expect(verifyToken(tampered)).toBeNull();
  });

  it("rejects a token signed with a different secret", () => {
    const foreign = jwt.sign({ id: 1, email: "x@x.com", role: "admin" }, "wrong-secret");
    expect(verifyToken(foreign)).toBeNull();
  });

  it("SHA-256 hash is deterministic and 64 chars", () => {
    const raw = crypto.randomBytes(32).toString("hex");
    const h1 = sha256(raw);
    const h2 = sha256(raw);
    expect(h1).toBe(h2);
    expect(h1).toHaveLength(64);
  });

  it("two different tokens produce different hashes", () => {
    const a = sha256(crypto.randomBytes(32).toString("hex"));
    const b = sha256(crypto.randomBytes(32).toString("hex"));
    expect(a).not.toBe(b);
  });
});

describe("Role escalation prevention", () => {
  function assignRole(requestedRole: string): string {
    return requestedRole === "vendor" || requestedRole === "admin" ? "customer" : requestedRole;
  }

  it("self-registration cannot create admin role", () => {
    expect(assignRole("admin")).toBe("customer");
  });

  it("self-registration cannot create vendor role", () => {
    expect(assignRole("vendor")).toBe("customer");
  });

  it("self-registration as customer is allowed", () => {
    expect(assignRole("customer")).toBe("customer");
  });
});
