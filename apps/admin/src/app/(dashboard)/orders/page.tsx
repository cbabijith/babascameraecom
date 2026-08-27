import { CreateOrderDialog } from "@/components/create-order-dialog";
import { OrderTable } from "@/components/order-table";
import { PageHeader } from "@/components/page-header";
import { getOrders } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  return (
    <>
      <PageHeader title="Orders" description="Manage Razorpay and cash-on-delivery fulfilment." />
      <div className="mb-4 flex justify-end">
        <CreateOrderDialog />
      </div>
      <OrderTable data={await getOrders()} />
    </>
  );
}
