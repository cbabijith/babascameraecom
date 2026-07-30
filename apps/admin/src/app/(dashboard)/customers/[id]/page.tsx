import { Card, CardContent, CardHeader, CardTitle } from "@babascamera/ui";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/page-header";
import { CustomerOrderTable } from "@/components/customer-order-table";
import { CustomerStatusButton } from "@/components/customer-table";
import { StatusBadge } from "@/components/status-badge";
import { getCustomer } from "@/lib/data";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const customer = await getCustomer(id);
  if (!customer) notFound();
  return (
    <>
      <PageHeader title={customer.fullName ?? "Unnamed customer"} description={`${customer.email} · joined ${formatDate(customer.createdAt)}`} />
      <div className="flex items-center gap-3">
        <StatusBadge status={customer.isActive ? "active" : "inactive"} />
        <CustomerStatusButton customer={customer} />
      </div>
      <div className="grid gap-6 xl:grid-cols-[1fr_22rem]">
        <div className="grid gap-6">
          <Card><CardHeader><CardTitle>Orders</CardTitle></CardHeader><CardContent>
            <CustomerOrderTable data={customer.orders} />
          </CardContent></Card>
          <Card><CardHeader><CardTitle>Reviews</CardTitle></CardHeader><CardContent className="grid gap-3">
            {customer.reviews.map((review) => <div key={review.id} className="rounded-xl border p-4"><div className="flex gap-2"><b>{review.productName}</b><span>{"★".repeat(review.rating)}</span><StatusBadge status={review.isApproved ? "approved" : "pending"} /></div><p className="mt-1 text-sm">{review.title ?? "Untitled review"}</p></div>)}
            {!customer.reviews.length ? <p className="text-sm text-slate-500">No reviews submitted.</p> : null}
          </CardContent></Card>
        </div>
        <aside className="grid content-start gap-6">
          <Card><CardHeader><CardTitle>Contact</CardTitle></CardHeader><CardContent className="text-sm"><p>{customer.email}</p><p>{customer.phone ?? "No phone number"}</p></CardContent></Card>
          <Card><CardHeader><CardTitle>Addresses</CardTitle></CardHeader><CardContent className="grid gap-4">
            {customer.addresses.map((address) => <address key={address.id} className="rounded-xl border p-3 text-sm not-italic"><b>{address.label}{address.isDefault ? " · Default" : ""}</b><br />{address.line1}{address.line2 ? <><br />{address.line2}</> : null}<br />{address.city}, {address.state} {address.pincode}<br />{address.country}</address>)}
            {!customer.addresses.length ? <p className="text-sm text-slate-500">No saved addresses.</p> : null}
          </CardContent></Card>
        </aside>
      </div>
    </>
  );
}
