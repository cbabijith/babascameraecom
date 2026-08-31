# Baba's Camera Admin

Next.js `16.2.11` admin dashboard for Baba's Camera commerce operations. It runs on port `3001` and uses better-auth (email/password sessions), Drizzle/PostgreSQL, shared UI primitives, React Hook Form, Zod, TanStack Table, and Sonner.

## Local URL

```text
http://localhost:3001
http://localhost:3001/login
```

## Setup

From the repository root:

```bash
bun install
copy apps\admin\.env.example apps\admin\.env.local
bun run dev:admin
```

Required values are documented in `.env.example`:

- `DATABASE_URL`
- `BETTER_AUTH_SECRET`
- `NEXT_PUBLIC_STOREFRONT_URL`
- `S3_*` credentials for Tigris media storage
- Razorpay refund credentials when testing provider-backed refunds

## Authentication

The admin panel uses a two-step authorization model:

1. better-auth verifies the email/password session (HTTP-only cookie).
2. Server code reads `public.users` and allows access only when the profile is active and `role = 'admin'`.

Behavior:

- Anonymous users are redirected to `/login`.
- Active admins are allowed into protected dashboard routes.
- Non-admin authenticated users are signed out and shown an access error.
- Already-authorized admins visiting `/login` are redirected to the requested page or `/dashboard`.
- Middleware checks protected navigation.
- Server components/actions also call admin permission guards before database access.

## UI State

The admin UI now includes:

- Baba's Camera logo copied from the storefront assets.
- Branded login screen.
- Password show/hide button.
- Instant submit feedback while admin access is verified.
- Dark collapsible sidebar.
- Active navigation state with accent color.
- Topbar with breadcrumb, notification button, and avatar.

## Modules

- Dashboard.
- Products, product images, variants.
- Categories.
- Brands.
- Orders and order status changes.
- Customers.
- Users and admin promotion.
- Coupons.
- Reviews.
- Settings.
- Invoice generation route.
- Refund API route.
- Health route.

## Folder Architecture

The admin app follows feature-driven clean architecture (see `src/features/README.md` for the full rules).

```text
src/app/                 Route layer only.
src/features/<feature>/  components/ domain/ schemas/ repositories/ services/ server/
src/components/          Shared shell and generic admin UI only.
src/lib/                 Cross-cutting infrastructure: auth, money, security, forms, events, API kernel.
```

Migrated features: auth, navigation, catalog, home-banners, orders,
customers, coupons, reviews, settings, users, dashboard.

Mutations publish domain events through `src/lib/events` after commit;
handlers own revalidation, customer emails, and audit logging.

Compatibility re-exports remain under `src/lib/auth` so existing modules keep working.

## Validation

```bash
bun run --cwd apps/admin type-check
bun run --cwd apps/admin lint
bun run --cwd apps/admin test
bun run --cwd apps/admin build
```

Recently verified:

- Type check passed.
- Lint passed.
- 29 admin tests passed.
- Production build passed.
- `/login` returns `200`.
- Unauthenticated `/dashboard` redirects to `/login`.

## Security Notes

- Server actions validate input with Zod.
- Admin mutations return a serializable action-result contract.
- Product descriptions are sanitized.
- Product image uploads validate MIME/type/size/signature.
- Refund API rejects unsafe cross-origin requests.
- Razorpay refund calls use exact integer paise and idempotency headers.
