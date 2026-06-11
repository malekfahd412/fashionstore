---
name: Paymob payment flow
description: How Paymob online payment is integrated — 3-step server flow, webhook, and configuration.
---

## 3-Step Server Flow (POST /payments/paymob/initiate)
1. `POST /api/auth/tokens` → get auth token
2. `POST /ecommerce/orders` → register order with Paymob, get paymobOrderId
3. `POST /acceptance/payment_keys` → get payment token

Return `checkoutUrl` = `https://accept.paymob.com/api/acceptance/iframes/{iframeId}?payment_token={token}`

Frontend redirects to this URL.

## Webhook (POST /payments/paymob/webhook)
- Paymob sends HMAC-SHA512 signed transaction data
- Secret: `PAYMOB_HMAC_SECRET` env var
- On success: update payments table, update order status to `confirmed`, send order confirmation email

## Configuration split
| Where | What |
|-------|------|
| Env vars | `PAYMOB_API_KEY`, `PAYMOB_HMAC_SECRET` |
| store_settings table | `paymob_iframe_id`, `paymob_integration_id_card`, `paymob_integration_id_meeza`, `paymob_integration_id_vodafone` |
| Admin UI | Admin → Settings → Payment section |

## Payment methods supported
- `card` — Visa/Mastercard
- `meeza` — Egyptian national card
- `vodafone` — Vodafone Cash wallet

Each method uses a different `integration_id` from Paymob.
