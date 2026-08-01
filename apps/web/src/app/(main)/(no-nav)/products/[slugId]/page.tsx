// src/app/(main)/(no-nav)/products/[slugId]/page.tsx
import ProductDetails from "@/components/products/product-details";
import { extractIdFromSlugPath } from "@/lib/slug";
import { getProductById } from "@/instances/productInstance";
import { getImageUrl } from "@/lib/apiClient";

interface ProductPageProps {
  params: Promise<{ slugId: string }>; // <-- Promise here
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slugId } = await params;                 // <-- await
  const productId = extractIdFromSlugPath(slugId);
  return <ProductDetails productId={productId} />;
}

export async function generateMetadata({ params }: ProductPageProps) {
  const { slugId } = await params;                 // <-- await
  const productId = extractIdFromSlugPath(slugId);

  try {
    const product = await getProductById(productId);

    const title = product?.name
      ? `${product.name} – Babas Photo Store`
      : "Product Details – Babas Photo Store";

    const description =
      (product?.description ?? "").replace(/\s+/g, " ").trim().slice(0, 160) ||
      "Photography equipment and accessories details";

    const firstImageKey = product?.images?.[0]?.key;
    const ogImages = firstImageKey ? [{ url: getImageUrl(firstImageKey) }] : [];

    return {
      title,
      description,
      openGraph: { title, description, images: ogImages },
      alternates: { canonical: `/products/${slugId}` }, // use awaited slugId
    };
  } catch {
    return {
      title: "Product Details – Babas Photo Store",
      description: "Photography equipment and accessories details",
      alternates: { canonical: `/products/${slugId}` },
    };
  }
}
