import { auth } from "@/lib/auth/auth";
import { toNextJsHandler } from "better-auth/next-js";

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

export async function GET(request: Request) {
  if (isBlocked(request)) {
    return Response.json(
      { message: "Sign-up is not available on the admin app." },
      { status: 404 },
    );
  }
  const handler = toNextJsHandler(auth.handler);
  return handler.GET(request);
}

export async function POST(request: Request) {
  if (isBlocked(request)) {
    return Response.json(
      { message: "Sign-up is not available on the admin app." },
      { status: 404 },
    );
  }
  const handler = toNextJsHandler(auth.handler);
  return handler.POST(request);
}
