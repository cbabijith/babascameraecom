"use client";

import React, { useState } from "react";
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
  couponCode?: string | null;
  couponDiscount?: number;
  couponError?: string | null;
  couponChecking?: boolean;
  onApplyCoupon?: (code: string) => void | Promise<void>;
  onRemoveCoupon?: () => void;
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
  couponCode = null,
  couponDiscount = 0,
  couponError = null,
  couponChecking = false,
  onApplyCoupon,
  onRemoveCoupon,
}) => {
  const [codeInput, setCodeInput] = useState("");

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

        {/* Coupon discount */}
        {couponCode && couponDiscount > 0 ? (
          <div className="flex justify-between items-center">
            <span className="text-[15px] font-[400] text-emerald-700 flex items-center gap-2">
              Coupon {couponCode}
              {onRemoveCoupon ? (
                <button
                  type="button"
                  onClick={onRemoveCoupon}
                  title="Remove coupon"
                  aria-label={`Remove coupon ${couponCode}`}
                  className="text-gray-400 hover:text-red-600"
                >
                  ✕
                </button>
              ) : null}
            </span>
            <span className="text-[14px] font-[500] text-emerald-700">
              −₹{couponDiscount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </span>
          </div>
        ) : null}

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

      {/* Coupon entry */}
      {onApplyCoupon ? (
        couponCode && couponDiscount > 0 ? null : (
          <div className="mb-4">
            <div className="flex gap-2">
              <input
                value={codeInput}
                onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
                placeholder="Coupon code"
                aria-label="Coupon code"
                autoComplete="off"
                className="h-9 flex-1 rounded-lg border border-[#E4E4E7] px-3 text-[13px] uppercase focus:outline-none focus:ring-1 focus:ring-[#E72429]"
              />
              <Button
                type="button"
                variant="outline"
                disabled={couponChecking || codeInput.trim().length < 2}
                onClick={() => onApplyCoupon(codeInput.trim())}
                className="h-9 px-4 text-[13px] rounded-lg"
              >
                {couponChecking ? "Checking…" : "Apply"}
              </Button>
            </div>
            {couponError ? (
              <p role="status" className="mt-2 text-xs text-red-600">
                {couponError}
              </p>
            ) : null}
          </div>
        )
      ) : null}

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
          className="w-full max-w-[340px] sm:w-[340px] h-12 sm:h-[44px] text-[15px] disabled:bg-gray-400 disabled:cursor-not-allowed rounded-xl"
        >
          Checkout Now
        </Button>
      </div>
    </div>
  );
};

export default CartSummary;
