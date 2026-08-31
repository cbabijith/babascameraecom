import { apiError, apiSuccess, authorizeAdminApi } from "@/lib/api/admin-api";
import { AdminActionError } from "@/lib/actions/result";
import { getOrderDetail } from "@/features/orders/repositories/orders-repository";
import { deleteOrder } from "@/features/orders/services/order-service";

export const dynamic = "force-dynamic";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

interface RouteContext { params: Promise<{ id: string }> }

export async function GET(request: Request, context: RouteContext) {
  const authorization = await authorizeAdminApi(request, "orders");
  if ("response" in authorization) return authorization.response;
  const { id } = await context.params;
  try {
    const detail = await getOrderDetail(id);
    if (!detail) return apiError("ORDER_NOT_FOUND", "Order not found.", 404);
    return apiSuccess(detail);
  } catch (error) {
    console.error("Admin order detail failed.", { actorId: authorization.admin.id, error });
    return apiError("INTERNAL_ERROR", "Something went wrong. Try again.", 500);
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  const authorization = await authorizeAdminApi(request, "orders");
  if ("response" in authorization) return authorization.response;
  const { id } = await context.params;
  if (!UUID_PATTERN.test(id)) {
    return apiError("ORDER_NOT_FOUND", "Order not found.", 404);
  }
  try {
    const result = await deleteOrder(id, authorization.admin.id);
    return apiSuccess(result);
  } catch (error) {
    if (error instanceof AdminActionError) {
      return apiError("ORDER_OPERATION_FAILED", error.message, 409);
    }
    console.error("Admin order delete failed.", { actorId: authorization.admin.id, error });
    return apiError("INTERNAL_ERROR", "Order could not be deleted. Try again.", 500);
  }
}
