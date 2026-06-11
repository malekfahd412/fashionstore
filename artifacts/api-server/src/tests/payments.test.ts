import { describe, it, expect } from "vitest";
import crypto from "node:crypto";

// ── Price calculation (mirrors order creation logic) ──────────────────────────
function calcLineTotal(unitPrice: number, quantity: number): number {
  return unitPrice * quantity;
}

function calcSubtotal(lines: { unitPrice: number; quantity: number }[]): number {
  return lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0);
}

function calcDiscount(subtotal: number, type: "percentage" | "fixed", value: number): number {
  if (type === "percentage") return Math.min((subtotal * value) / 100, subtotal);
  return Math.min(value, subtotal);
}

function calcTotal(subtotal: number, discount: number): number {
  return Math.max(0, subtotal - discount);
}

function amountToCents(amount: number): number {
  return Math.round(amount * 100);
}

// ── Paymob HMAC validation (mirrors payments.ts) ──────────────────────────────
function buildHmacString(obj: Record<string, unknown>): string {
  return [
    obj.amount_cents,
    obj.created_at,
    obj.currency,
    String(obj.error_occured),
    String(obj.has_parent_transaction),
    obj.id,
    String(obj.integration_id),
    String(obj.is_3d_secure),
    String(obj.is_auth),
    String(obj.is_capture),
    String(obj.is_refunded),
    String(obj.is_standalone_payment),
    String(obj.is_voided),
    obj.order,
    obj.owner,
    obj.pending,
    obj.source_data_pan,
    obj.source_data_sub_type,
    obj.source_data_type,
    obj.success,
  ].join("");
}

function verifyWebhookHmac(secret: string, obj: Record<string, unknown>, incoming: string): boolean {
  const computed = crypto.createHmac("sha512", secret).update(buildHmacString(obj)).digest("hex");
  return computed === incoming;
}

// ─────────────────────────────────────────────────────────────────────────────
describe("Payment — Order price calculation", () => {
  it("calculates single line total", () => {
    expect(calcLineTotal(299.99, 2)).toBeCloseTo(599.98);
  });

  it("calculates subtotal across multiple lines", () => {
    const lines = [
      { unitPrice: 100, quantity: 2 },
      { unitPrice: 50, quantity: 3 },
      { unitPrice: 200, quantity: 1 },
    ];
    expect(calcSubtotal(lines)).toBeCloseTo(550);
  });

  it("empty cart has zero subtotal", () => {
    expect(calcSubtotal([])).toBe(0);
  });

  it("percentage discount is correct", () => {
    expect(calcDiscount(1000, "percentage", 20)).toBeCloseTo(200);
  });

  it("fixed discount is correct", () => {
    expect(calcDiscount(1000, "fixed", 50)).toBeCloseTo(50);
  });

  it("discount cannot exceed subtotal — percentage", () => {
    expect(calcDiscount(50, "percentage", 200)).toBeCloseTo(50);
  });

  it("discount cannot exceed subtotal — fixed", () => {
    expect(calcDiscount(30, "fixed", 100)).toBeCloseTo(30);
  });

  it("final total cannot go below zero", () => {
    expect(calcTotal(50, 100)).toBe(0);
  });

  it("full order flow: subtotal → discount → total", () => {
    const lines = [{ unitPrice: 500, quantity: 1 }, { unitPrice: 250, quantity: 2 }];
    const subtotal = calcSubtotal(lines);
    expect(subtotal).toBeCloseTo(1000);
    const discount = calcDiscount(subtotal, "percentage", 10);
    expect(discount).toBeCloseTo(100);
    const total = calcTotal(subtotal, discount);
    expect(total).toBeCloseTo(900);
  });
});

describe("Payment — Amount conversion to cents", () => {
  it("converts whole number correctly", () => {
    expect(amountToCents(100)).toBe(10000);
  });

  it("rounds half-cents correctly", () => {
    expect(amountToCents(99.999)).toBe(10000);
    expect(amountToCents(99.994)).toBe(9999);
  });

  it("handles zero", () => {
    expect(amountToCents(0)).toBe(0);
  });

  it("handles typical EGP amounts", () => {
    expect(amountToCents(349.50)).toBe(34950);
    expect(amountToCents(1299.99)).toBe(129999);
  });
});

describe("Payment — Paymob HMAC webhook validation", () => {
  const SECRET = "paymob-test-secret";

  const mockTransaction: Record<string, unknown> = {
    amount_cents: 10000,
    created_at: "2024-01-01T00:00:00Z",
    currency: "EGP",
    error_occured: false,
    has_parent_transaction: false,
    id: 12345,
    integration_id: 999,
    is_3d_secure: false,
    is_auth: false,
    is_capture: false,
    is_refunded: false,
    is_standalone_payment: true,
    is_voided: false,
    order: 1,
    owner: 1,
    pending: false,
    source_data_pan: "****",
    source_data_sub_type: "MasterCard",
    source_data_type: "card",
    success: true,
  };

  it("accepts a valid HMAC", () => {
    const hmacStr = buildHmacString(mockTransaction);
    const hmac = crypto.createHmac("sha512", SECRET).update(hmacStr).digest("hex");
    expect(verifyWebhookHmac(SECRET, mockTransaction, hmac)).toBe(true);
  });

  it("rejects a tampered transaction", () => {
    const tampered = { ...mockTransaction, amount_cents: 1 };
    const hmacStr = buildHmacString(mockTransaction);
    const originalHmac = crypto.createHmac("sha512", SECRET).update(hmacStr).digest("hex");
    expect(verifyWebhookHmac(SECRET, tampered, originalHmac)).toBe(false);
  });

  it("rejects HMAC signed with wrong secret", () => {
    const hmacStr = buildHmacString(mockTransaction);
    const wrongHmac = crypto.createHmac("sha512", "wrong-secret").update(hmacStr).digest("hex");
    expect(verifyWebhookHmac(SECRET, mockTransaction, wrongHmac)).toBe(false);
  });

  it("HMAC output is 128 hex chars (SHA-512)", () => {
    const hmacStr = buildHmacString(mockTransaction);
    const hmac = crypto.createHmac("sha512", SECRET).update(hmacStr).digest("hex");
    expect(hmac).toHaveLength(128);
  });
});

describe("Payment — Stock validation", () => {
  function checkStock(required: number, available: number): { ok: boolean; shortage?: number } {
    if (available >= required) return { ok: true };
    return { ok: false, shortage: required - available };
  }

  it("sufficient stock returns ok", () => {
    expect(checkStock(3, 10).ok).toBe(true);
  });

  it("exact stock returns ok", () => {
    expect(checkStock(5, 5).ok).toBe(true);
  });

  it("insufficient stock returns shortage", () => {
    const result = checkStock(6, 4);
    expect(result.ok).toBe(false);
    expect(result.shortage).toBe(2);
  });

  it("zero stock returns shortage", () => {
    expect(checkStock(1, 0).ok).toBe(false);
  });
});
