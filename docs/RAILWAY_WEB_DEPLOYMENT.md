# Railway Storefront Deployment

This guide deploys `apps/web`, the customer-facing Baba's Camera storefront, as
a Railway service from the shared Bun monorepo.

The repository includes `apps/web/railway.json`. It builds only the storefront
while keeping the repository root available so Bun can resolve the shared
`@babascamera/db`, `@babascamera/ui`, and `@babascamera/config` workspaces.

## 1. Create the Railway service

1. In Railway, create a project and choose **Deploy from GitHub repo**.
2. Select the Baba's Camera repository.
3. Leave **Root Directory** empty (the repository root). Do not set it to
   `/apps/web`, because the storefront depends on shared workspace packages.
4. In the service settings, set **Config File Path** to:

   ```text
   /apps/web/railway.json
   ```

5. Generate a Railway public domain for the service.

Railway will use Railpack, run `bun run --cwd apps/web build`, start the
application with `bun run --cwd apps/web start`, and use Railway's injected
`PORT` automatically.

## 2. Configure variables

Use `apps/web/.env.railway.example` as the checklist. Add each variable in the
Railway service's **Variables** tab. Never commit real secrets to Git.

At minimum, configure these before the production deployment:

- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `DATABASE_URL`
- `NEXT_PUBLIC_RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`
- `RAZORPAY_WEBHOOK_SECRET`
- `CRON_SECRET`

Configure `RESEND_API_KEY` and `RESEND_FROM_EMAIL` before relying on real
transactional email.

Use the final Railway or custom HTTPS domain for `NEXT_PUBLIC_SITE_URL`, with no
trailing slash. Redeploy after changing any `NEXT_PUBLIC_` variable because
Next.js embeds public variables during the build.

For Supabase, use the transaction pooler connection string with
`sslmode=require`. URL-encode special characters in the database password.

## 3. Configure Supabase Auth

In Supabase **Authentication > URL Configuration**:

1. Set **Site URL** to the final storefront origin:

   ```text
   https://shop.example.com
   ```

2. Add this allowed redirect URL:

   ```text
   https://shop.example.com/auth/callback
   ```

Keep localhost redirect URLs only if local development still needs them.
Customer sessions continue to use Supabase's secure cookie-based SSR flow; no
browser bearer token is required.

## 4. Configure Razorpay

In Razorpay, create a webhook pointing to:

```text
https://shop.example.com/api/webhooks/razorpay
```

Set its signing secret as `RAZORPAY_WEBHOOK_SECRET` in Railway. The public and
server Razorpay key IDs must refer to the same Razorpay mode (test or live).

## 5. Health checks

Railway checks:

```text
/api/health/live
```

This is a lightweight process liveness check and does not expose configuration.
After deployment, also open:

```text
/api/health
```

The readiness endpoint returns `200` only when the database, Supabase, and
Razorpay configuration are present. It reports only booleans, never secret
values.

## 6. Scheduled internal jobs

`POST /api/internal/jobs` requires:

```http
Authorization: Bearer YOUR_CRON_SECRET
```

Do not send this token from browser code. Railway cron services must run a
short-lived command and exit; the web service itself must remain a normal
long-running service. If scheduled jobs are needed, create a separate Railway
cron service or use another trusted server-side scheduler to call the endpoint.
Store the same `CRON_SECRET` only in those server-side environments.

Example server-side request:

```bash
curl --fail-with-body --request POST \
  --header "Authorization: Bearer $CRON_SECRET" \
  https://shop.example.com/api/internal/jobs
```

## 7. Deployment checks

After the Railway deployment becomes active, verify:

1. `/api/health/live` returns `200`.
2. `/api/health` returns `200` and `"status":"ok"`.
3. Registration, login, logout, and `/auth/callback` work on the production
   domain.
4. Catalog and product images load.
5. Cart and checkout preserve the customer session.
6. A Razorpay test payment completes and its webhook updates the order.
7. No server secret appears in browser source, browser network payloads, or
   Railway build logs.

## Troubleshooting

- **Workspace package not found:** make sure Root Directory is empty and Config
  File Path is `/apps/web/railway.json`.
- **Health check fails:** inspect deployment logs, then open `/api/health/live`.
  If liveness works but `/api/health` is `503`, add the missing service
  variables.
- **Auth redirects to localhost:** update both `NEXT_PUBLIC_SITE_URL` and
  Supabase URL Configuration, then redeploy.
- **Database authentication fails:** verify the selected Supabase pooler host,
  username, password encoding, port, and `sslmode=require`.
- **Public variable seems unchanged:** redeploy; `NEXT_PUBLIC_` values are
  compiled into the Next.js build.
