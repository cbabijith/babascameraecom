"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Button, Input, Label } from "@babascamera/ui";
import {
  previewCartCouponAction,
  type CartCouponState,
} from "@/app/actions/cart-coupon";
import { formatMoney } from "@/lib/format";

export function CartCouponCard({
  initialState,
}: {
  initialState: CartCouponState;
}) {
  const [state, action, pending] = useActionState(
    previewCartCouponAction,
    initialState,
  );
  return (
    <>
      <h2 className="text-xl font-bold">Order summary</h2>
      <dl className="mt-5 space-y-3 text-sm">
        <div className="flex justify-between">
          <dt>Subtotal</dt>
          <dd className="font-mono">{formatMoney(state.subtotal)}</dd>
        </div>
        {state.code ? (
          <div className="flex justify-between text-emerald-700">
            <dt>Coupon {state.code}</dt>
            <dd className="font-mono">−{formatMoney(state.discount)}</dd>
          </div>
        ) : null}
        <div className="flex justify-between text-slate-500">
          <dt>Shipping</dt>
          <dd className="font-mono">
            {state.shipping === "0.00"
              ? "Free"
              : formatMoney(state.shipping)}
          </dd>
        </div>
      </dl>
      <div className="mt-5 flex justify-between border-t border-slate-200 pt-5 text-lg font-bold">
        <span>Estimated total</span>
        <span className="font-mono">{formatMoney(state.total)}</span>
      </div>
      <form action={action} className="mt-5">
        <Label htmlFor="cart-coupon">Coupon code</Label>
        <div className="mt-2 flex gap-2">
          <Input
            id="cart-coupon"
            name="couponCode"
            defaultValue={state.code ?? ""}
            autoComplete="off"
            placeholder="SAVE10"
          />
          <Button type="submit" variant="outline" disabled={pending}>
            {pending ? "Checking…" : "Apply"}
          </Button>
        </div>
      </form>
      {state.message ? (
        <p
          role="status"
          className={`mt-3 text-xs ${
            state.ok ? "text-emerald-700" : "text-red-600"
          }`}
        >
          {state.message}
        </p>
      ) : null}
      <Button
        asChild
        size="lg"
        className="mt-6 w-full bg-[#E94560] hover:bg-[#D63852]"
      >
        <Link
          href={
            state.code
              ? `/checkout?coupon=${encodeURIComponent(state.code)}`
              : "/checkout"
          }
        >
          Proceed to checkout
        </Link>
      </Button>
    </>
  );
}
