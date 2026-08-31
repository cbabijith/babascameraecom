"use server";

import type { OrderStatus, PaymentStatus } from "@babascamera/db";

import {
  actionFailure,
  actionFailureFromError,
  actionSuccess,
  type AdminActionResult,
  validationFailure,
} from "@/lib/actions/result";
import { requirePermission } from "@/features/auth/server/admin";
import {
  deleteOrder,
  transitionOrderStatus,
  updateOrderPaymentStatus,
} from "../services/order-service";
import { processOrderRefund } from "../services/refund-service";
import { orderTransitionSchema, paymentStatusInputSchema, refundInputSchema } from "../schemas/order-schemas";

export async function updateOrderStatusAction(
  formData: FormData,
): Promise<AdminActionResult<{ orderId: string; status: OrderStatus }>> {
  const admin = await requirePermission("orders");
  const parsed = orderTransitionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return validationFailure(parsed.error);

  try {
    const result = await transitionOrderStatus(parsed.data, admin.id);
    return actionSuccess(result);
  } catch (error) {
    return actionFailureFromError(error, "Order status could not be updated.", "Order status update failed.");
  }
}

export async function updatePaymentStatusAction(
  formData: FormData,
): Promise<AdminActionResult<{ orderId: string; paymentStatus: PaymentStatus }>> {
  const admin = await requirePermission("orders");
  const parsed = paymentStatusInputSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return validationFailure(parsed.error);

  try {
    const result = await updateOrderPaymentStatus(parsed.data, admin.id);
    return actionSuccess(result);
  } catch (error) {
    return actionFailureFromError(
      error,
      "Payment status could not be updated.",
      "Payment status update failed.",
    );
  }
}

export async function deleteOrderAction(
  formData: FormData,
): Promise<AdminActionResult<{ orderId: string }>> {
  const admin = await requirePermission("orders");
  const orderId = String(formData.get("orderId") ?? "");
  const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!UUID_PATTERN.test(orderId)) {
    return actionFailure("A valid order ID is required.");
  }

  try {
    const result = await deleteOrder(orderId, admin.id);
    return actionSuccess(result);
  } catch (error) {
    return actionFailureFromError(
      error,
      "Order could not be deleted.",
      "Order deletion failed.",
    );
  }
}

export async function refundOrderAction(formData: FormData): Promise<AdminActionResult<{ orderId: string }>> {
  await requirePermission("orders");
  const parsed = refundInputSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return validationFailure(parsed.error);
  try {
    await processOrderRefund(parsed.data.orderId, parsed.data.reason);
    return actionSuccess({ orderId: parsed.data.orderId });
  } catch (error) {
    return actionFailureFromError(error, "Refund could not be completed.", "Order refund failed.");
  }
}
