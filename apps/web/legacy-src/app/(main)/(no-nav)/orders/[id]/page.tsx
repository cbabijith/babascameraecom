// src/app/(main)/(no-nav)/orders/[id]/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { getOrderById, fetchInvoiceFile } from "@/instances/orderInstance";
import type { Order, OrderItem } from "@/types/order";
import { apiClient, getThumbnailUrl } from "@/lib/apiClient";
import { toast } from "sonner";
import {
  clearReturnRequestKey,
  returnRequestStorage,
  stableReturnRequestKey,
} from "@/lib/return-request-idempotency";

/* ---------- status UI (matches OrderCard) ---------- */
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
  Copy,
} from "lucide-react";
import { buildProductPath } from "@/lib/slug";

/* ---------- Razorpay integration (same as checkout) ---------- */
const loadRazorpayScript = (): Promise<boolean> =>
  new Promise((resolve) => {
    if (typeof window === "undefined") return resolve(false);
    if (document.getElementById("razorpay-checkout-js")) return resolve(true);
    const s = document.createElement("script");
    s.id = "razorpay-checkout-js";
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });

type RazorpaySuccessResponse = {
  razorpay_payment_id?: string;
  razorpay_order_id?: string;
  razorpay_signature?: string;
};

type RazorpayOptions = {
  key: string;
  amount: number;
  currency: string;
  name: string;
  order_id: string;
  prefill?: { name?: string; email?: string; contact?: string };
  handler?: (response: RazorpaySuccessResponse) => void;
  modal?: { ondismiss?: () => void };
};

type RazorpayCheckout = { open: () => void };
type RazorpayConstructor = new (opts: RazorpayOptions) => RazorpayCheckout;

declare global {
  interface Window {
    Razorpay?: RazorpayConstructor;
  }
}

async function openRazorpay(opts: {
  orderId: string;
  amountPaise: number;
  currency?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  onComplete: (
    status: "success" | "dismissed",
    payload?: RazorpaySuccessResponse,
  ) => void | Promise<void>;
}) {
  const ok = await loadRazorpayScript();
  if (!ok || !window.Razorpay) {
    toast.error("Payment initialization failed. Please refresh and try again.");
    return;
  }

  const key = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
  if (!key) {
    toast.error("Missing Razorpay key.");
    return;
  }

  const rzp = new window.Razorpay({
    key,
    amount: opts.amountPaise,
    currency: opts.currency ?? "INR",
    name: "Babas Camera Store",
    order_id: opts.orderId,
    prefill: {
      name: opts.customerName,
      email: opts.customerEmail,
      contact: opts.customerPhone,
    },
    handler: (payload) => {
      void opts.onComplete("success", payload);
    },
    modal: {
      ondismiss: () => {
        void opts.onComplete("dismissed");
      },
    },
  });

  rzp.open();
}



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

type Theme = {
  text: string;
  bg: string;
  icon: React.ComponentType<{ className?: string }>;
};

const STATUS_THEME: Record<string, Theme> = {
  PENDING:            { text: "text-amber-700",   bg: "bg-amber-100",   icon: Clock },
  PLACED:             { text: "text-sky-700",     bg: "bg-sky-100",     icon: PackageCheck },
  CONFIRMED:          { text: "text-blue-700",    bg: "bg-blue-100",    icon: CheckCircle2 },
  DISPATCHED:         { text: "text-indigo-700",  bg: "bg-indigo-100",  icon: Truck },
  PACKED:             { text: "text-indigo-700",  bg: "bg-indigo-100",  icon: Box },
  SHIPPED:            { text: "text-teal-700",    bg: "bg-teal-100",    icon: Truck },
  OUT_OF_DELIVERY:    { text: "text-cyan-700",    bg: "bg-cyan-100",    icon: Navigation },
  DELIVERED:          { text: "text-emerald-700", bg: "bg-emerald-100", icon: FileCheck2 },
  CANCELLED:          { text: "text-rose-700",    bg: "bg-rose-100",    icon: PackageX },
  RETURNED:           { text: "text-orange-700",  bg: "bg-orange-100",  icon: Undo2 },
  REFUNDED:           { text: "text-lime-700",    bg: "bg-lime-100",    icon: CircleDollarSign },
  FAILED:             { text: "text-red-700",     bg: "bg-red-100",     icon: AlertOctagon },
};

function DeliveryTrackingCard({
  partnerName,
  trackingId,
  url,
  onTrackClick,
}: {
  partnerName?: string;
  trackingId?: string;
  url?: string;
  onTrackClick?: () => void;
}) {
  const handleCopy = () => {
    if (trackingId) {
      navigator.clipboard.writeText(trackingId);
      toast.success("Tracking ID copied to clipboard");
    }
  };

  return (
    <div className="rounded-lg border bg-white p-4 sm:p-5">
      <h2 className="text-[16px] sm:text-[18px] font-semibold mb-3">
        Order Tracking
      </h2>
      <hr className="mb-4" />

      <div className="grid grid-cols-2 gap-4 text-sm sm:text-base">
        {/* Partner Name */}
        <div>
          <div className="text-gray-600 font-medium">Delivery Partner</div>
          <div className="mt-1 text-gray-900 font-semibold">
            {partnerName || <span className="opacity-60">—</span>}
          </div>
        </div>

        {/* Tracking ID with Copy */}
        <div>
          <div className="text-gray-600 font-medium">Tracking ID</div>
          <div className="mt-1 flex items-center gap-2 text-gray-900 font-semibold break-all">
            {trackingId ? (
              <>
                <span>{trackingId}</span>
                <button
                  onClick={handleCopy}
                  title="Copy Tracking ID"
                  className="p-1 rounded-md hover:bg-gray-100 transition"
                >
                  <Copy className="h-4 w-4 text-gray-600" />
                </button>
              </>
            ) : (
              <span className="opacity-60">—</span>
            )}
          </div>
        </div>
      </div>

      {/* Track button only if URL exists */}
      {url && (
        <div className="mt-4">
          <button
            type="button"
            onClick={onTrackClick}
            className="inline-flex items-center rounded-full border border-[#E72429] px-4 py-1.5 text-sm font-semibold text-[#E72429] hover:bg-[#E72429]/5 focus:outline-none focus:ring-2 focus:ring-[#E72429]/40"
          >
            Track Order
          </button>
        </div>
      )}
    </div>
  );
}



export function genericTrack(
  partnerName?: string,
  trackingId?: string,
  url?: string
) {
  if (!url) return;
  const href = /^https?:\/\//i.test(url) ? url : `https://${url}`;
  try {
    window.open(href, "_blank", "noopener,noreferrer");
  } catch {
    toast.error("Unable to open tracking link");
  }
}



function getStatusMeta(status?: string) {
  const raw = (status || "PLACED").toUpperCase();
  const compact = raw.replace(/[^A-Z]/g, ""); // remove spaces/_/-
  const ALIAS: Record<string, string> = {
    OUTFORDELIVERY: "OUT_OF_DELIVERY",
    OUT_OF_DELIVERY: "OUT_OF_DELIVERY",
    PENDING: "PENDING",
    PLACED: "PLACED",
    CONFIRMED: "CONFIRMED",
    DISPATCHED: "DISPATCHED",
    PACKED: "PACKED",
    SHIPPED: "SHIPPED",
    DELIVERED: "DELIVERED",
    CANCELLED: "CANCELLED",
    RETURNED: "RETURNED",
    REFUNDED: "REFUNDED",
    FAILED: "FAILED",
  };

  const key = ALIAS[compact] ?? "PLACED";
  const theme = STATUS_THEME[key] ?? { text: "text-gray-700", bg: "bg-gray-100", icon: FileCheck2 };
  const label = STATUS_LABEL[key] ?? "Order Placed";
  return { label, ...theme };
}

/* ---------- helpers ---------- */
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

function formatINR(amount: number | undefined): string {
  if (amount == null || Number.isNaN(amount)) return "₹0";
  const isInteger = Number.isInteger(amount);
  return amount.toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: isInteger ? 0 : 2,
    maximumFractionDigits: 2,
  });
}

function formatDate(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

/** Single product card */
function ItemCard({ item }: { item: OrderItem }) {
  const name =
    (typeof item.product !== "string" && item.product?.name) ||
    item.name ||
    "Product";

  const brandName =
    (typeof item.product !== "string" && item.product?.brand?.name) ||
    item.brandName;

  // ✅ Get product object safely, then id + slug
  const productObj =
    typeof item.product !== "string" ? item.product : null;

  const productId = productObj?._id;
  const productSlug = productObj?.slug;

  // ✅ Build the SEO path once
  const productHref = productId
    ? buildProductPath({ _id: productId, slug: productSlug })
    : undefined;

  const key = productObj?.images?.[0]?.key;

  const initialSrc = useMemo(
    () => (key ? getThumbnailUrl(key) : PLACEHOLDER_DATAURI),
    [key]
  );
  const [imgSrc, setImgSrc] = useState<string>(initialSrc);

  const Img = (
    <Image
      src={imgSrc}
      alt={name}
      width={92}
      height={92}
      className="rounded-md object-contain w-[84px] h-[84px] sm:w-[92px] sm:h-[92px]"
      onError={() => setImgSrc(PLACEHOLDER_DATAURI)}
    />
  );

return (
  <div className="mb-4 flex min-h-[160px] w-full items-center gap-4 overflow-hidden rounded-lg border bg-white p-4 sm:p-6">
    {/* Image */}
    {productHref ? (
      <Link href={productHref} aria-label={`View ${name}`}>
        <Image
          src={imgSrc}
          alt={name}
          width={92}
          height={92}
          className="rounded-md object-contain w-[70px] h-[70px] sm:w-[92px] sm:h-[92px]"
          onError={() => setImgSrc(PLACEHOLDER_DATAURI)}
        />
      </Link>
    ) : (
      <Image
        src={imgSrc}
        alt={name}
        width={92}
        height={92}
        className="rounded-md object-contain w-[70px] h-[70px] sm:w-[92px] sm:h-[92px]"
        onError={() => setImgSrc(PLACEHOLDER_DATAURI)}
      />
    )}

    {/* Details */}
    <div className="min-w-0 flex-1">
      {brandName && (
        <div className="text-[10px] sm:text-[12px] tracking-wide uppercase text-gray-500 mb-1 truncate">
          {brandName}
        </div>
      )}

      <h2
        style={{ color: "rgba(0, 0, 0, 0.80)", fontWeight: 650 }}
        className="truncate text-[15px] sm:text-[22px] leading-snug"
      >
        {name}
      </h2>

      {/* Price + Qty */}
      <div
        className="
          mt-2 flex flex-col sm:flex-row sm:items-center sm:gap-3
          items-start gap-1
        "
      >
        {item.actualPrice && item.actualPrice > (item.salePrice ?? 0) && (
          <span className="text-[11px] sm:text-sm text-gray-400 line-through">
            {formatINR(item.actualPrice)}
          </span>
        )}

        {/* Group sale price and qty together */}
        <div className="flex items-center gap-1 sm:gap-2">
          <span className="text-base sm:text-lg font-bold">
            {formatINR(item.salePrice)}
          </span>
          <span className="text-xs sm:text-sm text-gray-600">
            × {item.quantity}
          </span>
        </div>
      </div>
    </div>

    {/* Total */}
    <div className="flex items-center justify-center text-right">
      <span className="text-sm sm:text-lg font-bold text-black">
        {formatINR(item.price)}
      </span>
    </div>
  </div>
);

}

/* ---------- page ---------- */
export default function OrderDetailsPage() {
  const params = useParams();
  const id = String(params?.id ?? "");
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [submittingAction, setSubmittingAction] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getOrderById(id);
        setOrder(data);
      } catch (err: unknown) {
        const msg =
          err && typeof err === "object" && "message" in err
            ? String((err as { message?: string }).message)
            : "Failed to load order";
        setError(msg);
        toast.error(msg);
        console.error("[OrderDetailsPage] fetch error:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const submitOrderAction = async (action: "cancel" | "return") => {
    if (!id) return;
    const promptLabel = action === "cancel" ? "cancellation" : "return";
    const reason = window.prompt(`Please provide a reason for the ${promptLabel}:`);
    if (!reason?.trim()) return;
    try {
      setSubmittingAction(true);
      const idempotencyKey =
        action === "return"
          ? stableReturnRequestKey(id, reason, returnRequestStorage())
          : undefined;
      const { data } = await apiClient.post(`/order/${id}/${action}`, {
        reason: reason.trim(),
        idempotencyKey,
      });
      if (!data?.success) throw new Error(data?.message || "Request failed.");
      if (action === "return") {
        clearReturnRequestKey(id, returnRequestStorage());
      }
      const refreshed = await getOrderById(id);
      setOrder(refreshed);
      toast.success(
        action === "cancel"
          ? "Cancellation requested."
          : "Return request submitted.",
      );
    } catch (actionError) {
      toast.error(
        actionError instanceof Error ? actionError.message : "Request failed.",
      );
    } finally {
      setSubmittingAction(false);
    }
  };

  /* ---------- skeleton ---------- */
  if (loading) {
    return (
      <div className="constrained-width py-8">
        <div className="h-8 w-48 mb-6 rounded bg-gray-200 animate-pulse" />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="rounded-lg border bg-white p-4 sm:p-6">
                <div className="animate-pulse">
                  <div className="flex items-start justify-between gap-4">
                    <div className="h-6 w-40 rounded bg-gray-200" />
                    <div className="h-6 w-48 rounded bg-gray-200" />
                  </div>
                  <hr className="my-3" />
                  <div className="flex items-center gap-4">
                    <div className="h-[84px] w-[84px] sm:h-[92px] sm:w-[92px] rounded bg-gray-200" />
                    <div className="flex-1 space-y-2">
                      <div className="h-6 w-2/3 rounded bg-gray-200" />
                      <div className="h-5 w-24 rounded bg-gray-200" />
                    </div>
                    <div className="h-9 w-9 rounded-full bg-gray-100" />
                  </div>
                </div>
              </div>
            ))}
          </div>
          <aside className="space-y-4">
            <div className="rounded-lg border bg-white p-4 sm:p-6 animate-pulse">
              <div className="h-6 w-40 rounded bg-gray-200" />
              <div className="mt-4 h-24 rounded bg-gray-100" />
              <div className="mt-4 h-36 rounded bg-gray-100" />
              <div className="mt-4 h-8 w-40 rounded bg-gray-200 ml-auto" />
            </div>
          </aside>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="constrained-width py-12 text-center">
        <h1 className="mb-4 text-2xl font-semibold">Order not available</h1>
        <p className="text-gray-500">{error ?? "Try again later."}</p>
        <div className="mt-6">
          <Link href="/orders" className="inline-flex items-center rounded-md bg-black px-4 py-2 text-white hover:opacity-90">
            Back to Orders
          </Link>
        </div>
      </div>
    );
  }

  const placedAt = formatDate(order.placedAt || order.createdAt);
  const itemsTotal = order.summary?.items ?? 0;
  const grandTotal = order.summary?.total ?? 0;
  const deliveryCharge = Number(order.summary?.deliveryCharge ?? 0);
  const platformCharges = Number(order.summary?.platformCharges ?? 0);


  const orderPaymentStatus = order.orderPaymentStatus;
  const shipping = order.shippingAddress;
  const canDownloadInvoice = (orderPaymentStatus || "").toUpperCase() === "SUCCESS";
  const shouldShowDelivery =
  !!order.deliveryDetails?.trackingId &&
  ["SHIPPED", "DELIVERED", "COMPLETED"].includes(order.orderStatus);
  const normalizedOrderStatus = String(order.orderStatus).toUpperCase();
  const canCancel = ["PENDING", "PLACED", "CONFIRMED"].includes(normalizedOrderStatus);
  const canRequestReturn = normalizedOrderStatus === "DELIVERED";

//   function copyToClipboard(txt: string) {
//   if (!txt) return;
//   navigator.clipboard?.writeText(txt).then(
//     () => toast.success("Tracking ID copied"),
//     () => toast.error("Unable to copy")
//   );
// }

  async function handleDownloadInvoice() {
    if (!order) return;
    try {
      setDownloading(true);

      const { blob, filename } = await fetchInvoiceFile(order._id);
      const safeName =
        filename ||
        `${order.invoiceCode || order.code || "invoice"}.pdf`;

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = safeName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      toast.success("Invoice downloaded");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to download invoice";
      toast.error(msg);
      console.error("[OrderDetailsPage] invoice error:", e);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="constrained-width py-8">
      <h1 className="mb-6 text-2xl sm:text-3xl font-semibold">Order details</h1>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* LEFT SECTION */}
        <div className="space-y-6 lg:col-span-2">
          <div className="rounded-lg border bg-white p-4 sm:p-6">
            {/* Header row (status badge style copied from OrderCard) */}
            {(() => {
              const { label, text: statusText, bg, icon: Icon } = getStatusMeta(order.orderStatus);
              return (
                <div className="mb-4 sm:mb-6 flex flex-col items-start justify-between gap-3 sm:flex-row">
                  <div className="min-w-0">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs sm:text-sm font-medium ${bg} ${statusText}`}
                    >
                      <Icon className="h-4 w-4" />
                      {label}
                    </span>

                    {placedAt && (
                      <p className="mt-2 text-muted-foreground text-[12px] sm:text-[13px]">
                        on {placedAt}
                      </p>
                    )}
                  </div>

                  <div className="text-sm sm:text-base text-left">
                    <p className="text-gray-600">
                      <span className="font-[750]">Order Code :</span>{" "}
                      <span className="font-[500]">{order.code}</span>
                    </p>
                    <p className="text-gray-600">
                      <span className="font-[750]">Payment :</span>{" "}
                      <span className="font-[500]">{order.orderPaymentStatus}</span>
                    </p>
                  </div>
                </div>
              );
            })()}

            {/* Products */}
            {order.items?.map((it, idx) => (
              <ItemCard key={idx} item={it} />
            ))}
            
          </div>
                {shouldShowDelivery && (
  <div className="hidden lg:block mt-6">
     <DeliveryTrackingCard
      partnerName={order.deliveryDetails?.partnerName}
      trackingId={order.deliveryDetails?.trackingId}
      url={order.deliveryDetails?.url}
      onTrackClick={() =>
        genericTrack(
          order.deliveryDetails?.partnerName,
          order.deliveryDetails?.trackingId,
          order.deliveryDetails?.url
        )
      }
    />
  </div>
)}


        </div>



        {/* RIGHT SECTION → Summary + Shipping */}
        <aside>
          <div className="space-y-6 rounded-lg border bg-white p-4 sm:p-6">

            {/* Payment Summary */}
            <div>
              <h2
                className="mb-4"
                style={{ color: "black", fontSize: "22px", fontWeight: 650, lineHeight: "28px" }}
              >
                Payment Summary
              </h2>
              <hr />
              <div className="mt-4 flex flex-col space-y-[10px] text-sm sm:text-base">
                <div className="flex justify-between">
                  <span>Items</span>
                  <span>{formatINR(itemsTotal)}</span>
                </div>

                <div className="flex justify-between">
                  <span>Delivery</span>
                  <span>{formatINR(deliveryCharge)}</span>
                </div>
                {platformCharges > 0 && (
                  <div className="flex justify-between">
                    <span>Payment Gateway Fee (2% + GST)</span>
                    <span>{formatINR(platformCharges)}</span>
                  </div>
                )}

                <div className="mt-3 flex justify-between">
                  <span className="font-extrabold text-black">Total</span>
                  <span className="font-extrabold text-black">{formatINR(grandTotal)}</span>
                </div>
              </div>


              {/* ✅ Show Complete Payment button when INITIATED */}
{/* ✅ Show Complete Payment button if payment is pending (INITIATED) */}
{order.orderPaymentStatus === "INITIATED" &&
  order.payment?.paymentGateway === "RAZORPAY" && (
    <div className="mt-4">
      {order.payment?.razorpayGatewayDetails?.type === "PAYMENT_ORDER" ? (
        <button
          onClick={async () => {
            const razorOrderId =
              order.payment?.razorpayGatewayDetails?.orderId;
            if (!razorOrderId) {
              toast.error("Missing Razorpay order ID.");
              return;
            }
            const amount = order.summary?.total ?? 0;
            const amountPaise = Math.round(Number(amount) * 100);

            await openRazorpay({
              orderId: razorOrderId,
              amountPaise,
              customerName: order.shippingAddress?.name,
              customerEmail: order.user?.email,
              customerPhone: order.shippingAddress?.phone,
              onComplete: async (status, payload) => {
                if (status === "success") {
                  if (!payload) {
                    toast.error("Payment response was incomplete.");
                    return;
                  }
                  try {
                    await apiClient.post("/payments/razorpay/verify", payload, {
                      showToast: false,
                    });
                    toast.success("Payment verified successfully.");
                    const refreshed = await getOrderById(id);
                    setOrder(refreshed);
                  } catch (verificationError) {
                    toast.error("Payment verification failed.", {
                      description:
                        verificationError instanceof Error
                          ? verificationError.message
                          : "Please check your order before retrying.",
                    });
                  }
                } else {
                  toast("Payment window closed.");
                }
              },
            });
          }}
          className="w-full bg-[#E72429] hover:bg-[#c71e23] text-white font-semibold py-2 rounded-md transition-all"
        >
          Complete Payment
        </button>
      ) : order.payment?.razorpayGatewayDetails?.type === "PAYMENT_LINK" ? (
        <a
          href={order.payment?.razorpayGatewayDetails?.paymentLink}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full text-center bg-[#E72429] hover:bg-[#c71e23] text-white font-semibold py-2 rounded-md transition-all"
        >
          Pay Now via Razorpay
        </a>
      ) : null}
    </div>
  )}


              {/* Download Invoice (only when SUCCESS) */}
              {canDownloadInvoice && (
                <div className="mt-4 flex justify-end">
                  <button
                    onClick={handleDownloadInvoice}
                    disabled={downloading}
                    className="text-[#E72429] hover:opacity-80 underline disabled:opacity-60 bg-transparent px-0 py-0 text-sm sm:text-base font-semibold"
                    title="Download Invoice PDF"
                    aria-label="Download Invoice"
                  >
                    {downloading ? "Downloading…" : "Download Invoice"}
                  </button>
                </div>
              )}

              {(canCancel || canRequestReturn) && (
                <div className="mt-4 flex flex-wrap justify-end gap-3">
                  {canCancel && (
                    <button
                      type="button"
                      disabled={submittingAction}
                      onClick={() => void submitOrderAction("cancel")}
                      className="rounded-full border border-red-600 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                    >
                      Request cancellation
                    </button>
                  )}
                  {canRequestReturn && (
                    <button
                      type="button"
                      disabled={submittingAction}
                      onClick={() => void submitOrderAction("return")}
                      className="rounded-full border border-orange-600 px-4 py-2 text-sm font-semibold text-orange-700 hover:bg-orange-50 disabled:opacity-50"
                    >
                      Request return
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Shipping Address */}
            {shipping && (
              <div>
                <h2
                  className="mb-3"
                  style={{ color: "black",fontSize: "18px", fontWeight: 650 }}
                >
                  Shipping Address
                </h2>
                <div className="rounded-md bg-gray-50 p-3 text-sm text-gray-700 leading-6">
                  <div className="font-semibold">{shipping.name}</div>
                  {shipping.phone && <div>{shipping.phone}</div>}
                  <div className="mt-1">
                    {[shipping.building, shipping.line1, shipping.line2, shipping.landmark]
                      .filter(Boolean)
                      .join(", ")}
                  </div>
                  <div>
                    {[shipping.city, shipping.state, shipping.postalCode].filter(Boolean).join(", ")}
                  </div>
                  {shipping.country && <div>{shipping.country}</div>}
                </div>
              </div>
            )}
          </div>
        </aside>
       {shouldShowDelivery && (
        <div className="lg:hidden mt-6">
           <DeliveryTrackingCard
      partnerName={order.deliveryDetails?.partnerName}
      trackingId={order.deliveryDetails?.trackingId}
      url={order.deliveryDetails?.url}
      onTrackClick={() =>
        genericTrack(
          order.deliveryDetails?.partnerName,
          order.deliveryDetails?.trackingId,
          order.deliveryDetails?.url
        )
      }
    />
        </div>
)}

      </div>
    </div>
  );
}
