---
name: Store settings pattern
description: How the store_settings key-value table works and how to add new settings.
---

## Pattern
`store_settings` table: `id`, `key` (unique), `value` (text, nullable), `updated_at`

Default values live in `DEFAULT_SETTINGS` exported from `lib/db/src/schema/store-settings.ts`.

## Endpoints
- `GET /api/settings` — public subset (non-sensitive keys, see `PUBLIC_KEYS` set in settings.ts)
- `GET /api/settings/admin` — all settings (admin JWT required)
- `PATCH /api/settings` — upsert key-value pairs (admin JWT required)
- `POST /api/settings/seed` — insert missing defaults without overwriting (admin JWT required)

## How to add a new setting
1. Add to `DEFAULT_SETTINGS` in `lib/db/src/schema/store-settings.ts`
2. Add to `PUBLIC_KEYS` set in `artifacts/api-server/src/routes/settings.ts` if it should be publicly readable
3. Add to `SETTING_SECTIONS` in `artifacts/store/src/components/SettingsPanel.tsx` for admin UI
4. No migration needed — settings are inserted lazily; just re-seed via POST /settings/seed
