import React from "react";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Trash2, Loader2 } from "lucide-react";
import { Button } from "../ui/button";
import { formatPrice, formatPriceWithoutSymbol } from "@/lib/price-formatter";

interface WishlistCardProps {
  id: string;
  wishlistId: string;
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
  features: string[];
  inStock?: boolean;
  onRemove: (wishlistId: string, productId: string) => void;
  onAddToCart: (productId: string) => void;
  onOpenProduct?: (productId: string) => void;
  addingToCart?: boolean;
  className?: string;
}

const WishlistCard: React.FC<WishlistCardProps> = ({
  id,
  wishlistId,
  name,
  price,
  originalPrice,
  image,
  features,
  inStock = true,
  onRemove,
  onAddToCart,
  onOpenProduct,
  addingToCart = false,
  className = "",
}) => {
  return (
    <Card className={`border rounded-[24px] ${className}`}>
      <CardContent className="relative px-6 py-3 md:min-h-[244px] bg-transparent">
        {/* Trash — right middle */}
        <button
          onClick={() => onRemove(wishlistId, id)}
          className="absolute top-1/2 -translate-y-1/2 right-4 p-2 rounded-full border border-gray-300 hover:bg-red-200 transition-colors"
          aria-label="Remove from wishlist"
        >
          <Trash2 size={18} className="sm:w-5 sm:h-5" color="#E72429" />
        </button>

        {/* Content */}
        <div className="flex flex-col md:flex-row items-stretch gap-4 md:gap-8 lg:gap-12 pr-12">
          {/* Image (no background/border; centered) */}
          <div className="flex-shrink-0 flex items-center justify-center">
            <button
              onClick={() => onOpenProduct?.(id)}
              className="w-[120px] h-[120px] md:w-[140px] md:h-[140px] rounded-lg overflow-hidden flex items-center justify-center"
              aria-label={`Open ${name}`}
            >
              <Image
                src={image || "/placeholder.svg"}
                alt={name}
                width={140}
                height={140}
                className="object-contain w-full h-full"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = "/placeholder.svg";
                }}
              />
            </button>
          </div>

          {/* Details (name → features → price → button) */}
          <div className="flex-1 flex flex-col justify-center">
            {/* Name */}
            <h3
              className="font-[650] text-[24px] sm:text-[28px] lg:text-[32px] leading-[100%] tracking-[0px] text-[#000000CC] mb-3"
             
            >
              {name}
            </h3>

           {/* Features */}
            {features.length > 0 && (
              <ul className="space-y-2 mb-4">
                {features.slice(0, 3).map((feature, idx) => (
                  <li
                    key={idx}
                    className="text-[14px] font-[500] leading-[100%] tracking-[0] text-[rgba(0,0,0,0.4)] flex items-start"
                  >
                    <span className="w-1.5 h-1.5 bg-[#64748B] rounded-full mr-2 mt-[6px] flex-shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            )}

            {/* Price */}
            <div className="flex items-center gap-3 mb-4">
              <span
                className="font-[650] text-[24px] sm:text-[28px] lg:text-[32px] leading-[100%] tracking-[0] align-middle text-[#1E293B]"
               
              >
                {formatPrice(price)}
              </span>
              {originalPrice && originalPrice !== price && (
                <span
                  className="text-[14px] text-[#64748B] line-through align-middle"
                 
                >
                  Rs. {formatPriceWithoutSymbol(originalPrice)}
                </span>
              )}
            </div>

            {/* Add to Cart — same style on mobile & desktop */}
            <div className="flex">
              <Button
                variant="babas"
                onClick={() => onAddToCart(id)}
                disabled={!inStock || addingToCart}
                className="
                  h-[40px] w-[240px] rounded-full
                  disabled:bg-gray-400 disabled:cursor-not-allowed
                "
                aria-label="Add to Cart"
              >
                {addingToCart ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Adding…
                  </span>
                ) : inStock ? (
                  "Add To Cart"
                ) : (
                  "Out of Stock"
                )}
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default WishlistCard;
