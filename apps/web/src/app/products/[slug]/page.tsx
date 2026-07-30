import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Heart, ShieldCheck, Star, Truck } from "lucide-react";
import { Button } from "@babascamera/ui";
import { toggleWishlistAction } from "@/app/actions/cart";
import { ActionForm } from "@/components/action-form";
import { sanitizeProductDescription } from "@/lib/commerce/product-description";
import {
  getCatalogProduct,
  getUserProductReview,
  listApprovedProductReviews,
  listRelatedProducts,
} from "@/lib/data/storefront";
import { productImageUrl } from "@/lib/storage";
import { getOptionalUser } from "@/lib/auth/session";
import { ProductTabs } from "@/components/catalog/product-tabs";
import { ProductGrid } from "@/components/catalog/product-grid";
import { ProductGallery } from "@/components/catalog/product-gallery";
import { ProductPurchaseForm } from "@/components/catalog/product-purchase-form";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const product = await getCatalogProduct((await params).slug);
  if (!product) return { title: "Product not found" };
  return {
    title: product.name,
    description:
      product.shortDescription ??
      `Shop ${product.name} from Baba's Camera.`,
    openGraph: {
      images: product.image
        ? [{ url: productImageUrl(product.image) }]
        : undefined,
    },
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const product = await getCatalogProduct((await params).slug);
  if (!product) notFound();
  const user = await getOptionalUser();
  const [reviews, currentReview, related] = await Promise.all([
    listApprovedProductReviews(product.id),
    user ? getUserProductReview(user.id, product.id) : null,
    listRelatedProducts(product, 4),
  ]);
  const description = sanitizeProductDescription(product.description);
  return (
    <section className="page-shell py-10">
      <div className="mb-6 text-sm text-slate-500">
        <Link href="/products">Products</Link>
        {product.categorySlug ? (
          <>
            {" / "}
            <Link href={`/categories/${product.categorySlug}`}>
              {product.categoryName}
            </Link>
          </>
        ) : null}
        {" / "}
        <span className="text-slate-800">{product.name}</span>
      </div>
      <div className="grid gap-10 lg:grid-cols-2">
        <ProductGallery name={product.name} images={product.images} />
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-[#E94560]">
            {product.brandName ?? "Baba's Camera"}
          </p>
          <h1 className="mt-2 text-4xl font-bold leading-tight">
            {product.name}
          </h1>
          <p className="mt-3 font-mono text-sm text-slate-500">
            SKU: {product.sku}
          </p>
          {product.reviewCount > 0 ? (
            <button
              type="button"
              className="mt-3 flex items-center gap-1 text-sm text-slate-600"
            >
              <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
              {product.averageRating.toFixed(1)} ({product.reviewCount} reviews)
            </button>
          ) : null}
          {product.shortDescription ? (
            <p className="mt-5 text-lg leading-8 text-slate-600">
              {product.shortDescription}
            </p>
          ) : null}
          <ProductPurchaseForm
            productId={product.id}
            salePrice={product.salePrice}
            mrp={product.mrp}
            stock={product.stock}
            lowStockThreshold={product.lowStockThreshold}
            variants={product.variants}
            defaultVariantId={product.defaultVariantId}
          />
          <ActionForm action={toggleWishlistAction} className="mt-3">
            <input type="hidden" name="productId" value={product.id} />
            <Button type="submit" variant="outline" size="lg" className="w-full">
              <Heart className="h-5 w-5" />
              Save to wishlist
            </Button>
          </ActionForm>
          <div className="mt-7 grid gap-3 text-sm sm:grid-cols-2">
            <div className="flex gap-3 rounded-xl bg-slate-50 p-4">
              <ShieldCheck className="h-5 w-5 text-[#E94560]" />
              Genuine product warranty
            </div>
            <div className="flex gap-3 rounded-xl bg-slate-50 p-4">
              <Truck className="h-5 w-5 text-[#E94560]" />
              Secure tracked delivery
            </div>
          </div>
        </div>
      </div>
      <ProductTabs
        product={product}
        description={description}
        reviews={reviews}
        currentReview={currentReview}
        signedIn={Boolean(user)}
      />
      {related.length ? (
        <section className="mt-14 border-t border-slate-200 pt-12">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-[#E94560]">
                You may also like
              </p>
              <h2 className="mt-1 text-3xl font-bold">Related products</h2>
            </div>
            <Link
              href={
                product.categorySlug
                  ? `/categories/${product.categorySlug}`
                  : "/products"
              }
              className="text-sm font-semibold"
            >
              View category
            </Link>
          </div>
          <div className="mt-7">
            <ProductGrid products={related} />
          </div>
        </section>
      ) : null}
    </section>
  );
}
