# Architecture

## Runtime topology

```text
Browser
  ├─ babascamera.com ───────── apps/web (Next.js 15)
  └─ admin.babascamera.com ─── apps/admin (Next.js 15)
                │
                ├─ Supabase Auth (SSR cookies)
                ├─ Supabase Storage (product-images)
                ├─ PostgreSQL through @babascamera/db
                ├─ Razorpay Orders/Payments/Refunds APIs
                └─ Resend through the email outbox worker
```

Both applications are React Server Component applications. Browser components
only own interaction state. Protected reads and every commerce mutation execute
on the server. PostgreSQL RLS remains a second boundary when a Supabase JWT is
used directly.

## Package boundaries

- `@babascamera/db` owns every table, enum, relation, migration, exact-money
  conversion, and the lazy Postgres client.
- `@babascamera/ui` owns reusable shadcn-style primitives and brand tokens. It
  has no application or database knowledge.
- `@babascamera/config` owns strict TypeScript, ESLint, Prettier, Tailwind, and
  PostCSS configuration.
- `apps/web` owns customer auth, catalog reads, guest/customer carts, checkout,
  account pages, payment webhooks, and customer email scheduling.
- `apps/admin` owns admin authorization, catalog/customer/order operations,
  invoices, and refund initiation.

No app imports source from another app. Shared code must move to a package.

## Data model

The required commerce tables are:

```text
auth.users ──1:1── users ──< addresses
                    ├──────< carts ──< cart_items >── products
                    ├──────< orders ──< order_items >── products
                    ├──────< reviews >── products
                    └──────< wishlists >── products

brands ──< products >── categories ──< categories
products ──< product_images
products ──< product_variants

coupons ──< coupon_redemptions >── orders
orders ──< order_status_history
orders ──< inventory_reservations
orders ──< payment_events
orders ──< refunds
orders ──< email_outbox
```

`settings` stores validated non-secret JSON. `newsletter_subscriptions` stores
consent state. Supporting transaction tables make retries and provider
callbacks auditable and idempotent.

## Checkout state

### Razorpay

1. Resolve the authenticated or signed guest cart on the server.
2. Lock the selected product/variant rows in deterministic order.
3. Re-read active state, stock, database prices, coupon, and shipping settings.
4. Create the pending local order, immutable items, coupon reservation, and
   expiring stock reservations in one transaction.
5. Create/reconcile the Razorpay Order using the public order number as receipt.
6. Return only the provider order ID, amount in paise, public key ID, and order
   number to the browser.
7. Standard Checkout returns provider IDs and a signature.
8. Verify the signature using the provider order ID stored in PostgreSQL, then
   fetch and require an exact captured payment.
9. Under a row lock, consume reservations, mark the order paid/confirmed, clear
   the cart, and enqueue a confirmation email exactly once.
10. Webhooks repeat the same idempotent transition and reconcile delayed events.

An invalid callback cannot fulfil an order. A duplicate callback cannot
decrement stock twice. A capture arriving after inventory release is
compensated instead of overselling.

### Cash on delivery

COD repeats the authoritative cart calculation and locks. It also validates the
configured maximum value and pincode rules. The transaction creates and
confirms the order, consumes inventory, clears the cart, and enqueues email.
The resulting payment state remains `pending`.

## Auth and authorization

- Supabase owns credentials, OAuth, email confirmation, reset tokens, and SSR
  session cookies.
- A database trigger creates the matching `public.users` row as an active
  customer. Auth metadata cannot choose an admin role.
- Admin middleware refreshes the session and rejects absent, inactive,
  non-admin profiles.
- Admin actions re-check authorization; middleware is not the only guard.
- Customer actions resolve the authenticated user or an opaque, HTTP-only,
  same-site guest-cart cookie.
- Guest order ownership is stored only as a SHA-256 hash. Raw guest tokens are
  never written to PostgreSQL.

## Money and inventory

PostgreSQL stores `numeric(10,2)` values because that is the requested public
schema. TypeScript parses them to integer paise before calculation and rejects
floating-point input, excess scale, unsafe integers, and values outside the
column range.

Stock updates use transactions and row locks. Product-level and variant-level
stock cannot become negative. Online payment uses expiring reservations; COD
consumes immediately. Reservation lifecycle timestamps and statuses prevent
duplicate release or consume operations.

## Provider reliability

- Razorpay requests have bounded timeouts and ambiguous failures are
  reconciled before retrying.
- Refunds use provider idempotency plus a database idempotency key.
- Webhook bodies are verified before JSON processing and provider event IDs are
  unique.
- Email is an outbox side effect. A failed Resend call cannot roll back or
  duplicate a paid order.
- Secrets are environment-only. Settings expose only an allowlisted set of
  storefront-safe values.

## Migration ownership

`packages/db/drizzle/*_initial_commerce.sql` is authoritative. It includes the
Drizzle-generated relational schema and reviewed Supabase-specific SQL for
Auth, RLS, grants, Storage, FTS, triggers, and assertions. The PGlite validation
script creates Supabase-compatible stubs, executes every statement, exercises
the auth trigger and timestamp triggers, and confirms all 22 application tables
have RLS.
