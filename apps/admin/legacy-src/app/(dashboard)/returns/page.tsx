import { randomUUID } from "node:crypto";
import { CircleDollarSign, RotateCcw } from "lucide-react";
import Link from "next/link";

import { FlashMessage } from "@/components/ui/flash-message";
import { Field, inputClassName, textareaClassName } from "@/components/ui/form-controls";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState, InlineNotice, Panel, PanelHeader } from "@/components/ui/panel";
import { StatusBadge } from "@/components/ui/status-badge";
import { SubmitButton } from "@/components/ui/submit-button";
import {
  requestRefundAction,
  transitionReturnAction,
} from "@/lib/actions/workflows";
import { hasAnyRole, requirePermission } from "@/lib/auth/admin";
import {
  getRefundableOrders,
  getReturnsAndRefunds,
} from "@/lib/data/admin-queries";
import { allowedReturnTransitions } from "@/lib/workflows";
import { formatDate, formatMoney } from "@/lib/utils";

export default async function ReturnsPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; error?: string }>;
}) {
  const [params, data, refundableOrders, admin] = await Promise.all([
    searchParams,
    getReturnsAndRefunds(),
    getRefundableOrders(),
    requirePermission("orders"),
  ]);
  const canManageOrders = hasAnyRole(admin, ["order_manager", "admin", "super_admin"]);

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="After-sales"
        title="Returns and refunds"
        description="Review returns with optimistic status guards and queue refunds against captured payments."
      />
      <FlashMessage success={params.success} error={params.error} />
      <InlineNotice tone="warning">
        A refund request remains pending until the payment provider confirms it. Never treat a
        queued refund as completed.
      </InlineNotice>

      {canManageOrders ? (
        <Panel>
          <details>
          <summary className="flex cursor-pointer list-none items-center gap-2 p-5 text-sm font-extrabold text-amber-700 hover:bg-amber-50">
            <CircleDollarSign className="size-4" />
            Queue a refund
          </summary>
          <form
            action={requestRefundAction}
            className="grid gap-4 border-t border-slate-100 bg-slate-50/50 p-5 md:grid-cols-2"
          >
            <input
              type="hidden"
              name="idempotency_key"
              value={randomUUID()}
            />
            <Field label="Paid order">
              <select className={inputClassName} name="order_id" required defaultValue="">
                <option value="" disabled>
                  Choose an order
                </option>
                {refundableOrders.map((order) => (
                  <option key={order.id} value={order.id}>
                    {order.order_number} — {order.customer_name} —{" "}
                    {formatMoney(Number(order.paid_minor) - Number(order.refunded_minor))}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Refund amount (₹)">
              <input
                className={inputClassName}
                type="number"
                name="amount"
                min={0.01}
                step="0.01"
                required
              />
            </Field>
            <Field label="Reason" className="md:col-span-2">
              <textarea
                className={textareaClassName}
                name="reason"
                required
                minLength={3}
                maxLength={1000}
              />
            </Field>
            <div className="flex justify-end md:col-span-2">
              <SubmitButton pendingLabel="Queuing refund…">Queue refund</SubmitButton>
            </div>
          </form>
          </details>
        </Panel>
      ) : null}

      <Panel>
        <PanelHeader
          title="Return requests"
          description={`${data.returns.length} request${data.returns.length === 1 ? "" : "s"}.`}
        />
        {data.returns.length ? (
          <div className="divide-y divide-slate-100">
            {data.returns.map((item) => {
              const transitions = canManageOrders
                ? allowedReturnTransitions(item.status)
                : [];
              return (
                <details key={item.id}>
                  <summary className="grid cursor-pointer list-none gap-3 p-5 hover:bg-slate-50 md:grid-cols-[1fr_1fr_auto] md:items-center">
                    <span>
                      <Link
                        href={`/orders/${item.order_id}`}
                        className="font-extrabold text-slate-950 hover:text-amber-700"
                      >
                        {item.orderNumber}
                      </Link>
                      <span className="mt-1 block text-xs text-slate-500">
                        {item.customerName} · {formatDate(item.created_at, true)}
                      </span>
                    </span>
                    <span className="text-sm text-slate-600">{item.reason}</span>
                    <StatusBadge status={item.status} />
                  </summary>
                  <div className="border-t border-slate-100 bg-slate-50/60 p-5">
                    {item.customer_note ? (
                      <p className="mb-4 text-sm text-slate-600">{item.customer_note}</p>
                    ) : null}
                    {transitions.length ? (
                      <form action={transitionReturnAction} className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
                        <input type="hidden" name="return_id" value={item.id} />
                        <input type="hidden" name="from_status" value={item.status} />
                        <Field label="Next status">
                          <select className={inputClassName} name="to_status">
                            {transitions.map((status) => (
                              <option key={status} value={status}>
                                {status.replaceAll("_", " ")}
                              </option>
                            ))}
                          </select>
                        </Field>
                        <Field label="Internal note" hint="Required when rejecting.">
                          <input
                            className={inputClassName}
                            name="internal_note"
                            maxLength={1000}
                            defaultValue={item.internal_note ?? ""}
                          />
                        </Field>
                        <div className="flex items-end">
                          <SubmitButton pendingLabel="Updating…">Update return</SubmitButton>
                        </div>
                      </form>
                    ) : (
                      <p className="text-sm text-slate-500">No further manual transition is available.</p>
                    )}
                  </div>
                </details>
              );
            })}
          </div>
        ) : (
          <EmptyState
            title="No return requests"
            description="Customer return requests will appear here."
            icon={<RotateCcw className="size-5" />}
          />
        )}
      </Panel>

      <Panel>
        <PanelHeader title="Refund ledger" description="Provider refund lifecycle." />
        {data.refunds.length ? (
          <div className="overflow-x-auto">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Status</th>
                  <th>Reason</th>
                  <th className="text-right">Amount</th>
                  <th>Requested</th>
                </tr>
              </thead>
              <tbody>
                {data.refunds.map((refund) => (
                  <tr key={refund.id}>
                    <td>
                      <Link
                        href={`/orders/${refund.order_id}`}
                        className="font-extrabold text-slate-950 hover:text-amber-700"
                      >
                        {refund.orderNumber}
                      </Link>
                    </td>
                    <td>
                      <StatusBadge status={refund.status} />
                    </td>
                    <td className="max-w-sm">{refund.reason}</td>
                    <td className="text-right font-extrabold text-slate-950">
                      {formatMoney(refund.amount_minor)}
                    </td>
                    <td className="text-xs text-slate-500">
                      {formatDate(refund.created_at, true)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="No refunds"
            description="Queued and provider-confirmed refunds will appear here."
            icon={<CircleDollarSign className="size-5" />}
          />
        )}
      </Panel>
    </div>
  );
}
