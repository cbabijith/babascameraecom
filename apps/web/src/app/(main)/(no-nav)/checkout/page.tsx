// D:\work\Babas_Ecommerce_Web\src\app\(main)\(no-nav)\checkout\page.tsx
"use client";

import React, { Suspense, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import DeliveryAddressCard from "@/components/checkout/deliveryAddressCard";
import CheckoutItemCard from "@/components/checkout/checkoutItemCard";
import CheckoutSummary from "@/components/checkout/checkoutSummary";
import AddressModal from "@/components/checkout/addressModal";
import AppBreadcrumb from "@/components/common/app-breadcrumb";

import type { DeliverySettings } from "@/types/settings";
import type { ApiTransaction } from "@/types/order";
import type { Product } from "@/types/product";
import type { AppDispatch, RootState } from "@/store";

import { getSpecificSettings } from "@/instances/settingsInstance";
import { getUserAddresses, getUserProfile } from "@/instances/profileInstance";
import { getImageUrl } from "@/lib/apiClient";

import {
  selectCartItems,
  selectCartLoading,
  selectCartError,
  fetchCart,
  incrementCartAsync,
  decrementCartAsync,
  deleteCartAsync,
  clearCart,
  setCheckoutMethod,
  setCheckoutAddress,
  startBuyNow,
  selectCheckoutMethod,
} from "@/store/slice/cartSlice";

import { checkoutCart, createBuyNowOrder, createOrder } from "@/instances/cartInstance";

/* -------------------- helpers -------------------- */
const toNumber = (v: unknown): number => {
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
};

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null;

// Minimal order we only need `code` from
type MinimalOrderWithCode = { code?: string } & Record<string, unknown>;

const extractOrderTxn = (
  res: unknown
): { order: MinimalOrderWithCode | null; transaction: ApiTransaction | null } => {
  let order: MinimalOrderWithCode | null = null;
  let transaction: ApiTransaction | null = null;

  if (!isRecord(res)) return { order, transaction };

  const inner = (res.result ?? res.data ?? res) as unknown;

  if (isRecord(inner)) {
    if ("order" in inner) {
      const o = (inner as Record<string, unknown>).order;
      if (isRecord(o)) order = o as MinimalOrderWithCode;

      const t = (inner as Record<string, unknown>).transaction;
      if (isRecord(t)) transaction = t as ApiTransaction;
      else if (t == null) transaction = null;
    } else {
      order = inner as MinimalOrderWithCode;
    }
  }

  return { order, transaction };
};

const isNoPaymentSuccess = (txn: ApiTransaction | null | undefined): boolean => {
  if (!txn) return false;
  const status = String(txn.status ?? "").toUpperCase();
  const gateway = String(txn.paymentGateway ?? "").toUpperCase();
  const amt = typeof txn.amount === "string" ? parseFloat(txn.amount) : (txn.amount ?? 0);
  return (gateway === "NO_PAYMENT" || amt <= 0) && status === "SUCCESS";
};

const getErrorMessage = (e: unknown, fallback = "Request failed"): string => {
  if (e instanceof Error) return e.message;
  if (typeof e === "string") return e;
  return fallback;
};

const DELIVERY_DEFAULTS: Required<DeliverySettings> = {
  enableFreeDelivery: true,
  deliveryChargeFlat: 100,
  freeDeliveryThreshold: 3000,
};


/* -------------------- Razorpay -------------------- */
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
  amount: number; // paise
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

type OnComplete = (result: "success" | "dismissed", payload?: RazorpaySuccessResponse) => void;

const openRazorpay = async (opts: {
  orderId: string;
  amountPaise: number;
  currency?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  onComplete: OnComplete;
}): Promise<string | null> => {
  const ok = await loadRazorpayScript();
  if (!ok || !window.Razorpay) return "Payment initialization failed. Please refresh and try again.";

  const key = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
  if (!key) return "Missing NEXT_PUBLIC_RAZORPAY_KEY_ID.";

  const rzp = new window.Razorpay({
    key,
    amount: opts.amountPaise,
    currency: opts.currency ?? "INR",
    name: "Babas Camera store",
    order_id: opts.orderId,
    prefill: {
      name: opts.customerName,
      email: opts.customerEmail,
      contact: opts.customerPhone,
    },
    handler: (response) => opts.onComplete("success", response),
    modal: { ondismiss: () => opts.onComplete("dismissed") },
  });

  rzp.open();
  return null;
};

/* -------------------- user id helper -------------------- */
type MinimalUser = { id?: string; _id?: string; name?: string; email?: string; phone?: string };
const getUserId = (u: unknown): string | null => {
  const m = u as MinimalUser | null | undefined;
  if (m && typeof m.id === "string") return m.id;
  if (m && typeof m._id === "string") return m._id;
  return null;
};

/* -------------------- PAGE -------------------- */
type LocalCheckoutItem = {
  id: string; // productId
  product: Product;
  quantity: number;
  status: "ACTIVE";
};

const CheckoutPageContent: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dispatch = useDispatch<AppDispatch>();
  const [deliverySettings, setDeliverySettings] =
    useState<Required<DeliverySettings>>(DELIVERY_DEFAULTS);

  // Use paymentMethod from Redux
  const paymentMethod = useSelector(selectCheckoutMethod);
  const onChangePaymentMethod = (m: "RAZORPAY" | "BANK_TRANSFER") => {
    dispatch(setCheckoutMethod(m));
  };



  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => setIsMounted(true), []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await getSpecificSettings("Delivery");
        if (!mounted) return;
        setDeliverySettings({
          enableFreeDelivery: data.enableFreeDelivery ?? DELIVERY_DEFAULTS.enableFreeDelivery,
          deliveryChargeFlat: Math.max(0, toNumber(data.deliveryChargeFlat ?? DELIVERY_DEFAULTS.deliveryChargeFlat)),
          freeDeliveryThreshold: Math.max(0, toNumber(data.freeDeliveryThreshold ?? DELIVERY_DEFAULTS.freeDeliveryThreshold)),
        });
      } catch {
        if (!mounted) return;
        setDeliverySettings(DELIVERY_DEFAULTS);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const delayedClearRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    return () => {
      if (delayedClearRef.current) clearTimeout(delayedClearRef.current);
    };
  }, []);

  // Redux state
  const cartItems = useSelector(selectCartItems);
  const cartLoading = useSelector(selectCartLoading);
  const cartError = useSelector(selectCartError);
  const user = useSelector((state: RootState) => state.auth.user) as MinimalUser | null;

  // Buy Now support
  const buyNowProductId = searchParams?.get("buyNow");
  const initialQtyFromQuery = Math.max(1, toNumber(searchParams?.get("qty")) || 1);
  const isBuyNow = !!buyNowProductId;

  const [buyNowItem, setBuyNowItem] = useState<LocalCheckoutItem | null>(null);

  // Fetch cart once per user
  const lastFetchedUserIdRef = useRef<string | null>(null);
  const noPaymentRef = useRef(false);
  const lastOrderCodeRef = useRef<string | null>(null);
  const userId: string | null = getUserId(user);

  // Fetch cart once per user
  useEffect(() => {
    if (!userId) {
      lastFetchedUserIdRef.current = null;
      return;
    }
    if (lastFetchedUserIdRef.current === userId) return;
    lastFetchedUserIdRef.current = userId;
    dispatch(fetchCart());
  }, [dispatch, userId]);

  // Buy Now product fetch
  useEffect(() => {
    let ignore = false;
    const load = async () => {
      if (!isBuyNow || !buyNowProductId) {
        setBuyNowItem(null);
        return;
      }
      try {
        const p = await (await import("@/instances/productInstance")).getProductById(buyNowProductId);
        if (!ignore && p?._id) {
          setBuyNowItem({
            id: p._id,
            product: p,
            quantity: initialQtyFromQuery,
            status: "ACTIVE",
          });
          // Persist buy-now intent in store
          dispatch(startBuyNow({ productId: p._id, quantity: initialQtyFromQuery }));
        }
      } catch {
        if (!ignore) setBuyNowItem(null);
      }
    };
    void load();
    return () => {
      ignore = true;
    };
  }, [isBuyNow, buyNowProductId, initialQtyFromQuery, dispatch]);

  // Addresses
  const [addresses, setAddresses] = useState<import("@/types/profile").Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);

  const [addrLoading, setAddrLoading] = useState<boolean>(true);
  const [addrError, setAddrError] = useState<string | null>(null);

  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<import("@/types/profile").Address | null>(null);

  const loadAddresses = async (): Promise<void> => {
    setAddrLoading(true);
    setAddrError(null);
    try {
      const list = await getUserAddresses();
      const safeList = Array.isArray(list) ? list : [];
      setAddresses(safeList);

      const nextId =
        (selectedAddressId && safeList.some((a) => a._id === selectedAddressId) && selectedAddressId) ||
        (safeList.find((a) => a.isDefault)?._id ?? safeList[0]?._id ?? null);

      setSelectedAddressId(nextId ?? null);
      if (nextId) dispatch(setCheckoutAddress(nextId));
    } catch (e: unknown) {
      setAddrError(getErrorMessage(e, "Failed to load addresses"));
    } finally {
      setAddrLoading(false);
    }
  };

  useEffect(() => {
    if (user) void loadAddresses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Simple profile check (name + phone)
  const [profileReady, setProfileReady] = useState(false);
  useEffect(() => {
    let ignore = false;
    async function checkProfile() {
      try {
        const prof = await getUserProfile();
        if (!ignore) setProfileReady(Boolean(prof?.name));
      } catch {
        if (!ignore) setProfileReady(false);
      }
    }
    if (user) checkProfile();
    return () => {
      ignore = true;
    };
  }, [user]);

  const handleAddAddress = () => {
    if (!profileReady) {
      toast.error("Complete your profile first", {
        description: "Please fill in your Name and Mobile Number in Profile Info to add an address.",
      });
      return;
    }
    setEditingAddress(null);
    setIsAddressModalOpen(true);
  };
  const handleEditAddress = (addr: import("@/types/profile").Address) => {
    setEditingAddress(addr);
    setIsAddressModalOpen(true);
  };
  const handleCloseAddressModal = () => {
    setIsAddressModalOpen(false);
    setEditingAddress(null);
  };

  // Selected items from query (optional)
  const itemsParam = searchParams?.get("items");
  const selectedIdsFromQuery = useMemo<string[]>(
    () =>
      (itemsParam || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    [itemsParam]
  );

  // Items for checkout
  const itemsForCheckout = useMemo(() => {
    if (isBuyNow) {
      return buyNowItem
        ? [
            {
              _id: buyNowItem.id,
              product: buyNowItem.product,
              quantity: buyNowItem.quantity,
              status: buyNowItem.status,
            },
          ]
        : [];
    }
    if (!selectedIdsFromQuery.length) return cartItems;
    const selectedSet = new Set(selectedIdsFromQuery);
    return cartItems.filter((ci) => selectedSet.has(ci._id));
  }, [isBuyNow, buyNowItem, cartItems, selectedIdsFromQuery]);

  // Totals + delivery
  const itemsTotal = itemsForCheckout.reduce((sum, item) => {
    const price = toNumber(item?.product?.price?.salePrice);
    const qty = toNumber(item?.quantity);
    return sum + price * qty;
  }, 0);

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

  // Base (items + delivery)
  const baseTotal = itemsTotal + deliveryCharge;

  // Platform fee calculation (2.42%) - always calculate for display purposes
  const platformFeeCalc = Math.round(baseTotal * 242) / 10000;
  const platformFeeRaw = paymentMethod === "RAZORPAY" ? platformFeeCalc : 0;

  // Payable total (round ONLY the final amount)
  // RAZORPAY: baseTotal + platformFee, BANK_TRANSFER: baseTotal
  const payableTotal = Number((baseTotal + platformFeeRaw).toFixed(2));

  const itemCount = itemsForCheckout.reduce((c, item) => c + (toNumber(item?.quantity) || 0), 0);

  // Stock validation
  const hasInvalidItems = itemsForCheckout.some((item) => {
    const stockQty = toNumber(item?.product?.quantity);
    const reqQty = toNumber(item?.quantity);
    return stockQty <= 0 || reqQty > stockQty;
  });

  // Qty handlers
  const handleQuantityChange = async (
    cartItemId: string,
    newQuantity: number,
    currentQuantity: number
  ) => {
    try {
      if (isBuyNow) {
        if (!buyNowItem || cartItemId !== buyNowItem.id) return;
        setBuyNowItem((prev) => (prev ? { ...prev, quantity: Math.max(1, newQuantity) } : prev));
        return;
      }
      if (newQuantity > currentQuantity) {
        await dispatch(incrementCartAsync(cartItemId)).unwrap();
      } else {
        await dispatch(decrementCartAsync(cartItemId)).unwrap();
      }
    } catch (error: unknown) {
      toast.error("Could not update quantity", { description: getErrorMessage(error) });
    }
  };

  const handleRemoveItem = async (cartItemId: string) => {
    try {
      if (isBuyNow) {
        setBuyNowItem(null);
        toast("Item removed from checkout");
        return;
      }
      await dispatch(deleteCartAsync(cartItemId)).unwrap();
      toast("Item removed from cart");
    } catch (error: unknown) {
      toast.error("Could not remove item", { description: getErrorMessage(error) });
    }
  };

  // Place order
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);

  const onPaymentComplete: OnComplete = (result) => {
    dispatch(fetchCart());
    router.push("/orders");

    if (result === "success") {
      if (noPaymentRef.current) {
        const code = lastOrderCodeRef.current;
        toast.success("Order placed successfully 🎉", {
          description: code
            ? `Your order ${code} is confirmed. No payment was required.`
            : "Your order is confirmed. No payment was required.",
        });
      } else {
        toast.success("Payment successful", { description: "Your order is confirmed." });
      }
    } else {
      toast("Payment closed");
    }

    noPaymentRef.current = false;
    lastOrderCodeRef.current = null;
  };

  const handlePlaceOrder = async () => {
    if (!selectedAddressId) {
      toast.error("Add an address", { description: "Please select or add a delivery address to continue." });
      return;
    }
    if (itemsForCheckout.length === 0) {
      toast.error("No items", { description: "Your checkout has no items. Please select items from cart." });
      return;
    }
    if (hasInvalidItems) {
      toast.error("Stock issue", { description: "Some items are out of stock or exceed available quantity." });
      return;
    }

    // BANK TRANSFER → go to bank-transfer page (store has the context)
    if (paymentMethod === "BANK_TRANSFER") {
      router.push(`/checkout/bank-transfer`);
      return;
    }



    setIsPlacingOrder(true);
    try {
      if (isBuyNow) {
        // BUY NOW flow (doesn't touch server cart)
        const only = itemsForCheckout[0];
        const productId = only?.product?._id;
        const qty = Math.max(1, Number(only?.quantity) || 1);
        const price = Number(only?.product?.price?.salePrice) || 0;
        const subtotal = price * qty;

        const buyNowBase = subtotal + deliveryCharge;
        const isRazorpay = paymentMethod === "RAZORPAY";
        const feeRaw = isRazorpay ? Math.round(buyNowBase * 242) / 10000 : 0;
        const buyNowPayable = Number((buyNowBase + feeRaw).toFixed(2));

        const payload = {
          products: [{ product: productId as string, quantity: qty }],
          shippingAddress: selectedAddressId,
          invoiceAt: new Date().toISOString(),
          totalOrderPrice: buyNowPayable,
          deliveryCharge,
          method: "RAZORPAY" as const,
        };

        const resp = await createBuyNowOrder(payload);
        const { order, transaction } = extractOrderTxn(resp);

        // Clear local Buy Now view immediately
        setBuyNowItem(null);

        if (isNoPaymentSuccess(transaction)) {
          noPaymentRef.current = true;
          lastOrderCodeRef.current = order?.code ?? null;
          onPaymentComplete("success");
          return;
        }

        const orderId = transaction?.razorpayGatewayDetails?.orderId;
        const amountRupees = transaction?.amount ?? buyNowPayable;
        const amountPaise = Math.round(Number(amountRupees) * 100);

        if (orderId) {
          const err = await openRazorpay({
            orderId,
            amountPaise,
            currency: "INR",
            customerName: user?.name,
            customerEmail: user?.email,
            customerPhone: user?.phone,
            onComplete: onPaymentComplete,
          });
          if (err) toast.error("Payment not started", { description: err });
          return;
        }

        toast.error("Payment not started", { description: "Razorpay order id missing in response." });
        return;
      }

      // CART flow + RAZORPAY
      await checkoutCart();

      delayedClearRef.current = setTimeout(() => {
        dispatch(clearCart());
        dispatch(fetchCart());
      }, 2000);

      const payload = {
        totalOrderPrice: payableTotal, // final rounded amount including fee if Razorpay
        shippingAddress: selectedAddressId,
        deliveryCharge,
      };

      const resp = await createOrder(payload);
      const { order, transaction } = extractOrderTxn(resp);

      // NO_PAYMENT: skip Razorpay, show friendly order message
      if (isNoPaymentSuccess(transaction)) {
        delayedClearRef.current = setTimeout(() => {
          dispatch(clearCart());
          dispatch(fetchCart());
        }, 2000);

        noPaymentRef.current = true;
        lastOrderCodeRef.current = order?.code ?? null;

        onPaymentComplete("success");
        return;
      }

      const orderId = transaction?.razorpayGatewayDetails?.orderId;
      const amountRupees = transaction?.amount ?? payableTotal;
      const amountPaise = Math.round(Number(amountRupees) * 100);

      if (orderId) {
        const err = await openRazorpay({
          orderId,
          amountPaise,
          currency: "INR",
          customerName: user?.name,
          customerEmail: user?.email,
          customerPhone: user?.phone,
          onComplete: onPaymentComplete,
        });
        if (err) toast.error("Payment not started", { description: err });
        return;
      }

      toast.error("Payment not started", { description: "Razorpay order id missing in response." });
    } catch (e: unknown) {
      toast.error("Order failed", { description: getErrorMessage(e) });
    } finally {
      setIsPlacingOrder(false);
      dispatch(fetchCart());
    }
  };

  /* -------------------- Mount placeholder (pre-hydration) -------------------- */
  if (!isMounted) {
    return (
      <div className="min-h-screen constrained-width">
        <main className="mx-auto py-8">
          <div className="mb-4">
            <h1 className="text-[20px] lg:text-[24px] font-[650] text-[#1E293B]">Checkout</h1>
          </div>
          <div className="flex items-center justify-center py-16">
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
              <p className="text-gray-600">Loading…</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  /* -------------------- Guards & UI -------------------- */
  if (!user) {
    return (
      <div className="min-h-screen constrained-width">
        <main className="mx-auto py-8">
          <div className="flex flex-col gap-[32px] bg-white rounded-2xl shadow-sm p-[24px] text-center border border-[#E4E4E7]">
            <div>
              <h2 className="text-[22px] lg:text-[32px] font-[650] text-[#000000] mb-2">
                Please login to continue checkout
              </h2>
              <p className="text-[#475569] font-[500] text-[15px] lg:text-[20px] mb-6">
                Sign in to complete your purchase.
              </p>
            </div>
            <div>
              <Button variant="babas" size="babas" onClick={() => router.push("/login")}>
                Login to Continue
              </Button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (cartLoading) {
    return (
      <div className="min-h-screen constrained-width">
        <main className="mx-auto py-8">
          <div className="mb-4">
            <h1 className="text-[20px] lg:text-[24px] font-[650] text-[#1E293B]">
              Checkout
            </h1>
          </div>
          <div className="flex items-center justify-center py-16">
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
              <p className="text-gray-600">Loading your cart…</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const isEmptyServerMessage =
    typeof cartError === "string" && cartError.toLowerCase().includes("cart is empty");

  if (cartError && !isEmptyServerMessage) {
    return (
      <div className="min-h-screen constrained-width">
        <main className="mx-auto py-8">
          <div className="mb-4">
            <h1 className="text-[20px] lg:text-[24px] font-[650] text-[#1E293B]">
              Checkout
            </h1>
          </div>
          <div className="text-center py-16">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Cart Error</h2>
            <p className="text-red-600 mb-4">{cartError}</p>
            <Button onClick={() => dispatch(fetchCart())}>Try Again</Button>
          </div>
        </main>
      </div>
    );
  }

  const isEmpty = (!cartLoading && itemsForCheckout.length === 0) || isEmptyServerMessage;

  return (
    <div className="min-h-screen constrained-width">
      <div className="py-3 sm:pt-6">
        <AppBreadcrumb
          items={[
            { label: "HOME", href: "/" },
            isBuyNow ? { label: "BUY NOW" } : { label: "CART", href: "/cart" },
            { label: "CHECKOUT" },
          ]}
        />
      </div>
      <main className="mx-auto py-8">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-[20px] lg:text-[24px] font-[650] text-[#1E293B]">
            Checkout
          </h1>
          {hasInvalidItems && (
            <p className="text-xs text-red-600">
              Some items are out of stock or exceed available quantity. Please adjust to proceed.
            </p>
          )}
        </div>

        {isEmpty ? (
          // Empty UI
          <div className="flex flex-col gap-[32px] bg-white rounded-2xl shadow-sm p-[24px] text-center border border-[#E4E4E7]">
            <div>
              <h2 className="text-[22px] lg:text-[32px] font-[650] text-[#000000] mb-2">
                No Items to Checkout
              </h2>
              <p className="text-[#475569] font-[500] text-[14px] lg:text-[20px] mb-6">
                Select items in your cart and try again.
              </p>
            </div>

            <div className="flex justify-center">
              <Image
                src="/cartImg.png"
                alt="Empty Cart"
                width={300}
                height={250}
                className="object-contain w-[200px] h-[200px] lg:w-[400px] lg:h-[350px]"
              />
            </div>

            <div className="flex gap-3 justify-center">
              <Button variant="babas" size="babas" onClick={() => router.push("/products")}>
                Continue Shopping
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left: address + items */}
            <div className="lg:col-span-2 space-y-8">
              <DeliveryAddressCard
                addresses={addresses}
                selectedAddressId={selectedAddressId}
                onSelectAddress={(id) => {
                  setSelectedAddressId(id);
                  dispatch(setCheckoutAddress(id));
                }}
                onAddAddress={handleAddAddress}
                onEditAddress={handleEditAddress}
                loading={addrLoading}
                error={addrError}
                onRetryLoad={loadAddresses}
                profileReady={profileReady}
              />

              <div className="space-y-4">
                <h3 className="text-[18px] font-[650] text-[#1E293B] mb-2">
                  Order Items ({itemCount})
                </h3>

                {itemsForCheckout.map((item) => {
                  const stockQty = toNumber(item?.product?.quantity);
                  const inStock = stockQty > 0 && item?.status === "ACTIVE";
                  return (
                    <CheckoutItemCard
                      key={item?._id}
                      id={item?._id ?? ""}
                      productId={item?.product?._id ?? ""}
                      name={item?.product?.name ?? "—"}
                      productSlug={item.product?.slug}
                      category={item?.product?.category?.name ?? ""}
                      price={toNumber(item?.product?.price?.salePrice)}
                      quantity={toNumber(item?.quantity)}
                      maxQuantity={stockQty}
                      image={
                        item?.product?.images?.[0]
                          ? getImageUrl(item.product.images[0].key)
                          : "/placeholder.svg"
                      }
                      features={
                        [
                          item?.product?.brand?.name ? `Brand: ${item.product.brand.name}` : null,
                          item?.product?.category?.name ? `Category: ${item.product.category.name}` : null,
                        ].filter(Boolean) as string[]
                      }
                      inStock={inStock}
                      onQuantityChange={handleQuantityChange}
                      onRemove={handleRemoveItem}
                      className="rounded-2xl"
                    />
                  );
                })}
              </div>
            </div>

            {/* Right: summary */}
            <div className="lg:col-span-1">
              <CheckoutSummary
                itemsTotal={itemsTotal}
                deliveryCharge={deliveryCharge}
                platformFee={platformFeeRaw}
                avoidedFee={platformFeeCalc}
                total={payableTotal}
                itemCount={itemCount}
                paymentMethod={paymentMethod}
                onChangePaymentMethod={onChangePaymentMethod}
                onPlaceOrder={handlePlaceOrder}
                isOrderDisabled={
                  isPlacingOrder ||
                  !selectedAddressId ||
                  itemsForCheckout.length === 0 ||
                  hasInvalidItems
                }
                hasInvalidItems={hasInvalidItems}
                className="rounded-2xl"
              />
            </div>
          </div>
        )}

        <AddressModal
          isOpen={isAddressModalOpen}
          onClose={handleCloseAddressModal}
          initialAddress={editingAddress || undefined}
          onAfterSave={async (saved) => {
            await loadAddresses();
            setSelectedAddressId(saved._id);
            dispatch(setCheckoutAddress(saved._id));
          }}
          onSelectAfterSave={(id) => {
            setSelectedAddressId(id);
            dispatch(setCheckoutAddress(id));
          }}
        />
      </main>
    </div>
  );
};

const CheckoutPage: React.FC = () => (
  <Suspense
    fallback={
      <div className="min-h-screen constrained-width">
        <main className="mx-auto py-8">
          <div className="flex items-center justify-center py-16">
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
              <p className="text-gray-600">Loading…</p>
            </div>
          </div>
        </main>
      </div>
    }
  >
    <CheckoutPageContent />
  </Suspense>
);

export default CheckoutPage;
