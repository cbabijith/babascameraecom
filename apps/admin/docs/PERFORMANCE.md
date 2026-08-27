# Admin API Performance

Latency budget: **every API must respond in under 200 ms**. Verified against the live
deployment with `apps/admin/scripts/api-perf-test.ts` (5 sequential samples per endpoint,
median / p95 reported; "server time" = median minus the network RTT floor measured via
`/api/health`).

- **Base URL:** `https://babascameraadmin-production.up.railway.app`
- **Run the benchmark:**
  ```bash
  export ADMIN_URL="https://babascameraadmin-production.up.railway.app"
  export ADMIN_EMAIL=… ADMIN_PASSWORD=…
  bun apps/admin/scripts/api-perf-test.ts          # PERF_ITERATIONS=5 by default
  ```

## Current results (2026-08-27, after the region fix)

Measured from South India (≈68 ms RTT floor to the Singapore deployment).

| Endpoint | Median | p95 | Server time | Verdict |
|---|---|---|---|---|
| GET /api/auth/get-session | 80 ms | 90 ms | 13 ms | ✅ |
| GET products list (25) | 108 ms | 127 ms | 41 ms | ✅ |
| GET products list (100) | 129 ms | 163 ms | 62 ms | ✅ |
| GET product detail | 81 ms | 100 ms | 14 ms | ✅ |
| GET brands list | 95 ms | 99 ms | 27 ms | ✅ |
| GET categories list | 88 ms | 104 ms | 20 ms | ✅ |
| GET home banners | 91 ms | 104 ms | 24 ms | ✅ |
| GET orders list | 88 ms | 98 ms | 21 ms | ✅ |
| GET order detail | 85 ms | 109 ms | 17 ms | ✅ |
| POST create category | 104 ms | 120 ms | 36 ms | ✅ |
| PATCH rename category | 103 ms | 112 ms | 36 ms | ✅ |
| POST create manual order (full tx) | 130 ms | 173 ms | 63 ms | ✅ |
| PATCH payment-status | 107 ms | 129 ms | 39 ms | ✅ |
| POST banner image upload (PNG→WebP→S3) | 106 ms | 377 ms | 38 ms | ✅ |
| POST video authorize (presign) | 90 ms | 109 ms | 22 ms | ✅ |
| PUT video direct to Tigris (839 KB) | 128 ms | 648 ms | 61 ms | ✅ (transfer-bound) |
| POST video finalize (S3 verify) | 98 ms | 105 ms | 31 ms | ✅ |
| GET media proxy — image (TTFB) | 162 ms | 178 ms | 95 ms | ✅ |
| GET media proxy — video (TTFB) | 151 ms | 343 ms | 83 ms | ✅ |

**All endpoints pass.** Photo/video flows were also verified functionally end-to-end
(upload → banner create → media proxy fetch → banner delete → S3 cleanup).

## What was wrong (baseline, same day)

The first benchmark measured **16 of 17 endpoints over budget**, with DB endpoints at
1.3–5.1 s:

| Endpoint | Before | After |
|---|---|---|
| GET products list | **4 157 ms** | 108 ms |
| GET product detail | **2 568 ms** | 81 ms |
| GET categories list | **2 556 ms** | 88 ms |
| POST create manual order | **5 041 ms** | 130 ms |
| GET /api/auth/get-session | **770 ms** | 80 ms |
| POST banner image upload | 1 163 ms | 106 ms |
| POST video finalize | 1 210 ms | 98 ms |

### Root cause: split regions

The services lived on two continents:

| Service | Region before | Region after |
|---|---|---|
| `@babascamera/admin` | Singapore | Singapore |
| `web` (storefront) | United States | **Singapore** |
| `Postgres` (data) | United States | **Singapore** (`pg-sg`) |

Measured from inside the admin container, each DB roundtrip to the US Postgres cost
**177 ms**, and fresh connections cost **1.35 s** (TLS over distance). Drizzle endpoints
issue multiple queries per request, so a 20-roundtrip endpoint = ~4 s. No amount of code
optimization can fix that — the fix was topology.

### The fix

1. Moved the `web` service to Singapore.
2. Created a new Postgres service `pg-sg` in Singapore (empty service → region set →
   volume created in-region → Postgres image deployed).
3. Cloned all data from the US Postgres (`pg_dump` → restore; verified 390 products /
   163 images / 38 brands / 26 tables, test artifacts removed).
4. Switched `DATABASE_URL` on both apps to `pg-sg.railway.internal`.
5. Roundtrips admin→DB are now **2–3 ms**.

The old US `Postgres` service is left running as a frozen fallback; delete it once
confident (it keeps costing money).

## Notes on what legitimately takes time

- **File transfers** (`PUT video`, large image uploads): bound by client→Tigris bandwidth.
  The 839 KB video PUT medians 128 ms from India; p95 648 ms reflects cross-ocean
  routing to the Tigris bucket. Server-side involvement (presign/finalize) stays fast.
- **Media proxy TTFB**: each uncached fetch streams from Tigris through the Singapore
  app, then to the client (~95 ms server time). Responses carry
  `Cache-Control: public, max-age=31536000, immutable`, so browsers/CDNs cache them —
  repeat views are local.
- **First request after idle**: the DB pool closes idle connections after 20 s; the next
  request pays one ~120 ms reconnect. Acceptable at this traffic level.

## Monitoring

Re-run the benchmark after any infra change (region moves, DB changes, dependency
upgrades). The script fails loudly if any endpoint exceeds the 200 ms server-time budget,
so it can gate future deployments.
