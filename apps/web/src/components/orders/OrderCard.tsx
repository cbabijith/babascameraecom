// src/components/orders/OrderCard.tsx
"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { Order } from "@/types/order";
import { getThumbnailUrl } from "@/lib/apiClient";
import { cancelOrder } from "@/instances/orderInstance";
import { toast } from "sonner";

/* Icons */
import {
  Clock,
  FileCheck2,
  CheckCircle2,
  Box,
  Truck,
  PackageCheck,
  PackageX,
  Undo2,
  CircleDollarSign,
  AlertOctagon,
  Navigation,
} from "lucide-react";

const PLACEHOLDER_DATAURI =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='92' height='92' viewBox='0 0 92 92'>
      <defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>
      <stop offset='0' stop-color='#e5e7eb'/><stop offset='1' stop-color='#d1d5db'/></linearGradient></defs>
      <rect width='92' height='92' fill='url(#g)'/>
      <g fill='#9ca3af' font-family='Arial,sans-serif' font-size='10' text-anchor='middle'>
        <text x='46' y='50'>placeholder</text>
      </g>
    </svg>`
  );

/* ---------- labels ---------- */
/* ---------- labels ---------- */
const STATUS_LABEL: Record<string, string> = {
  PENDING: "Pending",
  PLACED: "Order Placed",
  CONFIRMED: "Order Confirmed",
  DISPATCHED: "Dispatched",
  PACKED: "Packed",
  SHIPPED: "Shipped",
  OUT_OF_DELIVERY: "Out for Delivery",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
  RETURNED: "Returned",
  REFUNDED: "Refunded",
  FAILED: "Payment Failed",
};

/* ---------- theme (text + icon + bg) ---------- */
type Theme = {
  text: string;
  bg: string;
  icon: React.ComponentType<{ className?: string }>;
};

const STATUS_THEME: Record<string, Theme> = {
  PENDING:        { text: "text-amber-700",   bg: "bg-amber-100",   icon: Clock },
  PLACED:         { text: "text-sky-700",     bg: "bg-sky-100",     icon: PackageCheck },
  CONFIRMED:      { text: "text-blue-700",    bg: "bg-blue-100",    icon: CheckCircle2 },
  DISPATCHED:     { text: "text-indigo-700",  bg: "bg-indigo-100",  icon: Truck },
  PACKED:         { text: "text-indigo-700",  bg: "bg-indigo-100",  icon: Box },
  SHIPPED:        { text: "text-teal-700",    bg: "bg-teal-100",    icon: Truck },
  OUT_OF_DELIVERY: { text: "text-cyan-700",    bg: "bg-cyan-100",    icon: Navigation },
  DELIVERED:      { text: "text-emerald-700", bg: "bg-emerald-100", icon: FileCheck2 },
  CANCELLED:      { text: "text-rose-700",    bg: "bg-rose-100",    icon: PackageX },
  RETURNED:       { text: "text-orange-700",  bg: "bg-orange-100",  icon: Undo2 },
  REFUNDED:       { text: "text-lime-700",    bg: "bg-lime-100",    icon: CircleDollarSign },
  FAILED:         { text: "text-red-700",     bg: "bg-red-100",     icon: AlertOctagon },
};

/* ---------- normalize & alias ---------- */
function normalizeStatus(raw?: string): string {
  if (!raw) return "PLACED";
  // Uppercase & strip all non A–Z chars (spaces, _, -, etc.)
  const compact = raw.toUpperCase().replace(/[^A-Z]/g, "");
  // Map common variants to your canonical keys
  const ALIAS: Record<string, string> = {
    // Out for delivery variants
    OUTFORDELIVERY: "OUT_OF_DELIVERY",
    OUT_OF_DELIVERY: "OUT_OF_DELIVERY",
    // Dispatched -> treat as shipped (or keep distinct if you prefer)
    DISPATCHED: "DISPATCHED",
    // Payment failures
    PAYMENTFAILED: "FAILED",
    PAYFAILED: "FAILED",
    // Already canonical
    PENDING: "PENDING",
    PLACED: "PLACED",
    CONFIRMED: "CONFIRMED",
    PACKED: "PACKED",
    SHIPPED: "SHIPPED",
    DELIVERED: "DELIVERED",
    CANCELLED: "CANCELLED",
    RETURNED: "RETURNED",
    REFUNDED: "REFUNDED",
    FAILED: "FAILED",
  };
  return ALIAS[compact] ?? "PLACED";
}

function getStatusMeta(status?: string) {
  const key = normalizeStatus(status);
  const theme = STATUS_THEME[key] ?? { text: "text-gray-700", bg: "bg-gray-100", icon: FileCheck2 };
  const label = STATUS_LABEL[key] ?? "Order Placed";
  return { label, ...theme };
}

const CANCELLABLE_STATUSES = new Set(["PENDING", "PLACED", "CONFIRMED", "PROCESSING", "PACKED"]);

function isOrderCancellable(status?: string): boolean {
  if (!status) return false;
  const compact = status.toUpperCase().replace(/[^A-Z]/g, "");
  return CANCELLABLE_STATUSES.has(compact);
}


function formatINR(amount: number | undefined): string {
  if (amount == null || Number.isNaN(amount)) return "₹0";

  const isInteger = Number.isInteger(amount);

  return amount.toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: isInteger ? 0 : 2, // ✅ no decimals if integer
    maximumFractionDigits: 2,                 // ✅ show .xx only if needed
  });
}


function formatDate(iso: string | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

/** A, A and B, A, B and C */
function formatNames(names: string[]): string {
  const n = names.length;
  if (n === 0) return "";
  if (n === 1) return names[0]!;
  if (n === 2) return `${names[0]} and ${names[1]}`;
  return `${names[0]}, ${names[1]} and ${names[2]}`;
}

export default function OrderCard({ order }: { order: Order }) {
  const status = order.orderStatus;
  const { label: statusLabel, text: statusText, bg, icon: Icon } = getStatusMeta(status);
  const displayDate = formatDate(order.placedAt || order.createdAt);
  const amountFormatted = formatINR(order.summary?.total);

  const items = order.items || [];
  const itemCount = items.length;
  const [isMobile, setIsMobile] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const handleCancelClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!window.confirm(`Are you sure you want to cancel order ${order.code ?? ""}?`)) return;
    try {
      setCancelling(true);
      await cancelOrder(order._id, "Cancelled by customer");
      toast.success("Order cancelled successfully");
      window.location.reload();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to cancel order";
      toast.error(msg);
    } finally {
      setCancelling(false);
    }
  };
useEffect(() => {
  const mq = window.matchMedia("(max-width: 639px)");
  const onChange = () => setIsMobile(mq.matches);
  onChange(); mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}, []);

 const visibleCount = isMobile ? 2 : 3;
  const visible = items.slice(0, visibleCount);
  // image keys
  const imageKeys = useMemo(
    () =>
      visible.map((it) =>
        typeof it.product !== "string" ? it.product?.images?.[0]?.key : undefined
      ),
    [visible]
  );

  // names
  const topNames = useMemo(() => {
  return visible.map((it) => {
    const rawName =
      (typeof it.product !== "string" && it.product?.name) || it.name || "Product";

    return rawName.charAt(0).toUpperCase() + rawName.slice(1);
  });
}, [visible]);

  const moreThumbs = Math.max(0, itemCount - visibleCount);
  const title = formatNames(topNames);

  return (
    <div className="rounded-xl border bg-white">
      <div className="p-5 sm:p-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            {/* Status badge */}
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${bg} ${statusText}`}
            >
              <Icon className="h-4 w-4" />
              {statusLabel}
            </span>

            {displayDate && (
              <p className="mt-2 text-muted-foreground text-[12px] sm:text-[13px]">
                on {displayDate}
              </p>
            )}
          </div>
          <div className="text-sm text-gray-500">
            {itemCount} {itemCount === 1 ? "item" : "items"}
          </div>
        </div>

        {/* Separator line */}
        <hr className="my-4 border-gray-200" />

        {/* Content row */}
        <div className="flex items-start justify-between gap-6">
          {/* LEFT */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-4 p-2 sm:p-3 mb-3 sm:mb-0">
              {imageKeys.map((k, idx) => (
                <Image
                  key={`${k ?? "ph"}-${idx}`}
                  src={k ? getThumbnailUrl(k) : PLACEHOLDER_DATAURI}
                  alt={`Item ${idx + 1}`}
                  width={80}
                  height={80}
                  className="rounded-lg object-contain w-[72px] h-[72px] sm:w-[80px] sm:h-[80px] border bg-gray-50 p-2"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = PLACEHOLDER_DATAURI;
                  }}
                />
              ))}

                {!isMobile && moreThumbs > 0 && (
                  <span className="hidden sm:inline-flex items-center justify-center rounded-full bg-rose-50 px-3 h-7 text-xs font-semibold text-rose-600 border border-rose-100">
                    +{moreThumbs} More
                  </span>
                )}

            </div>

            <h3 className="mt-3 text-[15px] sm:text-[16px] lg:text-[18px] font-semibold text-black leading-tight truncate">
              {title}
            </h3>
           {itemCount > visibleCount && (
              <div className="mt-1 text-[12px] sm:text-[13px] text-rose-600 font-medium">
                +{itemCount - visibleCount} more items
              </div>
            )}

          </div>

          {/* RIGHT */}
          <div className="shrink-0 text-right flex flex-col items-end">
            <div className="font-semibold text-[16px] sm:text-[18px]">
              {amountFormatted}
            </div>
            <div className="mt-3 sm:mt-2 flex items-center gap-2 flex-wrap justify-end">
              {isOrderCancellable(order.orderStatus) && (
                <button
                  type="button"
                  onClick={handleCancelClick}
                  disabled={cancelling}
                  className="inline-flex h-9 sm:h-10 items-center justify-center rounded-full border border-rose-200 bg-rose-50 px-3 sm:px-4 text-xs sm:text-sm font-semibold text-rose-700 hover:bg-rose-100 transition-colors disabled:opacity-50"
                >
                  {cancelling ? "Cancelling..." : "Cancel Order"}
                </button>
              )}
              <Link
                href={`/orders/${order._id}`}
                className="inline-flex h-9 sm:h-10 items-center justify-center rounded-full border px-4 sm:px-5 text-xs sm:text-sm font-semibold text-[#E72429] border-[#E72429] hover:bg-[#fff5f5]"
              >
                View Details
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
