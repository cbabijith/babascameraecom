import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { expirePendingCheckoutOrders } from "@/lib/commerce/checkout";
import { processEmailOutbox } from "@/lib/jobs/email-outbox";
import { processPendingRefunds } from "@/lib/jobs/refunds";

export const runtime = "nodejs";
export const maxDuration = 60;

function authorized(request: Request): boolean {
  const expected = process.env.CRON_SECRET?.trim();
  const header = request.headers.get("authorization");
  const actual = header?.startsWith("Bearer ") ? header.slice(7) : "";
  if (!expected || !actual) return false;
  const expectedBytes = Buffer.from(expected);
  const actualBytes = Buffer.from(actual);
  return (
    expectedBytes.length === actualBytes.length &&
    timingSafeEqual(expectedBytes, actualBytes)
  );
}

async function run(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const expired = await expirePendingCheckoutOrders(50);
  const refunds = await processPendingRefunds(10);
  const emails = await processEmailOutbox(20);
  return NextResponse.json({ ok: true, expired, refunds, emails });
}

export const GET = run;
export const POST = run;
