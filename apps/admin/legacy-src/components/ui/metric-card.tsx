import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export function MetricCard({
  label,
  value,
  helper,
  icon: Icon,
  tone = "slate",
}: {
  label: string;
  value: string;
  helper?: string;
  icon: LucideIcon;
  tone?: "slate" | "amber" | "emerald" | "sky" | "rose" | "violet";
}) {
  const tones = {
    slate: "bg-slate-950 text-white",
    amber: "bg-amber-400 text-slate-950",
    emerald: "bg-emerald-600 text-white",
    sky: "bg-sky-600 text-white",
    rose: "bg-rose-600 text-white",
    violet: "bg-violet-600 text-white",
  };

  return (
    <article className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_12px_36px_rgba(15,23,42,0.05)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">{label}</p>
          <p className="mt-3 text-3xl font-black tracking-[-0.045em] text-slate-950">{value}</p>
          {helper ? <p className="mt-2 text-xs font-medium text-slate-500">{helper}</p> : null}
        </div>
        <span className={cn("grid size-11 shrink-0 place-items-center rounded-2xl", tones[tone])}>
          <Icon className="size-5" aria-hidden="true" />
        </span>
      </div>
    </article>
  );
}
