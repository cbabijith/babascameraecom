// D:\work\Babas_Ecommerce_Web\src\app\(main)\(no-nav)\checkout\bank-transfer\page.tsx
"use client";

import React, { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import {
  PAYMENT_PROOF_MAX_BYTES,
  isPaymentProofMimeType,
} from "@babas/domain";

import type { AppDispatch } from "@/store";
import {
  selectCartItems,
  selectCartError,
  fetchCart,
  clearCart,
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
import { createOrder, createBuyNowOrder } from "@/instances/cartInstance";

import {
  getBankTransferDisplay,
  type BankTransferDisplay,
} from "@/instances/settingsInstance";
import { apiClient } from "@/lib/apiClient";
import {
  requestCheckoutQuote,
  type AuthoritativeCheckoutQuote,
} from "@/lib/checkout-client";

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

type BankTransferOrderPayload = {
  totalOrderPrice: number;
  shippingAddress: string;
  method: "BANK_TRANSFER";
  idempotencyKey: string;
  checkoutSessionId: string;
  bankTransferDetails: {
    referenceNumber: string;
    accountName: string;
    proofFile?: string | null;
  };
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
  const searchParams = useSearchParams();
  const dispatch = useDispatch<AppDispatch>();

  // Store context
  const storeIsBuyNowFlow = useSelector(selectIsBuyNowCheckout);
  const buyNowCtx = useSelector(selectBuyNowContext);
  const storeAddressId = useSelector(selectCheckoutAddressId);
  const queryBuyNowProductId = searchParams?.get("buyNow") ?? null;
  const queryQuantity = Math.max(1, toNumber(searchParams?.get("qty")) || 1);
  const queryAddressId = searchParams?.get("address") ?? null;
  const isBuyNowFlow = storeIsBuyNowFlow || Boolean(queryBuyNowProductId);
  const requestedAddressId = queryAddressId || storeAddressId;

  const cartItems = useSelector(selectCartItems);
  const cartError = useSelector(selectCartError);

  const [selectedAddressId, setSelectedAddressId] =
    useState<string | null>(requestedAddressId);
  useEffect(() => {
    if (requestedAddressId) setSelectedAddressId(requestedAddressId);
  }, [requestedAddressId]);

  // Buy-Now product (when buy-now flow)
  const [buyNowProduct, setBuyNowProduct] = useState<ProductLite | null>(null);
  const buyNowProductId = queryBuyNowProductId ?? buyNowCtx?.productId ?? null;
  const buyNowQty = queryBuyNowProductId
    ? queryQuantity
    : Math.max(1, buyNowCtx?.quantity ?? 1);

  const [referenceNumber, setReferenceNumber] = useState("");
  const [bankDisplay, setBankDisplay] = useState<BankTransferDisplay | null>(null);
  const [bankSettingsLoaded, setBankSettingsLoaded] = useState(false);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [proofFileId, setProofFileId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // HYDRATION GATE
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);

  // Load base data
  useEffect(() => {
    (async () => {
      try {
        setBankDisplay(await getBankTransferDisplay());
      } catch {
        setBankDisplay(null);
      } finally {
        setBankSettingsLoaded(true);
      }
    })();

    (async () => {
      try {
        const list = await getUserAddresses();
        const arr = Array.isArray(list) ? list : [];
        const nextId =
          (requestedAddressId &&
            arr.some((a) => a._id === requestedAddressId) &&
            requestedAddressId) ||
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
  }, [dispatch, isBuyNowFlow, requestedAddressId]);

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

  const itemCount = useMemo(
    () => (isBuyNowFlow ? buyNowQty : cartItems.reduce((c, it) => c + (toNumber(it?.quantity) || 0), 0)),
    [isBuyNowFlow, buyNowQty, cartItems]
  );

  const [checkoutQuote, setCheckoutQuote] =
    useState<AuthoritativeCheckoutQuote | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const quoteKeyRef = useRef<{ signature: string; key: string } | null>(null);
  const quoteInputSignature = useMemo(
    () =>
      JSON.stringify({
        addressId: selectedAddressId,
        mode: isBuyNowFlow ? "buy_now" : "cart",
        productId: isBuyNowFlow ? buyNowProduct?._id ?? null : null,
        quantity: isBuyNowFlow ? buyNowQty : null,
        cart: isBuyNowFlow
          ? null
          : cartItems.map((item) => ({
              id: item.product?._id ?? "",
              quantity: Math.max(1, toNumber(item.quantity)),
            })),
      }),
    [
      selectedAddressId,
      isBuyNowFlow,
      buyNowProduct?._id,
      buyNowQty,
      cartItems,
    ],
  );

  useEffect(() => {
    const hasItems = isBuyNowFlow ? Boolean(buyNowProduct?._id) : cartItems.length > 0;
    if (!selectedAddressId || !hasItems) {
      setCheckoutQuote(null);
      setQuoteError(null);
      setQuoteLoading(false);
      return;
    }
    if (quoteKeyRef.current?.signature !== quoteInputSignature) {
      quoteKeyRef.current = {
        signature: quoteInputSignature,
        key: crypto.randomUUID(),
      };
    }
    const idempotencyKey = quoteKeyRef.current.key;
    let cancelled = false;
    setCheckoutQuote(null);
    setQuoteError(null);
    setQuoteLoading(true);

    void requestCheckoutQuote({
      mode: isBuyNowFlow ? "buy_now" : "cart",
      addressId: selectedAddressId,
      paymentMethod: "BANK_TRANSFER",
      idempotencyKey,
      items:
        isBuyNowFlow && buyNowProduct?._id
          ? [{ productId: buyNowProduct._id, quantity: buyNowQty }]
          : undefined,
    })
      .then((quote) => {
        if (!cancelled) setCheckoutQuote(quote);
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setQuoteError(
            error instanceof Error
              ? error.message
              : "Unable to confirm the bank-transfer total.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setQuoteLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [
    selectedAddressId,
    isBuyNowFlow,
    buyNowProduct?._id,
    buyNowQty,
    cartItems.length,
    quoteInputSignature,
  ]);

  const itemsTotal = checkoutQuote?.subtotal ?? 0;
  const discount = checkoutQuote?.discount ?? 0;
  const deliveryCharge = checkoutQuote?.delivery ?? 0;
  const tax = checkoutQuote?.tax ?? 0;
  const paymentFee = checkoutQuote?.paymentFee ?? 0;
  const payableTotal = checkoutQuote?.total ?? 0;
  const amountString = checkoutQuote ? checkoutQuote.total.toFixed(2) : "";

  const onPickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    if (!f) return;

    if (!isPaymentProofMimeType(f.type)) {
      toast.error("Unsupported file", { description: "Upload PNG/JPG/WebP/PDF." });
      return;
    }
    if (f.size <= 0 || f.size > PAYMENT_PROOF_MAX_BYTES) {
      toast.error("Invalid file size", {
        description: "Upload a non-empty proof file no larger than 10 MB.",
      });
      return;
    }
    setSelectedFile(f);
  };

  const uploadProof = async (file: File): Promise<string | null> => {
    try {
      setUploading(true);
      const fd = new FormData();
      fd.append("file", file);

      const res = await apiClient.post<UploadApiResponse>(
        "/uploads/bank-transfer",
        fd,
        { showToast: false },
      );

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
    !submitting &&
    !!bankDisplay &&
    !quoteLoading &&
    !!checkoutQuote &&
    checkoutQuote.totalMinor > 0;

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
    if (!checkoutQuote) {
      toast.error("Total unavailable", {
        description: quoteError ?? "Please wait while we confirm the latest total.",
      });
      return;
    }

    let proofId = proofFileId;
    setSubmitting(true);
    try {
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
          totalOrderPrice: checkoutQuote.total,
          method: "BANK_TRANSFER" as const,
          checkoutSessionId: checkoutQuote.checkoutSessionId,
          idempotencyKey: checkoutQuote.idempotencyKey,
          bankTransferDetails: {
            referenceNumber: referenceNumber.trim(),
            accountName: bankDisplay?.account_name ?? "",
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
      const payload: BankTransferOrderPayload = {
        totalOrderPrice: checkoutQuote.total,
        shippingAddress: selectedAddressId,
        method: "BANK_TRANSFER",
        checkoutSessionId: checkoutQuote.checkoutSessionId,
        idempotencyKey: checkoutQuote.idempotencyKey,
        bankTransferDetails: {
          referenceNumber: referenceNumber.trim(),
          accountName: bankDisplay?.account_name ?? "",
          proofFile: proofId,
        },
      };

      await createOrder(payload);

      dispatch(clearCart());
      dispatch(clearCheckoutContext());
      toast.success("Order created", {
        description: "We’ll verify your payment and update the order status.",
      });
      router.replace("/orders");
    } catch (err: unknown) {
      if (proofId) {
        try {
          await apiClient.delete("/uploads/bank-transfer", {
            data: { path: proofId },
            showToast: false,
          });
          setProofFileId(null);
        } catch {
          // The server may already have moved the proof onto an idempotently
          // created order, in which case there is no pending object to remove.
        }
      }
      const msg = err instanceof Error ? err.message : "Try again.";
      toast.error("Could not create order", { description: msg });
    } finally {
      setSubmitting(false);
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
                  <Input
                    value={
                      quoteLoading
                        ? "Confirming total…"
                        : checkoutQuote
                          ? `₹${amountString}`
                          : "Total unavailable"
                    }
                    readOnly
                  />
                </div>

                {quoteError ? (
                  <div className="col-span-1 sm:col-span-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    {quoteError}
                  </div>
                ) : null}

                {/* Bank */}
                <div className="col-span-1">
                  <label className="block text-sm font-medium text-[#1E293B] mb-2">
                    Bank<span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={bankDisplay?.bank_name ?? "Not configured"}
                    readOnly
                  />
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
                      accept="image/png,image/jpeg,image/webp,application/pdf"
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
                    {submitting ? "Submitting…" : "Submit"}
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
                  {!bankSettingsLoaded ? (
                    <p className="text-sm text-[#6B7280]">Loading bank details…</p>
                  ) : bankDisplay ? (
                    <>
                      <p className="text-[16px] font-[600]">{bankDisplay.bank_name}</p>
                      <p className="text-sm text-[#6B7280]">
                        Account Name: {bankDisplay.account_name}
                      </p>
                      {bankDisplay.branch ? (
                        <p className="text-sm text-[#6B7280]">
                          Branch: {bankDisplay.branch}
                        </p>
                      ) : null}
                      <p className="text-sm text-[#6B7280]">
                        Account Number:{" "}
                        {bankDisplay.account_number ??
                          bankDisplay.account_number_masked ??
                          "Not configured"}
                      </p>
                      <p className="text-sm text-[#6B7280]">
                        IFSC: {bankDisplay.ifsc}
                      </p>
                    </>
                  ) : (
                    <p className="text-sm text-amber-700">
                      Bank transfer details are not configured. Please choose another
                      payment method.
                    </p>
                  )}
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
                  {discount > 0 ? (
                    <div className="flex justify-between text-green-700">
                      <span className="text-sm">Discount</span>
                      <span className="text-sm font-medium">
                        -₹{discount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  ) : null}
                  <div className="flex justify-between">
                    <span className="text-sm text-[#3A3A3C]">Delivery</span>
                    <span className="text-sm font-medium">
                      ₹{deliveryCharge.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  {tax > 0 ? (
                    <div className="flex justify-between">
                      <span className="text-sm text-[#3A3A3C]">Tax</span>
                      <span className="text-sm font-medium">
                        ₹{tax.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  ) : null}
                  {paymentFee > 0 ? (
                    <div className="flex justify-between">
                      <span className="text-sm text-[#3A3A3C]">Payment fee</span>
                      <span className="text-sm font-medium">
                        ₹{paymentFee.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  ) : null}
                </div>
                <div className="flex justify-between">
                  <span className="text:[15px] font-[650] text-[#3A3A3C]">Total</span>
                  <span className="text:[15px] font-[650] text-[#3A3A3C]">
                    ₹{payableTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT: QR card only */}
        <aside className="lg:col-span-1">
          {bankDisplay?.upi_id && checkoutQuote ? (
            <UPIQRCodeCard
              merchantName={
                bankDisplay.upi_merchant_name ?? bankDisplay.account_name
              }
              vpa={bankDisplay.upi_id}
              amountINR={checkoutQuote.total}
            />
          ) : quoteLoading ? (
            <div className="rounded-xl p-4 bg-white border border-[#E5E7EB] text-sm text-[#6B7280]">
              Confirming the payable amount before generating the QR code…
            </div>
          ) : quoteError ? (
            <div className="rounded-xl p-4 bg-red-50 border border-red-200 text-sm text-red-700">
              {quoteError}
            </div>
          ) : (
            <div className="rounded-xl p-4 bg-white border border-[#E5E7EB] text-sm text-[#6B7280]">
              UPI payment details are not configured.
            </div>
          )}
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
