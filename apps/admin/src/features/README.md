# Admin Feature Architecture

Admin code should move toward feature-driven clean architecture.

Preferred structure:

```text
src/features/<feature>/
  components/   Client and presentational UI for this feature.
  server/       Server actions, guards, feature services, and server-only adapters.
  schemas/      Zod schemas and typed input contracts.
  tables/       Feature-specific table column definitions.
  types.ts      Feature-facing types.
```

Rules:

- `src/app` owns routing only. Pages should compose feature components and call feature server readers.
- `src/features/*` owns business behavior for each module.
- `src/components` is only for shared app-shell or truly generic admin UI.
- `src/lib` is only for cross-cutting infrastructure: Supabase, database, money, security, utilities.
- Server actions must validate `FormData` with Zod and return serializable results.
- Admin authorization must remain server-side.

Current migration status:

- `features/auth` has been started with login UI, login/logout actions, and admin guards.
- `features/navigation` owns the sidebar module configuration and reusable navigation component.
- Catalog, orders, customers, coupons, reviews, settings, and dashboard are still partly in `components` and `lib/actions`; migrate them feature-by-feature.
