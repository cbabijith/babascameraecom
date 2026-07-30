export const ORDER_TRANSITIONS = {
  pending_payment: [],
  payment_review: [],
  confirmed: ["processing"],
  processing: ["packed"],
  packed: ["shipped"],
  shipped: ["out_for_delivery", "delivered"],
  out_for_delivery: ["delivered"],
  delivered: ["completed"],
  returned: ["completed"],
  cancelled: [],
  failed: [],
  completed: [],
} as const;

export type OrderStatus = keyof typeof ORDER_TRANSITIONS;
export type OrderTransitionTarget = (typeof ORDER_TRANSITIONS)[OrderStatus][number];

export function isOrderStatus(value: string): value is OrderStatus {
  return value in ORDER_TRANSITIONS;
}

export function allowedOrderTransitions(status: string): readonly string[] {
  return isOrderStatus(status) ? ORDER_TRANSITIONS[status] : [];
}

export function canTransitionOrder(from: string, to: string) {
  return allowedOrderTransitions(from).includes(to as never);
}

export function canCancelOrder(status: string) {
  return ["pending_payment", "payment_review", "confirmed", "processing"].includes(
    status,
  );
}

export const RETURN_TRANSITIONS = {
  requested: ["approved", "rejected"],
  approved: ["received", "closed"],
  received: ["closed"],
  rejected: ["closed"],
  refunded: ["closed"],
  closed: [],
} as const;

export function canTransitionReturn(from: string, to: string) {
  return allowedReturnTransitions(from).includes(to as never);
}

export function allowedReturnTransitions(from: string): readonly string[] {
  return RETURN_TRANSITIONS[from as keyof typeof RETURN_TRANSITIONS] ?? [];
}
