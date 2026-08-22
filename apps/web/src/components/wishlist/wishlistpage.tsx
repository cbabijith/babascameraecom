"use client";

import { Button } from "@/components/ui/button";
import WishlistCard from "@/components/wishlist/wishlistCard";
import Image from "next/image";
import React, { useEffect, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import type { RootState, AppDispatch } from "@/store";
import {
  fetchWishlistAsync,
  removeFromWishlistAsync,
} from "@/store/slice/wishlistSlice";
import type { WishlistItem } from "@/instances/wishlistInstance";
import { useRouter } from "next/navigation";
import { getImageUrl } from "@/lib/apiClient";
import AppBreadcrumb from "../common/app-breadcrumb";
import { addToCartAsync } from "@/store/slice/cartSlice";
import { toast } from "sonner";
import { buildProductPath } from "@/lib/slug";

/* --- typed guard to avoid any --- */
interface PopPrice { salePrice?: number; actualPrice?: number }
interface PopImage { key: string }
interface PopBrand { name?: string }
interface PopCategory { name?: string }
interface PopulatedProduct {
  _id: string;
  slug?: string;   
  name?: string;
  price?: PopPrice;
  images?: PopImage[];
  brand?: PopBrand;
  category?: PopCategory;
  quantity?: number;
  code?: string;
}
const isPopulatedProduct = (p: unknown): p is PopulatedProduct =>
  typeof p === "object" && p !== null && "_id" in p;

/* --- Skeleton --- */
const WishlistCardSkeleton: React.FC = () => (
  <div className="border rounded-[24px] px-6 py-3 md:min-h-[244px] bg-white">
    <div className="relative flex flex-col md:flex-row items-stretch gap-4 md:gap-8">
      {/* image */}
      <div className="flex-shrink-0 flex items-center justify-center">
        <div className="w-[120px] h-[120px] md:w-[140px] md:h-[140px] rounded-lg bg-gray-200" />
      </div>

      {/* content */}
      <div className="flex-1 flex flex-col justify-center">
        <div className="h-8 w-3/4 bg-gray-200 rounded mb-3" />
        <div className="space-y-2 mb-4">
          <div className="h-4 w-2/3 bg-gray-200 rounded" />
          <div className="h-4 w-1/2 bg-gray-200 rounded" />
          <div className="h-4 w-1/3 bg-gray-200 rounded" />
        </div>
        {/* price bar */}
        <div className="h-8 w-40 bg-gray-200 rounded mb-4" />
        {/* button bar (same size as real button) */}
        <div className="h-10 w-[240px] bg-gray-200 rounded-full" />
      </div>

      {/* trash placeholder (desktop only) */}
      <div className="hidden md:block absolute top-1/2 -translate-y-1/2 right-4 w-10 h-10 rounded-full bg-gray-200" />
    </div>
  </div>
);

const WishlistPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();

  const user = useSelector((s: RootState) => s.auth.user);
  const loading = useSelector((s: RootState) => s.wishlist.loading);
  const error = useSelector((s: RootState) => s.wishlist.error);
  const initialized = useSelector((s: RootState) => s.wishlist.initialized);
  const isGuest = !user;


  const wishlistItems: WishlistItem[] = useSelector((s: RootState) =>
    Object.values(s.wishlist.byProductId)
  );

  const [addingMap, setAddingMap] = useState<Record<string, boolean>>({});
  const wishlistMap = useSelector((s: RootState) => s.wishlist.byProductId);
  const hasUnpopulated = Object.values(wishlistMap).some(
    (it) => typeof (it as { product?: unknown })?.product === 'string'
  );
  useEffect(() => {
    if (user && !initialized && !loading) {
      void dispatch(fetchWishlistAsync());
    }
  }, [dispatch, user, initialized, loading]);

  useEffect(() => {
    if (user && !loading && hasUnpopulated) {
      void dispatch(fetchWishlistAsync());
    }
  }, [dispatch, user, hasUnpopulated, loading]);

  const removeFromWishlist = async (wishlistId: string, productId: string) => {
    try {
      await dispatch(removeFromWishlistAsync({ wishlistId, productId })).unwrap();
      toast.success("Removed from wishlist");
    } catch (err) {
      console.error("Failed to remove from wishlist:", err);
    }
  };

  // ✅ Add to cart via cartSlice (same behavior as your product-card)
  const addToCart = async (productId: string) => {
    // if (!user) {
    //   toast.error("Please login to add items to cart");
    //   return;
    // }
      if (!user) {
    router.push(`/login?next=${encodeURIComponent("/wishlist")}`);
    return;
  }
    try {
      setAddingMap((m) => ({ ...m, [productId]: true }));
      await dispatch(addToCartAsync(productId)).unwrap();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Could not add to cart";
      toast.error(message);
    } finally {
      setAddingMap(({ [productId]: _removed, ...rest }) => rest);
    }
  };

  const handleStartShopping = () => router.push("/products");

  // const isEmpty = !loading && initialized && wishlistItems.length === 0;

 return (
  <div className="min-h-screen constrained-width">
    <div className="py-3 sm:pt-6">
      <AppBreadcrumb items={[{ label: "HOME", href: "/" }, { label: "WISHLIST" }]} />
    </div>

    <main className="mx-auto pb-8">
      <div className="mb-8">
        <h1
          className="text-[20px] lg:text-[24px] font-[650] text-[#1E293B] mb-2"
         
        >
          Wishlist ({wishlistItems.length})
        </h1>
      </div>

      {/* --- Guest View (same idea as cart page) --- */}
      {isGuest ? (
        <div className="flex flex-col gap-[32px] bg-white rounded-lg shadow-sm p-[24px] text-center border border-[#E4E4E7]">
          <div>
            <h2
              className="text-[22px] lg:text-[32px] font-[650] text-[#000000] mb-2"
             
            >
              Please login to view your wishlist
            </h2>
            <p
              className="text-[#475569] font-[500] text-[15px] lg:text-[20px] mb-6"
             
            >
              Sign in to save and manage your favourite items.
            </p>
          </div>
          <div>
            <Button
              variant="babas"
              size="babas"
              onClick={() => router.push(`/login?next=${encodeURIComponent("/wishlist")}`)}
            >
              Login to Continue
            </Button>
          </div>
        </div>
      ) : (
        <>
          {/* Loading */}
          {loading && !initialized && (
            <div className="grid gap-6">
              <WishlistCardSkeleton />
              <WishlistCardSkeleton />
            </div>
          )}

          {/* Error */}
          {!loading && error && (
            <div className="text-center py-16">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Error</h2>
              <p className="text-red-600 mb-4">{error}</p>
              <Button onClick={() => dispatch(fetchWishlistAsync())}>Try Again</Button>
            </div>
          )}

          {/* Empty (logged-in but nothing saved) */}
          {!loading && initialized && wishlistItems.length === 0 && (
            <div className="flex flex-col gap-[32px] bg-white rounded-lg shadow-sm p-[24px] text-center border border-[#E4E4E7]">
              <div>
                <h2
                  className="text-[22px] lg:text-[32px] font-[650] text-[#000000] mb-2"
                 
                >
                  No favourites yet, but your next big shot is out there!
                </h2>
                <p
                  className="text-[#475569] font-[500] text-[15px] lg:text-[20px] mb-6"
                 
                >
                  From pro cameras to must-have accessories, find and save what inspires you.
                </p>
              </div>

              <div className="flex justify-center">
                <Image
                  src="/wishlistImg.png"
                  alt="wishlistImage"
                  width={291}
                  height={231}
                  className="object-contain w-[200px] lg:w-[291px] h-[160px] lg:h-[231px]"
                />
              </div>

              <div>
                <Button variant="babas" size="babas" onClick={handleStartShopping}>
                  Start Adding Favourites
                </Button>
              </div>
            </div>
          )}

          {/* List */}
          {!loading && !error && wishlistItems.length > 0 && (
            <div className="grid gap-6">
              {wishlistItems.map((item) => {
                const pRaw = (item as unknown as { product?: unknown })?.product;
                const isUnpop = typeof pRaw === "string";
                if (isUnpop) {
                  return <WishlistCardSkeleton key={(item as { _id: string })._id} />;
                }

                if (!isPopulatedProduct(item.product)) return null;
                const p = item.product;
                const pid = p._id;
                const href = buildProductPath({ _id: pid, slug: p.slug }); // <-- build /products/slug-id

                return (
                  <WishlistCard
                    key={item._id}
                    id={pid}
                    wishlistId={item._id}
                    name={p.name ?? ""}
                    price={p.price?.salePrice ?? 0}
                    originalPrice={
                      p.price?.actualPrice && p.price?.actualPrice !== p.price?.salePrice
                        ? p.price.actualPrice
                        : undefined
                    }
                    image={p.images?.[0] ? getImageUrl(p.images[0].key) : "/placeholder.svg"}
                    features={[
                      p.brand?.name ? `Brand: ${p.brand.name}` : null,
                      p.category?.name ? `Category: ${p.category.name}` : null,
                      typeof p.quantity === "number" ? `Stock: ${p.quantity} units` : null,
                    ].filter(Boolean) as string[]}
                    inStock={typeof p.quantity === "number" ? p.quantity > 0 : true}
                    onRemove={removeFromWishlist}
                    onAddToCart={addToCart}
                    onOpenProduct={() => router.push(href)}   
                    addingToCart={Boolean(addingMap[pid])}
                    className="w-full"
                  />
                );
              })}

            </div>
          )}
        </>
      )}
    </main>
  </div>
);

};

export default WishlistPage;
