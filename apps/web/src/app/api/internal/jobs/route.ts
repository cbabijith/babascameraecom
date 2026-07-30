import { NextResponse } from "next/server";
import { expirePendingCheckoutOrders } from "@/lib/commerce/checkout";
import { processEmailOutbox } from "@/lib/jobs/email-outbox";
import { processPendingRefunds } from "@/lib/jobs/refunds";
import { hasValidBearerToken } from "@/lib/server/bearer-auth";

export const runtime = "nodejs";
export const maxDuration = 60;

async function run(request: Request) {
  if (!hasValidBearerToken(
    request.headers.get("authorization"),
    process.env.CRON_SECRET,
  )) {
    return NextResponse.json(
      { ok: false },
      {
        status: 401,
        headers: {
          "Cache-Control": "no-store",
          "WWW-Authenticate": 'Bearer realm="internal-jobs"',
        },
      },
    );
  }
  const expired = await expirePendingCheckoutOrders(50);
  const refunds = await processPendingRefunds(10);
  const emails = await processEmailOutbox(20);
  return NextResponse.json(
    { ok: true, expired, refunds, emails },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export const GET = run;
export const POST = run;
