import Link from "next/link";

function pageHref(basePath: string, searchParams: Record<string, string | string[] | undefined>, page: number) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (key === "page") continue;
    if (typeof value === "string" && value) params.set(key, value);
  }
  if (page > 1) params.set("page", String(page));
  const qs = params.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

/**
 * Server-rendered pager for admin list pages. Renders nothing when there is
 * only a single page.
 */
export function ListPager({
  basePath,
  searchParams = {},
  page,
  pageCount,
  total,
  pageSize,
  singular = "entry",
}: {
  basePath: string;
  searchParams?: Record<string, string | string[] | undefined>;
  page: number;
  pageCount: number;
  total: number;
  pageSize: number;
  singular?: string;
}) {
  if (pageCount <= 1) {
    return (
      <p className="mt-4 text-sm text-slate-500">
        {total} {total === 1 ? singular : `${singular}s`}
      </p>
    );
  }

  const first = (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, total);
  const cell =
    "inline-flex h-9 min-w-9 items-center justify-center rounded-lg border border-slate-300 px-3 text-sm";

  return (
    <nav className="mt-4 flex flex-wrap items-center gap-2" aria-label="Pagination">
      <span className="mr-auto text-sm text-slate-500">
        Showing {first}–{last} of {total}
      </span>
      {page > 1 ? (
        <Link href={pageHref(basePath, searchParams, page - 1)} className={`${cell} hover:bg-slate-50`}>
          Previous
        </Link>
      ) : (
        <span className={`${cell} cursor-not-allowed text-slate-300`}>Previous</span>
      )}
      {page > 3 && (
        <>
          <Link href={pageHref(basePath, searchParams, 1)} className={`${cell} hover:bg-slate-50`}>
            1
          </Link>
          <span className="text-slate-400">…</span>
        </>
      )}
      {Array.from({ length: pageCount }, (_, i) => i + 1)
        .filter((p) => Math.abs(p - page) <= 1)
        .map((p) =>
          p === page ? (
            <span key={p} className={`${cell} border-slate-900 bg-slate-900 font-medium text-white`}>
              {p}
            </span>
          ) : (
            <Link key={p} href={pageHref(basePath, searchParams, p)} className={`${cell} hover:bg-slate-50`}>
              {p}
            </Link>
          ),
        )}
      {page < pageCount - 2 && (
        <>
          <span className="text-slate-400">…</span>
          <Link href={pageHref(basePath, searchParams, pageCount)} className={`${cell} hover:bg-slate-50`}>
            {pageCount}
          </Link>
        </>
      )}
      {page < pageCount ? (
        <Link href={pageHref(basePath, searchParams, page + 1)} className={`${cell} hover:bg-slate-50`}>
          Next
        </Link>
      ) : (
        <span className={`${cell} cursor-not-allowed text-slate-300`}>Next</span>
      )}
    </nav>
  );
}
