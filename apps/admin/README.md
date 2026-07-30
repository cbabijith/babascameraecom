# Baba's Camera Admin

The admin application is a Next.js 15.5 App Router application on port `3001`.
It uses Bun, Supabase SSR authentication, the shared Drizzle schema, and the
shared UI/config packages.

## Local setup

From the repository root:

```bash
bun install
copy apps\admin\.env.example apps\admin\.env.local
bun run dev:admin
```

Required runtime values are documented in `.env.example`:

- Supabase URL and browser-safe publishable key for cookie auth and
  administrator-authorized Storage uploads.
- `DATABASE_URL` for server-only Drizzle queries and transactions.
- `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` for provider-backed refunds.
- Storefront URL for the preview link.

No service-role key or Razorpay secret is exposed to the browser.

## Security model

Middleware refreshes the Supabase session, verifies the profile in `users`, and
admits only active `admin` roles. Every read and Server Action repeats an
administrator permission guard before using the shared database client.
Customer status changes are constrained to `role = customer`. The dedicated
`/users` screen can promote an active customer to administrator only after an
already-authorized administrator confirms the irreversible access change.
UI mutation actions validate `FormData` with Zod and return the serializable
`AdminActionResult` contract. Expected validation and business failures are
shown through Sonner; database and provider errors are logged server-side and
replaced with safe fallback messages.

Product descriptions are sanitized through a strict HTML allowlist. Product
images are uploaded to the public `product-images` bucket through authenticated
Storage RLS. Only JPEG, PNG, and WebP content is accepted; magic bytes must
match the declared MIME type and each file is limited to 5 MiB.

Razorpay refunds use exact integer paise, the documented
`X-Refund-Idempotency` header, a deterministic order UUID key, response identity
checks, and reconciliation for in-progress provider refunds. The explicit
refund API also enforces same-origin requests.

## Routes

- `/dashboard`
- `/products`, `/products/new`, `/products/[id]/edit`
- `/categories`, `/brands`
- `/orders`, `/orders/[id]`
- `/customers`, `/customers/[id]`
- `/users`
- `/coupons`, `/reviews`, `/settings`
- `GET /api/orders/[id]/invoice`
- `POST /api/admin/orders/[id]/refund`
- `GET /api/health`

Settings forms upsert the storefront-authoritative keys `store.profile`,
`shipping.rules`, `cod.rules`, `seo.defaults`, `notifications.toggles`, and
`homepage.hero`. Payment credentials remain environment-only.

## Validation

```bash
bun run --cwd apps/admin type-check
bun run --cwd apps/admin lint
bun run --cwd apps/admin test
bun run --cwd apps/admin build
```

The local suite covers exact money parsing, safe return URLs, rich-text XSS
defences, image signatures and limits, order transitions, refund headers and
provider response validation, and refund API origin rejection. Live Supabase
and Razorpay behavior requires configured test projects and credentials.
