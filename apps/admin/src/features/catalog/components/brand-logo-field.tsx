"use client";

/* eslint-disable @next/next/no-img-element -- Local previews and runtime storage URLs are intentional. */

import { Button, Input, Label, toast } from "@babascamera/ui";
import { ImageIcon } from "lucide-react";
import { useEffect, useMemo } from "react";

const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const maximumBytes = 5 * 1024 * 1024;

export function BrandLogoField({
  currentLogoUrl,
  disabled,
  file,
  onFileChange,
  onRemoveChange,
  removeLogo,
}: {
  currentLogoUrl: string | null;
  disabled: boolean;
  file: File | null;
  onFileChange: (file: File | null) => void;
  onRemoveChange: (remove: boolean) => void;
  removeLogo: boolean;
}) {
  const previewUrl = useMemo(() => file ? URL.createObjectURL(file) : null, [file]);
  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);
  const visibleLogo = previewUrl ?? (removeLogo ? null : currentLogoUrl);
  return (
    <div className="grid gap-2">
      <Label htmlFor="brand-logo">Brand logo <span className="font-normal text-slate-500">(optional)</span></Label>
      <div className="flex items-center gap-3">
        <span className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-md border border-slate-200 bg-slate-50 text-slate-400">
          {visibleLogo ? <img src={visibleLogo} alt="Brand logo preview" className="h-full w-full object-contain p-1.5" /> : <ImageIcon className="size-5" />}
        </span>
        <div className="min-w-0 flex-1">
          <Input
            id="brand-logo"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            disabled={disabled}
            onChange={(event) => {
              const next = event.target.files?.[0] ?? null;
              if (!next) return;
              if (!allowedTypes.has(next.type)) {
                toast.error("Use a JPEG, PNG, or WebP logo.");
                event.target.value = "";
                return;
              }
              if (next.size > maximumBytes) {
                toast.error("Logo must be 5 MiB or smaller.");
                event.target.value = "";
                return;
              }
              onRemoveChange(false);
              onFileChange(next);
            }}
          />
          <div className="mt-2 flex flex-wrap gap-2">
            {(visibleLogo || file) && !removeLogo ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={disabled}
                onClick={() => {
                  onFileChange(null);
                  onRemoveChange(Boolean(currentLogoUrl));
                }}
              >
                Remove logo
              </Button>
            ) : null}
            {removeLogo ? (
              <Button type="button" size="sm" variant="ghost" disabled={disabled} onClick={() => onRemoveChange(false)}>
                Undo remove
              </Button>
            ) : null}
          </div>
        </div>
      </div>
      <p className="text-xs text-slate-500">JPEG, PNG, or WebP up to 5 MiB. Stored as an optimized WebP.</p>
    </div>
  );
}
