import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductGrid } from "@/components/catalog/product-grid";
import { listBrands, listCatalogProducts } from "@/lib/data/storefront";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const slug = (await params).slug;
  const brand = (await listBrands()).find((item) => item.slug === slug);
  return brand
    ? {
        title: brand.name,
        description:
          brand.description ?? `Shop ${brand.name} at Baba's Camera.`,
      }
    : { title: "Brand not found" };
}

export default async function BrandPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const slug = (await params).slug;
  const [brands, products] = await Promise.all([
    listBrands(),
    listCatalogProducts({ brandSlug: slug, limit: 60 }),
  ]);
  const brand = brands.find((item) => item.slug === slug);
  if (!brand) notFound();
  return (
    <section className="page-shell py-12">
      <p className="text-sm font-semibold text-[#E94560]">Brand</p>
      <h1 className="mt-1 text-4xl font-bold">{brand.name}</h1>
      {brand.description ? (
        <p className="mt-3 max-w-2xl leading-7 text-slate-600">
          {brand.description}
        </p>
      ) : null}
      <div className="mt-9">
        <ProductGrid products={products} />
      </div>
    </section>
  );
}
