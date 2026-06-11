---
name: Email service configuration
description: How email is configured, when it degrades gracefully, and what env vars are needed.
---

## Rule
Email never crashes a request. All sends are fire-and-forget (`.catch(() => {})`).

**Why:** Email is non-critical. If Resend is not configured (dev environment, or API key not yet set), requests must still succeed. The email.ts module checks `RESEND_API_KEY` and `RESEND_FROM_EMAIL` at call time, logs a warning, and returns early if either is missing.

## Required env vars
- `RESEND_API_KEY` — from Resend dashboard (managed via Replit Resend integration)
- `RESEND_FROM_EMAIL` — verified sender address (e.g. `noreply@yourdomain.com`)
- `RESEND_FROM_NAME` — display name (default: "LUXE Store")
- `APP_URL` — production domain for email links (default: `https://luxestore.com`)

## Email types implemented
1. `sendVerificationEmail` — sent on register
2. `sendWelcomeEmail` — sent on register
3. `sendPasswordResetEmail` — sent on forgot-password
4. `sendOrderConfirmationEmail` — sent after order creation (POST /orders)
5. `sendOrderStatusEmail` — sent after order status update (PATCH /orders/:id)
6. `sendVendorNewOrderEmail` — sent to each vendor with items in a new order
