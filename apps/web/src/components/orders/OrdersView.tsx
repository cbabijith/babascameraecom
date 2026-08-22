"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Calendar as CalendarIcon, Search } from "lucide-react"; // removed ChevronDown
import TabsBar from "@/components/ui/TabsBar";
import OrdersList, { type OrdersTab } from "@/components/orders/OrdersList";
import type { Order } from "@/types/order";
import { getAllOrders, type OrdersPage } from "@/instances/orderInstance";
import { useSelector } from "react-redux";
import type { RootState } from "@/store";
import { toast } from "sonner";
import AppBreadcrumb from "../common/app-breadcrumb";
import Pagination from "@/components/ui/pagination";
import OrderCardSkeleton from "../ui/OrderCardSkeleton";

/* ---- form + date utils ---- */
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { cn } from "@/lib/utils";
import type { DateRange } from "react-day-picker"; // ✅ proper type

/* ---- shadcn Select for Status ---- */
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/* responsive months hook for the calendar */
function useIsSmall() {
  // Initialize to true for SSR consistency (mobile-first)
  const [isSmall, setIsSmall] = useState<boolean>(true);
  useEffect(() => {
    const m = window.matchMedia("(max-width: 640px)");
    const onChange = (e: MediaQueryListEvent) => setIsSmall(e.matches);
    setIsSmall(m.matches); // Sync actual value after hydration
    m.addEventListener("change", onChange);
    return () => m.removeEventListener("change", onChange);
  }, []);
  return isSmall;
}

const tabs: OrdersTab[] = ["Orders", "Cancelled Orders"];

const DateRangeSchema = z.object({ from: z.date(), to: z.date() });
const FormSchema = z.object({ dateRange: DateRangeSchema.optional().nullable() });

const STATUS_OPTIONS = ["PENDING", "PROCESSING", "CONFIRMED", "SHIPPED", "DELIVERED", "CANCELLED", "FAILED", "REFUNDED"] as const;

type StatusOption = (typeof STATUS_OPTIONS)[number];

export default function OrdersView() {
  const user = useSelector((state: RootState) => state.auth.user);

  const [active, setActive] = useState<OrdersTab>("Orders");
  const [query, setQuery] = useState("");

  const [orders, setOrders] = useState<Order[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const pageSize = 10;
  const mountedOnce = useRef(false);

  /* ---------- Status filter ---------- */
  const [statusFilter, setStatusFilter] = useState<StatusOption | "">("");

  /* ---------- Date range with OK/Apply semantics ---------- */
  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: { dateRange: undefined },
  });

  const [pendingRange, setPendingRange] = useState<DateRange | undefined>(undefined);
  const [appliedRange, setAppliedRange] = useState<DateRange | undefined>(undefined);
  const [open, setOpen] = useState(false);

  const fromISO = useMemo(
    () => (appliedRange?.from ? new Date(appliedRange.from).toISOString() : undefined),
    [appliedRange]
  );
  const toISO = useMemo(
    () => (appliedRange?.to ? new Date(appliedRange.to).toISOString() : undefined),
    [appliedRange]
  );

  const serverStatus = useMemo<StatusOption | undefined>(() => {
    if (statusFilter) return statusFilter as StatusOption;
    return active === "Cancelled Orders" ? "CANCELLED" : undefined;
  }, [active, statusFilter]);

  const fetchPage = async () => {
    try {
      setLoading(true);
      setError(null);

      const resp: OrdersPage = await getAllOrders({
        page: currentPage,
        limit: pageSize,
        q: query || undefined,
        status: serverStatus,
        from: fromISO,
        to: toISO,
      });

      setOrders(resp.results);
      setTotalPages(resp.totalPages);
      setTotalCount(resp.totalCount);
    } catch (err: unknown) {
      const msg =
        err && typeof err === "object" && "message" in err
          ? String((err as { message?: string }).message)
          : "Failed to load orders";
      setError(msg);
      if (msg.toLowerCase().includes("unauthenticated")) {
        toast.warning("Please login to view your orders");
      }
      console.error("[OrdersView] fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!mountedOnce.current) mountedOnce.current = true;
    fetchPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, query, serverStatus, fromISO, toISO]);

  useEffect(() => {
    setCurrentPage(1);
  }, [serverStatus, query, fromISO, toISO]);

  const isSmall = useIsSmall();

  /* ---------- SKELETON ---------- */
  if (loading && !orders.length && !error) {
    return (
      <div className="constrained-width py-6">
        <div className="py-2 sm:pt-6">
          <div className="h-4 w-48 rounded bg-gray-200" />
        </div>

        <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="h-6 w-56 rounded bg-gray-200" />
          <div className="flex w-full sm:w-[420px] items-center gap-2 rounded-[16px] bg-[#F8F8F8] px-3 py-2">
            <div className="h-4 w-4 rounded bg-gray-300" />
            <div className="h-5 w-full rounded bg-gray-200" />
          </div>
        </div>

        <div className="mb-4 sm:mb-6">
          <div className="h-[41px] w-[420px] rounded-[8px] bg-gray-100" />
        </div>

        <div className="space-y-3 sm:space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <OrderCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  /* ---------- ERRORS ---------- */
  if (error) {
    if (error.toLowerCase().includes("unauthenticated") || !user) {
      return (
        <div className="min-h-screen constrained-width">
          <main className="mx-auto py-8">
            <div className="flex flex-col gap-8 bg-white rounded-lg shadow-sm p-6 sm:p-8 text-center border">
              <div>
                <h2 className="text-[20px] sm:text-[24px] lg:text-[32px] font-[650] text-[#000]">
                  Please login to view your orders
                </h2>
                <p className="text-[#475569] font-[500] text-[14px] sm:text-[16px] lg:text-[20px] mt-2">
                  Sign in to see your order history and track shipments.
                </p>
              </div>
              <div>
                <button
                  className="bg-[#E72429] hover:bg-[#c51c22] text-white font-medium rounded-lg px-5 py-2 text-[14px] sm:text-[16px]"
                  onClick={() => (window.location.href = "/login")}
                >
                  Login to Continue
                </button>
              </div>
            </div>
          </main>
        </div>
      );
    }

    return (
      <div className="constrained-width py-6 text-center">
        <h1 className="mb-4 text-[20px] sm:text-[24px] font-[650] leading-none text-slate-800">
          Your Orders
        </h1>
        <p className="mb-4 text-gray-500">{error}</p>
        <button
          onClick={() => fetchPage()}
          className="rounded bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700"
        >
          Try Again
        </button>
      </div>
    );
  }

  /* ---------- NORMAL ---------- */
  return (
    <div className="constrained-width py-6">
      <div className="py-2 sm:pt-6">
        <AppBreadcrumb items={[{ label: "HOME", href: "/" }, { label: "ORDERS" }]} />
      </div>

      {/* Header */}
      <div className="mb-4 flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h1 className="text-[18px] sm:text-[20px] md:text-[22px] lg:text-[24px] font-[650] leading-none text-slate-800">
            Your Orders ({totalCount})
          </h1>

          {/* Search */}
          <div className="w-full sm:w-auto">
            <div className="flex w-full sm:w-[420px] items-center gap-2 rounded-[16px] bg-[#F8F8F8] px-3 py-2">
              <Search className="h-4 w-4 text-black/60 shrink-0" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search orders by product name…"
                className="flex-1 bg-transparent text-[14px] sm:text-[15px] font-medium text-black/70 placeholder:text-black/50 outline-none"
              />
            </div>
          </div>
        </div>

        {/* Filters row — aligned with TabsBar */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pt-1">
          {/* Tabs on desktop */}
          <div className="hidden sm:block">
            <TabsBar
              items={tabs}
              active={active}
              onChange={(val) => setActive(val as OrdersTab)}
              containerWidth={420}
              containerHeight={41}
              containerPadding={3}
              containerBg="var(--bg-muted, #F4F4F5)"
              itemWidth={200}
              itemHeight={35}
              itemPadding="4px 8px"
              itemRadius={8}
              activeBg="var(--bg-secondary, #FFFFFF)"
            />
          </div>

          {/* Right filters: Status + Date range */}
          <div className="flex w-full sm:w-auto flex-col gap-3 sm:flex-row sm:items-end">
            {/* Status (shadcn Select) */}
            <div className="flex flex-col">
              <label className="text-xs font-semibold text-slate-800 mb-1">Status</label>

              <Select
                value={statusFilter || "ALL"}
                onValueChange={(v) => setStatusFilter(v === "ALL" ? "" : (v as StatusOption))}
              >
                <SelectTrigger
                  className={cn(
                    "h-10 w-full sm:w-[240px] rounded-[12px] border border-slate-200 bg-white px-3 pr-10 text-sm text-slate-800",
                    "shadow-[0_1px_0_rgba(0,0,0,0.02)] transition focus:outline-none",
                    "focus:ring-2 focus:ring-[#E72429]/40 focus:border-[#E72429] relative"
                  )}
                >
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>

                <SelectContent
                  className="rounded-xl border border-slate-200 bg-white text-slate-800 shadow-lg"
                  align="start"
                >
                  <SelectItem value="ALL" className="cursor-pointer">All Statuses</SelectItem>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s} value={s} className="cursor-pointer">
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date Range with OK/Apply (responsive) */}
            <div className="flex-1 min-w-[260px] sm:min-w-[360px]">
              <Form {...form}>
                <FormField
                  control={form.control}
                  name="dateRange"
                  render={() => (
                    <FormItem className="flex flex-col">
                      <FormLabel className="text-xs font-semibold text-slate-800 mb-1">
                        Date range
                      </FormLabel>

                      <Popover
                        open={open}
                        onOpenChange={(v) => {
                          setOpen(v);
                          if (v) setPendingRange(appliedRange ? { ...appliedRange } : undefined);
                        }}
                      >
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              id="date"
                              variant="outline"
                              className={cn(
                                "w-full justify-between text-left font-normal rounded-[12px] h-10",
                                "bg-white border border-slate-300 text-slate-800",
                                "focus:ring-2 focus:ring-[#E72429]/40 focus:border-[#E72429]"
                              )}
                            >
                              {appliedRange?.from && appliedRange?.to ? (
                                <>
                                  {format(appliedRange.from, "LLL dd, y")} —{" "}
                                  {format(appliedRange.to, "LLL dd, y")}
                                </>
                              ) : (
                                <span className="text-black/60">Pick a date</span>
                              )}
                              <CalendarIcon className="ml-2 h-5 w-5 text-slate-700 shrink-0" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>

                        {/* Popover & Calendar tuned for mobile fit */}
                        <PopoverContent
                          side="bottom"
                          align="start"
                          sideOffset={8}
                          className={cn(
                            "z-50 p-0 rounded-xl border bg-white shadow-lg",
                            "w-auto max-w-[calc(100vw-24px)]", // clamp on mobile to remove extra blank area
                            "sm:max-w-none sm:w-auto"
                          )}
                        >
                          {/* scrollable body */}
                          <div className="max-h-[70vh] overflow-auto p-3 sm:p-0">
                            <Calendar
                              initialFocus
                              mode="range"
                              defaultMonth={pendingRange?.from}
                              selected={pendingRange}
                              onSelect={(r: DateRange | undefined) => setPendingRange(r)}
                              numberOfMonths={isSmall ? 1 : 2}
                              className={cn(
                                "[--cell-size:2.25rem] sm:[--cell-size:2.5rem]",
                                "rounded-lg",
                                "[&_.rdp-caption_label]:text-slate-900 [&_.rdp-weekday]:text-slate-700",
                                "[&_.rdp-day]:text-slate-800 [&_.rdp-day_outside]:text-slate-400",
                                "[&_.rdp-day_today]:ring-1 [&_.rdp-day_today]:ring-[#E72429]/50",
                                "[&_.rdp-day]:hover:bg-rose-50",
                                // selected styles
                                "[&_button[data-selected-single='true']]:bg-[#E72429] [&_button[data-selected-single='true']]:text-white",
                                "[&_button[data-range-start='true']]:bg-[#E72429] [&_button[data-range-start='true']]:text-white",
                                "[&_button[data-range-end='true']]:bg-[#E72429] [&_button[data-range-end='true']]:text-white",
                                "[&_button[data-range-middle='true']]:bg-rose-50 [&_button[data-range-middle='true']]:text-slate-800"
                              )}
                              buttonVariant="outline"
                            />
                          </div>

                          {/* Sticky footer actions */}
                          <div className="sticky bottom-0 left-0 right-0 bg-white border-t p-2 sm:p-3 flex items-center justify-between gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              className="h-9 rounded-lg text-slate-800 border-slate-300 hover:bg-slate-50"
                              onClick={() => {
                                setPendingRange(undefined);
                                setAppliedRange(undefined);
                                form.reset({ dateRange: undefined });
                                setOpen(false);
                                setCurrentPage(1);
                              }}
                            >
                              Clear
                            </Button>
                            <div className="flex gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                className="h-9 rounded-lg text-slate-800 border-slate-300 hover:bg-slate-50"
                                onClick={() => setOpen(false)}
                              >
                                Cancel
                              </Button>
                              <Button
                                type="button"
                                variant="babas"
                                className="h-9 rounded-lg"
                                disabled={!(pendingRange?.from && pendingRange?.to)}
                                onClick={() => {
                                  if (pendingRange?.from && pendingRange?.to) {
                                    setAppliedRange({ from: pendingRange.from, to: pendingRange.to });
                                    form.setValue("dateRange", { from: pendingRange.from, to: pendingRange.to });
                                    setCurrentPage(1);
                                  }
                                  setOpen(false);
                                }}
                              >
                                OK
                              </Button>
                            </div>
                          </div>
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </Form>
            </div>
          </div>
        </div>

        {/* Mobile tabs */}
        <div className="sm:hidden flex gap-2">
          {tabs.map((t) => (
            <button
              key={t}
              onClick={() => setActive(t)}
              className={`flex-1 rounded-md border px-3 py-2 text-sm ${active === t ? "bg-white" : "bg-[#F4F4F5]"}`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <OrdersList tab={active} data={orders} />

      <div className="mt-6 flex flex-col items-center gap-3">
        <div className="text-xs sm:text-sm text-muted-foreground">
          {totalCount === 0
            ? "No results"
            : (() => {
              const start = (currentPage - 1) * pageSize + 1;
              const end = Math.min(currentPage * pageSize, totalCount);
              return `Showing ${start}–${end} of ${totalCount}`;
            })()}
        </div>

        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={(p) => setCurrentPage(p)}
          showPages={5}
        />
      </div>
    </div>
  );
}
