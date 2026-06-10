import { describe, it, expect } from "vitest";

type OrderItem = { productVariantId: number; quantity: number; price: number };

function calculateOrderTotal(items: OrderItem[]): number {
  return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
}

function applyDiscount(subtotal: number, type: "percentage" | "fixed", value: number): number {
  if (type === "percentage") return Math.max(0, subtotal - (subtotal * value) / 100);
  return Math.max(0, subtotal - value);
}

function validateStock(required: number, available: number): boolean {
  return available >= required;
}

describe("Order total calculation", () => {
  it("calculates single item total correctly", () => {
    expect(calculateOrderTotal([{ productVariantId: 1, quantity: 2, price: 99.99 }])).toBeCloseTo(199.98);
  });

  it("calculates multi-item total correctly", () => {
    const items: OrderItem[] = [
      { productVariantId: 1, quantity: 1, price: 299.00 },
      { productVariantId: 2, quantity: 2, price: 150.00 },
      { productVariantId: 3, quantity: 3, price: 50.00 },
    ];
    expect(calculateOrderTotal(items)).toBeCloseTo(749.00);
  });

  it("returns 0 for empty order", () => {
    expect(calculateOrderTotal([])).toBe(0);
  });
});

describe("Coupon discount application", () => {
  it("applies percentage discount correctly", () => {
    expect(applyDiscount(1000, "percentage", 20)).toBeCloseTo(800);
  });

  it("applies fixed discount correctly", () => {
    expect(applyDiscount(1000, "fixed", 50)).toBeCloseTo(950);
  });

  it("percentage discount never goes below 0", () => {
    expect(applyDiscount(50, "percentage", 100)).toBe(0);
  });

  it("fixed discount never goes below 0", () => {
    expect(applyDiscount(30, "fixed", 50)).toBe(0);
  });

  it("zero discount returns full amount", () => {
    expect(applyDiscount(500, "percentage", 0)).toBeCloseTo(500);
    expect(applyDiscount(500, "fixed", 0)).toBeCloseTo(500);
  });
});

describe("Stock validation", () => {
  it("allows purchase when stock is sufficient", () => {
    expect(validateStock(3, 10)).toBe(true);
  });

  it("allows purchase when stock exactly matches", () => {
    expect(validateStock(5, 5)).toBe(true);
  });

  it("rejects purchase when stock is insufficient", () => {
    expect(validateStock(6, 5)).toBe(false);
  });

  it("rejects purchase when stock is zero", () => {
    expect(validateStock(1, 0)).toBe(false);
  });
});
