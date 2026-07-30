import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, RotateCcw } from "lucide-react";
import { Button, Card, CardContent } from "@babascamera/ui";
import { getCartOwner } from "@/lib/cart-session";
import { getOrderForOwner } from "@/lib/commerce/checkout";
import { formatMoney } from "@/lib/format";

export const metadata = { title: "Order received" };
export const dynamic = "force-dynamic";

export default async function CheckoutSuccessPage({
  params,
  searchParams,
}: {
  params: Promise<{ orderNumber: string }>;
  searchParams: Promise<{ refunded?: string }>;
}) {
  const [{ orderNumber }, query] = await Promise.all([params, searchParams]);
  const owner = await getCartOwner();
  const result = await getOrderForOwner(owner, orderNumber);
  if (!result) notFound();

  const compensated = query.refunded === "1";
  return (
    <section className="page-shell py-16">
      <Card className="mx-auto max-w-2xl">
        <CardContent className="p-8 text-center sm:p-12">
          {compensated ? (
            <RotateCcw className="mx-auto h-14 w-14 text-amber-600" />
          ) : (
            <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-600" />
          )}
          <h1 className="mt-5 text-3xl font-bold">
            {compensated ? "Payment is being refunded" : "Order received"}
          </h1>
          <p className="mt-3 text-slate-600">
            {compensated
              ? "The payment arrived after the stock reservation expired. A full refund has been queued automatically."
              : "We have safely recorded your order and will send updates to your email."}
          </p>
          <div className="mx-auto mt-7 max-w-md rounded-2xl bg-slate-50 p-5 text-left">
            <div className="flex justify-between gap-4 text-sm">
              <span className="text-slate-500">Order</span>
              <strong className="font-mono">{result.order.orderNumber}</strong>
            </div>
            <div className="mt-3 flex justify-between gap-4 text-sm">
              <span className="text-slate-500">Status</span>
              <strong className="capitalize">{result.order.status}</strong>
            </div>
            <div className="mt-3 flex justify-between gap-4 text-sm">
              <span className="text-slate-500">Payment</span>
              <strong className="capitalize">
                {compensated ? "refund queued" : result.order.paymentStatus}
              </strong>
            </div>
            <div className="mt-4 flex justify-between border-t border-slate-200 pt-4">
              <span>Total</span>
              <strong className="font-mono">
                {formatMoney(result.order.total)}
              </strong>
            </div>
          </div>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {result.order.userId ? (
              <Button asChild className="bg-[#E94560] hover:bg-[#D63852]">
                <Link
                  href={`/account/orders/${encodeURIComponent(result.order.orderNumber)}`}
                >
                  View order
                </Link>
              </Button>
            ) : null}
            <Button asChild variant="outline">
              <Link href="/products">Continue shopping</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
