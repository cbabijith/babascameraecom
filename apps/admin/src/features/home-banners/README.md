# Homepage banners

This feature owns the admin and storefront-banner management boundary.

- `api/` contains the authenticated same-origin HTTP client and API guard.
- `components/` contains the compact drag-sort manager and media form.
- `schemas/` validates banner data, schedules, destinations, and upload contracts.
- `services/` coordinates media processing, storage cleanup, and business errors.
- `repositories/` is the only admin layer that mutates `home_banners`.
- `server/` exposes authenticated readers to thin App Router pages.

Images are decoded and converted to WebP on the server. Videos use a short-lived
signed upload URL, then the finalize API checks the MP4 container and H.264 codec
marker before the URL can be saved. Creation and ordering are serialized with a
PostgreSQL advisory transaction lock, and the total is capped at five.

The customer website reads only active banners inside their optional schedule.
When no banner qualifies, the previous Sony FX3 hero remains the exact fallback.
