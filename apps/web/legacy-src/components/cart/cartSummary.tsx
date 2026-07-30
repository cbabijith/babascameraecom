import React from "react";
import { Button } from "../ui/button";

interface CartSummaryProps {
  itemsTotal: number;
  deliveryCharge: number;   // 100 when < 3000, else 0
  total: number;
  onCheckout: () => void;
  isCheckoutDisabled: boolean;
  itemsCount: number;
  hasInvalidItems?: boolean;
  className?: string;
}

const CartSummary: React.FC<CartSummaryProps> = ({
  itemsTotal,
  deliveryCharge,
  total,
  onCheckout,
  isCheckoutDisabled,
  itemsCount,
  hasInvalidItems = false,
  className = "",
}) => {
  return (
    <div className={`bg-white border border-[#E4E4E7] p-4 sm:p-5 sticky top-20 mb-4 rounded-2xl ${className}`}>
      <h2
        className="text-[20px] font-[650] text-[#3A3A3C] mb-4"
       
      >
        Summary
      </h2>

      <div className="space-y-3 mb-5">
        {/* Items Total */}
        <div className="flex justify-between items-center">
          <span className="text-[15px] font-[400] text-[#3A3A3C]">
            Items ({itemsCount})
          </span>
          <span className="text-[14px] font-[500] text-[#1E293B]">
            ₹{itemsTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </span>
        </div>

        {/* Delivery */}
        <div className="flex justify-between items-center">
          <span className="text-[15px] font-[400] text-[#3A3A3C]">
            Delivery
          </span>
          <span className="text-[14px] font-[500] text-[#1E293B]">
            ₹{deliveryCharge.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </span>
        </div>
      </div>

      {/* Total */}
      <div className="border-t border-[#E4E4E7] pt-3 mb-4">
        <div className="flex justify-between items-center">
          <span className="text-[17px] font-[650] text-[#3A3A3C]">
            Total
          </span>
          <span className="text-[17px] font-[650] text-[#3A3A3C]">
            ₹{total.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </span>
        </div>
      </div>

      {hasInvalidItems && (
        <p className="text-xs text-red-600 mb-3">
          Adjust quantities or remove out-of-stock items to continue.
        </p>
      )}

      <div className="flex justify-center">
        <Button
          variant="babas"
          size="babas"
          onClick={onCheckout}
          disabled={isCheckoutDisabled}
          className="w-full max-w-[280px] sm:w-[280px] h-[38px] sm:h-[40px] disabled:bg-gray-400 disabled:cursor-not-allowed rounded-xl"
        >
          Checkout Now
        </Button>
      </div>
    </div>
  );
};

export default CartSummary;
