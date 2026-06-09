# LUXE Fashion Store

A bilingual (Arabic/English) e-commerce platform for fashion/clothing with three user roles: Admin, Vendor, and Customer.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/store run dev` — run the frontend (port 24964)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL`, `SESSION_SECRET`

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
- **Auth**: Register/Login with JWT; role assignment at register
- **Customer dashboard**: Profile, Order history, Wishlist, Notifications
- **Vendor dashboard**: Product management, Order management, Analytics charts
- **Admin dashboard**: Full platform management — users, products, categories, orders, coupons, banners, analytics

## Demo credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@fashionstore.com | password (hashed: `$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi`) |
| Vendor | vendor@fashionstore.com | same |
| Customer | customer@fashionstore.com | same |

> The seeded password hash corresponds to `password` (Laravel default test hash). Update via `/auth/register` or a direct DB update.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- After adding new schema files to `lib/db/src/schema/`, run `pnpm run typecheck:libs` before typechecking `api-server` — otherwise the route files can't find the exported table names
- The `@workspace/db` package re-exports the full schema barrel — import tables directly from `@workspace/db`
- `numeric` columns in Drizzle return strings; always cast to `Number()` before returning to the client
- Express 5 wildcard routes need names: use `/{*splat}` not `*`
- Always use `res.status(N).json(...); return;` — never `return res.status(...).json(...)`

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
- OpenAPI spec lives at `lib/api-spec/openapi.yaml` — never write types by hand that codegen can produce
