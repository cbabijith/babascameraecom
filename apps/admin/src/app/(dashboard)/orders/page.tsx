import { PageHeader } from "@/components/page-header";
import { CreateOrderDialog } from "@/features/orders/components/create-order-dialog";
import { OrderTable } from "@/features/orders/components/order-table";
import { getOrders } from "@/features/orders/server/readers";

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
