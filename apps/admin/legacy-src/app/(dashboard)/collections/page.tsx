import { Plus, Tags, Trash2 } from "lucide-react";

import { CollectionForm } from "@/components/promotions/collection-form";
import { FlashMessage } from "@/components/ui/flash-message";
import { Field, inputClassName } from "@/components/ui/form-controls";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState, Panel, PanelHeader } from "@/components/ui/panel";
import { StatusBadge } from "@/components/ui/status-badge";
import { SubmitButton } from "@/components/ui/submit-button";
import { changeCollectionProductAction } from "@/lib/actions/promotions";
import { requirePermission } from "@/lib/auth/admin";
import {
  getCollections,
  getPromotionProductOptions,
} from "@/lib/data/admin-queries";

export default async function CollectionsPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; error?: string }>;
}) {
  const [params, collections, products] = await Promise.all([
    searchParams,
    getCollections(),
    getPromotionProductOptions(),
    requirePermission("promotions"),
  ]);

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Merchandising"
        title="Collections"
        description="Group products into scheduled storefront assortments with optional collection discounts."
      />
      <FlashMessage success={params.success} error={params.error} />
      <Panel>
        <details>
          <summary className="flex cursor-pointer list-none items-center gap-2 p-5 text-sm font-extrabold text-amber-700 hover:bg-amber-50">
            <Plus className="size-4" />
            Create collection
          </summary>
          <div className="border-t border-slate-100 bg-slate-50/50">
            <CollectionForm />
          </div>
        </details>
      </Panel>
      <Panel>
        <PanelHeader
          title="Collection library"
          description={`${collections.length} collection${collections.length === 1 ? "" : "s"}.`}
        />
        {collections.length ? (
          <div className="divide-y divide-slate-100">
            {collections.map((collection) => (
              <details key={collection.id}>
                <summary className="grid cursor-pointer list-none gap-3 p-5 hover:bg-slate-50 md:grid-cols-[1fr_auto_auto] md:items-center">
                  <span>
                    <span className="block font-extrabold text-slate-950">{collection.name}</span>
                    <span className="mt-1 block text-xs text-slate-500">
                      /{collection.slug} · {collection.productCount} products ·{" "}
                      {collection.discount_bps / 100}% discount
                    </span>
                  </span>
                  <StatusBadge status={collection.status} />
                  <StatusBadge status={collection.visibility} />
                </summary>
                <div className="border-t border-slate-100 bg-slate-50/60">
                  <CollectionForm collection={collection} />
                  <div className="border-t border-slate-200 p-5">
                    <h3 className="text-sm font-extrabold text-slate-950">Collection products</h3>
                    <form
                      action={changeCollectionProductAction}
                      className="mt-3 grid gap-3 md:grid-cols-[1fr_8rem_auto]"
                    >
                      <input type="hidden" name="collection_id" value={collection.id} />
                      <input type="hidden" name="operation" value="add" />
                      <Field label="Product">
                        <select className={inputClassName} name="product_id" required defaultValue="">
                          <option value="" disabled>
                            Choose product
                          </option>
                          {products.map((product) => (
                            <option key={product.id} value={product.id}>
                              {product.name} ({product.code})
                            </option>
                          ))}
                        </select>
                      </Field>
                      <Field label="Position">
                        <input
                          className={inputClassName}
                          type="number"
                          min={0}
                          name="position"
                          defaultValue={collection.productCount}
                        />
                      </Field>
                      <div className="flex items-end">
                        <SubmitButton pendingLabel="Adding…">Add product</SubmitButton>
                      </div>
                    </form>
                    {collection.products.length ? (
                      <div className="mt-4 grid gap-2">
                        {collection.products.map((product) => (
                          <div
                            key={product.id}
                            className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white px-4 py-3"
                          >
                            <span className="text-sm font-bold text-slate-800">
                              {product.name}
                              <span className="ml-2 text-xs font-medium text-slate-400">
                                position {product.position}
                              </span>
                            </span>
                            <form action={changeCollectionProductAction}>
                              <input type="hidden" name="collection_id" value={collection.id} />
                              <input type="hidden" name="product_id" value={product.id} />
                              <input type="hidden" name="position" value={product.position} />
                              <input type="hidden" name="operation" value="remove" />
                              <button
                                type="submit"
                                aria-label={`Remove ${product.name}`}
                                className="grid size-9 place-items-center rounded-xl text-rose-600 hover:bg-rose-50"
                              >
                                <Trash2 className="size-4" />
                              </button>
                            </form>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-4 text-sm text-slate-500">No products assigned yet.</p>
                    )}
                  </div>
                </div>
              </details>
            ))}
          </div>
        ) : (
          <EmptyState
            title="No collections"
            description="Create a collection and assign catalogue products."
            icon={<Tags className="size-5" />}
          />
        )}
      </Panel>
    </div>
  );
}
