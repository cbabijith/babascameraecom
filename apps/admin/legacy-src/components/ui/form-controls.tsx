import { cn } from "@/lib/utils";

export function Field({
  label,
  hint,
  error,
  children,
  className,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("grid gap-1.5 text-sm font-bold text-slate-800", className)}>
      <span>{label}</span>
      {children}
      {error ? (
        <span className="text-xs font-semibold text-rose-600">{error}</span>
      ) : hint ? (
        <span className="text-xs font-medium leading-5 text-slate-500">{hint}</span>
      ) : null}
    </label>
  );
}

export const inputClassName =
  "min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-amber-400 focus:ring-4 focus:ring-amber-100 disabled:cursor-not-allowed disabled:bg-slate-100";

export const textareaClassName = `${inputClassName} min-h-28 resize-y`;

export function Toggle({
  name,
  label,
  description,
  defaultChecked,
}: {
  name: string;
  label: string;
  description?: string;
  defaultChecked?: boolean;
}) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-5 rounded-xl border border-slate-200 bg-white p-4">
      <span>
        <span className="block text-sm font-extrabold text-slate-900">{label}</span>
        {description ? (
          <span className="mt-1 block text-xs font-medium leading-5 text-slate-500">{description}</span>
        ) : null}
      </span>
      <span className="relative mt-0.5 inline-flex shrink-0">
        <input
          className="peer sr-only"
          type="checkbox"
          name={name}
          defaultChecked={defaultChecked}
        />
        <span className="h-6 w-11 rounded-full bg-slate-200 transition peer-checked:bg-amber-400 peer-focus-visible:ring-4 peer-focus-visible:ring-amber-100" />
        <span className="absolute left-1 top-1 size-4 rounded-full bg-white shadow-sm transition peer-checked:translate-x-5" />
      </span>
    </label>
  );
}
