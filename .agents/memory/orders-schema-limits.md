---
name: Orders table schema limits
description: Which columns do and don't exist on ordersTable; address table name.
---

## Rule
When building invoice/order features, use only these numeric columns on ordersTable:
- `totalPrice` — the grand total (numeric string, cast with Number())
- `discount` — applied discount amount (numeric string, may be null)

**Why:** There is no `shippingFee`, `shippingAddressId`, `totalAmount`, or `discountAmount` column on ordersTable. Adding code that reads those will fail at typecheck.

## How to apply
- Shipping address per-order: not stored in ordersTable. Must skip or fetch from a separate source.
- Addresses table: exported as `userAddressesTable` (not `addressesTable`) from `@workspace/db`.
- Shipping fee: hardcode 0 or add a column via migration if needed.
