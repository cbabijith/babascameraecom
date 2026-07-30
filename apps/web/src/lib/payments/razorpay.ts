import "server-only";

import { verifyPaymentHmac, verifyWebhookHmac } from "./signatures";

interface RazorpayNotes {
  order_id?: string;
  owner_ref?: string;
  refund_key?: string;
}

export interface RazorpayOrder {
  id: string;
  amount: number;
  amount_paid: number;
  amount_due: number;
  currency: string;
  receipt: string;
  status: "created" | "attempted" | "paid";
  notes: RazorpayNotes;
}

export interface RazorpayPayment {
  id: string;
  order_id: string;
  amount: number;
  currency: string;
  status: "created" | "authorized" | "captured" | "refunded" | "failed";
  captured: boolean;
  notes?: RazorpayNotes;
}

export class RazorpayOperationError extends Error {
  constructor(
    message: string,
    readonly definitive: boolean,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = "RazorpayOperationError";
  }
}

function credentials() {
  const keyId = process.env.RAZORPAY_KEY_ID?.trim();
  const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim();
  if (!keyId || !keySecret) {
    throw new RazorpayOperationError(
      "Online payment is not configured.",
      true,
    );
  }
  return { keyId, keySecret };
}

async function razorpayRequest<T>(
  path: string,
  init: RequestInit = {},
): Promise<{ response: Response; body: T | null }> {
  const { keyId, keySecret } = credentials();
  let response: Response;
  try {
    response = await fetch(`https://api.razorpay.com/v1/${path}`, {
      ...init,
      headers: {
        Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`,
        ...(init.body ? { "Content-Type": "application/json" } : {}),
        ...init.headers,
      },
      cache: "no-store",
      signal: AbortSignal.timeout(8_000),
    });
  } catch (cause) {
    throw new RazorpayOperationError(
      "Razorpay did not return a conclusive response.",
      false,
      cause,
    );
  }
  const body = (await response.json().catch(() => null)) as T | null;
  return { response, body };
}

function validateOwnedOrder(
  order: RazorpayOrder,
  expected: {
    localOrderId: string;
    ownerRef: string;
    receipt: string;
    amountPaise: number;
    currency: string;
  },
): RazorpayOrder {
  if (
    !order.id ||
    order.receipt !== expected.receipt ||
    order.amount !== expected.amountPaise ||
    order.currency.toUpperCase() !== expected.currency.toUpperCase() ||
    order.notes?.order_id !== expected.localOrderId ||
    order.notes?.owner_ref !== expected.ownerRef
  ) {
    throw new RazorpayOperationError(
      "Razorpay returned an order that does not match this checkout.",
      false,
      order,
    );
  }
  return order;
}

async function findOrderByReceipt(input: {
  localOrderId: string;
  ownerRef: string;
  receipt: string;
  amountPaise: number;
  currency: string;
}): Promise<RazorpayOrder | null> {
  const params = new URLSearchParams({
    receipt: input.receipt,
    count: "100",
  });
  const { response, body } = await razorpayRequest<{
    items?: RazorpayOrder[];
  }>(`orders?${params.toString()}`);
  if (!response.ok || !body) {
    throw new RazorpayOperationError(
      "Unable to reconcile Razorpay order creation.",
      false,
      body,
    );
  }
  const matches = (body.items ?? []).filter(
    (order) => order.receipt === input.receipt,
  );
  if (!matches.length) return null;
  if (matches.length !== 1 || !matches[0]) {
    throw new RazorpayOperationError(
      "Razorpay returned duplicate checkout receipts.",
      false,
      body,
    );
  }
  return validateOwnedOrder(matches[0], input);
}

export async function createOrFindRazorpayOrder(input: {
  localOrderId: string;
  orderNumber: string;
  ownerRef: string;
  amountPaise: number;
  currency?: string;
}): Promise<RazorpayOrder> {
  const expected = {
    ...input,
    currency: input.currency ?? "INR",
    receipt: input.orderNumber,
  };
  const existing = await findOrderByReceipt(expected);
  if (existing) return existing;

  const { response, body } = await razorpayRequest<RazorpayOrder>("orders", {
    method: "POST",
    body: JSON.stringify({
      amount: input.amountPaise,
      currency: expected.currency,
      receipt: expected.receipt,
      notes: {
        order_id: input.localOrderId,
        owner_ref: input.ownerRef,
      },
    }),
  });
  if (!response.ok || !body?.id) {
    const reconciled = await findOrderByReceipt(expected);
    if (reconciled) return reconciled;
    const description =
      body && typeof body === "object" && "description" in body
        ? String(body.description)
        : "Razorpay order creation failed.";
    throw new RazorpayOperationError(description, !response.ok, body);
  }
  return validateOwnedOrder(body, expected);
}

export async function fetchRazorpayCapture(input: {
  providerOrderId: string;
  providerPaymentId: string;
  localOrderId: string;
  orderNumber: string;
  ownerRef: string;
  amountPaise: number;
  currency?: string;
}) {
  const [orderResult, paymentResult] = await Promise.all([
    razorpayRequest<RazorpayOrder>(
      `orders/${encodeURIComponent(input.providerOrderId)}`,
    ),
    razorpayRequest<RazorpayPayment>(
      `payments/${encodeURIComponent(input.providerPaymentId)}`,
    ),
  ]);
  if (
    !orderResult.response.ok ||
    !paymentResult.response.ok ||
    !orderResult.body ||
    !paymentResult.body
  ) {
    throw new RazorpayOperationError(
      "Unable to confirm the captured payment.",
      false,
    );
  }
  const currency = input.currency ?? "INR";
  const order = validateOwnedOrder(orderResult.body, {
    localOrderId: input.localOrderId,
    ownerRef: input.ownerRef,
    receipt: input.orderNumber,
    amountPaise: input.amountPaise,
    currency,
  });
  const payment = paymentResult.body;
  if (
    payment.order_id !== order.id ||
    payment.id !== input.providerPaymentId ||
    payment.amount !== input.amountPaise ||
    payment.currency.toUpperCase() !== currency.toUpperCase() ||
    payment.status !== "captured" ||
    payment.captured !== true ||
    order.status !== "paid" ||
    order.amount_paid !== input.amountPaise ||
    order.amount_due !== 0
  ) {
    throw new RazorpayOperationError(
      "Razorpay payment is not a complete exact capture.",
      false,
      { order, payment },
    );
  }
  return { order, payment };
}

export function verifyCheckoutSignature(input: {
  providerOrderId: string;
  providerPaymentId: string;
  signature: string;
}): boolean {
  const secret = process.env.RAZORPAY_KEY_SECRET?.trim();
  if (!secret || !input.signature) return false;
  return verifyPaymentHmac({
    providerOrderId: input.providerOrderId,
    providerPaymentId: input.providerPaymentId,
    signature: input.signature,
    secret,
  });
}

export function verifyRazorpayWebhook(
  rawBody: string,
  signature: string,
): boolean {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET?.trim();
  if (!secret || !signature) return false;
  return verifyWebhookHmac({ rawBody, signature, secret });
}

export async function createRazorpayRefund(input: {
  providerPaymentId: string;
  amountPaise: number;
  idempotencyKey: string;
  localOrderId: string;
}) {
  const { response, body } = await razorpayRequest<{
    id?: string;
    status?: "pending" | "processed" | "failed";
    payment_id?: string;
    amount?: number;
  }>(`payments/${encodeURIComponent(input.providerPaymentId)}/refund`, {
    method: "POST",
    headers: { "X-Refund-Idempotency": input.idempotencyKey },
    body: JSON.stringify({
      amount: input.amountPaise,
      receipt: input.idempotencyKey,
      notes: { order_id: input.localOrderId },
    }),
  });
  if (
    !response.ok ||
    !body?.id ||
    body.payment_id !== input.providerPaymentId ||
    body.amount !== input.amountPaise
  ) {
    throw new RazorpayOperationError(
      "Unable to initialize the Razorpay refund.",
      !response.ok,
      body,
    );
  }
  return body as {
    id: string;
    status: "pending" | "processed" | "failed";
    payment_id: string;
    amount: number;
  };
}

interface RazorpayRefund {
  id: string;
  payment_id: string;
  amount: number;
  status: "pending" | "processed" | "failed";
  notes?: RazorpayNotes;
}

function validateRefund(
  refund: RazorpayRefund,
  input: {
    providerPaymentId: string;
    amountPaise: number;
    idempotencyKey: string;
    localOrderId: string;
  },
) {
  if (
    !refund.id ||
    refund.payment_id !== input.providerPaymentId ||
    refund.amount !== input.amountPaise ||
    refund.notes?.order_id !== input.localOrderId ||
    refund.notes?.refund_key !== input.idempotencyKey
  ) {
    throw new RazorpayOperationError(
      "Razorpay returned a refund that does not match the local request.",
      false,
      refund,
    );
  }
  return refund;
}

async function findRazorpayRefund(input: {
  providerPaymentId: string;
  amountPaise: number;
  idempotencyKey: string;
  localOrderId: string;
}): Promise<RazorpayRefund | null> {
  const { response, body } = await razorpayRequest<{
    items?: RazorpayRefund[];
  }>(
    `payments/${encodeURIComponent(input.providerPaymentId)}/refunds`,
  );
  if (!response.ok || !body) {
    throw new RazorpayOperationError(
      "Unable to reconcile the Razorpay refund.",
      false,
      body,
    );
  }
  const matches = (body.items ?? []).filter(
    (refund) => refund.notes?.refund_key === input.idempotencyKey,
  );
  if (!matches.length) return null;
  if (matches.length !== 1 || !matches[0]) {
    throw new RazorpayOperationError(
      "Razorpay returned duplicate refunds for one local request.",
      false,
      body,
    );
  }
  return validateRefund(matches[0], input);
}

export async function createOrFindRazorpayRefund(input: {
  providerPaymentId: string;
  amountPaise: number;
  idempotencyKey: string;
  localOrderId: string;
}): Promise<RazorpayRefund> {
  const existing = await findRazorpayRefund(input);
  if (existing) return existing;
  const { response, body } = await razorpayRequest<RazorpayRefund>(
    `payments/${encodeURIComponent(input.providerPaymentId)}/refund`,
    {
      method: "POST",
      headers: { "X-Refund-Idempotency": input.idempotencyKey },
      body: JSON.stringify({
        amount: input.amountPaise,
        receipt: input.idempotencyKey,
        notes: {
          order_id: input.localOrderId,
          refund_key: input.idempotencyKey,
        },
      }),
    },
  );
  if (!response.ok || !body?.id) {
    const reconciled = await findRazorpayRefund(input);
    if (reconciled) return reconciled;
    throw new RazorpayOperationError(
      "Unable to initialize the Razorpay refund.",
      !response.ok,
      body,
    );
  }
  return validateRefund(body, input);
}

export function publicRazorpayKeyId(): string {
  return process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID?.trim() ?? "";
}
