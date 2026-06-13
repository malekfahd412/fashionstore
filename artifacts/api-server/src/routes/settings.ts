import { Router, type IRouter } from "express";
import { db, storeSettingsTable, DEFAULT_SETTINGS } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth, requireRole } from "../middlewares/auth";

const router: IRouter = Router();

// Keys that are safe to expose publicly (non-sensitive store settings)
const PUBLIC_KEYS = new Set([
  "store_name", "store_name_ar", "store_logo",
  "contact_email", "contact_phone", "contact_address", "contact_address_ar",
  "social_facebook", "social_instagram", "social_twitter", "social_tiktok", "social_youtube",
  "seo_title", "seo_description", "seo_keywords",
  "payment_cod_enabled", "payment_paymob_enabled",
  "shipping_free_threshold", "shipping_fee",
  "homepage_show_banners", "homepage_show_featured",
  "homepage_show_new_arrivals", "homepage_show_best_sellers", "homepage_show_categories",
  "google_client_id",
]);

async function getAllSettings(): Promise<Record<string, string>> {
  const rows = await db.select().from(storeSettingsTable);
  const result = { ...DEFAULT_SETTINGS };
  for (const row of rows) {
    if (row.value !== null && row.value !== undefined) {
      result[row.key] = row.value;
    }
  }
  return result;
}

// ── GET /settings — public subset ─────────────────────────────────────────────
router.get("/settings", async (_req, res): Promise<void> => {
  const all = await getAllSettings();
  const pub: Record<string, string> = {};
  for (const [k, v] of Object.entries(all)) {
    if (PUBLIC_KEYS.has(k)) pub[k] = v;
  }
  res.json(pub);
});

// ── GET /settings/admin — full settings (admin only) ──────────────────────────
router.get("/settings/admin", requireAuth, requireRole("admin"), async (_req, res): Promise<void> => {
  const all = await getAllSettings();
  res.json(all);
});

// ── PATCH /settings — upsert settings (admin only) ────────────────────────────
router.patch("/settings", requireAuth, requireRole("admin"), async (req, res): Promise<void> => {
  const updates = req.body as Record<string, string>;
  if (!updates || typeof updates !== "object" || Array.isArray(updates)) {
    res.status(400).json({ error: "Request body must be a key-value object" }); return;
  }

  const entries = Object.entries(updates).filter(([k, v]) =>
    typeof k === "string" && k.length > 0 && k.length <= 128
    && (v === null || v === "" || typeof v === "string")
  );
  if (entries.length === 0) { res.status(400).json({ error: "No valid settings provided" }); return; }
  if (entries.length > 100) { res.status(400).json({ error: "Too many settings in one request (max 100)" }); return; }

  // Upsert each key
  for (const [key, value] of entries) {
    await db.insert(storeSettingsTable)
      .values({ key, value: value ?? null })
      .onConflictDoUpdate({ target: storeSettingsTable.key, set: { value: value ?? null } });
  }

  const all = await getAllSettings();
  res.json(all);
});

// ── POST /settings/seed — seed default settings if missing (admin only) ────────
router.post("/settings/seed", requireAuth, requireRole("admin"), async (_req, res): Promise<void> => {
  for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
    await db.insert(storeSettingsTable)
      .values({ key, value })
      .onConflictDoNothing();
  }
  const all = await getAllSettings();
  res.json(all);
});

export default router;
