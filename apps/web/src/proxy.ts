import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { hasPublicSupabaseConfig, publicSupabaseConfig } from "@/lib/supabase/config";
const CART_SESSION_COOKIE = "bc_cart_session";
const CART_SESSION_PATTERN = /^[A-Za-z0-9_-]{32,128}$/;

const protectedPrefixes = ["/account", "/wishlist", "/checkout", "/cart"];

export async function proxy(request: NextRequest) {
  if (request.nextUrl.pathname === "/api/storefront/home") {
    return NextResponse.next();
  }
  const existingCartSession = request.cookies.get(CART_SESSION_COOKIE)?.value;
  const newCartSession =
    existingCartSession && CART_SESSION_PATTERN.test(existingCartSession)
      ? null
      : `${crypto.randomUUID().replaceAll("-", "")}${crypto.randomUUID().replaceAll("-", "")}`;
  if (!hasPublicSupabaseConfig()) {
    const passthrough = NextResponse.next();
    if (newCartSession) {
      passthrough.cookies.set(CART_SESSION_COOKIE, newCartSession, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 30 * 24 * 60 * 60,
      });
    }
    return passthrough;
  }
  const { url, anonKey } = publicSupabaseConfig();
  let response = NextResponse.next({ request });
  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (values) => {
        for (const { name, value } of values) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of values) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  if (protectedPrefixes.some((prefix) => request.nextUrl.pathname.startsWith(prefix))) {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      const login = new URL("/auth/login", request.url);
      login.searchParams.set("next", `${request.nextUrl.pathname}${request.nextUrl.search}`);
      const redirectResponse = NextResponse.redirect(login);
      if (newCartSession) {
        redirectResponse.cookies.set(CART_SESSION_COOKIE, newCartSession, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          path: "/",
          maxAge: 30 * 24 * 60 * 60,
        });
      }
      return redirectResponse;
    }
  }
  if (newCartSession) {
    response.cookies.set(CART_SESSION_COOKIE, newCartSession, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 30 * 24 * 60 * 60,
    });
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
