import { PageHeader } from "@/components/page-header";
import { CouponManager } from "@/features/coupons/components/coupon-manager";
import { getCoupons } from "@/features/coupons/server/readers";

export const dynamic = "force-dynamic";

export default async function CouponsPage() {
  return (
    <>
      <PageHeader title="Coupons" description="Create controlled percentage and flat promotions." />
      <CouponManager coupons={await getCoupons()} />
    </>
  );
}
