// src/app/(main)/products/category/[id]/page.tsx

import CategoryProductList from "@/components/products/category-product-list"
import { getCategoryPageDataServer } from "@/lib/serverApi"
import type { Metadata } from "next"

// Catalog pages sit behind a high-latency database; ISR keeps the per-page
// query fan-out amortized to one render per minute instead of per request.
export const revalidate = 60;

interface CategoryPageProps {
  params: Promise<{ id: string }>
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { id } = await params
  return <CategoryProductList categoryId={id} />
}

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const { id } = await params
  const data = await getCategoryPageDataServer(id, { limit: 1 })
  const name = data.category?.name
  return {
    title: name ? `${name} | Babas Photo Store` : "Category Products - Babas Photo Store",
    description: name
      ? `Buy ${name.toLowerCase()} and photography equipment at Baba's Camera.`
      : "Photography equipment and accessories",
  }
}
