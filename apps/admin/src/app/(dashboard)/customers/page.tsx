import { CustomerTable } from "@/components/customer-table";
import { PageHeader } from "@/components/page-header";
import { getCustomers } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function CustomersPage() {
  return (
    <>
      <PageHeader title="Customers" description="Review customer history and control storefront account access." />
      <CustomerTable data={await getCustomers()} />
    </>
  );
}
