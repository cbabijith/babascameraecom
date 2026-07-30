import Link from "next/link";

export default function OrderNotFound() {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-12 text-center">
      <h1 className="text-2xl font-black text-slate-950">Order not found</h1>
      <p className="mt-2 text-sm text-slate-600">
        The order may have been removed or the link is invalid.
      </p>
      <Link
        href="/orders"
        className="mt-6 inline-flex rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-bold text-white"
      >
        Return to orders
      </Link>
    </section>
  );
}
