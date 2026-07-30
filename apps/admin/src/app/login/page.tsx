import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@babascamera/ui";
import { Aperture } from "lucide-react";

import { LoginForm } from "@/components/login-form";
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
    <main className="grid min-h-screen place-items-center px-4 py-12">
      <Card className="w-full max-w-md border-slate-200 shadow-2xl shadow-slate-900/10">
        <CardHeader>
          <span className="mb-4 grid size-12 place-items-center rounded-2xl bg-slate-950 text-amber-400">
            <Aperture className="size-6" />
          </span>
          <CardTitle className="text-2xl">Baba&apos;s Camera Admin</CardTitle>
          <CardDescription>Sign in with an active administrator account.</CardDescription>
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
    </main>
  );
}
