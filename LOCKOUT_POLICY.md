# Login Protection & Account Lockout Policy

## Overview

LUXE implements a multi-layer login protection system that tracks failed authentication attempts per email address **and** per IP address. Protection applies progressively — the more failures, the longer the lockout.

This document covers:
1. Lockout thresholds and durations
2. How the system detects and stops attacks
3. What users see during lockout
4. Admin tools for managing locked accounts
5. Operational guidance for responding to incidents

---

## 1. Lockout Thresholds

| Failed Attempts | Lockout Duration | Reset Clock |
|----------------|-----------------|-------------|
| 5 – 9 | 5 minutes | From most recent failure |
| 10 – 19 | 30 minutes | From most recent failure |
| 20 + | 24 hours | From most recent failure |

### How the window works

Failures are counted within a **24-hour rolling window**. Older failures are ignored. A successful login **resets the failure counter** — only failures after the most recent successful login count toward lockout.

### Example scenarios

| Timeline | Result |
|----------|--------|
| 4 failures, 10 min ago | No lockout |
| 5 failures, 2 min ago | Locked for ~3 more minutes (5 min from last failure) |
| 10 failures, 15 min ago | Locked for ~15 more minutes (30 min from last failure) |
| 20 failures, 2 hours ago | Locked for ~22 more hours (24h from last failure) |
| 10 failures, then 1 success, then 4 failures | No lockout (counter reset by success) |
| 10 failures → 31 min ago | Lockout window expired, not locked |

---

## 2. Dual-Dimension Tracking

The system tracks failures on **two independent dimensions**:

### Email-based lockout
Protects a specific account from being targeted regardless of which IP the attacker uses. 5 failures on `user@example.com` from 5 different IPs still triggers lockout.

### IP-based lockout
Protects the platform from a single source targeting many accounts. An IP that fails 5+ times across any combination of email addresses is locked out.

**Both are checked on every login attempt.** If either dimension is locked, the attempt is rejected.

---

## 3. Attack Prevention

### Credential stuffing
An attacker tries a large list of email/password pairs. IP-based lockout triggers after 5 failures from the same IP, regardless of which email is targeted. With rate limiting already in place (20 auth requests per 15 minutes per IP), credential stuffing is doubly blocked.

### Password brute-force (single account)
An attacker tries many passwords against one account. Email-based lockout triggers after 5 failures. Even if the attacker rotates IPs, the email dimension catches it.

### Distributed brute-force (botnet)
Multiple IPs, multiple emails. Each IP is tracked independently. The Suspicious Activity dashboard shows IPs that have failed against 3+ distinct emails in the last hour — an admin can identify and block these IPs at the network/firewall level.

### Username enumeration
The API returns identical responses for "email not found" and "wrong password" scenarios. Both return HTTP 401 with `{ "error": "Invalid credentials" }`. Lockout responses also do not reveal whether the email exists. The lockout response is generic: "Too many failed login attempts. Please try again later."

---

## 4. User Experience During Lockout

When an account or IP is locked, the API returns:

```
HTTP 429 Too Many Requests
Retry-After: <seconds until unlock>

{
  "error": "Too many failed login attempts. Please try again later."
}
```

The `Retry-After` header enables clients to show a countdown or disable the login button. The error message is intentionally vague — it does not reveal:
- Whether the email address exists
- The specific failure count
- The exact reason for lockout (email vs IP)

### Frontend behaviour (recommended)

Display: *"Too many failed login attempts. Please try again in X minutes."*

You can compute the countdown from the `Retry-After` response header.

---

## 5. Successful Login Recovery

When a user successfully logs in (correct email + password):

- A success marker is recorded in the `login_attempts` table.
- All subsequent failure counting starts from this timestamp.
- Previous failures are no longer counted toward the lockout threshold.
- The user receives their JWT and refresh token normally.

This means that if a user is locked out, they **cannot unlock themselves** through the login form — they must wait for the lockout to expire or contact an admin.

---

## 6. Admin Tools

### Dashboard: Security Tab

Access via Admin Panel → Security tab.

**Locked Accounts** — Shows all email addresses currently under lockout:
- Email
- Failure count
- Unlock time
- Last attacking IP

**Login History** — Searchable, paginated log of all login attempts:
- Filter by email, IP, success/failure, date range
- Useful for investigating specific incidents

**Suspicious Activity** — Real-time view of:
- IPs with 10+ failures in the last hour
- IPs targeting 3+ distinct email addresses in the last hour
- Email addresses targeted by 3+ distinct IPs in the last hour

### API Endpoints (admin role required)

```
GET /api/admin/security/locked-accounts
GET /api/admin/security/login-history?email=&ip=&success=false&from=&to=&page=1
GET /api/admin/security/suspicious-activity
POST /api/admin/security/unlock  { "email": "user@example.com" }
```

### Manual unlock

To immediately unlock a locked account:

1. Go to Admin Panel → Security → Locked Accounts
2. Click "Unlock" next to the email address

Or via API:
```bash
curl -X POST /api/admin/security/unlock \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{"email": "locked@example.com"}'
```

This inserts a synthetic success marker that resets the failure counter immediately.

---

## 7. Data Retention

Login attempt records accumulate over time. Apply this retention policy monthly:

```sql
-- Delete login attempt records older than 90 days
DELETE FROM login_attempts WHERE attempted_at < NOW() - INTERVAL '90 days';
```

For compliance or audit purposes, export before deleting:

```bash
psql $DATABASE_URL -c "\COPY (SELECT * FROM login_attempts WHERE attempted_at < NOW() - INTERVAL '90 days') TO 'login_attempts_archive_$(date +%Y%m).csv' CSV HEADER"
```

---

## 8. Responding to an Active Attack

### Scenario: Single IP attacking many accounts

1. Go to Admin Panel → Security → Suspicious Activity
2. Identify the attacking IP in the "Suspicious IPs" table
3. Block the IP at your firewall or reverse proxy (Nginx, Cloudflare, etc.)
4. Review the "Login History" filtered by that IP to assess scope

### Scenario: Distributed attack (many IPs, one account)

1. Go to Admin Panel → Security → Suspicious Activity
2. Check "Targeted Emails" — the victim's email will appear if 3+ IPs are involved
3. Optionally manually lock the account until you can contact the user:
   - The account is already lockout-protected per IP/email thresholds
4. Contact the customer to advise a password change
5. After they reset their password, all refresh tokens are revoked automatically

### Scenario: Legitimate user locked out

1. Admin Panel → Security → Locked Accounts → Unlock
2. Tell the user to log in immediately — their counter is reset
3. If they are still being attacked, advise them to use a password manager and update to a stronger password

---

## 9. Limits and Known Gaps

| Gap | Risk Level | Mitigation |
|-----|-----------|------------|
| No CAPTCHA on login | Low | Rate limiting + lockout cover most bot scenarios |
| IP lockout only per-IP (not ASN/range) | Medium | Firewall blocking is the next layer for botnets |
| Lockout data is in-process (DB only) | Low | DB is the source of truth; no in-memory state to lose on restart |
| Very distributed attacks (>20 IPs, <5 fails each) | Medium | Relies on Suspicious Activity dashboard + manual firewall rules |
| No SMS/email notification to user on lockout | Low | Consider adding as a future enhancement |

---

## 10. Configuration Reference

All thresholds are defined in `artifacts/api-server/src/lib/loginProtection.ts` as the `THRESHOLDS` constant. To adjust thresholds, update that file and redeploy.

```ts
const THRESHOLDS = [
  { failures: 20, lockoutMs: 24 * 60 * 60 * 1000 },  // 24 hours
  { failures: 10, lockoutMs: 30 * 60 * 1000 },         // 30 minutes
  { failures: 5,  lockoutMs: 5 * 60 * 1000 },          // 5 minutes
];
```

The look-back window (how far back to count failures) is set by `WINDOW_MS = 24 * 60 * 60 * 1000` (24 hours).
