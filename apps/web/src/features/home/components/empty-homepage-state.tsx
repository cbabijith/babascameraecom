import Link from "next/link";

export function EmptyHomepageState() {
  return (
    <section className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-6 py-20 text-center">
      <p className="text-sm font-semibold text-[#E94560]">Baba&apos;s Camera</p>
      <h1 className="mt-2 font-serif text-3xl font-semibold text-slate-950">
        Our latest gear is being prepared
      </h1>
      <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-slate-600">
        Browse the full catalogue while homepage collections are refreshed.
      </p>
      <Link
        href="/products"
        className="mt-6 inline-flex rounded-full bg-[#E94560] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#D63852]"
      >
        Browse all products
      </Link>
    </section>
  );
}
