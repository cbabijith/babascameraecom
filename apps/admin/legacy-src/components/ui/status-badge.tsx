import { cn } from "@/lib/utils";

type Tone = "neutral" | "info" | "warning" | "success" | "danger" | "purple";

const statusTones: Record<string, Tone> = {
  active: "success",
  published: "success",
  paid: "success",
  captured: "success",
  delivered: "success",
  completed: "success",
  confirmed: "info",
  processing: "info",
  packed: "info",
  shipped: "purple",
  out_for_delivery: "purple",
  online: "purple",
  pending: "warning",
  pending_payment: "warning",
  pending_review: "warning",
  cod: "warning",
  draft: "neutral",
  inactive: "neutral",
  hidden: "neutral",
  cancelled: "danger",
  failed: "danger",
  refunded: "danger",
  refund_pending: "warning",
  suspended: "danger",
};

const toneClasses: Record<Tone, string> = {
  neutral: "border-slate-200 bg-slate-100 text-slate-700",
  info: "border-sky-200 bg-sky-50 text-sky-700",
  warning: "border-amber-200 bg-amber-50 text-amber-800",
  success: "border-emerald-200 bg-emerald-50 text-emerald-700",
  danger: "border-rose-200 bg-rose-50 text-rose-700",
  purple: "border-violet-200 bg-violet-50 text-violet-700",
};

export function StatusBadge({
  status,
  tone,
}: {
  status: string | null | undefined;
  tone?: Tone;
}) {
  const normalized = (status || "unknown").toLowerCase();
  const label = normalized.replaceAll("_", " ");

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.09em]",
        toneClasses[tone ?? statusTones[normalized] ?? "neutral"],
      )}
    >
      {label}
    </span>
  );
}
