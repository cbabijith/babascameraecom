"use server";

import { checkoutInputSchema } from "@/lib/commerce/checkout-schema";
import {
  CommerceError,
  placeCheckoutOrder,
  type CheckoutResult,
} from "@/lib/commerce/checkout";
import { getOptionalUser } from "@/lib/auth/session";
import { getCartOwner } from "@/lib/cart-session";

export type CheckoutActionState =
  | { ok: true; order: CheckoutResult }
  | { ok: false; message: string };

export async function placeOrderAction(
  rawInput: unknown,
): Promise<CheckoutActionState> {
  const parsed = checkoutInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      ok: false,
      message:
        parsed.error.issues[0]?.message ??
        "Please check your checkout details.",
    };
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
    return { ok: true, order };
  } catch (error) {
    if (!(error instanceof CommerceError)) {
      console.error("Checkout failed", {
        type: error instanceof Error ? error.name : typeof error,
      });
    }
    return {
      ok: false,
      message:
        error instanceof CommerceError
          ? error.message
          : "Checkout could not be completed. Please try again.",
    };
  }
}
