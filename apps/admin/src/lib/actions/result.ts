import type { ZodError } from "zod";

export type AdminActionResult<T = null> =
  | { success: true; data: T }
  | {
      success: false;
      error: string;
      fieldErrors?: Record<string, string[]>;
    };

export class AdminActionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AdminActionError";
  }
}

export function actionSuccess<T>(data: T): AdminActionResult<T> {
  return { success: true, data };
}

export function actionFailure(
  error: string,
  fieldErrors?: Record<string, string[]>,
): AdminActionResult<never> {
  return {
    success: false,
    error,
    ...(fieldErrors && Object.keys(fieldErrors).length ? { fieldErrors } : {}),
  };
}

export function validationFailure(error: ZodError): AdminActionResult<never> {
  const flattened = error.flatten();
  const fieldErrors = Object.fromEntries(
    Object.entries(flattened.fieldErrors)
      .filter((entry): entry is [string, string[]] => Array.isArray(entry[1]) && entry[1].length > 0),
  );
  const firstFieldError = Object.values(fieldErrors)[0]?.[0];
  return actionFailure(
    flattened.formErrors[0] ?? firstFieldError ?? "Check the submitted fields and try again.",
    fieldErrors,
  );
}

export function publicActionError(error: unknown, fallback: string) {
  return error instanceof AdminActionError ? error.message : fallback;
}

export function actionFailureFromError(
  error: unknown,
  fallback: string,
  context: string,
): AdminActionResult<never> {
  console.error(context, error);
  return actionFailure(publicActionError(error, fallback));
}
