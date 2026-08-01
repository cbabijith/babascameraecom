import ProductList from "@/components/products/product-list"

// Force dynamic rendering (skip static generation at build time)
export const dynamic = 'force-dynamic';

export default function ProductsPage() {
  return <ProductList />
}
