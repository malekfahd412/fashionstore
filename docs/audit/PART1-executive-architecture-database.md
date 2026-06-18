# VELORA — PROJECT INTELLIGENCE AUDIT
## PART 1: Executive Summary · Architecture Overview · Database Audit

> **Audit Date:** June 18, 2026
> **Codebase commit:** eea75b48
> **Auditor:** Replit Agent — exhaustive static analysis across all packages

---

# SECTION 1 — EXECUTIVE SUMMARY

## What the Project Is

Velora is a production-grade, bilingual (Arabic/English) multi-vendor fashion e-commerce platform built as a TypeScript pnpm monorepo. It targets the Egyptian/MENA market and supports three user roles — **Customer**, **Vendor**, and **Admin** — each with fully separate, feature-rich dashboards. The backend exposes a REST API secured with JWT + refresh tokens. The frontend is a React SPA with Radix UI components and an editorial luxury design system.

The feature set rivals commercial SaaS platforms: Paymob payment gateway, WhatsApp notifications, Cloudinary image hosting, Resend transactional email, abandoned cart recovery, back-in-stock alerts, a multi-step support ticket system, PDF invoice generation, device fingerprinting, and a full admin security center.

## Current Maturity Level

**Advanced Beta / Near-Production.**
The core platform is architecturally complete and fully wired end-to-end. All primary user flows (browse → cart → checkout → order tracking) work. The remaining gaps are:
- Configuration-level: optional services (Paymob, Cloudinary, Resend, WhatsApp) require API keys not yet set.
- Polish-level: ~22 hardcoded English strings in the Checkout page break the Arabic experience.
- Operational-level: no background job system (abandoned cart, back-in-stock notifications are manual admin triggers only), no external error monitoring.

## Production Readiness Score: 72 / 100

| Dimension                     | Score  | Rationale                                                                               |
|-------------------------------|--------|-----------------------------------------------------------------------------------------|
| Security                      | 88/100 | JWT rotation, device fingerprinting, brute-force lockout, audit logs. Gaps noted below.|
| Core e-commerce features      | 90/100 | All primary flows complete. Missing: order cancel, refunds, variant pricing.            |
| Frontend polish               | 82/100 | Luxury design system. Checkout i18n incomplete. No ratings on listing cards.            |
| Backend robustness            | 85/100 | Express 5 + Drizzle. ~10 routes missing Zod validation. No clustering.                 |
| Internationalization          | 78/100 | 558 keys fully synced EN/AR. Checkout hardcodes ~22 English strings.                   |
| Test coverage                 | 15/100 | One unit test file (login-attempts sort order). Zero integration or E2E tests.          |
| Observability / Monitoring    | 40/100 | Pino stdout only. No Sentry, no uptime monitoring, no APM.                             |
| Third-party integrations      | 55/100 | All integrations coded; none configured in this environment.                            |
| SEO                           | 30/100 | Client-side meta tags only. No SSR, no JSON-LD, no OpenGraph images.                   |
| Accessibility                 | 45/100 | Radix UI primitives provide keyboard nav. No ARIA audit performed.                      |

## Biggest Strengths

1. **Exceptional security posture.** Dual-token JWT with rotation, per-IP and per-email brute-force lockout with progressive thresholds, SHA-256 device fingerprinting, immutable audit log, full Admin Security Center. This depth is rare at this project scale.

2. **OpenAPI-first codegen pipeline.** The OpenAPI spec in `lib/api-spec/openapi.yaml` is the single source of truth. Orval generates TypeScript types, Zod schemas, and TanStack Query hooks from it. Client–server drift is structurally impossible.

3. **Feature completeness.** Abandoned cart recovery, stock notification subscriptions, recently viewed tracking, saved coupons, manual payment approval workflow, PDF invoice generation, WhatsApp notifications, multi-step support ticket threads with internal notes — all are implemented end-to-end. Most platforms charge for these as enterprise add-ons.

4. **Complete bilingual RTL support.** 558 translation keys synchronized between English and Arabic. RTL layout flips automatically via `document.dir`. Language preference persists across sessions.

5. **Multi-vendor architecture.** Vendors have isolated dashboards, product catalogs, and analytics. Order queries correctly scope to the vendor's SKUs via join chains (order_items → product_variants → products → vendor_id).

## Biggest Weaknesses

1. **Zero automated integration or E2E tests.** One unit test file tests login attempt sort ordering. Nothing tests the checkout flow, Paymob webhook, auth refresh cycle, or any user-facing flow.

2. **No background job infrastructure.** Abandoned cart detection, back-in-stock notifications, newsletter broadcasts, and low-stock alerts all require a human admin to manually trigger them. There is no cron runner or task queue.

3. **Checkout not fully internationalized.** ~22 hardcoded English strings remain in `Checkout.tsx`. Arabic-speaking customers see English labels throughout the most critical conversion page.

4. **No server-side rendering.** The React SPA sets meta tags client-side via `useSEO`. Search engines see a mostly empty HTML shell. No JSON-LD structured data. No OpenGraph images.

5. **No monitoring or alerting.** Pino logs to stdout. No error aggregation (Sentry), no uptime monitoring, no performance metrics. A production crash produces no alerts.

6. **Image uploads disabled without Cloudinary.** No local storage fallback exists. Vendors and admins cannot attach images to products without configuring three Cloudinary env vars.

7. **Back-in-stock notification trigger missing.** The `stock_notifications` table stores user requests and the email function exists, but the variant update route does **not** check for pending notifications. Users who subscribed receive no email when stock is restored.

---

# SECTION 2 — ARCHITECTURE OVERVIEW

## 2.1 Monorepo Structure

```
workspace/                            ← pnpm workspace root (Node 24, TypeScript 5.9)
├── artifacts/
│   ├── api-server/                   ← Express 5 REST API  (port 8080 in dev)
│   ├── store/                        ← React 19 + Vite 7 SPA  (port 5000 in dev)
│   └── mockup-sandbox/               ← Isolated UI prototype env  (port 8081, canvas only)
├── lib/
│   ├── db/                           ← Drizzle ORM schema + pg Pool client
│   ├── api-spec/                     ← openapi.yaml  ← SOURCE OF TRUTH for all contracts
│   ├── api-zod/                      ← Orval-generated Zod schemas + TS types
│   └── api-client-react/             ← Orval-generated TanStack Query hooks
├── scripts/                          ← Admin CLI utilities (create-admin.ts, etc.)
├── docs/                             ← Security, deployment, operations documentation
├── pnpm-workspace.yaml               ← Workspace definition + shared dependency catalog
└── tsconfig.base.json                ← Base TS config inherited by all packages
```

**Key toolchain decisions:**
- `catalog:` entries in `pnpm-workspace.yaml` pin shared dependency versions across all packages, preventing version drift (e.g., `react: 19.1.0`, `zod: 3.25.76`, `vite: ^7.3.2`).
- `onlyBuiltDependencies` controls which packages run `postinstall` native compilation.
- Platform-specific binary overrides (`esbuild>@esbuild/darwin-arm64: '-'`, etc.) prevent downloading unused native binaries for non-Linux platforms.
- `autoInstallPeers: false` prevents surprise transitive installs.

## 2.2 Frontend Architecture (`artifacts/store`)

| Concern              | Solution                                                                              |
|----------------------|---------------------------------------------------------------------------------------|
| Framework            | React 19 + Vite 7                                                                     |
| Routing              | Wouter (2KB; no nested layout router support)                                         |
| Server state         | TanStack Query v5 (all API interaction; no Redux/Zustand)                             |
| UI primitives        | Radix UI + shadcn/ui pattern (~40 component files under `components/ui/`)             |
| Styling              | Tailwind CSS v4 via `@tailwindcss/vite` plugin (CSS-first config, no `tailwind.config.js`) |
| Animation            | Framer Motion (page transitions, drawers, product cards)                              |
| Forms                | react-hook-form + Zod resolvers (auth, checkout, addresses)                           |
| Charts               | Recharts (AreaChart revenue, PieChart order status, BarChart top products)            |
| i18n                 | Custom context system (no i18next); JSON translation files; `document.dir` for RTL   |
| Icons                | Lucide React + react-icons                                                            |
| Build output         | `dist/public/` — served by Vite dev server in dev; by Express static middleware in prod |

**State management layers:**

```
┌─────────────────────────────────────────────────────────┐
│  Server/async state       TanStack Query                │
│  User identity            AuthContext (React Context)   │
│  Language / RTL           LanguageContext               │
│  Cart drawer open/close   CartDrawerContext             │
│  Guest cart               useGuestCart (localStorage)   │
│  Form state               react-hook-form + useState    │
│  Local UI state           useState / useReducer         │
└─────────────────────────────────────────────────────────┘
```

**Routing structure (`App.tsx`):**
- `/admin-panel*` → `AdminLayout` wrapper → `AdminDashboard`
- All other routes → default `Layout` wrapper (Navbar + Footer)
- Dynamic params: `/products/:id`, `/order/:id/tracking`
- Base path: `import.meta.env.BASE_URL` (configured via Vite `BASE_PATH` env var)

**Vite dev proxy:**
```
/api/* → http://localhost:8080  (Express API server)
```
This means the frontend never calls the API server by absolute URL; relative `/api/` paths work in all environments.

## 2.3 Backend Architecture (`artifacts/api-server`)

**Framework:** Express 5.
- Async route handlers auto-catch thrown errors and forward to the global error handler (no per-route try/catch on simple DB queries).
- Wildcard routes use `/{*splat}` syntax (Express 5 requirement).
- Routes return `res.status(N).json(...); return;` — never `return res.status(...).json(...)`.

**Build:** esbuild bundles to a single `dist/index.mjs` (~5.5MB including all deps).
- `esbuild-plugin-pino` handles Pino's worker-thread architecture correctly in the bundle (emits separate `pino-worker.mjs`, `pino-file.mjs`, `pino-pretty.mjs`).
- Source maps emitted separately (`dist/index.mjs.map` — 9.4MB).

**Middleware stack (execution order in `app.ts`):**
```
1. helmet            — security headers (HSTS, CSP, etc.)
2. compression       — gzip response compression
3. pino-http         — structured request/response logging
4. cors              — origin allowlist (Replit domain patterns + localhost in dev)
5. express.json      — request body parsing
6. cookie-parser     — cookie parsing (loaded but not actively used for auth)
7. general limiter   — 300 req / 15 min per IP (all /api routes)
8. auth limiter      — 20 req / 15 min (applied to /api/auth/login + /api/auth/register)
9. checkout limiter  — 10 req / min (applied to POST /api/orders)
10. route handlers   — domain-organized files
11. global error handler — formats errors, logs stack in dev, generic message in prod
```

**Route file organization:**
```
src/routes/
├── auth.ts              ← Register, login, refresh, logout, verify-email, password reset
├── google-auth.ts       ← Google OAuth verification
├── users.ts             ← User CRUD (admin + self)
├── products.ts          ← Product CRUD + listing variants
├── categories.ts        ← Category CRUD
├── orders.ts            ← Order create, list, status update, invoice PDF
├── cart.ts              ← Cart item CRUD
├── reviews.ts           ← Review CRUD + admin list
├── banners.ts           ← Banner CRUD
├── notifications.ts     ← Notification read/list
├── analytics.ts         ← Summary, sales, BI, top products/categories, vendor metrics
├── uploads.ts           ← Cloudinary image upload/delete/primary
├── settings.ts          ← Store settings public + admin
├── payments.ts          ← Paymob initiate + webhook, manual payment
├── coupons.ts           ← Coupon CRUD + validate
├── faqs.ts              ← FAQ CRUD (public + admin)
├── contact.ts           ← Contact form submission + admin management
├── newsletter.ts        ← Subscribe/unsubscribe + admin list
├── support.ts           ← Support ticket threads (customer + admin)
├── addresses.ts         ← User address book CRUD
├── security.ts          ← Account-level security (devices, sessions, prefs)
├── admin-security.ts    ← Admin security center (login history, lockouts, compromised)
├── abandoned-carts.ts   ← Admin abandoned cart recovery tools
├── recently-viewed.ts   ← Recently viewed product tracking
├── saved-coupons.ts     ← User saved coupon bookmarks
└── stock-notifications.ts ← Back-in-stock subscription
```

## 2.4 Database Architecture

**Engine:** PostgreSQL via Drizzle ORM (`drizzle-orm/node-postgres`).
- `pg.Pool` initialized in `lib/db/src/index.ts` and exported as `db`.
- All queries use Drizzle's query builder — no raw SQL in routes (except `SELECT 1` in `/healthz`).
- Schema in `lib/db/src/schema/` (one file per domain).
- Pushed with `drizzle-kit push` — no migration files, push-only dev workflow.
- **32 tables total.**

## 2.5 Authentication Architecture

```
Client                     API Server                        Database
  │                            │                                 │
  │── POST /auth/login ────────►│                                 │
  │                            │── SELECT user by email ────────►│
  │                            │◄─ user row ─────────────────────│
  │                            │── checkLockout(email, ip) ─────►│ login_attempts
  │                            │── bcrypt.compare(pw, hash)      │
  │                            │── signToken() → JWT (7d)        │
  │                            │── INSERT refresh_token (30d) ──►│ refresh_tokens
  │                            │── trustDevice() (if flag set) ──►│ trusted_devices
  │                            │── sendNewLoginAlert() (async)   │
  │◄─ {token, refreshToken} ───│                                 │
  │                            │                                 │
  │── Any API call ────────────►│                                 │
  │  Authorization: Bearer JWT │                                 │
  │                            │── requireAuth middleware         │
  │                            │   verifies JWT, sets req.user   │
  │                            │                                 │
  │── POST /auth/refresh ──────►│                                 │
  │  {refreshToken}            │── SHA256(token) lookup ────────►│ refresh_tokens
  │                            │── revoke old, issue new pair    │
  │◄─ {token, refreshToken} ───│                                 │
```

**Token storage:** `auth_token` and `refresh_token` in `localStorage`. The key name `auth_token` is used universally across all components and contexts (no bare `"token"` key).

**Authorization levels:**
- `requireAuth` — valid JWT required
- `requireRole("admin")` — JWT + role check
- `requireRole("admin", "vendor")` — JWT + either role
- `optionalAuth` — attempts JWT verification; does not fail on missing token

## 2.6 API Contract Architecture (OpenAPI-first)

```
lib/api-spec/openapi.yaml
        │
        ▼  (pnpm --filter @workspace/api-spec run codegen)
        │
        ├──► lib/api-zod/src/
        │         ├── api.ts         ← TypeScript types for all request/response shapes
        │         └── types/         ← Named component schemas as exported Zod schemas
        │
        └──► lib/api-client-react/src/
                  ├── api.ts         ← TanStack Query hooks (useGetProduct, useCreateOrder, etc.)
                  └── custom-fetch.ts ← Injects Authorization header, handles 401 refresh cycle
```

Frontend components import generated hooks:
```typescript
import { useListProducts, useCreateOrder } from "@workspace/api-client-react";
```

**Known codegen constraint:** Inline `additionalProperties` / `format: binary` schemas in the OpenAPI spec generate types in both `api.ts` and `types/`, causing TS2308 duplicate-export errors. All binary/extended schemas must use `$ref` to named component schemas.

---

# SECTION 3 — DATABASE AUDIT

## 3.1 Complete Table Inventory

### TABLE 1: `users`
**File:** `lib/db/src/schema/users.ts`

**Purpose:** Core identity table. All three roles (customer, vendor, admin) are rows in this table differentiated by the `role` column.

**Columns:**

| Column                        | Type                   | Constraints              | Notes                                          |
|-------------------------------|------------------------|--------------------------|------------------------------------------------|
| `id`                          | serial                 | PK                       |                                                |
| `name`                        | text                   | NOT NULL                 |                                                |
| `email`                       | text                   | NOT NULL, UNIQUE         |                                                |
| `password`                    | text                   | nullable                 | NULL for Google-only accounts                  |
| `role`                        | text                   | NOT NULL, DEFAULT 'customer' | Values: customer, vendor, admin          |
| `avatar`                      | text                   | nullable                 | Cloudinary URL                                 |
| `active`                      | boolean                | NOT NULL, DEFAULT true   | Soft-delete / ban mechanism                    |
| `email_verified`              | boolean                | NOT NULL, DEFAULT false  | Set true on verify-email or Google OAuth       |
| `email_verification_token`    | text                   | nullable                 | 32-byte random hex                             |
| `email_verification_expires`  | timestamp with tz      | nullable                 | 24-hour expiry                                 |
| `email_preferences`           | jsonb                  | nullable                 | `{orderUpdates, promotions, securityAlerts}`   |
| `google_id`                   | text                   | UNIQUE, nullable         | Links Google account                           |
| `created_at`                  | timestamp              | DEFAULT now()            |                                                |
| `updated_at`                  | timestamp              | DEFAULT now()            | Auto-updated                                   |

**Indexes:** `users_role_idx`, `users_role_active_idx` (composite), `users_created_at_idx`

**Relations:**
- Referenced by: `orders.user_id`, `cart_items.user_id`, `reviews.user_id`, `wishlist.user_id`, `notifications.user_id`, `refresh_tokens.user_id`, `password_reset_tokens.user_id`, `audit_logs.user_id`, `login_attempts.user_id`, `trusted_devices.user_id`, `user_security_prefs.user_id`, `user_addresses.user_id`, `support_tickets.user_id`, `ticket_messages.sender_id`, `abandoned_cart_reminders.user_id`, `recently_viewed.user_id`, `saved_coupons.user_id`, `stock_notifications.user_id`

**CRUD Routes:** `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`, `PATCH /api/auth/*`, `GET/PATCH/DELETE /api/users/:id`

**Frontend:** Login, Register, CustomerDashboard (Profile), AdminUsersTab, VendorDashboard header

**Status:** ✅ Fully used. Most referenced table in the codebase.

---

### TABLE 2: `categories`
**File:** `lib/db/src/schema/categories.ts`

**Purpose:** Product taxonomy with optional parent-child hierarchy.

**Columns:**

| Column             | Type      | Constraints   | Notes                                    |
|--------------------|-----------|---------------|------------------------------------------|
| `id`               | serial    | PK            |                                          |
| `name_en`          | text      | NOT NULL      |                                          |
| `name_ar`          | text      | NOT NULL      |                                          |
| `slug`             | text      | NOT NULL, UNIQUE | URL-safe identifier                   |
| `image_url`        | text      | nullable      | Category hero image                      |
| `parent_category_id` | integer | nullable      | ⚠️ No FK constraint defined in schema   |
| `created_at`       | timestamp | DEFAULT now() |                                          |

**Relations:**
- `products.category_id` → `categories.id`
- `parent_category_id` → `categories.id` (self-referencing — **FK constraint missing**)

**CRUD Routes:** `GET /api/categories`, `POST /api/categories`, `PATCH /api/categories/:id`, `DELETE /api/categories/:id`

**Frontend:** Navbar mega-menu, Products filter sidebar, AdminCategoriesTab, sitemap.xml

**Status:** ✅ Fully used. **Risk: missing FK on `parent_category_id`.**

---

### TABLE 3: `products`
**File:** `lib/db/src/schema/products.ts`

**Purpose:** Product catalog master record. One row per product, variants are in a separate table.

**Columns:**

| Column           | Type            | Constraints               | Notes                                      |
|------------------|-----------------|---------------------------|--------------------------------------------|
| `id`             | serial          | PK                        |                                            |
| `name_en`        | text            | NOT NULL                  |                                            |
| `name_ar`        | text            | NOT NULL                  |                                            |
| `description_en` | text            | nullable                  |                                            |
| `description_ar` | text            | nullable                  |                                            |
| `category_id`    | integer         | NOT NULL                  | FK → categories.id                         |
| `vendor_id`      | integer         | NOT NULL                  | FK → users.id (role=vendor)                |
| `price`          | numeric(10,2)   | NOT NULL                  | Base price. Returned as string from Drizzle — always cast to Number() |
| `sale_price`     | numeric(10,2)   | nullable                  | If set, displayed as discounted price      |
| `sku`            | text            | nullable                  | Not unique-constrained                     |
| `featured`       | boolean         | DEFAULT false             | Powers /api/products/featured              |
| `active`         | boolean         | DEFAULT true              | Soft-delete; filters all public queries    |
| `created_at`     | timestamp       | DEFAULT now()             |                                            |
| `updated_at`     | timestamp       | DEFAULT now()             |                                            |

**Indexes:** 9 indexes — `products_category_id_idx`, `products_vendor_id_idx`, `products_active_idx`, `products_featured_idx`, `products_created_at_idx`, and 4 composites (`active+category_id`, `active+featured`, `active+vendor_id`, `active+created_at`).

**Relations:**
- → `categories.id` (category_id)
- → `users.id` (vendor_id)
- ← `product_variants.product_id`
- ← `product_images.product_id`
- ← `order_items` (via product_variants)
- ← `wishlist.product_id`
- ← `reviews.product_id`
- ← `recently_viewed.product_id`

**Status:** ✅ Fully used. Best-indexed table in the schema.

---

### TABLE 4: `product_variants`
**File:** `lib/db/src/schema/products.ts`

**Purpose:** Per-product size/color SKUs with individual stock counts.

**Columns:**

| Column           | Type    | Constraints | Notes                                                    |
|------------------|---------|-------------|----------------------------------------------------------|
| `id`             | serial  | PK          |                                                          |
| `product_id`     | integer | NOT NULL    | FK → products.id                                         |
| `color`          | text    | NOT NULL    | Plain text — no normalized color table. Spelling inconsistencies possible. |
| `size`           | text    | NOT NULL    | Plain text — no normalized size table.                   |
| `stock_quantity` | integer | DEFAULT 0   | Decremented on order create, incremented on variant update |

**Indexes:** `product_variants_product_id_idx`, `product_variants_stock_quantity_idx`

**Missing:** No `price_override` column — all variants share the product's base price. No per-variant SKU. No per-variant images.

**Status:** ✅ Fully used. Normalization gap noted.

---

### TABLE 5: `product_images`
**File:** `lib/db/src/schema/products.ts`

**Purpose:** Multiple images per product with primary designation and display order.

**Columns:**

| Column                | Type    | Constraints   | Notes                                     |
|-----------------------|---------|---------------|-------------------------------------------|
| `id`                  | serial  | PK            |                                           |
| `product_id`          | integer | nullable      | FK → products.id                          |
| `image_url`           | text    | nullable      | Full Cloudinary URL                       |
| `cloudinary_public_id`| text    | nullable      | Used for deletion via Cloudinary API      |
| `is_primary`          | boolean | DEFAULT false | One primary per product enforced in routes |
| `sort_order`          | integer | DEFAULT 0     | Controls display sequence                 |

**Indexes:** `product_images_product_id_idx`, `product_images_product_id_is_primary_idx` (composite)

**Missing:** No `variant_id` column — images are at the product level, not variant level. Selecting a different color cannot show a different image.

**Status:** ✅ Fully used.

---

### TABLE 6: `orders`
**File:** `lib/db/src/schema/orders.ts`

**Purpose:** Order header record capturing the full lifecycle of a customer purchase.

**Columns:**

| Column               | Type          | Constraints   | Notes                                           |
|----------------------|---------------|---------------|-------------------------------------------------|
| `id`                 | serial        | PK            |                                                 |
| `user_id`            | integer       | NOT NULL      | FK → users.id                                   |
| `total_price`        | numeric(10,2) | nullable      | Returned as string — always cast to Number()    |
| `payment_method`     | text          | nullable      | cod / paymob / instapay / vodafone_cash / bank_transfer |
| `status`             | text          | nullable      | new→paid→processing→packed→shipped→out_for_delivery→delivered |
| `coupon_code`        | text          | nullable      | Snapshot of applied code                        |
| `discount`           | numeric       | nullable      | Discount amount applied                         |
| `shipping_name`      | text          | nullable      | Snapshot of customer name at checkout           |
| `shipping_address`   | text          | nullable      | Snapshot of address                             |
| `shipping_city`      | text          | nullable      | Snapshot of city                                |
| `shipping_phone`     | text          | nullable      | Used for WhatsApp trigger                       |
| `paid_at`            | timestamp     | nullable      | Set when payment confirmed                      |
| `processing_at`      | timestamp     | nullable      |                                                 |
| `packed_at`          | timestamp     | nullable      |                                                 |
| `shipped_at`         | timestamp     | nullable      |                                                 |
| `out_for_delivery_at`| timestamp     | nullable      |                                                 |
| `delivered_at`       | timestamp     | nullable      |                                                 |
| `created_at`         | timestamp     | DEFAULT now() |                                                 |

**Indexes:** `orders_user_id_idx`, `orders_status_idx`, `orders_created_at_idx`, `orders_user_id_status_idx` (composite), `orders_status_created_at_idx` (composite)

**Missing:** No `shipping_fee` column (always free or baked into total). No `customer_notes` field. No `cancelled_at` timestamp. No vendor-level split (vendor derived via joins).

**Status:** ✅ Fully used.

---

### TABLE 7: `order_items`
**File:** `lib/db/src/schema/orders.ts`

**Purpose:** Line items linking orders to specific product variants with price snapshot.

**Columns:**

| Column              | Type    | Constraints | Notes                                               |
|---------------------|---------|-------------|-----------------------------------------------------|
| `id`                | serial  | PK          |                                                     |
| `order_id`          | integer |             | FK → orders.id                                      |
| `product_variant_id`| integer |             | FK → product_variants.id                            |
| `quantity`          | integer |             |                                                     |
| `price`             | numeric |             | Snapshotted at purchase time — historically accurate |

**Indexes:** `order_items_order_id_idx`, `order_items_product_variant_id_idx`

**Status:** ✅ Fully used. Price snapshot design is correct.

---

### TABLE 8: `cart_items`
**File:** `lib/db/src/schema/cart.ts`

**Purpose:** Server-side persistent cart for authenticated users only.

**Columns:**

| Column              | Type    | Constraints                     | Notes                         |
|---------------------|---------|---------------------------------|-------------------------------|
| `id`                | serial  | PK                              |                               |
| `user_id`           | integer |                                 | FK → users.id                 |
| `product_variant_id`| integer |                                 | FK → product_variants.id      |
| `quantity`          | integer |                                 |                               |

**Constraints:** UNIQUE on `(user_id, product_variant_id)` — prevents duplicate cart entries.
**Indexes:** `cart_items_user_id_idx`

**Note:** Guest carts use `localStorage` (`luxe_guest_cart` key) via the `useGuestCart` hook. On login, guest items are merged into this table.

**Status:** ✅ Fully used.

---

### TABLE 9: `reviews`
**File:** `lib/db/src/schema/reviews.ts`

**Purpose:** Product reviews with verified-purchase enforcement and one-review-per-user-per-product limit.

**Columns:**

| Column             | Type    | Constraints                  | Notes                                         |
|--------------------|---------|------------------------------|-----------------------------------------------|
| `id`               | serial  | PK                           |                                               |
| `product_id`       | integer |                              | FK → products.id                              |
| `user_id`          | integer |                              | FK → users.id                                 |
| `order_id`         | integer | nullable                     | FK → orders.id (linked for verified purchase) |
| `rating`           | integer |                              | 1–5                                           |
| `title`            | text    | nullable                     |                                               |
| `comment`          | text    | nullable                     |                                               |
| `verified_purchase`| boolean |                              | Set by server based on order lookup           |
| `created_at`       | timestamp | DEFAULT now()              |                                               |

**Constraints:** UNIQUE on `(product_id, user_id)`.
**Indexes:** `reviews_product_id_idx`, `reviews_user_id_idx`, `reviews_rating_idx`, `reviews_created_at_idx`

**Missing:** No `status` column (pending/approved/hidden) — reviews publish immediately with no moderation. No `helpful_count`. No admin reply.

**Status:** ✅ Fully used. Moderation gap is a business risk.

---

### TABLE 10: `wishlist`
**File:** `lib/db/src/schema/wishlist.ts`

**Purpose:** Saved products per user (bookmarks for future purchase).

**Columns:**

| Column      | Type      | Constraints | Notes             |
|-------------|-----------|-------------|-------------------|
| `id`        | serial    | PK          |                   |
| `user_id`   | integer   |             | FK → users.id     |
| `product_id`| integer   |             | FK → products.id  |
| `created_at`| timestamp | DEFAULT now()|                  |

**Constraints:** UNIQUE on `(user_id, product_id)`.
**Indexes:** `wishlist_user_id_idx`

**Status:** ✅ Fully used.

---

### TABLE 11: `coupons`
**File:** `lib/db/src/schema/coupons.ts`

**Purpose:** Discount codes with type, value, date range, and usage limits.

**Columns:**

| Column          | Type      | Constraints   | Notes                              |
|-----------------|-----------|---------------|------------------------------------|
| `id`            | serial    | PK            |                                    |
| `code`          | text      | NOT NULL, UNIQUE |                                 |
| `discount_type` | text      |               | 'percentage' or 'fixed'            |
| `discount_value`| numeric   |               |                                    |
| `start_date`    | timestamp | nullable      |                                    |
| `end_date`      | timestamp | nullable      |                                    |
| `usage_limit`   | integer   | nullable      | NULL = unlimited                   |
| `usage_count`   | integer   | DEFAULT 0     | Incremented at order creation      |
| `active`        | boolean   | DEFAULT true  |                                    |

**Missing:** No `min_order_amount`. No `max_discount_amount` cap for percentage codes. No `user_id` restriction (any user can use any coupon multiple times up to `usage_limit`). No category/product restriction.

**Status:** ✅ Fully used. Missing per-user limit is a business logic gap.

---

### TABLE 12: `banners`
**File:** `lib/db/src/schema/banners.ts`

**Purpose:** Homepage hero and promotional banner content.

**Columns:**

| Column       | Type    | Constraints   | Notes                   |
|--------------|---------|---------------|-------------------------|
| `id`         | serial  | PK            |                         |
| `title_en`   | text    |               |                         |
| `title_ar`   | text    |               |                         |
| `subtitle_en`| text    |               |                         |
| `subtitle_ar`| text    |               |                         |
| `image_url`  | text    |               | Cloudinary URL          |
| `link_url`   | text    |               | Destination on click    |
| `active`     | boolean | DEFAULT true  |                         |
| `sort_order` | integer | DEFAULT 0     |                         |

**Status:** ✅ Fully used.

---

### TABLE 13: `notifications`
**File:** `lib/db/src/schema/notifications.ts`

**Purpose:** In-app user notifications triggered by order status changes and payment events.

**Columns:**

| Column    | Type      | Constraints   | Notes                            |
|-----------|-----------|---------------|----------------------------------|
| `id`      | serial    | PK            |                                  |
| `user_id` | integer   |               | FK → users.id                    |
| `title`   | text      |               |                                  |
| `message` | text      |               |                                  |
| `is_read` | boolean   | DEFAULT false |                                  |
| `created_at`| timestamp| DEFAULT now()|                                 |

**Indexes:** `notifications_user_id_idx`, `notifications_is_read_idx`

**Missing:** No `type` field for icon differentiation. No `action_url` for deep-linking from notification to the relevant page. No real-time push delivery — users must navigate to dashboard to see new notifications.

**Status:** ✅ Fully used. Functional but limited UX.

---

### TABLE 14: `refresh_tokens`
**File:** `lib/db/src/schema/refresh-tokens.ts`

**Purpose:** Persistent session records with device metadata. Enables session listing and revocation.

**Columns:**

| Column        | Type      | Constraints   | Notes                                        |
|---------------|-----------|---------------|----------------------------------------------|
| `id`          | serial    | PK            |                                              |
| `user_id`     | integer   |               | FK → users.id                                |
| `token_hash`  | text      | UNIQUE        | SHA-256 of the raw refresh token             |
| `user_agent`  | text      | nullable      |                                              |
| `ip`          | text      | nullable      |                                              |
| `expires_at`  | timestamp |               | 30 days from creation                        |
| `revoked_at`  | timestamp | nullable      | NULL = active session                        |
| `last_used_at`| timestamp | nullable      | Updated on each use                          |

**Indexes:** `refresh_tokens_user_id_idx`, `refresh_tokens_token_hash_idx`

**Status:** ✅ Fully used. Security-critical table.

---

### TABLE 15: `password_reset_tokens`
**File:** `lib/db/src/schema/password-reset-tokens.ts`

**Purpose:** Time-limited, single-use tokens for password reset flow.

**Columns:**

| Column      | Type      | Constraints   | Notes                     |
|-------------|-----------|---------------|---------------------------|
| `id`        | serial    | PK            |                           |
| `user_id`   | integer   |               | FK → users.id             |
| `token_hash`| text      | UNIQUE        | SHA-256 of raw token      |
| `expires_at`| timestamp |               | 60-minute expiry          |
| `used_at`   | timestamp | nullable      | NULL = not yet used       |

**Indexes:** `password_reset_tokens_user_id_idx`

**Status:** ✅ Fully used. Well-designed single-use pattern.

---

### TABLE 16: `audit_logs`
**File:** `lib/db/src/schema/audit-logs.ts`

**Purpose:** Immutable record of sensitive admin actions with before/after state capture.

**Columns:**

| Column       | Type      | Constraints   | Notes                               |
|--------------|-----------|---------------|-------------------------------------|
| `id`         | serial    | PK            |                                     |
| `user_id`    | integer   | nullable      | FK → users.id (nullable if user deleted) |
| `user_email` | text      |               | Snapshot — survives user deletion   |
| `action`     | text      |               | e.g. 'delete_user', 'force_reset'   |
| `resource`   | text      |               | e.g. 'user', 'order'                |
| `resource_id`| integer   | nullable      |                                     |
| `before`     | jsonb     | nullable      | State before action                 |
| `after`      | jsonb     | nullable      | State after action                  |
| `ip`         | text      | nullable      |                                     |
| `created_at` | timestamp | DEFAULT now() |                                     |

**Indexes:** `audit_logs_user_id_idx`, `audit_logs_resource_idx`, `audit_logs_created_at_idx`

**Gap:** Only user delete and force-password-reset currently write audit logs. Product, category, coupon, and banner mutations do not.

**Status:** ⚠️ Partially used. Table design is excellent; coverage is incomplete.

---

### TABLE 17: `store_settings`
**File:** `lib/db/src/schema/store-settings.ts`

**Purpose:** Platform-wide key-value configuration store. Single source of truth for all admin-configurable settings.

**Columns:**

| Column      | Type      | Constraints   | Notes                           |
|-------------|-----------|---------------|---------------------------------|
| `id`        | serial    | PK            |                                 |
| `key`       | text      | UNIQUE        |                                 |
| `value`     | text      |               |                                 |
| `updated_at`| timestamp | DEFAULT now() |                                 |

**Notable keys stored:**
- `contact_email`, `phone`, `address`, `social_facebook`, `social_instagram`, `social_twitter`, `social_tiktok`
- `paymob_integration_id`, `paymob_iframe_id`, `paymob_card_integration_id`
- `payment_instapay`, `payment_vodafone_cash`, `payment_bank_transfer` (account numbers / instructions)
- `abandoned_cart_threshold_hours`
- `store_name`, `store_logo`, `store_currency`

**Split:** Public endpoint (`GET /api/settings`) returns a safe subset. Admin endpoint (`GET /api/settings/admin`) returns all keys.

**Status:** ✅ Fully used.

---

### TABLE 18: `payments`
**File:** `lib/db/src/schema/payments.ts`

**Purpose:** Paymob payment transaction records created by the Paymob webhook.

**Columns:**

| Column            | Type      | Constraints   | Notes                                     |
|-------------------|-----------|---------------|-------------------------------------------|
| `id`              | serial    | PK            |                                           |
| `order_id`        | integer   |               | FK → orders.id                            |
| `paymob_order_id` | bigint    |               | Paymob's internal order ID                |
| `transaction_id`  | bigint    |               | Paymob's transaction ID                   |
| `status`          | text      |               | success / pending / failed                |
| `amount_cents`    | integer   |               | Amount in smallest currency unit          |
| `currency`        | text      |               | EGP                                       |
| `method`          | text      |               | card / mobile_wallet / etc.               |
| `raw_data`        | jsonb     |               | Full Paymob webhook payload               |
| `created_at`      | timestamp | DEFAULT now() |                                           |

**Indexes:** `payments_order_id_idx`, `payments_paymob_order_id_idx`, `payments_transaction_id_idx`

**Status:** ✅ Fully used. Requires `PAYMOB_API_KEY` + Paymob settings in `store_settings`.

---

### TABLE 19: `login_attempts`
**File:** `lib/db/src/schema/login-attempts.ts`

**Purpose:** Every login attempt recorded for brute-force detection, lockout enforcement, and admin security monitoring.

**Columns:**

| Column        | Type      | Constraints   | Notes                              |
|---------------|-----------|---------------|------------------------------------|
| `id`          | serial    | PK            |                                    |
| `email`       | text      |               |                                    |
| `ip`          | text      |               |                                    |
| `user_id`     | integer   | nullable      | NULL for non-existent email attempts|
| `user_agent`  | text      | nullable      |                                    |
| `success`     | boolean   |               |                                    |
| `attempted_at`| timestamp | DEFAULT now() |                                    |

**Indexes:** `login_attempts_email_idx`, `login_attempts_ip_idx`, `login_attempts_email_success_at_idx` (composite), `login_attempts_ip_success_at_idx` (composite), `login_attempts_attempted_at_idx`

**Status:** ✅ Fully used. Security-critical table. High write volume — will grow unbounded without a cleanup job.

---

### TABLE 20: `trusted_devices`
**File:** `lib/db/src/schema/trusted-devices.ts`

**Purpose:** Device fingerprint registry. When `rememberDevice: true` on login, the device is stored here. Used to detect and alert on logins from new devices.

**Columns:**

| Column        | Type      | Constraints   | Notes                                |
|---------------|-----------|---------------|--------------------------------------|
| `id`          | serial    | PK            |                                      |
| `user_id`     | integer   |               | FK → users.id                        |
| `device_hash` | text      |               | SHA-256(userAgent.slice(0, 32))      |
| `device_name` | text      |               | Parsed from UA (e.g. "Chrome on Windows") |
| `browser`     | text      |               |                                      |
| `os`          | text      |               |                                      |
| `ip`          | text      |               |                                      |
| `last_seen_at`| timestamp |               |                                      |

**Constraints:** UNIQUE on `(user_id, device_hash)`.
**Indexes:** `trusted_devices_user_device_idx` (unique composite), `trusted_devices_user_id_idx`

**Status:** ✅ Fully used.

---

### TABLE 21: `user_security_prefs`
**File:** `lib/db/src/schema/user-security-prefs.ts`

**Purpose:** Per-user security preferences (currently: whether login alerts are enabled).

**Columns:**

| Column                | Type      | Constraints   | Notes                     |
|-----------------------|-----------|---------------|---------------------------|
| `id`                  | serial    | PK            |                           |
| `user_id`             | integer   | UNIQUE        | FK → users.id             |
| `login_alerts_enabled`| boolean   | DEFAULT true  |                           |
| `updated_at`          | timestamp |               |                           |

**Note:** One row per user. This could be a JSONB column on `users` to avoid a join, but the current design is clean and extensible.

**Status:** ✅ Fully used.

---

### TABLE 22: `user_addresses`
**File:** `lib/db/src/schema/addresses.ts`

**Purpose:** Saved shipping addresses per user for use at checkout and WhatsApp notifications.

**Columns:**

| Column       | Type    | Constraints   | Notes                             |
|--------------|---------|---------------|-----------------------------------|
| `id`         | serial  | PK            |                                   |
| `user_id`    | integer |               | FK → users.id                     |
| `label`      | text    |               | e.g. "Home", "Office"             |
| `first_name` | text    |               |                                   |
| `last_name`  | text    |               |                                   |
| `address`    | text    |               |                                   |
| `city`       | text    |               |                                   |
| `phone`      | text    |               | Used for WhatsApp notifications   |
| `is_default` | boolean | DEFAULT false |                                   |

**Indexes:** `user_addresses_user_id_idx`

**Gap:** Checkout does not pre-fill from the user's default address — customers must retype on every order.

**Status:** ✅ Fully used. Checkout integration gap noted.

---

### TABLE 23: `newsletter_subscribers`
**File:** `lib/db/src/schema/newsletter-subscribers.ts`

**Purpose:** Email newsletter subscription list.

**Columns:**

| Column              | Type      | Constraints   | Notes                                        |
|---------------------|-----------|---------------|----------------------------------------------|
| `id`                | serial    | PK            |                                              |
| `email`             | text      | UNIQUE        |                                              |
| `active`            | boolean   | DEFAULT true  |                                              |
| `unsubscribe_token` | text      | nullable      | ⚠️ Generated but never used in any email link |
| `subscribed_at`     | timestamp | DEFAULT now() |                                              |

**Gap:** `unsubscribe_token` is stored but the unsubscribe endpoint uses `{email}` from the request body rather than validating the token. The token is never included in any email. GDPR-grade one-click unsubscribe via link is not implemented.

**Status:** ⚠️ Partially used. Unsubscribe token dead code.

---

### TABLE 24: `faqs`
**File:** `lib/db/src/schema/faqs.ts`

**Purpose:** Storefront FAQ content, bilingual, categorized, admin-managed.

**Columns:**

| Column        | Type    | Constraints   | Notes             |
|---------------|---------|---------------|-------------------|
| `id`          | serial  | PK            |                   |
| `category`    | text    |               | Groups FAQs       |
| `question_en` | text    |               |                   |
| `question_ar` | text    |               |                   |
| `answer_en`   | text    |               |                   |
| `answer_ar`   | text    |               |                   |
| `sort_order`  | integer | DEFAULT 0     |                   |
| `active`      | boolean | DEFAULT true  |                   |

**Status:** ✅ Fully used.

---

### TABLE 25: `contact_messages`
**File:** `lib/db/src/schema/contact-messages.ts`

**Purpose:** Inbound contact form submissions from storefront visitors.

**Columns:**

| Column      | Type      | Constraints   | Notes                                   |
|-------------|-----------|---------------|-----------------------------------------|
| `id`        | serial    | PK            |                                         |
| `name`      | text      |               |                                         |
| `email`     | text      |               |                                         |
| `phone`     | text      | nullable      |                                         |
| `subject`   | text      |               |                                         |
| `message`   | text      |               |                                         |
| `status`    | text      | DEFAULT 'new' | new / reviewed / replied                |
| `created_at`| timestamp | DEFAULT now() |                                         |

**Status:** ✅ Fully used. Admin can reply via email (Resend), update status, delete.

---

### TABLE 26: `support_tickets`
**File:** `lib/db/src/schema/support-tickets.ts`

**Purpose:** Customer support request threads, linked optionally to a specific order.

**Columns:**

| Column      | Type      | Constraints   | Notes                                               |
|-------------|-----------|---------------|-----------------------------------------------------|
| `id`        | serial    | PK            |                                                     |
| `user_id`   | integer   |               | FK → users.id (CASCADE delete)                      |
| `order_id`  | integer   | nullable      | FK → orders.id (SET NULL on delete)                 |
| `subject`   | text      |               |                                                     |
| `category`  | text      |               | e.g. 'order', 'payment', 'product', 'other'         |
| `status`    | text      | DEFAULT 'open'| open / in_progress / resolved / closed              |
| `priority`  | text      | DEFAULT 'medium' | low / medium / high                             |
| `closed_at` | timestamp | nullable      |                                                     |
| `created_at`| timestamp | DEFAULT now() |                                                     |
| `updated_at`| timestamp | DEFAULT now() |                                                     |

**Indexes:** `support_tickets_user_id_idx`, `support_tickets_status_idx`

**Status:** ✅ Fully used.

---

### TABLE 27: `ticket_messages`
**File:** `lib/db/src/schema/support-tickets.ts`

**Purpose:** Individual messages within a support ticket thread. Supports internal (admin-only) notes.

**Columns:**

| Column      | Type    | Constraints   | Notes                              |
|-------------|---------|---------------|------------------------------------|
| `id`        | serial  | PK            |                                    |
| `ticket_id` | integer |               | FK → support_tickets.id (CASCADE)  |
| `sender_id` | integer |               | FK → users.id (CASCADE)            |
| `message`   | text    |               |                                    |
| `is_internal`| boolean| DEFAULT false | Admin-only notes not shown to customer |
| `created_at`| timestamp| DEFAULT now()|                                   |

**Indexes:** `ticket_messages_ticket_id_idx`

**Status:** ✅ Fully used.

---

### TABLE 28: `manual_payments`
**File:** `lib/db/src/schema/manual-payments.ts`

**Purpose:** Offline payment submissions (bank transfer, Instapay, Vodafone Cash) requiring admin approval.

**Columns:**

| Column           | Type      | Constraints   | Notes                                    |
|------------------|-----------|---------------|------------------------------------------|
| `id`             | serial    | PK            |                                          |
| `order_id`       | integer   |               | FK → orders.id                           |
| `method`         | text      |               | instapay / vodafone_cash / bank_transfer  |
| `reference_number`| text     |               | Customer-provided proof text             |
| `status`         | text      | DEFAULT 'pending' | pending / approved / rejected        |
| `admin_note`     | text      | nullable      | Admin's rejection/approval reason        |
| `reviewed_by`    | integer   | nullable      | FK → users.id                            |
| `reviewed_at`    | timestamp | nullable      |                                          |
| `created_at`     | timestamp | DEFAULT now() |                                          |

**Indexes:** `manual_payments_order_id_idx`, `manual_payments_status_idx`

**Missing:** No proof-of-payment image upload — customers submit reference numbers as text only.

**Status:** ✅ Fully used.

---

### TABLE 29: `abandoned_cart_reminders`
**File:** `lib/db/src/schema/abandoned-cart-reminders.ts`

**Purpose:** Tracks abandoned cart recovery campaign state per user.

**Columns:**

| Column              | Type      | Constraints   | Notes                                          |
|---------------------|-----------|---------------|------------------------------------------------|
| `id`                | serial    | PK            |                                                |
| `user_id`           | integer   | UNIQUE        | FK → users.id. UNIQUE = one record per user.   |
| `cart_items_count`  | integer   |               |                                                |
| `cart_value`        | numeric   |               |                                                |
| `detected_at`       | timestamp |               |                                                |
| `email_sent_at`     | timestamp | nullable      |                                                |
| `whatsapp_sent_at`  | timestamp | nullable      |                                                |
| `recovered_at`      | timestamp | nullable      | Set when user places an order after abandonment|

**Note:** UNIQUE on `user_id` means only one active reminder record per user. Previous abandonment data is overwritten when a new campaign starts. The detection itself is not automated — admin triggers it manually.

**Status:** ⚠️ Partially used. No cron scheduler. All triggers are manual admin actions.

---

### TABLE 30: `recently_viewed`
**File:** `lib/db/src/schema/recently-viewed.ts`

**Purpose:** Per-user product browsing history for personalization and admin product analytics.

**Columns:**

| Column      | Type      | Constraints   | Notes                             |
|-------------|-----------|---------------|-----------------------------------|
| `id`        | serial    | PK            |                                   |
| `user_id`   | integer   |               | FK → users.id                     |
| `product_id`| integer   |               | FK → products.id                  |
| `viewed_at` | timestamp | DEFAULT now() | Updated on re-view (upsert)       |

**Constraints:** UNIQUE on `(user_id, product_id)`.
**Indexes:** `recently_viewed_user_product_unique`, `recently_viewed_user_id_idx`, `recently_viewed_viewed_at_idx`

**Gap:** Data is collected correctly. However, it is not displayed on the customer-facing storefront (no "Recently Viewed" section on homepage or product listing). Only visible in the Admin Product Insights tab.

**Status:** ⚠️ Partially used. Data collected, but not surfaced to the customer.

---

### TABLE 31: `saved_coupons`
**File:** `lib/db/src/schema/saved-coupons.ts`

**Purpose:** User's bookmarked coupon codes for quick application at checkout.

**Columns:**

| Column       | Type    | Constraints | Notes             |
|--------------|---------|-------------|-------------------|
| `id`         | serial  | PK          |                   |
| `user_id`    | integer |             | FK → users.id     |
| `coupon_code`| text    |             |                   |
| `created_at` | timestamp| DEFAULT now()|                 |

**Constraints:** UNIQUE on `(user_id, coupon_code)`.
**Indexes:** `saved_coupons_user_code_unique`, `saved_coupons_user_id_idx`

**Status:** ✅ Fully used.

---

### TABLE 32: `stock_notifications`
**File:** `lib/db/src/schema/stock-notifications.ts`

**Purpose:** Back-in-stock notification subscriptions. User subscribes to a sold-out variant; should receive email when stock is restored.

**Columns:**

| Column       | Type      | Constraints   | Notes                                           |
|--------------|-----------|---------------|-------------------------------------------------|
| `id`         | serial    | PK            |                                                 |
| `user_id`    | integer   |               | FK → users.id                                   |
| `variant_id` | integer   |               | FK → product_variants.id                        |
| `notified_at`| timestamp | nullable      | Set when notification email is sent             |
| `created_at` | timestamp | DEFAULT now() |                                                 |

**Constraints:** UNIQUE on `(user_id, variant_id)`.
**Indexes:** `stock_notif_user_idx`, `stock_notif_variant_idx`, `stock_notif_unique`

**Critical gap:** The `PATCH /api/products/variants/:variantId` route updates stock quantity but does NOT check `stock_notifications` for pending subscribers. The `sendBackInStockEmail` function in `email.ts` exists and is ready to use but is never called. Users who subscribe to out-of-stock variants receive **no email** when stock is restored.

**Status:** ❌ Broken. Subscribe/unsubscribe endpoints work. The delivery trigger is missing.

---

## 3.2 Summary Statistics

| Metric | Count |
|---|---|
| **Total tables** | **32** |
| Tables with full CRUD routes | 26 |
| Tables with read-only routes | 4 |
| Tables that are write-only (no frontend read) | 0 |
| Tables with missing FK constraints | 1 (`categories.parent_category_id`) |
| Tables with dead columns | 1 (`newsletter_subscribers.unsubscribe_token`) |
| Tables with broken feature triggers | 1 (`stock_notifications` — no send trigger) |
| Tables growing unbounded without cleanup | 2 (`login_attempts`, `password_reset_tokens`) |

---

## 3.3 ERD-Style Relationship Map

```
┌─────────────────────────────────────────────────────────────────────┐
│                            IDENTITY CORE                            │
│                                                                     │
│  users ──────────────────────────────────────────────────────────┐ │
│   │                                                              │ │
│   ├──► refresh_tokens          (sessions: revocable, rotating)   │ │
│   ├──► password_reset_tokens   (one-time, 60-min expiry)         │ │
│   ├──► trusted_devices         (device fingerprints per user)    │ │
│   ├──► user_security_prefs     (1:1 — login alert preference)    │ │
│   └──► login_attempts          (all login events — grows fast)   │ │
└──────────────────────────────────────────────────────────────────┘ │
                                                                      │
┌─────────────────────────────────────────────────────────────────────┤
│                           PRODUCT CATALOG                           │
│                                                                     │
│  categories ─────────► categories (self-ref parent, FK MISSING)     │
│       │                                                             │
│       └──► products ──────────────────────────────────────────┐    │
│                │                                              │    │
│                ├──► product_variants ──┐                      │    │
│                │         │            │                       │    │
│                └──► product_images    │                       │    │
│                                       │                       │    │
└───────────────────────────────────────┤───────────────────────┘    │
                                        │                            │
┌───────────────────────────────────────┤────────────────────────────┤
│                          COMMERCE CORE                              │
│                                       │                            │
│  cart_items ──────────────────────────┤                            │
│       │                               │                            │
│  orders ──────────────────────────────┤◄──────────────────────────┘
│    │  │  │                            │
│    │  │  └──► order_items ────────────┘  (price snapshot)
│    │  │
│    │  ├──► payments          (Paymob transaction records)
│    │  ├──► manual_payments   (offline payment approvals)
│    │  └──► support_tickets ──► ticket_messages
│    │
│    └──► notifications        (created on status change)
│
└────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                         ENGAGEMENT LAYER                            │
│                                                                     │
│  wishlist ──────► products                                          │
│  reviews  ──────► products + orders (verified purchase check)       │
│  recently_viewed ──► products  (data collected, NOT shown on store) │
│  stock_notifications ──► product_variants  (trigger MISSING)        │
│  saved_coupons ──► coupons (by code, not FK)                        │
│  abandoned_cart_reminders ──► users (1:1, manual admin trigger)     │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                       PLATFORM MANAGEMENT                           │
│                                                                     │
│  store_settings   (key-value config, split public/admin)            │
│  banners          (homepage hero content)                           │
│  coupons          (discount codes)                                  │
│  faqs             (bilingual storefront FAQ)                        │
│  contact_messages (inbound inquiries)                               │
│  newsletter_subscribers (unsubscribe_token unused)                  │
│  audit_logs       (immutable action log — incomplete coverage)      │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 3.4 List of Unused Tables

**None.** Every one of the 32 tables has at least one active API route reading or writing it.

---

## 3.5 List of Risky Tables

| Table | Risk | Severity |
|---|---|---|
| `login_attempts` | Grows unbounded — no TTL, no cleanup job. After high-traffic periods (brute-force attacks), this table will accumulate millions of rows and slow lockout queries. | 🔴 High |
| `password_reset_tokens` | Old tokens accumulate. No cleanup of `used_at IS NOT NULL` or expired rows. | 🟡 Medium |
| `stock_notifications` | Trigger to send notification email is completely missing. Users subscribing to out-of-stock variants will never receive notification. Silent failure. | 🔴 High |
| `categories` | `parent_category_id` has no FK constraint. A deleted parent category will leave orphaned children with dangling integer references. No cascade defined. | 🟡 Medium |
| `newsletter_subscribers` | `unsubscribe_token` is generated and stored but never used. Unsubscribe endpoint uses email address directly — not GDPR-grade one-click compliance. | 🟡 Medium |
| `abandoned_cart_reminders` | UNIQUE on `user_id` means one record overwrites previous campaign data. If a user abandons multiple times, only the latest campaign is tracked. No campaign history. | 🟡 Medium |
| `audit_logs` | Coverage is selective — only user delete and force-password-reset actions are logged. Product/category/coupon/banner mutations are silently unlogged. | 🟡 Medium |
| `payments` | Paymob webhook accepts any payload if `PAYMOB_HMAC_SECRET` is not set (skips signature verification with only a warning log). In production without this secret, fake webhook calls can mark orders as paid. | 🔴 High |

---

## 3.6 Most Important Tables (by business criticality)

| Rank | Table | Why |
|---|---|---|
| 1 | `users` | Every authenticated action depends on this. Referenced by 18 other tables. |
| 2 | `orders` | Revenue record. 7-stage lifecycle. Powers analytics, vendor dashboards, and customer tracking. |
| 3 | `products` | The product catalog. Central to every customer-facing page. 9-index coverage. |
| 4 | `refresh_tokens` | All sessions depend on this. Revocation mechanism for security incidents. |
| 5 | `order_items` | Line-item truth — price snapshots ensure historical accuracy regardless of price changes. |
| 6 | `payments` | Financial record for Paymob transactions. Contains raw webhook payload for dispute resolution. |
| 7 | `login_attempts` | The brute-force lockout system's data store. Critical for security. High-growth risk. |
| 8 | `store_settings` | Platform-wide configuration. Paymob integration IDs, payment instructions, social links all live here. Misconfiguration here breaks entire payment flow. |
| 9 | `product_variants` | Stock levels and SKU structure. Decremented at order create — accuracy is revenue-critical. |
| 10 | `audit_logs` | Compliance and incident investigation. Current coverage incomplete but the design is correct. |

---

*End of PART 1. Awaiting your approval before proceeding to PART 2 — API Audit.*
