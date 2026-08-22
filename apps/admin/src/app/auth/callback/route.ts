import { NextResponse } from "next/server";

import { safeReturnPath } from "@/lib/auth/safe-path";

export async function GET(request: Request) {
  const url = new URL(request.url);
  return NextResponse.redirect(new URL(safeReturnPath(url.searchParams.get("next")), url.origin));
}
