import Link from "next/link";
import { Package } from "lucide-react";
import { Card, CardContent } from "@babascamera/ui";
import { requireUser } from "@/lib/auth/session";
import { listOrdersForUser } from "@/lib/commerce/checkout";
import { formatDate, formatMoney, titleCase } from "@/lib/format";

export const metadata = { title: "Your orders" };
export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  const user = await requireUser("/account/orders");
  const orders = await listOrdersForUser(user.id);
  return (
    <section>
      <h1 className="text-3xl font-bold">Your orders</h1>
      <p className="mt-2 text-slate-600">
        Review payment and delivery progress.
      </p>
      {!orders.length ? (
        <div className="mt-8 rounded-2xl border border-dashed border-slate-300 p-12 text-center">
          <Package className="mx-auto h-10 w-10 text-slate-300" />
          <p className="mt-3 font-semibold">No orders yet</p>
          <Link
            href="/products"
            className="mt-2 inline-block text-sm font-semibold text-[#E94560]"
          >
            Browse products
          </Link>
        </div>
      ) : (
        <div className="mt-7 space-y-4">
          {orders.map((order) => (
            <Link
              key={order.id}
              href={`/account/orders/${encodeURIComponent(order.orderNumber)}`}
              className="block"
            >
              <Card className="transition hover:border-[#E94560] hover:shadow-sm">
                <CardContent className="grid gap-4 p-5 sm:grid-cols-[1fr_auto_auto] sm:items-center">
                  <div>
                    <p className="font-mono font-semibold">
                      {order.orderNumber}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      {formatDate(order.createdAt)}
                    </p>
                  </div>
                  <div className="text-sm">
                    <p className="font-medium">{titleCase(order.status)}</p>
                    <p className="text-slate-500">
                      {titleCase(order.paymentStatus)} ·{" "}
                      {order.paymentMethod === "cod"
                        ? "Cash on delivery"
                        : "Razorpay"}
                    </p>
                  </div>
                  <p className="font-mono font-bold">
                    {formatMoney(order.total)}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
