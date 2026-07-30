# Baba's Camera Admin

Next.js `16.2.11` admin dashboard for Baba's Camera commerce operations. It runs on port `3001` and uses Supabase Auth, Drizzle/PostgreSQL, shared UI primitives, React Hook Form, Zod, TanStack Table, and Sonner.

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

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` or anon key
- `DATABASE_URL`
- `NEXT_PUBLIC_STOREFRONT_URL`
- Razorpay refund credentials when testing provider-backed refunds

Do not put a Supabase service-role key in this app.

## Authentication

The admin panel uses a two-step authorization model:

1. Supabase Auth verifies the email/password session.
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

The admin app is being moved to feature-driven clean architecture.

Current target structure:

```text
src/app/                 Route layer only.
src/features/<feature>/  Feature UI, server actions, schemas, and business logic.
src/components/          Shared shell and generic admin UI only.
src/lib/                 Cross-cutting infrastructure and utilities only.
```

Started feature migration:

- `src/features/auth/components/login-form.tsx`
- `src/features/auth/server/actions.ts`
- `src/features/auth/server/admin.ts`
- `src/features/navigation/navigation-items.ts`
- `src/features/navigation/components/admin-sidebar-nav.tsx`

Compatibility re-exports remain under `src/lib/auth` so existing modules keep working while the rest of the admin app is migrated safely.

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
