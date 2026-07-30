import { Badge } from "@babascamera/ui";

const tones: Record<string, string> = {
  active: "border-emerald-200 bg-emerald-50 text-emerald-700",
  approved: "border-emerald-200 bg-emerald-50 text-emerald-700",
  paid: "border-emerald-200 bg-emerald-50 text-emerald-700",
  delivered: "border-emerald-200 bg-emerald-50 text-emerald-700",
  confirmed: "border-sky-200 bg-sky-50 text-sky-700",
  processing: "border-sky-200 bg-sky-50 text-sky-700",
  shipped: "border-violet-200 bg-violet-50 text-violet-700",
  razorpay: "border-violet-200 bg-violet-50 text-violet-700",
  admin: "border-violet-200 bg-violet-50 text-violet-700",
  customer: "border-sky-200 bg-sky-50 text-sky-700",
  pending: "border-amber-200 bg-amber-50 text-amber-800",
  cod: "border-amber-200 bg-amber-50 text-amber-800",
  cancelled: "border-rose-200 bg-rose-50 text-rose-700",
  failed: "border-rose-200 bg-rose-50 text-rose-700",
  refunded: "border-rose-200 bg-rose-50 text-rose-700",
  inactive: "border-slate-200 bg-slate-100 text-slate-600",
};

export function StatusBadge({ status }: { status: string }) {
  const normalized = status.toLowerCase();
  return (
    <Badge variant="outline" className={tones[normalized] ?? tones.inactive}>
      {normalized.replaceAll("_", " ")}
    </Badge>
  );
}
