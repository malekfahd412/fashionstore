---
name: Device recognition pattern
description: How device fingerprinting, trusted devices, and login notification are wired together in auth.ts
---

## Rule
Device recognition runs as a `void (async () => { ... })()` immediately after `recordAttempt` succeeds in the login route — fully non-blocking so it can never delay or break a login response.

## Alert conditions (all three must be true)
1. `isKnownDevice(userId, deviceHash)` returns `false` (new device)
2. `hasAnyTrustedDevice(userId)` returns `true` (not the very first-ever login)
3. `prefs.loginAlertsEnabled` is `true` (user has not opted out)

## Device hash
`SHA-256(userAgent).hex.slice(0, 32)` — pure Node.js crypto, no external dependency.

## UA parsing
`parseUserAgent(ua)` in `lib/deviceRecognition.ts` uses regex only (no npm package). Order matters: Edge/OPR must be checked before Chrome since their UAs contain "Chrome/".

## Tables
- `trusted_devices` — unique on `(user_id, device_hash)`; upserted on every login to update `lastSeenAt`
- `user_security_prefs` — unique on `user_id`; default `login_alerts_enabled = true`

**Why:** Keeping recognition async means a DB slowdown/error in the recognition path can never produce a 5xx for the customer during login.

**How to apply:** Any future enrichment of login events (geo-IP, risk score) should follow the same void IIFE pattern at the end of the success block.
