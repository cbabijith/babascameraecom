import Image from "next/image";
import Link from "next/link";
import { listBrands } from "@/lib/data/storefront";
import { productImageUrl } from "@/lib/storage";

export const metadata = { title: "Brands" };
export const dynamic = "force-dynamic";

export default async function BrandsPage() {
  const brands = await listBrands();
  return (
    <section className="page-shell py-12">
      <p className="text-sm font-semibold text-[#E94560]">Authorised gear</p>
      <h1 className="mt-1 text-4xl font-bold">Shop trusted brands</h1>
      <div className="mt-9 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {brands.map((brand) => (
          <Link
            key={brand.id}
            href={`/brands/${brand.slug}`}
            className="flex min-h-36 flex-col items-center justify-center rounded-2xl border border-slate-200 p-5 text-center transition hover:border-[#E94560] hover:shadow-md"
          >
            {brand.logoUrl ? (
              <Image
                src={productImageUrl(brand.logoUrl)}
                alt={brand.name}
                width={160}
                height={70}
                className="max-h-14 w-auto object-contain"
              />
            ) : (
              <span className="text-xl font-bold">{brand.name}</span>
            )}
            <span className="mt-3 text-sm font-semibold">{brand.name}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
