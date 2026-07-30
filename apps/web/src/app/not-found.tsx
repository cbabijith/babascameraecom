import Link from "next/link";
import { Button } from "@babascamera/ui";

export default function NotFound() {
  return (
    <section className="page-shell flex min-h-[60vh] flex-col items-center justify-center text-center">
      <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#E94560]">
        404
      </p>
      <h1 className="mt-3 text-4xl font-bold">We couldn&apos;t find that page</h1>
      <p className="mt-3 max-w-lg text-slate-600">
        The product or page may have moved. Explore the latest gear instead.
      </p>
      <Button asChild className="mt-7 bg-[#E94560] hover:bg-[#D63852]">
        <Link href="/products">Browse products</Link>
      </Button>
    </section>
  );
}
