import { HomeBannerManager } from "@/features/home-banners/components/home-banner-manager";
import { getHomeBanners } from "@/features/home-banners/server/readers";

export const dynamic = "force-dynamic";

export default async function BannersPage() {
  return <HomeBannerManager banners={await getHomeBanners()} />;
}
