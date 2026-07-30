import React from "react";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Minus, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { buildProductPath } from "@/lib/slug";

interface CheckoutItemCardProps {
  id: string;
  name: string;
  productId: string;
   productSlug?: string; 
  category: string;
  price: number;
  quantity: number;
  image: string;
  features: string[];
  inStock?: boolean;
  maxQuantity?: number; // NEW: cap increment by stock
  className?: string;

  onQuantityChange?: (cartItemId: string, newQuantity: number, currentQuantity: number) => void;
  onRemove?: (cartItemId: string) => void;
}

const CheckoutItemCard: React.FC<CheckoutItemCardProps> = ({
  id,
  name,
  productId,
  productSlug,
  category,
  price,
  quantity,
  image,
  features,
  inStock = true,
  maxQuantity,
  className = "",
  onQuantityChange,
  onRemove,
}) => {
  const router = useRouter();
  const href = buildProductPath({ _id: productId, slug: productSlug }); 
  const atMax = typeof maxQuantity === "number" && quantity >= maxQuantity;
  const canIncrement = !!inStock && !atMax;
  const canDecrement = quantity > 1 && !!inStock;

  const incrementQuantity = () => {
    if (!inStock || !onQuantityChange || atMax) return;
    onQuantityChange(id, quantity + 1, quantity);
  };

  const decrementQuantity = () => {
    if (!inStock) return;
    if (quantity > 1) {
      onQuantityChange?.(id, quantity - 1, quantity);
    } else {
      onRemove?.(id);
    }
  };

  const totalItemPrice = price * quantity;
  const lowStock = typeof maxQuantity === "number" && maxQuantity > 0 && maxQuantity <= 5;

const QtyControls = (
  <div className="flex items-center gap-2 rounded-lg">
    {quantity > 1 ? (
      <button
        onClick={decrementQuantity}
        disabled={!canDecrement}
        aria-label="Decrease quantity"
        className="p-2 md:p-1 hover:bg-gray-50 border border-[#00000026] rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Minus size={16} color="#E72429" />
      </button>
    ) : (
      // NEVER disabled when qty === 1
      <button
        onClick={() => onRemove?.(id)}
        aria-label="Remove item"
        className="p-2 md:p-1 hover:bg-gray-50 border border-[#00000026] rounded-full transition-colors"
      >
        <Trash2 size={16} color="#E72429" />
      </button>
    )}

    <span
      className="px-3 py-1 text-[14px] font-[500] min-w-[2rem] text-center"
     
    >
      {quantity}
    </span>

    <button
      onClick={incrementQuantity}
      disabled={!canIncrement}
      aria-label="Increase quantity"
      title={
        !inStock
          ? "Out of stock"
          : atMax && typeof maxQuantity === "number"
          ? `Max ${maxQuantity} reached`
          : undefined
      }
      className="p-2 md:p-1 hover:bg-gray-50 border border-[#00000026] rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <Plus size={16} color="#E72429" />
    </button>
  </div>
);


  return (
    <Card className={`hover:shadow-md transition-shadow duration-200 relative rounded-2xl ${className}`}>
      <CardContent className="p-3 sm:p-4 flex flex-col sm:flex-row gap-3 sm:gap-5">
        {/* Product Image */}
        <div
          className="flex-shrink-0 cursor-pointer relative"
          onClick={() => router.push(href)}
           onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              router.push(href);                              
            }
          }}
          role="link"
          tabIndex={0}
          aria-label={`View ${name}`}
        >
          <Image
            src={image || "/placeholder.svg"}
            alt={name}
            width={128}
            height={128}
            className="object-contain w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 rounded-lg"
          />
          {!inStock && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-lg">
              <span className="text-white text-xs sm:text-sm font-medium">Out of Stock</span>
            </div>
          )}
        </div>

        {/* Product Details */}
        <div className="flex-1 min-w-0">
          {/* Header row */}
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-1 mb-2">
            <div className="min-w-0">
              <h3
                className="text-[18px] sm:text-[20px] md:text-[22px] lg:text-[24px] font-[650] text-[#000000CC] mb-1 leading-tight"
               
                title={name}
              >
                {name ? name.charAt(0).toUpperCase() + name.slice(1) : ""}

              </h3>
             {category && (
                <p className="text-[13px] sm:text-[14px] lg:text-[16px] text-[#000000CC] font-[500] mb-1">
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                </p>
              )}


              {inStock && lowStock && (
                <p className="text-[12px] text-amber-600">
                  Only {maxQuantity} left
                </p>
              )}
            </div>

            {/* Qty controls on desktop */}
            <div className="hidden md:flex items-center absolute right-[5%] top-[45%]">{QtyControls}</div>
          </div>

          {/* Features */}
          {features.length > 0 && (
          <ul className="space-y-1 mb-2">
            {features.map((feature, index) => (
              <li
                key={index}
                className="text-[12px] text-[#00000066] font-[500] flex items-center"
              >
                <span className="w-1 h-1 bg-[#64748B] rounded-full mr-2 flex-shrink-0"></span>
                {feature}
              </li>
            ))}
          </ul>
        )}

          {/* Bottom row */}
          <div className="flex flex-row items-center justify-between">
            <div className="md:hidden">{QtyControls}</div>

            <div className="text-left sm:text-right">
              <span
                className="text-[16px] sm:text-[18px] lg:text-[22px] font-[650] text-[#000000]"
               
              >
                ₹{totalItemPrice.toLocaleString("en-IN")}
              </span>
              {!inStock && (
                <p className="text-[12px] text-red-500 mt-1">
                  Unavailable
                </p>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default CheckoutItemCard;
