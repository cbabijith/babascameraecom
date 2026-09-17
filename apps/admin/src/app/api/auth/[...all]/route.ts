import { toNextJsHandler } from "better-auth/next-js";

import { getAdminAuth, getRequestOrigin } from "@/lib/auth/auth";

export const dynamic = "force-dynamic";

/**
 * The admin app only signs people in — it never lets the public create
 * accounts. Block better-auth's registration endpoints outright; admin
 * accounts are provisioned by promoting an existing storefront user.
 */
const BLOCKED_AUTH_PATHS = /\/sign-up(?:\/|$)/;

function isBlocked(request: Request) {
  return BLOCKED_AUTH_PATHS.test(new URL(request.url).pathname);
}

/**
 * The auth instance is built per request origin: better-auth rejects
 * sign-ins whose Origin does not match its trusted origin, and the admin
 * is reachable on two domains (the Railway domain and the custom domain).
 * A single fixed baseURL would lock out whichever domain the env var did
 * not name.
 */
async function handler() {
  const authInstance = getAdminAuth(await getRequestOrigin());
  return toNextJsHandler(authInstance.handler);
}

export async function GET(request: Request) {
  if (isBlocked(request)) {
    return Response.json(
      { message: "Sign-up is not available on the admin app." },
      { status: 404 },
    );
  }
  return (await handler()).GET(request);
}

export async function POST(request: Request) {
  if (isBlocked(request)) {
    return Response.json(
      { message: "Sign-up is not available on the admin app." },
      { status: 404 },
    );
  }
  return (await handler()).POST(request);
}
