import { NextResponse, type NextRequest } from "next/server";

export function updateSession(request: NextRequest) {
  // Auth check temporarily disabled to make admin pages public
  return NextResponse.next({ request });
}

