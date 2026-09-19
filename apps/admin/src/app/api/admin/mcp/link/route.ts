import { ensureMcpConnectToken } from "@babascamera/db";

import { apiError, apiSuccess, authorizeAdminApi } from "@/lib/api/admin-api";

export const dynamic = "force-dynamic";

/**
 * Returns (and lazily mints) the storefront MCP connector link. The link is
 * the credential — share it only with the AI chat account that should
 * manage the catalogue. Rotating = DELETE the mcp.connect settings row and
 * call this again.
 */
export async function GET(request: Request) {
  const auth = await authorizeAdminApi(request, "settings:read");
  if ("response" in auth) return auth.response;

  try {
    const token = await ensureMcpConnectToken();
    const storefrontOrigin =
      process.env.NEXT_PUBLIC_STOREFRONT_URL?.replace(/\/+$/, "") ||
      "https://www.babascamera.com";
    const url = `${storefrontOrigin}/api/mcp?token=${token}`;
    return apiSuccess({
      url,
      token,
      worksWith: [
        "Claude → Settings → Connectors → Add custom connector (paste URL, no header needed)",
        "ChatGPT → Settings → Apps & Connectors → Create / advanced MCP (paste URL)",
      ],
      rotateHint:
        "Delete the mcp.connect row in settings and re-open this endpoint to issue a new token.",
    });
  } catch (error) {
    return apiError(
      "MCP_LINK_FAILED",
      error instanceof Error ? error.message : "Could not prepare the MCP link.",
      500,
    );
  }
}
