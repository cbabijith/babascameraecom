import { Skeleton } from "@babascamera/ui";

export function HomepageSectionSkeleton() {
  return (
    <section aria-hidden className="space-y-5">
      <Skeleton className="h-8 w-56" />
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="space-y-3">
            <Skeleton className="aspect-square rounded-2xl" />
            <Skeleton className="h-5 w-4/5" />
            <Skeleton className="h-5 w-2/5" />
          </div>
        ))}
      </div>
    </section>
  );
}
