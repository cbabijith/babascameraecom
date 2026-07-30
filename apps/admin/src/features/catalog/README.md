# Admin catalogue architecture

The catalogue owns Categories, Brands, Products, Product Images, and product
workbook import/export.

## Request flow

Interactive client code calls `api/catalog-api-client.ts`. Authenticated Route
Handlers under `src/app/api/admin/catalog` validate the request boundary and
delegate to feature services. Route files do not query the database or access
storage directly. Server-rendered pages may use `server/readers.ts` for their
initial read.

Catalogue mutations must not be imported into Client Components. The previous
catalogue Server Action module has been removed.

## Endpoints

- `GET, POST /api/admin/catalog/categories`
- `PATCH, DELETE /api/admin/catalog/categories/:id`
- `POST /api/admin/catalog/categories/reorder`
- `GET, POST /api/admin/catalog/brands`
- `PATCH, DELETE /api/admin/catalog/brands/:id`
- `POST /api/admin/catalog/brands/reorder`
- `GET, POST /api/admin/catalog/products`
- `GET, PATCH, DELETE /api/admin/catalog/products/:id`
- `PATCH /api/admin/catalog/products/:id/status`
- `PATCH /api/admin/catalog/products/bulk/status`
- `POST /api/admin/catalog/products/bulk/delete`
- `POST /api/admin/catalog/products/:id/images`
- `DELETE /api/admin/catalog/products/:id/images/:imageId`
- `PATCH /api/admin/catalog/products/:id/images/:imageId/primary`
- `POST /api/admin/catalog/products/:id/images/reorder`
- `POST /api/admin/catalog/products/import/preview`
- `POST /api/admin/catalog/products/import`
- `GET /api/admin/catalog/products/export`
- `GET /api/admin/catalog/products/sample`

All JSON endpoints use `{ success: true, data }` or
`{ success: false, error: { code, message, fieldErrors? } }`. Workbook download
endpoints return XLSX bytes after the same authentication and authorization
guard.

## Verification

Run the complete catalogue gate after finishing a coding pass:

```powershell
bun run --cwd apps/admin check:catalog
```

Focused suites:

```powershell
bun run --cwd apps/admin test:unit
bun run --cwd apps/admin test:api
bun run --cwd apps/admin test:contract
bun run --cwd apps/admin test:catalog
```
