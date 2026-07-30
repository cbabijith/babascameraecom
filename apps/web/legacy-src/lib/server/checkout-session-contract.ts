export type SessionCheckoutMethod = "RAZORPAY" | "BANK_TRANSFER" | "COD";

type CheckoutSessionContract = {
  address_id: string;
  payment_method: string;
  idempotency_key: string;
  status: string;
  expires_at: string;
};

export function authoritativeCheckoutMethod(
  session: CheckoutSessionContract,
  requested: {
    addressId: string;
    paymentMethod: SessionCheckoutMethod;
    idempotencyKey: string;
  },
  now = Date.now(),
): SessionCheckoutMethod {
  const method = session.payment_method.toUpperCase() as SessionCheckoutMethod;
  if (!["RAZORPAY", "BANK_TRANSFER", "COD"].includes(method)) {
    throw new Error("Checkout session payment method is invalid.");
  }
  if (
    session.address_id !== requested.addressId ||
    method !== requested.paymentMethod ||
    session.idempotency_key.toLowerCase() !==
      requested.idempotencyKey.toLowerCase()
  ) {
    throw new Error("Checkout session does not match this request.");
  }
  if (
    session.status === "expired" ||
    (session.status === "active" &&
      new Date(session.expires_at).getTime() <= now)
  ) {
    throw new Error("Checkout session has expired.");
  }
  if (session.status !== "active" && session.status !== "consumed") {
    throw new Error("Checkout session is not reusable.");
  }
  return method;
}
