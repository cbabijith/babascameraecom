// src/app/(main)/cart/page.tsx
"use client";

import React, { useEffect, useRef, useState, useMemo } from "react"; // ← add useState, useMemo
import Image from "next/image";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/store";
import {
  selectCartItems,
  selectCartLoading,
  selectCartError,
  fetchCart,
  incrementCartAsync,
  decrementCartAsync,
  deleteCartAsync,
} from "@/store/slice/cartSlice";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import CartItemCard from "@/components/cart/cartItemCard";
import CartSummary from "@/components/cart/cartSummary";
import { useRouter } from "next/navigation";
import { getImageUrl } from "@/lib/apiClient";
import AppBreadcrumb from "@/components/common/app-breadcrumb";

// NEW
import { getSpecificSettings } from "@/instances/settingsInstance";
import type { DeliverySettings } from "@/types/settings";

// Safe number coercion (no `any`)
const toNumber = (v: unknown): number => {
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
};

// NEW: local defaults to avoid UX break if settings API fails
const DELIVERY_DEFAULTS: Required<DeliverySettings> = {
  enableFreeDelivery: true,
  deliveryChargeFlat: 100,
  freeDeliveryThreshold: 3000,
};

const CartPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();

  const cartItems = useSelector(selectCartItems);
  const loading = useSelector(selectCartLoading);
  const error = useSelector(selectCartError);
  const user = useSelector((state: RootState) => state.auth.user);

  // Fetch once per user (prevents infinite 304 loops)
  const lastFetchedUserIdRef = useRef<string | null>(null);

  // Safely extract userId supporting both `id` and (fallback) `_id` without `any`
  const userId: string | null = (() => {
    if (!user) return null;
    const maybeWithId = user as { id?: unknown };
    if (typeof maybeWithId.id === "string") return maybeWithId.id;
    const maybeWithUnderscoreId = user as unknown as { _id?: unknown };
    if (typeof maybeWithUnderscoreId._id === "string") return maybeWithUnderscoreId._id;
    return null;
  })();

  useEffect(() => {
    if (!userId) {
      lastFetchedUserIdRef.current = null;
      return;
    }
    if (lastFetchedUserIdRef.current === userId) return;
    lastFetchedUserIdRef.current = userId;
    dispatch(fetchCart());
  }, [dispatch, userId]);

  useEffect(() => {
    const onFocus = () => dispatch(fetchCart());
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [dispatch]);

  // NEW: Delivery settings state
  const [deliverySettings, setDeliverySettings] = useState<Required<DeliverySettings>>(DELIVERY_DEFAULTS);

  // Fetch Delivery settings (once on mount)
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await getSpecificSettings("Delivery");
        if (!mounted) return;
        // Merge with defaults to keep numbers valid
        setDeliverySettings({
          enableFreeDelivery: data.enableFreeDelivery ?? DELIVERY_DEFAULTS.enableFreeDelivery,
          deliveryChargeFlat: toNumber(data.deliveryChargeFlat ?? DELIVERY_DEFAULTS.deliveryChargeFlat),
          freeDeliveryThreshold: toNumber(data.freeDeliveryThreshold ?? DELIVERY_DEFAULTS.freeDeliveryThreshold),
        });
      } catch {
        // Keep defaults on error
        if (!mounted) return;
        setDeliverySettings(DELIVERY_DEFAULTS);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const handleQuantityChange = async (
    cartItemId: string,
    newQuantity: number,
    currentQuantity: number
  ) => {
    try {
      if (newQuantity > currentQuantity) {
        await dispatch(incrementCartAsync(cartItemId)).unwrap();
      } else {
        await dispatch(decrementCartAsync(cartItemId)).unwrap();
      }
    } catch (error) {
      console.error("Failed to update quantity:", error);
    }
  };

  const handleRemoveItem = async (cartItemId: string) => {
    try {
      await dispatch(deleteCartAsync(cartItemId)).unwrap();
    } catch (error) {
      console.error("Failed to remove item:", error);
    }
  };

  const handleCheckout = () => {
    if (cartItems.length === 0) return;
    // Block checkout if any invalid (OOS or requested qty > stock)
    if (hasInvalidItems) return;
    router.push(`/checkout`);
  };

  const handleStartShopping = () => {
    router.push("/products");
  };

  // Totals for ALL cart items (null-safe)
  const itemsTotal = cartItems.reduce((total, item) => {
    const price = toNumber(item?.product?.price?.salePrice);
    const qty = toNumber(item?.quantity);
    return total + price * qty;
  }, 0);

  // NEW: compute delivery charge from settings
  const deliveryCharge = useMemo(() => {
    if (itemsTotal <= 0) return 0;

    const { enableFreeDelivery, freeDeliveryThreshold, deliveryChargeFlat } = deliverySettings;

    if (!enableFreeDelivery) {
      // Always charge flat fee when feature is disabled
      return Math.max(0, toNumber(deliveryChargeFlat));
    }

    // Free when total >= threshold; else flat charge
    return itemsTotal >= toNumber(freeDeliveryThreshold)
      ? 0
      : Math.max(0, toNumber(deliveryChargeFlat));
  }, [itemsTotal, deliverySettings]);

  const total = itemsTotal + deliveryCharge;

  // Stock validity:
  // - inStock if product.quantity > 0 (and optional existing status check)
  // - invalid if product.quantity <= 0 OR requested qty > product.quantity
  const hasInvalidItems = cartItems.some((item) => {
    const stockQty = toNumber(item?.product?.quantity);
    const reqQty = toNumber(item?.quantity);
    return stockQty <= 0 || reqQty > stockQty;
  });

  if (!user) {
    return (
      <div className="min-h-screen constrained-width">
        <main className="mx-auto py-8">
          <div className="flex flex-col gap-[32px] bg-white rounded-2xl shadow-sm p-[24px] text-center border border-[#E4E4E7]">
            <div>
              <h2 className="text-[22px] lg:text-[32px] font-[650] text-[#000000] mb-2">
                Please login to view your cart
              </h2>
              <p className="text-[#475569] font-[500] text-[15px] lg:text-[20px] mb-6">
                Sign in to save and manage your cart items.
              </p>
            </div>
            <div>
              <Button
                variant="babas"
                size="babas"
                onClick={() => router.push("/login")}
              >
                Login to Continue
              </Button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen constrained-width">
        <main className="mx-auto py-8">
          <div className="mb-8">
            <h1 className="text-[20px] lg:text-[24px] font-[650] text-[#1E293B] mb-2">
              Shopping Cart
            </h1>
          </div>
          <div className="flex items-center justify-center py-16">
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
              <p className="text-gray-600">Loading your cart...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const isEmptyServerMessage =
    typeof error === "string" && error.toLowerCase().includes("cart is empty");

  if (error && !isEmptyServerMessage) {
    return (
      <div className="min-h-screen constrained-width">
        <main className="mx-auto py-8">
          <div className="mb-8">
            <h1 className="text-[20px] lg:text-[24px] font-[650] text-[#1E293B] mb-2">
              Shopping Cart
            </h1>
          </div>
          <div className="text-center py-16">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Error</h2>
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={() => dispatch(fetchCart())}>Try Again</Button>
          </div>
        </main>
      </div>
    );
  }

  const isEmpty = (!loading && cartItems.length === 0) || isEmptyServerMessage;

  return (
    <div className="min-h-screen constrained-width">
      <div className="py-3 sm:pt-6">
        <AppBreadcrumb
          items={[
            { label: "HOME", href: "/" },
            { label: "CART", href: "/cart" },
          ]}
        />
      </div>
      <main className="mx-auto pb-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-[20px] lg:text-[24px] font-[650] text-[#1E293B] mb-2">
            Shopping Cart ({cartItems.length})
          </h1>
          {hasInvalidItems && (
            <p className="text-sm text-red-600">
              Some items are out of stock or exceed available quantity. Please adjust to proceed.
            </p>
          )}
        </div>

        {isEmpty ? (
          // Empty UI
          <div className="flex flex-col gap-[32px] bg-white rounded-2xl shadow-sm p-[24px] text-center border border-[#E4E4E7]">
            <div>
              <h2 className="text-[22px] lg:text-[32px] font-[650] text-[#000000] mb-2">
                No Gear in Your Bag
              </h2>
              <p className="text-[#475569] font-[500] text-[14px] lg:text-[20px] mb-6">
                Find the right camera, lens, or accessory and add it here to
                complete your creator kit.
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

            <div>
              <Button variant="babas" size="babas" onClick={handleStartShopping}>
                Explore Items
              </Button>
            </div>
          </div>
        ) : (
          // Populated state
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Items */}
            <div className="lg:col-span-2 space-y-4">
              {cartItems.map((item) => {
                const stockQty = toNumber(item?.product?.quantity); // ← live stock
                const inStock = stockQty > 0 && item?.status !== "INACTIVE";
                return (
                  <CartItemCard
                    key={item?._id}
                    id={item?._id ?? ""}
                    productSlug={item?.product?.slug}  
                    productId={item?.product?._id ?? ""}
                    name={item?.product?.name ?? "—"}
                    category={item?.product?.category?.name ?? ""} // ← no fallback dash
                    price={toNumber(item?.product?.price?.salePrice)}
                    quantity={toNumber(item?.quantity)}
                    image={
                      item?.product?.images?.[0]
                        ? getImageUrl(item.product.images[0].key)
                        : "/placeholder.svg"
                    }
                    features={
                      [
                        item?.product?.brand?.name
                          ? `Brand: ${item.product.brand.name}`
                          : null,
                        item?.product?.category?.name
                          ? `Category: ${item.product.category.name}`
                          : null,
                      ].filter(Boolean) as string[] // ← remove missing ones
                    }
                    inStock={inStock}
                    maxQuantity={stockQty}
                    onQuantityChange={handleQuantityChange}
                    onRemove={handleRemoveItem}
                    className="rounded-2xl"
                  />

                );
              })}
            </div>

            {/* Summary (for ALL items) */}
            <div className="lg:col-span-1">
              <CartSummary
                itemsTotal={itemsTotal}
                deliveryCharge={deliveryCharge}          // ← now from settings
                total={total}
                onCheckout={handleCheckout}
                itemsCount={cartItems.length}
                isCheckoutDisabled={cartItems.length === 0 || hasInvalidItems}
                hasInvalidItems={hasInvalidItems}
                className="rounded-2xl"
              />
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default CartPage;
