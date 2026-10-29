# Deployment (Railway project `babascamera`)

> Rebuilt 2026-10-28 on a fresh Railway project after the previous project
> (`pg-sg` / `@babascamera/admin` / `user`) was deleted. Both apps, the
> database, and the public domain wiring below are the current source of truth.

This monorepo deploys **two apps** that share workspace packages
(`@babascamera/config`, `@babascamera/db`, `@babascamera/ui`):

| App | Railway service | URL | How it deploys |
| --- | --- | --- | --- |
| `apps/web` | `web` | `https://web-production-8a1eb.up.railway.app` (+ `www.babascamera.com` via the Vercel bridge) | CLI `railway up --service web --ci` from repo root |
| `apps/admin` | `admin` | `https://admin-production-7718.up.railway.app` | CLI `railway up --service admin --ci` from repo root |
| Postgres | `Postgres` | `postgres.railway.internal:5432` (private-only) | managed by Railway |

Environment variables live on the services (set 2026-10-28), including
`DATABASE_URL=${{Postgres.DATABASE_URL}}`, better-auth, Razorpay live keys,
and the Tigris S3 block. Build/start commands are set per service in Railway
service settings (Railpack; root `railway.json` is no longer read by Railway
for new projects — see the note at the bottom).

## The one rule that matters

**Every Railway build must run from the repo root.** The workspace
`bun install` at the root of the build needs `bun.lock` plus the
`apps/*` and `packages/*` directories to resolve `workspace:*` deps.

A build whose root is `apps/admin` (or `apps/web`) fails at the install
step with exactly this error:

```
error: Workspace dependency "@babascamera/config" not found
error: Workspace dependency "@babascamera/db" not found
error: Workspace dependency "@babascamera/ui" not found
```

Always run `railway up` from the repo root, never from inside an app dir.

## Database operations

Postgres is private-only. To run migrations/imports from a laptop, open the
CLI tunnel and point the repo scripts at it:

```bash
railway ssh config --service Postgres        # one-time: adds ~/.ssh/config alias
ssh -N -L 5433:postgres.railway.internal:5432 railway-postgres   # keep open

PGPASS=$(railway variables --service Postgres --kv | grep '^POSTGRES_PASSWORD=' | cut -d= -f2-)
export DATABASE_URL="postgres://postgres:${PGPASS}@127.0.0.1:5433/railway"
bun run --cwd packages/db db:compat   # fresh databases only, before db:migrate
bun run --cwd packages/db db:migrate
bun scripts/seed-admin.ts             # needs ADMIN_SEED_EMAIL / ADMIN_SEED_PASSWORD
python3 … <xlsx-to-json> | bun scripts/import-catalog.ts   # ERP stock import (stdin JSON)
```

## Custom domain: babascamera.com

DNS for `babascamera.com` lives at the registrar (Hostinger parking
nameservers) and is **not** API-managed. Today the domain works through a
bridge: the Vercel project `babascameraecom-web` (team
`supporttasolutions-projects`) is a files-free deployment whose
`apps/web/vercel.json` rewrites every request to the Railway web service.
All application traffic actually runs on Railway.

To host the domain directly on Railway (recommended once registrar access is
available), the custom domain `www.babascamera.com` is already added to the
Railway `web` service. Point the registrar DNS at:

```
CNAME  www                 3r1nwd25.up.railway.app
TXT    _railway-verify.www railway-verify=290ec72d6511d6114b364ab5e709c59e18de361098e282d54df3c29593edc294
```

Railway issues the TLS certificate automatically once DNS propagates; the
Vercel bridge can then be removed by reverting `apps/web/vercel.json` to a
plain `crons` config and redeploying.

## Cache-bust tokens

Railpack caches build layers, and a changed `buildCommand` invalidates them.
The service build commands carry `&& echo <app>-cache-bust-YYYYMMDD`. If a
deploy completes but serves stale behavior, bump the token in the service's
build command (Railway service settings) and redeploy.

## Note on railway.json deprecation

Railway now ignores `railway.json` on projects created after the
Infrastructure-as-Code transition (build fails with "No start command
detected"). The per-service build/start commands for this project are stored
in Railway service settings; the committed `railway.json` files remain as
reference copies of the intended commands.

## Verify after deploying

Check the page title, not the deployment status:

- storefront: "Babas Camera – Camera Equipment Store"
- admin: "… | Baba's Camera Admin"
- storefront health: `/api/health/live` → `{"status":"ok"}`
- admin health: `/api/health` → `{"status":"ok","service":"admin"}`
