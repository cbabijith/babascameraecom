import { apiError, apiSuccess, authorizeAdminApi, zodFieldErrors } from "@/lib/api/admin-api";
import { AdminActionError } from "@/lib/actions/result";
import { paymentStatusInputSchema } from "@/features/orders/schemas/order-schemas";
import { getOrderDetail } from "@/features/orders/repositories/orders-repository";
import { updateOrderPaymentStatus } from "@/features/orders/services/order-service";

export const dynamic = "force-dynamic";

interface RouteContext { params: Promise<{ id: string }> }

export async function PATCH(request: Request, context: RouteContext) {
  const authorization = await authorizeAdminApi(request, "orders");
  if ("response" in authorization) return authorization.response;
  const { id } = await context.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("MALFORMED_REQUEST", "Request body must be valid JSON.", 400);
  }

  const parsed = paymentStatusInputSchema.safeParse({ ...(body as Record<string, unknown>), orderId: id });
  if (!parsed.success) {
    const flattened = parsed.error.flatten();
    const first = flattened.formErrors[0]
      ?? Object.values(zodFieldErrors(parsed.error))[0]?.[0]
      ?? "Check the submitted fields and try again.";
    return apiError("VALIDATION_FAILED", first, 422, zodFieldErrors(parsed.error));
  }

  try {
    const result = await updateOrderPaymentStatus(parsed.data, authorization.admin.id);
    const detail = await getOrderDetail(result.orderId);
    return apiSuccess({ orderId: result.orderId, paymentStatus: result.paymentStatus, order: detail });
  } catch (error) {
    if (error instanceof AdminActionError) {
      return apiError("ORDER_OPERATION_FAILED", error.message, 409);
    }
    console.error("Admin payment status update failed.", { actorId: authorization.admin.id, error });
    return apiError("INTERNAL_ERROR", "Payment status could not be updated. Try again.", 500);
  }
}
