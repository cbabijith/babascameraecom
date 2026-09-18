import { checkoutInputSchema } from "@/lib/commerce/checkout-schema";
import {
  CommerceError,
  placeCheckoutOrder,
} from "@/lib/commerce/checkout";
import { getOptionalUser } from "@/lib/auth/session";
import { getCartOwner } from "@/lib/cart-session";
import {
  crossOriginFailure,
  isSameOrigin,
  readJsonBody,
} from "@/lib/api/storefront-api";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return crossOriginFailure();
  const body = await readJsonBody(request);
  const parsed = checkoutInputSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      {
        ok: false,
        message:
          parsed.error.issues[0]?.message ??
          "Please check your checkout details.",
      },
      { status: 422, headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    const [owner, user] = await Promise.all([
      getCartOwner(),
      getOptionalUser(),
    ]);
    const order = await placeCheckoutOrder({
      owner,
      authenticatedEmail: user?.email,
      checkout: parsed.data,
    });
    return Response.json(
      { ok: true, order },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (!(error instanceof CommerceError)) {
      console.error("Checkout failed", {
        type: error instanceof Error ? error.name : typeof error,
      });
    }
    return Response.json(
      {
        ok: false,
        message:
          error instanceof CommerceError
            ? error.message
            : "Checkout could not be completed. Please try again.",
      },
      { status: error instanceof CommerceError ? 422 : 500 },
    );
  }
}
