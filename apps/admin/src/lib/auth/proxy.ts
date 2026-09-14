import { NextResponse, type NextRequest } from "next/server";

const publicPath = /^\/(?:login|api\/auth(?:\/|$)|auth(?:\/|$)|unauthorized(?:\/|$))/;

export function updateSession(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const isPublic = publicPath.test(pathname);
  if (isPublic) return NextResponse.next({ request });

  const hasSession = request.cookies
    .getAll()
    .some(
      (cookie) =>
        cookie.name.includes("better-auth.session_token") ||
        cookie.name.includes("session_token")
    );

  if (!hasSession) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.search = "";
    loginUrl.searchParams.set("next", `${pathname}${search}`);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next({ request });
}
