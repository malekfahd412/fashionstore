# VELORA Fashion Store

A bilingual (Arabic/English) e-commerce platform for fashion/clothing with three user roles: Admin, Vendor, and Customer.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/store run dev` — run the frontend (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)

## Environment Variables

### Required (app will not start without these)
| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `SESSION_SECRET` | Secret for JWT signing (32+ random chars) |

### Email — Resend (optional, emails gracefully skipped if not set)
| Variable | Description |
|---|---|
| `RESEND_API_KEY` | API key from resend.com |
| `RESEND_FROM_EMAIL` | Verified sender address (e.g. `noreply@yourdomain.com`) |
| `RESEND_FROM_NAME` | Display name (default: `Velora Store`) |
| `APP_URL` | Full public URL without trailing slash (e.g. `https://yourapp.replit.app`) — used in email links |

### Payments — Paymob (optional, COD always available)
| Variable | Description |
|---|---|
| `PAYMOB_API_KEY` | Paymob API key |
| `PAYMOB_HMAC_SECRET` | Webhook HMAC secret — **required in production** to prevent spoofed webhooks |

### Google OAuth (optional)
| Variable | Description |
|---|---|
| `GOOGLE_CLIENT_ID` | Google OAuth 2.0 client ID |

### WhatsApp — Twilio or Meta Cloud API (optional)
| Variable | Description |
|---|---|
| `WHATSAPP_ENABLED` | Set to `"true"` to enable |
| `WHATSAPP_PROVIDER` | `"twilio"` or `"cloud"` (default) |
| `WHATSAPP_ACCESS_TOKEN` | Meta Cloud API access token |
| `WHATSAPP_PHONE_NUMBER_ID` | Meta phone number ID |
| `TWILIO_ACCOUNT_SID` | Twilio account SID (if using Twilio) |
| `TWILIO_AUTH_TOKEN` | Twilio auth token |
| `TWILIO_WHATSAPP_FROM` | Twilio WhatsApp from number |

### Image Uploads — Cloudinary (optional, uploads disabled if not set)
| Variable | Description |
|---|---|
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret |

### Optional Admin Bootstrap (auto-removed after use)
| Variable | Description |
|---|---|
| `ADMIN_EMAIL` | Email for first admin account (deleted from env after bootstrap) |
| `ADMIN_PASSWORD` | Password for first admin account (deleted from env after bootstrap) |

### Other Optional
| Variable | Description |
|---|---|
| `STORE_NAME` | Store name used in WhatsApp messages (default: `Velora`) |
| `PUBLIC_URL` | Public URL for sitemap generation (falls back to `REPLIT_DEV_DOMAIN`) |
| `LOG_LEVEL` | Pino log level (default: `info`) |

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite + Tailwind CSS + Wouter + TanStack Query
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Auth: JWT (jsonwebtoken + bcryptjs)
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)
- Charts: Recharts

## Where things live

- `lib/api-spec/openapi.yaml` — OpenAPI spec (source of truth for all API contracts)
- `lib/db/src/schema/` — Drizzle ORM table definitions (one file per domain)
- `artifacts/api-server/src/routes/` — Express route handlers (one file per domain)
- `artifacts/api-server/src/middlewares/auth.ts` — JWT auth middleware (requireAuth, requireRole, optionalAuth)
- `artifacts/store/src/` — React frontend (pages, components, contexts)

## Architecture decisions

- OpenAPI-first: the spec gates codegen which gates frontend — always update spec before adding endpoints
- JWT auth stored in localStorage; Authorization header injected by `lib/api-client-react/src/custom-fetch.ts`
- Bilingual content uses `nameEn`/`nameAr` and `descriptionEn`/`descriptionAr` fields on products, categories, and banners
- RTL/LTR switching sets `dir` attribute on the HTML element — layout flips automatically
- Role-based access: admin/vendor see their dashboards; customers see the store + customer dashboard

## Product

- **Public store**: Homepage (banners, featured, new arrivals, best sellers, categories), Product listing with search/filter, Product detail with variants, Cart, Checkout
- **Auth**: Register/Login + Google OAuth; role assignment at register
- **Customer dashboard**: Profile, Order history, Wishlist, Notifications, Support tickets, Security
- **Vendor dashboard**: Product management, Order management, Analytics charts
- **Admin dashboard**: Full platform management — users, products, categories, orders, coupons, banners, analytics, support, newsletter, contact messages, security

## Initial Admin Access

For first-time setup on a fresh database, either:

**Option A — Bootstrap via env vars** (recommended):
Set `ADMIN_EMAIL` + `ADMIN_PASSWORD` env vars before first start; the server auto-creates the admin and removes these vars from the process.

**Option B — Promote via SQL**:
Register normally then run:
```sql
UPDATE users SET role = 'admin' WHERE email = 'your@email.com';
```

> **Security note:** Never use predictable passwords in production. All default seeded accounts should be updated or deleted before going live.

## Migration Checklist

When moving to a new Replit account:
1. Set all env vars listed above (minimum: `DATABASE_URL` + `SESSION_SECRET` + `APP_URL`)
2. Run `echo y | pnpm --filter @workspace/db run push` to sync DB schema on the new database
3. Set `PAYMOB_HMAC_SECRET` — without it, the payment webhook accepts unverified requests
4. Set `APP_URL` — without it, email links (password reset, order confirmation, etc.) will be broken
5. Run `pnpm run build` to confirm clean build

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- After adding new schema files to `lib/db/src/schema/`, run `pnpm run typecheck:libs` before typechecking `api-server` — otherwise the route files can't find the exported table names
- The `@workspace/db` package re-exports the full schema barrel — import tables directly from `@workspace/db`
- `numeric` columns in Drizzle return strings; always cast to `Number()` before returning to the client
- Express 5 wildcard routes need names: use `/{*splat}` not `*`
- Always use `res.status(N).json(...); return;` — never `return res.status(...).json(...)`
- Express 5 auto-catches async route errors and forwards to the global error handler — no need for per-route try/catch on simple DB queries

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
- OpenAPI spec lives at `lib/api-spec/openapi.yaml` — never write types by hand that codegen can produce
