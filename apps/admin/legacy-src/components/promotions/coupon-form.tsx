import { Field, inputClassName, textareaClassName, Toggle } from "@/components/ui/form-controls";
import { SubmitButton } from "@/components/ui/submit-button";
import { saveCouponAction } from "@/lib/actions/promotions";
import type { CouponSummary } from "@/lib/data/types";

function dateTimeValue(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

export function CouponForm({ coupon }: { coupon?: CouponSummary }) {
  return (
    <form action={saveCouponAction} className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-4">
      {coupon ? <input type="hidden" name="id" value={coupon.id} /> : null}
      <Field label="Coupon code">
        <input
          className={inputClassName}
          name="code"
          required
          maxLength={40}
          defaultValue={coupon?.code}
          placeholder="WELCOME10"
        />
      </Field>
      <Field label="Internal name">
        <input
          className={inputClassName}
          name="name"
          required
          maxLength={120}
          defaultValue={coupon?.name}
        />
      </Field>
      <Field label="Discount type">
        <select
          className={inputClassName}
          name="coupon_type"
          defaultValue={coupon?.coupon_type ?? "percentage"}
        >
          <option value="percentage">Percentage</option>
          <option value="fixed">Fixed amount</option>
          <option value="free_shipping">Free shipping</option>
        </select>
      </Field>
      <Field label="Value" hint="Percentage or rupee amount; ignored for free shipping.">
        <input
          className={inputClassName}
          type="number"
          name="value"
          min={0.01}
          step="0.01"
          required
          defaultValue={
            coupon
              ? coupon.coupon_type === "percentage"
                ? coupon.value / 100
                : coupon.coupon_type === "fixed"
                  ? coupon.value / 100
                  : 1
              : 10
          }
        />
      </Field>
      <Field label="Minimum subtotal (₹)">
        <input
          className={inputClassName}
          type="number"
          name="minimum_subtotal"
          min={0}
          step="0.01"
          defaultValue={(coupon?.minimum_subtotal_minor ?? 0) / 100}
        />
      </Field>
      <Field label="Maximum discount (₹)" hint="Optional; mainly for percentage coupons.">
        <input
          className={inputClassName}
          type="number"
          name="maximum_discount"
          min={0}
          step="0.01"
          defaultValue={
            coupon?.maximum_discount_minor == null
              ? undefined
              : coupon.maximum_discount_minor / 100
          }
        />
      </Field>
      <Field label="Starts">
        <input
          className={inputClassName}
          type="datetime-local"
          name="starts_at"
          required
          defaultValue={dateTimeValue(coupon?.starts_at)}
        />
      </Field>
      <Field label="Ends">
        <input
          className={inputClassName}
          type="datetime-local"
          name="ends_at"
          required
          defaultValue={dateTimeValue(coupon?.ends_at)}
        />
      </Field>
      <Field label="Total usage limit" hint="Leave blank for unlimited use.">
        <input
          className={inputClassName}
          type="number"
          name="total_usage_limit"
          min={1}
          defaultValue={coupon?.total_usage_limit ?? undefined}
        />
      </Field>
      <Field label="Per-customer limit">
        <input
          className={inputClassName}
          type="number"
          name="per_customer_limit"
          min={1}
          max={100}
          required
          defaultValue={coupon?.per_customer_limit ?? 1}
        />
      </Field>
      <Field label="Description" className="md:col-span-2">
        <textarea
          className={textareaClassName}
          name="description"
          maxLength={1000}
          defaultValue={coupon?.description ?? ""}
        />
      </Field>
      <Toggle
        name="is_active"
        label="Coupon active"
        description="Checkout also enforces the start and end times."
        defaultChecked={coupon?.is_active ?? true}
      />
      <div className="flex items-end justify-end xl:col-span-3">
        <SubmitButton pendingLabel="Saving coupon…">Save coupon</SubmitButton>
      </div>
    </form>
  );
}
