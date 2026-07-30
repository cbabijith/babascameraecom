import { Skeleton } from "@babascamera/ui";

export default function BrandsLoading() {
  return (
    <section className="grid w-full min-w-0 gap-4" aria-label="Loading brands">
      <header className="flex items-start justify-between gap-4">
        <div className="grid gap-2">
          <Skeleton className="h-7 w-28" />
          <Skeleton className="h-4 w-72 max-w-[70vw]" />
        </div>
        <Skeleton className="h-9 w-28" />
      </header>
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <div className="flex gap-2 border-b border-slate-200 p-3">
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-20" />
        </div>
        <div className="flex gap-3 border-b border-slate-200 p-3">
          <Skeleton className="h-9 flex-1" />
          <Skeleton className="h-9 w-36" />
        </div>
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index} className="flex h-14 items-center gap-3 border-b border-slate-100 px-3 last:border-0">
            <Skeleton className="size-10 rounded-md" />
            <Skeleton className="h-4 w-36" />
            <Skeleton className="ml-auto h-5 w-16" />
            <Skeleton className="h-8 w-10" />
          </div>
        ))}
      </div>
    </section>
  );
}
