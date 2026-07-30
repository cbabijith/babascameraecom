# Baba's Camera Commerce

Production-oriented ecommerce monorepo for Baba's Camera. The project contains a customer storefront, an administrator dashboard, shared UI/config packages, and one Drizzle-managed Supabase PostgreSQL schema.

The repository is currently built around real Supabase Auth and database access. The storefront home page has been restored to the older Baba's Camera visual direction; the rest of the storefront still uses the newer implementation. The admin panel has a refreshed branded login/admin shell, password visibility control, and Supabase-backed admin authorization.

## Current Status

| Area | Status | Notes |
| --- | --- | --- |
| Repository | Pushed to GitHub `main` | `git@github.com:cbabijith/babascameraecom.git` |
| Storefront app | Working locally on port `3000` | Home page uses old-style Baba's Camera UI; other pages are current implementation |
| Admin app | Working locally on port `3001` | Branded login, logo, sidebar, topbar, password reveal, admin auth guard |
| Supabase database | Migrated and validated | Drizzle migration creates commerce tables, RLS, storage bucket, auth trigger |
| Admin user | Verified in Supabase | Admin access is controlled by `public.users.role = 'admin'` and active status |
| Seed/test data | Present in Supabase | Canon brand, Cameras > DSLR category, Canon EOS 90D product, variants, images, test coupon |
| Razorpay | Code exists, live flow not certified | Test keys/webhook configuration are required for a real payment test |
| Resend/email | Outbox code exists, provider not certified | Resend domain/API/SMTP must be configured before real delivery |
| End-to-end checkout | Partially verified | Cart/coupon data path verified; real Razorpay order flow still needs provider keys |

## Workspace Map

| Workspace | Purpose | Local URL |
| --- | --- | --- |
| `apps/web` | Customer storefront built with Next.js App Router | `http://localhost:3000` |
| `apps/admin` | Admin dashboard built with Next.js App Router | `http://localhost:3001` |
| `packages/db` | Drizzle schema, database client, migrations, contracts | n/a |
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
- Database/Auth/Storage: Supabase
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

Storefront design language:

- Editorial grid.
- Generous whitespace.
- Product photography centered.
- Minimal decoration.
- Old home page visual direction restored on `/`.

Admin design language:

- Dark collapsible sidebar: `#0F172A`.
- White/light content area.
- Breadcrumb topbar.
- Avatar and notification control.
- DataTable pattern for tabular modules.
- React Hook Form and Zod for forms.
- Skeleton loaders and Sonner notifications.

## Applications

### Storefront: `apps/web`

Primary customer-facing routes:

- `/` old-style home page restored with Baba's Camera assets.
- `/products` product listing.
- `/products/[slug]` product detail.
- `/categories`, `/categories/[slug]`.
- `/brands`, `/brands/[slug]`.
- `/cart`.
- `/checkout`.
- `/checkout/success/[orderNumber]`.
- `/account`, `/account/orders`.
- `/auth/*` customer auth routes.
- `/wishlist`.
- `/search`.
- Static information routes such as `/contact`, `/privacy`, `/terms`, `/shipping`, `/returns`.

Working areas:

- Product catalog reads from Supabase/Drizzle.
- Home page displays existing Baba's Camera visual assets and live catalog data where available.
- Cart supports adding/updating products and variants.
- Coupon application path is implemented server-side.
- Customer auth uses Supabase Auth.
- Order/account pages exist.

Known storefront gaps:

- Only the home page has been restored to the old UI/UX. Other storefront pages still use the newer UI.
- Real Razorpay success/failure flow must be tested with valid Razorpay test keys.
- Email confirmation/order email delivery needs provider-side setup.

### Admin: `apps/admin`

Primary admin routes:

- `/login`.
- `/dashboard`.
- `/products`, `/products/new`, `/products/[id]`, `/products/[id]/edit`.
- `/categories`.
- `/brands`.
- `/orders`, `/orders/[id]`.
- `/customers`, `/customers/[id]`.
- `/users`.
- `/coupons`.
- `/reviews`.
- `/settings`.
- `/unauthorized`.
- `GET /api/health`.
- `GET /api/orders/[id]/invoice`.
- `POST /api/admin/orders/[id]/refund`.

Admin modules:

- Dashboard metrics and recent orders.
- Products with variants and images.
- Categories, including parent/child structure.
- Brands with logo upload/URL support.
- Orders and order-status updates.
- Customers.
- Users and admin promotion.
- Coupons.
- Reviews.
- Settings.
- Invoice route.
- Refund API.

Admin UI updates completed:

- Baba's Camera logo copied from storefront assets into `apps/admin/public`.
- Login screen redesigned with brand panel and real logo.
- Password field now has show/hide control.
- Submit button gives instant pending feedback while Supabase/admin checks run.
- Sidebar now uses the Baba's logo, stronger active state, better profile block, and cleaner layout.
- Topbar now has improved breadcrumb styling, notification button, avatar styling, and search placeholder.

Admin authentication model:

- Login uses Supabase Auth email/password.
- After Supabase login, server code verifies the matching row in `public.users`.
- Access is allowed only when the profile is active and `role = 'admin'`.
- Non-admin authenticated sessions are signed out and shown an access error.
- Already-authorized admins visiting `/login` are sent directly to the requested page or `/dashboard`.
- Protected dashboard routes use middleware and server-side `requireAdmin` checks.
- Server actions also call permission guards before mutating data.
- No service-role key is used in the admin frontend.

## Database Specification

The database is owned by `packages/db` and Drizzle. Drizzle is the migration authority.

Important tables:

- `users`: Supabase-auth-linked customer/admin profiles.
- `addresses`: customer shipping addresses.
- `brands`: catalog brands.
- `categories`: hierarchical catalog categories.
- `products`: catalog products, pricing, stock, SEO metadata.
- `product_images`: ordered product images with primary-image constraint.
- `product_variants`: product options with SKU, additional price, stock.
- `carts`: guest or user cart owner.
- `cart_items`: cart line items.
- `orders`: order totals, customer snapshot, payment and fulfilment state.
- `order_items`: immutable purchased item snapshots.
- `order_status_history`: admin/customer-visible order timeline.
- `coupons`: percentage/flat coupon rules.
- `coupon_redemptions`: reserved/applied/released coupon usage.
- `reviews`: product reviews and approval state.
- `wishlists`: customer product wishlist.
- `settings`: storefront/admin settings.
- `payment_events`: Razorpay/webhook/payment event ledger.
- `refunds`: refund requests and provider state.
- `newsletter_subscriptions`: newsletter signups.
- `email_outbox`: transactional email queue.
- `inventory_reservations`: temporary stock reservations for online payment.

Important enums:

- User roles: `customer`, `admin`.
- Order status: pending/confirmed/processing/shipped/delivered/cancelled/refunded lifecycle.
- Payment method: `razorpay`, `cod`.
- Payment status: `pending`, `paid`, `failed`, `refunded`.
- Coupon type: `percentage`, `flat`.
- Coupon redemption status: `reserved`, `applied`, `released`.
- Payment event outcome: `pending`, `processed`, `ignored`, `failed`.
- Refund status: `pending`, `processing`, `succeeded`, `failed`, `cancelled`.
- Email outbox status: `pending`, `processing`, `sent`, `failed`.
- Inventory reservation status: `reserved`, `consumed`, `released`.

Database invariants:

- `public.users.id` links to `auth.users.id`.
- Product and variant stock cannot be negative.
- Sale price cannot exceed MRP.
- Order totals must equal subtotal minus discount plus shipping.
- Order item totals must equal quantity times unit price.
- Carts have exactly one owner: either a user id or guest session id.
- Orders have at most one owner: user id or guest session hash.
- Coupon usage cannot exceed configured limits.
- One primary product image per product.
- Role and active-state updates are restricted.
- RLS is enabled on application tables.
- Product image storage has public reads and admin-only writes.

## Commerce Rules

- The browser never decides product price, discount, shipping, stock, or payment state.
- Server code recalculates totals from the database.
- Money is handled as exact decimal/integer paise at boundaries.
- COD means payment is pending, not paid.
- Razorpay success must be verified by signature before marking payment paid.
- Webhook events must be replay-safe.
- Refund requests are idempotent.
- Customer/order snapshots are immutable after order creation.
- Admin actions validate `FormData` with Zod and return serializable action results.
- Uploaded product media is checked by type, size, and magic bytes.
- Product rich text is sanitized.

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

Required public values:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` or `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_STOREFRONT_URL` for admin preview links

Required server values:

- `DATABASE_URL`
- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`
- `RAZORPAY_WEBHOOK_SECRET`
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`
- `CRON_SECRET`

Never expose these through `NEXT_PUBLIC_*`:

- `DATABASE_URL`
- Supabase service-role key
- Razorpay secret
- Razorpay webhook secret
- Resend API key
- Cron secret

Security note: credentials were used during local development. Rotate project credentials before production launch if any secret was shared outside a secure password manager.

## Local Development

Run both apps:

```bash
bun run dev
```

Run only storefront:

```bash
bun run dev:web
```

Run only admin:

```bash
bun run dev:admin
```

Local URLs:

- Storefront: `http://localhost:3000`
- Admin: `http://localhost:3001`
- Admin login: `http://localhost:3001/login`

## Database Commands

From the repository root:

```bash
bun run db:generate
bun run db:check
bun run db:validate
bun run db:migrate
```

From `packages/db`:

```bash
bun db:generate
bun db:check
bun db:validate
bun db:migrate
```

`db:migrate` requires a real `DATABASE_URL`. It should fail instead of silently migrating a fallback database.

## Quality Gates

Run from the repository root:

```bash
bun turbo run type-check
bun turbo run lint
bun turbo run test
bun turbo run build
```

Or use the root aggregate:

```bash
bun run check
```

Admin checks recently passed:

- Type check passed.
- Lint passed.
- 29 admin tests passed.
- Admin production build passed.

Previously verified full-repo checks:

- Type-check, lint, and test passed across the monorepo.
- 61 unit tests passed across database, web, and admin.
- Drizzle migration validation passed.

## Manual Acceptance Flow

Use a clean browser session and the Supabase/Razorpay test environment.

1. Start storefront on `http://localhost:3000`.
2. Start admin on `http://localhost:3001`.
3. Register a customer on the storefront.
4. Confirm the user exists in Supabase Auth and `public.users`.
5. Promote the user to admin from a trusted admin path or SQL session.
6. Sign in to admin at `/login`.
7. Create brand `Canon`.
8. Create category `Cameras`, then child category `DSLR`.
9. Create a product with:
   - Canon brand.
   - DSLR category.
   - MRP, sale price, cost price, stock, threshold, and weight.
   - Three JPEG/PNG/WebP product images.
   - Two variants with distinct SKUs and stock.
10. Create a test coupon in admin.
11. On storefront, open the product detail page.
12. Select a variant and add it to cart.
13. Apply the coupon in cart/checkout.
14. Place a Razorpay test order using card `4111 1111 1111 1111`.
15. Confirm order success page and database order/payment state.
16. In admin, change order status to `shipped` and add tracking details.
17. In storefront account orders, confirm the shipped status is visible.

Additional acceptance cases:

- COD checkout creates `paymentMethod = 'cod'` and `paymentStatus = 'pending'`.
- Invalid coupon is rejected.
- Out-of-stock cart/checkout is blocked.
- Non-admin user cannot access admin routes.
- Duplicate webhook does not duplicate state changes.
- Refund path is idempotent.

## A To Z Project Journey

1. Monorepo foundation was created with Bun workspaces.
2. Shared packages were added for database, UI, and configuration.
3. Drizzle schema was designed as the single database authority.
4. Supabase was selected for Auth, Postgres, Storage, and RLS.
5. Customer and admin profile model was connected to Supabase Auth.
6. Core commerce tables were created: catalog, carts, orders, coupons, payments, refunds, email outbox, inventory reservations.
7. RLS, database checks, indexes, constraints, and storage policies were added.
8. Storefront catalog routes were implemented.
9. Cart, checkout, coupon, and order logic were implemented server-side.
10. Razorpay signature/refund/payment helper code was added.
11. Resend/email outbox structure was added.
12. Admin dashboard modules were implemented for products, brands, categories, orders, customers, users, coupons, reviews, settings, invoices, and refunds.
13. Product image handling was built with Supabase Storage and server validation.
14. Admin actions were standardized with Zod validation and serializable action results.
15. Tests were added for money parsing, auth return paths, payment signatures, checkout/cart rules, rich-text security, image upload security, refund behavior, and order transitions.
16. Database migration was applied and validated against the Supabase project.
17. Live test catalog data was created: Canon, Cameras > DSLR, Canon EOS 90D, variants, images, and coupon.
18. GitHub remote was configured and the project was pushed to `main`.
19. The storefront old-style home page was restored using preserved legacy assets and current live data.
20. The admin panel was refreshed with Baba's Camera branding, logo, better sidebar/topbar, password reveal, and stronger login flow.
21. Current documentation was expanded into this specification.

## Deployment Plan

Recommended deployment:

| Surface | Root directory | Production domain |
| --- | --- | --- |
| Storefront | `apps/web` | `babascamera.com` |
| Admin | `apps/admin` | `admin.babascamera.com` |

Before deployment:

1. Rotate any credentials that were shared during development.
2. Configure Supabase Auth providers and redirect URLs.
3. Apply Drizzle migration to the intended Supabase project.
4. Configure Supabase Storage policies and product image bucket.
5. Configure Razorpay test keys and webhook.
6. Configure Resend domain, sender, API key, and Supabase SMTP if using email confirmations.
7. Add all env vars in the hosting provider.
8. Run type-check, lint, tests, build, and manual acceptance flow.
9. Certify Razorpay test checkout/refund.
10. Switch to live provider keys only after test-mode acceptance passes.

## Known Gaps And Next Work

Highest priority:

1. Restore the old UI/UX beyond the home page if the whole storefront must match the previous design.
2. Complete a full COD order lifecycle test.
3. Add real Razorpay test keys and certify online checkout.
4. Configure Resend/Supabase SMTP and verify email delivery.
5. Run Playwright against the complete customer/admin journey.
6. Review mobile layouts on storefront product/cart/checkout/account pages.
7. Add production deployment env vars and provider settings.

Do not claim these are complete until they are verified live.
