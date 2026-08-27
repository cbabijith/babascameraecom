import { resolveAdminAccess } from "@/features/auth/server/admin";

const MUTATION_METHODS = new Set(["POST", "PATCH", "PUT", "DELETE"]);

export function isSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  const requestUrl = new URL(request.url);
  const forwardedHost = request.headers.get("x-forwarded-host");
  const host = forwardedHost ?? request.headers.get("host") ?? requestUrl.host;
  const forwardedProto = request.headers.get("x-forwarded-proto");
  const expectedOrigin = `${forwardedProto ?? requestUrl.protocol.replace(":", "")}://${host}`;
  try {
    return new URL(origin).origin === new URL(expectedOrigin).origin;
  } catch {
    return false;
  }
}

export interface AdminApiAuthorization {
  admin: { id: string; email: string };
}

/**
 * Guard for admin JSON APIs: same-origin mutations plus an authenticated
 * admin session carrying the required permission. Returns the admin on
 * success, or a Response the caller should return verbatim.
 */
export async function authorizeAdminApi(
  request: Request,
  permission: string,
): Promise<AdminApiAuthorization | { response: Response }> {
  if (MUTATION_METHODS.has(request.method) && !isSameOrigin(request)) {
    return {
      response: Response.json(
        { success: false, error: { code: "INVALID_ORIGIN", message: "Cross-origin mutations are not allowed." } },
        { status: 403 },
      ),
    };
  }
  const access = await resolveAdminAccess();
  if (access.kind === "anonymous") {
    return {
      response: Response.json(
        { success: false, error: { code: "UNAUTHENTICATED", message: "Sign in to continue." } },
        { status: 401 },
      ),
    };
  }
  if (access.kind === "forbidden" || !(access.admin.permissions as readonly string[]).includes(permission)) {
    return {
      response: Response.json(
        { success: false, error: { code: "FORBIDDEN", message: "You do not have access to this resource." } },
        { status: 403 },
      ),
    };
  }
  return { admin: { id: access.admin.id, email: access.admin.email } };
}

export function apiSuccess(data: unknown, status = 200) {
  return Response.json({ success: true, data }, { status });
}

export function apiError(
  code: string,
  message: string,
  status: number,
  fieldErrors?: Record<string, string[]>,
) {
  return Response.json(
    { success: false, error: { code, message, ...(fieldErrors ? { fieldErrors } : {}) } },
    { status },
  );
}

export function zodFieldErrors(error: { flatten: () => { formErrors: string[]; fieldErrors: Record<string, string[] | undefined> } }) {
  const flattened = error.flatten();
  return Object.fromEntries(
    Object.entries(flattened.fieldErrors)
      .filter((entry): entry is [string, string[]] => Array.isArray(entry[1]) && entry[1].length > 0),
  );
}
