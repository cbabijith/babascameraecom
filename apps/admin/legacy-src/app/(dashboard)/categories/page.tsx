import { Boxes, Plus } from "lucide-react";

import { LookupForm } from "@/components/catalog/lookup-form";
import { FlashMessage } from "@/components/ui/flash-message";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState, Panel, PanelHeader } from "@/components/ui/panel";
import { StatusBadge } from "@/components/ui/status-badge";
import { getCatalogLookups } from "@/lib/data/admin-queries";

export default async function CategoriesPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; error?: string }>;
}) {
  const [params, categories] = await Promise.all([
    searchParams,
    getCatalogLookups("categories"),
  ]);
  const names = new Map(categories.map((category) => [category.id, category.name]));

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Catalogue"
        title="Categories"
        description="Organise products into a clear, customer-friendly hierarchy."
      />
      <FlashMessage success={params.success} error={params.error} />
      <Panel>
        <details>
          <summary className="flex cursor-pointer list-none items-center gap-2 p-5 text-sm font-extrabold text-amber-700 hover:bg-amber-50">
            <Plus className="size-4" />
            Add category
          </summary>
          <div className="border-t border-slate-100 bg-slate-50/50">
            <LookupForm type="category" allCategories={categories} />
          </div>
        </details>
      </Panel>

      <Panel>
        <PanelHeader
          title="Category tree"
          description={`${categories.length} categor${categories.length === 1 ? "y" : "ies"} configured.`}
        />
        {categories.length ? (
          <div className="divide-y divide-slate-100">
            {categories.map((category) => (
              <details key={category.id}>
                <summary className="grid cursor-pointer list-none grid-cols-[minmax(0,1fr)_auto] items-center gap-4 p-5 hover:bg-slate-50">
                  <span>
                    <span className="block font-extrabold text-slate-950">{category.name}</span>
                    <span className="mt-1 block text-xs text-slate-500">
                      {category.parent_id ? `Under ${names.get(category.parent_id) ?? "another category"} · ` : ""}
                      {category.code} · /{category.slug}
                    </span>
                  </span>
                  <span className="flex gap-2">
                    <StatusBadge status={category.status} />
                    <StatusBadge status={category.visibility} />
                  </span>
                </summary>
                <div className="border-t border-slate-100 bg-slate-50/50">
                  <LookupForm
                    type="category"
                    item={category}
                    allCategories={categories}
                  />
                </div>
              </details>
            ))}
          </div>
        ) : (
          <EmptyState
            title="No categories"
            description="Create a category before adding products."
            icon={<Boxes className="size-5" />}
          />
        )}
      </Panel>
    </div>
  );
}
