import { ArrowRight, BadgeCheck, Boxes, ChartNoAxesCombined, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";

import { BrandMark } from "@/components/brand-mark";
import { Field, inputClassName } from "@/components/ui/form-controls";
import { SubmitButton } from "@/components/ui/submit-button";
import { loginAction } from "@/lib/auth/actions";

export const metadata: Metadata = {
  title: "Sign in",
};

type LoginPageProps = {
  searchParams: Promise<{
    error?: string;
    next?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;

  return (
    <main className="grid min-h-screen bg-white lg:grid-cols-[minmax(0,1.05fr)_minmax(28rem,0.95fr)]">
      <section className="relative hidden overflow-hidden bg-slate-950 px-12 py-10 text-white lg:flex lg:flex-col">
        <div className="absolute inset-0 opacity-30 [background-image:radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.18)_1px,transparent_0)] [background-size:28px_28px]" />
        <div className="absolute -right-28 top-16 size-96 rounded-full bg-amber-400/15 blur-3xl" />
        <div className="absolute -bottom-20 left-20 size-80 rounded-full bg-sky-500/10 blur-3xl" />

        <BrandMark inverse className="relative z-10" />

        <div className="relative z-10 my-auto max-w-xl">
          <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.16em] text-amber-300">
            <ShieldCheck className="size-4" />
            Protected operations
          </p>
          <h1 className="text-5xl font-black leading-[1.02] tracking-[-0.055em] xl:text-6xl">
            One clear view of every order, product, and payment.
          </h1>
          <p className="mt-6 max-w-lg text-base leading-7 text-slate-300">
            Run the Babas storefront with live inventory, reliable fulfilment, and a complete
            audit trail.
          </p>

          <div className="mt-10 grid grid-cols-3 gap-3">
            {[
              { icon: ChartNoAxesCombined, label: "Live insights" },
              { icon: Boxes, label: "Stock control" },
              { icon: BadgeCheck, label: "Verified access" },
            ].map(({ icon: Icon, label }) => (
              <div
                key={label}
                className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur"
              >
                <Icon className="mb-4 size-5 text-amber-300" />
                <p className="text-xs font-bold text-slate-200">{label}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="relative z-10 text-xs font-medium text-slate-500">
          Access is logged and restricted by database policy.
        </p>
      </section>

      <section className="flex min-h-screen items-center justify-center px-5 py-10 sm:px-10">
        <div className="w-full max-w-md">
          <BrandMark className="mb-12 lg:hidden" />
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-600">
            Administrator portal
          </p>
          <h2 className="mt-3 text-4xl font-black tracking-[-0.045em] text-slate-950">
            Welcome back
          </h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Sign in with an active Babas administrator account.
          </p>

          {params.error ? (
            <div
              role="alert"
              className="mt-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700"
            >
              {params.error}
            </div>
          ) : null}

          <form action={loginAction} className="mt-8 grid gap-5">
            <input type="hidden" name="next" value={params.next ?? "/"} />
            <Field label="Email address">
              <input
                className={inputClassName}
                type="email"
                name="email"
                autoComplete="email"
                placeholder="admin@babas.in"
                required
                autoFocus
              />
            </Field>
            <Field label="Password">
              <input
                className={inputClassName}
                type="password"
                name="password"
                autoComplete="current-password"
                placeholder="Enter your password"
                required
                minLength={8}
              />
            </Field>
            <SubmitButton className="mt-2 min-h-12 w-full" pendingLabel="Signing in…">
              Sign in securely
              <ArrowRight className="size-4" />
            </SubmitButton>
          </form>

          <p className="mt-8 text-center text-xs leading-5 text-slate-500">
            Need access? Ask a super administrator to assign your role. Passwords and sessions
            are managed by Supabase Auth.
          </p>
        </div>
      </section>
    </main>
  );
}
