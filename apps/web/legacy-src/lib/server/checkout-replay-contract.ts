export type CheckoutReplayPaymentMethod =
  | "razorpay"
  | "bank_transfer"
  | "cod";

type CheckoutReplayOrder = {
  id: string;
  checkout_session_id: string | null;
  customer_id: string;
  status: string;
  payment_status: string;
  payment_method: string;
  total_minor: number;
  currency: string;
};

type CheckoutReplayAttempt = {
  id: string;
  order_id: string;
  method: string;
  status: string;
  amount_minor: number;
  currency: string;
};

export type CheckoutReplayDisposition = "payable" | "completed";

const ORDER_PAYMENT_TERMINAL = new Set(["cancelled", "failed"]);
const ATTEMPT_PAYMENT_TERMINAL = new Set(["cancelled", "failed"]);
const PAYMENT_COMPLETE = new Set([
  "paid",
  "partially_refunded",
  "refunded",
]);
const ATTEMPT_COMPLETE = new Set([
  "captured",
  "partially_refunded",
  "refunded",
]);

function staleCheckoutError(): Error {
  return new Error(
    "This order can no longer accept payment. Request a new checkout quote.",
  );
}

/**
 * Validates the authoritative database state returned for a consumed checkout
 * session. This deliberately does not trust the original RPC result: expiry
 * cleanup or cancellation may have made the linked order unpayable since it
 * was first created.
 */
export function checkoutReplayDisposition(input: {
  expected: {
    checkoutSessionId: string;
    customerId: string;
    paymentMethod: CheckoutReplayPaymentMethod;
    totalMinor: number;
    currency: string;
  };
  order: CheckoutReplayOrder;
  attempt: CheckoutReplayAttempt;
  activeReservationExpiries?: Array<string | null>;
  now?: number;
}): CheckoutReplayDisposition {
  const { expected, order, attempt } = input;
  const currency = expected.currency.toUpperCase();

  if (
    order.id !== attempt.order_id ||
    order.checkout_session_id !== expected.checkoutSessionId ||
    order.customer_id !== expected.customerId ||
    order.payment_method !== expected.paymentMethod ||
    attempt.method !== expected.paymentMethod ||
    order.total_minor !== expected.totalMinor ||
    attempt.amount_minor !== expected.totalMinor ||
    order.currency.toUpperCase() !== currency ||
    attempt.currency.toUpperCase() !== currency
  ) {
    throw new Error("The existing order does not match this checkout quote.");
  }

  if (
    ORDER_PAYMENT_TERMINAL.has(order.status) ||
    ORDER_PAYMENT_TERMINAL.has(order.payment_status) ||
    ATTEMPT_PAYMENT_TERMINAL.has(attempt.status)
  ) {
    throw staleCheckoutError();
  }

  const paymentComplete = PAYMENT_COMPLETE.has(order.payment_status);
  const attemptComplete = ATTEMPT_COMPLETE.has(attempt.status);
  if (paymentComplete || attemptComplete) {
    if (!paymentComplete || !attemptComplete) {
      throw new Error("The existing order has an inconsistent payment state.");
    }
    return "completed";
  }

  if (expected.paymentMethod === "cod") {
    if (
      order.payment_status !== "cod_pending" ||
      attempt.status !== "pending" ||
      ![
        "confirmed",
        "processing",
        "packed",
        "shipped",
        "out_for_delivery",
        "delivered",
      ].includes(order.status)
    ) {
      throw staleCheckoutError();
    }
    return "payable";
  }

  const validAwaitingState =
    expected.paymentMethod === "razorpay"
      ? order.status === "pending_payment" &&
        order.payment_status === "pending" &&
        ["initialized", "pending", "authorized"].includes(attempt.status)
      : ["pending_payment", "payment_review"].includes(order.status) &&
        order.payment_status === "pending" &&
        ["initialized", "pending"].includes(attempt.status);
  if (!validAwaitingState) throw staleCheckoutError();

  const now = input.now ?? Date.now();
  const expiries = input.activeReservationExpiries ?? [];
  if (
    expiries.length === 0 ||
    expiries.some((expiry) => {
      if (!expiry) return true;
      const expiresAt = new Date(expiry).getTime();
      return !Number.isFinite(expiresAt) || expiresAt <= now;
    })
  ) {
    throw staleCheckoutError();
  }

  return "payable";
}
