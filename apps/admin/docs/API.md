# Admin API Documentation

Live REST API for the **Babas Camera admin panel**.

- **Base URL (production):** `https://babascameraadmin-production.up.railway.app`
- **Content type:** JSON unless noted (product/category/brand mutations use `multipart/form-data`)
- **Verified:** every endpoint below was exercised against the live deployment by
  `apps/admin/scripts/live-api-test.ts` (62 checks, all passing — see [Running the live test suite](#running-the-live-test-suite)).

---

## Table of contents

1. [Authentication](#authentication)
2. [Conventions](#conventions)
3. [Health](#health)
4. [Products](#products)
5. [Product images](#product-images)
6. [Brands](#brands)
7. [Categories](#categories)
8. [Home banners](#home-banners)
9. [Orders](#orders)
10. [Manual order creation](#manual-order-creation-post-apiadminorders)
11. [Order lifecycle](#order-lifecycle)
12. [Refunds & invoices](#refunds--invoices)
13. [Media proxy](#media-proxy)
14. [Error reference](#error-reference)
15. [Running the live test suite](#running-the-live-test-suite)

---

## Authentication

The API uses [better-auth](https://better-auth.com) email/password sessions stored in the shared
`users` / `sessions` tables. Only users with `role = "admin"` and `is_active = true` may call
admin endpoints.

An edge middleware gates every path except `/login`, `/api/auth/**`, `/api/health`, `/unauthorized`
and static assets: requests without a `better-auth.session_token` cookie are **307 redirected** to
`/login?next=<path>`.

| Endpoint | Method | Body | Notes |
|---|---|---|---|
| `/api/auth/sign-in/email` | POST | `{ "email": string, "password": string }` | 200 + `set-cookie: better-auth.session_token=…`; wrong credentials → 401 |
| `/api/auth/get-session` | GET | — | 200 `{ session, user }` for a valid cookie |
| `/api/auth/sign-out` | POST | `{}` | **Must send an `Origin` header** (better-auth requirement) — see example below |

```bash
BASE="https://babascameraadmin-production.up.railway.app"

# Sign in and keep the session cookie
curl -c cookies.txt -X POST "$BASE/api/auth/sign-in/email" \
  -H "Content-Type: application/json" \
  -d '{"email":"info@babascamera.com","password":"…"}'

# Sign out (Origin header required)
curl -b cookies.txt -X POST "$BASE/api/auth/sign-out" \
  -H "Content-Type: application/json" -H "Origin: $BASE" -d '{}'
```

### Same-origin rule for mutations

All mutating endpoints (`POST`/`PATCH`/`PUT`/`DELETE`) compare the `Origin` header against the
request's forwarded host (`x-forwarded-host` / `host` + `x-forwarded-proto`).

- Catalog, order and banner routes: a **missing** `Origin` is allowed; a **foreign** `Origin` → `403 INVALID_ORIGIN`.
- Brand routes: a **missing** `Origin` → `403 INVALID_ORIGIN` (stricter).
- Therefore: always send `Origin: $BASE` on mutations.

---

## Conventions

**Success envelope**

```json
{ "success": true, "data": { … } }
```

**Error envelope**

```json
{ "success": false, "error": { "code": "VALIDATION_FAILED", "message": "…", "fieldErrors": { "field": ["…"] } } }
```

| Status | Meaning |
|---|---|
| 200 / 201 | Success (201 = created) |
| 204 | Success, empty body (some deletes) |
| 400 | Malformed JSON / invalid ID |
| 401 | No admin session |
| 403 | Foreign origin, or session lacks the required permission |
| 404 | Entity not found |
| 409 | Business-rule failure (duplicate name, illegal transition, insufficient stock, …) |
| 422 | Validation failed — `error.fieldErrors` lists per-field messages |
| 429 | Rate limited (brand mutations: 60 mutations / 60 s per admin) |

Money values are decimal **strings** (`"2700.00"`). Dates are ISO-8601 strings.

---

## Health

```
GET /api/health          → 200 { "status": "ok", "service": "admin" }     (public)
```

---

## Products

### List products

```
GET /api/admin/catalog/products
```

Query parameters (all optional; invalid values fall back to defaults):

| Param | Values | Default |
|---|---|---|
| `q` | free text search | `""` |
| `status` | `active` \| `inactive` \| `low-stock` \| `all` | `all` |
| `category` | category UUID \| `all` | `all` |
| `brand` | brand UUID \| `none` \| `all` | `all` |
| `inventory` | `in-stock` \| `low-stock` \| `out-of-stock` \| `all` | `all` |
| `sort` | `name` \| `price` \| `stock` \| `createdAt` \| `updatedAt` | `createdAt` |
| `order` | `asc` \| `desc` | `desc` |
| `page` | ≥ 1 | `1` |
| `pageSize` | 1–100 | `25` |

**200** `data` = `{ rows: ProductListItem[], total, page, pageSize, totalPages, counts: { all, active, inactive, lowStock } }`
where `ProductListItem` = `{ id, name, sku, slug, salePrice, mrp, stock, threshold, categoryId, brandId, isActive, isFeatured, category, brand, imageUrl, variantCount, createdAt, updatedAt }`.

### Create product

```
POST /api/admin/catalog/products        Content-Type: multipart/form-data
```

The form schema expects **every field below as a string entry** (send empty strings for optional
text — omitting them is a 422). Files are appended under the `images` key (max 6, JPEG/PNG/WebP,
≤ 5 MiB, content verified by magic bytes).

| Field | Rules |
|---|---|
| `name` | 1–180 chars, required |
| `slug` | string; slugified, falls back to `name` |
| `sku` | ≤ 120; auto-generated `AUTO-…` when blank |
| `categoryId` | UUID, required |
| `brandId` | UUID or `""` |
| `shortDescription` | ≤ 400 |
| `description` | ≤ 50 000 (sanitized HTML) |
| `mrp`, `salePrice` | money strings, required, `salePrice ≤ mrp` |
| `costPrice` | money string or `""` |
| `gstRate` | string or `""` (≤ 100) |
| `priceIncludesGst` | `true`/`false`/`1`/`0`/`on` |
| `stock`, `lowStockThreshold` | digit-only strings |
| `weight`, `shippingFee` | decimal strings or `""` |
| `warranty` | ≤ 500 |
| `youtubeUrl` | absolute http(s) URL or `""` |
| `metaTitle` / `metaDescription` | ≤ 180 / ≤ 400 |
| `isActive`, `isFeatured` | boolean entries |
| `variants` | JSON string: `[{ name, value, sku, additionalPrice, stock }]` (≤ 100) |
| `images` | repeatable File entries |

**201** `data: { id, redirectTo }`. **422** validation. **409** duplicate SKU etc.

```bash
curl -b cookies.txt -X POST "$BASE/api/admin/catalog/products" \
  -H "Origin: $BASE" \
  -F "name=Test Product" -F "slug=" -F "sku=" \
  -F "categoryId=<uuid>" -F "brandId=" \
  -F "shortDescription=" -F "description=" \
  -F "mrp=1000" -F "salePrice=900" -F "costPrice=" -F "gstRate=" \
  -F "priceIncludesGst=false" -F "stock=10" -F "lowStockThreshold=2" \
  -F "weight=" -F "shippingFee=" -F "warranty=" -F "youtubeUrl=" \
  -F "metaTitle=" -F "metaDescription=" \
  -F "isActive=true" -F "isFeatured=false" -F "variants=[]"
```

### Product detail / update / delete

| Endpoint | Method | Notes |
|---|---|---|
| `/api/admin/catalog/products/{id}` | GET | 200 product + `category`, `brand`, ordered `images[]`, `variants[]`; 404 unknown |
| `/api/admin/catalog/products/{id}` | PATCH | Same multipart form as create (route injects the id) |
| `/api/admin/catalog/products/{id}` | DELETE | 204; **409** if the product has orders or inventory history |
| `/api/admin/catalog/products/{id}/status` | PATCH | multipart `isActive` → 200 |
| `/api/admin/catalog/products/bulk/status` | PATCH | multipart `productIds` (JSON UUID array, 1–500) + `isActive` |
| `/api/admin/catalog/products/bulk/delete` | POST | multipart `productIds` (1–100); deletes only when no order history |

### Export / import / sample

| Endpoint | Method | Notes |
|---|---|---|
| `/api/admin/catalog/products/export` | GET | Same filters as list → `.xlsx` download |
| `/api/admin/catalog/products/sample` | GET | `.xlsx` import template (public-safe, auth required) |
| `/api/admin/catalog/products/import/preview` | POST | multipart `file` (`.xlsx` ≤ 2 MiB) → `{ totalRows, validRows, invalidRows, errors[] }`, no writes |
| `/api/admin/catalog/products/import` | POST | same input; **all-or-nothing** — any invalid row → 422 and nothing imported |

Required import headers: `name, category, mrp, sale_price, stock`.

---

## Product images

All multipart, all same-origin.

| Endpoint | Method | Body | Result |
|---|---|---|---|
| `/api/admin/catalog/products/{id}/images` | POST | repeatable `images` Files (1–6) | 200/201; first upload becomes primary |
| `/api/admin/catalog/products/{id}/images/reorder` | POST | `imageIds` = JSON UUID array matching the full current set | stale set → 409 |
| `/api/admin/catalog/products/{id}/images/{imageId}/primary` | PATCH | — | promotes to primary |
| `/api/admin/catalog/products/{id}/images/{imageId}` | DELETE | — | 204; promotes next image if the primary was removed |

Files are stored in the private Tigris bucket under `products/{productId}/` and served through the
[media proxy](#media-proxy).

---

## Brands

Rate limited per admin: 12 multipart / 60 mutations / 240 reads per 60 s → `429`.
**Mutations require an `Origin` header.**

| Endpoint | Method | Input | Result |
|---|---|---|---|
| `/api/admin/catalog/brands` | GET | `q`, `status` (`all`/`active`/`inactive`) — any other query key → 422 | `BrandListItem[]` = `{ id, name, slug, description, logoUrl, position, isActive, productCount }` |
| `/api/admin/catalog/brands` | POST | multipart: `name` (1–120), `isActive` (required), optional `logo` File | 201 `BrandListItem`; duplicate name → 409 `BRAND_NAME_CONFLICT` |
| `/api/admin/catalog/brands/{id}` | GET / PATCH / DELETE | PATCH = same multipart (+`removeLogo`); DELETE → 204, products attached → 409 `BRAND_HAS_PRODUCTS` | |
| `/api/admin/catalog/brands/{id}/status` | PATCH | **JSON** `{ "isActive": boolean }` (strict) | 200 `BrandListItem` |
| `/api/admin/catalog/brands/reorder` | POST | **JSON** `{ "brandIds": uuid[] }` (complete set, no duplicates) | 204; stale → 409 `BRAND_ORDER_CONFLICT` |

---

## Categories

| Endpoint | Method | Input | Result |
|---|---|---|---|
| `/api/admin/catalog/categories` | GET | — | `CategoryListItem[]` = `{ id, name, slug, description, imageUrl, parentId, parentName, sortOrder, isActive, productCount }` |
| `/api/admin/catalog/categories` | POST | multipart: `name` (1–120), `slug?`, `description?`, `isActive`, `parentId?` (UUID or `""`), optional `image` File / `imageUrl` | 201; cycles → 409 |
| `/api/admin/catalog/categories/{id}` | PATCH | with `name` → full update (same fields); without `name` → `isActive` toggle | 200 |
| `/api/admin/catalog/categories/{id}` | DELETE | — | 204; has products or children → 409 |
| `/api/admin/catalog/categories/reorder` | POST | multipart: `parentId` (UUID or `""`) + `orderedCategoryIds` (JSON UUID array = the complete sibling set) | stale set → 409 |

---

## Home banners

JSON endpoints (max 5 banners). `mobileMediaUrl` is required for `image` banners, `posterUrl` for
`video`.

| Endpoint | Method | Notes |
|---|---|---|
| `/api/admin/content/home-banners` | GET / POST | POST body: `{ internalName, mediaType, desktopMediaUrl, mobileMediaUrl?, posterUrl?, altText, headline?, subheading?, buttonLabel?, destinationUrl?, openInNewTab?, isActive?, startsAt?, endsAt? }` → 201 `HomeBanner`; 6th banner → 409 `BANNER_LIMIT_REACHED` |
| `/api/admin/content/home-banners/{id}` | PATCH / DELETE | PATCH = same body; DELETE re-numbers positions |
| `/api/admin/content/home-banners/reorder` | POST | `{ "bannerIds": uuid[] }` complete set → 204 |
| `/api/admin/content/home-banners/upload` | POST | multipart (`file`, `role: desktop\|mobile\|poster`) → `{ url, path }`; **or** JSON `{ fileName, size, contentType: "video/mp4" }` → `{ path, token }` presigned PUT |
| `/api/admin/content/home-banners/upload/finalize` | POST | `{ path, size }` → verifies MP4/H.264 → `{ path, url }` |

---

## Orders

All order endpoints require the `orders` permission (admins have it) and, for mutations, a
same-origin `Origin` header.

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/admin/orders` | GET | List orders (newest first) |
| `/api/admin/orders` | POST | **Create a manual order** — see next section |
| `/api/admin/orders/{id}` | GET | Full detail: items, status history (with actor), refunds |
| `/api/admin/orders/{id}` | DELETE | Delete order + dependents (restores stock unless delivered/cancelled) |
| `/api/admin/orders/{id}/status` | PATCH | Status transition (JSON) |
| `/api/admin/orders/{id}/payment-status` | PATCH | Payment status update (JSON) |
| `/api/admin/orders/{id}/refund` | POST | Full Razorpay refund (JSON `{ "reason"?: string }`) |
| `/api/orders/{id}/invoice` | GET | GST invoice PDF download |

### List

```
GET /api/admin/orders
```

**200** `data` = array of `{ id, orderNumber, customer, customerEmail, status, paymentMethod,
paymentStatus, total, itemCount, createdAt }`.

### Manual order creation — `POST /api/admin/orders`

Records a phone/offline order. Stock is checked, reserved (`inventory_reservations`) and
decremented atomically; duplicate lines for the same product+variant are merged; the order starts
as `pending` with a history entry noting manual creation. If `customerEmail` matches an existing
user, the order is linked to that user.

```json
{
  "customerEmail": "customer@example.com",
  "customerName": "Full Name",
  "customerPhone": "9999999999",
  "userId": null,
  "items": [
    { "productId": "<uuid>", "variantId": null, "quantity": 2 }
  ],
  "shippingAddress": {
    "fullName": "Recipient",
    "phone": "9999999999",
    "line1": "House / street",
    "line2": "",
    "city": "Thiruvananthapuram",
    "state": "Kerala",
    "pincode": "695001",
    "country": "India"
  },
  "paymentMethod": "cod",
  "paymentStatus": "pending",
  "shippingCharge": 100,
  "discount": 50,
  "notes": "Optional note"
}
```

Field rules: `items` 1–50 entries, `quantity` 1–99, `paymentStatus` `pending`|`paid`,
`discount ≤ subtotal`. `variantId` optional (variant price = product `salePrice` +
variant `additionalPrice`).

**201** `data` = the full order detail (same shape as `GET /api/admin/orders/{id}`).
Failures: **422** validation · **409** `ORDER_OPERATION_FAILED` (inactive product, unknown
variant, insufficient product/variant stock, discount above subtotal).

Verified example: product ₹900 × qty 3 with `discount 50` + `shippingCharge 100` →
`subtotal "2700.00"`, `total "2750.00"`, product stock 10 → 7.

### Order lifecycle

Status machine (illegal moves → **409** `Order cannot move from X to Y.`):

```
pending → confirmed | cancelled
confirmed → processing | cancelled
processing → shipped | cancelled
shipped → delivered
delivered / cancelled / refunded → (terminal)
```

```
PATCH /api/admin/orders/{id}/status        { "toStatus": "confirmed", "note?": "…" }
```

Extra optional fields (all max-length strings): `note` (500), `carrier` (100),
`trackingNumber` (150), `trackingUrl` (2000, http/https).

Rules enforced server-side:

- `shipped` **requires** `carrier` + `trackingNumber` → otherwise 409.
- `delivered` on a COD order automatically sets `paymentStatus: "paid"`.
- `cancelled` releases the reserved inventory (stock restored) and coupon redemptions.
- Every transition appends to `order_status_history` with the acting admin and queues a
  `order-status` email in the outbox (deduplicated per order+status).

**200** `data` = `{ orderId, status, order: <full detail> }`.

### Payment status

```
PATCH /api/admin/orders/{id}/payment-status    { "paymentStatus": "paid", "note?": "UPI collected" }
```

`paymentStatus` ∈ `pending | paid | failed | refunded`. Adds a history entry. **200**
`data` = `{ orderId, paymentStatus, order }`.

### Delete order

```
DELETE /api/admin/orders/{id}
```

Deletes the order with items, history, refunds, reservations and queued emails. Unreleased
inventory is restored (except for delivered/cancelled orders) and coupon counts rolled back.
**200** `{ orderId }` — prefer reserving deletion for test/mistake orders.

---

## Refunds & invoices

### Refund (Razorpay only)

```
POST /api/admin/orders/{id}/refund      { "reason?": "…" }        Origin required
```

Full refund via Razorpay for **paid Razorpay orders with a verified payment ID**; sets the order to
`refunded`, restores stock unless shipped/delivered, queues `order-refunded` email. Idempotent per
order. **200** `{ ok: true, idempotencyKey }` · **409** with a descriptive message otherwise
(e.g. COD orders, missing payment id, already refunded).

### Invoice PDF

```
GET /api/orders/{id}/invoice
```

**200** `application/pdf` attachment (`<orderNumber>.pdf`), generated from the live order data
(items, address snapshot, totals). 404 for unknown ids.

---

## Media proxy

```
GET /api/media/{bucket key}       e.g. /api/media/products/<productId>/<imageId>.png
```

Streams the object from the private Tigris bucket with
`Cache-Control: public, max-age=31536000, immutable`. 404 on any error. All product image URLs
rendered by the admin UI go through this proxy.

---

## Error reference

| Code | Status | Meaning |
|---|---|---|
| `UNAUTHENTICATED` | 401 | No admin session |
| `FORBIDDEN` | 403 | Session is not an active admin / lacks permission |
| `INVALID_ORIGIN` | 403 | Missing (brands, refund) or foreign `Origin` header |
| `ORDER_NOT_FOUND` / `BRAND_NOT_FOUND` / `PRODUCT_NOT_FOUND` | 404 | Unknown id |
| `ORDER_OPERATION_FAILED` | 409 | Order business rule (transition, stock, discount) |
| `CATALOG_OPERATION_FAILED` | 409 | Catalog business rule |
| `BRAND_NAME_CONFLICT` / `BRAND_HAS_PRODUCTS` / `BRAND_ORDER_CONFLICT` | 409 | Brand rules |
| `BANNER_LIMIT_REACHED` / `BANNER_ORDER_INVALID` | 409 | Banner rules |
| `VALIDATION_FAILED` | 422 | Field validation — see `error.fieldErrors` |
| `IMPORT_VALIDATION_FAILED` | 422 | Product import rows invalid, nothing imported |
| `RATE_LIMITED` | 429 | Brand rate limit |
| `INTERNAL_ERROR` | 500 | Unexpected failure (logged with actor id) |

---

## Running the live test suite

The reusable suite lives at `apps/admin/scripts/live-api-test.ts` (no credentials in source —
all from the environment). It signs in, creates test entities prefixed `LIVEAPI-…`, exercises
auth → catalog CRUD → images → manual orders → full lifecycle → guards, deletes everything it
created, and signs out.

```bash
export ADMIN_URL="https://babascameraadmin-production.up.railway.app"
export ADMIN_EMAIL="info@babascamera.com"
export ADMIN_PASSWORD="…"

bun apps/admin/scripts/live-api-test.ts
```

Latest verified run: **62 passed, 0 failed** (2026-08-27).
