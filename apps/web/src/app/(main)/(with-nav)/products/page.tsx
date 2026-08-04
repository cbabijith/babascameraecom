import ProductList from "@/components/products/product-list"

// Revalidate products page cache every 60 seconds (ISR)
export const revalidate = 60;

export default function ProductsPage() {
  return <ProductList />
}
