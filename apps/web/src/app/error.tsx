"use client";

import { Button } from "@babascamera/ui";

export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <section className="page-shell flex min-h-[60vh] flex-col items-center justify-center text-center">
      <h1 className="text-3xl font-bold">Something went wrong</h1>
      <p className="mt-3 text-slate-600">
        We could not load this page. Your cart and account are safe.
      </p>
      <Button onClick={reset} className="mt-6 bg-[#E94560] hover:bg-[#D63852]">
        Try again
      </Button>
    </section>
  );
}
