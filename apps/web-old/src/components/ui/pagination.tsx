// src/components/ui/pagination.tsx
"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  showPages?: number; // desktop/tablet count
}

// simple hook to detect mobile (<= 640px)
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 640px)");
    const onChange = () => setIsMobile(mq.matches);
    onChange();
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, []);
  return isMobile;
}

export default function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  showPages = 5,
}: PaginationProps) {
  const isMobile = useIsMobile();
  const visiblePages = isMobile ? 3 : showPages;

  if (totalPages <= 1) return null;

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const half = Math.floor(visiblePages / 2);

    let start = Math.max(1, currentPage - half);
    let end = Math.min(totalPages, currentPage + half);

    if (currentPage <= half) {
      end = Math.min(totalPages, visiblePages);
    }
    if (currentPage + half >= totalPages) {
      start = Math.max(1, totalPages - visiblePages + 1);
    }

    if (start > 1) {
      pages.push(1);
      if (start > 2) pages.push("…");
    }
    for (let i = start; i <= end; i++) pages.push(i);
    if (end < totalPages) {
      if (end < totalPages - 1) pages.push("…");
      pages.push(totalPages);
    }

    return pages;
  };

  return (
    <div className="flex flex-nowrap items-center justify-center gap-2 max-w-full">
      {/* Prev (chevron-only on mobile) */}
      <Button
        size="sm"
        aria-label="Previous page"
        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
        disabled={currentPage <= 1}
        className={`flex items-center justify-center min-w-[40px] sm:min-w-[80px] px-3 sm:px-4 ${
          currentPage <= 1
            ? "bg-gray-200 text-gray-400 cursor-not-allowed"
            : "bg-[#E72429] text-white hover:bg-[#c51c22]"
        }`}
      >
        <ChevronLeft className="w-4 h-4 mr-0 sm:mr-1" />
        <span className="hidden sm:inline">Prev</span>
      </Button>

      {/* Page numbers */}
      <div className="flex flex-nowrap items-center gap-1 max-w-full">
        {getPageNumbers().map((page, idx) => (
          <div key={`${page}-${idx}`}>
            {page === "…" ? (
              <span className="px-2 py-2 text-gray-500 text-sm sm:text-base leading-none select-none">
                …
              </span>
            ) : (
              <Button
                size="sm"
                aria-label={`Go to page ${page}`}
                onClick={() => onPageChange(page as number)}
                className={`px-3 min-w-[36px] sm:min-w-[40px] ${
                  currentPage === page
                    ? "bg-[#E72429] text-white hover:bg-[#c51c22]"
                    : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-100"
                }`}
              >
                {page}
              </Button>
            )}
          </div>
        ))}
      </div>

      {/* Next (chevron-only on mobile) */}
      <Button
        size="sm"
        aria-label="Next page"
        onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
        disabled={currentPage >= totalPages}
        className={`flex items-center justify-center min-w-[40px] sm:min-w-[80px] px-3 sm:px-4 ${
          currentPage >= totalPages
            ? "bg-gray-200 text-gray-400 cursor-not-allowed"
            : "bg-[#E72429] text-white hover:bg-[#c51c22]"
        }`}
      >
        <span className="hidden sm:inline">Next</span>
        <ChevronRight className="w-4 h-4 ml-0 sm:ml-1" />
      </Button>
    </div>
  );
}
