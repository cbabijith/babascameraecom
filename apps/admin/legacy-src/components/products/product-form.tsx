import { Field, inputClassName, textareaClassName } from "@/components/ui/form-controls";
import { Panel, PanelHeader } from "@/components/ui/panel";
import { SubmitButton } from "@/components/ui/submit-button";
import { updateProductAction } from "@/lib/actions/catalog";
import { createProductAction } from "@/lib/actions/workflows";
import type { CatalogLookup } from "@/lib/data/types";

type EditableProduct = {
  id: string;
  brand_id: string;
  primary_category_id: string;
  name: string;
  slug: string;
  code: string;
  description: string | null;
  key_features: string[];
  specifications: Record<string, unknown>;
  measuring_unit: string;
  payment_eligibility: string;
  status: string;
  visibility: string;
  position: number;
  seo_title: string | null;
  seo_description: string | null;
};

export function ProductForm({
  mode,
  product,
  brands,
  categories,
}: {
  mode: "create" | "edit";
  product?: EditableProduct;
  brands: CatalogLookup[];
  categories: CatalogLookup[];
}) {
  return (
    <form action={mode === "create" ? createProductAction : updateProductAction} className="grid gap-6">
      {product ? <input type="hidden" name="id" value={product.id} /> : null}

      <Panel>
        <PanelHeader title="Product identity" description="The customer-facing catalogue record." />
        <div className="grid gap-5 p-5 sm:grid-cols-2">
          <Field label="Product name" className="sm:col-span-2">
            <input
              className={inputClassName}
              name="name"
              defaultValue={product?.name}
              placeholder="Sony Alpha 7 IV Mirrorless Camera"
              required
              maxLength={180}
            />
          </Field>
          <Field label="URL slug" hint="Leave blank to derive it from the product name.">
            <input
              className={inputClassName}
              name="slug"
              defaultValue={product?.slug}
              placeholder="sony-alpha-7-iv"
              pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
            />
          </Field>
          <Field label="Product code">
            <input
              className={inputClassName}
              name="code"
              defaultValue={product?.code}
              placeholder="CAM-SONY-A7IV"
              required
              maxLength={40}
            />
          </Field>
          <Field label="Brand">
            <select
              className={inputClassName}
              name="brand_id"
              defaultValue={product?.brand_id ?? ""}
              required
            >
              <option value="" disabled>
                Choose brand
              </option>
              {brands.map((brand) => (
                <option key={brand.id} value={brand.id}>
                  {brand.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Primary category">
            {mode === "edit" && product ? (
              <>
                <input
                  type="hidden"
                  name="primary_category_id"
                  value={product.primary_category_id}
                />
                <select
                  className={inputClassName}
                  defaultValue={product.primary_category_id}
                  disabled
                >
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </>
            ) : (
              <select
                className={inputClassName}
                name="primary_category_id"
                defaultValue=""
                required
              >
                <option value="" disabled>
                  Choose category
                </option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            )}
          </Field>
          <Field label="Description" className="sm:col-span-2">
            <textarea
              className={textareaClassName}
              name="description"
              defaultValue={product?.description ?? ""}
              placeholder="Describe the product, intended use, and key customer benefits."
              maxLength={12000}
            />
          </Field>
          <Field
            label="Key features"
            hint="One feature per line. These become structured feature bullets."
            className="sm:col-span-2"
          >
            <textarea
              className={textareaClassName}
              name="key_features"
              defaultValue={product?.key_features?.join("\n")}
              placeholder={"33MP full-frame sensor\n4K 60p recording\n5-axis stabilisation"}
            />
          </Field>
          <Field
            label="Specifications"
            hint='A JSON object, for example {"Sensor":"33MP","Mount":"Sony E"}.'
            className="sm:col-span-2"
          >
            <textarea
              className={`${textareaClassName} font-mono text-xs`}
              name="specifications"
              defaultValue={JSON.stringify(product?.specifications ?? {}, null, 2)}
              spellCheck={false}
            />
          </Field>
        </div>
      </Panel>

      <Panel>
        <PanelHeader title="Availability" description="Control payment eligibility and publication." />
        <div className="grid gap-5 p-5 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Payment eligibility">
            <select
              className={inputClassName}
              name="payment_eligibility"
              defaultValue={product?.payment_eligibility ?? "both"}
            >
              <option value="both">Online and COD</option>
              <option value="online">Online only</option>
              <option value="cod">COD only</option>
            </select>
          </Field>
          <Field label="Status">
            {product?.status === "archived" ? (
              <>
                <input type="hidden" name="status" value="archived" />
                <select className={inputClassName} value="archived" disabled>
                  <option value="archived">Archived</option>
                </select>
              </>
            ) : (
              <select
                className={inputClassName}
                name="status"
                defaultValue={product?.status ?? "draft"}
              >
                <option value="draft">Draft</option>
                <option value="active">Active</option>
              </select>
            )}
          </Field>
          <Field label="Visibility">
            <select
              className={inputClassName}
              name="visibility"
              defaultValue={product?.visibility ?? "hidden"}
            >
              <option value="hidden">Hidden</option>
              <option value="visible">Visible</option>
            </select>
          </Field>
          <Field label="Display position">
            <input
              className={inputClassName}
              type="number"
              name="position"
              min={0}
              defaultValue={product?.position ?? 0}
            />
          </Field>
          <Field label="Measuring unit">
            <input
              className={inputClassName}
              name="measuring_unit"
              defaultValue={product?.measuring_unit ?? "unit"}
              maxLength={30}
            />
          </Field>
        </div>
      </Panel>

      {mode === "create" ? <DefaultVariantFields /> : null}

      <Panel>
        <PanelHeader title="Search appearance" description="Optional search and share metadata." />
        <div className="grid gap-5 p-5">
          <Field label="SEO title" hint="Recommended maximum: 60–70 characters.">
            <input
              className={inputClassName}
              name="seo_title"
              defaultValue={product?.seo_title ?? ""}
              maxLength={70}
            />
          </Field>
          <Field label="SEO description" hint="Recommended maximum: 160–170 characters.">
            <textarea
              className={textareaClassName}
              name="seo_description"
              defaultValue={product?.seo_description ?? ""}
              maxLength={170}
            />
          </Field>
        </div>
      </Panel>

      <div className="flex justify-end">
        <SubmitButton className="min-w-44" pendingLabel={mode === "create" ? "Creating…" : "Saving…"}>
          {mode === "create" ? "Create product" : "Save product"}
        </SubmitButton>
      </div>
    </form>
  );
}

function DefaultVariantFields() {
  return (
    <Panel>
      <PanelHeader
        title="Default variant"
        description="Every product starts with one sellable SKU. Add more variants after creation."
      />
      <div className="grid gap-5 p-5 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="SKU" className="lg:col-span-2">
          <input className={inputClassName} name="sku" required placeholder="SONY-A7IV-BODY" />
        </Field>
        <Field label="Barcode">
          <input className={inputClassName} name="barcode" />
        </Field>
        <Field label="HSN code">
          <input className={inputClassName} name="hsn_code" />
        </Field>
        <Field label="Selling price (₹)">
          <input className={inputClassName} type="number" name="price" min={0} step="0.01" required />
        </Field>
        <Field label="Compare-at price (₹)">
          <input className={inputClassName} type="number" name="compare_at_price" min={0} step="0.01" />
        </Field>
        <Field label="Cost price (₹)">
          <input className={inputClassName} type="number" name="cost_price" min={0} step="0.01" />
        </Field>
        <Field label="GST rate (%)">
          <input className={inputClassName} type="number" name="tax_rate" min={0} max={100} step="0.01" defaultValue={18} />
        </Field>
        <Field label="Tax mode">
          <select className={inputClassName} name="tax_mode" defaultValue="inclusive">
            <option value="inclusive">Inclusive</option>
            <option value="exclusive">Exclusive</option>
          </select>
        </Field>
        <Field label="Weight (grams)">
          <input className={inputClassName} type="number" name="weight_grams" min={1} />
        </Field>
        <Field label="Colour">
          <input className={inputClassName} name="color" />
        </Field>
        <Field label="Colour label">
          <input className={inputClassName} name="color_label" />
        </Field>
      </div>
    </Panel>
  );
}
