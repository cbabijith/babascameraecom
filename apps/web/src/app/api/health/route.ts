import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export function GET() {
  const configured = {
    database: Boolean(process.env.DATABASE_URL),
    auth: true,
    razorpay: Boolean(
      process.env.RAZORPAY_KEY_ID &&
        process.env.RAZORPAY_KEY_SECRET &&
        process.env.RAZORPAY_WEBHOOK_SECRET,
    ),
    email: Boolean(
      process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL,
    ),
    jobs: Boolean(process.env.CRON_SECRET),
  };
  const ready = configured.database;
  return NextResponse.json(
    {
      status: ready ? "ok" : "not_ready",
      app: "storefront",
      version: process.env.npm_package_version ?? "1.0.0",
      configured,
    },
    {
      status: ready ? 200 : 503,
      headers: { "Cache-Control": "no-store" },
    },
  );
}
