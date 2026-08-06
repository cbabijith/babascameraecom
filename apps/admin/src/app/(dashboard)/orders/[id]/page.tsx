import { Button, Card, CardContent, CardHeader, CardTitle } from "@babascamera/ui";
import { Download, ExternalLink, FileText } from "lucide-react";
import { notFound } from "next/navigation";

import { OrderTransitionForm, PaymentStatusForm, RefundForm } from "@/components/order-actions";
import { OrderItemTable } from "@/components/order-item-table";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { getOrder } from "@/lib/data";
import { formatMoney } from "@/lib/money";
import { ORDER_TRANSITIONS } from "@/lib/order-transitions";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

function extractStoragePath(url: string): string {
  const marker = `/bank-transfer-proof-bucket/`;
  const idx = url.indexOf(marker);
  if (idx !== -1) {
    const rawPath = url.slice(idx + marker.length);
    return decodeURIComponent(rawPath.split("?")[0] || "");
  }
  if (url.startsWith("http://") || url.startsWith("https://")) {
    try {
      const parsed = new URL(url);
      const segments = parsed.pathname.split("/");
      const bucketIdx = segments.indexOf("bank-transfer-proof-bucket");
      if (bucketIdx !== -1 && bucketIdx < segments.length - 1) {
        return decodeURIComponent(segments.slice(bucketIdx + 1).join("/"));
      }
    } catch {
      // Fallback
    }
  }
  return url;
}

function parseBankTransferNotes(notes: string | null | undefined) {
  if (!notes) return null;

  let referenceNumber: string | null = null;
  let accountName: string | null = null;
  let proofUrl: string | null = null;

  const parts = notes.split("|").map((p) => p.trim());
  for (const part of parts) {
    if (part.toLowerCase().startsWith("bank transfer ref:")) {
      referenceNumber = part.substring("bank transfer ref:".length).trim();
    } else if (part.toLowerCase().startsWith("account:")) {
      accountName = part.substring("account:".length).trim();
    } else if (part.toLowerCase().startsWith("proof:")) {
      proofUrl = part.substring("proof:".length).trim();
    }
  }

  if (!referenceNumber && !accountName && !proofUrl) {
    return null;
  }

  return {
    raw: notes,
    referenceNumber,
    accountName,
    proofUrl,
  };
}

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const order = await getOrder(id);
  if (!order) notFound();
  const address = order.shippingAddressSnapshot;
  const canRefund =
    order.paymentMethod === "razorpay" &&
    order.paymentStatus === "paid" &&
    Boolean(order.razorpayPaymentId);

  const bankDetails = parseBankTransferNotes(order.notes);

  let displayProofUrl = bankDetails?.proofUrl ?? null;
  if (bankDetails?.proofUrl) {
    try {
      const relativePath = extractStoragePath(bankDetails.proofUrl);
      const supabase = await createClient();
      const { data: signedData } = await supabase.storage
        .from("bank-transfer-proof-bucket")
        .createSignedUrl(relativePath, 3600);

      if (signedData?.signedUrl) {
        displayProofUrl = signedData.signedUrl;
      }
    } catch (err) {
      console.warn("Could not generate signed URL for bank proof attachment:", err);
    }
  }
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

          {bankDetails ? (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center justify-between text-sky-950">
                  <span>Bank Transfer Details</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 text-sm">
                {bankDetails.referenceNumber ? (
                  <div>
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Reference / UTR Number</span>
                    <span className="font-mono text-slate-900 font-bold text-base">{bankDetails.referenceNumber}</span>
                  </div>
                ) : null}
                {bankDetails.accountName ? (
                  <div>
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Target Bank Account</span>
                    <span className="text-slate-800 font-medium">{bankDetails.accountName}</span>
                  </div>
                ) : null}
                {displayProofUrl ? (
                  <div>
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Payment Proof File</span>
                    {displayProofUrl.toLowerCase().includes(".pdf") ? (
                      <a
                        href={displayProofUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-xs font-semibold text-sky-700 border border-sky-200 hover:bg-sky-100 transition-colors shadow-xs"
                      >
                        <FileText className="size-4 text-sky-600" /> Open PDF Proof Document
                      </a>
                    ) : (
                      <div className="space-y-2">
                        <a
                          href={displayProofUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="group relative block overflow-hidden rounded-lg border border-sky-200 bg-white max-w-[260px] shadow-xs"
                        >
                          <img
                            src={displayProofUrl}
                            alt="Payment proof attachment"
                            className="h-36 w-full object-cover transition-transform group-hover:scale-105"
                          />
                          <span className="absolute bottom-1 right-1 rounded bg-slate-900/80 px-2 py-0.5 text-[10px] font-medium text-white backdrop-blur-xs">
                            Click to enlarge
                          </span>
                        </a>
                        <a
                          href={displayProofUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs text-sky-700 hover:underline font-semibold"
                        >
                          <ExternalLink className="size-3.5" /> View original attachment
                        </a>
                      </div>
                    )}
                  </div>
                ) : null}
              </CardContent>
            </Card>
          ) : order.notes ? (
            <Card className="border-amber-200 bg-amber-50/40">
              <CardHeader className="pb-2"><CardTitle className="text-base text-amber-950">Order Notes</CardTitle></CardHeader>
              <CardContent><p className="text-sm whitespace-pre-wrap text-amber-900">{order.notes}</p></CardContent>
            </Card>
          ) : null}

          {order.status === "cancelled" ?
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center justify-between">
                  <span>Payment status adjustment</span>
                  {order.status === "cancelled" ? <span className="text-xs font-semibold px-2 py-0.5 rounded bg-amber-100 text-amber-800">Cancelled Order</span> : null}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <PaymentStatusForm orderId={order.id} currentPaymentStatus={order.paymentStatus} isCancelled={order.status === "cancelled"} />
              </CardContent>
            </Card>
            : null}
          <Card><CardHeader><CardTitle>Advance fulfilment</CardTitle></CardHeader><CardContent><OrderTransitionForm orderId={order.id} currentStatus={order.status} allowed={ORDER_TRANSITIONS[order.status]} /></CardContent></Card>
          {canRefund ? <Card className="border-rose-200"><CardHeader><CardTitle>Razorpay refund</CardTitle></CardHeader><CardContent><RefundForm orderId={order.id} /></CardContent></Card> : null}
        </aside>
      </div>
    </>
  );
}
