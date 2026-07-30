// src/components/products/product-list.tsx
// Server Component - fetches categories and products server-side
import { Suspense } from "react";
import { getCategoriesWithProductsServer } from "@/lib/serverApi";
import ProductListClient from "./product-list-client";
import ProductListingSkeleton from "../ui/product-listing-skeleton";

// Server Component wrapper - fetches data server-side
async function ProductListContent() {
  const { categories, totalProducts } = await getCategoriesWithProductsServer();
  
  // Map to the format expected by client component
  const categorySections = categories.map((cat) => ({
    category: {
      _id: cat.category._id,
      name: cat.category.name,
      image: cat.category.image,
    },
    products: cat.products.map((p) => ({
      _id: p._id,
      name: p.name,
      slug: p.slug,
      price: p.price,
      images: p.images,
      category: p.category,
      brand: p.brand,
      quantity: p.quantity,
      keyFeatures: p.keyFeatures,
    })),
    totalCount: cat.totalCount,
    brands: cat.brands.map((b) => ({ _id: b._id, name: b.name })),
  }));
  
  return (
    <ProductListClient
      categorySections={categorySections}
      totalProducts={totalProducts}
    />
  );
}

// Main export with Suspense boundary
export default function ProductList() {
  return (
    <Suspense
      fallback={
        <ProductListingSkeleton
          variant="category-sections"
          showHeader={false}
          showFilters={true}
          categorySections={3}
        />
      }
    >
      <ProductListContent />
    </Suspense>
  );
}
