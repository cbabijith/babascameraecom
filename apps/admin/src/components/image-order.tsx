"use client";

import { Button, toast } from "@babascamera/ui";
import { ArrowDown, ArrowUp, Save } from "lucide-react";
import { useEffect, useState, useTransition } from "react";

import { reorderProductImagesAction } from "@/lib/actions/catalog";

export function ImageOrder({
  productId,
  images,
}: {
  productId: string;
  images: { id: string; label: string }[];
}) {
  const [ordered, setOrdered] = useState(images);
  const [pending, startTransition] = useTransition();
  useEffect(() => setOrdered(images), [images]);
  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= ordered.length) return;
    const next = [...ordered];
    const current = next[index];
    const replacement = next[target];
    if (!current || !replacement) return;
    next[index] = replacement;
    next[target] = current;
    setOrdered(next);
  };
  return (
    <div className="grid gap-3">
      <ol className="grid gap-2">
        {ordered.map((image, index) => (
          <li key={image.id} className="flex items-center gap-2 rounded-xl border bg-white p-2 text-sm">
            <span className="w-7 text-center font-black text-slate-400">{index + 1}</span>
            <span className="min-w-0 flex-1 truncate">{image.label}</span>
            <Button type="button" size="icon" variant="ghost" onClick={() => move(index, -1)} disabled={index === 0} aria-label="Move image up"><ArrowUp className="size-4" /></Button>
            <Button type="button" size="icon" variant="ghost" onClick={() => move(index, 1)} disabled={index === ordered.length - 1} aria-label="Move image down"><ArrowDown className="size-4" /></Button>
          </li>
        ))}
      </ol>
      <Button
        type="button"
        variant="outline"
        className="justify-self-start"
        disabled={pending}
        onClick={() => {
          startTransition(async () => {
            const payload = new FormData();
            payload.set("productId", productId);
            payload.set("imageIds", JSON.stringify(ordered.map((image) => image.id)));
            try {
              const result = await reorderProductImagesAction(payload);
              if (!result.success) {
                toast.error(result.error);
                return;
              }
              toast.success("Image order saved.");
            } catch (error) {
              console.error("Image reorder request failed.", error);
              toast.error("Image order could not be saved.");
            }
          });
        }}
      >
        <Save className="size-4" /> {pending ? "Saving…" : "Save image order"}
      </Button>
    </div>
  );
}
