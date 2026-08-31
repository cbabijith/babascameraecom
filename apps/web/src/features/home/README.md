# Storefront homepage

The homepage uses one public, aggregate HTTP request:

`page.tsx -> validated storefront API client -> GET /api/storefront/home -> handler -> home service -> Drizzle repository -> PostgreSQL`

The React page and feature components do not import the database package. The
only browser-side homepage module is the banner carousel; all catalogue
selection, visibility, pricing, ordering, and deduplication happen on the
server, and authentication/session handling is owned by better-auth.

## Contract and limits

`GET /api/storefront/home?sectionLimit=8` returns the standard success/error
envelope. `sectionLimit` is optional and constrained to 1-12. Banners are
limited to 5, categories to 10, and brands to 16. Only allowlisted public
fields are returned. Products must be active, in stock, attached to an active
category, and have a valid sale price. A product is placed in at most one
homepage section.

## Caching and invalidation

The public endpoint sends:

`public, max-age=0, s-maxage=60, stale-while-revalidate=300`

The server API client also uses a 60-second Next.js revalidation window and the
`storefront-home` cache tag. Catalogue and inventory changes are therefore
fresh within 60 seconds while shared caches may serve stale data for up to five
minutes during background revalidation. Because admin and storefront are
separate Next.js applications, the shared-cache TTL is the current
cross-application invalidation boundary; the tag is available for storefront
deploy hooks or future shared invalidation infrastructure.
The independently requested cart summary is always `private, no-store`; no
session or cart data enters the public homepage payload or cache.

## Media and links

Homepage media accepts local paths, product-storage object keys, the existing
Baba's CDN hosts, and optional hosts from `STOREFRONT_MEDIA_HOSTS`. Remote
media must use HTTPS. Banner destinations are
restricted to safe relative paths or HTTP(S) URLs, and external new-tab links
receive `noopener noreferrer`.
