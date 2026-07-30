# Brands module

Brands are a feature-owned catalogue resource. Dashboard pages only load the
initial list and compose `BrandManager`; all interactive mutations use the
authenticated `/api/admin/catalog/brands/*` HTTP routes.

## Layers

- `components/` owns the compact resource list, shared create/edit form,
  optimistic status changes, and deliberate drag reorder mode.
- `api/brands-api-client.ts` is the only browser mutation adapter.
- `api/brands-api-response.ts` owns the stable response envelope, same-origin
  mutation enforcement, rate limiting, and safe error mapping.
- `schemas/brand.ts` validates names, IDs, filters, status, and reorder payloads.
- `services/brands-service.ts` owns normalization, uniqueness, dependencies,
  storage sequencing, and business errors.
- `repositories/brands-repository.ts` is the only Brands database adapter.
- `services/brand-logo-service.ts` verifies JPEG/PNG/WebP bytes, limits decoded
  pixels, strips metadata, and stores generated WebP files.

Deletion is rejected inside the database transaction while products reference a
brand. Reordering accepts the complete ID set once and writes deterministic
positions in one transaction. Existing logos are removed only after the
replacement or database deletion succeeds.
