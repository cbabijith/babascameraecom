"use client";

import { useEffect } from "react";

export default function AdminRootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[admin] unhandled error:", error);
  }, [error]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <div className="max-w-md rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wide text-slate-400">
          Babas Admin
        </p>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">Something went wrong</h1>
        <p className="mt-2 text-sm text-slate-600">
          An unexpected error occurred. Try again, or return to the dashboard.
        </p>
        {error.digest && (
          <p className="mt-2 text-xs text-slate-400">Reference: {error.digest}</p>
        )}
        <button
          type="button"
          onClick={reset}
          className="mt-6 inline-block rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
        >
          Try again
        </button>
      </div>
    </main>
  );
}
