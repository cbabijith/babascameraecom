import { isSameOrigin } from "@/lib/api/admin-api";
import { getAdminAuth, getRequestOrigin } from "@/lib/auth/auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const headers = new Headers({
    "content-type": "application/json",
    "cache-control": "no-store",
  });
  if (!isSameOrigin(request)) {
    return new Response(
      JSON.stringify({
        success: false,
        error: { code: "INVALID_ORIGIN", message: "Cross-origin requests are not allowed." },
      }),
      { status: 403, headers },
    );
  }
  try {
    const origin = await getRequestOrigin();
    const authInstance = getAdminAuth(origin);
    const response = await authInstance.api.signOut({
      headers: request.headers,
      asResponse: true,
    });
    for (const cookie of response.headers.getSetCookie?.() ?? []) {
      headers.append("set-cookie", cookie);
    }
  } catch {
    // Ignore error — the client lands on /login either way.
  }
  return new Response(
    JSON.stringify({ success: true, data: { redirectTo: "/login" } }),
    { headers },
  );
}
