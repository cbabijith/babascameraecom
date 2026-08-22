import { resolveAdminAccess } from "@/features/auth/server/admin";

import { catalogApiError } from "./api-error";

const MUTATION_METHODS = new Set(["POST", "PATCH", "PUT", "DELETE"]);

export function isSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

export async function authorizeCatalogRequest(request: Request) {
  if (MUTATION_METHODS.has(request.method) && !isSameOrigin(request)) {
    return {
      response: catalogApiError("INVALID_ORIGIN", "Cross-origin catalogue mutations are not allowed.", 403),
    } as const;
  }
  const access = await resolveAdminAccess();
  if (access.kind === "anonymous") {
    return { response: catalogApiError("UNAUTHENTICATED", "Sign in to continue.", 401) } as const;
  }
  if (access.kind === "forbidden" || !access.admin.permissions.includes("catalog")) {
    return { response: catalogApiError("FORBIDDEN", "Catalogue access is not allowed.", 403) } as const;
  }
  return { admin: access.admin } as const;
}

export async function catalogRoute(
  request: Request,
  operation: () => Promise<Response>,
) {
  const authorization = await authorizeCatalogRequest(request);
  if ("response" in authorization) return authorization.response;
  try {
    return await operation();
  } catch (error) {
    console.error("Catalogue API request failed.", {
      method: request.method,
      pathname: new URL(request.url).pathname,
      actorId: authorization.admin.id,
      error,
    });
    return catalogApiError("INTERNAL_ERROR", "Something went wrong. Try again.", 500);
  }
}
