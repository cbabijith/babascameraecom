"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <section className="rounded-3xl border border-rose-200 bg-white p-8 text-center shadow-sm sm:p-12">
      <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-rose-100 text-rose-700">
        <AlertTriangle className="size-6" />
      </span>
      <h1 className="mt-5 text-2xl font-black tracking-tight text-slate-950">
        This data could not be loaded
      </h1>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-600">
        {error.message.includes("Supabase is not configured")
          ? "Add the Supabase project URL and publishable key to the admin environment, then restart the server."
          : "The database rejected or could not complete the request. No changes were made."}
      </p>
      {error.digest ? (
        <p className="mt-3 font-mono text-xs text-slate-400">Reference: {error.digest}</p>
      ) : null}
      <button
        type="button"
        onClick={reset}
        className="mt-7 inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-bold text-white hover:bg-slate-800"
      >
        <RefreshCw className="size-4" />
        Try again
      </button>
    </section>
  );
}
