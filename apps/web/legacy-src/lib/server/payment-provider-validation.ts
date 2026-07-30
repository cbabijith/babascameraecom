export type ProviderPayment = {
  id: string;
  order_id: string;
  amount: number;
  currency: string;
  status: string;
  captured?: boolean;
};

export type ProviderOrder = {
  id: string;
  amount: number;
  amount_paid: number;
  currency: string;
  status: string;
  notes?: Record<string, unknown>;
};

export type ExpectedPayment = {
  paymentId: string;
  providerOrderId: string;
  amountMinor: number;
  currency: string;
  orderId: string;
  userId: string;
};

export function validateCapturedProviderPayment(
  expected: ExpectedPayment,
  payment: ProviderPayment,
  order: ProviderOrder,
): void {
  if (payment.id !== expected.paymentId) {
    throw new Error("Provider payment id does not match.");
  }
  if (
    payment.order_id !== expected.providerOrderId ||
    order.id !== expected.providerOrderId
  ) {
    throw new Error("Provider order id does not match.");
  }
  if (payment.status !== "captured" || payment.captured === false) {
    throw new Error("Provider payment is not captured.");
  }
  if (order.status !== "paid") {
    throw new Error("Provider order is not paid.");
  }
  if (
    payment.amount !== expected.amountMinor ||
    order.amount !== expected.amountMinor ||
    order.amount_paid < expected.amountMinor
  ) {
    throw new Error("Provider payment amount does not match the order.");
  }
  const expectedCurrency = expected.currency.toUpperCase();
  if (
    payment.currency.toUpperCase() !== expectedCurrency ||
    order.currency.toUpperCase() !== expectedCurrency
  ) {
    throw new Error("Provider payment currency does not match the order.");
  }
  const noteOrderId = order.notes?.order_id;
  const noteUserId = order.notes?.user_id;
  if (noteOrderId !== expected.orderId) {
    throw new Error("Provider order ownership does not match.");
  }
  if (noteUserId !== expected.userId) {
    throw new Error("Provider order customer does not match.");
  }
}
