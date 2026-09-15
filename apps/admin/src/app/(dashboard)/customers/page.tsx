import { ListPager } from "@/components/list-pager";
import { PageHeader } from "@/components/page-header";
import { CustomerTable } from "@/features/customers/components/customer-table";
import { getCustomers } from "@/features/customers/server/readers";

export const dynamic = "force-dynamic";

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page } = await searchParams;
  const customers = await getCustomers({ page: Number(page) || 1 });
  return (
    <>
      <PageHeader title="Customers" description="Review customer history and control storefront account access." />
      <CustomerTable data={customers.rows} />
      <ListPager
        basePath="/customers"
        page={customers.page}
        pageCount={customers.pageCount}
        total={customers.total}
        pageSize={customers.pageSize}
        singular="customer"
      />
    </>
  );
}
