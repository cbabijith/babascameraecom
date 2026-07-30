import type { AdminActionResult } from "@/lib/actions/result";

export interface CatalogApiErrorBody {
  success: false;
  error: {
    code: string;
    message: string;
    fieldErrors?: Record<string, string[]>;
  };
}

export interface CatalogApiSuccess<T> {
  success: true;
  data: T;
  meta?: Record<string, unknown>;
}

export type CatalogApiResponse<T> = CatalogApiSuccess<T> | CatalogApiErrorBody;

export function actionResultResponse<T>(
  result: AdminActionResult<T>,
  options: { created?: boolean; empty?: boolean } = {},
) {
  if (!result.success) {
    return Response.json(
      {
        success: false,
        error: {
          code: result.fieldErrors ? "VALIDATION_FAILED" : "CATALOG_OPERATION_FAILED",
          message: result.error,
          ...(result.fieldErrors ? { fieldErrors: result.fieldErrors } : {}),
        },
      },
      { status: result.fieldErrors ? 422 : 409 },
    );
  }
  if (options.empty) return new Response(null, { status: 204 });
  return Response.json(
    { success: true, data: result.data },
    { status: options.created ? 201 : 200 },
  );
}

export function catalogApiError(code: string, message: string, status: number) {
  return Response.json(
    { success: false, error: { code, message } },
    { status },
  );
}
