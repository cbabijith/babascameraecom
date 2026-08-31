# Operations

## Release order

1. Install the committed Bun lockfile with `bun install --frozen-lockfile`.
2. Run type-check, lint, unit tests, migration validation, and both builds.
3. Back up the target database according to the environment policy.
4. Confirm `DATABASE_URL` targets the intended PostgreSQL database and run
   `bun run db:migrate`. Fresh plain-PostgreSQL environments apply the
   legacy compatibility schema first (`bun run --cwd packages/db db:compat`).
   The migration preflight refuses placeholder credentials, unnamed
   databases, and remote TLS opt-outs.
5. Deploy `apps/admin` to Railway from GitHub `main`; deploy `apps/web`
   per `DEPLOYMENT.md`.
6. Run the README acceptance flow in provider Test Mode.
7. Review payment, webhook, refund, email-outbox, and inventory-reservation
   telemetry before enabling live keys.

Never deploy application code which expects an unapplied schema.

## Scheduled work

The storefront exposes server-only job handlers for:

- releasing expired Razorpay inventory/coupon reservations;
- retrying pending/failed email-outbox rows with bounded backoff;
- reconciling ambiguous payment/refund provider operations.

Protect every scheduled endpoint with a high-entropy `CRON_SECRET`, use a small
batch size, and make each row transition idempotent. A second invocation must
be safe while the first is running.

`apps/web/vercel.json` schedules `GET /api/internal/jobs` every five minutes.
Vercel sends the configured `CRON_SECRET` as an authorization bearer token.
This cadence requires a Vercel plan that permits sub-daily cron schedules; use
an external scheduler with the same authenticated endpoint when it does not.

## Alerts

Alert on:

- reservations remaining active beyond their expiry window;
- a captured payment whose local order is not paid/confirmed;
- repeated invalid webhook signatures;
- failed or stuck refunds;
- outbox rows exhausting retry policy;
- negative-stock constraint attempts;
- unusual admin authorization failures;
- migration or RLS assertion failures.

Do not log passwords, session tokens, database URLs, object-storage keys,
Razorpay signatures/secrets, full card data, or raw guest-session tokens.

## Recovery rules

- Payment callback timeout: query Razorpay using the stored provider IDs; never
  create a second local order blindly.
- Duplicate webhook: return success after finding the existing provider event.
- Expired unpaid order: release only still-reserved inventory and coupon rows.
- Late captured payment: attempt safe fulfilment only if stock can be reacquired;
  otherwise create an idempotent compensating refund.
- Refund timeout: fetch the existing provider refund before retrying with the
  same idempotency key.
- Resend outage: keep the commerce transaction committed and retry the outbox.
- Product-image database failure: remove newly uploaded orphan objects.
- Admin cancellation before shipment: restore consumed inventory once.
- Shipped/delivered refund: do not automatically add stock; physical return
  processing is a separate operational decision.

## Key rotation

Rotate database, object-storage, Razorpay, webhook, Resend, Google OAuth,
better-auth, and cron secrets in their provider dashboards and both deployed
apps. Deploy after rotation, perform health/auth/test-mode provider checks,
then revoke the old value. Do not place replacement secrets in Git history or
issue comments.
