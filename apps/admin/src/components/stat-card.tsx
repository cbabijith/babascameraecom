import { Card, CardContent } from "@babascamera/ui";
import type { LucideIcon } from "lucide-react";

export function StatCard({
  label,
  value,
  helper,
  icon: Icon,
}: {
  label: string;
  value: string;
  helper: string;
  icon: LucideIcon;
}) {
  return (
    <Card className="rounded-lg border-[var(--admin-border)] shadow-none">
      <CardContent className="flex items-start justify-between p-4">
        <div>
          <p className="text-sm font-medium text-[var(--admin-muted)]">{label}</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-[var(--admin-text)]">{value}</p>
          <p className="mt-1 text-xs text-[var(--admin-muted)]">{helper}</p>
        </div>
        <span className="grid size-8 place-items-center rounded-md border border-[var(--admin-border)] bg-white text-[var(--admin-muted)]">
          <Icon className="size-5" />
        </span>
      </CardContent>
    </Card>
  );
}
