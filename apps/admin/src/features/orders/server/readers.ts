import { requirePermission } from "@/features/auth/server/admin";

import { getOrderDetail, listOrders } from "../repositories/orders-repository";

/** Permission-checked readers for admin order pages. */

export async function getOrders() {
  await requirePermission("orders");
  return listOrders();
}

export async function getOrder(id: string) {
  await requirePermission("orders");
  return getOrderDetail(id);
}
