import { Field, inputClassName, Toggle } from "@/components/ui/form-controls";
import { SubmitButton } from "@/components/ui/submit-button";
import { saveVariantAction } from "@/lib/actions/catalog";
import type { VariantSummary } from "@/lib/data/types";

export function VariantForm({
  productId,
  variant,
}: {
  productId: string;
  variant?: VariantSummary;
}) {
  return (
    <form action={saveVariantAction} className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4">
      <input type="hidden" name="product_id" value={productId} />
      {variant ? <input type="hidden" name="id" value={variant.id} /> : null}
      <Field label="SKU" className="lg:col-span-2">
        <input className={inputClassName} name="sku" required defaultValue={variant?.sku} />
      </Field>
      <Field label="Barcode">
        <input className={inputClassName} name="barcode" defaultValue={variant?.barcode ?? ""} />
      </Field>
      <Field label="HSN code">
        <input className={inputClassName} name="hsn_code" defaultValue={variant?.hsn_code ?? ""} />
      </Field>
      <Field label="Selling price (₹)">
        <input
          className={inputClassName}
          type="number"
          name="price"
          min={0}
          step="0.01"
          required
          defaultValue={variant ? variant.price_minor / 100 : undefined}
        />
      </Field>
      <Field label="Compare-at price (₹)">
        <input
          className={inputClassName}
          type="number"
          name="compare_at_price"
          min={0}
          step="0.01"
          defaultValue={
            variant?.compare_at_minor === null || variant?.compare_at_minor === undefined
              ? undefined
              : variant.compare_at_minor / 100
          }
        />
      </Field>
      <Field label="Cost price (₹)">
        <input
          className={inputClassName}
          type="number"
          name="cost_price"
          min={0}
          step="0.01"
          defaultValue={
            variant?.cost_minor === null || variant?.cost_minor === undefined
              ? undefined
              : variant.cost_minor / 100
          }
        />
      </Field>
      <Field label="GST rate (%)">
        <input
          className={inputClassName}
          type="number"
          name="tax_rate"
          min={0}
          max={100}
          step="0.01"
          defaultValue={(variant?.tax_rate_bps ?? 1800) / 100}
        />
      </Field>
      <Field label="Tax mode">
        <select className={inputClassName} name="tax_mode" defaultValue={variant?.tax_mode ?? "inclusive"}>
          <option value="inclusive">Inclusive</option>
          <option value="exclusive">Exclusive</option>
        </select>
      </Field>
      <Field label="Weight (grams)">
        <input
          className={inputClassName}
          type="number"
          name="weight_grams"
          min={1}
          defaultValue={variant?.weight_grams ?? undefined}
        />
      </Field>
      <Field label="Colour">
        <input className={inputClassName} name="color" defaultValue={variant?.color ?? ""} />
      </Field>
      <Field label="Colour label">
        <input
          className={inputClassName}
          name="color_label"
          defaultValue={variant?.color_label ?? ""}
        />
      </Field>
      {variant?.is_default ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <input type="hidden" name="is_default" value="true" />
          <span className="block text-sm font-extrabold text-amber-950">Default variant</span>
          <span className="mt-1 block text-xs font-medium leading-5 text-amber-800">
            A product must keep one default variant.
          </span>
        </div>
      ) : (
        <Toggle
          name="is_default"
          label="Make default"
          description="Switches the product default atomically after this variant is saved."
          defaultChecked={false}
        />
      )}
      {variant?.is_default ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <input type="hidden" name="is_active" value="true" />
          <span className="block text-sm font-extrabold text-emerald-950">Sellable</span>
          <span className="mt-1 block text-xs font-medium leading-5 text-emerald-800">
            The default variant stays active.
          </span>
        </div>
      ) : (
        <Toggle
          name="is_active"
          label="Sellable"
          description="Inactive variants cannot be added to checkout."
          defaultChecked={variant?.is_active ?? true}
        />
      )}
      <div className="flex items-end justify-end sm:col-span-2 lg:col-span-4">
        <SubmitButton pendingLabel="Saving variant…">
          {variant ? "Save variant" : "Add variant"}
        </SubmitButton>
      </div>
    </form>
  );
}
