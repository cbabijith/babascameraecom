import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Intentionally minimal: this is a public endpoint, so it only reports
// whether the storefront can serve traffic. Revealing which integrations
// are configured would help attackers map the stack.
export function GET() {
  const ready = Boolean(process.env.DATABASE_URL?.trim());
  return NextResponse.json(
    {
      status: ready ? "ok" : "not_ready",
      app: "storefront",
      // Lets open tabs detect that a new deployment replaced the one they
      // were loaded from (see components/version-guard). The commit sha is
      // public via the GitHub repo.
      deployment:
        process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 12) ??
        process.env.VERCEL_DEPLOYMENT_ID ??
        null,
    },
    {
      status: ready ? 200 : 503,
      headers: { "Cache-Control": "no-store" },
    },
  );
}
