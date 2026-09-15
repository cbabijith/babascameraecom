"use client";

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  cn,
} from "@babascamera/ui";
import { MoreHorizontal } from "lucide-react";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

export function AdminResourceSurface({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={cn("w-full min-w-0 overflow-visible rounded-lg border border-slate-200 bg-white", className)}>{children}</section>;
}

export function AdminResourceTabs<T extends string>({
  disabled,
  onChange,
  options,
  value,
}: {
  disabled?: boolean;
  onChange: (value: T) => void;
  options: { value: T; label: string; count?: number }[];
  value: T;
}) {
  return (
    <div className="flex flex-wrap gap-1" role="tablist" aria-label="Resource views">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="tab"
          aria-selected={value === option.value}
          disabled={disabled}
          className={cn(
            "rounded-md px-3 py-1.5 text-sm font-medium transition-colors hover:bg-slate-100 disabled:opacity-50",
            value === option.value ? "bg-slate-900 text-white hover:bg-slate-900" : "text-slate-600",
          )}
          onClick={() => onChange(option.value)}
        >
          {option.label}
          {option.count !== undefined ? (
            <span className={cn("ml-1.5 text-xs", value === option.value ? "text-white/70" : "text-slate-400")}>
              {option.count}
            </span>
          ) : null}
        </button>
      ))}
    </div>
  );
}

export function AdminStatusBadge({ active }: { active: boolean }) {
  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium",
      active ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-50 text-slate-600",
    )}>
      <span className={cn("size-1.5 rounded-full", active ? "bg-emerald-500" : "bg-slate-400")} />
      {active ? "Active" : "Inactive"}
    </span>
  );
}

export function AdminResourceEmptyState({
  action,
  description,
  icon,
  title,
}: {
  action?: ReactNode;
  description: string;
  icon: ReactNode;
  title: string;
}) {
  return (
    <div className="grid justify-items-center gap-3 border-t border-slate-200 px-4 py-12 text-center">
      <span className="text-slate-400">{icon}</span>
      <div>
        <h2 className="text-base font-semibold text-slate-950">{title}</h2>
        <p className="mt-1 max-w-sm text-sm text-slate-500">{description}</p>
      </div>
      {action}
    </div>
  );
}

// useLayoutEffect would warn when this client component is server-rendered.
const useIsomorphicLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

export function AdminActionMenu({
  disabled,
  label,
  children,
}: {
  disabled?: boolean;
  label: string;
  children: (close: () => void) => ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const close = useCallback(() => {
    setOpen(false);
    window.setTimeout(() => triggerRef.current?.focus(), 0);
  }, []);

  // The menu is portaled to <body> with fixed coordinates so it is never
  // clipped by scrollable row/table containers, and the coordinates are
  // clamped so the menu always stays inside the viewport on mobile.
  const place = useCallback(() => {
    const trigger = triggerRef.current;
    const menu = menuRef.current;
    if (!trigger || !menu) return;
    const rect = trigger.getBoundingClientRect();
    const box = menu.getBoundingClientRect();
    const margin = 8;
    let left = rect.right - box.width;
    if (left < margin) left = margin;
    if (left + box.width > window.innerWidth - margin) {
      left = Math.max(margin, window.innerWidth - box.width - margin);
    }
    let top = rect.bottom + 4;
    if (top + box.height > window.innerHeight - margin && rect.top - box.height - 4 >= margin) {
      top = rect.top - box.height - 4;
    }
    top = Math.min(top, Math.max(margin, window.innerHeight - box.height - margin));
    menu.style.left = `${Math.round(left)}px`;
    menu.style.top = `${Math.round(top)}px`;
    menu.style.visibility = "visible";
  }, []);

  useIsomorphicLayoutEffect(() => {
    if (open) place();
  }, [open, place]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (rootRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      close();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    // Capture phase catches scrolls of inner containers (scroll events do
    // not bubble) so the menu tracks its trigger instead of detaching.
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
    };
  }, [close, open, place]);

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        disabled={disabled}
        className="grid size-10 place-items-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 disabled:opacity-50"
        onClick={(event) => {
          event.stopPropagation();
          setOpen((value) => !value);
        }}
      >
        <MoreHorizontal className="size-4" />
      </button>
      {open
        ? createPortal(
            <div
              ref={menuRef}
              role="menu"
              style={{ visibility: "hidden" }}
              className="fixed left-0 top-0 z-40 max-h-[min(20rem,calc(100dvh-1rem))] w-56 overflow-y-auto rounded-md border border-slate-200 bg-white py-1 text-sm shadow-lg"
              onClick={(event) => event.stopPropagation()}
            >
              {children(close)}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}

export function AdminConfirmDialog({
  cancelLabel = "Cancel",
  confirmLabel,
  description,
  onCancel,
  onConfirm,
  open,
  pending,
  title,
}: {
  cancelLabel?: string;
  confirmLabel: string;
  description: string;
  onCancel: () => void;
  onConfirm: () => void;
  open: boolean;
  pending?: boolean;
  title: string;
}) {
  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next && !pending) onCancel(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" disabled={pending} onClick={onCancel}>{cancelLabel}</Button>
          <Button type="button" variant="destructive" disabled={pending} onClick={onConfirm}>
            {pending ? "Deleting..." : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
