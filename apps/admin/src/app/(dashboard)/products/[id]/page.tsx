import { notFound } from "next/navigation";

import { PageHeader } from "@/components/page-header";
import { ProductForm } from "@/components/product-form";
import { ProductImageManager } from "@/components/product-image-manager";
import { getCatalogOptions, getProduct } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [product, options] = await Promise.all([getProduct(id), getCatalogOptions()]);
  if (!product) notFound();
  const formProduct = {
    id: product.id,
    name: product.name,
    slug: product.slug,
    sku: product.sku,
    categoryId: product.categoryId,
    brandId: product.brandId,
    shortDescription: product.shortDescription ?? "",
    description: product.description ?? "",
    mrp: product.mrp,
    salePrice: product.salePrice,
    costPrice: product.costPrice ?? "",
    stock: product.stock,
    lowStockThreshold: product.lowStockThreshold,
    weight: product.weight ?? "",
    metaTitle: product.metaTitle ?? "",
    metaDescription: product.metaDescription ?? "",
    isActive: product.isActive,
    isFeatured: product.isFeatured,
    variants: product.variants.map((variant) => ({
      id: variant.id,
      name: variant.name,
      value: variant.value,
      sku: variant.sku,
      additionalPrice: variant.additionalPrice,
      stock: variant.stock,
    })),
  };
  return (
    <>
      <PageHeader title={product.name} description={`Edit ${product.sku} and its catalogue assets.`} />
      {product.images.length ? (
        <ProductImageManager productId={product.id} productName={product.name} images={product.images} />
      ) : null}
      <ProductForm product={formProduct} {...options} />
    </>
  );
}
