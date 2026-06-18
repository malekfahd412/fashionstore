# VELORA — PRODUCTION LAUNCH CHECKLIST

> **Generated:** June 18, 2026
> **Version:** Phase 11 — Launch Preparation

---

## HOW TO USE THIS CHECKLIST

Work through each section in order. Items marked 🔴 are **blocking** — the application will be broken or insecure without them. Items marked 🟡 are **important** — they degrade functionality or quality. Items marked 🟢 are **recommended** — best practice improvements.

---

## 1. INFRASTRUCTURE & ENVIRONMENT

### 1.1 Required Environment Variables

| Variable | Status | Action |
|---|---|---|
| `DATABASE_URL` | 🔴 Required | Provision a production PostgreSQL instance (Supabase, Neon, RDS, etc.) |
| `SESSION_SECRET` | 🔴 Required | Generate with `openssl rand -hex 32`. Never reuse dev secret. |
| `APP_URL` | 🔴 Required | Full public URL, no trailing slash. Example: `https://velora.yourstore.com` |
| `NODE_ENV` | 🔴 Required | Set to `production` to enable production-mode error filtering, HMAC enforcement |

### 1.2 Database

- [ ] Run `echo y | pnpm --filter @workspace/db run push` to apply all schema changes to the production DB
- [ ] Verify all 32 tables exist: run `SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public';`
- [ ] Create first admin via `ADMIN_EMAIL` + `ADMIN_PASSWORD` env vars on first boot (auto-deleted after use)
- [ ] Remove any seeded test data before go-live
- [ ] Verify DB connection pool settings (`max` in `lib/db/src/index.ts`) match your DB plan's connection limit

### 1.3 Server & Deployment

- [ ] Set `NODE_ENV=production` in deployment environment
- [ ] Build succeeds: `pnpm run build` exits 0
- [ ] TypeCheck passes: `pnpm run typecheck` exits 0
- [ ] Server starts and `/healthz` returns `status: "ok"` with `db.status: "ok"`
- [ ] Review `ALLOWED_ORIGINS` env var — set to the exact production frontend URL to tighten CORS
- [ ] Configure process manager (PM2, systemd) for auto-restart on crash
- [ ] Set up load balancer health check against `/api/healthz`

---

## 2. SECURITY

### 2.1 Paymob (CRITICAL)

- [ ] 🔴 Set `PAYMOB_HMAC_SECRET` — **without it, the production webhook rejects all requests**
  - In production, `NODE_ENV=production` + no HMAC secret = 503 on every webhook call
  - Obtain from Paymob dashboard → Developers → Secret Key
- [ ] Set `PAYMOB_API_KEY` — required to initiate card payments
- [ ] Configure `paymob_integration_id_card`, `paymob_iframe_id` in Admin → Settings
- [ ] Test Paymob test-mode end-to-end before switching to live keys

### 2.2 JWT & Sessions

- [ ] `SESSION_SECRET` is at least 32 bytes of random data (not guessable, not shared)
- [ ] Verify JWT tokens expire after 7 days (configurable in `auth.ts`)
- [ ] Verify refresh tokens expire after 30 days
- [ ] Confirm login lockout thresholds are appropriate for your user base (currently: 5 attempts → 15-min lockout)

### 2.3 Rate Limiting

- [ ] General API rate limit: 300 req / 15 min per IP (adjust in `app.ts` for production traffic)
- [ ] Auth endpoints: 20 req / 15 min per IP
- [ ] Checkout endpoint: 10 req / min per user token

### 2.4 HTTPS & Headers

- [ ] All traffic served over HTTPS (enforce at load balancer or Replit deployment)
- [ ] Helmet is already configured — verify CSP in browser console on first load
- [ ] HSTS header is active (set via Helmet with `strictTransportSecurity`)

---

## 3. INTEGRATIONS

### 3.1 Email — Resend *(optional but strongly recommended)*

- [ ] Set `RESEND_API_KEY` — obtain from resend.com
- [ ] Set `RESEND_FROM_EMAIL` — must be a verified sender address in Resend
- [ ] Set `RESEND_FROM_NAME` — display name (default: `Velora Store`)
- [ ] Set `APP_URL` — required for email links (password reset, order confirmation, etc.)
- [ ] Send a test order confirmation email and verify delivery + formatting
- [ ] Set up Resend webhooks for bounce/spam handling (optional)
- [ ] Verify `/healthz` → `integrations.email.configured: true`

### 3.2 WhatsApp Notifications *(optional)*

- [ ] Set `WHATSAPP_ENABLED=true`
- [ ] Set `WHATSAPP_PROVIDER` to `cloud` (Meta) or `twilio`
- [ ] **Meta Cloud API:** Set `WHATSAPP_ACCESS_TOKEN` + `WHATSAPP_PHONE_NUMBER_ID`
- [ ] **Twilio:** Set `TWILIO_ACCOUNT_SID` + `TWILIO_AUTH_TOKEN` + `TWILIO_WHATSAPP_FROM`
- [ ] Test order placed → WhatsApp message delivery
- [ ] Verify `/healthz` → `integrations.whatsapp.configured: true`

### 3.3 Cloudinary — Image Uploads *(required for product images)*

- [ ] Set `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
- [ ] Create upload presets in Cloudinary dashboard if needed
- [ ] Test vendor product image upload end-to-end
- [ ] Verify `/healthz` → `integrations.cloudinary.configured: true`
- [ ] Configure Cloudinary upload limits and moderation if needed

### 3.4 Google OAuth *(optional)*

- [ ] Create Google Cloud OAuth 2.0 credentials
- [ ] Set `GOOGLE_CLIENT_ID` — without it, Google login button does not appear
- [ ] Add production domain to Google OAuth allowed redirect URIs
- [ ] Test full Google sign-in flow in production
- [ ] Verify `/healthz` → `integrations.google.configured: true`

### 3.5 Paymob Integration Setup

- [ ] After setting API key, configure payment methods in Admin → Settings:
  - `paymob_integration_id_card` — Card integration ID from Paymob dashboard
  - `paymob_iframe_id` — Payment iframe ID
  - `paymob_integration_id_meeza` — Meeza integration ID (if applicable)
  - `paymob_integration_id_vodafone` — Vodafone Cash integration ID (if applicable)

---

## 4. CONTENT & DATA

### 4.1 Store Configuration (Admin → Settings)

- [ ] Set `store_name` (used in WhatsApp and email messages)
- [ ] Upload `store_logo`
- [ ] Set `contact_email`, `phone`, `address` (shown in footer and contact page)
- [ ] Set `social_facebook`, `social_instagram`, `social_twitter`, `social_tiktok` (or leave blank to hide)
- [ ] Configure offline payment instructions: `payment_instapay`, `payment_vodafone_cash`, `payment_bank_transfer`

### 4.2 Product Catalog

- [ ] All products have images (Cloudinary configured)
- [ ] All products have Arabic name + description (`name_ar`, `description_ar`)
- [ ] All product variants have correct stock quantities
- [ ] At least one product is marked `featured = true` for the homepage
- [ ] Review categories — verify parent/child relationships are set correctly
- [ ] Verify no `category.parent_category_id` values point to deleted categories (FK not enforced in DB)

### 4.3 Homepage Banners

- [ ] At least one banner is active with a high-quality image (1920px wide recommended)
- [ ] Banner `link_url` values point to valid store URLs
- [ ] Banner titles exist in both English and Arabic

### 4.4 FAQs

- [ ] At least 5-10 FAQs are configured, bilingual
- [ ] Categories are meaningful (Shipping, Returns, Payments, etc.)

### 4.5 Legal Pages

- [ ] Privacy Policy page (`/privacy-policy`) has accurate, production-ready content — not placeholder text
- [ ] Terms & Conditions page (`/terms`) has production-ready content
- [ ] Returns policy page (`/returns`) reflects your actual return policy
- [ ] Shipping policy page (`/shipping-policy`) reflects your actual shipping terms

---

## 5. SEO & PERFORMANCE

### 5.1 SEO

- [ ] Set `PUBLIC_URL` env var — used for sitemap.xml generation
- [ ] Visit `/sitemap.xml` and verify all product/category URLs are included
- [ ] Submit sitemap to Google Search Console
- [ ] All pages have meaningful `<title>` and `<meta description>` (set via `useSEO` hook)
- [ ] **Note:** Google sees client-side meta tags. For better indexing, consider SSR (not currently implemented)
- [ ] Add `robots.txt` if needed to block specific paths

### 5.2 Performance

- [ ] Run Lighthouse on the production homepage — target 75+ Performance score
- [ ] All product images are served as WebP (Cloudinary handles this automatically)
- [ ] Verify Vite build output is minified and split correctly
- [ ] Consider adding CDN in front of static assets

---

## 6. MONITORING & OBSERVABILITY

### 6.1 Error Tracking — Sentry *(optional but strongly recommended)*

- [ ] Create a Sentry project at sentry.io
- [ ] For API server: set `SENTRY_DSN` environment variable
- [ ] For frontend store: set `VITE_SENTRY_DSN` environment variable
- [ ] Trigger a test error and verify it appears in Sentry dashboard
- [ ] Configure Sentry alerting (email/Slack) for new issues

### 6.2 Uptime Monitoring

- [ ] Set up an uptime monitor (UptimeRobot, Betterstack, or Replit Uptime) pointing to `https://yourapp.com/api/healthz`
- [ ] Configure alert notifications (email/Slack) when the endpoint returns non-200
- [ ] The `/healthz` endpoint checks: DB connectivity + latency, memory usage, integration config status
- [ ] Set monitoring interval to 1 minute

### 6.3 Logging

- [ ] Pino logs to stdout — ensure your hosting platform captures and retains logs
- [ ] Set `LOG_LEVEL=warn` in production to reduce log volume
- [ ] For Replit deployment: logs available in the deployment dashboard
- [ ] Consider a log aggregation service (Logtail, Datadog) for large traffic volumes

---

## 7. BUSINESS CONTINUITY

### 7.1 Backups

- [ ] Set up automated daily database backups for your PostgreSQL instance
- [ ] Test restore procedure — know how to restore before you need to
- [ ] Back up `store_settings` table separately (contains Paymob integration IDs, payment instructions)

### 7.2 Admin Access

- [ ] First admin account created via bootstrap or SQL promotion
- [ ] Admin password is strong and unique (not used anywhere else)
- [ ] A second admin account exists as a backup
- [ ] Admin accounts have 2FA enabled on their email provider

### 7.3 Support Operations

- [ ] Test the support ticket flow end-to-end (customer submits → admin replies)
- [ ] Admin can reply to contact messages via Admin → Messages
- [ ] Newsletter unsubscribe works (currently uses email lookup, not token-based)

---

## 8. PRE-LAUNCH TESTING

### 8.1 Critical User Flows (Manual Smoke Test)

Run through each of these in the production environment before go-live:

- [ ] **Registration:** Register a new customer account, verify email link works
- [ ] **Login:** Log in, log out, reset password, log back in
- [ ] **Browse:** Homepage banners load, featured products display, search works, category filter works
- [ ] **Product Detail:** Images display, variant selection works, "Add to Cart" works
- [ ] **Guest Cart:** Add to cart without login, merge into user cart on login
- [ ] **Checkout (COD):** Complete a cash-on-delivery order end-to-end
- [ ] **Order Tracking:** View order status page, verify 7-step timeline
- [ ] **Checkout (Paymob):** Complete a card payment (use Paymob test card)
- [ ] **Coupon:** Apply a valid coupon, verify discount applied; try an expired/invalid coupon
- [ ] **Wishlist:** Add to wishlist, view from customer dashboard
- [ ] **Review:** Review a product after order delivered (verified purchase check)
- [ ] **Admin:** Create product, create banner, manage users, view analytics
- [ ] **Vendor:** Vendor creates product with images, views vendor orders

### 8.2 E2E Automated Tests

The E2E test suite lives in `e2e/`. Run with:

```bash
cd e2e && pnpm install
pnpm exec playwright install chromium
BASE_URL=https://yourapp.com pnpm test
```

Tests cover:
- `registration.spec.ts` — user registration flow
- `login.spec.ts` — login/logout flow
- `cart.spec.ts` — add to cart, remove from cart
- `checkout.spec.ts` — COD checkout flow
- `order-tracking.spec.ts` — order tracking page

### 8.3 Security Verification

- [ ] Confirm `/api/healthz` → `integrations.paymob.hmacConfigured: true`
- [ ] Attempt to POST to `/api/payments/paymob/webhook` without a valid HMAC — expect 401
- [ ] Confirm brute-force lockout: attempt 6 incorrect logins in rapid succession → expect lockout
- [ ] Confirm admin-only routes reject customers: `GET /api/users` with customer JWT → expect 403
- [ ] Verify that Paymob webhook on production rejects requests without HMAC (NODE_ENV=production enforces this)

---

## 9. KNOWN LIMITATIONS (Post-Launch Backlog)

These are known gaps that do not block launch but should be addressed in the next sprint:

| Priority | Issue | Impact |
|---|---|---|
| High | `login_attempts` table grows unbounded — needs a nightly cleanup job | Slow lockout queries after high-traffic attack |
| High | No background job system — abandoned cart, newsletters require manual admin trigger | Reduced conversion recovery |
| High | `categories.parent_category_id` has no FK constraint — orphaned categories possible | Admin data integrity |
| Medium | Checkout page has ~22 hardcoded English strings | Breaks Arabic UX on most critical page |
| Medium | `newsletter_subscribers.unsubscribe_token` generated but never used in email | GDPR one-click unsubscribe not available |
| Medium | No per-variant images — color selection cannot show different photos | Product UX limitation |
| Medium | No server-side rendering — Google sees empty shell for SEO | Organic search impact |
| Medium | Checkout does not pre-fill user's default saved address | Checkout friction |
| Low | `recently_viewed` data collected but not shown to customers | Missed personalization |
| Low | `audit_logs` coverage incomplete (only user delete + force-reset are logged) | Compliance gap |
| Low | No order cancellation flow for customers | Customer experience |
| Low | No proof-of-payment image upload for manual payment submissions | Admin verification friction |

---

## 10. LAUNCH DAY SEQUENCE

```
1. Set all environment variables (see Section 1)
2. Run DB schema push: echo y | pnpm --filter @workspace/db run push
3. Build: pnpm run build (must exit 0)
4. Start server: verify /api/healthz returns {"status":"ok"}
5. Create first admin account (via ADMIN_EMAIL + ADMIN_PASSWORD)
6. Configure store settings (Section 4.1)
7. Upload banners, set up categories, add initial products
8. Run manual smoke test (Section 8.1) — spend 30 minutes on this
9. Configure Sentry + uptime monitoring
10. Update DNS / domain to point to production
11. Do final /healthz check — verify all integrations show expected status
12. LAUNCH 🚀
```

---

*This checklist was generated as part of VELORA Phase 11 — Launch Preparation.*
