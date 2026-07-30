import { Skeleton } from "@babascamera/ui";

export default function DashboardLoading() {
  return (
    <div className="grid gap-7">
      <div><Skeleton className="h-9 w-56" /><Skeleton className="mt-2 h-4 w-96 max-w-full" /></div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => <Skeleton key={index} className="h-32 rounded-2xl" />)}
      </div>
      <Skeleton className="h-80 rounded-2xl" />
      <Skeleton className="h-72 rounded-2xl" />
    </div>
  );
}
