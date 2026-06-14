---
name: Payment history endpoint
description: Structure of GET /payments/my endpoint and CustomerDashboard PaymentHistoryTab
---

## Endpoint: GET /payments/my

Requires `requireAuth`. Returns two arrays:

```ts
{
  paymob: { id, orderId, amountCents, currency, status, method, createdAt }[]
  manual: { id, orderId, method, status, referenceNumber, adminNote, createdAt, orderTotal }[]
}
```

- `paymob.amountCents` — integer cents, divide by 100 for display
- `manual.orderTotal` — string from ordersTable.totalPrice (numeric type)
- Both arrays sorted by createdAt DESC

**Why:** paymentsTable has `amountCents` not `amount`; ordersTable scoping via INNER JOIN ensures users only see their own payments.

## PaymentHistoryTab location

`artifacts/store/src/pages/CustomerDashboard.tsx` — component defined just before `SupportTab`. Tab registered in NAV_TABS as `value: "payment-history"` with CreditCard icon.
