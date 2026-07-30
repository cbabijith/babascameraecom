import { OrderTable } from "@/components/order-table";
import { PageHeader } from "@/components/page-header";
import { getOrders } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  return (
    <>
      <PageHeader title="Orders" description="Manage Razorpay and cash-on-delivery fulfilment." />
      <OrderTable data={await getOrders()} />
    </>
  );
}
