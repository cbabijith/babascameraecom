"use client";

/* eslint-disable @next/next/no-img-element -- Product media uses runtime Supabase public URLs. */

import { Button, Card, CardContent, CardHeader, CardTitle, toast } from "@babascamera/ui";
import { useMemo, useTransition } from "react";

import { ImageOrder } from "@/components/image-order";
import { deleteProductImageAction, setPrimaryImageAction } from "@/lib/actions/catalog";

interface ProductImage {
  id: string;
  url: string;
  altText: string | null;
  isPrimary: boolean;
}

export function ProductImageManager({
  productId,
  productName,
  images,
}: {
  productId: string;
  productName: string;
  images: ProductImage[];
}) {
  const [pending, startTransition] = useTransition();
  const orderedImages = useMemo(
    () => images.map((image, index) => ({
      id: image.id,
      label: image.altText ?? `Image ${index + 1}`,
    })),
    [images],
  );
  const run = (action: "primary" | "delete", image: ProductImage) => {
    if (action === "delete" && !window.confirm("Delete this product image?")) return;
    startTransition(async () => {
      const payload = new FormData();
      payload.set("productId", productId);
      payload.set("imageId", image.id);
      try {
        if (action === "primary") {
          const result = await setPrimaryImageAction(payload);
          if (!result.success) {
            toast.error(result.error);
            return;
          }
          toast.success("Primary image updated.");
        } else {
          const result = await deleteProductImageAction(payload);
          if (!result.success) {
            toast.error(result.error);
            return;
          }
          toast.success("Product image deleted.");
        }
      } catch (error) {
        console.error("Product image request failed.", error);
        toast.error("Product image could not be updated.");
      }
    });
  };
  return (
    <Card>
      <CardHeader><CardTitle>Current images</CardTitle></CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {images.map((image) => (
          <article key={image.id} className="overflow-hidden rounded-xl border">
            <img src={image.url} alt={image.altText ?? productName} className="aspect-square w-full object-cover" />
            <div className="flex flex-wrap gap-2 p-3">
              {image.isPrimary ? (
                <span className="self-center text-xs font-bold text-emerald-700">Primary</span>
              ) : (
                <Button type="button" size="sm" variant="outline" disabled={pending} onClick={() => run("primary", image)}>
                  Make primary
                </Button>
              )}
              <Button type="button" size="sm" variant="destructive" disabled={pending} onClick={() => run("delete", image)}>
                Delete
              </Button>
            </div>
          </article>
        ))}
      </CardContent>
      <CardContent>
        <ImageOrder
          productId={productId}
          images={orderedImages}
        />
      </CardContent>
    </Card>
  );
}
