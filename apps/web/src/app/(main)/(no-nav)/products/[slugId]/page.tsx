// src/app/(main)/(no-nav)/products/[slugId]/page.tsx
import ProductDetails from "@/components/products/product-details";
import { extractIdFromSlugPath } from "@/lib/slug";
import { getCatalogProduct } from "@/features/catalog";
import { resolveMediaUrl } from "@/lib/media-proxy";

interface ProductPageProps {
  params: Promise<{ slugId: string }>; // <- Promise here
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slugId } = await params;                 // <- await
  const productId = extractIdFromSlugPath(slugId);
  return <ProductDetails productId={productId} />;
}

export async function generateMetadata({ params }: ProductPageProps) {
  const { slugId } = await params;                 // <- await
  const productId = extractIdFromSlugPath(slugId);

  try {
    // Query the catalog directly — the browser API client cannot run in a
    // server component and its retry loop stalls metadata for ~60s.
    const product = await getCatalogProduct(productId);

    const title = product?.name
      ? `${product.name} – Babas Photo Store`
      : "Product Details – Babas Photo Store";

    const description =
      (product?.description ?? product?.shortDescription ?? "")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 160) || "Photography equipment and accessories details";

    const firstImage = product?.images?.[0]?.url;
    const ogImages = firstImage
      ? [{ url: resolveMediaUrl(firstImage, firstImage) }]
      : [];

    return {
      title,
      description,
      openGraph: { title, description, images: ogImages },
      alternates: { canonical: `/products/${slugId}` },
    };
  } catch {
    return {
      title: "Product Details – Babas Photo Store",
      description: "Photography equipment and accessories details",
      alternates: { canonical: `/products/${slugId}` },
    };
  }
}
