# Hostinger deployment: customer storefront

This guide deploys `apps/web` as the customer-facing Next.js application.
Customer authentication uses Supabase cookie sessions. The bearer secret is
only for the private scheduled-jobs endpoint.

## 1. Hostinger application settings

Use a Hostinger Business or Cloud plan that supports Node.js applications.
Connect the GitHub repository and configure:

- Framework: Next.js
- Node.js: 22.x
- Repository root: repository root, not `apps/web`
- Install command: `bun install --frozen-lockfile`
- Build command: `bun run --cwd apps/web build`
- Start command: `bun run --cwd apps/web start`
- Application port: supplied by Hostinger through `PORT`

The repository root is required because `apps/web` imports workspace packages
from `packages/db`, `packages/ui`, and `packages/config`.

If Hostinger's managed builder does not provide Bun, use Node 22 and enable
Corepack before deployment, or deploy the application on a Hostinger VPS with
Bun 1.3.14 installed. Do not copy only `apps/web`; that removes its workspace
dependencies.

## 2. Environment variables

Copy the keys from `apps/web/.env.hostinger.example` into Hostinger:

`Websites -> your Node.js app -> Settings and redeploy -> Environment variables`

Never upload `.env.local`, `.env.production.local`, database passwords,
Razorpay secrets, Resend keys, or the cron secret to GitHub.

The following values are intentionally browser-visible:

- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_RAZORPAY_KEY_ID`
- Store contact values

The following must remain server-only:

- `DATABASE_URL`
- `RAZORPAY_KEY_SECRET`
- `RAZORPAY_WEBHOOK_SECRET`
- `CRON_SECRET`
- `RESEND_API_KEY`

Generate the Hostinger cron bearer secret locally:

```powershell
[Convert]::ToBase64String([Security.Cryptography.RandomNumberGenerator]::GetBytes(48))
```

Save the generated value as `CRON_SECRET` in Hostinger. Do not add the word
`Bearer` to the environment value.

## 3. Supabase customer authentication

In Supabase Dashboard, open Authentication URL Configuration and set:

- Site URL: `https://www.babascamera.com`
- Redirect URL: `https://www.babascamera.com/auth/callback`
- Preview redirect, if used:
  `https://YOUR_HOSTINGER_PREVIEW_DOMAIN/auth/callback`

Configure the Google provider with the callback URL shown by Supabase. Google
must redirect to Supabase; Supabase then returns to the storefront callback.

The storefront uses:

- Supabase publishable key in the browser.
- HttpOnly/SameSite Supabase session cookies.
- Server-side `supabase.auth.getUser()` validation for protected pages.
- Database profile validation for active customer accounts.

Do not give customers `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`, or
`CRON_SECRET`. A service-role key is not required for storefront login.

## 4. Scheduled jobs bearer token

The protected endpoint is:

```text
GET or POST https://www.babascamera.com/api/internal/jobs
Authorization: Bearer <CRON_SECRET>
```

Example verification from a secure terminal:

```powershell
$headers = @{ Authorization = "Bearer $env:CRON_SECRET" }
Invoke-RestMethod -Method Post `
  -Uri "https://www.babascamera.com/api/internal/jobs" `
  -Headers $headers
```

Never place this token in frontend JavaScript, a `NEXT_PUBLIC_` variable, a URL
query string, analytics, or browser local storage.

## 5. Production checks

Before connecting the live domain:

```powershell
bun run --cwd apps/web type-check
bun run --cwd apps/web test
bun run --cwd apps/web lint
bun run --cwd apps/web build
```

After deployment verify:

1. `/api/health` returns success.
2. Register a disposable customer.
3. Confirm the email and callback return to the production domain.
4. Sign in, reload, and confirm the session remains active.
5. Anonymous `/account` redirects to `/auth/login`.
6. Password-reset email returns to `/auth/reset-password`.
7. Google login returns through `/auth/callback`.
8. The internal jobs endpoint returns 401 without the bearer token.
9. The endpoint succeeds with the Hostinger-held bearer token.
10. Razorpay remains in test mode until the full order flow is certified.
