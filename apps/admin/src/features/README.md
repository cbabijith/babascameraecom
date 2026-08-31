# Admin Feature Architecture

Admin code follows feature-driven clean architecture.

Structure:

```text
src/app/                 Routing only. Pages compose feature components and call feature readers.
src/features/<feature>/
  components/            Client and presentational UI for this feature.
  domain/                Pure business rules (state machines, policies).
  schemas/               Zod schemas and typed input contracts.
  repositories/          Data access (Drizzle queries).
  services/              Business logic and mutations; emit domain events after commit.
  server/                Server actions, permission-checked readers, server-only adapters.
  api/                   API-client helpers and route guards (catalog pattern).
  tables/                Feature-specific table column definitions.
  types.ts               Feature-facing types.
src/components/          Shared app-shell and truly generic admin UI only.
src/lib/                 Cross-cutting infrastructure only: auth, database, money,
                         security, forms, events, API kernel, utilities.
```

Rules:

- `src/app` owns routing only. Pages should compose feature components and call feature server readers.
- `src/features/*` owns business behavior for each module. Features never import from another feature's internals — shared contracts live in `src/lib` or a package.
- Server actions must validate `FormData` with Zod and return serializable results.
- Admin authorization must remain server-side (`features/auth` guards; `lib/auth` re-exports for compatibility).
- Mutations commit first, then emit domain events through `lib/events`; side effects
  (revalidation, customer emails, audit logging) live in event handlers, not services.

## Event-driven mutations

`src/lib/events` hosts a typed in-process event bus (`adminEvents`). Services
publish after their transaction commits; handlers are registered once per
process:

- `handlers/revalidation.handler.ts` — `revalidatePath` for affected admin pages.
- `handlers/email-outbox.handler.ts` — customer emails onto the shared `email_outbox` (dedupe-keyed, replay-safe).
- `handlers/audit-log.handler.ts` — structured `admin.audit` log lines for every mutation.

Wired features: orders (create/status/payment/refund/delete), customers,
users, coupons, reviews, settings. Catalog and home-banners still call
`revalidatePath` directly inside their services; migrate them onto the bus
when those surfaces grow additional side effects.

## Migration status

- `features/auth` — login UI, actions, admin guards (complete; `lib/auth` keeps compatibility re-exports).
- `features/navigation` — sidebar configuration (complete).
- `features/catalog` — brands/categories/products with repositories, services, schemas, API clients (complete).
- `features/home-banners` — banners with the same layout (complete).
- `features/orders` — schemas, domain transition policy, repository, services, server actions/readers, invoice, components (complete).
- `features/customers`, `features/coupons`, `features/reviews`, `features/settings`, `features/users`, `features/dashboard` — components, schemas, actions, readers (complete).
