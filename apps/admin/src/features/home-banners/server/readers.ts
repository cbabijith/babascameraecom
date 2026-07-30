import { requirePermission } from "@/features/auth/server/admin";

import { getHomeBannersForAdmin } from "../services/home-banner-service";

export async function getHomeBanners() {
  await requirePermission("storefront");
  return getHomeBannersForAdmin();
}
