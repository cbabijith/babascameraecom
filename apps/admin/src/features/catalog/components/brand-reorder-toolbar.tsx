"use client";

import { Button } from "@babascamera/ui";

export function BrandReorderToolbar({
  onCancel,
  onDone,
  saving,
}: {
  onCancel: () => void;
  onDone: () => void;
  saving: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-3 py-2">
      <p className="text-xs text-slate-500">{saving ? "Saving order..." : "Drag brands into priority order."}</p>
      <div className="flex gap-2">
        <Button type="button" size="sm" variant="ghost" disabled={saving} onClick={onCancel}>Cancel</Button>
        <Button type="button" size="sm" disabled={saving} onClick={onDone}>{saving ? "Saving..." : "Done"}</Button>
      </div>
    </div>
  );
}
