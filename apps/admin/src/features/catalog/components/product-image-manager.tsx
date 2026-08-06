"use client";

/* eslint-disable @next/next/no-img-element -- Product media uses runtime Supabase public URLs. */

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Input,
  toast,
} from "@babascamera/ui";
import { ImagePlus, MoreHorizontal, Star, Trash2, Upload } from "lucide-react";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { ImageOrder } from "@/features/catalog/components/image-order";
import { catalogApi } from "@/features/catalog/api/catalog-api-client";

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
  const router = useRouter();
  const uploadRef = useRef<HTMLInputElement>(null);
  const [deleteImage, setDeleteImage] = useState<ProductImage | null>(null);
  const [localImages, setLocalImages] = useState(images);
  const [pending, startTransition] = useTransition();
  useEffect(() => setLocalImages(images), [images]);
  const orderedImages = useMemo(
    () => localImages.map((image, index) => ({
      id: image.id,
      label: image.altText ?? `Image ${index + 1}`,
    })),
    [localImages],
  );
  const run = (action: "primary" | "delete", image: ProductImage) => {
    startTransition(async () => {
      try {
        if (action === "primary") {
          setLocalImages((current) => current.map((item) => ({ ...item, isPrimary: item.id === image.id })));
          const result = await catalogApi.setPrimaryImage(productId, image.id);
          if (!result.success) {
            setLocalImages(images);
            toast.error(result.error);
            return;
          }
          toast.success("Primary image updated.");
        } else {
          const result = await catalogApi.deleteProductImage(productId, image.id);
          if (!result.success) {
            toast.error(result.error);
            return;
          }
          setLocalImages((current) => {
            const next = current.filter((item) => item.id !== image.id);
            if (image.isPrimary && next[0]) {
              return next.map((item, index) => ({ ...item, isPrimary: index === 0 }));
            }
            return next;
          });
          toast.success("Product image deleted.");
          setDeleteImage(null);
        }
      } catch (error) {
        console.error("Product image request failed.", error);
        toast.error("Product image could not be updated.");
      }
    });
  };
  const upload = (files: FileList | null) => {
    if (!files?.length) return;
    startTransition(async () => {
      const payload = new FormData();
      payload.set("productId", productId);
      for (const file of files) payload.append("images", file);
      try {
        const result = await catalogApi.uploadProductImages(productId, payload);
        if (!result.success) {
          toast.error(result.error);
          return;
        }
        toast.success("Images uploaded.");
        router.refresh();
      } catch (error) {
        console.error("Product image upload request failed.", error);
        toast.error("Images could not be uploaded.");
      } finally {
        if (uploadRef.current) uploadRef.current.value = "";
      }
    });
  };
  return (
    <div className="grid gap-4 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-slate-950">Product images</p>
          <p className="text-xs text-slate-500">Upload, reorder, delete, or choose the primary image.</p>
        </div>
        <Button type="button" variant="outline" size="sm" disabled={pending} onClick={() => uploadRef.current?.click()}>
          <ImagePlus className="size-4" /> {pending ? "Uploading..." : "Add images"}
        </Button>
      </div>
      <Input
        ref={uploadRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="hidden"
        onChange={(event) => upload(event.target.files)}
      />
      {localImages.length ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {localImages.map((image) => (
              <article key={image.id} className="rounded-lg border bg-white shadow-sm">
                <img src={image.url} alt={image.altText ?? productName} className="aspect-square w-full rounded-t-lg object-cover" />
                <div className="flex items-center justify-between gap-2 p-3">
                  {image.isPrimary ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">
                      <Star className="size-3" /> Primary
                    </span>
                  ) : (
                    <span className="text-xs text-slate-500">Product image</span>
                  )}
                  <details className="relative">
                    <summary className="grid size-8 cursor-pointer list-none place-items-center rounded-md text-slate-500 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 [&::-webkit-details-marker]:hidden">
                      <MoreHorizontal className="size-4" />
                    </summary>
                    <div className="absolute right-0 z-30 mt-1 w-44 rounded-md border border-slate-200 bg-white py-1 text-sm shadow-lg">
                      {!image.isPrimary ? (
                        <button
                          type="button"
                          disabled={pending}
                          className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-slate-50 disabled:opacity-60"
                          onClick={(e) => {
                            e.currentTarget.closest("details")?.removeAttribute("open");
                            run("primary", image);
                          }}
                        >
                          <Star className="size-4" /> Set primary
                        </button>
                      ) : null}
                      <button
                        type="button"
                        disabled={pending}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-rose-700 hover:bg-rose-50 disabled:opacity-60"
                        onClick={(e) => {
                          e.currentTarget.closest("details")?.removeAttribute("open");
                          setDeleteImage(image);
                        }}
                      >
                        <Trash2 className="size-4" /> Delete
                      </button>
                    </div>
                  </details>
                </div>
              </article>
            ))}
          </div>
          <div className="rounded-lg bg-white p-3">
            <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase text-slate-500">
              <Upload className="size-3" /> Drag to reorder
            </div>
            <ImageOrder productId={productId} images={orderedImages} />
          </div>
        </>
      ) : (
        <button
          type="button"
          className="grid min-h-40 place-items-center rounded-lg border border-dashed border-slate-300 bg-white text-center text-sm text-slate-500 transition hover:border-[#E94560] hover:text-slate-700"
          onClick={() => uploadRef.current?.click()}
          disabled={pending}
        >
          <span>
            <ImagePlus className="mx-auto mb-2 size-7 text-slate-400" />
            Add the first product image
          </span>
        </button>
      )}
      <Dialog open={Boolean(deleteImage)} onOpenChange={(open) => { if (!open && !pending) setDeleteImage(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete product image?</DialogTitle>
            <DialogDescription>
              This permanently removes the image from the product and storage when it is managed by the app.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" disabled={pending} onClick={() => setDeleteImage(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={pending || !deleteImage}
              onClick={() => {
                if (deleteImage) run("delete", deleteImage);
              }}
            >
              {pending ? "Deleting..." : "Delete image"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
