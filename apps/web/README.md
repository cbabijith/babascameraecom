# Baba's Camera Storefront

Customer-facing Next.js 16 storefront for Baba's Camera. It runs on port `3000`
and uses React 19, better-auth (email/password plus optional Google OAuth),
Drizzle/PostgreSQL catalog data, server-side cart/checkout logic, Razorpay
payment helpers, and the shared UI package.

## Runtime and tooling

- Next.js `16.2.12` with the App Router and default Turbopack builds.
- React and React DOM `19.2.8`.
- TypeScript `6.0.3`, the newest stable release supported by the current
  TypeScript ESLint parser.
- ESLint `9.39.5`, Tailwind CSS `4.3.3`, and Vitest `4.1.10`.
- Node.js `20.9.0` or newer and Bun `1.3.14`.

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

- `DATABASE_URL`.
- `BETTER_AUTH_SECRET`.
- `S3_*` credentials for Tigris media storage.
- Razorpay keys for online payment tests.
- Resend values for real email delivery.
- `CRON_SECRET` for internal job routes.

Keep all non-`NEXT_PUBLIC_` credentials server-only.

## Homepage architecture

The homepage uses an aggregated public HTTP API:

`page.tsx -> validated API client -> /api/storefront/home -> handler -> service -> repository -> PostgreSQL`

The initial homepage catalogue does not use browser-side fetching or direct
database access from React components. See
[`src/features/home/README.md`](./src/features/home/README.md) for its contract,
caching, security, and media rules.

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

## Remaining external verification

- Complete COD order lifecycle testing.
- Configure Razorpay test keys and certify live test checkout.
- Configure Resend and verify email delivery.
- Run Playwright over the complete customer journey.
