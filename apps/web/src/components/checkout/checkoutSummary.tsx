import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp } from "lucide-react";

type PaymentMethod = "RAZORPAY" | "BANK_TRANSFER";

interface CheckoutSummaryProps {
  itemsTotal: number;
  deliveryCharge: number;
  platformFee: number;          // show only for Razorpay
  avoidedFee: number;           // the potential fee avoided by choosing Bank Transfer
  total: number;                // FINAL payable amount (already rounded to 2 decimals in the page)
  itemCount: number;
  paymentMethod: PaymentMethod;
  onChangePaymentMethod: (m: PaymentMethod) => void;
  onPlaceOrder: () => void;
  isOrderDisabled?: boolean;
  hasInvalidItems?: boolean;
  className?: string;
}

/** Always 2 decimals for currency totals */
const rupee = (n: number) =>
  `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/**
 * Fee formatting rule:
 * - If 3rd & 4th decimal digits are both 0 -> show exactly 2 decimals
 * - Else -> show exactly 4 decimals
 */
const rupeeFeeFlexible = (n: number) => {
  // Scale to 4 decimals and check the last two digits
  const scaled = Math.round(n * 10000); // integer
  const lastTwo = scaled % 100;         // 3rd/4th decimal digits as integer
  const decimals = lastTwo === 0 ? 2 : 2;
  return `₹${n.toLocaleString("en-IN", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
};

const CheckoutSummary: React.FC<CheckoutSummaryProps> = ({
  itemsTotal,
  deliveryCharge,
  platformFee,
  avoidedFee,
  total,
  itemCount,
  paymentMethod,
  onChangePaymentMethod,
  onPlaceOrder,
  isOrderDisabled = false,
  hasInvalidItems = false,
  className = "",
}) => {
  const isRazorpay = paymentMethod === "RAZORPAY";
  const isBankTransfer = paymentMethod === "BANK_TRANSFER";
  const showPaymentSection = total > 0;

  // Local GIF from public folder
  const bankTransferGifUrl = "/tenorr.gif";

  // Expandable details state
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div className={`bg-white border border-[#E4E4E7] p-4 sm:p-5 sticky top-20 mb-4 rounded-[20px] ${className}`}>
      <h2 className="text-[20px] font-[650] text-[#3A3A3C] mb-4">Summary</h2>

      {/* Expandable Details - shown above Total when expanded */}
      {showDetails && (
        <div className="space-y-3 mb-4 pb-4 border-b border-[#E4E4E7]">
          {/* Items Total */}
          <div className="flex justify-between items-center">
            <span className="text-[15px] font-[400] text-[#3A3A3C]">Items ({itemCount})</span>
            <span className="text-[14px] font-[500] text-[#1E293B]">{rupee(itemsTotal)}</span>
          </div>

          {/* Delivery */}
          <div className="flex justify-between items-center">
            <span className="text-[15px] font-[400] text-[#3A3A3C]">Delivery</span>
            <span className="text-[14px] font-[500] text-[#1E293B]">{rupee(deliveryCharge)}</span>
          </div>

          {/* Payment gateway fee (Razorpay only) */}
          {showPaymentSection && isRazorpay && platformFee > 0 && (
            <div className="flex justify-between items-center">
              <span className="text-[15px] font-[400] text-[#3A3A3C]">
                Payment Gateway Fee (2% + GST)
              </span>
              <span className="text-[14px] font-[500] text-[#1E293B]">
                {rupeeFeeFlexible(platformFee)}
              </span>
            </div>
          )}

          {/* Payment gateway fee (Bank Transfer - showing 0 to highlight benefit) */}
          {showPaymentSection && isBankTransfer && (
            <div className="flex justify-between items-center">
              <span className="text-[15px] font-[400] text-green-600">
                Payment Gateway Fee
              </span>
              <span className="text-[14px] font-[500] text-green-600">
                ₹0.00 (Pay Original Price)
              </span>
            </div>
          )}

        </div>
      )}

      {/* Total - always visible, moves down when details are expanded */}
      <div className="mb-4">
        <div className="flex justify-between items-center">
          <span className="text-[17px] font-[650] text-[#3A3A3C]">Total</span>
          <div className="flex items-center gap-2">
            <span className="text-[17px] font-[650] text-[#3A3A3C]">{rupee(total)}</span>
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="p-1 hover:bg-gray-100 rounded transition-colors"
              aria-label={showDetails ? "Hide details" : "Show details"}
            >
              {showDetails ? (
                <ChevronUp className="w-5 h-5 text-gray-600" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-600" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Payment method selection */}
      {showPaymentSection && (
        <div className="mb-4">
          <p className="text-[14px] font-[600] text-[#3A3A3C] mb-2">Select Payment Method</p>

          <div className="space-y-2">
            <label className={`flex items-start gap-3 p-3 rounded-[20px] border ${isRazorpay ? "border-[#EC134A]" : "border-[#E4E4E7]"} cursor-pointer`}>
              <input
                type="radio"
                name="payMethod"
                className="mt-[3px]"
                checked={paymentMethod === "RAZORPAY"}
                onChange={() => onChangePaymentMethod("RAZORPAY")}
              />
              <div>
                <p className="text-[14px] font-[600] text-[#1E293B]">Online Payment</p>
                <p className="text-[12px] text-[#6B7280]">Pay instantly via Razorpay (UPI, Cards, Wallets, Netbanking)</p>
              </div>
            </label>

            <label className={`flex items-start gap-3 p-3 rounded-[20px] border ${paymentMethod === "BANK_TRANSFER" ? "border-[#EC134A]" : "border-[#E4E4E7]"} cursor-pointer`}>
              <input
                type="radio"
                name="payMethod"
                className="mt-[3px]"
                checked={paymentMethod === "BANK_TRANSFER"}
                onChange={() => onChangePaymentMethod("BANK_TRANSFER")}
              />
              <div className="flex-1 flex items-center gap-3">
                {/* GIF from public folder - show as-is, natural size */}
                <div className="relative flex-shrink-0">
                  <img
                    src={bankTransferGifUrl}
                    alt="Save money with bank transfer"
                    className="w-auto h-16 sm:h-20 object-contain"
                    loading="eager"
                  />
                </div>
                {/* Text content */}
                <div className="flex-1">
                  <p className="text-[14px] font-[600] text-[#1E293B]">Bank Transfer (Zero Transaction Fee)</p>
                  <p className="text-[12px] text-[#6B7280]">
                    Skip the 2.42% gateway fee by paying directly. Original price only.
                  </p>
                  {avoidedFee > 0 && (
                    <p className="text-[11px] font-[600] text-green-600 mt-1">
                      Pay Original Price (Save ₹{avoidedFee.toFixed(2)} on Fees)
                    </p>
                  )}
                </div>
              </div>
            </label>
          </div>
        </div>
      )}

      {hasInvalidItems && (
        <p className="text-xs text-red-600 mb-3">
          Adjust quantities or remove out-of-stock items to continue.
        </p>
      )}

      <div className="flex justify-center">
        <Button
          variant="babas"
          size="babas"
          onClick={onPlaceOrder}
          disabled={isOrderDisabled}
          className="w-full max-w-[280px] sm:w-[280px] h-[38px] sm:h-[40px] disabled:bg-gray-400 disabled:cursor-not-allowed rounded-[20px]"
        >
          Confirm &amp; Place Order
        </Button>
      </div>
    </div>
  );
};

export default CheckoutSummary;
