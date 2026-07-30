import { requirePermission } from "@/features/auth/server/admin";

import { getBrands as listBrands } from "../services/brands-service";

export async function getBrands() {
  await requirePermission("catalog");
  return listBrands({ q: "", status: "all" });
}
