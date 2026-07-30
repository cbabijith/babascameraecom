# Baba's Camera Commerce

Production-oriented camera and photography-gear commerce monorepo for
`babascamera.com`. It contains a customer storefront, an admin application,
shared UI/configuration, and a single Drizzle-managed Supabase/PostgreSQL
schema.

## Workspace

| Workspace         | Purpose                                                           | Local URL               |
| ----------------- | ----------------------------------------------------------------- | ----------------------- |
| `apps/web`        | Next.js 15 customer storefront                                    | `http://localhost:3000` |
| `apps/admin`      | Next.js 15 admin dashboard                                        | `http://localhost:3001` |
| `packages/db`     | Drizzle schema, client, migration, and database contracts         | n/a                     |
| `packages/ui`     | Shared shadcn-style React components and brand tokens             | n/a                     |
| `packages/config` | Shared TypeScript, ESLint, Prettier, Tailwind, and PostCSS config | n/a                     |
| `tests/e2e`       | Playwright browser smoke and workflow tests                       | n/a                     |

The repository is pinned to Bun 1.3.14, Next.js 15.5.22, TypeScript 5.9.3,
Tailwind CSS 4.3.3, Drizzle ORM 0.45.2, and Drizzle Kit 0.31.10. Bun 1.3 writes
the current text-based `bun.lock`; the older `bun.lockb` format is not generated
by modern Bun.

## Prerequisites

- Bun 1.3.14
- A Supabase project
- A direct or project-qualified Supabase PostgreSQL pooler URL
- Razorpay test keys for an actual online-payment test
- A verified Resend sending domain for real email delivery
- Docker only if you want to run the optional local Supabase stack

Never expose `DATABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`,
`RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`, or `RESEND_API_KEY` to a
browser or commit them.

## Install and configure

```bash
bun install
cp .env.example .env
```

Fill `.env` with real local/test values. The Next.js browser clients require
`NEXT_PUBLIC_SUPABASE_URL` plus either `NEXT_PUBLIC_SUPABASE_ANON_KEY` or
`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Server integrations use the unprefixed
secrets.

For app-local development you may copy the applicable public/server values to
`apps/web/.env.local` and `apps/admin/.env.local`. In Vercel, configure the
variables separately for each project instead of relying on a checked-in file.

### Apply the database

Drizzle is the only migration authority. Do not create a second set of SQL
migrations under `supabase/migrations`.

```bash
bun run db:generate
bun run db:check
bun run db:migrate
bun run --cwd packages/db db:validate
```

`db:migrate` deliberately fails when `DATABASE_URL` is absent, contains a
placeholder password, or points at an unverified hosted project. For hosted
Supabase set the non-secret `SUPABASE_PROJECT_REF`. This project uses the
project-qualified IPv4 transaction-mode pooler on port 6543 for both migration
and runtime connections. The migration client is constrained to one connection
and prepared statements are disabled for pooler compatibility.

The initial migration:

- creates the commerce tables, checks, indexes, relations, order-number
  sequence, full-text product index, and default non-secret settings;
- links `public.users.id` to `auth.users.id` and creates the new-user trigger;
- enables RLS and narrow grants on every application table;
- prevents customers from changing their own role or active state;
- creates the public `product-images` bucket with a 5 MiB limit and JPEG, PNG,
  and WebP allowlist;
- grants public reads and admin-only writes for product media.

### Configure Supabase Auth

1. Enable Email/Password and Google in Supabase Authentication providers.
2. Keep email confirmation enabled.
3. Add these redirect URLs:
   - `http://localhost:3000/auth/callback`
   - `https://babascamera.com/auth/callback`
   - the equivalent Vercel preview callback pattern you explicitly trust
4. Set the production Site URL to `https://babascamera.com`.

Register the first account through the storefront, then promote it from a
trusted SQL session:

```sql
update public.users
set role = 'admin', updated_at = now()
where email = 'owner@example.com';
```

Do not add a public "make me admin" route or store the admin role only in user
metadata.

### Configure Razorpay

Use Test Mode keys while validating the checkout. Configure the webhook URL as:

```text
https://babascamera.com/api/webhooks/razorpay
```

Subscribe at minimum to `payment.captured`, `payment.failed`, and
`refund.created`, and set the same signing secret in
`RAZORPAY_WEBHOOK_SECRET`. Online orders are created on the server; amounts,
stock, coupon eligibility, and shipping are recalculated from the database.
Checkout and webhook signatures are verified before payment state changes.

### Configure Resend

Verify `babascamera.com` in Resend, create a server API key, and set:

```text
RESEND_API_KEY=...
RESEND_FROM_EMAIL=orders@babascamera.com
```

Order events first enter the database email outbox with a deterministic dedupe
key. Delivery retries therefore do not duplicate the commerce transaction.

Supabase Auth sends confirmation, password-reset, and OTP messages through its
own mailer. In the Supabase dashboard, configure **Authentication -> SMTP
Settings** with the verified Resend SMTP credentials and use an approved sender
such as `auth@babascamera.com`. The `RESEND_API_KEY` above remains server-only
and is used by the storefront order-email outbox.

## Develop

Start both applications:

```bash
bun run dev
```

Or run one surface:

```bash
bun run dev:web
bun run dev:admin
```

The storefront uses port 3000. The admin package pins port 3001.

## Quality gates

Run the requested checks from the repository root:

```bash
bun turbo run type-check
bun turbo run lint
bun turbo run test
bun turbo run build
```

Database checks:

```bash
cd packages/db
bun db:generate
bun db:check
bun db:validate
bun db:migrate
```

The first three can run without cloud credentials. `db:migrate` requires the
target Supabase `DATABASE_URL`; it must not silently migrate a fallback
database.

Browser tests:

```bash
bun run --cwd tests/e2e e2e
```

Real Razorpay, Resend, Google OAuth, and hosted Supabase delivery can only be
certified with their corresponding test credentials and provider-side
configuration. Unit tests and deterministic adapters cover signatures,
calculation, validation, idempotency, and failure handling without pretending
to contact those providers.

## Required manual acceptance flow

Use a clean browser session and Razorpay Test Mode.

1. Open `/auth/register`, register a customer, confirm the email, and verify
   that `public.users` contains the same UUID as `auth.users`.
2. Promote that account with the trusted SQL statement above. Sign in at
   `http://localhost:3001/login` and verify `/dashboard` loads.
3. In `/brands`, create **Canon**.
4. In `/categories`, create parent **Cameras**, then child **DSLR**.
5. In `/products/new`, create an active product assigned to Canon/DSLR with:
   - MRP, sale price, cost price, stock, threshold, and weight;
   - three JPEG/PNG/WebP images, one marked primary and reordered;
   - two variants with distinct SKUs and stock.
6. Sign out of admin. On the storefront product page, select a variant and add
   it to the cart. Confirm quantity, price, stock ceiling, and cart badge.
7. Back in admin `/coupons`, create a valid test coupon. Apply it in `/cart`
   and confirm the server-calculated discount and shipping total.
8. Choose Razorpay in `/checkout`. In Test Mode use card
   `4111 1111 1111 1111`, any future expiry, and any three-digit CVV. Complete
   the mock bank success step. Confirm the success page, paid/confirmed state,
   stock change, cart clearing, one status-history row, and one confirmation
   outbox entry.
9. In admin `/orders/[id]`, change the order to **shipped**, add carrier and
   tracking details, and download/print the invoice.
10. In storefront `/account/orders/[orderNumber]`, confirm the shipped status,
    timeline, and tracking details.

Repeat checkout with COD and confirm it produces
`paymentMethod='cod'`, `paymentStatus='pending'`, and `status='confirmed'`.
Also test a declined Razorpay attempt, a duplicate webhook delivery, an expired
reservation, an out-of-stock race, an invalid coupon, an unauthorized admin
request, and a full refund.

## Deployment

Create two Vercel projects from the same repository:

| Project    | Root directory | Domain                  |
| ---------- | -------------- | ----------------------- |
| Storefront | `apps/web`     | `babascamera.com`       |
| Admin      | `apps/admin`   | `admin.babascamera.com` |

Use Bun for install/build commands and keep the lockfile committed. Configure
all production secrets in Vercel project settings. The admin project needs
Supabase public auth values and `DATABASE_URL`; the storefront additionally
needs Razorpay and Resend server values. Never expose the service-role key or
Razorpay key secret through `NEXT_PUBLIC_*`.

The storefront's `vercel.json` invokes `/api/internal/jobs` every five minutes
for reservation expiry, refunds, and email-outbox delivery. Set the same
high-entropy `CRON_SECRET` in the storefront Vercel project; Vercel supplies it
as a bearer token to cron requests. Sub-daily schedules require a Vercel plan
that supports them. On other plans, run the same authenticated endpoint from a
reliable external scheduler at an equivalent interval.

Before a production deployment:

1. run every quality gate;
2. apply the checked Drizzle migration to the intended Supabase project;
3. configure Auth redirects, Google OAuth, Razorpay webhook, and Resend DNS;
4. verify test-mode checkout and refund end to end;
5. switch to live provider keys only after that acceptance passes.

## Commerce invariants

- The browser never decides chargeable prices, discount, shipping, or stock.
- Money is parsed as exact integer paise at application boundaries.
- Product and variant stock cannot become negative.
- Pending online checkout uses expiring inventory reservations; consume and
  release operations are idempotent.
- Order items and shipping/customer fields are immutable snapshots.
- Payment state and fulfilment state are separate.
- COD is an amount due, never a successful online payment.
- Checkout callback and webhook signatures are verified server-side.
- Provider event IDs, refunds, coupons, emails, and order creation have replay
  guards.
- Customer, admin, and public access are enforced both in server code and RLS.
- Product HTML is sanitized before display and image uploads are checked by
  content signature, type, size, randomized path, and storage policy.
