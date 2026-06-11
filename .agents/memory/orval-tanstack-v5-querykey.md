---
name: Orval TanStack Query v5 queryKey requirement
description: Generated hooks use UseQueryOptions which requires queryKey in v5; call sites need a stub.
---

# Orval TanStack Query v5 queryKey

**Rule:** When calling orval-generated hooks with `{ query: { enabled: ... } }`, TypeScript v5 of TanStack Query requires `queryKey` in `UseQueryOptions`. Add `queryKey: []` as a stub placeholder — the hook overrides it internally via `getXxxQueryOptions()`.

**Why:** TanStack Query v5 made `queryKey` a required property of `UseQueryOptions`. Orval generates parameter types as `query?: UseQueryOptions<...>`, so passing any partial query object without `queryKey` fails strict TypeScript checks.

**How to apply:** At every call site that passes `{ query: { enabled: ... } }` to a generated hook, add `queryKey: []`:
```tsx
// Before (TS error in v5)
useListBanners({ query: { enabled: true } })
// After (compiles cleanly)
useListBanners({ query: { enabled: true, queryKey: [] } })
```

The empty array is safe — the hook's internal `getXxxQueryOptions` replaces it with the real key before the query executes.

**Affected files at time of writing:** Home.tsx, Products.tsx, ProductDetails.tsx, Navbar.tsx. Any future hook call sites with `{ query: { ... } }` need the same treatment.

**Note:** If orval is re-run (codegen), the generated file is unchanged — this is purely a call-site concern.
