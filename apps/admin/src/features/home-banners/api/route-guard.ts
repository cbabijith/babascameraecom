import { resolveAdminAccess } from "@/features/auth/server/admin";

import { HomeBannerError } from "../services/home-banner-service";

const MUTATIONS = new Set(["POST", "PATCH", "PUT", "DELETE"]);

function errorResponse(code: string, message: string, status: number, fieldErrors?: Record<string, string[]>) {
  return Response.json({
    success: false,
    error: { code, message, ...(fieldErrors ? { fieldErrors } : {}) },
  }, { status });
}

export async function homeBannerRoute(request: Request, operation: () => Promise<Response>) {
  if (MUTATIONS.has(request.method)) {
    const origin = request.headers.get("origin");
    if (origin) {
      try {
        const requestUrl = new URL(request.url);
        const forwardedHost = request.headers.get("x-forwarded-host");
        const host = forwardedHost ?? request.headers.get("host") ?? requestUrl.host;
        const forwardedProto = request.headers.get("x-forwarded-proto");
        const expectedOrigin = `${forwardedProto ?? requestUrl.protocol.replace(":", "")}://${host}`;
        if (new URL(origin).origin !== new URL(expectedOrigin).origin) {
          return errorResponse("INVALID_ORIGIN", "Cross-origin banner mutations are not allowed.", 403);
        }
      } catch {
        return errorResponse("INVALID_ORIGIN", "Request origin is invalid.", 403);
      }
    }
  }
  const access = await resolveAdminAccess();
  if (access.kind === "anonymous") return errorResponse("UNAUTHENTICATED", "Sign in to continue.", 401);
  if (access.kind === "forbidden" || !access.admin.permissions.includes("storefront")) {
    return errorResponse("FORBIDDEN", "Storefront access is not allowed.", 403);
  }
  try {
    return await operation();
  } catch (error) {
    if (error instanceof HomeBannerError) {
      return errorResponse(error.code, error.message, error.status, error.fieldErrors);
    }
    console.error("Homepage banner API failed.", {
      method: request.method,
      pathname: new URL(request.url).pathname,
      actorId: access.admin.id,
      error,
    });
    return errorResponse("INTERNAL_ERROR", "Something went wrong. Try again.", 500);
  }
}

export function successResponse<T>(data: T, status = 200) {
  return Response.json({ success: true, data }, { status });
}
