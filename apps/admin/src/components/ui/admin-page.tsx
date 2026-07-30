import { Button, cn } from "@babascamera/ui";
import Link from "next/link";
import type { ReactNode } from "react";

export function AdminPage({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("grid gap-5", className)}>{children}</div>;
}

export function AdminPageHeader({
  title,
  description,
  primaryAction,
  secondaryActions,
}: {
  title: string;
  description?: string;
  primaryAction?: { href: string; label: string };
  secondaryActions?: ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-3">
      <div className="min-w-0">
        <h1 className="truncate text-2xl font-semibold tracking-tight text-[var(--admin-text)]">{title}</h1>
        {description ? <p className="mt-1 max-w-2xl text-sm text-[var(--admin-muted)]">{description}</p> : null}
      </div>
      {(secondaryActions || primaryAction) ? (
        <div className="flex flex-wrap items-center justify-end gap-2">
          {secondaryActions}
          {primaryAction ? (
            <Button asChild size="sm">
              <Link href={primaryAction.href}>{primaryAction.label}</Link>
            </Button>
          ) : null}
        </div>
      ) : null}
    </header>
  );
}

export function AdminSection({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-lg border border-[var(--admin-border)] bg-white", className)}>
      {children}
    </section>
  );
}

export function AdminToolbar({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[var(--admin-border)] bg-white p-3", className)}>
      {children}
    </div>
  );
}
