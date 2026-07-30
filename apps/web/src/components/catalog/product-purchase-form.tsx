"use client";

import { useMemo, useState } from "react";
import { ShoppingBag } from "lucide-react";
import { Button } from "@babascamera/ui";
import { addToCartAction } from "@/app/actions/cart";
import { ActionForm } from "@/components/action-form";
import {
  decimalToPaise,
  paiseToDecimal,
} from "@/lib/commerce/money";
import { formatMoney } from "@/lib/format";

interface ProductVariantOption {
  id: string;
  name: string;
  value: string;
  additionalPrice: string;
  stock: number;
}

export function ProductPurchaseForm({
  productId,
  salePrice,
  mrp,
  stock,
  lowStockThreshold,
  variants,
  defaultVariantId,
}: {
  productId: string;
  salePrice: string;
  mrp: string;
  stock: number;
  lowStockThreshold: number;
  variants: ProductVariantOption[];
  defaultVariantId: string | null;
}) {
  const [variantId, setVariantId] = useState(defaultVariantId ?? "");
  const selectedVariant = useMemo(
    () => variants.find((variant) => variant.id === variantId) ?? null,
    [variantId, variants],
  );
  const available = selectedVariant
    ? Math.min(stock, selectedVariant.stock)
    : stock;
  const additionalPrice = decimalToPaise(
    selectedVariant?.additionalPrice ?? "0.00",
  );
  const salePricePaise = decimalToPaise(salePrice) + additionalPrice;
  const mrpPaise = decimalToPaise(mrp) + additionalPrice;
  const hasDiscount = mrpPaise > salePricePaise;
  const discountPercent =
    hasDiscount && mrpPaise > 0n
      ? Number(((mrpPaise - salePricePaise) * 100n) / mrpPaise)
      : 0;
  const lowStock = available > 0 && available <= lowStockThreshold;

  return (
    <>
      <div className="mt-6 flex flex-wrap items-baseline gap-3">
        <span className="font-mono text-3xl font-black">
          {formatMoney(paiseToDecimal(salePricePaise))}
        </span>
        {hasDiscount ? (
          <span className="font-mono text-lg text-slate-400 line-through">
            {formatMoney(paiseToDecimal(mrpPaise))}
          </span>
        ) : null}
        {hasDiscount ? (
          <span className="rounded-full bg-[#E94560] px-2.5 py-1 text-xs font-bold text-white">
            {discountPercent}% off
          </span>
        ) : null}
      </div>
      <p
        className={`mt-2 text-sm font-semibold ${
          available > 0 ? "text-emerald-700" : "text-red-600"
        }`}
      >
        {available <= 0
          ? "Out of stock"
          : lowStock
            ? `Low stock · only ${available} left`
            : "In stock"}
      </p>

      <ActionForm
        action={addToCartAction}
        className="mt-7 space-y-4"
        showMessage
      >
        <input type="hidden" name="productId" value={productId} />
        {variants.length ? (
          <label className="block text-sm font-semibold">
            Choose an option
            <select
              name="variantId"
              value={variantId}
              onChange={(event) => setVariantId(event.target.value)}
              className="mt-2 h-11 w-full rounded-lg border border-slate-300 bg-white px-3"
            >
              {variants.map((variant) => (
                <option
                  key={variant.id}
                  value={variant.id}
                  disabled={variant.stock <= 0 || stock <= 0}
                >
                  {variant.name}: {variant.value}
                  {variant.stock <= 0 ? " — out of stock" : ""}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <input type="hidden" name="variantId" value="" />
        )}
        <label className="block text-sm font-semibold">
          Quantity
          <input
            key={variantId}
            name="quantity"
            type="number"
            min="1"
            max={Math.max(1, Math.min(available, 10))}
            defaultValue="1"
            disabled={available <= 0}
            className="mt-2 h-11 w-24 rounded-lg border border-slate-300 px-3"
          />
        </label>
        <Button
          type="submit"
          size="lg"
          disabled={available <= 0}
          className="w-full bg-[#E94560] hover:bg-[#D63852]"
        >
          <ShoppingBag className="h-5 w-5" />
          {available > 0 ? "Add to cart" : "Out of stock"}
        </Button>
      </ActionForm>
    </>
  );
}
