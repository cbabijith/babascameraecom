import { LockKeyhole } from "lucide-react";

import { BrandMark } from "@/components/brand-mark";
import { SubmitButton } from "@/components/ui/submit-button";
import { logoutAction } from "@/lib/auth/actions";

export default async function UnauthorizedPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>;
}) {
  const { reason } = await searchParams;

  return (
    <main className="grid min-h-screen place-items-center px-5 py-10">
      <section className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-[0_25px_70px_rgba(15,23,42,0.1)] sm:p-12">
        <BrandMark className="mb-10 justify-center" />
        <div className="mx-auto grid size-16 place-items-center rounded-2xl bg-amber-100 text-amber-800">
          <LockKeyhole className="size-7" />
        </div>
        <h1 className="mt-6 text-3xl font-black tracking-[-0.04em] text-slate-950">
          Access restricted
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          {reason ?? "This account does not have access to the administrator portal."}
        </p>
        <form action={logoutAction} className="mt-8">
          <SubmitButton className="w-full" pendingLabel="Signing out…">
            Sign out and use another account
          </SubmitButton>
        </form>
      </section>
    </main>
  );
}
