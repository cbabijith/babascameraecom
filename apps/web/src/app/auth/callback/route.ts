import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { safeInternalPath } from "@/lib/auth/safe-redirect";
import { mergeGuestCartAfterAuthentication } from "@/lib/cart-session";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = safeInternalPath(url.searchParams.get("next"), "/account");
  if (!code) {
    return NextResponse.redirect(new URL("/auth/login?error=oauth", url));
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return NextResponse.redirect(new URL("/auth/login?error=oauth", url));
    }
    if (data.user) await mergeGuestCartAfterAuthentication(data.user.id);
    return NextResponse.redirect(new URL(next, url.origin));
  } catch (error) {
    console.error("Auth callback failed", {
      type: error instanceof Error ? error.name : typeof error,
    });
    return NextResponse.redirect(new URL("/auth/login?error=oauth", url));
  }
}
