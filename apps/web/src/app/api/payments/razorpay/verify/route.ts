import { NextResponse } from "next/server";
import { z } from "zod";
import { getCartOwner } from "@/lib/cart-session";
import { reconcileCapturedPayment } from "@/lib/commerce/checkout";
import { verifyCheckoutSignature } from "@/lib/payments/razorpay";

export const runtime = "nodejs";

const verificationSchema = z.object({
  razorpay_order_id: z.string().trim().min(1).max(100),
  razorpay_payment_id: z.string().trim().min(1).max(100),
  razorpay_signature: z.string().trim().regex(/^[a-f0-9]{64}$/i),
});

export async function POST(request: Request) {
  const parsed = verificationSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, message: "Invalid payment confirmation." },
      { status: 400 },
    );
  }
  const providerOrderId = parsed.data.razorpay_order_id;
  const providerPaymentId = parsed.data.razorpay_payment_id;
  if (
    !verifyCheckoutSignature({
      providerOrderId,
      providerPaymentId,
      signature: parsed.data.razorpay_signature,
    })
  ) {
    return NextResponse.json(
      { ok: false, message: "Payment signature verification failed." },
      { status: 401 },
    );
  }

  try {
    const owner = await getCartOwner();
    const result = await reconcileCapturedPayment({
      providerOrderId,
      providerPaymentId,
      owner,
    });
    return NextResponse.json({
      ok: true,
      orderNumber: result.order.orderNumber,
      compensated: result.compensated,
    });
  } catch (error) {
    console.error("Payment confirmation failed", {
      type: error instanceof Error ? error.name : typeof error,
    });
    return NextResponse.json(
      {
        ok: false,
        message:
          "Payment confirmation is pending. We will reconcile it automatically.",
      },
      { status: 409 },
    );
  }
}
