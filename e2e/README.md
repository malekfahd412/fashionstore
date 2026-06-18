# VELORA E2E Tests

End-to-end tests powered by [Playwright](https://playwright.dev/).

## Setup

```bash
cd e2e
pnpm install
pnpm exec playwright install chromium
```

## Running Tests

```bash
# Against the local dev server (default)
pnpm test

# Against production
BASE_URL=https://yourapp.replit.app pnpm test

# With UI explorer
pnpm test:ui

# Debug mode (step through)
pnpm test:debug
```

## Test Suites

| File | What it tests |
|---|---|
| `registration.spec.ts` | New user registration, validation, duplicate prevention |
| `login.spec.ts` | Login/logout flow, auth redirect for protected routes |
| `cart.spec.ts` | Product listing, cart page, guest cart state |
| `checkout.spec.ts` | Checkout access control, billing form, cart-to-checkout |
| `order-tracking.spec.ts` | Order status page, customer dashboard orders tab |

## Notes

- Tests create real users in the DB. Use a separate test DB or clean up after runs.
- Set `ADMIN_EMAIL` / `ADMIN_PASSWORD` in `e2e/.env` for admin-flow tests.
- Screenshot and video artifacts are saved to `e2e/test-results/` on failure.
