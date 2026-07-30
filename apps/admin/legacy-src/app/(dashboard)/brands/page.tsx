import { Building2, Plus } from "lucide-react";

import { LookupForm } from "@/components/catalog/lookup-form";
import { FlashMessage } from "@/components/ui/flash-message";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState, Panel, PanelHeader } from "@/components/ui/panel";
import { StatusBadge } from "@/components/ui/status-badge";
import { getCatalogLookups } from "@/lib/data/admin-queries";

export default async function BrandsPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; error?: string }>;
}) {
  const [params, brands] = await Promise.all([searchParams, getCatalogLookups("brands")]);

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Catalogue"
        title="Brands"
        description="Maintain consistent brand identities and storefront visibility."
      />
      <FlashMessage success={params.success} error={params.error} />
      <Panel>
        <details>
          <summary className="flex cursor-pointer list-none items-center gap-2 p-5 text-sm font-extrabold text-amber-700 hover:bg-amber-50">
            <Plus className="size-4" />
            Add brand
          </summary>
          <div className="border-t border-slate-100 bg-slate-50/50">
            <LookupForm type="brand" />
          </div>
        </details>
      </Panel>

      <Panel>
        <PanelHeader
          title="All brands"
          description={`${brands.length} brand${brands.length === 1 ? "" : "s"} in the catalogue.`}
        />
        {brands.length ? (
          <div className="divide-y divide-slate-100">
            {brands.map((brand) => (
              <details key={brand.id} className="group">
                <summary className="grid cursor-pointer list-none grid-cols-[minmax(0,1fr)_auto] items-center gap-4 p-5 hover:bg-slate-50">
                  <span>
                    <span className="block font-extrabold text-slate-950">{brand.name}</span>
                    <span className="mt-1 block text-xs text-slate-500">
                      {brand.code} · /{brand.slug}
                    </span>
                  </span>
                  <span className="flex flex-wrap gap-2">
                    <StatusBadge status={brand.status} />
                    <StatusBadge status={brand.visibility} />
                  </span>
                </summary>
                <div className="border-t border-slate-100 bg-slate-50/50">
                  <LookupForm type="brand" item={brand} />
                </div>
              </details>
            ))}
          </div>
        ) : (
          <EmptyState
            title="No brands"
            description="Create a brand before adding products."
            icon={<Building2 className="size-5" />}
          />
        )}
      </Panel>
    </div>
  );
}
