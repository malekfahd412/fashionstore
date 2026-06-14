---
name: useSEO hook
description: Per-page dynamic document.title and meta description management
---

## Location

`artifacts/store/src/hooks/useSEO.ts`

## Usage

```ts
useSEO({ title?: string, description?: string })
```

- Sets `document.title` to `${title} — Velora`
- Updates `meta[name="description"]` content
- Restores both on component unmount
- If `title` is undefined/falsy, skips update (safe for async-loaded data)

## Rules of Hooks compliance

Call unconditionally at the top of the component. For data loaded asynchronously (e.g., product name), pass `product?.nameEn` — it will be undefined on first render and auto-update when data loads.

## Applied to pages

Home, Products, ProductDetails, About, Contact, CustomerDashboard.

**Why:** document.title must be managed in useEffect to avoid SSR issues and properly restore previous titles on navigation.
