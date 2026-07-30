import { redirect } from "next/navigation";
import { safeInternalPath } from "@/lib/auth/safe-redirect";

export default async function LegacyLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const next = safeInternalPath((await searchParams).next, "/account");
  redirect(`/auth/login?next=${encodeURIComponent(next)}`);
}
