import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/auth-forms";
import { safeInternalPath } from "@/lib/auth/safe-redirect";

export const metadata = { title: "Sign in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const next = safeInternalPath((await searchParams).next, "/account");
  return (
    <AuthShell
      title="Welcome back"
      description="Sign in to view orders, save products and check out faster."
      footer={
        <>
          New to Baba&apos;s?{" "}
          <Link href="/auth/register" className="font-semibold text-[#E94560]">
            Create an account
          </Link>
          <span className="mx-2 text-slate-300">·</span>
          <Link href="/auth/forgot-password" className="font-medium">
            Forgot password?
          </Link>
        </>
      }
    >
      <LoginForm next={next} />
    </AuthShell>
  );
}
