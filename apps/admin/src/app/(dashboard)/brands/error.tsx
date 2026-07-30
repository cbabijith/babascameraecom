"use client";

import { Button } from "@babascamera/ui";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { useEffect } from "react";

export default function BrandsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Brands page failed to load.", { digest: error.digest });
  }, [error.digest]);

  return (
    <section className="grid min-h-72 place-items-center rounded-lg border border-slate-200 bg-white p-6 text-center">
      <div className="grid max-w-sm justify-items-center gap-3">
        <AlertTriangle className="size-8 text-amber-500" aria-hidden />
        <div>
          <h1 className="text-base font-semibold text-slate-950">Brands could not be loaded</h1>
          <p className="mt-1 text-sm text-slate-500">Try again. If the problem continues, check the database connection.</p>
        </div>
        <Button type="button" size="sm" onClick={reset}>
          <RotateCcw className="size-4" /> Retry
        </Button>
      </div>
    </section>
  );
}
