import { Skeleton } from "@babascamera/ui";

export default function Loading() {
  return (
    <div className="page-shell space-y-6 py-12" aria-busy="true">
      <Skeleton className="h-12 w-2/3" />
      <Skeleton className="h-72 w-full rounded-3xl" />
      <div className="grid grid-cols-2 gap-5 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-64 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
