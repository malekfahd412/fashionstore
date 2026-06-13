---
name: Google OAuth integration
description: How Google Sign-In is wired across the full stack in this project
---

## Architecture

- **DB**: `users.google_id` column (text, unique) added to `usersTable`
- **Backend**: `POST /api/auth/google` in `artifacts/api-server/src/routes/google-auth.ts`
  - Uses `google-auth-library` (installed on `@workspace/api-server`)
  - Reads `GOOGLE_CLIENT_ID` env var for token verification
  - 3 cases: existing googleId match → login; existing email → link account; new → register
  - Returns same `AuthResult` shape as email login
- **Settings**: `google_client_id` stored in `store_settings` table, exposed via public settings endpoint
- **Frontend**: `GoogleButton.tsx` component fetches `google_client_id` from public settings; renders `null` when not configured (graceful degradation)
  - Loads Google GSI script dynamically, renders native Google button via `google.accounts.id.renderButton`
  - Credential posted to `/api/auth/google`, result fed into `AuthContext.login()`
- **Admin**: `google_client_id` field added to SettingsPanel General section so admin can configure it

## Activation required

Google Login only appears in the UI after the admin sets `google_client_id` in Admin → Settings → General. The GOOGLE_CLIENT_ID environment variable must also be set on the server for token verification.

**Why:** This keeps Google Login fully opt-in — no UI footprint and no server crash when unconfigured.
