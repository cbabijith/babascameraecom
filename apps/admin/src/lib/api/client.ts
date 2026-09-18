"use client";

export interface AdminApiFailure {
  success: false;
  error: {
    code: string;
    message: string;
    fieldErrors?: Record<string, string[]>;
  };
}

export interface AdminApiSuccess<T> {
  success: true;
  data: T;
}

export type AdminApiResponse<T = unknown> =
  | AdminApiSuccess<T>
  | AdminApiFailure;

/**
 * Same-origin JSON fetch for the admin API surface. Never throws: network and
 * malformed-response failures come back as a normal failure result so callers
 * can render the message.
 */
export async function adminJson<T = unknown>(
  url: string,
  init: { method?: string; body?: unknown } = {},
): Promise<AdminApiResponse<T>> {
  try {
    const requestInit: RequestInit = { method: init.method ?? "GET" };
    if (init.body !== undefined) {
      requestInit.headers = { "Content-Type": "application/json" };
      requestInit.body = JSON.stringify(init.body);
    }
    const response = await fetch(url, requestInit);
    const parsed = (await response
      .json()
      .catch(() => null)) as AdminApiResponse<T> | null;
    if (parsed && typeof parsed === "object" && "success" in parsed) {
      return parsed;
    }
    return {
      success: false,
      error: {
        code: "MALFORMED_RESPONSE",
        message: "The server response could not be read. Try again.",
      },
    };
  } catch (error) {
    console.error(`Admin API request to ${url} failed`, error);
    return {
      success: false,
      error: {
        code: "NETWORK_ERROR",
        message: "The request could not be completed. Try again.",
      },
    };
  }
}

/**
 * Values as strings, mirroring the former FormData payloads so the shared Zod
 * form schemas (string booleans, money strings, …) parse identically.
 */
export function stringifyValues(
  values: Record<string, unknown>,
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(values).map(([key, value]) => [key, String(value)]),
  );
}

/** The refund endpoint predates the success/error envelope; normalize it. */
export async function refundOrderApi(
  orderId: string,
  reason: string,
): Promise<AdminApiResponse<null>> {
  try {
    const response = await fetch(`/api/admin/orders/${orderId}/refund`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason }),
    });
    const body = (await response.json().catch(() => null)) as {
      ok?: boolean;
      error?: string;
    } | null;
    if (response.ok && body?.ok) return { success: true, data: null };
    return {
      success: false,
      error: {
        code: "REFUND_FAILED",
        message:
          body?.error ??
          "Refund could not be completed. Check the order and provider state before retrying.",
      },
    };
  } catch (error) {
    console.error("Refund request failed", error);
    return {
      success: false,
      error: {
        code: "NETWORK_ERROR",
        message: "Refund request failed.",
      },
    };
  }
}
