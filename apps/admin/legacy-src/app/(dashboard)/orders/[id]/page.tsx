import { ArrowLeft, CreditCard, MapPin, PackageCheck, UserRound } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { FlashMessage } from "@/components/ui/flash-message";
import { Field, inputClassName, textareaClassName } from "@/components/ui/form-controls";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState, Panel, PanelHeader } from "@/components/ui/panel";
import { StatusBadge } from "@/components/ui/status-badge";
import { SubmitButton } from "@/components/ui/submit-button";
import {
  cancelOrderAction,
  transitionOrderAction,
} from "@/lib/actions/workflows";
import { hasAnyRole, requirePermission } from "@/lib/auth/admin";
import { getOrderDetail } from "@/lib/data/admin-queries";
import { allowedOrderTransitions, canCancelOrder } from "@/lib/workflows";
import { compactId, formatDate, formatMoney } from "@/lib/utils";

function AddressBlock({ value }: { value: Record<string, unknown> }) {
  const lines = [
    value.recipient_name ?? value.name,
    value.building,
    value.line1,
    value.line2,
    value.landmark,
    [value.city, value.state, value.postal_code ?? value.postalCode].filter(Boolean).join(", "),
    value.country,
    value.phone,
  ].filter(Boolean);

  return (
    <address className="mt-3 not-italic text-sm leading-6 text-slate-600">
      {lines.map((line, index) => (
        <span key={`${String(line)}-${index}`} className="block">
          {String(line)}
        </span>
      ))}
    </address>
  );
}

export default async function OrderDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ success?: string; error?: string }>;
}) {
  const [{ id }, query, admin] = await Promise.all([
    params,
    searchParams,
    requirePermission("orders"),
  ]);
  const order = await getOrderDetail(id);
  if (!order) notFound();
  const canManageOrders = hasAnyRole(admin, ["order_manager", "admin", "super_admin"]);
  const transitions = canManageOrders ? allowedOrderTransitions(order.status) : [];

  return (
    <div className="grid gap-6">
      <Link
        href="/orders"
        className="inline-flex w-fit items-center gap-2 text-sm font-bold text-slate-600 hover:text-slate-950"
      >
        <ArrowLeft className="size-4" />
        Back to orders
      </Link>
      <PageHeader
        eyebrow={`Placed ${formatDate(order.created_at, true)}`}
        title={order.order_number}
        description={`Internal ID ${compactId(order.id)} · ${order.items.length} line item${order.items.length === 1 ? "" : "s"}`}
        action={
          <div className="flex flex-wrap gap-2">
            <StatusBadge status={order.status} />
            <StatusBadge status={order.payment_status} />
          </div>
        }
      />
      <FlashMessage success={query.success} error={query.error} />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(22rem,0.55fr)]">
        <div className="grid content-start gap-6">
          <Panel>
            <PanelHeader title="Items" description="Immutable snapshots captured at checkout." />
            <div className="divide-y divide-slate-100">
              {order.items.map((item) => (
                <div key={item.id} className="flex items-start gap-4 p-5">
                  <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-slate-100 text-sm font-black text-slate-600">
                    {item.quantity}×
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-extrabold text-slate-950">{item.product_name}</p>
                    <p className="mt-1 text-xs font-medium text-slate-500">
                      SKU {item.sku}
                      {item.brand_name ? ` · ${item.brand_name}` : ""}
                    </p>
                    {Object.keys(item.option_values || {}).length ? (
                      <p className="mt-2 text-xs text-slate-500">
                        {Object.entries(item.option_values)
                          .map(([key, value]) => `${key}: ${String(value)}`)
                          .join(" · ")}
                      </p>
                    ) : null}
                  </div>
                  <div className="text-right">
                    <p className="font-extrabold text-slate-950">
                      {formatMoney(item.line_total_minor)}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {formatMoney(item.unit_price_minor)} each
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Panel>

          <Panel>
            <PanelHeader title="Status history" description="Every operational transition and actor." />
            {order.statusHistory.length ? (
              <ol className="divide-y divide-slate-100">
                {order.statusHistory.map((event) => (
                  <li key={event.id} className="flex gap-4 p-5">
                    <span className="mt-1 size-2.5 shrink-0 rounded-full bg-amber-400 ring-4 ring-amber-100" />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {event.from_status ? <StatusBadge status={event.from_status} /> : null}
                        {event.from_status ? <span className="text-slate-300">→</span> : null}
                        <StatusBadge status={event.to_status} />
                      </div>
                      {event.reason ? (
                        <p className="mt-2 text-sm leading-6 text-slate-600">{event.reason}</p>
                      ) : null}
                      <p className="mt-2 text-xs text-slate-400">
                        {formatDate(event.created_at, true)}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <EmptyState
                title="No transitions recorded"
                description="Status changes made through the admin will be recorded here."
                icon={<PackageCheck className="size-5" />}
              />
            )}
          </Panel>
        </div>

        <aside className="grid content-start gap-6">
          {transitions.length ? (
            <Panel>
              <PanelHeader
                title="Advance order"
                description="Only valid workflow transitions are available."
              />
              <form action={transitionOrderAction} className="grid gap-4 p-5">
                <input type="hidden" name="order_id" value={order.id} />
                <input type="hidden" name="from_status" value={order.status} />
                <Field label="Next status">
                  <select className={inputClassName} name="to_status" required defaultValue="">
                    <option value="" disabled>
                      Choose next status
                    </option>
                    {transitions.map((status) => (
                      <option key={status} value={status}>
                        {status.replaceAll("_", " ")}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Reason or note" hint="Required when cancelling or failing an order.">
                  <textarea
                    className={textareaClassName}
                    name="reason"
                    placeholder="Add an operational note…"
                    maxLength={1000}
                  />
                </Field>
                <SubmitButton pendingLabel="Updating order…">Update status</SubmitButton>
              </form>
            </Panel>
          ) : null}

          {canManageOrders && canCancelOrder(order.status) ? (
            <Panel>
              <PanelHeader
                title="Cancel order"
                description="This releases reservations or restocks captured inventory. Paid orders still require a refund."
              />
              <form action={cancelOrderAction} className="grid gap-4 p-5">
                <input type="hidden" name="order_id" value={order.id} />
                <input type="hidden" name="from_status" value={order.status} />
                <Field label="Cancellation reason">
                  <textarea
                    className={textareaClassName}
                    name="reason"
                    required
                    minLength={3}
                    maxLength={1000}
                    placeholder="Why is this order being cancelled?"
                  />
                </Field>
                <SubmitButton variant="danger" pendingLabel="Cancelling order…">
                  Cancel order
                </SubmitButton>
              </form>
            </Panel>
          ) : null}

          <Panel>
            <PanelHeader title="Order total" />
            <dl className="grid gap-3 p-5 text-sm">
              {[
                ["Items", order.items_subtotal_minor],
                ["Discount", -order.discount_minor],
                ["Shipping", order.shipping_minor],
                ["Tax", order.tax_minor],
                ["Gateway fee", order.gateway_fee_minor],
              ].map(([label, value]) => (
                <div key={String(label)} className="flex justify-between gap-4 text-slate-600">
                  <dt>{label}</dt>
                  <dd className="font-bold text-slate-800">{formatMoney(Number(value))}</dd>
                </div>
              ))}
              <div className="mt-2 flex justify-between gap-4 border-t border-slate-200 pt-4">
                <dt className="font-extrabold text-slate-950">Total</dt>
                <dd className="text-lg font-black text-slate-950">{formatMoney(order.total_minor)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Paid</dt>
                <dd className="font-bold text-emerald-700">{formatMoney(order.paid_minor)}</dd>
              </div>
              {order.refunded_minor ? (
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-500">Refunded</dt>
                  <dd className="font-bold text-rose-700">{formatMoney(order.refunded_minor)}</dd>
                </div>
              ) : null}
            </dl>
          </Panel>

          <Panel>
            <PanelHeader title="Customer" />
            <div className="p-5">
              <UserRound className="size-5 text-amber-600" />
              <p className="mt-3 font-extrabold text-slate-950">{order.customer_name}</p>
              <p className="mt-1 text-sm text-slate-600">{order.customer_email || "No email"}</p>
              <p className="mt-1 text-sm text-slate-600">{order.customer_phone}</p>
            </div>
          </Panel>

          <Panel>
            <PanelHeader title="Shipping address" />
            <div className="p-5">
              <MapPin className="size-5 text-amber-600" />
              <AddressBlock value={order.shipping_address} />
            </div>
          </Panel>

          <Panel>
            <PanelHeader title="Payment attempts" />
            {order.paymentAttempts.length ? (
              <div className="divide-y divide-slate-100">
                {order.paymentAttempts.map((payment) => (
                  <div key={payment.id} className="p-5">
                    <div className="flex items-center justify-between gap-3">
                      <span className="inline-flex items-center gap-2 text-sm font-extrabold text-slate-900">
                        <CreditCard className="size-4 text-amber-600" />
                        {payment.provider.replaceAll("_", " ")}
                      </span>
                      <StatusBadge status={payment.status} />
                    </div>
                    <p className="mt-2 text-xs text-slate-500">
                      {payment.provider_payment_id || payment.provider_order_id || compactId(payment.id)}
                    </p>
                    {payment.failure_description ? (
                      <p className="mt-2 text-xs leading-5 text-rose-600">
                        {payment.failure_description}
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                title="No payment attempts"
                description="This order has no linked payment records."
                icon={<CreditCard className="size-5" />}
              />
            )}
          </Panel>
        </aside>
      </div>
    </div>
  );
}
