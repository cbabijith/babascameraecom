import { Image as ImageIcon, Plus } from "lucide-react";

import { BannerForm } from "@/components/promotions/banner-form";
import { FlashMessage } from "@/components/ui/flash-message";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState, Panel, PanelHeader } from "@/components/ui/panel";
import { StatusBadge } from "@/components/ui/status-badge";
import { requirePermission } from "@/lib/auth/admin";
import { getBanners } from "@/lib/data/admin-queries";
import { formatDate } from "@/lib/utils";

export default async function BannersPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; error?: string }>;
}) {
  const [params, banners] = await Promise.all([
    searchParams,
    getBanners(),
    requirePermission("promotions"),
  ]);

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Storefront merchandising"
        title="Banners"
        description="Schedule storefront calls to action with explicit publication and visibility controls."
      />
      <FlashMessage success={params.success} error={params.error} />
      <Panel>
        <details>
          <summary className="flex cursor-pointer list-none items-center gap-2 p-5 text-sm font-extrabold text-amber-700 hover:bg-amber-50">
            <Plus className="size-4" />
            Create banner
          </summary>
          <div className="border-t border-slate-100 bg-slate-50/50">
            <BannerForm />
          </div>
        </details>
      </Panel>
      <Panel>
        <PanelHeader
          title="Banner schedule"
          description={`${banners.length} banner${banners.length === 1 ? "" : "s"} configured.`}
        />
        {banners.length ? (
          <div className="divide-y divide-slate-100">
            {banners.map((banner) => (
              <details key={banner.id}>
                <summary className="grid cursor-pointer list-none gap-3 p-5 hover:bg-slate-50 md:grid-cols-[1fr_1fr_auto] md:items-center">
                  <span>
                    <span className="block font-extrabold text-slate-950">{banner.heading}</span>
                    <span className="mt-1 block text-xs text-slate-500">
                      {banner.banner_type} · position {banner.position}
                    </span>
                  </span>
                  <span className="text-xs text-slate-500">
                    {banner.starts_at ? formatDate(banner.starts_at, true) : "Immediately"} –{" "}
                    {banner.ends_at ? formatDate(banner.ends_at, true) : "No end date"}
                  </span>
                  <span className="flex flex-wrap gap-2">
                    <StatusBadge status={banner.status} />
                    <StatusBadge status={banner.visibility} />
                  </span>
                </summary>
                <div className="border-t border-slate-100 bg-slate-50/60">
                  <BannerForm banner={banner} />
                </div>
              </details>
            ))}
          </div>
        ) : (
          <EmptyState
            title="No banners"
            description="Create a banner for the storefront hero or promotional areas."
            icon={<ImageIcon className="size-5" />}
          />
        )}
      </Panel>
    </div>
  );
}
