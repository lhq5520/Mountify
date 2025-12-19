# ![DEMO](/public/images/DEMO.png)

# Mountify – Quick Start Guide

Mountify is a full‑stack e‑commerce demo built with Next.js App Router, TypeScript, PostgreSQL (Neon), NextAuth, and Stripe Checkout + Webhooks. This Readme is a concise, developer‑focused handoff derived from the full project README, intended for day‑to‑day setup, running, and troubleshooting.

## Overview

- Modern UI/UX with a global design system (globals.css)
- Secure checkout: server‑validated pricing + Stripe webhooks
- Auth via NextAuth; session surfaced in client with `useSession()`
- Cart backed by API endpoints; quantity and product validation server‑side
- Admin orders listing (intended to be gated in production)

## Tech Stack

- Frontend: Next.js (App Router) 16, React, TypeScript, Tailwind
- Backend: Next.js API Routes, NextAuth 5
- Database: PostgreSQL (Neon)
- Cache/Rate Limit (optional): Redis (Upstash)
- Payments: Stripe Checkout + Webhooks

## Prerequisites

- Node.js 18+ and a package manager (npm/yarn/pnpm/bun)
- Neon PostgreSQL database (connection string)
- Stripe account (test keys) + Stripe CLI for local webhook forwarding

## Latest Update

- 12/19/2025 Version 5i

## Environment Variables

Create `.env.local` in the project root and include **all** of the following (adjust to your setup):

```env
# Site URLs
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Database (Neon PostgreSQL)
DATABASE_URL=postgresql://user:password@host/database?sslmode=require

# Stripe Payment
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# NextAuth
AUTH_SECRET=...  # Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Redis (Upstash) - for rate limiting & caching
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_token_here

# Cloudinary - for image uploads
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Google OAuth (optional)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Facebook OAuth (optional)
FACEBOOK_CLIENT_ID=your_facebook_client_id
FACEBOOK_CLIENT_SECRET=your_facebook_client_secret

# Discord OAuth (optional)
DISCORD_CLIENT_ID=your_discord_client_id
DISCORD_CLIENT_SECRET=your_discord_client_secret

# Email (Resend)
RESEND_API_KEY=re_...
EMAIL_FROM=noreply@yourdomain.com
```

**Required variables** (app will not work without these):

- `DATABASE_URL`
- `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`
- `AUTH_SECRET`
- `NEXT_PUBLIC_SITE_URL`
- `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`
- `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
- `RESEND_API_KEY`, `EMAIL_FROM`
- `Google`: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`

**Optional variables** (for OAuth providers):

- Facebook: `FACEBOOK_CLIENT_ID`, `FACEBOOK_CLIENT_SECRET`
- Discord: `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`

## Install & Run

```bash
npm install
npm run dev
# open http://localhost:3000
```

To test webhooks locally:

```bash
stripe login
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

## Key Paths

- UI components: `src/app/components/`
- Global styles: `src/app/globals.css`
- App layout: `src/app/layout.tsx`
- Pages: `src/app/...`
- APIs (public): `src/app/api/...`
- Checkout: `src/app/api/checkout/route.ts`
- Webhooks: `src/app/api/webhooks/stripe/route.ts`
- Orders polling: `src/app/api/orders/session/[sessionId]/route.ts`
- Admin orders: `src/app/admin/orders/page.tsx` and `src/app/api/admin/orders/route.ts`

## Security Posture (Essentials)

- Pricing is validated server‑side in `/api/checkout` (frontend only sends `productId` + `quantity`).
- Stripe webhook verifies signatures and updates orders to `paid` when `checkout.session.completed`.
- Quantity is validated on the server (integer, bounded) to prevent abuse.
- Admin routes should be protected in production (authentication/authorization required).

## Common Issues & Fixes

- TypeScript: missing `pg` types → install dev types:
  ```bash
  npm i --save-dev @types/pg
  ```
- Path alias for components: ensure `tsconfig.json` has
  ```json
  {
    "compilerOptions": {
      "baseUrl": ".",
      "paths": {
        "@/*": ["./src/*"],
        "@/components/*": ["./src/app/components/*"]
      }
    }
  }
  ```
  Or import directly from `@/app/components/...`.

## Stripe Test Flow

1. Add products to cart → `/cart`
2. Click “Checkout with Stripe” (frontend posts to `/api/checkout`)
3. Redirect to Stripe hosted page (use test card `4242 4242 4242 4242`)
4. On success, Stripe redirects to `/checkout/success?session_id=...`
5. Success page polls `/api/orders/session/{sessionId}` until status is `paid` (set by webhook)

## Data Model Notes

- Products include `image_url`, `image_url_hover`, and `detailed_description` for richer UI.
- Orders track `status` (`pending` → `paid`) and `stripe_session_id` for correlation.
- Cart API joins product data and returns normalized items for the frontend.

## Development Tips

- Keep UI polish centralized in `globals.css` and shared components.
- Use `useSession()` in client components to read NextAuth session.
- Prefer server‑side validation for any sensitive inputs (price, quantity).
- Restart dev server after changing `.env.local` or Stripe CLI secrets.

## License

For personal learning and demo purposes. No production warranty - I mean I do think about in production way but you might need to refine to make it robust.
