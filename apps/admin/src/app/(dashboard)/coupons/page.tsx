import { CouponManager } from "@/components/coupon-manager";
import { PageHeader } from "@/components/page-header";
import { getCoupons } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function CouponsPage() {
  return (
    <>
      <PageHeader title="Coupons" description="Create controlled percentage and flat promotions." />
      <CouponManager coupons={await getCoupons()} />
    </>
  );
}
