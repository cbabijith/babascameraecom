# Deployment (Railway)

This monorepo deploys **two apps** that share workspace packages
(`@babascamera/config`, `@babascamera/db`, `@babascamera/ui`):

| App | Railway service | How it deploys |
| --- | --- | --- |
| `apps/admin` | `@babascamera/admin` | **GitHub push to `main`** (reads root `railway.json`) |
| `apps/web` | `user` | CLI `railway up` only (until the Vercel migration), then removed |

Postgres (`pg-sg`) is private-only and shared by both apps.

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

That means, in Railway service settings:

- The admin service **Root Directory must be `/` (empty)** — never
  `apps/admin`. A subdirectory root hides `packages/**` from the build.
- Never run `railway up` from inside `apps/admin` or `apps/web`; the CLI
  uploads the current directory as the build root and hits the same
  failure. Always run it from the repo root.

## Why root `railway.json` contains the ADMIN config

Railway reads `railway.json` from the build root, and there is only one
root — so the committed root file belongs to the app that deploys from
GitHub: **admin**. Pushes to `main` build admin with the full workspace
context and need no manual steps.

`apps/admin/railway.json` and `apps/web/railway.json` are the canonical
per-app copies. The web service is CLI-deployed, and the CLI reads the
local root `railway.json` at deploy time, so deploying web requires the
temporary swap (single command chain so it can't race):

```bash
cp apps/web/railway.json railway.json \
  && railway up --service user --detach \
  && cp apps/admin/railway.json railway.json
```

## Cache-bust tokens

Railpack caches build layers, and a changed `buildCommand` invalidates
them. Each config carries `&& echo <app>-cache-bust-YYYYMMDD`. If a
deploy completes but serves stale behavior, bump the token in the config
the deploy used and redeploy.

## Verify after deploying

Check the page title, not the deployment status:

- storefront: "Babas Camera – Camera Equipment Store"
- admin: "… | Baba's Camera Admin"
