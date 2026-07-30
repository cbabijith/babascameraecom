import { NextResponse } from "next/server";

import { safeReturnPath } from "@/lib/auth/safe-path";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  if (code) await (await createClient()).auth.exchangeCodeForSession(code);
  return NextResponse.redirect(new URL(safeReturnPath(url.searchParams.get("next")), url.origin));
}
