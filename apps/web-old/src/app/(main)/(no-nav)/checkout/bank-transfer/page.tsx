// D:\work\Babas_Ecommerce_Web\src\app\(main)\(no-nav)\checkout\bank-transfer\page.tsx
"use client";

import React, { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import type { AppDispatch, RootState } from "@/store";
import {
  selectCartItems,
  selectCartLoading,
  selectCartError,
  fetchCart,
  clearCart,
  selectCheckoutContext,
  selectIsBuyNowCheckout,
  selectBuyNowContext,
  selectCheckoutAddressId,
  setCheckoutAddress,
  clearCheckoutContext,
} from "@/store/slice/cartSlice";

import { getUserAddresses } from "@/instances/profileInstance";
import type { Address } from "@/types/profile";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { checkoutCart, createOrder, createBuyNowOrder } from "@/instances/cartInstance";

import { getSpecificSettings } from "@/instances/settingsInstance";
import type { DeliverySettings } from "@/types/settings";
import { apiClient } from "@/lib/apiClient";

import UPIQRCodeCard from "@/components/payments/UPIQRCodeCard";

/* ---------- helpers ---------- */
const toNumber = (v: unknown): number => {
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
};

type UploadApiResponse = {
  success?: boolean;
  result?: { _id?: string } | null;
  data?: { _id?: string } | null;
  _id?: string;
};

type CreateOrderResponseLite = {
  success?: boolean;
  message?: string;
};

type BankTransferOrderPayload = {
  totalOrderPrice: number;
  shippingAddress: string;
  method: "BANK_TRANSFER";
  bankTransferDetails: {
    referenceNumber: string;
    accountName: string;
    proofFile?: string | null;
  };
};

const DELIVERY_DEFAULTS: Required<DeliverySettings> = {
  enableFreeDelivery: true,
  deliveryChargeFlat: 100,
  freeDeliveryThreshold: 3000,
};

type ProductLite = {
  _id: string;
  name: string;
  slug?: string;
  price?: { salePrice?: number };
  quantity?: number;
  images?: Array<{ key: string }>;
  brand?: { name?: string };
  category?: { name?: string };
};

function BankTransferInner() {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();

  // Store context
  const checkoutCtx = useSelector(selectCheckoutContext);
  const isBuyNowFlow = useSelector(selectIsBuyNowCheckout);
  const buyNowCtx = useSelector(selectBuyNowContext);
  const storeAddressId = useSelector(selectCheckoutAddressId);

  const cartItems = useSelector(selectCartItems);
  const cartLoading = useSelector(selectCartLoading);
  const cartError = useSelector(selectCartError);

  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(storeAddressId);
  useEffect(() => {
    if (storeAddressId) setSelectedAddressId(storeAddressId);
  }, [storeAddressId]);

  const [deliverySettings, setDeliverySettings] =
    useState<Required<DeliverySettings>>(DELIVERY_DEFAULTS);

  // Buy-Now product (when buy-now flow)
  const [buyNowProduct, setBuyNowProduct] = useState<ProductLite | null>(null);
  const buyNowProductId = buyNowCtx?.productId ?? null;
  const buyNowQty = Math.max(1, buyNowCtx?.quantity ?? 1);

  const [referenceNumber, setReferenceNumber] = useState("");
  const [amountString, setAmountString] = useState("");
  const [bankName] = useState("SOUTH INDIAN BANK");

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [proofFileId, setProofFileId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // HYDRATION GATE
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);

  // Load base data
  useEffect(() => {
    (async () => {
      try {
        const data = await getSpecificSettings("Delivery");
        setDeliverySettings({
          enableFreeDelivery:
            data.enableFreeDelivery ?? DELIVERY_DEFAULTS.enableFreeDelivery,
          deliveryChargeFlat: Math.max(
            0,
            toNumber(data.deliveryChargeFlat ?? DELIVERY_DEFAULTS.deliveryChargeFlat)
          ),
          freeDeliveryThreshold: Math.max(
            0,
            toNumber(data.freeDeliveryThreshold ?? DELIVERY_DEFAULTS.freeDeliveryThreshold)
          ),
        });
      } catch {
        setDeliverySettings(DELIVERY_DEFAULTS);
      }
    })();

    (async () => {
      try {
        const list = await getUserAddresses();
        const arr = Array.isArray(list) ? list : [];
        const nextId =
          (storeAddressId && arr.some((a) => a._id === storeAddressId) && storeAddressId) ||
          (arr.find((a: Address) => a.isDefault)?._id ?? arr[0]?._id ?? null);
        setSelectedAddressId(nextId ?? null);
        if (nextId) dispatch(setCheckoutAddress(nextId));
      } catch {
        setSelectedAddressId(null);
      }
    })();

    // Cart is only needed if not buy-now
    if (!isBuyNowFlow) {
      dispatch(fetchCart());
    }
  }, [dispatch, isBuyNowFlow, storeAddressId]);

  // Load Buy-Now product when needed
  useEffect(() => {
    let ignore = false;
    if (!isBuyNowFlow || !buyNowProductId) {
      setBuyNowProduct(null);
      return;
    }
    (async () => {
      try {
        const { getProductById } = await import("@/instances/productInstance");
        const p = await getProductById(buyNowProductId);
        if (!ignore && p?._id) {
          setBuyNowProduct({
            _id: p._id,
            name: p.name,
            slug: p.slug,
            price: p.price,
            quantity: p.quantity,
            images: p.images,
            brand: p.brand,
            category: p.category,
          });
        }
      } catch {
        if (!ignore) setBuyNowProduct(null);
      }
    })();
    return () => {
      ignore = true;
    };
  }, [isBuyNowFlow, buyNowProductId]);

  const itemsTotal = useMemo(() => {
    if (isBuyNowFlow) {
      const price = toNumber(buyNowProduct?.price?.salePrice);
      return price * buyNowQty;
    }
    // cart flow
    return cartItems.reduce((sum, item) => {
      const price = toNumber(item?.product?.price?.salePrice);
      const qty = toNumber(item?.quantity);
      return sum + price * qty;
    }, 0);
  }, [isBuyNowFlow, buyNowProduct, buyNowQty, cartItems]);

  const deliveryCharge = useMemo(() => {
    if (itemsTotal <= 0) return 0;
    const { enableFreeDelivery, freeDeliveryThreshold, deliveryChargeFlat } = deliverySettings;

    if (!enableFreeDelivery) {
      return Math.max(0, toNumber(deliveryChargeFlat));
    }
    return itemsTotal >= toNumber(freeDeliveryThreshold)
      ? 0
      : Math.max(0, toNumber(deliveryChargeFlat));
  }, [itemsTotal, deliverySettings]);

  const baseTotal = itemsTotal + deliveryCharge;

  useEffect(() => {
    setAmountString(baseTotal.toFixed(2));
  }, [baseTotal]);

  const itemCount = useMemo(
    () => (isBuyNowFlow ? buyNowQty : cartItems.reduce((c, it) => c + (toNumber(it?.quantity) || 0), 0)),
    [isBuyNowFlow, buyNowQty, cartItems]
  );

  const onPickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    if (!f) return;

    const okTypes = [
      "image/png",
      "image/jpeg",
      "image/jpg",
      "image/webp",
      "application/pdf",
      "image/heic",
      "image/heif",
    ];
    if (!okTypes.includes(f.type)) {
      toast.error("Unsupported file", { description: "Upload PNG/JPG/WebP/PDF." });
      return;
    }
    setSelectedFile(f);
  };

  const uploadProof = async (file: File): Promise<string | null> => {
    try {
      setUploading(true);
      const fd = new FormData();
      fd.append("file", file);

      const res = await apiClient.post<UploadApiResponse>("/file", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const id =
        res.data?.result?._id ??
        res.data?.data?._id ??
        res.data?._id ??
        null;

      setUploading(false);
      return id;
    } catch (err) {
      setUploading(false);
      console.error("Upload failed:", err);
      return null;
    }
  };

  const canSubmit =
    !!selectedAddressId &&
    !!referenceNumber.trim() &&
    (!!selectedFile || !!proofFileId) &&
    !uploading &&
    baseTotal > 0;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedAddressId) {
      toast.error("Address required", { description: "Please select or add a delivery address." });
      return;
    }
    if (!referenceNumber.trim()) {
      toast.error("Reference number required");
      return;
    }
    if (!selectedFile && !proofFileId) {
      toast.error("Attachment required", { description: "Please attach a screenshot or PDF." });
      return;
    }

    try {
      let proofId = proofFileId;
      if (!proofId && selectedFile) {
        proofId = await uploadProof(selectedFile);
        if (!proofId) {
          toast.error("Upload failed", { description: "Please try another file (image/pdf)." });
          return;
        }
        setProofFileId(proofId);
      }

      if (isBuyNowFlow) {
        // BUY NOW + BANK TRANSFER via /order/buy-now
        if (!buyNowProduct || !buyNowProduct._id) {
          toast.error("Product not found", { description: "Please go back and try again." });
          return;
        }

        const payload = {
          products: [{ product: buyNowProduct._id, quantity: buyNowQty }],
          shippingAddress: selectedAddressId,
          totalOrderPrice: Number(amountString),
          method: "BANK_TRANSFER" as const,
          bankTransferDetails: {
            referenceNumber: referenceNumber.trim(),
            accountName: bankName,
            proofFile: proofId,
          },
        };

        await createBuyNowOrder(payload);
        dispatch(clearCheckoutContext());
        toast.success("Order created", {
          description: "We’ll verify your payment and update the order status.",
        });
        router.replace("/orders");
        return;
      }

      // CART + BANK TRANSFER via /order/user
      await checkoutCart();

      const payload: BankTransferOrderPayload = {
        totalOrderPrice: Number(amountString),
        shippingAddress: selectedAddressId,
        method: "BANK_TRANSFER",
        bankTransferDetails: {
          referenceNumber: referenceNumber.trim(),
          accountName: bankName,
          proofFile: proofId,
        },
      };

      const resp = (await createOrder(payload)) as CreateOrderResponseLite | undefined;
      const ok = resp?.success ?? true;
      if (!ok) throw new Error(resp?.message || "Order creation failed");

      dispatch(clearCart());
      dispatch(clearCheckoutContext());
      toast.success("Order created", {
        description: "We’ll verify your payment and update the order status.",
      });
      router.replace("/orders");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Try again.";
      toast.error("Could not create order", { description: msg });
    }
  };

  // ---- Stable SSR output (prevents hydration mismatch) ----
  if (!hydrated) {
    return (
      <div className="min-h-screen constrained-width">
        <h1 className="text-[24px] font-[650] text-[#1E293B] pt-6 mb-1">Payment Details</h1>
        <main className="mx-auto py-8 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Preparing payment details…</p>
          </div>
        </main>
      </div>
    );
  }

  const isEmptyServerMessage =
    typeof cartError === "string" && cartError.toLowerCase().includes("cart is empty");

  // Show “No items to pay for” only if: NOT buy-now AND cart empty
  if (!isBuyNowFlow && (isEmptyServerMessage || cartItems.length === 0)) {
    return (
      <div className="min-h-screen constrained-width">
        <h1 className="text-[24px] font-[650] text-[#1E293B] pt-6 mb-1">Payment Details</h1>
        <main className="mx-auto py-8 text-center">
          <h2 className="text-2xl font-semibold">No items to pay for</h2>
          <p className="text-gray-600 mt-2">Please add items to your cart.</p>
          <div className="mt-6">
            <Button onClick={() => router.push("/products")} variant="babas" size="babas">
              Continue Shopping
            </Button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen constrained-width">
      <h1 className="text-[24px] font-[650] text-[#1E293B] pt-4 mb-1">Payment Details</h1>

      {/* Desktop: 2 cols (Left content; Right = QR) */}
      <main className="mx-auto py-4 grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* LEFT (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Transfer Details */}
          <div className="bg-white border border-[#E4E4E7] rounded-2xl p-5">
            <h1 className="text-[24px] font-[650] text-[#000000B2] mb-4">Transfer Details</h1>

            <div className="border-t border-[#E4E4E7] pt-3 mb-4">
              <p className="text-[20px] font-[500] text-[#000000B2] mb-6">
                Please enter your transaction details after completing the bank transfer.
              </p>

              <form onSubmit={onSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {/* Reference number */}
                <div className="col-span-1">
                  <label className="block text-sm font-medium text-[#1E293B] mb-2">
                    Reference Number<span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={referenceNumber}
                    onChange={(e) => setReferenceNumber(e.target.value)}
                    placeholder="e.g., UTR / Transaction ID"
                    required
                  />
                </div>

                {/* Amount (prefilled) */}
                <div className="col-span-1">
                  <label className="block text-sm font-medium text-[#1E293B] mb-2">
                    Amount<span className="text-red-500">*</span>
                  </label>
                  <Input value={`₹${amountString}`} readOnly />
                </div>

                {/* Bank */}
                <div className="col-span-1">
                  <label className="block text-sm font-medium text-[#1E293B] mb-2">
                    Bank<span className="text-red-500">*</span>
                  </label>
                  <Input value={bankName} readOnly />
                </div>

                {/* Attachment */}
                <div className="col-span-1">
                  <label className="block text-sm font-medium text-[#1E293B] mb-2">
                    Attachment (screenshot/PDF)<span className="text-red-500">*</span>
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp,application/pdf,image/heic,image/heif"
                      onChange={onPickFile}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      className="border border-[#E72429] text-[#E72429] rounded-full px-5 py-1.5 text-sm font-semibold transition-colors duration-200 hover:bg-[#E72429] hover:text-white disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                      {uploading ? "Uploading..." : selectedFile ? "Replace File" : "Upload Files"}
                    </button>
                    {selectedFile && (
                      <span className="text-xs text-green-700">Selected: {selectedFile.name}</span>
                    )}
                  </div>
                </div>

                {/* Submit */}
                <div className="col-span-1 sm:col-span-2">
                  <Button
                    type="submit"
                    variant="babas"
                    size="babas"
                    className="w-full sm:w-[200px] rounded-4xl"
                    disabled={!canSubmit}
                  >
                    Submit
                  </Button>
                </div>
              </form>
            </div>
          </div>

          {/* Bank Details + Payment Summary row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white border border-[#E4E4E7] rounded-2xl p-5">
              <h3 className="text-[22px] font-[650] text-[#1E293B] mb-4">Bank Details</h3>
              <div className="border-t border-[#E4E4E7] pt-3">
                <div className="rounded-xl border border-[#E4E4E7] p-4">
                  <p className="text-[16px] font-[600]">SOUTH INDIAN BANK</p>
                  <p className="text-sm text-[#6B7280]">Account Name: BABA ENTERPRISES PVT. LTD</p>
                  <p className="text-sm text-[#6B7280]">Branch: CHALAI, TRIVANDRUM</p>
                  <p className="text-sm text-[#6B7280]">Account Number: 6877908234169</p>
                  <p className="text-sm text-[#6B7280]">IFSC: SBIL0007987</p>
                </div>
              </div>
            </div>

            <div className="bg-white border border-[#E4E4E7] rounded-2xl p-5">
              <h3 className="text-[22px] font-[650] text-[#1E293B] mb-4">Payment Summary</h3>
              <div className="border-t border-[#E4E4E7] pt-3">
                <div className="space-y-3 mb-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-[#3A3A3C]">Items ({itemCount})</span>
                    <span className="text-sm font-medium">
                      ₹{itemsTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-[#3A3A3C]">Delivery</span>
                    <span className="text-sm font-medium">
                      ₹{deliveryCharge.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
                <div className="flex justify-between">
                  <span className="text:[15px] font-[650] text-[#3A3A3C]">Total</span>
                  <span className="text:[15px] font-[650] text-[#3A3A3C]">
                    ₹{Number(baseTotal).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT: QR card only */}
        <aside className="lg:col-span-1">
          <UPIQRCodeCard
            merchantName="M/S.BABA ENTERPRISES PRIVATE LIMITED"
            vpa="babae14000.ibz@icici"
            amountINR={baseTotal} // optional: fixed amount
          />
        </aside>
      </main>
    </div>
  );
}

export default function BankTransferPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen constrained-width">
          <main className="mx-auto py-8 flex items-center justify-center">
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
              <p className="text-gray-600">Loading payment page…</p>
            </div>
          </main>
        </div>
      }
    >
      <BankTransferInner />
    </Suspense>
  );
}

export const dynamic = "force-dynamic";
