import { Aperture } from "lucide-react";

import { cn } from "@/lib/utils";

export function BrandMark({
  compact = false,
  inverse = false,
  className,
}: {
  compact?: boolean;
  inverse?: boolean;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-3", className)}>
      <span
        className={cn(
          "grid size-10 place-items-center rounded-xl shadow-sm",
          inverse ? "bg-amber-400 text-slate-950" : "bg-slate-950 text-amber-400",
        )}
      >
        <Aperture className="size-5" aria-hidden="true" strokeWidth={2.4} />
      </span>
      {!compact ? (
        <span className="leading-none">
          <span
            className={cn(
              "block text-base font-black tracking-[-0.03em]",
              inverse ? "text-white" : "text-slate-950",
            )}
          >
            BABAS
          </span>
          <span
            className={cn(
              "mt-1 block text-[9px] font-bold uppercase tracking-[0.2em]",
              inverse ? "text-slate-400" : "text-slate-500",
            )}
          >
            Commerce admin
          </span>
        </span>
      ) : null}
    </span>
  );
}
