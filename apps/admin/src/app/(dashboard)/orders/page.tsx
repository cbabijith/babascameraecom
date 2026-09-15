import { ListPager } from "@/components/list-pager";
import { PageHeader } from "@/components/page-header";
import { CreateOrderDialog } from "@/features/orders/components/create-order-dialog";
import { OrderTable } from "@/features/orders/components/order-table";
import { getOrders } from "@/features/orders/server/readers";

export const dynamic = "force-dynamic";

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page } = await searchParams;
  const orders = await getOrders({ page: Number(page) || 1 });
  return (
    <>
      <PageHeader title="Orders" description="Manage Razorpay and cash-on-delivery fulfilment." />
      <div className="mb-4 flex justify-end">
        <CreateOrderDialog />
      </div>
      <OrderTable data={orders.rows} />
      <ListPager
        basePath="/orders"
        page={orders.page}
        pageCount={orders.pageCount}
        total={orders.total}
        pageSize={orders.pageSize}
        singular="order"
      />
    </>
  );
}
