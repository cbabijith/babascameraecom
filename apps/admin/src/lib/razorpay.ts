import { z } from "zod";

const refundSchema = z.object({
  id: z.string().min(1),
  payment_id: z.string().min(1),
  amount: z.number().int().nonnegative(),
  status: z.enum(["pending", "processed", "failed"]),
});

export type RazorpayRefundResult = z.infer<typeof refundSchema>;

export class RazorpayRequestError extends Error {
  constructor(
    message: string,
    readonly definitive: boolean,
    readonly status?: number,
  ) {
    super(message);
    this.name = "RazorpayRequestError";
  }
}

function credentials() {
  const id = process.env.RAZORPAY_KEY_ID?.trim();
  const secret = process.env.RAZORPAY_KEY_SECRET?.trim();
  if (!id || !secret) throw new RazorpayRequestError("Razorpay server credentials are not configured.", true);
  return Buffer.from(`${id}:${secret}`).toString("base64");
}

export async function requestFullRefund({
  paymentId,
  amountPaise,
  idempotencyKey,
  orderId,
  providerRefundId,
  fetcher = fetch,
}: {
  paymentId: string;
  amountPaise: number;
  idempotencyKey: string;
  orderId: string;
  providerRefundId?: string | null;
  fetcher?: typeof fetch;
}): Promise<RazorpayRefundResult> {
  if (!Number.isSafeInteger(amountPaise) || amountPaise <= 0) {
    throw new RazorpayRequestError("Refund amount must be a positive integer number of paise.", true);
  }
  if (!/^[A-Za-z0-9_-]{10,}$/.test(idempotencyKey)) {
    throw new RazorpayRequestError(
      "Refund idempotency key must contain at least 10 alphanumeric, hyphen, or underscore characters.",
      true,
    );
  }
  const endpoint = providerRefundId
    ? `https://api.razorpay.com/v1/refunds/${encodeURIComponent(providerRefundId)}`
    : `https://api.razorpay.com/v1/payments/${encodeURIComponent(paymentId)}/refund`;
  let response: Response;
  try {
    response = await fetcher(endpoint, {
      method: providerRefundId ? "GET" : "POST",
      headers: {
        Authorization: `Basic ${credentials()}`,
        "Content-Type": "application/json",
        "X-Refund-Idempotency": idempotencyKey,
      },
      ...(providerRefundId
        ? {}
        : { body: JSON.stringify({ amount: amountPaise, speed: "normal", notes: { order_id: orderId } }) }),
      signal: AbortSignal.timeout(10_000),
      cache: "no-store",
    });
  } catch (error) {
    throw new RazorpayRequestError(
      `Razorpay request did not complete: ${error instanceof Error ? error.message : "network error"}`,
      false,
    );
  }
  if (!response.ok) {
    const transient = response.status === 408 || response.status === 409 || response.status === 429 || response.status >= 500;
    throw new RazorpayRequestError(`Razorpay rejected the refund request (${response.status}).`, !transient, response.status);
  }
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new RazorpayRequestError("Razorpay returned an invalid response.", false);
  }
  const parsed = refundSchema.safeParse(body);
  if (!parsed.success) throw new RazorpayRequestError("Razorpay returned an unexpected refund payload.", false);
  if (parsed.data.payment_id !== paymentId || parsed.data.amount !== amountPaise) {
    throw new RazorpayRequestError("Razorpay refund identity or amount did not match the order.", false);
  }
  return parsed.data;
}
