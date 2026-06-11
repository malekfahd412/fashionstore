# Account Security Center

## Overview

The Account Security Center gives every LUXE customer full visibility into their account security — active sessions, trusted devices, login history, and notification preferences — all from their Account dashboard.

---

## 1. Architecture & Security Flow

```
  Customer Logs In
        │
        ▼
  ┌─────────────────────────────────────────────┐
  │ 1. Lockout check (5/10/20 failures → block) │
  └─────────────────────────────────────────────┘
        │ not locked
        ▼
  ┌─────────────────────────────────────────────┐
  │ 2. Bcrypt password verification             │
  └─────────────────────────────────────────────┘
        │ valid
        ▼
  ┌─────────────────────────────────────────────┐
  │ 3. Record success in login_attempts          │
  └─────────────────────────────────────────────┘
        │
        ▼
  ┌─────────────────────────────────────────────┐
  │ 4. Compute device fingerprint (SHA-256 UA)  │
  └─────────────────────────────────────────────┘
        │
        ├─── Known device ──────────────────────►  Update lastSeenAt, no alert
        │
        └─── New device ──────────────────────────►
                │
                ▼
         Has existing trusted devices?
                │
          NO ───┴──► Trust device quietly (first login)
                │
          YES ──┴──► Trust device
                     │
                     ▼
               Login alerts enabled?
                     │
               YES ──┴──► Send "New login from new device" email
                           with "This wasn't me" link
```

---

## 2. Device Recognition

### How Devices Are Fingerprinted

Each device is identified by a **SHA-256 hash of the User-Agent string**, truncated to 32 hex characters.

```
deviceHash = SHA-256(User-Agent).hex[:32]
```

**Same device** = same browser + version + OS + rendering engine. Updating a browser creates a new hash (new device).

**Supported UA parsing:**

| Browser | Detection |
|---------|-----------|
| Chrome | `Chrome/` in UA (not OPR or Edge) |
| Edge | `Edg/` in UA |
| Firefox | `Firefox/` in UA |
| Safari | `Safari/` + `Version/` (without Chrome) |
| Opera | `OPR/` in UA |
| Samsung Browser | `SamsungBrowser/` in UA |

| OS | Detection |
|----|-----------|
| Windows 10/11 | `Windows NT 10.0` |
| macOS | `Mac OS X <version>` |
| iOS (iPhone) | `iPhone` in UA |
| iOS (iPad) | `iPad` in UA |
| Android | `Android <version>` in UA |
| Linux | `Linux` in UA |
| Chrome OS | `CrOS` in UA |

### When Alerts Fire

| Scenario | Alert? |
|----------|--------|
| First-ever login | ❌ No (nothing to compare to) |
| Known device, same IP | ❌ No |
| Known device, different IP | ❌ No |
| New device, no prior devices | ❌ No |
| New device, prior devices exist, alerts ON | ✅ Yes |
| New device, prior devices exist, alerts OFF | ❌ No |

### Trusted Device Storage

Table: `trusted_devices`

| Column | Description |
|--------|-------------|
| `user_id` | Linked user |
| `device_hash` | SHA-256 of UA (first 32 chars) |
| `device_name` | Human-readable (e.g. "Chrome on macOS 14.2") |
| `browser` | Parsed browser name |
| `os` | Parsed OS name |
| `ip` | Most recent IP for this device |
| `last_seen_at` | Updated on every login from this device |

Unique constraint: `(user_id, device_hash)` — upserted on each login.

---

## 3. New Login Email

### Email Content

Subject: `New sign-in to your LUXE account`

The email includes:
- Date and time of login
- Browser and operating system
- IP address
- A **"This wasn't me"** button linking to `/dashboard/customer?tab=security&alert=1`

### "This wasn't me" Flow

When a customer clicks "This wasn't me":
1. They land on their Security Center page with an orange alert banner.
2. The banner prompts them to:
   - Immediately **revoke all sessions** (one click)
   - **Change their password** (link to profile)
3. After revoking sessions, all other logged-in devices are instantly invalidated.
4. They are **not** automatically logged out of their current session (to preserve the secure session they are using right now).

---

## 4. Customer Security Center

### Location
**My Account → Security** tab at `/dashboard/customer`

### Features

#### Active Sessions
- Lists all non-expired, non-revoked refresh tokens
- Shows: device, IP, last active time, created time
- Actions:
  - **Revoke** (single session) — `DELETE /api/account/security/sessions/:id`
  - **Revoke All Other Sessions** — `DELETE /api/account/security/sessions`

#### Trusted Devices
- Lists all registered devices for the account
- Shows: device name, OS, browser, IP, first seen, last seen
- Actions:
  - **Remove Device** — `DELETE /api/account/security/devices/:id`
  - Removing a device does NOT revoke sessions but will trigger a new-device alert next time that device logs in

#### Login History
- Paginated log of all login attempts (success and failure) associated with this account
- Shows: date/time, IP, device, outcome (OK / FAILED)
- Covers both authenticated attempts (`userId` match) and pre-auth failures (`email` match)
- Endpoint: `GET /api/account/security/login-history`

#### Security Preferences
- **Login Alerts Toggle** — enable/disable new-device login notifications
- Stored in `user_security_prefs` table, defaulting to `true`
- Endpoint: `PATCH /api/account/security/prefs`

### API Endpoints (authenticated customer)

```
GET    /api/account/security/prefs
PATCH  /api/account/security/prefs          { loginAlertsEnabled: boolean }
GET    /api/account/security/devices
DELETE /api/account/security/devices/:id
GET    /api/account/security/login-history  ?page=1&limit=20
GET    /api/account/security/sessions
DELETE /api/account/security/sessions/:id
DELETE /api/account/security/sessions       (revoke all)
```

---

## 5. Admin Security Monitoring

### Dashboard Security Tab Widgets

Located in Admin Panel → Security → Overview sub-tab.

| Widget | Data Source |
|--------|-------------|
| Failed Logins (24h) | `login_attempts` count where `success=false`, last 24h |
| Successful Logins (24h) | `login_attempts` count where `success=true`, last 24h |
| Currently Locked Accounts | Email-dimension lockout check |
| Suspicious IPs | IPs with 10+ failures in last 1h |
| 7-Day Trend Chart | Daily counts of failures and successes |

### Admin API

```
GET /api/admin/security/overview            → aggregate metrics
GET /api/admin/security/locked-accounts     → locked email list
GET /api/admin/security/login-history       → all users, filterable
GET /api/admin/security/suspicious-activity → flagged IPs and emails
POST /api/admin/security/unlock             { email?, ip? }
```

---

## 6. Data Retention

### Trusted Devices
No automatic expiry. Customers can remove devices manually. Admin can advise customers to clear devices after a security incident.

### User Security Prefs
Persist indefinitely; updated via user action only.

### Recommended cleanup (quarterly)
```sql
-- Remove trusted devices not seen in 1 year
DELETE FROM trusted_devices WHERE last_seen_at < NOW() - INTERVAL '1 year';
```

---

## 7. Security Considerations

| Concern | Mitigation |
|---------|------------|
| Device fingerprint collision | SHA-256 UA hash — collision probability negligible |
| Alert fatigue | Alerts only for new devices when prior devices exist |
| "This wasn't me" race condition | Revoke-all invalidates all sessions immediately; attacker is logged out |
| Notification email interception | Email alone cannot reset password; attacker still needs current password |
| Trusted device removal doesn't revoke session | By design — removal flags device for re-alert next login, not forced logout |
| UA spoofing | Sophisticated attacker can spoof UA to appear as a trusted device; mitigated by lockout + rate limiting |

### Incident Response Quick Reference

**Customer reports unauthorized login:**
1. Admin Panel → Security → Login History → filter by email
2. Identify attacker IP
3. Admin Panel → Security → Suspicious Activity → check if IP appears
4. Advise customer:
   - Change password immediately
   - Security tab → Revoke All Sessions
   - Security tab → Remove any unrecognized trusted devices
   - Enable login alerts if not already on
5. If attacker is still active: manually unlock from Security tab; customer changes password to re-lock attacker out

**Brute-force campaign detected:**
1. Admin Panel → Security → Suspicious Activity
2. Identify high-failure IPs
3. Block at firewall/CDN level
4. Review Locked Accounts to see targeted emails
5. Proactively notify those customers if their email appears in suspicious activity

---

## 8. Testing

| Test Suite | File |
|------------|------|
| Device recognition (UA parsing, hash, detection logic) | `device-recognition.test.ts` |
| Trusted device management (CRUD, ownership) | `device-recognition.test.ts` |
| Login notification delivery conditions | `device-recognition.test.ts` |
| Session revocation (single, all, ownership) | `device-recognition.test.ts` |
| Progressive lockout (previous task) | `login-protection.test.ts` |
| Auth security (JWT, RBAC) | `security.test.ts` |
| Permission checks | `permissions.test.ts` |
