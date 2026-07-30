import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { getOptionalUser } from "@/lib/auth/session";
import { getCartOwner } from "@/lib/cart-session";
import {
  getCartForOwner,
  getUserProfile,
  listUserAddresses,
} from "@/lib/data/storefront";
import { getCheckoutSettings } from "@/lib/data/settings";
import { paiseToDecimal } from "@/lib/commerce/money";
import {
  CommerceError,
  previewCartCoupon,
} from "@/lib/commerce/checkout";
import { CheckoutForm } from "@/components/checkout/checkout-form";
import { formatMoney } from "@/lib/format";
import type { CartCouponState } from "@/app/actions/cart-coupon";

export const metadata = { title: "Checkout" };
export const dynamic = "force-dynamic";

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ coupon?: string }>;
}) {
  const { coupon } = await searchParams;
  const defaultCoupon =
    coupon && /^[A-Za-z0-9_-]{1,40}$/.test(coupon)
      ? coupon.toUpperCase()
      : "";
  const [owner, user, settings] = await Promise.all([
    getCartOwner(),
    getOptionalUser(),
    getCheckoutSettings(),
  ]);
  const items = await getCartForOwner(owner);
  if (!items.length) redirect("/cart");

  const [addresses, profile] = user
    ? await Promise.all([
        listUserAddresses(user.id),
        getUserProfile(user.id),
      ])
    : [[], null];
  let initialQuote: CartCouponState;
  try {
    const quote = await previewCartCoupon(owner, defaultCoupon || undefined);
    initialQuote = {
      ok: true,
      message: defaultCoupon ? `Coupon ${defaultCoupon} applied.` : "",
      ...quote,
    };
  } catch (error) {
    const quote = await previewCartCoupon(owner);
    initialQuote = {
      ok: false,
      message:
        error instanceof CommerceError
          ? error.message
          : "Coupon could not be checked.",
      ...quote,
    };
  }

  return (
    <section className="page-shell py-12">
      <h1 className="text-4xl font-bold">Secure checkout</h1>
      <p className="mt-2 text-slate-600">
        Complete your delivery and payment details.
      </p>
      <div className="mt-8">
        <CheckoutForm
          addresses={addresses}
          idempotencyKey={randomUUID()}
          customer={
            user
              ? {
                  name: profile?.fullName ?? "",
                  email: user.email ?? profile?.email ?? "",
                  phone: profile?.phone ?? "",
                }
              : null
          }
          initialQuote={initialQuote}
          freeShippingAbove={formatMoney(
            paiseToDecimal(BigInt(settings.freeShippingThresholdPaise)),
          )}
          codEnabled={settings.codEnabled}
          codMaximum={formatMoney(
            paiseToDecimal(BigInt(settings.codMaxOrderPaise)),
          )}
          defaultCoupon={defaultCoupon}
        />
      </div>
    </section>
  );
}
