import Image from "next/image";
import Link from "next/link";
import { listCategories } from "@/lib/data/storefront";
import { productImageUrl } from "@/lib/storage";

export const metadata = { title: "Categories" };
export const dynamic = "force-dynamic";

export default async function CategoriesPage() {
  const categories = await listCategories();
  return (
    <section className="page-shell py-12">
      <p className="text-sm font-semibold text-[#E94560]">Find your setup</p>
      <h1 className="mt-1 text-4xl font-bold">Shop by category</h1>
      <div className="mt-9 grid grid-cols-2 gap-5 md:grid-cols-3 lg:grid-cols-4">
        {categories.map((category) => (
          <Link
            key={category.id}
            href={`/categories/${category.slug}`}
            className="group overflow-hidden rounded-2xl border border-slate-200"
          >
            <div className="relative aspect-[4/3] bg-slate-50">
              <Image
                src={productImageUrl(category.imageUrl)}
                alt={category.name}
                fill
                className="object-contain p-5 transition group-hover:scale-105"
              />
            </div>
            <div className="p-4">
              <h2 className="font-semibold">{category.name}</h2>
              {category.description ? (
                <p className="mt-1 line-clamp-2 text-sm text-slate-500">
                  {category.description}
                </p>
              ) : null}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
