// src/app/(main)/products/brand/[brandId]/page.tsx

import BrandProductList from "@/components/products/brand-product-list"
import { getBrandPageDataServer } from "@/lib/serverApi"
import type { Metadata } from "next"

// Catalog pages sit behind a high-latency database; ISR keeps the per-page
// query fan-out amortized to one render per minute instead of per request.
// searchParams is deliberately not read: accessing it would force this page
// back to fully dynamic rendering, and pagination is handled client-side.
export const revalidate = 60;

interface BrandProductsPageProps {
  params: Promise<{ brandId: string }>
}

export default async function BrandProductsPage({
  params,
}: BrandProductsPageProps) {
  const resolvedParams = await params

  return <BrandProductList brandId={resolvedParams.brandId} />
}

export async function generateMetadata({ params }: BrandProductsPageProps): Promise<Metadata> {
  const { brandId } = await params
  const data = await getBrandPageDataServer(brandId, { limit: 1 })
  const name = data.brand?.name
  return {
    title: name ? `${name} Products | Babas Photo Store` : "Brand Products - Babas Photo Store",
    description: name
      ? `Shop ${name} photography equipment and accessories at Baba's Camera.`
      : "Photography equipment and accessories from various brands",
  }
}
