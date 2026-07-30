import { authorizeCatalogRequest } from "./route-guard";
import { BrandServiceError } from "../services/brands-service-error";

interface RateEntry {
  count: number;
  resetAt: number;
}

const rateEntries = new Map<string, RateEntry>();
const MUTATION_METHODS = new Set(["POST", "PATCH", "PUT", "DELETE"]);

function rateLimit(actorId: string, request: Request) {
  const mutation = request.method !== "GET";
  const upload = request.headers.get("content-type")?.includes("multipart/form-data");
  const maximum = upload ? 12 : mutation ? 60 : 240;
  const now = Date.now();
  if (rateEntries.size > 1_000) {
    for (const [entryKey, entry] of rateEntries) {
      if (entry.resetAt <= now) rateEntries.delete(entryKey);
    }
  }
  const key = `${actorId}:${mutation ? "mutation" : "read"}:${new URL(request.url).pathname}`;
  const current = rateEntries.get(key);
  if (!current || current.resetAt <= now) {
    rateEntries.set(key, { count: 1, resetAt: now + 60_000 });
    return null;
  }
  current.count += 1;
  if (current.count <= maximum) return null;
  return errorResponse("RATE_LIMITED", "Too many brand requests. Try again shortly.", 429);
}

export function errorResponse(
  code: string,
  message: string,
  status: number,
  fieldErrors?: Record<string, string[]>,
) {
  return Response.json({
    success: false,
    error: { code, message, ...(fieldErrors ? { fieldErrors } : {}) },
  }, { status });
}

export function successResponse<T>(data: T, status = 200) {
  return Response.json({ success: true, data }, { status });
}

export async function parseBrandJson(request: Request) {
  try {
    return await request.json() as unknown;
  } catch {
    throw new BrandServiceError("Request body is malformed.", "MALFORMED_REQUEST", 400);
  }
}

export async function parseBrandFormData(request: Request) {
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("multipart/form-data")) {
    throw new BrandServiceError("Brand form must use multipart/form-data.", "UNSUPPORTED_MEDIA_TYPE", 415);
  }
  try {
    return await request.formData();
  } catch {
    throw new BrandServiceError("Multipart request is malformed.", "MALFORMED_REQUEST", 400);
  }
}

export async function brandsRoute(request: Request, operation: () => Promise<Response>) {
  if (MUTATION_METHODS.has(request.method) && !request.headers.get("origin")) {
    return errorResponse("INVALID_ORIGIN", "A same-origin request is required.", 403);
  }
  const authorization = await authorizeCatalogRequest(request);
  if ("response" in authorization) return authorization.response;
  const limited = rateLimit(authorization.admin.id, request);
  if (limited) return limited;
  try {
    return await operation();
  } catch (error) {
    if (error instanceof BrandServiceError) {
      return errorResponse(error.code, error.message, error.status, error.fieldErrors);
    }
    console.error("Brand API request failed.", {
      actorId: authorization.admin.id,
      method: request.method,
      pathname: new URL(request.url).pathname,
      error,
    });
    return errorResponse("BRAND_INTERNAL_ERROR", "Brand operation failed. Try again.", 500);
  }
}
