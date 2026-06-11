---
name: Orval inline schema codegen conflict
description: Why inline OpenAPI schemas cause TS2308 duplicate-export errors in api-zod, and the fix.
---

## Rule
Never use inline `additionalProperties` or `format: binary` schemas in OpenAPI path requestBody/response definitions. Always use `$ref: "#/components/schemas/YourNamedSchema"`.

**Why:** Orval v8 generates types for inline schemas in TWO places:
1. `lib/api-zod/src/generated/api.ts` — Zod const (`export const FooBody = zod.object(...)`)
2. `lib/api-zod/src/generated/types/fooBody.ts` — TS type (`export type FooBody = {...}`)

Both are re-exported via `export *` in `lib/api-zod/src/index.ts`, causing TypeScript TS2308 "already exported a member" when the names collide in the same module chain.

When a `$ref` points to a named schema in `components/schemas`, Orval generates the type only once (in `api.ts`), and the type is not duplicated in the `types/` barrel.

**How to apply:** Any time you add a new POST/PATCH to the OpenAPI spec with a requestBody that has an inline schema, move the schema to `components/schemas` and reference it. This applies to:
- `additionalProperties` maps (settings-like objects)
- `format: binary` multipart fields (file uploads)
- Any complex inline object

Also note: the `Blob` type (generated for `format: binary`) requires the `dom` lib in TypeScript. Avoid `format: binary` entirely in the api-zod spec — multipart uploads are better handled with direct `fetch` + `FormData` on the frontend and `multer` on the backend, bypassing the generated hook.
