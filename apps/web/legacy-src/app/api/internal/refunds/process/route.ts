import { NextResponse } from "next/server";
import { isAuthorizedCronRequest } from "@/lib/server/cron-auth";
import { processRefundBatch } from "@/lib/server/refunds";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function processRequest(request: Request) {
  if (!isAuthorizedCronRequest(request, process.env.CRON_SECRET)) {
    return NextResponse.json(
      { success: false, message: "Unauthorized." },
      { status: 401 },
    );
  }

  const configuredLimit = Number(process.env.REFUND_PROCESSOR_BATCH_SIZE ?? 10);
  try {
    const result = await processRefundBatch(
      Number.isFinite(configuredLimit) ? configuredLimit : 10,
    );
    const hasFailures = result.failures.length > 0;
    return NextResponse.json({
      success: !hasFailures,
      result,
    }, {
      status: hasFailures ? 503 : 200,
      headers: hasFailures ? { "Retry-After": "30" } : undefined,
    });
  } catch {
    return NextResponse.json(
      { success: false, message: "Refund processor failed." },
      { status: 503, headers: { "Retry-After": "30" } },
    );
  }
}

// Vercel Cron invokes GET; POST is retained for other schedulers. Both require
// the same server-held bearer secret.
export const GET = processRequest;
export const POST = processRequest;
