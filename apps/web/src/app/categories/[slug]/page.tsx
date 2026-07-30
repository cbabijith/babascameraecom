import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductGrid } from "@/components/catalog/product-grid";
import {
  listCatalogProducts,
  listCategories,
} from "@/lib/data/storefront";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const slug = (await params).slug;
  const category = (await listCategories()).find((item) => item.slug === slug);
  return category
    ? {
        title: category.name,
        description:
          category.description ??
          `Shop ${category.name} at Baba's Camera.`,
      }
    : { title: "Category not found" };
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const slug = (await params).slug;
  const [categories, products] = await Promise.all([
    listCategories(),
    listCatalogProducts({ categorySlug: slug, limit: 60 }),
  ]);
  const category = categories.find((item) => item.slug === slug);
  if (!category) notFound();
  return (
    <section className="page-shell py-12">
      <p className="text-sm font-semibold text-[#E94560]">Category</p>
      <h1 className="mt-1 text-4xl font-bold">{category.name}</h1>
      {category.description ? (
        <p className="mt-3 max-w-2xl leading-7 text-slate-600">
          {category.description}
        </p>
      ) : null}
      <div className="mt-9">
        <ProductGrid products={products} />
      </div>
    </section>
  );
}
