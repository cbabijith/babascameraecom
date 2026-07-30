import { NextResponse, type NextRequest } from "next/server";

const publicPath = /^\/(?:login|auth(?:\/|$)|unauthorized(?:\/|$))/;

export async function updateSession(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const isPublic = publicPath.test(pathname);
  if (isPublic) return NextResponse.next({ request });

  const hasSupabaseSession = request.cookies
    .getAll()
    .some((cookie) => cookie.name.startsWith("sb-") && cookie.name.includes("-auth-token"));

  if (!hasSupabaseSession) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.search = "";
    loginUrl.searchParams.set("next", `${pathname}${search}`);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next({ request });
}
