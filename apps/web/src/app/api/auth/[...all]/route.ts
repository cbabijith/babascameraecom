import { getWebAuth, getRequestOrigin } from "@/lib/auth/better-auth";

async function handle(request: Request): Promise<Response> {
  const forwardedHost = request.headers.get("x-forwarded-host");
  const origin = forwardedHost
    ? `${request.headers.get("x-forwarded-proto") ?? "https"}://${forwardedHost}`
    : await getRequestOrigin();
  const auth = getWebAuth(origin);
  return auth.handler(request);
}

export const GET = handle;
export const POST = handle;
