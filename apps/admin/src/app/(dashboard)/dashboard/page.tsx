import { Button, Card, CardContent, CardHeader, CardTitle } from "@babascamera/ui";
import { IndianRupee, PackageSearch, ShoppingCart, UsersRound } from "lucide-react";
import Link from "next/link";

import { CommerceChart } from "@/components/commerce-chart";
import { PageHeader } from "@/components/page-header";
import { RecentOrdersTable } from "@/components/recent-orders-table";
import { StatCard } from "@/components/stat-card";
import { getDashboard } from "@/lib/data";
import { formatPaise } from "@/lib/money";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const data = await getDashboard();
  return (
    <>
      <PageHeader title="Dashboard" description="Live operational view of the store." />
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="30-day revenue" value={formatPaise(data.metrics.paidRevenuePaise)} helper="Paid orders only" icon={IndianRupee} />
        <StatCard label="30-day orders" value={String(data.metrics.orders)} helper="Across Razorpay and COD" icon={ShoppingCart} />
        <StatCard label="Products" value={String(data.metrics.products)} helper={`${data.metrics.lowStock} at or below threshold`} icon={PackageSearch} />
        <StatCard label="Customers" value={String(data.metrics.customers)} helper={`${data.metrics.pendingReviews} reviews awaiting approval`} icon={UsersRound} />
      </section>
      <CommerceChart points={data.points} />
      <Card className="border-slate-200">
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Recent orders</CardTitle>
          <Button asChild variant="outline" size="sm"><Link href="/orders">View all</Link></Button>
        </CardHeader>
        <CardContent>
          <RecentOrdersTable data={data.recentOrders} />
        </CardContent>
      </Card>
    </>
  );
}
