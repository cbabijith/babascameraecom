import { formatMoney } from "@/lib/format";

export function PriceDisplay({
  salePrice,
  mrp,
  discountPercent,
}: {
  salePrice: string;
  mrp: string;
  discountPercent: number;
}) {
  const discounted = discountPercent > 0;
  return (
    <div className="mt-3 flex flex-wrap items-baseline gap-x-2 gap-y-1">
      <span className="font-mono text-base font-bold text-slate-950 sm:text-lg">
        {formatMoney(salePrice)}
      </span>
      {discounted ? (
        <>
          <span className="font-mono text-xs text-slate-400 line-through sm:text-sm">
            {formatMoney(mrp)}
          </span>
          <span className="text-xs font-semibold text-emerald-700">{discountPercent}% off</span>
        </>
      ) : null}
    </div>
  );
}
