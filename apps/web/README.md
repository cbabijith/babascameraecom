# Baba's Camera Storefront

Customer-facing Next.js storefront for Baba's Camera. It runs on port `3000` and uses Supabase Auth, Drizzle/PostgreSQL catalog data, server-side cart/checkout logic, Razorpay payment helpers, and the shared UI package.

## Local URL

```text
http://localhost:3000
```

## Setup

From the repository root:

```bash
bun install
copy apps\web\.env.example apps\web\.env.local
bun run dev:web
```

Required values are documented in `.env.example`:

- Supabase URL and public key.
- `DATABASE_URL`.
- Razorpay keys for online payment tests.
- Resend values for real email delivery.
- `CRON_SECRET` for internal job routes.

Keep all non-`NEXT_PUBLIC_` credentials server-only.

## Current UI State

The home page (`/`) has been restored to the older Baba's Camera look using the preserved storefront assets and the current product/catalog data path.

Important truth: the full storefront UI has not been restored yet. Product listing, product detail, cart, checkout, auth, and account pages still use the newer implementation.

## Main Routes

- `/`
- `/products`
- `/products/[slug]`
- `/categories`
- `/categories/[slug]`
- `/brands`
- `/brands/[slug]`
- `/search`
- `/cart`
- `/checkout`
- `/checkout/success/[orderNumber]`
- `/account`
- `/account/orders`
- `/wishlist`
- `/auth/*`
- `/contact`
- `/privacy`
- `/terms`
- `/shipping`
- `/returns`

## Commerce Behavior

- Catalog, brands, categories, reviews, and product data are read from the database.
- Cart writes run through server-side logic and respect stock limits.
- Coupon calculations are server-side.
- Checkout recalculates product, discount, shipping, and total values from the database.
- Razorpay signatures are verified before payment state changes.
- COD remains pending payment.
- Order data stores immutable snapshots of customer/shipping/product fields.

## Validation

```bash
bun run --cwd apps/web type-check
bun run --cwd apps/web lint
bun run --cwd apps/web test
bun run --cwd apps/web build
```

## Production Deployment

- Railway: follow [`../../docs/RAILWAY_WEB_DEPLOYMENT.md`](../../docs/RAILWAY_WEB_DEPLOYMENT.md).
- Railway configuration is defined in [`railway.json`](./railway.json).
- Copy variable names from [`.env.railway.example`](./.env.railway.example);
  keep all real credentials in Railway's Variables settings.

Known validation state:

- Web type-check, lint, tests, and production build passed after the home page restoration.
- `/` returned `200` locally and contained the restored old-home markers/assets.

## Next Storefront Work

- Restore old UI/UX for product listing, product detail, cart, checkout, auth, and account pages if the requirement is full legacy visual parity.
- Complete COD order lifecycle testing.
- Configure Razorpay test keys and certify live test checkout.
- Configure Resend/Supabase SMTP and verify email delivery.
- Run Playwright over the complete customer journey.
