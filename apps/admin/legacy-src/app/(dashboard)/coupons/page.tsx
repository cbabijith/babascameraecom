import { Plus, TicketPercent } from "lucide-react";

import { CouponForm } from "@/components/promotions/coupon-form";
import { FlashMessage } from "@/components/ui/flash-message";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState, Panel, PanelHeader } from "@/components/ui/panel";
import { StatusBadge } from "@/components/ui/status-badge";
import { SubmitButton } from "@/components/ui/submit-button";
import { toggleCouponAction } from "@/lib/actions/promotions";
import { requirePermission } from "@/lib/auth/admin";
import { getCoupons } from "@/lib/data/admin-queries";
import { formatDate, formatMoney } from "@/lib/utils";

function couponValue(coupon: Awaited<ReturnType<typeof getCoupons>>[number]) {
  if (coupon.coupon_type === "percentage") return `${coupon.value / 100}%`;
  if (coupon.coupon_type === "fixed") return formatMoney(coupon.value);
  return "Free shipping";
}

export default async function CouponsPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; error?: string }>;
}) {
  const [params, coupons] = await Promise.all([
    searchParams,
    getCoupons(),
    requirePermission("promotions"),
  ]);

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Promotions"
        title="Coupons"
        description="Configure server-validated discounts, schedules, minimums, and usage limits."
      />
      <FlashMessage success={params.success} error={params.error} />
      <Panel>
        <details>
          <summary className="flex cursor-pointer list-none items-center gap-2 p-5 text-sm font-extrabold text-amber-700 hover:bg-amber-50">
            <Plus className="size-4" />
            Create coupon
          </summary>
          <div className="border-t border-slate-100 bg-slate-50/50">
            <CouponForm />
          </div>
        </details>
      </Panel>
      <Panel>
        <PanelHeader
          title="Coupon library"
          description={`${coupons.length} configured coupon${coupons.length === 1 ? "" : "s"}.`}
        />
        {coupons.length ? (
          <div className="divide-y divide-slate-100">
            {coupons.map((coupon) => (
              <details key={coupon.id}>
                <summary className="grid cursor-pointer list-none gap-3 p-5 hover:bg-slate-50 md:grid-cols-[1fr_1fr_auto] md:items-center">
                  <span>
                    <span className="font-mono text-sm font-black text-slate-950">{coupon.code}</span>
                    <span className="mt-1 block text-xs text-slate-500">{coupon.name}</span>
                  </span>
                  <span>
                    <span className="block text-sm font-extrabold text-slate-950">
                      {couponValue(coupon)}
                    </span>
                    <span className="mt-1 block text-xs text-slate-500">
                      {formatDate(coupon.starts_at)} – {formatDate(coupon.ends_at)}
                    </span>
                  </span>
                  <StatusBadge status={coupon.is_active ? "active" : "inactive"} />
                </summary>
                <div className="border-t border-slate-100 bg-slate-50/60">
                  <CouponForm coupon={coupon} />
                  <form
                    action={toggleCouponAction}
                    className="flex justify-end border-t border-slate-200 p-5"
                  >
                    <input type="hidden" name="id" value={coupon.id} />
                    <input
                      type="hidden"
                      name="enabled"
                      value={coupon.is_active ? "false" : "true"}
                    />
                    <SubmitButton
                      variant={coupon.is_active ? "danger" : "secondary"}
                      pendingLabel="Updating…"
                    >
                      {coupon.is_active ? "Disable coupon" : "Enable coupon"}
                    </SubmitButton>
                  </form>
                </div>
              </details>
            ))}
          </div>
        ) : (
          <EmptyState
            title="No coupons"
            description="Create a coupon to offer a controlled checkout promotion."
            icon={<TicketPercent className="size-5" />}
          />
        )}
      </Panel>
    </div>
  );
}
