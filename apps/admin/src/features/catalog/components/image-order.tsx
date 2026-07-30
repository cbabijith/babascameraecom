"use client";

import { toast } from "@babascamera/ui";
import type { DragEndEvent } from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { useEffect, useState, useTransition } from "react";

import { SortableDragHandle, SortableList, SortableListItem } from "@/components/sortable-list";
import { catalogApi } from "@/features/catalog/api/catalog-api-client";

interface OrderedImage {
  id: string;
  label: string;
}

function SortableImageRow({
  image,
  index,
  disabled,
}: {
  image: OrderedImage;
  index: number;
  disabled: boolean;
}) {
  return (
    <SortableListItem
      id={image.id}
      as="li"
      disabled={disabled}
      className="flex items-center gap-2 rounded-xl border bg-white p-2 text-sm"
    >
      <SortableDragHandle label={`Reorder ${image.label}`} disabled={disabled} />
      <span className="w-7 text-center font-black text-slate-400">{index + 1}</span>
      <span className="min-w-0 flex-1 truncate">{image.label}</span>
    </SortableListItem>
  );
}

export function ImageOrder({
  productId,
  images,
}: {
  productId: string;
  images: OrderedImage[];
}) {
  const [ordered, setOrdered] = useState(images);
  const [pending, startTransition] = useTransition();
  useEffect(() => setOrdered(images), [images]);

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = ordered.findIndex((image) => image.id === active.id);
    const newIndex = ordered.findIndex((image) => image.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const previous = ordered;
    const next = arrayMove(ordered, oldIndex, newIndex);
    setOrdered(next);
    startTransition(async () => {
      const payload = new FormData();
      payload.set("productId", productId);
      payload.set("imageIds", JSON.stringify(next.map((image) => image.id)));
      try {
        const result = await catalogApi.reorderProductImages(productId, payload);
        if (!result.success) {
          setOrdered(previous);
          toast.error(result.error);
          return;
        }
        toast.success("Image order saved.");
      } catch (error) {
        console.error("Image reorder request failed.", error);
        setOrdered(previous);
        toast.error("Image order could not be saved.");
      }
    });
  };

  return (
    <SortableList
      id={`product-image-order-${productId}`}
      itemIds={ordered.map((image) => image.id)}
      onDragEnd={onDragEnd}
      disabled={pending}
    >
      <ol className="grid gap-2">
        {ordered.map((image, index) => (
          <SortableImageRow key={image.id} image={image} index={index} disabled={pending} />
        ))}
      </ol>
    </SortableList>
  );
}
