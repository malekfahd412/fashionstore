---
name: Vite config PORT/BASE_PATH build defaults
description: store and mockup-sandbox vite configs must default PORT/BASE_PATH so pnpm run build works without env vars.
---

# Vite Config Build Defaults

**Rule:** `artifacts/store/vite.config.ts` and `artifacts/mockup-sandbox/vite.config.ts` must use `?? "default"` fallbacks for `PORT` and `BASE_PATH` — never throw if they are missing.

**Why:** `pnpm run build` runs Vite in build mode where these env vars are not set. Throwing an error blocks the entire build pipeline.

**How to apply:**
```ts
// Correct pattern
const rawPort = process.env.PORT ?? "5000";  // store
const rawPort = process.env.PORT ?? "8082";  // mockup-sandbox
const port = Number(rawPort);
const basePath = process.env.BASE_PATH ?? "/";
```

The workflow command still passes `PORT=5000 BASE_PATH=/` explicitly for dev, so runtime behaviour is unchanged.
