// src/app/(main)/products/banner/[bannerId]/page.tsx

import BannerProducts from "@/components/products/banner-products"
import { getBannerDataServer } from "@/lib/serverApi"

// Catalog pages sit behind a high-latency database; ISR keeps the per-page
// query fan-out amortized to one render per minute instead of per request.
export const revalidate = 60;

interface BannerProductsPageProps {
  params: Promise<{
    bannerId: string
  }>
}

export default async function BannerProductsPage({ params }: BannerProductsPageProps) {
  const { bannerId } = await params;
  return <BannerProducts bannerId={bannerId} />
}

// Optional: Generate metadata for SEO
export async function generateMetadata({ params }: BannerProductsPageProps) {
  const { bannerId } = await params;
  const { banner } = await getBannerDataServer(bannerId);
  const title = banner?.heading;
  return {
    title: title ? `${title} | Babas Photo Store` : `Banner Products - Babas Photo Store`,
    description: 'Explore our curated collection of photography equipment and accessories.',
  }
}
