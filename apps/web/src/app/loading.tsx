import { Skeleton } from "@babascamera/ui";
import { HomepageSectionSkeleton } from "@/features/home/components/homepage-section-skeleton";

export default function Loading() {
  return (
    <div
      className="page-shell space-y-14 py-6 sm:space-y-20 sm:py-10"
      aria-busy="true"
      aria-label="Loading storefront"
    >
      <Skeleton className="aspect-[4/5] w-full rounded-3xl sm:aspect-[16/6]" />
      <HomepageSectionSkeleton />
      <HomepageSectionSkeleton />
    </div>
  );
}
