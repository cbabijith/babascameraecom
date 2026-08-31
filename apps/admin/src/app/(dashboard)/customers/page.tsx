import { PageHeader } from "@/components/page-header";
import { CustomerTable } from "@/features/customers/components/customer-table";
import { getCustomers } from "@/features/customers/server/readers";

export const dynamic = "force-dynamic";

export default async function CustomersPage() {
  return (
    <>
      <PageHeader title="Customers" description="Review customer history and control storefront account access." />
      <CustomerTable data={await getCustomers()} />
    </>
  );
}
