"use client";

/* eslint-disable @next/next/no-img-element -- Banner media URLs are created at runtime. */

import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Textarea,
  toast,
} from "@babascamera/ui";
import type { DragEndEvent } from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import {
  CalendarClock,
  ImageIcon,
  Loader2,
  Monitor,
  Package,
  Pencil,
  Plus,
  Search,
  Smartphone,
  Trash2,
  Video,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";

import {
  SortableDragHandle,
  SortableList,
  SortableListItem,
} from "@/components/sortable-list";
import { AdminPage, AdminPageHeader, AdminSection } from "@/components/ui/admin-page";

import { resolveMediaUrl } from "@/lib/media-proxy";
import { homeBannerApi } from "../api/home-banner-api-client";
import { getBannerStatus } from "../tables/banner-list-model";
import type { HomeBanner } from "../types";

type MediaRole = "desktop" | "mobile" | "poster";

interface FormState {
  internalName: string;
  mediaType: "image" | "video";
  desktopMediaUrl: string;
  mobileMediaUrl: string;
  posterUrl: string;
  altText: string;
  headline: string;
  subheading: string;
  buttonLabel: string;
  destinationUrl: string;
  openInNewTab: boolean;
  productIds: string[];
  isActive: boolean;
  startsAt: string;
  endsAt: string;
}

const EMPTY: FormState = {
  internalName: "",
  mediaType: "image",
  desktopMediaUrl: "",
  mobileMediaUrl: "",
  posterUrl: "",
  altText: "",
  headline: "",
  subheading: "",
  buttonLabel: "",
  destinationUrl: "",
  openInNewTab: false,
  productIds: [],
  isActive: true,
  startsAt: "",
  endsAt: "",
};

function localDate(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function fromBanner(banner: HomeBanner): FormState {
  return {
    internalName: banner.internalName,
    mediaType: banner.mediaType,
    desktopMediaUrl: banner.desktopMediaUrl,
    mobileMediaUrl: banner.mobileMediaUrl ?? "",
    posterUrl: banner.posterUrl ?? "",
    altText: banner.altText,
    headline: banner.headline ?? "",
    subheading: banner.subheading ?? "",
    buttonLabel: banner.buttonLabel ?? "",
    destinationUrl: banner.destinationUrl ?? "",
    openInNewTab: banner.openInNewTab,
    productIds: banner.productIds ?? [],
    isActive: banner.isActive,
    startsAt: localDate(banner.startsAt),
    endsAt: localDate(banner.endsAt),
  };
}

function MediaField({
  id,
  label,
  helper,
  required,
  accept,
  value,
  busy,
  progress,
  onSelect,
}: {
  id: string;
  label: string;
  helper: string;
  required?: boolean;
  accept: string;
  value: string;
  busy: boolean;
  progress?: number;
  onSelect: (file: File) => void;
}) {
  const isVideo = accept.includes("video") || value.toLowerCase().endsWith(".mp4");
  const mediaUrl = resolveMediaUrl(value);

  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between gap-3">
        <Label htmlFor={id}>{label}{required ? " *" : ""}</Label>
        {value ? <span className="text-xs font-medium text-emerald-700">Ready</span> : null}
      </div>
      {value && !busy ? (
        <div className="overflow-hidden rounded-md border border-slate-200 bg-slate-100 p-1.5 w-fit">
          {isVideo ? (
            <video
              src={mediaUrl}
              controls
              preload="metadata"
              className="h-28 w-48 rounded object-cover"
            />
          ) : (
            <img
              src={mediaUrl}
              alt=""
              className="h-24 w-36 rounded object-cover"
            />
          )}
        </div>
      ) : null}
      <Input
        id={id}
        type="file"
        accept={accept}
        disabled={busy}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onSelect(file);
          event.target.value = "";
        }}
      />
      <p className="text-xs text-slate-500">{helper}</p>
      {busy ? (
        <div className="h-1.5 overflow-hidden rounded-full bg-slate-100" aria-label={`Uploading ${label}`}>
          <div className="h-full rounded-full bg-[#e94560] transition-[width]" style={{ width: `${progress ?? 20}%` }} />
        </div>
      ) : null}
    </div>
  );
}

interface ProductSearchResult {
  id: string;
  name: string;
  sku: string;
  salePrice: number | string;
  mrp: number | string;
  imageUrl: string | null;
}

function BannerProductSelector({
  selectedIds,
  onChange,
  disabled,
}: {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<ProductSearchResult[]>([]);
  const [productMap, setProductMap] = useState<Map<string, ProductSearchResult>>(new Map());

  useEffect(() => {
    const missingIds = selectedIds.filter((id) => !productMap.has(id));
    if (missingIds.length === 0) return;

    let isMounted = true;
    fetch(`/api/admin/catalog/products?pageSize=100`)
      .then((res) => res.json())
      .then((res) => {
        if (!isMounted || !res.success || !res.data?.rows) return;
        setProductMap((prev) => {
          const next = new Map(prev);
          for (const row of res.data.rows) {
            const primaryImage = row.images?.find((img: any) => img.isPrimary) || row.images?.[0];
            next.set(row.id, {
              id: row.id,
              name: row.name,
              sku: row.sku,
              salePrice: row.salePrice,
              mrp: row.mrp,
              imageUrl: primaryImage?.url ? resolveMediaUrl(primaryImage.url) : null,
            });
          }
          return next;
        });
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, [selectedIds, productMap]);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const timer = setTimeout(() => {
      fetch(`/api/admin/catalog/products?q=${encodeURIComponent(trimmed)}&pageSize=10`)
        .then((res) => res.json())
        .then((res) => {
          setIsSearching(false);
          if (res.success && res.data?.rows) {
            const results: ProductSearchResult[] = res.data.rows.map((row: any) => {
              const primaryImage = row.images?.find((img: any) => img.isPrimary) || row.images?.[0];
              return {
                id: row.id,
                name: row.name,
                sku: row.sku,
                salePrice: row.salePrice,
                mrp: row.mrp,
                imageUrl: primaryImage?.url ? resolveMediaUrl(primaryImage.url) : null,
              };
            });
            setSearchResults(results);
          } else {
            setSearchResults([]);
          }
        })
        .catch(() => {
          setIsSearching(false);
          setSearchResults([]);
        });
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  const addProduct = (prod: ProductSearchResult) => {
    if (!selectedIds.includes(prod.id)) {
      onChange([...selectedIds, prod.id]);
    }
    setProductMap((prev) => new Map(prev).set(prod.id, prod));
    setQuery("");
    setSearchResults([]);
  };

  const removeProduct = (id: string) => {
    onChange(selectedIds.filter((item) => item !== id));
  };

  return (
    <div className="grid gap-2.5">
      <Label htmlFor="product-search-input">Attached Products ({selectedIds.length})</Label>
      <div className="relative">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 size-4 text-slate-400" />
          <Input
            id="product-search-input"
            type="text"
            placeholder="Search products by ID, name, or SKU..."
            value={query}
            disabled={disabled}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9 pr-8"
          />
          {isSearching ? (
            <Loader2 className="absolute right-3 top-2.5 size-4 animate-spin text-slate-400" />
          ) : query ? (
            <button
              type="button"
              onClick={() => { setQuery(""); setSearchResults([]); }}
              className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
            >
              <X className="size-4" />
            </button>
          ) : null}
        </div>

        {query.trim() ? (
          <div className="absolute z-20 mt-1 max-h-60 w-full overflow-y-auto rounded-md border border-slate-200 bg-white p-1 shadow-lg">
            {isSearching ? (
              <div className="p-3 text-center text-xs text-slate-500">Searching products...</div>
            ) : searchResults.length > 0 ? (
              searchResults.map((prod) => {
                const isSelected = selectedIds.includes(prod.id);
                return (
                  <button
                    key={prod.id}
                    type="button"
                    disabled={isSelected}
                    onClick={() => addProduct(prod)}
                    className={`flex w-full items-center gap-3 rounded-md p-2 text-left text-xs transition-colors ${
                      isSelected
                        ? "bg-slate-50 opacity-60 cursor-not-allowed"
                        : "hover:bg-slate-100 cursor-pointer"
                    }`}
                  >
                    <div className="size-9 shrink-0 overflow-hidden rounded border border-slate-200 bg-slate-100 flex items-center justify-center">
                      {prod.imageUrl ? (
                        <img src={prod.imageUrl} alt="" className="size-full object-cover" />
                      ) : (
                        <Package className="size-4 text-slate-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-slate-900 truncate">{prod.name}</div>
                      <div className="text-[11px] text-slate-500 truncate">SKU: {prod.sku || "N/A"} | ID: {prod.id}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-semibold text-slate-900">₹{prod.salePrice}</div>
                      {isSelected ? (
                        <span className="text-[10px] text-emerald-600 font-medium">Added</span>
                      ) : (
                        <span className="text-[10px] text-indigo-600 font-medium">+ Add</span>
                      )}
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="p-3 text-center text-xs text-slate-500">No matching products found</div>
            )}
          </div>
        ) : null}
      </div>

      {selectedIds.length > 0 ? (
        <div className="grid gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 max-h-48 overflow-y-auto">
          {selectedIds.map((id) => {
            const prod = productMap.get(id);
            return (
              <div
                key={id}
                className="flex items-center justify-between gap-3 rounded-md border border-slate-200 bg-white p-2 text-xs"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="size-8 shrink-0 overflow-hidden rounded border border-slate-200 bg-slate-100 flex items-center justify-center">
                    {prod?.imageUrl ? (
                      <img src={prod.imageUrl} alt="" className="size-full object-cover" />
                    ) : (
                      <Package className="size-3.5 text-slate-400" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="font-medium text-slate-900 truncate">
                      {prod?.name ?? `Product ID: ${id}`}
                    </div>
                    <div className="text-[11px] text-slate-500 truncate">
                      {prod?.sku ? `SKU: ${prod.sku} • ` : ""}ID: {id}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {prod?.salePrice ? (
                    <span className="font-semibold text-slate-900 text-xs">₹{prod.salePrice}</span>
                  ) : null}
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    disabled={disabled}
                    onClick={() => removeProduct(id)}
                    className="size-7 text-slate-400 hover:text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-xs text-slate-500 italic">No products attached. Search and select products above to attach them to this banner.</p>
      )}
    </div>
  );
}

export function HomeBannerManager({ banners }: { banners: HomeBanner[] }) {
  const router = useRouter();
  const [items, setItems] = useState(banners);
  const [editing, setEditing] = useState<HomeBanner | null | undefined>();
  const [form, setForm] = useState<FormState>(EMPTY);
  const [uploading, setUploading] = useState<MediaRole | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [deleting, setDeleting] = useState<HomeBanner | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isRefreshing, startRefresh] = useTransition();
  const [isReordering, startReorder] = useTransition();

  useEffect(() => setItems(banners), [banners]);
  const ordered = useMemo(() => [...items].sort((a, b) => a.position - b.position), [items]);
  const disabled = isSaving || isRefreshing || isReordering || uploading !== null;

  const openForm = (banner: HomeBanner | null) => {
    setEditing(banner);
    setForm(banner ? fromBanner(banner) : EMPTY);
    setUploadProgress(0);
  };

  const patch = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  const uploadImage = async (file: File, role: MediaRole) => {
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Images must be 5 MiB or smaller.");
      return;
    }
    setUploading(role);
    setUploadProgress(20);
    const body = new FormData();
    body.set("file", file);
    body.set("role", role);
    const result = await homeBannerApi.uploadImage(body);
    setUploading(null);
    setUploadProgress(0);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    patch(role === "desktop" ? "desktopMediaUrl" : role === "mobile" ? "mobileMediaUrl" : "posterUrl", result.data.url);
    toast.success("Image optimized and uploaded.");
  };

  const uploadVideo = async (file: File, role: "desktop" | "mobile") => {
    if (file.type !== "video/mp4" || file.size > 40 * 1024 * 1024) {
      toast.error("Choose an MP4 video no larger than 40 MiB.");
      return;
    }
    setUploading(role);
    setUploadProgress(5);
    const authorization = await homeBannerApi.authorizeVideo({
      fileName: file.name,
      size: file.size,
      contentType: "video/mp4",
    });
    if (!authorization.success) {
      setUploading(null);
      toast.error(authorization.error);
      return;
    }
    const { path, token } = authorization.data;
    setUploadProgress(35);
    const uploadRes = await fetch(token, {
      method: "PUT",
      body: file,
      headers: { "Content-Type": "video/mp4" },
    });
    if (!uploadRes.ok) {
      setUploading(null);
      toast.error("Video upload failed.");
      return;
    }
    setUploadProgress(85);
    const finalized = await homeBannerApi.finalizeVideo({ path, size: file.size });
    setUploading(null);
    setUploadProgress(0);
    if (!finalized.success) {
      toast.error(finalized.error);
      return;
    }
    patch(role === "desktop" ? "desktopMediaUrl" : "mobileMediaUrl", finalized.data.url);
    toast.success("Video uploaded and verified.");
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (uploading) return;
    setIsSaving(true);
    const payload = {
      ...form,
      startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : null,
      endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : null,
    };
    const result = editing
      ? await homeBannerApi.update(editing.id, payload)
      : await homeBannerApi.create(payload);
    setIsSaving(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    setEditing(undefined);
    setItems((current) => editing
      ? current.map((item) => item.id === result.data.id ? result.data : item)
      : [...current, result.data]);
    toast.success(editing ? "Banner updated." : "Banner created.");
    startRefresh(() => router.refresh());
  };

  const remove = async () => {
    if (!deleting) return;
    const target = deleting;
    setDeleting(null);
    const result = await homeBannerApi.remove(target.id);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    setItems((current) => current.filter((item) => item.id !== target.id)
      .map((item, position) => ({ ...item, position })));
    toast.success("Banner and its managed media were deleted.");
    startRefresh(() => router.refresh());
  };

  const toggle = async (banner: HomeBanner) => {
    const optimistic = { ...banner, isActive: !banner.isActive };
    setItems((current) => current.map((item) => item.id === banner.id ? optimistic : item));
    const result = await homeBannerApi.update(banner.id, {
      ...fromBanner(optimistic),
      startsAt: optimistic.startsAt,
      endsAt: optimistic.endsAt,
    });
    if (!result.success) {
      setItems((current) => current.map((item) => item.id === banner.id ? banner : item));
      toast.error(result.error);
      return;
    }
    toast.success(result.data.isActive ? "Banner activated." : "Banner deactivated.");
  };

  const onDragEnd = (event: DragEndEvent) => {
    if (!event.over || event.active.id === event.over.id) return;
    const from = ordered.findIndex((item) => item.id === event.active.id);
    const to = ordered.findIndex((item) => item.id === event.over?.id);
    if (from < 0 || to < 0) return;
    const previous = items;
    const next = arrayMove(ordered, from, to).map((item, position) => ({ ...item, position }));
    setItems(next);
    startReorder(async () => {
      const result = await homeBannerApi.reorder(next.map((item) => item.id));
      if (!result.success) {
        setItems(previous);
        toast.error(result.error);
        return;
      }
      toast.success("Banner order saved.");
    });
  };

  return (
    <AdminPage>
      <AdminPageHeader
        title="Homepage banners"
        description="Control the media shown at the top of the customer storefront."
        secondaryActions={
          <Button size="sm" onClick={() => openForm(null)} disabled={disabled || items.length >= 5}>
            <Plus className="size-4" /> Add banner
          </Button>
        }
      />

      <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
        <p className="text-slate-600">Drag banners to set their storefront order.</p>
        <span className="font-semibold text-slate-900">{items.length} / 5</span>
      </div>

      <AdminSection className="overflow-hidden">
        {ordered.length ? (
          <SortableList
            id="home-banner-order"
            itemIds={ordered.map((item) => item.id)}
            onDragEnd={onDragEnd}
            disabled={disabled}
          >
            <div className="divide-y divide-slate-200">
              {ordered.map((banner) => {
                const status = getBannerStatus(banner);
                const statusClassName = status.tone === "success"
                  ? "bg-emerald-50 text-emerald-700"
                  : status.tone === "warning"
                    ? "bg-amber-50 text-amber-700"
                    : "bg-slate-100 text-slate-600";
                return (
                  <SortableListItem key={banner.id} id={banner.id} disabled={disabled}>
                    <article className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
                      <div className="flex min-w-0 flex-1 items-center gap-3">
                        <SortableDragHandle label={`Reorder ${banner.internalName}`} disabled={disabled} />
                        <div className="relative h-20 w-32 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                          {banner.mediaType === "image" ? (
                            <img src={resolveMediaUrl(banner.desktopMediaUrl)} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <>
                              {banner.posterUrl ? <img src={resolveMediaUrl(banner.posterUrl)} alt="" className="h-full w-full object-cover" /> : null}
                              <span className="absolute inset-0 grid place-items-center bg-slate-950/20 text-white">
                                <Video className="size-5" />
                              </span>
                            </>
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h2 className="truncate font-semibold text-slate-950">{banner.internalName}</h2>
                            <Badge className={statusClassName}>{status.label}</Badge>
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                            <span className="inline-flex items-center gap-1">
                              {banner.mediaType === "image" ? <ImageIcon className="size-3.5" /> : <Video className="size-3.5" />}
                              {banner.mediaType === "image" ? "Image" : "Video"}
                            </span>
                            <span className="inline-flex items-center gap-1"><Monitor className="size-3.5" /> Desktop</span>
                            {banner.mobileMediaUrl ? <span className="inline-flex items-center gap-1"><Smartphone className="size-3.5" /> Mobile</span> : null}
                            {(banner.startsAt || banner.endsAt) ? <span className="inline-flex items-center gap-1"><CalendarClock className="size-3.5" /> Scheduled</span> : null}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-end gap-2">
                        <Button size="sm" variant="outline" onClick={() => toggle(banner)} disabled={disabled}>
                          {banner.isActive ? "Deactivate" : "Activate"}
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => openForm(banner)} disabled={disabled} aria-label={`Edit ${banner.internalName}`}>
                          <Pencil className="size-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => setDeleting(banner)} disabled={disabled} aria-label={`Delete ${banner.internalName}`}>
                          <Trash2 className="size-4 text-red-600" />
                        </Button>
                      </div>
                    </article>
                  </SortableListItem>
                );
              })}
            </div>
          </SortableList>
        ) : (
          <div className="grid place-items-center px-6 py-16 text-center">
            <div className="grid size-12 place-items-center rounded-xl bg-slate-100 text-slate-500"><ImageIcon /></div>
            <h2 className="mt-4 font-semibold text-slate-950">No homepage banners</h2>
            <p className="mt-1 max-w-sm text-sm text-slate-500">The existing storefront hero remains visible until you add and activate a banner.</p>
            <Button className="mt-5" onClick={() => openForm(null)}><Plus className="size-4" /> Add first banner</Button>
          </div>
        )}
      </AdminSection>

      <Dialog open={editing !== undefined} onOpenChange={(open) => { if (!open && !disabled) setEditing(undefined); }}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit homepage banner" : "Add homepage banner"}</DialogTitle>
            <DialogDescription>Upload responsive media first, then configure the optional message and schedule.</DialogDescription>
          </DialogHeader>
          <form onSubmit={save} className="grid gap-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="banner-name">Internal name *</Label>
                <Input id="banner-name" value={form.internalName} maxLength={120} required onChange={(e) => patch("internalName", e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="banner-type">Media type *</Label>
                <select
                  id="banner-type"
                  value={form.mediaType}
                  onChange={(e) => patch("mediaType", e.target.value as FormState["mediaType"])}
                  className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm"
                >
                  <option value="image">Responsive image</option>
                  <option value="video">MP4 video</option>
                </select>
              </div>
            </div>

            <div className="grid gap-4 rounded-lg border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2">
              {form.mediaType === "image" ? (
                <>
                  <MediaField id="banner-desktop-image" label="Desktop image" helper="JPEG, PNG, or WebP. Converted to WebP, 5 MiB max." required accept="image/jpeg,image/png,image/webp" value={form.desktopMediaUrl} busy={uploading === "desktop"} progress={uploadProgress} onSelect={(file) => uploadImage(file, "desktop")} />
                  <MediaField id="banner-mobile-image" label="Mobile image" helper="Portrait composition recommended. Converted to WebP." required accept="image/jpeg,image/png,image/webp" value={form.mobileMediaUrl} busy={uploading === "mobile"} progress={uploadProgress} onSelect={(file) => uploadImage(file, "mobile")} />
                </>
              ) : (
                <>
                  <MediaField id="banner-desktop-video" label="Desktop video" helper="MP4 with H.264 encoding, 40 MiB max." required accept="video/mp4" value={form.desktopMediaUrl} busy={uploading === "desktop"} progress={uploadProgress} onSelect={(file) => uploadVideo(file, "desktop")} />
                  <MediaField id="banner-mobile-video" label="Mobile video" helper="Optional. Desktop video is reused when omitted." accept="video/mp4" value={form.mobileMediaUrl} busy={uploading === "mobile"} progress={uploadProgress} onSelect={(file) => uploadVideo(file, "mobile")} />
                  <div className="sm:col-span-2">
                    <MediaField id="banner-poster" label="Video poster" helper="Required fallback image. Converted to WebP." required accept="image/jpeg,image/png,image/webp" value={form.posterUrl} busy={uploading === "poster"} progress={uploadProgress} onSelect={(file) => uploadImage(file, "poster")} />
                  </div>
                </>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="banner-alt">Accessible description *</Label>
              <Input id="banner-alt" value={form.altText} maxLength={240} required onChange={(e) => patch("altText", e.target.value)} placeholder="Describe the promotion and important visual content" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="banner-headline">Headline</Label>
                <Input id="banner-headline" value={form.headline} maxLength={160} onChange={(e) => patch("headline", e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="banner-button">Button label</Label>
                <Input id="banner-button" value={form.buttonLabel} maxLength={80} onChange={(e) => patch("buttonLabel", e.target.value)} />
              </div>
              <div className="grid gap-2 sm:col-span-2">
                <Label htmlFor="banner-subheading">Subheading</Label>
                <Textarea id="banner-subheading" value={form.subheading} maxLength={320} onChange={(e) => patch("subheading", e.target.value)} />
              </div>
              <div className="grid gap-2 sm:col-span-2">
                <Label htmlFor="banner-destination">Destination</Label>
                <Input id="banner-destination" value={form.destinationUrl} maxLength={2000} onChange={(e) => patch("destinationUrl", e.target.value)} placeholder="/products or https://example.com" />
              </div>
            </div>

            <BannerProductSelector
              selectedIds={form.productIds}
              onChange={(ids) => patch("productIds", ids)}
              disabled={disabled}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="banner-start">Starts at</Label>
                <Input id="banner-start" type="datetime-local" value={form.startsAt} onChange={(e) => patch("startsAt", e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="banner-end">Ends at</Label>
                <Input id="banner-end" type="datetime-local" value={form.endsAt} onChange={(e) => patch("endsAt", e.target.value)} />
              </div>
            </div>

            <div className="flex flex-wrap gap-x-6 gap-y-3 rounded-lg border border-slate-200 px-4 py-3">
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                <input type="checkbox" checked={form.isActive} onChange={(e) => patch("isActive", e.target.checked)} className="size-4 accent-[#e94560]" />
                Active
              </label>
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                <input type="checkbox" checked={form.openInNewTab} onChange={(e) => patch("openInNewTab", e.target.checked)} className="size-4 accent-[#e94560]" />
                Open destination in a new tab
              </label>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" disabled={disabled} onClick={() => setEditing(undefined)}>Cancel</Button>
              <Button type="submit" disabled={disabled}>
                {uploading ? "Uploading media..." : isSaving ? "Saving..." : editing ? "Save changes" : "Create banner"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(deleting)} onOpenChange={(open) => { if (!open) setDeleting(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete homepage banner?</DialogTitle>
            <DialogDescription>
              {deleting ? `${deleting.internalName} and its managed media will be permanently removed.` : ""}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleting(null)}>Cancel</Button>
            <Button onClick={remove} className="bg-red-600 hover:bg-red-700">Delete permanently</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminPage>
  );
}
