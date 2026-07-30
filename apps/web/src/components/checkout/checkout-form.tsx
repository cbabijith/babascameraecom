"use client";

import Script from "next/script";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Button,
  Card,
  CardContent,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  Textarea,
} from "@babascamera/ui";
import { useForm, type UseFormReturn } from "react-hook-form";
import {
  placeOrderAction,
  type CheckoutActionState,
} from "@/app/actions/checkout";
import {
  previewCartCouponAction,
  type CartCouponState,
} from "@/app/actions/cart-coupon";
import {
  checkoutInputSchema,
  type CheckoutFormInput,
  type CheckoutInput,
} from "@/lib/commerce/checkout-schema";
import { formatMoney } from "@/lib/format";

interface AddressOption {
  id: string;
  label: string;
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  pincode: string;
  country: string;
  isDefault: boolean;
}

interface RazorpaySuccess {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

type RazorpayCheckout = new (options: {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  prefill?: { name?: string; email?: string; contact?: string };
  handler: (response: RazorpaySuccess) => void | Promise<void>;
  modal?: { ondismiss?: () => void };
  theme?: { color: string };
}) => { open: () => void };

declare global {
  interface Window {
    Razorpay?: RazorpayCheckout;
  }
}

const emptyGuest = {
  email: "",
  fullName: "",
  phone: "",
  label: "Delivery",
  line1: "",
  line2: "",
  city: "",
  state: "",
  pincode: "",
  country: "India",
};

function InputField({
  form,
  name,
  label,
  type = "text",
  autoComplete,
}: {
  form: UseFormReturn<CheckoutFormInput, unknown, CheckoutInput>;
  name:
    | "guest.email"
    | "guest.fullName"
    | "guest.phone"
    | "guest.label"
    | "guest.line1"
    | "guest.line2"
    | "guest.city"
    | "guest.state"
    | "guest.pincode"
    | "guest.country";
  label: string;
  type?: string;
  autoComplete?: string;
}) {
  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <Input
              {...field}
              value={field.value ?? ""}
              type={type}
              autoComplete={autoComplete}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

export function CheckoutForm({
  addresses,
  idempotencyKey,
  customer,
  initialQuote,
  freeShippingAbove,
  codEnabled,
  codMaximum,
  defaultCoupon,
}: {
  addresses: AddressOption[];
  idempotencyKey: string;
  customer: { name: string; email: string; phone: string } | null;
  initialQuote: CartCouponState;
  freeShippingAbove: string;
  codEnabled: boolean;
  codMaximum: string;
  defaultCoupon: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [checkingCoupon, startCouponTransition] = useTransition();
  const [state, setState] = useState<CheckoutActionState | null>(null);
  const [quote, setQuote] = useState(initialQuote);
  const [verifying, setVerifying] = useState(false);
  const authenticated = customer !== null;
  const defaultAddress =
    addresses.find((address) => address.isDefault)?.id ?? addresses[0]?.id;
  const form = useForm<CheckoutFormInput, unknown, CheckoutInput>({
    resolver: zodResolver(checkoutInputSchema),
    defaultValues: {
      addressId: authenticated ? defaultAddress : undefined,
      guest: authenticated
        ? undefined
        : {
            ...emptyGuest,
          },
      paymentMethod: "razorpay",
      couponCode: defaultCoupon,
      notes: "",
      idempotencyKey,
    },
  });

  const verifyPayment = async (
    response: RazorpaySuccess,
    orderNumber: string,
  ) => {
    setVerifying(true);
    const result = await fetch("/api/payments/razorpay/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(response),
    });
    const body = (await result.json().catch(() => null)) as {
      ok?: boolean;
      compensated?: boolean;
      message?: string;
    } | null;
    if (!result.ok || !body?.ok) {
      setVerifying(false);
      setState({
        ok: false,
        message:
          body?.message ??
          "Payment confirmation is still pending. Your order is safe; please check again shortly.",
      });
      return;
    }
    router.push(
      `/checkout/success/${encodeURIComponent(orderNumber)}${
        body.compensated ? "?refunded=1" : ""
      }`,
    );
    router.refresh();
  };

  const submit = form.handleSubmit((values) => {
    setState(null);
    startTransition(async () => {
      const result = await placeOrderAction(values);
      setState(result);
      if (!result.ok) return;
      if (result.order.paymentMethod === "cod" || result.order.completed) {
        router.push(
          `/checkout/success/${encodeURIComponent(result.order.orderNumber)}`,
        );
        router.refresh();
        return;
      }
      const checkout = result.order.razorpay;
      if (!checkout || !window.Razorpay) {
        setState({
          ok: false,
          message:
            "The secure payment window is not ready. Please try again.",
        });
        return;
      }
      const guest = values.guest;
      const prefillName = customer?.name || guest?.fullName;
      const prefillEmail = customer?.email || guest?.email;
      const prefillPhone = customer?.phone || guest?.phone;
      new window.Razorpay({
        key: checkout.keyId,
        amount: result.order.totalPaise,
        currency: result.order.currency,
        name: "Baba's Camera",
        description: `Order ${result.order.orderNumber}`,
        order_id: checkout.orderId,
        prefill: {
          ...(prefillName ? { name: prefillName } : {}),
          ...(prefillEmail ? { email: prefillEmail } : {}),
          ...(prefillPhone ? { contact: prefillPhone } : {}),
        },
        handler: (response) =>
          verifyPayment(response, result.order.orderNumber),
        modal: {
          ondismiss: () =>
            setState({
              ok: false,
              message:
                "Payment was not completed. Your reserved checkout can be retried for a short time.",
            }),
        },
        theme: { color: "#E94560" },
      }).open();
    });
  });

  const checkCoupon = () => {
    const formData = new FormData();
    formData.set("couponCode", form.getValues("couponCode") ?? "");
    startCouponTransition(async () => {
      setQuote(await previewCartCouponAction(quote, formData));
    });
  };

  return (
    <>
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        strategy="afterInteractive"
      />
      <Form {...form}>
        <form
          onSubmit={submit}
          className="grid gap-8 lg:grid-cols-[1fr_23rem]"
          noValidate
        >
          <div className="space-y-6">
            <Card>
              <CardContent className="p-6">
                <h2 className="text-xl font-bold">Delivery details</h2>
                {authenticated ? (
                  addresses.length ? (
                    <FormField
                      control={form.control}
                      name="addressId"
                      render={({ field }) => (
                        <FormItem className="mt-5">
                          <div className="space-y-3">
                            {addresses.map((address) => (
                              <label
                                key={address.id}
                                className="flex cursor-pointer gap-3 rounded-xl border border-slate-200 p-4 has-[:checked]:border-[#E94560] has-[:checked]:bg-rose-50"
                              >
                                <input
                                  type="radio"
                                  value={address.id}
                                  checked={field.value === address.id}
                                  onChange={() => field.onChange(address.id)}
                                  className="mt-1 accent-[#E94560]"
                                />
                                <span className="text-sm leading-6">
                                  <strong>{address.label}</strong>
                                  <br />
                                  {address.line1}
                                  {address.line2
                                    ? `, ${address.line2}`
                                    : ""}
                                  <br />
                                  {address.city}, {address.state}{" "}
                                  {address.pincode}, {address.country}
                                </span>
                              </label>
                            ))}
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  ) : (
                    <div className="mt-5 rounded-xl bg-amber-50 p-4 text-sm text-amber-900">
                      Add a delivery address before placing your order.{" "}
                      <Link
                        href="/account/addresses"
                        className="font-semibold underline"
                      >
                        Add address
                      </Link>
                    </div>
                  )
                ) : (
                  <div className="mt-5 grid gap-4 sm:grid-cols-2">
                    <InputField
                      form={form}
                      name="guest.email"
                      label="Email"
                      type="email"
                      autoComplete="email"
                    />
                    <InputField
                      form={form}
                      name="guest.fullName"
                      label="Full name"
                      autoComplete="name"
                    />
                    <InputField
                      form={form}
                      name="guest.phone"
                      label="Phone"
                      type="tel"
                      autoComplete="tel"
                    />
                    <InputField
                      form={form}
                      name="guest.label"
                      label="Address label"
                    />
                    <div className="sm:col-span-2">
                      <InputField
                        form={form}
                        name="guest.line1"
                        label="Address line 1"
                        autoComplete="address-line1"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <InputField
                        form={form}
                        name="guest.line2"
                        label="Address line 2 (optional)"
                        autoComplete="address-line2"
                      />
                    </div>
                    <InputField
                      form={form}
                      name="guest.city"
                      label="City"
                      autoComplete="address-level2"
                    />
                    <InputField
                      form={form}
                      name="guest.state"
                      label="State"
                      autoComplete="address-level1"
                    />
                    <InputField
                      form={form}
                      name="guest.pincode"
                      label="PIN code"
                      autoComplete="postal-code"
                    />
                    <InputField
                      form={form}
                      name="guest.country"
                      label="Country"
                      autoComplete="country-name"
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <h2 className="text-xl font-bold">Payment</h2>
                <FormField
                  control={form.control}
                  name="paymentMethod"
                  render={({ field }) => (
                    <FormItem className="mt-5 space-y-3">
                      <label className="flex cursor-pointer gap-3 rounded-xl border border-slate-200 p-4 has-[:checked]:border-[#E94560]">
                        <input
                          type="radio"
                          value="razorpay"
                          checked={field.value === "razorpay"}
                          onChange={() => field.onChange("razorpay")}
                          className="accent-[#E94560]"
                        />
                        <span>
                          <strong>Pay securely online</strong>
                          <span className="mt-1 block text-sm text-slate-500">
                            UPI, cards, net banking and supported wallets via
                            Razorpay.
                          </span>
                        </span>
                      </label>
                      {codEnabled ? (
                        <label className="flex cursor-pointer gap-3 rounded-xl border border-slate-200 p-4 has-[:checked]:border-[#E94560]">
                          <input
                            type="radio"
                            value="cod"
                            checked={field.value === "cod"}
                            onChange={() => field.onChange("cod")}
                            className="accent-[#E94560]"
                          />
                          <span>
                            <strong>Cash on delivery</strong>
                            <span className="mt-1 block text-sm text-slate-500">
                              Available for eligible orders up to {codMaximum}.
                            </span>
                          </span>
                        </label>
                      ) : null}
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          </div>

          <Card className="h-fit lg:sticky lg:top-24">
            <CardContent className="p-6">
              <h2 className="text-xl font-bold">Order summary</h2>
              <dl className="mt-5 space-y-3 text-sm">
                <div className="flex justify-between">
                  <dt>Subtotal</dt>
                  <dd className="font-mono">
                    {formatMoney(quote.subtotal)}
                  </dd>
                </div>
                {quote.code ? (
                  <div className="flex justify-between text-emerald-700">
                    <dt>Coupon {quote.code}</dt>
                    <dd className="font-mono">
                      −{formatMoney(quote.discount)}
                    </dd>
                  </div>
                ) : null}
                <div className="flex justify-between">
                  <dt>Shipping</dt>
                  <dd className="font-mono">
                    {quote.shipping === "0.00"
                      ? "Free"
                      : formatMoney(quote.shipping)}
                  </dd>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-3 text-base font-bold">
                  <dt>Total</dt>
                  <dd className="font-mono">{formatMoney(quote.total)}</dd>
                </div>
              </dl>
              {freeShippingAbove !== "₹0.00" ? (
                <p className="mt-3 text-xs text-slate-500">
                  Shipping becomes free above {freeShippingAbove}.
                </p>
              ) : null}
              <FormField
                control={form.control}
                name="couponCode"
                render={({ field }) => (
                  <FormItem className="mt-5 border-t border-slate-200 pt-5">
                    <FormLabel>Coupon code</FormLabel>
                    <div className="flex gap-2">
                      <FormControl>
                        <Input
                          {...field}
                          value={field.value ?? ""}
                          autoComplete="off"
                          placeholder="Optional"
                        />
                      </FormControl>
                      <Button
                        type="button"
                        variant="outline"
                        disabled={checkingCoupon}
                        onClick={checkCoupon}
                      >
                        {checkingCoupon ? "Checking…" : "Apply"}
                      </Button>
                    </div>
                    <FormMessage />
                    {quote.message ? (
                      <p
                        role="status"
                        className={`text-xs ${
                          quote.ok ? "text-emerald-700" : "text-red-600"
                        }`}
                      >
                        {quote.message}
                      </p>
                    ) : null}
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem className="mt-4">
                    <FormLabel>Order notes</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        value={field.value ?? ""}
                        rows={3}
                        placeholder="Optional delivery note"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {state && !state.ok ? (
                <p
                  role="alert"
                  className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700"
                >
                  {state.message}
                </p>
              ) : null}
              <Button
                type="submit"
                size="lg"
                disabled={
                  pending ||
                  verifying ||
                  (authenticated && addresses.length === 0)
                }
                className="mt-5 w-full bg-[#E94560] hover:bg-[#D63852]"
              >
                {verifying
                  ? "Confirming payment…"
                  : pending
                    ? "Securing order…"
                    : "Place order"}
              </Button>
              <p className="mt-3 text-center text-xs text-slate-500">
                Stock and pricing are rechecked securely before the order is
                accepted.
              </p>
            </CardContent>
          </Card>
        </form>
      </Form>
    </>
  );
}
