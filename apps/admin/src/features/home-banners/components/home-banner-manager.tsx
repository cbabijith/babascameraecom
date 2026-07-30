"use client";

/* eslint-disable @next/next/no-img-element -- Banner media URLs are created at runtime in Supabase Storage. */

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
  Monitor,
  Pencil,
  Plus,
  Smartphone,
  Trash2,
  Video,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";

import {
  SortableDragHandle,
  SortableList,
  SortableListItem,
} from "@/components/sortable-list";
import { AdminPage, AdminPageHeader, AdminSection } from "@/components/ui/admin-page";
import { createClient } from "@/lib/supabase/client";

import { homeBannerApi } from "../api/home-banner-api-client";
import { getBannerStatus } from "../tables/banner-list-model";
import type { HomeBanner, UploadedBannerMedia } from "../types";

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
  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between gap-3">
        <Label htmlFor={id}>{label}{required ? " *" : ""}</Label>
        {value ? <span className="text-xs font-medium text-emerald-700">Ready</span> : null}
      </div>
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
    const { error } = await createClient().storage
      .from("home-banners")
      .uploadToSignedUrl(path, token, file, { contentType: "video/mp4" });
    if (error) {
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
                            <img src={banner.desktopMediaUrl} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <>
                              {banner.posterUrl ? <img src={banner.posterUrl} alt="" className="h-full w-full object-cover" /> : null}
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
