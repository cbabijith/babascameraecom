import type { ZodError } from "zod";

export interface FlattenedValidationError {
  formErrors: string[];
  fieldErrors: Record<string, string[] | undefined>;
}

export type StorefrontActionState<T = unknown> =
  | {
      success: true;
      message: string;
      data?: T;
      error?: never;
    }
  | {
      success: false;
      message: string;
      error: string | FlattenedValidationError;
      data?: never;
    };

export function validationFailure(
  error: ZodError,
  message = "Please check the form.",
): StorefrontActionState<never> {
  return {
    success: false,
    message,
    error: error.flatten(),
  };
}

export function actionFailure(
  message = "Something went wrong. Please try again.",
): StorefrontActionState<never> {
  return {
    success: false,
    message,
    error: message,
  };
}
