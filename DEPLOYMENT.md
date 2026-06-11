# LUXE Fashion Store — Deployment Guide

## Environment Variables

Before deploying, configure the following environment secrets in Replit (Settings → Secrets):

### Required

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string (already set by Replit DB) |
| `SESSION_SECRET` | Random 64-char string for session signing |
| `JWT_SECRET` | Random 64-char string for JWT signing |

### Email (Resend)

| Variable | Description |
|----------|-------------|
| `RESEND_API_KEY` | From [resend.com](https://resend.com) dashboard |
| `RESEND_FROM_EMAIL` | Verified sender email (e.g. `noreply@yourdomain.com`) |
| `RESEND_FROM_NAME` | Display name (e.g. `LUXE Store`) |
| `APP_URL` | Your production domain (e.g. `https://luxe.replit.app`) |

> The app works without these — emails are silently skipped and a warning is logged.

### Image Uploads (Cloudinary)

| Variable | Description |
|----------|-------------|
| `CLOUDINARY_CLOUD_NAME` | From [cloudinary.com](https://cloudinary.com) dashboard |
| `CLOUDINARY_API_KEY` | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret |

> Without Cloudinary, the `/api/uploads/image` endpoint returns a 503. Existing product images (URLs) continue to work.

### Payments (Paymob)

| Variable | Description |
|----------|-------------|
| `PAYMOB_API_KEY` | From [accept.paymob.com](https://accept.paymob.com) |
| `PAYMOB_HMAC_SECRET` | HMAC secret from Paymob webhook settings |

Paymob integration IDs and iFrame ID are stored in the database via **Admin → Settings → Payment**.

> Without Paymob, only Cash on Delivery is available at checkout.

---

## First-Time Setup

### 1. Deploy on Replit

Click **Deploy** in the Replit workspace. Replit will build and host the application.

### 2. Run Database Migration

```bash
pnpm --filter @workspace/db run push
```

This is already run automatically on schema changes. For a fresh production database, run it once.

### 3. Seed Default Settings

After deployment, visit:

```
POST /api/settings/seed
Authorization: Bearer <admin-token>
```

Or use the Admin dashboard → Settings → **Seed Defaults** button.

### 4. Create Your Admin Account

1. Register at `/login` with your email
2. Run in the database:
   ```sql
   UPDATE users SET role = 'admin', email_verified = true
   WHERE email = 'your@email.com';
   ```
3. Log in — you now have full admin access

### 5. Configure Store Settings

In **Admin → Settings**:
- Set store name (English & Arabic)
- Upload your logo
- Add contact info and social links
- Configure Paymob integration IDs
- Set shipping rates

---

## Configuring Paymob

1. Create an account at [accept.paymob.com](https://accept.paymob.com)
2. Get your **API Key** from Settings → Account Info
3. Create payment integrations:
   - Online Card (Visa/Mastercard)
   - Meeza (optional)
   - Vodafone Cash (optional)
4. Note each **Integration ID**
5. Create a **Payment iFrame** and note its ID
6. Set webhook URL: `https://your-app.replit.app/api/payments/paymob/webhook`
7. Copy the **HMAC Secret** from webhook settings
8. Add `PAYMOB_API_KEY` and `PAYMOB_HMAC_SECRET` to Replit Secrets
9. Add Integration IDs and iFrame ID in Admin → Settings → Payment

---

## Configuring Resend

1. Sign up at [resend.com](https://resend.com)
2. Verify your sending domain (or use the free Resend sandbox domain)
3. Create an API key
4. Add `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `RESEND_FROM_NAME` to Replit Secrets
5. Set `APP_URL` to your deployed domain (for email links)

---

## Configuring Cloudinary

1. Sign up at [cloudinary.com](https://cloudinary.com) (free tier: 25 GB storage)
2. From your Dashboard, note: Cloud Name, API Key, API Secret
3. Add all three to Replit Secrets
4. (Optional) Create upload presets for `products/` and `banners/` folders

---

## Production Checklist

- [ ] All required env vars set in Replit Secrets
- [ ] Domain configured (custom domain in Replit Deploy settings)
- [ ] Admin account created and demo accounts deleted or password-changed
- [ ] Default settings seeded and configured (store name, logo, contact)
- [ ] Paymob integration IDs entered in Admin → Settings
- [ ] Resend domain verified (emails land in inbox, not spam)
- [ ] Test a full checkout flow (COD + Paymob)
- [ ] Review CORS_ORIGIN in `artifacts/api-server/src/index.ts` to match your domain

---

## Architecture Overview

```
Browser
  └── /          → React/Vite frontend (artifacts/store)
  └── /api       → Express API server (artifacts/api-server)
```

Both are served through Replit's reverse proxy from a single domain.

The API uses:
- **PostgreSQL** (Replit managed) for all data
- **JWT** (in localStorage) for authentication
- **Cloudinary** for image storage and optimization
- **Resend** for transactional emails
- **Paymob** for online payment processing

---

## Troubleshooting

**API returns 503 on image upload:**
→ Set `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`

**Emails not arriving:**
→ Set `RESEND_API_KEY` and `RESEND_FROM_EMAIL`; check that the domain is verified in Resend

**Paymob "integration ID not configured":**
→ Enter your Paymob integration IDs in Admin → Settings → Payment

**JWT errors after deployment:**
→ Ensure `JWT_SECRET` is set and consistent — changing it invalidates all existing tokens
