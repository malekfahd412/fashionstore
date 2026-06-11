# Account Security Center — Architecture & Workflow Documentation

> **Last updated:** June 11, 2026

---

## Table of Contents

1. [Overview](#overview)
2. [Security Components Map](#security-components-map)
3. [Login Security Workflow](#login-security-workflow)
4. [Device Recognition Flow](#device-recognition-flow)
5. [New Login Notification Flow](#new-login-notification-flow)
6. [Session Management](#session-management)
7. [Admin Security Monitoring](#admin-security-monitoring)
8. [Compromised Account Detection](#compromised-account-detection)
9. [Graduated Lockout System](#graduated-lockout-system)
10. [Database Schema](#database-schema)
11. [API Reference](#api-reference)
12. [Test Coverage](#test-coverage)
13. [Security Controls Summary](#security-controls-summary)

---

## Overview

The Account Security Center provides end-to-end protection against unauthorized access across three layers:

- **Authentication layer** — rate limiting, lockouts, anti-enumeration
- **Session layer** — refresh token rotation, multi-session management, device fingerprinting
- **Monitoring layer** — admin dashboards, anomaly detection, compromised account indicators

---

## Security Components Map

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        ACCOUNT SECURITY CENTER                          │
├──────────────────────────┬──────────────────────────────────────────────┤
│   CUSTOMER FACING        │   ADMIN FACING                               │
│                          │                                              │
│  SecurityCenterTab.tsx   │  SecurityPanel.tsx                           │
│  ├── Active Sessions     │  ├── Overview (stats + 7-day trend)          │
│  ├── Trusted Devices     │  ├── Locked Accounts                         │
│  ├── Login History       │  ├── Login History (searchable)              │
│  └── Preferences         │  ├── Suspicious Activity                     │
│                          │  └── Compromised Accounts ← NEW              │
├──────────────────────────┴──────────────────────────────────────────────┤
│                           API SERVER                                     │
│  routes/security.ts          routes/admin-security.ts                   │
│  ├── GET  /account/security/sessions         GET /admin/security/overview│
│  ├── DELETE /account/security/sessions/:id   GET /admin/security/locked  │
│  ├── DELETE /account/security/sessions       GET /admin/security/history │
│  ├── GET  /account/security/devices          GET /admin/security/suspicious│
│  ├── DELETE /account/security/devices/:id    GET /admin/security/compromised│
│  ├── GET  /account/security/login-history    POST /admin/security/unlock │
│  ├── GET  /account/security/prefs                                        │
│  └── PATCH /account/security/prefs                                       │
├─────────────────────────────────────────────────────────────────────────┤
│                           LIB LAYER                                      │
│  deviceRecognition.ts    loginProtection.ts    email.ts    ipGeo.ts      │
│  ├── parseUserAgent()    ├── checkLockout()   sendNewLoginEmail()         │
│  ├── computeDeviceHash() ├── recordAttempt()  sendPasswordResetEmail()    │
│  ├── isKnownDevice()     ├── getLockedAccounts()                          │
│  ├── trustDevice()       ├── getSuspiciousActivity()                     │
│  ├── getSecurityPrefs()  └── getCompromisedAccounts()                    │
│  └── upsertSecurityPrefs()                                               │
├─────────────────────────────────────────────────────────────────────────┤
│                           DATABASE (PostgreSQL)                          │
│  login_attempts  |  refresh_tokens  |  trusted_devices  | user_security_prefs│
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Login Security Workflow

```
Customer submits login form
         │
         ▼
┌─────────────────────┐
│  Rate limit check   │  ← express-rate-limit (global + auth endpoint stricter)
└────────┬────────────┘
         │
         ▼
┌─────────────────────┐
│  Lockout check      │  ← checkLockout(email, ip)
│  (email + IP dims)  │     Graduated: 5min → 30min → 24h
└────────┬────────────┘
         │ not locked
         ▼
┌─────────────────────┐
│  User lookup        │  ← db.select from users WHERE email = ?
│  + bcrypt compare   │    Dummy hash if user not found (anti-enumeration)
└────────┬────────────┘
         │
    ┌────┴────┐
    │ FAIL    │ SUCCESS
    ▼         ▼
record      record
attempt     attempt
(fail)      (success)
    │         │
    ▼         ▼
return      ┌────────────────────────────────────────────────────┐
401         │  NON-BLOCKING DEVICE RECOGNITION FLOW              │
            │  (void IIFE — never delays response)               │
            │                                                    │
            │  1. computeDeviceHash(userAgent)                   │
            │  2. parseUserAgent(ua) → browser, os, deviceName   │
            │  3. isKnownDevice(userId, hash)                    │
            │  4. hasAnyTrustedDevice(userId)                    │
            │  5. trustDevice(upsert)                            │
            │  6. if (newDevice && hasExisting && alertsEnabled) │
            │     → getIpLocation(ip)   ← ip-api.com, 2s timeout│
            │     → sendNewLoginEmail() ← Resend, graceful       │
            └────────────────────────────────────────────────────┘
                      │
                      ▼ (parallel, does not block)
            ┌─────────────────────┐
            │ Issue JWT (7d)      │  ← signToken(id, email, role)
            │ Issue refresh token │  ← SHA-256 hash stored in DB
            └─────────────────────┘
                      │
                      ▼
            Return { token, refreshToken, user }
```

---

## Device Recognition Flow

```
Incoming Request
       │
       ▼
Extract User-Agent string
       │
       ▼
computeDeviceHash(ua)
  SHA-256(ua) → first 32 hex chars
       │
       ▼
parseUserAgent(ua)
  ├── Browser: Chrome / Firefox / Safari / Edge / Opera / Samsung / IE
  └── OS: Windows / macOS / iOS / Android / Linux / ChromeOS
       │
       ▼
isKnownDevice(userId, hash)
  ← query trusted_devices WHERE userId=? AND deviceHash=?
       │
  ┌────┴────┐
  │ KNOWN   │ UNKNOWN
  │         │
  ▼         ▼
upsert    hasAnyTrustedDevice(userId)?
(update     │
lastSeen)  ┌┴──────────┐
           │ YES       │ NO (first ever login)
           ▼           ▼
       Check prefs  Trust device
       alertsEnabled? (no alert on first device)
           │
      ┌────┴────┐
      │ ON      │ OFF
      ▼         ▼
  Fetch IP   No alert
  location
      │
      ▼
  sendNewLoginEmail(
    device, browser, os,
    ip, location, time
  )
  Includes "This wasn't me" link:
  /dashboard/customer?tab=security&alert=1
```

---

## New Login Notification Flow

```
Login email sent to user
         │
         ▼
User opens email
  Contents:
  ┌─────────────────────────────────────────┐
  │  NEW SIGN-IN DETECTED                   │
  │  ─────────────────────────────────────  │
  │  Time: Wed, 11 Jun 2026 12:00:00 GMT    │
  │  Approximate Location: London, England, │
  │                         United Kingdom  │
  │  Device: Chrome on Windows 10/11        │
  │  Browser: Chrome                        │
  │  Operating System: Windows 10/11        │
  │  IP Address: 93.184.216.34              │
  │                                         │
  │  [THIS WASN'T ME — SECURE ACCOUNT]      │
  └─────────────────────────────────────────┘
         │
    ┌────┴──────────────────────────────┐
    │ "This was me"     │ "Wasn't me"   │
    │ No action needed  │ Click link    │
    └───────────────────┴───────┬───────┘
                                │
                                ▼
              /dashboard/customer?tab=security&alert=1
                                │
                                ▼
              SecurityCenterTab renders with showAlert=true
                                │
                                ▼
              Orange alert banner displayed:
              "Suspicious sign-in detected"
                                │
                      ┌─────────┴──────────┐
                      │                    │
                      ▼                    ▼
               [Revoke All Sessions]  [Dismiss]
                      │
                      ▼
              All refresh tokens revoked
              User must re-authenticate
              → advise password change
```

---

## Session Management

```
Refresh Token Lifecycle:
─────────────────────────

  Login                   Token Use              Logout / Revoke
    │                         │                       │
    ▼                         ▼                       ▼
Generate raw token       Validate hash          Mark revokedAt
SHA-256(raw) → stored    Issue new access       (soft delete)
in refresh_tokens        token (rotation)
                              │
                         ┌────┴────┐
                         │        │
                      SUCCESS  INVALID / EXPIRED
                         │        │
                    New refresh  401 — re-login
                    token issued  required
                    (rotation)

Active Sessions Table columns:
  id | userId | tokenHash | userAgent | ip | createdAt | lastUsedAt | expiresAt | revokedAt

Customer can:
  GET    /account/security/sessions        → list active sessions
  DELETE /account/security/sessions/:id   → revoke one session
  DELETE /account/security/sessions       → revoke all sessions
```

---

## Admin Security Monitoring

```
Admin Dashboard → Security Tab → SecurityPanel.tsx

┌──────────────────────────────────────────────────────────────────┐
│  OVERVIEW TAB                                                    │
│  ┌──────────────┐ ┌──────────────┐ ┌────────────┐ ┌──────────┐ │
│  │ Failed (24h) │ │ Success (24h)│ │ Locked     │ │ Suspicious│ │
│  │ 142          │ │ 1,847        │ │ Accounts 3 │ │ IPs     2 │ │
│  └──────────────┘ └──────────────┘ └────────────┘ └──────────┘ │
│                                                                  │
│  7-Day Login Trend (bar chart: red=failures, green=successes)   │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│  LOCKED ACCOUNTS TAB                                             │
│  Email | Failures | Unlocks In | Latest IP | [Unlock Button]    │
│  ────────────────────────────────────────────────────────────── │
│  Thresholds: 5+ → 5min | 10+ → 30min | 20+ → 24h               │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│  SUSPICIOUS ACTIVITY TAB                                         │
│  IPs with 10+ failures OR targeting 3+ accounts in last 1 hour  │
│  Also shows: emails targeted by 3+ distinct IPs                 │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│  COMPROMISED ACCOUNTS TAB ← NEW                                  │
│  Successful logins from IPs that attacked 2+ other accounts     │
│  Risk: HIGH (10+ failures or 5+ targets) | MEDIUM (2-4 targets) │
│  Columns: Risk | Email | IP | Failures | Distinct Targets | Time │
│  Includes recommended remediation actions                        │
└──────────────────────────────────────────────────────────────────┘
```

---

## Compromised Account Detection

### Algorithm

A "compromised account indicator" is raised when:

```
successful_login.ip ∈ IPs_with_failures_on_other_accounts(2+)
  AND occurred within last 24 hours
  AND userId IS NOT NULL (authenticated, not admin-unlock)
```

This detects **credential-stuffing attacks** — where an attacker uses a list of
email/password pairs from a known data breach. The same IP that fails on many
accounts will occasionally succeed on one where the password matches.

### Risk Classification

| Condition | Risk Level |
|---|---|
| Source IP had 10+ failures OR targeted 5+ distinct emails | HIGH |
| Source IP had 2–9 failures on 2–4 distinct emails | MEDIUM |

### SQL Logic

```sql
SELECT
  ls.email, ls.user_id, ls.ip, ls.attempted_at AS login_at,
  COUNT(lf.id)              AS ip_failures,
  COUNT(DISTINCT lf.email)  AS distinct_emails
FROM login_attempts ls
JOIN login_attempts lf
  ON  lf.ip        = ls.ip
  AND lf.success   = false
  AND lf.email    != ls.email
  AND lf.attempted_at >= NOW() - INTERVAL '24 hours'
WHERE ls.success      = true
  AND ls.attempted_at >= NOW() - INTERVAL '24 hours'
  AND ls.user_id IS NOT NULL
  AND ls.email   != 'admin-unlock'
GROUP BY ls.id, ls.email, ls.user_id, ls.ip, ls.attempted_at
HAVING COUNT(DISTINCT lf.email) >= 2
ORDER BY ls.attempted_at DESC
LIMIT 100;
```

---

## Graduated Lockout System

```
Login failures tracked per: EMAIL dimension + IP dimension (whichever triggers first)

Failure count  │  Lockout duration  │  Reset condition
───────────────┼────────────────────┼────────────────────────
5 – 9          │  5 minutes         │  Successful login OR
10 – 19        │  30 minutes        │  admin unlock OR
20+            │  24 hours          │  lockout window passes

Window: 24-hour rolling lookback
Reset marker: a successful login inserts a "counter reset" entry

Anti-enumeration: non-existent users still run bcrypt.hash("dummy")
                  to equalize response times
```

---

## Database Schema

### `login_attempts`

| Column | Type | Notes |
|---|---|---|
| id | serial PK | |
| email | text | indexed |
| ip | text | indexed |
| userId | integer FK | nullable (pre-auth failures) |
| userAgent | text | nullable |
| success | boolean | indexed with email/ip |
| attemptedAt | timestamp | indexed |

### `refresh_tokens` (sessions)

| Column | Type | Notes |
|---|---|---|
| id | serial PK | |
| userId | integer FK | |
| tokenHash | text | SHA-256 of raw token |
| userAgent | text | |
| ip | text | |
| createdAt | timestamp | |
| lastUsedAt | timestamp | updated on token rotation |
| expiresAt | timestamp | 30 days |
| revokedAt | timestamp | nullable; set on logout |

### `trusted_devices`

| Column | Type | Notes |
|---|---|---|
| id | serial PK | |
| userId | integer FK | |
| deviceHash | text | SHA-256(ua)[0:32] |
| deviceName | text | "Chrome on Windows 10/11" |
| browser | text | |
| os | text | |
| ip | text | last seen IP |
| createdAt | timestamp | |
| lastSeenAt | timestamp | updated on each login |

### `user_security_prefs`

| Column | Type | Notes |
|---|---|---|
| userId | integer FK PK | |
| loginAlertsEnabled | boolean | default: true |

---

## API Reference

### Customer Endpoints (requires auth_token)

| Method | Path | Description |
|---|---|---|
| GET | `/api/account/security/sessions` | List active sessions |
| DELETE | `/api/account/security/sessions/:id` | Revoke one session |
| DELETE | `/api/account/security/sessions` | Revoke all sessions |
| GET | `/api/account/security/devices` | List trusted devices |
| DELETE | `/api/account/security/devices/:id` | Remove trusted device |
| GET | `/api/account/security/login-history` | Login history (paginated) |
| GET | `/api/account/security/prefs` | Get security preferences |
| PATCH | `/api/account/security/prefs` | Update security preferences |

### Admin Endpoints (requires admin role)

| Method | Path | Description |
|---|---|---|
| GET | `/api/admin/security/overview` | Stats + 7-day trend |
| GET | `/api/admin/security/locked-accounts` | Currently locked accounts |
| GET | `/api/admin/security/login-history` | Full login history (filterable) |
| GET | `/api/admin/security/suspicious-activity` | Suspicious IPs + targeted emails |
| GET | `/api/admin/security/compromised-accounts` | Compromised account indicators |
| POST | `/api/admin/security/unlock` | Manually unlock email or IP |

---

## Test Coverage

| Test File | Coverage |
|---|---|
| `device-recognition.test.ts` | UA parsing (8 browsers × OSes), hash determinism, new device detection, session revocation, notification conditions, trusted device management |
| `login-protection.test.ts` | Graduated lockouts (5/10/20 failure thresholds), lockout reset on success, admin unlock, IP dimension, email dimension |
| `security.test.ts` | Role sanitisation, JWT integrity, auth middleware, RBAC simulation, payment HMAC validation |
| `compromised-accounts.test.ts` | Compromised detection algorithm, risk classification, edge cases, IP private-range detection |

### Running Tests

```bash
# From project root
pnpm --filter @workspace/api-server test

# Watch mode
pnpm --filter @workspace/api-server test -- --watch

# Coverage
pnpm --filter @workspace/api-server test -- --coverage
```

---

## Security Controls Summary

| Control | Implementation | Status |
|---|---|---|
| Password hashing | bcrypt cost factor 12 | ✅ |
| JWT access tokens | 7-day expiry, HS256 | ✅ |
| Refresh token rotation | SHA-256 stored, revoked on use | ✅ |
| Brute-force protection | Graduated lockouts per email+IP | ✅ |
| Anti-enumeration | Dummy bcrypt on unknown email | ✅ |
| Rate limiting | express-rate-limit (global + auth) | ✅ |
| Device fingerprinting | SHA-256(UA)[0:32] | ✅ |
| New login email alerts | Resend, graceful degradation | ✅ |
| Approximate IP location | ip-api.com, 2s timeout, private-IP skip | ✅ |
| "This wasn't me" link | Deep link to security tab + alert | ✅ |
| Session revocation | Per-session + revoke-all | ✅ |
| Trusted device management | Customer UI + API | ✅ |
| Admin login monitoring | 7-day trends, locked accounts | ✅ |
| Suspicious IP detection | 10+ failures or 3+ emails/hour | ✅ |
| Compromised account detection | Credential-stuffing pattern, risk levels | ✅ |
| Secure headers | Helmet (CSP, HSTS, X-Frame) | ✅ |
| CORS | Strict origin validation | ✅ |
| Audit logging | All admin actions logged | ✅ |
| Email verification | 24h token, verification required | ✅ |
| Password reset | 60-min token, revokes all sessions | ✅ |
```
