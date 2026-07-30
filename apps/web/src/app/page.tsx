import { fetchStorefrontHome } from "@/features/home/api/get-storefront-home";
import { StorefrontHomepage } from "@/features/home/components/storefront-homepage";
import { getStorefrontOrigin } from "@/lib/api/server-origin";

export const dynamic = "force-dynamic";

async function loadHomepageData() {
  try {
    const origin = await getStorefrontOrigin();
    const response = await fetchStorefrontHome(origin);
    return response.data;
  } catch (error) {
    console.error("Storefront homepage render failed", error);
    throw new Error("Unable to load the storefront homepage.");
  }
}

export default async function HomePage() {
  const data = await loadHomepageData();

  return <StorefrontHomepage data={data} />;
}
