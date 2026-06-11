# First Super Admin Bootstrap

This document describes the two supported methods for creating the first admin account. Both options run **once only** — if an admin already exists, they exit without creating a duplicate.

Admin accounts are **never** creatable through the public API. The `/auth/register` endpoint strips `role: "admin"` and forces it to `"customer"`.

---

## Option A — CLI Command (recommended)

Run this command from the project root with your database URL:

```bash
DATABASE_URL="postgres://user:pass@host:5432/db" pnpm --filter @workspace/scripts create-admin admin@yourstore.com "YourSecurePassword123!"
```

### Rules
- The email must be a valid address.
- The password must be **at least 12 characters**.
- If any admin already exists, the script **exits with an error** and does nothing.
- If the email already exists as a different role, the script exits and tells you to use a direct SQL UPDATE instead.
- The script produces no sensitive output to logs.

### What it does
1. Connects to the database via `DATABASE_URL`.
2. Checks `SELECT id FROM users WHERE role = 'admin'` — exits if any row is found.
3. Hashes the password with bcrypt (cost factor 12).
4. Inserts the user with `role = 'admin'`, `email_verified = true`.
5. Prints the new user ID and email to stdout.

---

## Option B — Environment Variables (for containerised deployments)

Set two environment variables before starting the API server:

```
ADMIN_EMAIL=admin@yourstore.com
ADMIN_PASSWORD=YourSecurePassword123!
```

The server reads these at startup (`src/index.ts` → `bootstrap/firstAdmin.ts`):
- If an admin already exists → skips silently (logs a single info line).
- If no admin exists → creates one with the supplied credentials.
- After creation, **both env vars are deleted from the process environment** so they don't persist in memory.

### Important
- Remove `ADMIN_EMAIL` and `ADMIN_PASSWORD` from your environment/container spec after the first successful deployment.
- Both vars must be set together; either alone is ignored.

---

## Promoting an Existing User to Admin

If the user already has an account and you just need to elevate their role:

```sql
UPDATE users SET role = 'admin' WHERE email = 'existing@user.com';
```

This is the only safe path when an admin already exists.

---

## Revoking Admin Access

```sql
UPDATE users SET role = 'customer' WHERE email = 'demoted@user.com';
```

Or use the Admin Panel → Users → Edit User to change the role via the UI.

---

## Security Notes

- Never expose `ADMIN_PASSWORD` in version control, CI logs, or Docker image layers.
- Use a password manager to generate a strong password (16+ chars, mixed case, numbers, symbols).
- Rotate the admin password after the first login via the account settings page.
- The first-admin script cannot be used again once an admin exists — subsequent promotions must go through the Admin Panel or direct SQL.
