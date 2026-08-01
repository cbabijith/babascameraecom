// src/components/orders/OrderCardSkeleton.tsx
"use client";

export default function OrderCardSkeleton() {
  return (
    <div className="rounded-xl border bg-white">
      <div className="p-5 sm:p-6">
        {/* Header: status badge + date | items count */}
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            {/* status badge */}
            <div className="inline-flex items-center gap-2 rounded-full bg-gray-100 text-gray-500 px-3 py-1">
              <div className="h-4 w-4 rounded-full bg-gray-300" />
              <div className="h-3 w-24 rounded bg-gray-300" />
            </div>
            {/* date */}
            <div className="mt-2 h-3 w-28 rounded bg-gray-200" />
          </div>
          {/* items count */}
          <div className="h-3 w-16 rounded bg-gray-200" />
        </div>

        {/* separator */}
        <hr className="my-4 border-gray-200" />

        {/* content: left (thumbs+title) | right (amount+btn) */}
        <div className="flex items-start justify-between gap-6">
          {/* left */}
          <div className="min-w-0 flex-1">
            {/* thumbs row */}
           <div className="flex items-center gap-4 p-2 sm:p-3 mb-3 sm:mb-0 flex-nowrap">
              {/* 2 thumbs always visible on mobile */}
              {[0, 1].map((i) => (
                <div key={i} className="rounded-lg border bg-gray-100 p-2">
                  <div className="h-[72px] w-[72px] sm:h-[80px] sm:w-[80px] rounded bg-gray-200" />
                </div>
              ))}

              {/* third thumb only on ≥sm */}
              <div className="hidden sm:block rounded-lg border bg-gray-100 p-2">
                <div className="h-[72px] w-[72px] sm:h-[80px] sm:w-[80px] rounded bg-gray-200" />
              </div>

              {/* +N more pill placeholder — visible to mirror layout */}
            <div className="hidden sm:inline-flex items-center rounded-full bg-gray-100 px-3 h-7">
              <div className="h-3 w-14 rounded bg-gray-200" />
            </div>
            </div>
            {/* title */}
            <div className="mt-3 h-4 w-3/4 rounded bg-gray-200" />
            {/* +N more items */}
            <div className="mt-2 h-3 w-18 rounded bg-gray-100" />
          </div>

          {/* right */}
          <div className="shrink-0 text-right flex flex-col items-end w-[120px] sm:w-[140px]">
            <div className="h-5 w-20 rounded bg-gray-200" />
            <div className="mt-3 h-9 sm:h-10 w-28 rounded-full border bg-gray-100" />
          </div>
        </div>
      </div>
    </div>
  );
}
