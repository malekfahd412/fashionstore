---
name: scripts package missing direct dependencies
description: scripts/create-admin.ts imports drizzle-orm and pg directly; they must be declared in scripts/package.json.
---

# Scripts Package Direct Dependencies

**Rule:** `scripts/package.json` must declare `drizzle-orm` (catalog:), `pg` (^8.20.0), and `@types/pg` as direct dependencies.

**Why:** `scripts/src/create-admin.ts` imports from `drizzle-orm/node-postgres`, `pg`, `drizzle-orm`, and `drizzle-orm/pg-core` directly (not via `@workspace/db`). Without them as explicit deps, TypeScript cannot resolve the types and `pnpm run typecheck` fails with TS2307.

**How to apply:** Add to `scripts/package.json`:
```json
"dependencies": {
  "drizzle-orm": "catalog:",
  "pg": "^8.20.0"
},
"devDependencies": {
  "@types/pg": "^8.11.13"
}
```
