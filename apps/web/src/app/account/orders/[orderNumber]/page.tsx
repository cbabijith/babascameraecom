import { notFound } from "next/navigation";
import { Card, CardContent } from "@babascamera/ui";
import { requireUser } from "@/lib/auth/session";
import { getOrderForUser } from "@/lib/commerce/checkout";
import { formatDate, formatMoney, titleCase } from "@/lib/format";

export const metadata = { title: "Order details" };
export const dynamic = "force-dynamic";

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ orderNumber: string }>;
}) {
  const { orderNumber } = await params;
  const user = await requireUser(`/account/orders/${orderNumber}`);
  const result = await getOrderForUser(user.id, orderNumber);
  if (!result) notFound();
  const address = result.order.shippingAddressSnapshot;

  return (
    <section>
      <p className="text-sm font-semibold text-[#E94560]">Order details</p>
      <h1 className="mt-1 font-mono text-3xl font-bold">
        {result.order.orderNumber}
      </h1>
      <p className="mt-2 text-slate-500">
        Placed {formatDate(result.order.createdAt)}
      </p>

      <div className="mt-7 grid gap-5 xl:grid-cols-[1fr_20rem]">
        <Card>
          <CardContent className="p-6">
            <h2 className="text-xl font-bold">Items</h2>
            <div className="mt-5 divide-y divide-slate-200">
              {result.items.map((item) => (
                <div
                  key={item.id}
                  className="grid gap-2 py-4 sm:grid-cols-[1fr_auto]"
                >
                  <div>
                    <p className="font-semibold">{item.productName}</p>
                    <p className="mt-1 font-mono text-xs text-slate-500">
                      SKU {item.sku}
                    </p>
                    {item.variantLabel ? (
                      <p className="mt-1 text-sm text-slate-500">
                        {item.variantLabel}
                      </p>
                    ) : null}
                    <p className="mt-1 text-sm text-slate-500">
                      {formatMoney(item.unitPrice)} × {item.quantity}
                    </p>
                  </div>
                  <p className="font-mono font-semibold">
                    {formatMoney(item.total)}
                  </p>
                </div>
              ))}
            </div>
            <dl className="ml-auto mt-5 max-w-xs space-y-2 border-t border-slate-200 pt-5 text-sm">
              <div className="flex justify-between">
                <dt>Subtotal</dt>
                <dd className="font-mono">
                  {formatMoney(result.order.subtotal)}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt>Discount</dt>
                <dd className="font-mono">
                  −{formatMoney(result.order.discount)}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt>Shipping</dt>
                <dd className="font-mono">
                  {formatMoney(result.order.shippingCharge)}
                </dd>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-3 text-base font-bold">
                <dt>Total</dt>
                <dd className="font-mono">
                  {formatMoney(result.order.total)}
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <div className="space-y-5">
          <Card>
            <CardContent className="p-5">
              <h2 className="font-bold">Status</h2>
              <dl className="mt-4 space-y-3 text-sm">
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-500">Order</dt>
                  <dd>{titleCase(result.order.status)}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-500">Payment</dt>
                  <dd>{titleCase(result.order.paymentStatus)}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-500">Method</dt>
                  <dd>
                    {result.order.paymentMethod === "cod"
                      ? "Cash on delivery"
                      : "Razorpay"}
                  </dd>
                </div>
                {result.order.trackingNumber ? (
                  <div className="border-t border-slate-200 pt-3">
                    <dt className="text-slate-500">
                      Tracking
                      {result.order.carrier
                        ? ` · ${result.order.carrier}`
                        : ""}
                    </dt>
                    <dd className="mt-1 font-mono">
                      {result.order.trackingUrl ? (
                        <a
                          href={result.order.trackingUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[#E94560] underline"
                        >
                          {result.order.trackingNumber}
                        </a>
                      ) : (
                        result.order.trackingNumber
                      )}
                    </dd>
                  </div>
                ) : null}
                {result.order.shippedAt ? (
                  <div className="flex justify-between gap-3">
                    <dt className="text-slate-500">Shipped</dt>
                    <dd>{formatDate(result.order.shippedAt)}</dd>
                  </div>
                ) : null}
                {result.order.deliveredAt ? (
                  <div className="flex justify-between gap-3">
                    <dt className="text-slate-500">Delivered</dt>
                    <dd>{formatDate(result.order.deliveredAt)}</dd>
                  </div>
                ) : null}
              </dl>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <h2 className="font-bold">Deliver to</h2>
              <address className="mt-3 text-sm not-italic leading-6 text-slate-600">
                <strong className="text-slate-900">{address.fullName}</strong>
                <br />
                {address.phone}
                <br />
                {address.line1}
                {address.line2 ? `, ${address.line2}` : ""}
                <br />
                {address.city}, {address.state} {address.pincode}
                <br />
                {address.country}
              </address>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <h2 className="font-bold">Order timeline</h2>
              <ol className="mt-4 space-y-4">
                {result.history.map((entry) => (
                  <li
                    key={entry.id}
                    className="border-l-2 border-rose-200 pl-4 text-sm"
                  >
                    <p className="font-semibold">
                      {titleCase(entry.toStatus)}
                    </p>
                    <p className="text-slate-500">
                      {formatDate(entry.createdAt)}
                    </p>
                    {entry.note ? (
                      <p className="mt-1 text-slate-600">{entry.note}</p>
                    ) : null}
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
