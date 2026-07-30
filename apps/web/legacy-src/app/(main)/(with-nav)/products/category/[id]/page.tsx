// src/app/(main)/products/category/[id]/page.tsx

import CategoryProductList from "@/components/products/category-product-list"
import { Metadata } from "next"

interface CategoryPageProps {
  params: Promise<{ id: string }>
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { id } = await params
  return <CategoryProductList categoryId={id} />
}

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const { id } = await params
  return {
    title: `Category Products - Babas Photo Store`,
    description: "Photography equipment and accessories",
  }
}
