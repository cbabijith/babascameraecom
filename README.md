# Baba's Camera Commerce

Production-oriented ecommerce monorepo for Baba's Camera. The project contains a customer storefront, an administrator dashboard, shared UI/config packages, and one Drizzle-managed PostgreSQL schema.

Authentication runs on better-auth (email/password plus optional Google OAuth on the storefront), the catalog and orders live in PostgreSQL via Drizzle, and product/banner media is stored in a private Tigris (S3-compatible) bucket streamed through each app's own `/api/media` proxy.

## Current Status

| Area | Status | Notes |
| --- | --- | --- |
| Repository | Pushed to GitHub `main` | `git@github.com:cbabijith/babascameraecom.git` |
| Storefront app | Live on Railway (CLI deploys) | Service `user`; Vercel migration planned |
| Admin app | Live on Railway (GitHub auto-deploy) | Builds from the repo root — see `DEPLOYMENT.md` |
| Database | Railway PostgreSQL (`pg-sg`, Singapore) | Shared by web + admin; Drizzle is the migration authority |
| Auth | better-auth, in production | Email/password + Google OAuth (storefront); role-based admin access |
| Storage | Private Tigris bucket | Canonical image URLs; per-app media proxies |
| Razorpay | Integrated | Bank-transfer/COD lifecycle verified; provider keys required for card flow |
| Resend/email | Outbox pattern in production | Web's `/api/internal/jobs` drains the queue on a schedule |

## Workspace Map

| Workspace | Purpose | Local URL |
| --- | --- | --- |
| `apps/web` | Customer storefront built with Next.js App Router | `http://localhost:3000` |
| `apps/admin` | Admin dashboard built with Next.js App Router | `http://localhost:3001` |
| `packages/db` | Drizzle schema, database client, better-auth factory, migrations | n/a |
| `packages/ui` | Shared shadcn-style UI primitives and styles | n/a |
| `packages/config` | Shared lint, TypeScript, PostCSS, Tailwind config | n/a |
| `tests/e2e` | Playwright smoke/workflow tests | n/a |

## Technology Stack

- Runtime/package manager: Bun `1.3.14`
- Framework: Next.js `16.2.11` for admin, Next.js `15.5.22` for storefront
- Language: TypeScript `5.9.3`
- Styling: Tailwind CSS `4.3.3`
- Database ORM: Drizzle ORM `0.45.2`
- Migrations: Drizzle Kit `0.31.10`
- Auth: better-auth `1.7.1`
- Object storage: Tigris (S3-compatible), private bucket + per-app media proxy
- Tables: TanStack Table v8 through shadcn-style table components
- Forms: React Hook Form, Zod, shadcn-style form components
- Notifications: Sonner
- Icons: Lucide React
- Payments: Razorpay integration code
- Email: Resend/order outbox integration code

## Brand And Design System

The brand direction is Baba's Camera: premium, editorial, camera-first, and clean.

| Token | Value | Usage |
| --- | --- | --- |
| Primary | `#1A1A2E` | Text, hero panels, premium dark surfaces |
| Accent | `#E94560` | CTAs, active states, sale badges |
| Surface | `#F8F8F8` | Storefront/admin page backgrounds |
| Muted text | `#6B7280` | Secondary copy |
| Success | `#10B981` | Success states |
| Warning | `#F59E0B` | Warning states |
| Error | `#EF4444` | Validation/destructive states |

Typography target:

- Display: `Playfair Display`
- Body/UI: `Inter`
- Mono: `JetBrains Mono`

Admin design language: dark collapsible sidebar (`#0F172A`), light content area, breadcrumb topbar, DataTable pattern, skeleton loaders, Sonner notifications.

## Authentication Model

- better-auth owns sessions (HTTP-only cookies), password hashing, and account linking for both apps against the shared `users`/`accounts`/`sessions` tables.
- The storefront exposes email/password sign-up/sign-in plus optional Google OAuth (env-gated via `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`).
- The admin panel signs in with email/password and requires an active `public.users` row with `role = 'admin'`.
- Authorization is enforced server-side: page middleware, server-action guards, and per-permission API route guards (`catalog`, `orders`, `customers`, `promotions`, `reviews`, `settings`).
- Cross-origin mutations are rejected via same-origin checks in the API guards.

## Database Specification

The database is owned by `packages/db` and Drizzle. Drizzle is the migration authority. The initial migration predates the move off managed Postgres-with-RLS hosting and still creates compatibility objects (`auth`/`storage` schemas, `anon`/`authenticated` roles); fresh plain-PostgreSQL environments apply `packages/db/scripts/legacy-compat-schema.sql` (`bun run --cwd packages/db db:compat`) before `db:migrate`.

Important tables:

- `users`, `accounts`, `sessions`: better-auth identities and admin/customer profiles.
- `addresses`: customer shipping addresses.
- `brands`, `categories`, `products`, `product_images`, `product_variants`: catalog.
- `carts`, `cart_items`: guest or user carts.
- `orders`, `order_items`, `order_status_history`: order lifecycle with immutable snapshots.
- `coupons`, `coupon_redemptions`: promotion rules and usage.
- `payment_events`, `refunds`, `inventory_reservations`: payment ledger, refunds, stock holds.
- `reviews`, `wishlists`, `newsletter_subscriptions`, `settings`, `email_outbox`.

Key invariants:

- Product and variant stock cannot be negative; sale price cannot exceed MRP.
- Order totals must equal subtotal − discount + shipping; item totals equal quantity × unit price.
- Carts/orders have exactly one owner (user id or guest session).
- One primary product image per product; coupon usage cannot exceed limits.
- Role and active-state updates are restricted.

## Commerce Rules

- The browser never decides product price, discount, shipping, stock, or payment state.
- Server code recalculates totals from the database.
- Money is handled as exact decimal/integer paise at boundaries.
- COD means payment is pending, not paid; COD delivered orders auto-mark paid.
- Razorpay success must be verified by signature before marking payment paid.
- Webhook events must be replay-safe; refund requests are idempotent.
- Customer/order snapshots are immutable after order creation.
- Admin actions validate `FormData` with Zod and return serializable action results.
- Uploaded product media is checked by type, size, and magic bytes; rich text is sanitized.

## Environment Configuration

Do not commit real secrets. Local env files are ignored.

Root setup:

```bash
bun install
copy .env.example .env
```

App-local setup:

```bash
copy apps\web\.env.example apps\web\.env.local
copy apps\admin\.env.example apps\admin\.env.local
```

Required values (see the `.env.example` files for the full list):

- `DATABASE_URL` — PostgreSQL URL (TLS for remote databases).
- `BETTER_AUTH_SECRET` — session signing key for each app.
- `NEXT_PUBLIC_STOREFRONT_URL` / `NEXT_PUBLIC_ADMIN_URL` — cross-app links.
- `S3_*` — Tigris credentials for media.
- `RAZORPAY_*`, `RESEND_*`, `CRON_SECRET` — integrations.

Never expose these through `NEXT_PUBLIC_*`: `DATABASE_URL`, `S3_SECRET_ACCESS_KEY`, Razorpay secrets, Resend API key, cron secret.

## Local Development

```bash
bun run dev        # both apps
bun run dev:web    # storefront only
bun run dev:admin  # admin only
```

Local URLs: storefront `http://localhost:3000`, admin `http://localhost:3001` (login at `/login`).

## Database Commands

From the repository root:

```bash
bun run --cwd packages/db db:compat   # legacy auth/storage compatibility objects (fresh DBs only)
bun run db:generate
bun run db:check
bun run db:validate
bun run db:migrate
```

`db:migrate` requires a real `DATABASE_URL`. It should fail instead of silently migrating a fallback database.

## Quality Gates

Run from the repository root:

```bash
bun run check    # type-check + lint + test + build
```

CI (`.github/workflows/ci.yml`) runs static checks and builds, applies the Drizzle migration to a PostgreSQL service container, and runs Playwright smoke tests against both apps with seeded better-auth fixtures.

## Manual Acceptance Flow

Use a clean browser session against local dev servers with a migrated database.

1. Start storefront on `http://localhost:3000` and admin on `http://localhost:3001`.
2. Register a customer on the storefront (`/signUp`).
3. Promote a test user to admin via SQL (`update users set role='admin' where email=…`).
4. Sign in to admin at `/login`.
5. Create brand/category/product with variants and images.
6. On the storefront, add to cart, apply a coupon, place a COD or Razorpay test order.
7. In admin, move the order through confirmed → processing → shipped (with carrier + tracking) → delivered.
8. Confirm the storefront account order view reflects each state and COD auto-pays on delivery.

Additional acceptance cases: invalid coupon rejected; out-of-stock checkout blocked; non-admin cannot access admin routes; duplicate webhook does not duplicate state changes; refund path is idempotent.

## Deployment

Admin deploys to Railway from GitHub `main` (repo-root build); the storefront is CLI-deployed to Railway while its Vercel migration is pending. See `DEPLOYMENT.md` for the build rules, the monorepo constraint, and the verification checklist. Rotate any credential that was shared during development before production launch.
