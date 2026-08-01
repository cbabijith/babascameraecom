// src/components/common/product-card.tsx
"use client";

import Image from "next/image";
import Link from "next/link";
import { Heart, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMemo, useState } from "react";
import { formatPrice, formatPriceWithoutSymbol } from "@/lib/price-formatter";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/store";
import { toggleWishlistAsync, selectIsInWishlist } from "@/store/slice/wishlistSlice";
import { addToCartAsync } from "@/store/slice/cartSlice";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { CartItem } from "@/types/cart";
import { buildProductPath } from "@/lib/slug";

interface ProductCardProps {
  id: string;
  name: string;
  slug?: string;  
  category: string;
  price: number;
  originalPrice?: number;
  image: string;
  keyFeaturesHtml?: string;
  brand?: string;
  features?: string[];
  inStock?: boolean;
}

const scrubHtml = (html?: string) => {
  if (!html) return "";
  return html
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/\son[a-z]+\s*=\s*(['"]).*?\1/gi, "");
};

const truncate = (s: string, n = 100) => {
  const t = s.trim();
  return t.length > n ? `${t.slice(0, n - 1)}…` : t;
};

function extractFeaturesFromHtml(html?: string): { items: string[]; isList: boolean } {
  const safe = scrubHtml(html);
  if (!safe) return { items: [], isList: false };

  // SSR-safe: Use regex instead of document.createElement
  // Extract text from <li> tags
  const liRegex = /<li[^>]*>([\s\S]*?)<\/li>/gi;
  const liMatches = [...safe.matchAll(liRegex)];
  
  if (liMatches.length > 0) {
    const items = liMatches
      .map(m => m[1].replace(/<[^>]*>/g, '').trim()) // Strip any nested tags
      .filter(Boolean);
    return { items, isList: true };
  }

  // Extract text from <p> tags
  const pRegex = /<p[^>]*>([\s\S]*?)<\/p>/gi;
  const pMatches = [...safe.matchAll(pRegex)];
  const pItems = pMatches
    .map(m => m[1].replace(/<[^>]*>/g, '').trim())
    .map(t => t.replace(/^•\s*/, ""))
    .filter(Boolean);

  if (pItems.length > 1) {
    return { items: pItems, isList: true };
  }

  // Fallback: strip all HTML and get plain text
  const text = safe.replace(/<[^>]*>/g, '').trim();
  if (text) {
    const split = text
      .split(/\n+|(?:^| )•\s+|^\s*[-–]\s+/gm)
      .map(s => s.trim())
      .filter(Boolean);

    if (split.length > 1) {
      return { items: split, isList: true };
    }
    return { items: [text], isList: false };
  }

  return { items: [], isList: false };
}


const ProductCard = ({
  id,
  name,
  slug,
  price,
  originalPrice,
  image,
  keyFeaturesHtml,
  brand,
  features,
  inStock = true,
}: ProductCardProps) => {
  const dispatch = useDispatch<AppDispatch>();
  const productHref = buildProductPath({ _id: id, slug });
  const isInWishlist = useSelector(selectIsInWishlist(id));
  const user = useSelector((state: RootState) => state.auth.user);
  const [isToggling, setIsToggling] = useState(false);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const router = useRouter();

 const isInCart = useSelector((state: RootState) => {
    const items: CartItem[] = (state.cart?.items ?? []) as CartItem[];
    if (!id) return false;

    // CartItem.product is a Product per types; keep a safe fallback to _id match
    return items.some((it) => it.product?._id === id || it._id === id);
  });
  const goToCart = (e?: React.MouseEvent) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    router.push("/cart");
  };

  const parsed = useMemo(() => {
    if (keyFeaturesHtml) return extractFeaturesFromHtml(keyFeaturesHtml);
    // fallback to legacy features array
    const items = (features ?? []).filter(Boolean);
    return { items, isList: items.length > 1 };
  }, [keyFeaturesHtml, features]);

  // Build the 2-line feature display, with consistent height.
  const displayLines = useMemo(() => {
    const { items, isList } = parsed;

    if (items.length === 0) {
      // No key features: fallback to brand line or keep space
      const fallback = brand ? [`Brand: ${brand}`] : [];
      return fallback.length > 0 ? [truncate(fallback[0], 80), ""] : ["", ""]; // second empty keeps height
    }

   if (isList) {
    const topThree = items.slice(0, 3).map((t) => `• ${truncate(t, 80)}`);
    if (items.length > 3) return [...topThree, "…"];
    return topThree;
  }


    // Not a list: single-line description
    return [truncate(items[0], 110), ""]; // pad an empty second line
  }, [parsed, brand]);

  const handleWishlistClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isToggling) return;

    if (!user) {
      toast.error("Please login to manage your wishlist");
      return;
    }

    try {
      setIsToggling(true);
      const result = await dispatch(toggleWishlistAsync(id)).unwrap();
      if (result?.type === "added") {
        toast.success("Added to wishlist");
      } else if (result?.type === "removed") {
        toast.success("Removed from wishlist");
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Could not update wishlist";
      toast.error(message);
    } finally {
      setIsToggling(false);
    }
  };

  const handleAddToCartClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isAddingToCart) return;

    if (!user) {
      toast.error("Please login to add items to cart");
      return;
    }

    try {
      setIsAddingToCart(true);
      await dispatch(addToCartAsync(id)).unwrap();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Could not add to cart";
      toast.error(message);
    } finally {
      setIsAddingToCart(false);
    }
  };

  return (
    <div
      className="
        group relative bg-white rounded-lg p-2 sm:p-3
        w-[160px] md:w-[285px]
        min-h-0 md:min-h-[400px]
      "
    >
      {/* Wishlist */}
      <button
        onClick={handleWishlistClick}
        disabled={isToggling}
        className={`
          absolute top-3 right-3 sm:top-5 sm:right-5 p-1.5 sm:p-2 bg-white rounded-full shadow-md hover:shadow-lg
          transition-all z-10
          ${isToggling ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
        `}
        aria-label="Toggle wishlist"
      >
        <Heart
          className={`transition-colors w-4 h-4 sm:w-4 sm:h-4 ${
            isInWishlist ? "fill-red-500 text-red-500" : "text-gray-400 hover:text-red-400"
          }`}
        />
      </button>

      {/* Image */}
      <Link href={productHref} aria-label={name}>
        <div
          className="
            relative mb-1 sm:mb-3 border border-gray-200 overflow-hidden cursor-pointer bg-gray-50
            rounded-[14px] md:rounded-3xl
            w-full
            h-[90.8537px] md:h-[200px]
          "
        >
          <Image
            src={image || "/placeholder.svg"}
            alt={name}
            fill
            sizes="(max-width: 768px) 160px, 265px"
            className="object-contain p-2 sm:p-4 group-hover:scale-105 transition-transform duration-300"
          />
        </div>
      </Link>

      {/* Details */}
      <div className="mt-0.5">
        {/* NAME */}
        <Link href={productHref} className="block" aria-label={`Open ${name}`}>
         <h3 className="truncate transition-colors group-hover:text-red-600 font-medium text-[14px] leading-tight text-[#000000B2] mb-1 sm:mb-2">
              {name ? name.charAt(0).toUpperCase() + name.slice(1) : ""}
          </h3>
        </Link>
        {/* <p className="truncate font-[650] text-[14px] leading-tight text-[#00000066] mb-1 sm:mb-2">
          {category}
        </p> */}

        {/* KEY FEATURES AREA*/}
<div className="min-h-[60px] sm:min-h-[70px] flex items-start">
  {parsed.isList ? (
    <ul className="space-y-[2px] sm:space-y-[3px] w-full">
      {displayLines.slice(0, 3).map((line, i) => (
        <li
          key={i}
          className="font-medium text-[12px] leading-[16px] text-[#00000066] line-clamp-1"
        >
          {line}
        </li>
      ))}
    </ul>
  ) : (
    <p className="font-medium text-[12px] leading-[16px] text-[#00000066] line-clamp-3">
      {parsed.items[0] || (brand ? `Brand: ${brand}` : "")}
    </p>
  )}
</div>

{/* PRICE */}
<div className="flex flex-col sm:flex-row sm:items-center sm:gap-2 mt-[-2]">
  <span
    className={`text-[12px] text-gray-500 line-through order-1 sm:order-none ${
      originalPrice ? "visible" : "invisible sm:visible"
    }`}
  >
    Rs. {formatPriceWithoutSymbol(originalPrice || 0)}
  </span>
  <span className="text-[14px] font-[750] text-gray-900 order-2 sm:order-none">
    {formatPrice(price)}
  </span>
</div>



        {/* BUTTON */}
      {isInCart ? (
        <Button
          size="sm"
          className="
            mt-1.5 w-full rounded-full transition-colors
            bg-white text-red-600 border border-red-600
            hover:bg-red-600 hover:text-white
            text-xs sm:text-sm
          "
          onClick={goToCart}
          aria-label="Go to cart"
        >
          <ShoppingCart className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
          Go to Cart
        </Button>
      ) : (
        <Button
          size="sm"
          className="
            mt-1.5 w-full rounded-full transition-colors
            bg-white text-red-600 border border-red-600
            hover:bg-red-600 hover:text-white
            text-xs sm:text-sm
          "
          disabled={!inStock || isAddingToCart}
          onClick={handleAddToCartClick}
          aria-label="Add to cart"
        >
          <ShoppingCart className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
          {isAddingToCart ? "Adding..." : inStock ? "Add to Cart" : "Out of Stock"}
        </Button>
      )}

      </div>
    </div>
  );
};

export { ProductCard as default };
