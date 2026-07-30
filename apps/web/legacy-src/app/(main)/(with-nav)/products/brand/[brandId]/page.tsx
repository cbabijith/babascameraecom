// src/app/(main)/products/brand/[brandId]/page.tsx

import BrandProductList from "@/components/products/brand-product-list"
import { Metadata } from "next"

interface BrandProductsPageProps {
  params: Promise<{ brandId: string }>
  searchParams?: Promise<{
    page?: string
    category?: string
  }>
}

export default async function BrandProductsPage({ 
  params, 
  searchParams 
}: BrandProductsPageProps) {
  const resolvedParams = await params   
  const resolvedSearchParams = await searchParams
  
  const page = parseInt(resolvedSearchParams?.page || "1")

  return <BrandProductList brandId={resolvedParams.brandId} page={page} />
}


export async function generateMetadata({ params }: BrandProductsPageProps): Promise<Metadata> {
  const resolvedParams = await params
  
  return {
    title: `Brand Products - Babas Photo Store`,
    description: `Photography equipment and accessories from various brands`,
  }
}