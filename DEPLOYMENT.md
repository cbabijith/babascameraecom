# Deployment (Railway `babascamera` + Vercel)

> Architecture since 2026-10-29: **storefront on Vercel, Hono backend +
> admin panel + Postgres on Railway**, all auto-deploying from GitHub
> `main` (`cbabijith/babascameraecom`).

| Piece | Platform | Service / Project | URL |
| --- | --- | --- | --- |
| `apps/web` (storefront, NO database access) | Vercel | `babascameraecom-web` (team supporttasolutions, git-linked) | https://www.babascamera.com |
| `apps/backend` (Hono API, owns the DB) | Railway | `backend` | https://backend-production-6cbf.up.railway.app |
| `apps/admin` (dashboard, direct DB) | Railway | `admin` | https://admin-production-7718.up.railway.app |
| Postgres | Railway | `Postgres` (private-only) | `postgres.railway.internal:5432` |

## How the pieces connect

- Web's `next.config.ts` proxies **every `/api/*` request** to
  `BACKEND_ORIGIN` (`beforeFiles` rewrite), so browser calls stay same-origin
  (auth cookies, CSRF origin checks) while the Hono backend serves them.
- Server components fetch the backend directly via
  `apps/web/src/lib/backend-fetch.ts` (public reads cached 60s; session/cart
  reads forward cookies). Web builds and runs **without `DATABASE_URL`**.
- The backend mounts the storefront's route handlers (imported verbatim from
  `apps/web/src/app/api/**`) plus `/api/storefront/rsc/*` endpoints that
  back the web app's server components. `next/cache`, `next/headers`,
  `next/server`, and `server-only` are shimmed via `apps/backend/preload.ts`.
- `BACKEND_TRUSTED_ORIGINS` (backend) lists the storefront origin so the
  ported same-origin CSRF guard passes behind the proxy.

## Env that matters

- Vercel web: `BACKEND_ORIGIN` (**must be present at build time**), plus the
  public `NEXT_PUBLIC_*`, better-auth, Razorpay public key. No DB env.
- Railway backend: `DATABASE_URL=${{Postgres.DATABASE_URL}}`,
  `BETTER_AUTH_URL=https://www.babascamera.com`, `BACKEND_TRUSTED_ORIGINS`,
  the full storefront secret set (Razorpay, S3/Tigris, Google, CRON_SECRET).
- Railway admin: unchanged (direct DB via private network).

## Gotchas learned the hard way

- **Turbo strips undeclared env vars**: `turbo.json > globalEnv` must list
  every env the build reads (BACKEND_ORIGIN is there now). Symptom of
  forgetting: Vercel build succeeds but rewrites/data calls act unconfigured.
- `vercel redeploy` reuses the old build artifact; push a commit (or bump the
  `// deploy:` comment in `next.config.ts`) to force a fresh build.
- Railway ignores `railway.json` on new projects (IaC transition); build and
  start commands live in each service's settings in the Railway dashboard.
- Railway builds must always run from the repo root (workspace `bun install`
  needs `apps/*` + `packages/*`).

## Database operations

Postgres is private-only. From a laptop:

```bash
railway ssh config --service Postgres        # one-time
ssh -N -L 5433:postgres.railway.internal:5432 railway-postgres

PGPASS=$(railway variables --service Postgres --kv | grep '^POSTGRES_PASSWORD=' | cut -d= -f2-)
export DATABASE_URL="postgres://postgres:${PGPASS}@127.0.0.1:5433/railway"
bun run --cwd packages/db db:migrate
bun scripts/seed-admin.ts             # ADMIN_SEED_EMAIL / ADMIN_SEED_PASSWORD
python3 <xlsx to JSON> | bun scripts/import-catalog.ts   # ERP import (stdin)
```

## Verify after deploying

- storefront: `https://www.babascamera.com/api/backend/ping` → `{"service":"backend","status":"ok"}`
- storefront data: `/api/storefront/home?sectionLimit=1` → `"success":true`
- backend health: `https://backend-production-6cbf.up.railway.app/api/health`
- admin health: `https://admin-production-7718.up.railway.app/api/health`
