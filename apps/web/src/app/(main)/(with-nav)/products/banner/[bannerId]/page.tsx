// src/app/(main)/products/banner/[bannerId]/page.tsx

import BannerProducts from "@/components/products/banner-products"

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
export async function generateMetadata() {
  
  return {
    title: `Banner Products - Babas Photo Store`,
    description: 'Explore our curated collection of photography equipment and accessories.',
  }
}
