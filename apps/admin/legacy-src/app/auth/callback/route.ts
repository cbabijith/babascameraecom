import { NextResponse, type NextRequest } from "next/server";

import { resolveAdminAccess } from "@/lib/auth/admin";
import { safeReturnPath } from "@/lib/auth/safe-path";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = safeReturnPath(requestUrl.searchParams.get("next"));

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=The+sign-in+link+is+invalid.", request.url));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(new URL("/login?error=The+sign-in+link+has+expired.", request.url));
  }

  const access = await resolveAdminAccess(supabase);
  if (access.kind !== "authorized") {
    await supabase.auth.signOut();
    return NextResponse.redirect(
      new URL("/login?error=Administrator+access+is+required.", request.url),
    );
  }

  return NextResponse.redirect(new URL(next, request.url));
}
