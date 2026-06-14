import { describe, it, expect } from "vitest";

type SettingsMap = Record<string, string>;

const PUBLIC_KEYS = new Set([
  "store_name", "store_name_ar", "store_logo",
  "contact_email", "contact_phone", "contact_address", "contact_address_ar",
  "social_facebook", "social_instagram", "social_twitter", "social_tiktok", "social_youtube",
  "seo_title", "seo_description", "seo_keywords",
  "payment_cod_enabled", "payment_paymob_enabled",
  "shipping_free_threshold", "shipping_fee",
  "homepage_show_banners", "homepage_show_featured",
  "homepage_show_new_arrivals", "homepage_show_best_sellers", "homepage_show_categories",
]);

const SENSITIVE_KEYS = [
  "paymob_iframe_id",
  "paymob_integration_id_card",
  "paymob_integration_id_meeza",
  "paymob_integration_id_vodafone",
  "email_from_name",
  "email_from_address",
];

function filterPublicSettings(all: SettingsMap): SettingsMap {
  const pub: SettingsMap = {};
  for (const [k, v] of Object.entries(all)) {
    if (PUBLIC_KEYS.has(k)) pub[k] = v;
  }
  return pub;
}

function validateSettingsUpdate(updates: unknown): { valid: boolean; error?: string } {
  if (!updates || typeof updates !== "object" || Array.isArray(updates)) {
    return { valid: false, error: "Request body must be a key-value object" };
  }
  const entries = Object.entries(updates as Record<string, unknown>);
  if (entries.length === 0) return { valid: false, error: "No valid settings provided" };
  if (entries.length > 100) return { valid: false, error: "Too many settings in one request (max 100)" };
  for (const [k, v] of entries) {
    if (typeof k !== "string" || k.length === 0 || k.length > 128) {
      return { valid: false, error: `Invalid key: "${k}"` };
    }
    if (v !== null && v !== "" && typeof v !== "string") {
      return { valid: false, error: `Invalid value for key "${k}"` };
    }
  }
  return { valid: true };
}

const FULL_SETTINGS: SettingsMap = {
  store_name: "Velora",
  store_name_ar: "لوكس",
  store_logo: "https://cdn.example.com/logo.png",
  contact_email: "support@luxe.com",
  contact_phone: "+1-555-0000",
  contact_address: "123 Fashion Ave",
  contact_address_ar: "١٢٣ شارع الموضة",
  social_facebook: "https://facebook.com/luxe",
  social_instagram: "https://instagram.com/luxe",
  social_twitter: "",
  social_tiktok: "",
  social_youtube: "",
  seo_title: "Velora — Premium Fashion",
  seo_description: "Discover luxury fashion.",
  seo_keywords: "fashion, luxury",
  payment_cod_enabled: "true",
  payment_paymob_enabled: "true",
  shipping_free_threshold: "500",
  shipping_fee: "50",
  homepage_show_banners: "true",
  homepage_show_featured: "true",
  homepage_show_new_arrivals: "true",
  homepage_show_best_sellers: "true",
  homepage_show_categories: "true",
  paymob_iframe_id: "12345",
  paymob_integration_id_card: "99999",
  paymob_integration_id_meeza: "88888",
  paymob_integration_id_vodafone: "77777",
  email_from_name: "Velora Store",
  email_from_address: "no-reply@luxe.com",
};

// ─────────────────────────────────────────────────────────────────────────────
describe("Settings — Public filter", () => {
  const pub = filterPublicSettings(FULL_SETTINGS);

  it("public response contains store_name", () => {
    expect(pub.store_name).toBe("Velora");
  });

  it("public response does NOT contain Paymob iframe ID", () => {
    expect("paymob_iframe_id" in pub).toBe(false);
  });

  it("public response does NOT contain Paymob integration IDs", () => {
    expect("paymob_integration_id_card" in pub).toBe(false);
    expect("paymob_integration_id_meeza" in pub).toBe(false);
    expect("paymob_integration_id_vodafone" in pub).toBe(false);
  });

  it("public response does NOT contain email credentials", () => {
    expect("email_from_address" in pub).toBe(false);
  });

  it("public response includes all expected public keys", () => {
    for (const key of PUBLIC_KEYS) {
      expect(key in pub).toBe(true);
    }
  });

  it("sensitive keys are absent from public response", () => {
    for (const key of SENSITIVE_KEYS) {
      expect(key in pub).toBe(false);
    }
  });
});

describe("Settings — Update validation", () => {
  it("accepts a valid settings object", () => {
    const result = validateSettingsUpdate({ store_name: "New Name", shipping_fee: "60" });
    expect(result.valid).toBe(true);
  });

  it("rejects null body", () => {
    expect(validateSettingsUpdate(null).valid).toBe(false);
  });

  it("rejects array body", () => {
    expect(validateSettingsUpdate(["store_name", "Velora"]).valid).toBe(false);
  });

  it("rejects empty object", () => {
    expect(validateSettingsUpdate({}).valid).toBe(false);
  });

  it("rejects object exceeding 100 keys", () => {
    const big: Record<string, string> = {};
    for (let i = 0; i < 101; i++) big[`key_${i}`] = `value_${i}`;
    expect(validateSettingsUpdate(big).valid).toBe(false);
  });

  it("accepts exactly 100 keys", () => {
    const ok: Record<string, string> = {};
    for (let i = 0; i < 100; i++) ok[`key_${i}`] = `value_${i}`;
    expect(validateSettingsUpdate(ok).valid).toBe(true);
  });
});

describe("Settings — Sensitive key isolation", () => {
  it("paymob_iframe_id is not in PUBLIC_KEYS", () => {
    expect(PUBLIC_KEYS.has("paymob_iframe_id")).toBe(false);
  });
  it("paymob_integration_id_card is not in PUBLIC_KEYS", () => {
    expect(PUBLIC_KEYS.has("paymob_integration_id_card")).toBe(false);
  });
  it("email_from_address is not in PUBLIC_KEYS", () => {
    expect(PUBLIC_KEYS.has("email_from_address")).toBe(false);
  });
  it("store_name IS in PUBLIC_KEYS", () => {
    expect(PUBLIC_KEYS.has("store_name")).toBe(true);
  });
  it("payment_paymob_enabled IS in PUBLIC_KEYS (flag only, not credentials)", () => {
    expect(PUBLIC_KEYS.has("payment_paymob_enabled")).toBe(true);
  });
});
