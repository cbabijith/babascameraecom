import { apiError, apiSuccess, authorizeAdminApi, zodFieldErrors } from "@/lib/api/admin-api";
import { AdminActionError } from "@/lib/actions/result";
import {
  createManualOrder,
  getOrderDetail,
  listOrders,
  manualOrderSchema,
} from "@/lib/services/admin-orders";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const authorization = await authorizeAdminApi(request, "orders");
  if ("response" in authorization) return authorization.response;
  try {
    return apiSuccess(await listOrders());
  } catch (error) {
    console.error("Admin orders list failed.", { actorId: authorization.admin.id, error });
    return apiError("INTERNAL_ERROR", "Something went wrong. Try again.", 500);
  }
}

export async function POST(request: Request) {
  const authorization = await authorizeAdminApi(request, "orders");
  if ("response" in authorization) return authorization.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("MALFORMED_REQUEST", "Request body must be valid JSON.", 400);
  }

  const parsed = manualOrderSchema.safeParse(body);
  if (!parsed.success) {
    const flattened = parsed.error.flatten();
    const first = flattened.formErrors[0]
      ?? Object.values(zodFieldErrors(parsed.error))[0]?.[0]
      ?? "Check the submitted fields and try again.";
    return apiError("VALIDATION_FAILED", first, 422, zodFieldErrors(parsed.error));
  }

  try {
    const created = await createManualOrder(parsed.data, authorization.admin.id);
    const detail = await getOrderDetail(created.orderId);
    return Response.json({ success: true, data: detail }, { status: 201 });
  } catch (error) {
    if (error instanceof AdminActionError) {
      return apiError("ORDER_OPERATION_FAILED", error.message, 409);
    }
    console.error("Manual order creation failed.", { actorId: authorization.admin.id, error });
    return apiError("INTERNAL_ERROR", "Order could not be created. Try again.", 500);
  }
}
