import type { ZodError } from "zod";

import type { FlattenedValidationError } from "@/lib/action-state";

const MUTATION_METHODS = new Set(["POST", "PATCH", "PUT", "DELETE"]);

/**
 * Same-origin guard for storefront mutations. Server actions verified origin
 * implicitly; JSON routes must do it explicitly.
 */
export function isSameOrigin(request: Request) {
  if (!MUTATION_METHODS.has(request.method)) return true;
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

export function crossOriginFailure() {
  return Response.json(
    {
      success: false,
      message: "Cross-origin mutations are not allowed.",
      error: "CROSS_ORIGIN",
    },
    { status: 403, headers: { "Cache-Control": "no-store" } },
  );
}

export function storefrontSuccess(
  message: string,
  data?: unknown,
): Response {
  return Response.json(
    { success: true, message, ...(data !== undefined ? { data } : {}) },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export function storefrontFailure(
  message: string,
  status = 400,
  options: { redirectTo?: string; fieldErrors?: FlattenedValidationError } = {},
): Response {
  return Response.json(
    {
      success: false,
      message,
      error: options.fieldErrors ?? message,
      ...(options.redirectTo ? { redirectTo: options.redirectTo } : {}),
    },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

export function validationFailureResponse(error: ZodError): Response {
  const flattened = error.flatten();
  return storefrontFailure("Please check the form.", 422, {
    fieldErrors: flattened,
  });
}

export async function readJsonBody(request: Request): Promise<unknown | null> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}
