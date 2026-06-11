---
name: Customer auth token localStorage key
description: Which localStorage key holds the JWT for customer vs admin contexts
---

## Rule
- **Customer-facing code** (CustomerDashboard, SecurityCenterTab, api-client-react hooks): `localStorage.getItem("auth_token")`
- **Admin-facing code** (SecurityPanel, any admin component using raw fetch): `localStorage.getItem("token")`

**Why:** The two contexts were wired separately; mixing them causes silent 401 errors where the fetch sends no token.

**How to apply:** Whenever adding a new raw `fetch()` call in a component, first check whether it lives under `pages/` (customer, use "auth_token") or `components/SecurityPanel` / admin area (use "token").
