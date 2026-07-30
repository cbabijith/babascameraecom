import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/supabase/user";
import { verifyRazorpayPayment } from "@/lib/server/payments";
import { apiErrorResponse } from "@/lib/server/route-response";
import { asString, asRow } from "@/lib/server/shapes";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser();
    const body = asRow(await request.json());
    const providerOrderId = asString(body.razorpay_order_id);
    const providerPaymentId = asString(body.razorpay_payment_id);
    const signature = asString(body.razorpay_signature);
    if (!providerOrderId || !providerPaymentId || !signature) {
      return NextResponse.json(
        { success: false, message: "Incomplete payment verification payload." },
        { status: 400 },
      );
    }
    const result = await verifyRazorpayPayment({
      providerOrderId,
      providerPaymentId,
      signature,
      userId: user.id,
    });
    return NextResponse.json({
      success: true,
      message: "Payment verified.",
      result,
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
