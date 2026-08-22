import { NextResponse, type NextRequest } from "next/server";

const CART_SESSION_COOKIE = "bc_cart_session";
const CART_SESSION_PATTERN = /^[A-Za-z0-9_-]{32,128}$/;
const SESSION_COOKIE_PATTERN = /better-auth\.session_token|(^|\.)session_token/;

const protectedPrefixes = ["/account", "/wishlist", "/checkout", "/cart"];

function cartSessionCookie() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 30 * 24 * 60 * 60,
  };
}

export async function proxy(request: NextRequest) {
  const existingCartSession = request.cookies.get(CART_SESSION_COOKIE)?.value;
  const newCartSession =
    existingCartSession && CART_SESSION_PATTERN.test(existingCartSession)
      ? null
      : `${crypto.randomUUID().replaceAll("-", "")}${crypto.randomUUID().replaceAll("-", "")}`;

  const hasSessionCookie = request.cookies
    .getAll()
    .some((cookie) => SESSION_COOKIE_PATTERN.test(cookie.name));

  if (
    !hasSessionCookie &&
    protectedPrefixes.some((prefix) => request.nextUrl.pathname.startsWith(prefix))
  ) {
    const login = new URL("/login", request.url);
    login.searchParams.set("next", `${request.nextUrl.pathname}${request.nextUrl.search}`);
    const redirectResponse = NextResponse.redirect(login);
    if (newCartSession) {
      redirectResponse.cookies.set(CART_SESSION_COOKIE, newCartSession, cartSessionCookie());
    }
    return redirectResponse;
  }

  const response = NextResponse.next({ request });
  if (newCartSession) {
    response.cookies.set(CART_SESSION_COOKIE, newCartSession, cartSessionCookie());
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
