import { AlertTriangle, Boxes, PackageOpen, PlusCircle } from "lucide-react";

import { FlashMessage } from "@/components/ui/flash-message";
import { Field, inputClassName, textareaClassName } from "@/components/ui/form-controls";
import { MetricCard } from "@/components/ui/metric-card";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState, Panel, PanelHeader } from "@/components/ui/panel";
import { SubmitButton } from "@/components/ui/submit-button";
import { adjustInventoryAction } from "@/lib/actions/workflows";
import {
  getInventory,
  getInventoryAdjustmentOptions,
} from "@/lib/data/admin-queries";
import { formatDate } from "@/lib/utils";

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<{ stock?: string; success?: string; error?: string }>;
}) {
  const [params, entries, options] = await Promise.all([
    searchParams,
    getInventory(),
    getInventoryAdjustmentOptions(),
  ]);
  const visibleEntries =
    params.stock === "low"
      ? entries.filter((entry) => entry.available_quantity <= entry.low_stock_threshold)
      : entries;
  const totals = entries.reduce(
    (result, entry) => ({
      onHand: result.onHand + entry.on_hand,
      reserved: result.reserved + entry.reserved,
      available: result.available + entry.available_quantity,
      low: result.low + Number(entry.available_quantity <= entry.low_stock_threshold),
    }),
    { onHand: 0, reserved: 0, available: 0, low: 0 },
  );

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Stock control"
        title="Inventory"
        description="Adjust physical stock through an atomic ledger entry; reserved checkout stock remains protected."
      />
      <FlashMessage success={params.success} error={params.error} />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="On hand" value={totals.onHand.toLocaleString("en-IN")} icon={Boxes} />
        <MetricCard
          label="Reserved"
          value={totals.reserved.toLocaleString("en-IN")}
          icon={PackageOpen}
          tone="violet"
        />
        <MetricCard
          label="Available"
          value={totals.available.toLocaleString("en-IN")}
          icon={PlusCircle}
          tone="emerald"
        />
        <MetricCard
          label="Low stock"
          value={totals.low.toLocaleString("en-IN")}
          icon={AlertTriangle}
          tone={totals.low ? "rose" : "emerald"}
        />
      </section>

      <Panel>
        <details>
          <summary className="flex cursor-pointer list-none items-center gap-2 p-5 text-sm font-extrabold text-amber-700 hover:bg-amber-50">
            <PlusCircle className="size-4" />
            Record stock adjustment
          </summary>
          <form
            action={adjustInventoryAction}
            className="grid gap-4 border-t border-slate-100 bg-slate-50/50 p-5 md:grid-cols-2"
          >
            <Field label="Variant">
              <select className={inputClassName} name="variant_id" required defaultValue="">
                <option value="" disabled>
                  Choose SKU
                </option>
                {options.variants.map((variant) => (
                  <option key={variant.id} value={variant.id}>
                    {variant.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Location">
              <select className={inputClassName} name="location_id" required defaultValue="">
                <option value="" disabled>
                  Choose stock location
                </option>
                {options.locations.map((location) => (
                  <option key={location.id} value={location.id}>
                    {location.code} — {location.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field
              label="Quantity change"
              hint="Use a positive number for receipts and a negative number for corrections."
            >
              <input
                className={inputClassName}
                type="number"
                name="delta"
                required
                step={1}
                placeholder="+10 or -2"
              />
            </Field>
            <Field label="Reason" className="md:row-span-2">
              <textarea
                className={textareaClassName}
                name="reason"
                required
                minLength={3}
                maxLength={500}
                placeholder="Purchase receipt, cycle count correction…"
              />
            </Field>
            <div className="flex items-end">
              <SubmitButton pendingLabel="Recording adjustment…">
                Record adjustment
              </SubmitButton>
            </div>
          </form>
        </details>
      </Panel>

      <Panel>
        <PanelHeader
          title={params.stock === "low" ? "Low-stock variants" : "Inventory by location"}
          description={`${visibleEntries.length} stock level${visibleEntries.length === 1 ? "" : "s"} shown.`}
          action={
            <a
              href={params.stock === "low" ? "/inventory" : "/inventory?stock=low"}
              className="text-xs font-extrabold text-amber-700"
            >
              {params.stock === "low" ? "Show all" : "Show low stock"}
            </a>
          }
        />
        {visibleEntries.length ? (
          <div className="overflow-x-auto">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Variant</th>
                  <th>Location</th>
                  <th className="text-right">On hand</th>
                  <th className="text-right">Reserved</th>
                  <th className="text-right">Available</th>
                  <th className="text-right">Threshold</th>
                  <th>Updated</th>
                </tr>
              </thead>
              <tbody>
                {visibleEntries.map((entry) => {
                  const low = entry.available_quantity <= entry.low_stock_threshold;
                  return (
                    <tr key={entry.id}>
                      <td>
                        <span className="block font-extrabold text-slate-950">{entry.sku}</span>
                        <span className="mt-1 block text-xs text-slate-500">
                          {entry.productName}
                        </span>
                      </td>
                      <td>
                        <span className="block font-bold text-slate-800">{entry.locationName}</span>
                        <span className="mt-1 block text-xs text-slate-500">{entry.locationCode}</span>
                      </td>
                      <td className="text-right font-bold">{entry.on_hand}</td>
                      <td className="text-right font-bold text-violet-700">{entry.reserved}</td>
                      <td
                        className={`text-right font-black ${low ? "text-rose-600" : "text-emerald-700"}`}
                      >
                        {entry.available_quantity}
                      </td>
                      <td className="text-right">{entry.low_stock_threshold}</td>
                      <td className="text-xs text-slate-500">{formatDate(entry.updated_at, true)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="No inventory levels"
            description="Record a stock adjustment to initialise inventory for a variant and location."
            icon={<PackageOpen className="size-5" />}
          />
        )}
      </Panel>
    </div>
  );
}
