import {
  AlertTriangle,
  ArrowUpRight,
  IndianRupee,
  PackageCheck,
  RotateCcw,
  ShoppingBag,
  Users,
} from "lucide-react";
import Link from "next/link";

import { MetricCard } from "@/components/ui/metric-card";
import { PageHeader, HeaderLink } from "@/components/ui/page-header";
import { EmptyState, Panel, PanelHeader } from "@/components/ui/panel";
import { StatusBadge } from "@/components/ui/status-badge";
import { getDashboardData } from "@/lib/data/admin-queries";
import { formatDate, formatMoney } from "@/lib/utils";

export default async function DashboardPage() {
  const { metrics, recentOrders } = await getDashboardData();

  return (
    <div className="grid gap-7">
      <PageHeader
        eyebrow="Operations centre"
        title="Good decisions start here."
        description="A live view of sales, fulfilment pressure, inventory risk, and customer activity."
        action={
          <HeaderLink href="/products/new">
            Add product
            <ArrowUpRight className="size-4" />
          </HeaderLink>
        }
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <MetricCard
          label="30-day revenue"
          value={formatMoney(metrics.revenueMinor)}
          helper="Captured payments"
          icon={IndianRupee}
          tone="amber"
        />
        <MetricCard
          label="Orders"
          value={metrics.orderCount.toLocaleString("en-IN")}
          helper="All-time records"
          icon={PackageCheck}
          tone="slate"
        />
        <MetricCard
          label="Products"
          value={metrics.productCount.toLocaleString("en-IN")}
          helper="Across the catalogue"
          icon={ShoppingBag}
          tone="sky"
        />
        <MetricCard
          label="Customers"
          value={metrics.customerCount.toLocaleString("en-IN")}
          helper="Registered accounts"
          icon={Users}
          tone="violet"
        />
        <MetricCard
          label="Low stock"
          value={metrics.lowStockCount.toLocaleString("en-IN")}
          helper="Needs replenishment"
          icon={AlertTriangle}
          tone={metrics.lowStockCount ? "rose" : "emerald"}
        />
        <MetricCard
          label="New returns"
          value={metrics.pendingReturns.toLocaleString("en-IN")}
          helper="Awaiting review"
          icon={RotateCcw}
          tone={metrics.pendingReturns ? "rose" : "emerald"}
        />
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(20rem,0.5fr)]">
        <Panel>
          <PanelHeader
            title="Recent orders"
            description="Newest checkout activity across every payment method."
            action={
              <Link href="/orders" className="text-xs font-extrabold text-amber-700 hover:text-amber-800">
                View all orders
              </Link>
            }
          />
          {recentOrders.length ? (
            <div className="overflow-x-auto">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Order</th>
                    <th>Customer</th>
                    <th>Status</th>
                    <th>Payment</th>
                    <th className="text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.map((order) => (
                    <tr key={order.id}>
                      <td>
                        <Link
                          href={`/orders/${order.id}`}
                          className="font-extrabold text-slate-950 hover:text-amber-700"
                        >
                          {order.order_number}
                        </Link>
                        <span className="mt-1 block text-xs text-slate-500">
                          {formatDate(order.created_at, true)}
                        </span>
                      </td>
                      <td>
                        <span className="block font-bold text-slate-800">{order.customer_name}</span>
                        <span className="mt-1 block text-xs text-slate-500">
                          {order.customer_phone}
                        </span>
                      </td>
                      <td>
                        <StatusBadge status={order.status} />
                      </td>
                      <td>
                        <StatusBadge status={order.payment_status} />
                      </td>
                      <td className="text-right font-extrabold text-slate-950">
                        {formatMoney(order.total_minor)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              title="No orders yet"
              description="New storefront orders will appear here as soon as checkout completes."
              icon={<PackageCheck className="size-5" />}
            />
          )}
        </Panel>

        <Panel>
          <PanelHeader title="Today’s focus" description="Operational queues worth checking first." />
          <div className="grid gap-3 p-4">
            {[
              {
                href: "/orders?status=pending_payment",
                label: "Pending payments",
                description: "Confirm or follow up payment attempts.",
                tone: "bg-amber-100 text-amber-800",
                icon: IndianRupee,
              },
              {
                href: "/inventory?stock=low",
                label: "Low-stock items",
                description: `${metrics.lowStockCount} variant${metrics.lowStockCount === 1 ? "" : "s"} at threshold.`,
                tone: "bg-rose-100 text-rose-700",
                icon: AlertTriangle,
              },
              {
                href: "/returns?status=requested",
                label: "Return requests",
                description: `${metrics.pendingReturns} request${metrics.pendingReturns === 1 ? "" : "s"} awaiting review.`,
                tone: "bg-violet-100 text-violet-700",
                icon: RotateCcw,
              },
            ].map(({ href, label, description, tone, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className="group flex items-center gap-3 rounded-2xl border border-slate-100 p-3.5 transition hover:border-slate-200 hover:bg-slate-50"
              >
                <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${tone}`}>
                  <Icon className="size-4.5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-extrabold text-slate-900">{label}</span>
                  <span className="mt-0.5 block text-xs leading-5 text-slate-500">
                    {description}
                  </span>
                </span>
                <ArrowUpRight className="size-4 text-slate-300 transition group-hover:text-amber-600" />
              </Link>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}
