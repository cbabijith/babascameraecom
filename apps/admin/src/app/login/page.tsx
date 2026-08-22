import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@babascamera/ui";
import { LockKeyhole } from "lucide-react";
import Image from "next/image";

import { LoginForm } from "@/features/auth/components/login-form";
import { safeReturnPath } from "@/lib/auth/safe-path";

export const metadata = { title: "Sign in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const query = await searchParams;
  const next = safeReturnPath(query.next ?? null);

  return (
    <main className="grid min-h-screen bg-[#F8F8F8] px-4 py-10 lg:grid-cols-[1.05fr_0.95fr] lg:px-10">
      <section className="hidden min-h-[calc(100vh-5rem)] rounded-[2rem] bg-[#1A1A2E] p-10 text-white shadow-2xl shadow-slate-950/15 lg:flex lg:flex-col">
        <div className="flex items-center gap-4">
          <span className="grid size-14 place-items-center rounded-2xl bg-white">
            <Image src="/navbarLogo.svg" alt="Baba's Camera" width={40} height={40} className="h-10 w-auto" priority />
          </span>
          <div>
            <p className="font-['Playfair_Display'] text-2xl font-bold">Baba&apos;s Camera</p>
            <p className="text-sm text-white/60">Commerce operations</p>
          </div>
        </div>
        <div className="mt-auto max-w-xl">
          <p className="font-['Playfair_Display'] text-5xl leading-tight">
            Fast, private access for product, order, and customer management.
          </p>
          <p className="mt-5 max-w-md text-base leading-7 text-white/64">
            Admin access is authenticated securely, then verified against the administrator role before any dashboard page loads.
          </p>
        </div>
      </section>
      <section className="grid min-h-[calc(100vh-5rem)] place-items-center">
        <Card className="w-full max-w-md rounded-3xl border-slate-200 bg-white shadow-2xl shadow-slate-900/10">
          <CardHeader className="space-y-5">
            <div className="flex items-center justify-between gap-4">
              <Image src="/Babaslogonew.svg" alt="Baba's Camera" width={180} height={60} className="h-12 w-auto object-contain" priority />
              <span className="grid size-11 place-items-center rounded-2xl bg-[#1A1A2E] text-white">
                <LockKeyhole className="size-5" />
              </span>
            </div>
            <div>
              <CardTitle className="text-2xl text-[#1A1A2E]">Admin sign in</CardTitle>
              <CardDescription className="mt-2">Use an active administrator account.</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {query.error ? (
              <p role="alert" className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
                {query.error}
              </p>
            ) : null}
            <LoginForm next={next} />
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
