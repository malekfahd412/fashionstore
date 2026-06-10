import { describe, it, expect } from "vitest";

type Coupon = {
  code: string;
  discountType: "percentage" | "fixed";
  discountValue: number;
  active: boolean;
  startDate: Date | null;
  endDate: Date | null;
  usageLimit: number | null;
  usageCount: number;
};

type ValidationResult = { valid: true; coupon: Coupon } | { valid: false; error: string };

function validateCoupon(coupon: Coupon | null, now: Date = new Date()): ValidationResult {
  if (!coupon || !coupon.active) return { valid: false, error: "Invalid coupon" };
  if (coupon.startDate && coupon.startDate > now) return { valid: false, error: "Coupon not yet active" };
  if (coupon.endDate && coupon.endDate < now) return { valid: false, error: "Coupon expired" };
  if (coupon.usageLimit != null && coupon.usageCount >= coupon.usageLimit) return { valid: false, error: "Usage limit reached" };
  return { valid: true, coupon };
}

const baseCoupon: Coupon = {
  code: "TEST20",
  discountType: "percentage",
  discountValue: 20,
  active: true,
  startDate: null,
  endDate: null,
  usageLimit: null,
  usageCount: 0,
};

describe("Coupon validation", () => {
  it("accepts a valid unlimited coupon", () => {
    const result = validateCoupon(baseCoupon);
    expect(result.valid).toBe(true);
  });

  it("rejects null coupon", () => {
    const result = validateCoupon(null);
    expect(result.valid).toBe(false);
    expect((result as { valid: false; error: string }).error).toBe("Invalid coupon");
  });

  it("rejects inactive coupon", () => {
    const result = validateCoupon({ ...baseCoupon, active: false });
    expect(result.valid).toBe(false);
  });

  it("rejects expired coupon", () => {
    const past = new Date(Date.now() - 86400_000);
    const result = validateCoupon({ ...baseCoupon, endDate: past });
    expect(result.valid).toBe(false);
    expect((result as { valid: false; error: string }).error).toBe("Coupon expired");
  });

  it("accepts coupon before its end date", () => {
    const future = new Date(Date.now() + 86400_000);
    const result = validateCoupon({ ...baseCoupon, endDate: future });
    expect(result.valid).toBe(true);
  });

  it("rejects coupon that has not started yet", () => {
    const future = new Date(Date.now() + 3600_000);
    const result = validateCoupon({ ...baseCoupon, startDate: future });
    expect(result.valid).toBe(false);
    expect((result as { valid: false; error: string }).error).toBe("Coupon not yet active");
  });

  it("rejects coupon at usage limit", () => {
    const result = validateCoupon({ ...baseCoupon, usageLimit: 10, usageCount: 10 });
    expect(result.valid).toBe(false);
    expect((result as { valid: false; error: string }).error).toBe("Usage limit reached");
  });

  it("accepts coupon one below usage limit", () => {
    const result = validateCoupon({ ...baseCoupon, usageLimit: 10, usageCount: 9 });
    expect(result.valid).toBe(true);
  });
});
