import { Button, Card, CardContent, CardHeader, CardTitle } from "@babascamera/ui";
import { Download } from "lucide-react";
import { notFound } from "next/navigation";

import { OrderTransitionForm, RefundForm } from "@/components/order-actions";
import { OrderItemTable } from "@/components/order-item-table";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { getOrder } from "@/lib/data";
import { formatMoney } from "@/lib/money";
import { ORDER_TRANSITIONS } from "@/lib/order-transitions";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const order = await getOrder(id);
  if (!order) notFound();
  const address = order.shippingAddressSnapshot;
  const canRefund =
    order.paymentMethod === "razorpay" &&
    order.paymentStatus === "paid" &&
    Boolean(order.razorpayPaymentId);
  return (
    <>
      <PageHeader title={order.orderNumber} description={`Placed ${formatDate(order.createdAt, true)} by ${order.customerName ?? order.customerEmail}.`} />
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge status={order.status} /><StatusBadge status={order.paymentStatus} /><StatusBadge status={order.paymentMethod} />
        <Button asChild variant="outline" className="ml-auto"><a href={`/api/orders/${order.id}/invoice`}><Download className="size-4" /> Download PDF invoice</a></Button>
      </div>
      <div className="grid gap-6 xl:grid-cols-[1fr_24rem]">
        <div className="grid gap-6">
          <Card>
            <CardHeader><CardTitle>Items</CardTitle></CardHeader>
            <CardContent>
              <OrderItemTable data={order.items} />
              <dl className="ml-auto mt-5 grid max-w-sm grid-cols-2 gap-2 text-sm">
                <dt>Subtotal</dt><dd className="text-right">{formatMoney(order.subtotal)}</dd>
                <dt>Discount</dt><dd className="text-right">− {formatMoney(order.discount)}</dd>
                <dt>Shipping</dt><dd className="text-right">{formatMoney(order.shippingCharge)}</dd>
                <dt className="font-black">Total</dt><dd className="text-right font-black">{formatMoney(order.total)}</dd>
              </dl>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Status timeline</CardTitle></CardHeader>
            <CardContent className="grid gap-5">
              {order.statusHistory.map((entry) => (
                <div key={entry.id} className="relative border-l-2 border-slate-200 pl-5">
                  <span className="absolute -left-[7px] top-1 size-3 rounded-full bg-amber-400" />
                  <div className="flex flex-wrap items-center gap-2"><StatusBadge status={entry.toStatus} /><span className="text-xs text-slate-500">{formatDate(entry.createdAt, true)}</span></div>
                  <p className="mt-1 text-sm">{entry.note ?? `Changed from ${entry.fromStatus ?? "created"}.`}</p>
                  <p className="text-xs text-slate-500">by {entry.actorName}</p>
                </div>
              ))}
              {!order.statusHistory.length ? <p className="text-sm text-slate-500">No status changes recorded yet.</p> : null}
            </CardContent>
          </Card>
          {order.refunds.length ? <Card><CardHeader><CardTitle>Refunds</CardTitle></CardHeader><CardContent>{order.refunds.map((refund) => <div key={refund.id} className="flex flex-wrap items-center gap-3 border-b py-3"><StatusBadge status={refund.status} /><b>{formatMoney(refund.amount)}</b><span className="text-xs text-slate-500">{refund.providerRefundId ?? "Awaiting provider ID"}</span></div>)}</CardContent></Card> : null}
        </div>
        <aside className="grid content-start gap-6">
          <Card><CardHeader><CardTitle>Customer and delivery</CardTitle></CardHeader><CardContent className="grid gap-4 text-sm">
            <div><b>{order.customerName ?? address.fullName}</b><p>{order.customerEmail}</p><p>{order.customerPhone ?? address.phone}</p></div>
            <address className="not-italic text-slate-600">{address.line1}{address.line2 ? <><br />{address.line2}</> : null}<br />{address.city}, {address.state} {address.pincode}<br />{address.country}</address>
            {order.trackingNumber ? <div><b>{order.carrier}</b><p>{order.trackingNumber}</p>{order.trackingUrl ? <a className="text-sky-700 underline" href={order.trackingUrl} target="_blank" rel="noreferrer">Open tracking</a> : null}</div> : null}
          </CardContent></Card>
          <Card><CardHeader><CardTitle>Advance fulfilment</CardTitle></CardHeader><CardContent><OrderTransitionForm orderId={order.id} currentStatus={order.status} allowed={ORDER_TRANSITIONS[order.status]} /></CardContent></Card>
          {canRefund ? <Card className="border-rose-200"><CardHeader><CardTitle>Razorpay refund</CardTitle></CardHeader><CardContent><RefundForm orderId={order.id} /></CardContent></Card> : null}
        </aside>
      </div>
    </>
  );
}
