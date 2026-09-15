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
    },
    {
      status: ready ? 200 : 503,
      headers: { "Cache-Control": "no-store" },
    },
  );
}
