import { ArrowRight, PackageCheck, Search } from "lucide-react";
import Link from "next/link";

import { FlashMessage } from "@/components/ui/flash-message";
import { inputClassName } from "@/components/ui/form-controls";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState, Panel } from "@/components/ui/panel";
import { StatusBadge } from "@/components/ui/status-badge";
import { getOrders } from "@/lib/data/admin-queries";
import { formatDate, formatMoney } from "@/lib/utils";

const orderStatuses = [
  "pending_payment",
  "payment_review",
  "confirmed",
  "processing",
  "packed",
  "shipped",
  "out_for_delivery",
  "delivered",
  "cancelled",
  "failed",
  "returned",
  "completed",
];

const paymentStatuses = [
  "unpaid",
  "pending",
  "cod_pending",
  "paid",
  "partially_refunded",
  "refunded",
  "failed",
  "cancelled",
];

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    status?: string;
    payment?: string;
    success?: string;
    error?: string;
  }>;
}) {
  const params = await searchParams;
  const orders = await getOrders({
    q: params.q,
    status: params.status,
    paymentStatus: params.payment,
  });

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Fulfilment"
        title="Orders"
        description="Move valid orders through fulfilment, review payments, and preserve a complete status history."
      />
      <FlashMessage success={params.success} error={params.error} />

      <Panel>
        <form
          className="grid gap-3 border-b border-slate-100 p-4 md:grid-cols-[minmax(15rem,1fr)_13rem_13rem_auto]"
          method="get"
        >
          <label className="relative">
            <span className="sr-only">Search orders</span>
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              className={`${inputClassName} pl-10`}
              type="search"
              name="q"
              defaultValue={params.q}
              placeholder="Order number…"
            />
          </label>
          <select className={inputClassName} name="status" defaultValue={params.status ?? ""}>
            <option value="">All order statuses</option>
            {orderStatuses.map((status) => (
              <option key={status} value={status}>
                {status.replaceAll("_", " ")}
              </option>
            ))}
          </select>
          <select className={inputClassName} name="payment" defaultValue={params.payment ?? ""}>
            <option value="">All payment statuses</option>
            {paymentStatuses.map((status) => (
              <option key={status} value={status}>
                {status.replaceAll("_", " ")}
              </option>
            ))}
          </select>
          <button className="min-h-11 rounded-xl bg-slate-950 px-5 text-sm font-bold text-white hover:bg-slate-800">
            Filter
          </button>
        </form>

        {orders.length ? (
          <div className="overflow-x-auto">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Customer</th>
                  <th>Order status</th>
                  <th>Payment</th>
                  <th>Fulfilment</th>
                  <th className="text-right">Total</th>
                  <th aria-label="Open order" />
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
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
                      <span className="block font-bold text-slate-900">{order.customer_name}</span>
                      <span className="mt-1 block text-xs text-slate-500">
                        {order.customer_email || order.customer_phone}
                      </span>
                    </td>
                    <td>
                      <StatusBadge status={order.status} />
                    </td>
                    <td>
                      <div className="grid justify-items-start gap-1.5">
                        <StatusBadge status={order.payment_status} />
                        <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                          {order.payment_method.replaceAll("_", " ")}
                        </span>
                      </div>
                    </td>
                    <td>
                      <StatusBadge status={order.fulfillment_status} />
                    </td>
                    <td className="text-right font-extrabold text-slate-950">
                      {formatMoney(order.total_minor)}
                    </td>
                    <td>
                      <Link
                        href={`/orders/${order.id}`}
                        aria-label={`Open ${order.order_number}`}
                        className="grid size-9 place-items-center rounded-xl border border-slate-200 text-slate-500 transition hover:border-amber-300 hover:bg-amber-50 hover:text-amber-800"
                      >
                        <ArrowRight className="size-4" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="No matching orders"
            description="Try removing one of the filters or search by another order number."
            icon={<PackageCheck className="size-5" />}
          />
        )}
      </Panel>
    </div>
  );
}
