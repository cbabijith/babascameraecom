/**
 * Baba's Camera storefront backend (Hono on Bun).
 *
 * Owns every database touch for the storefront. The route handlers are the
 * same modules the Next.js app served at /api/*, imported verbatim from
 * apps/web and mounted on Hono; `next/cache`, `next/headers`, `next/server`,
 * and `server-only` are shimmed via preload.ts so the handlers run
 * unmodified. The Vercel storefront talks to this service only over HTTP.
 */
import { serve } from "@hono/node-server";
import { Hono } from "hono";

import { requestALS } from "./shims/next-headers";
import { rscRoutes } from "./rsc-routes";
import { portedRoutes } from "./routes.gen";

const app = new Hono();

type RouteHandler = (
  request: Request,
  context: { params: Promise<Record<string, string>> },
) => Promise<Response> | Response;

/**
 * Origins allowed to mutate: the canonical storefront (and anything else the
 * operator lists, e.g. a preview URL). The Vercel rewrite forwards the
 * browser's Origin header; behind the proxy the Host no longer matches it,
 * so we normalize x-forwarded-host to the trusted origin before the ported
 * same-origin guard runs. Untrusted origins keep the proxy host and fail the
 * guard, preserving the CSRF protection.
 */
function trustedOrigins(): Set<string> {
  const raw = [
    process.env.BETTER_AUTH_URL,
    ...(process.env.BACKEND_TRUSTED_ORIGINS ?? "").split(","),
  ]
    .map((value) => value?.trim())
    .filter(Boolean);
  return new Set(raw.map((value) => new URL(value).origin));
}

app.all("/api/backend/ping", (c) => c.json({ service: "backend", status: "ok" }));

app.route("/api/storefront/rsc", rscRoutes);

for (const route of portedRoutes) {
  const module = route.module as Record<string, RouteHandler | undefined>;
  app.all(route.honoPath, async (c) => {
    const method = c.req.method.toUpperCase();
    const handler = module[method] ?? (method === "HEAD" ? module.GET : undefined);
    if (!handler) {
      return c.json(
        { error: { code: "METHOD_NOT_ALLOWED", message: `${method} is not supported on ${route.url}` } },
        405,
      );
    }

    const headers = new Headers(c.req.raw.headers);
    const origin = headers.get("origin");
    if (origin) {
      try {
        const parsed = new URL(origin);
        if (trustedOrigins().has(parsed.origin)) {
          headers.set("x-forwarded-host", parsed.host);
          headers.set("x-forwarded-proto", parsed.protocol.replace(":", ""));
        }
      } catch {
        // malformed Origin: leave headers untouched; the guard rejects it
      }
    }

    const params: Record<string, string> = { ...c.req.param() };
    if (route.wildcardParam) {
      const prefix = route.honoPath.slice(0, -1); // strip trailing "*"
      const remainder = new URL(c.req.url).pathname.slice(prefix.length);
      params[route.wildcardParam] = remainder;
    }

    const request = new Request(c.req.url, {
      method: c.req.method,
      headers,
      body: ["GET", "HEAD"].includes(method) ? undefined : c.req.raw.body,
      // @ts-expect-error -- duplex is required when forwarding request bodies
      duplex: "half",
    });

    const store = {
      cookieHeader: headers.get("cookie"),
      headers,
      setCookies: [] as string[],
    };

    try {
      const response = await requestALS.run(store, () =>
        handler(request, { params: Promise.resolve(params) }),
      );
      const responseHeaders = new Headers(response.headers);
      for (const cookie of store.setCookies) responseHeaders.append("set-cookie", cookie);
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
      });
    } catch (error) {
      console.error(`[backend] ${method} ${route.url} failed`, error);
      return c.json(
        { success: false, error: { code: "BACKEND_HANDLER_ERROR", message: "The request failed on the backend." } },
        500,
      );
    }
  });
}

app.notFound((c) =>
  c.json({ error: { code: "NOT_FOUND", message: "No backend route matches this path." } }, 404),
);

const port = Number(process.env.PORT ?? 8080);
serve({ fetch: app.fetch, port }, (info) => {
  console.log(`[backend] Baba's Camera API listening on port ${info.port}`);
});
