import { Field, inputClassName, textareaClassName } from "@/components/ui/form-controls";
import { SubmitButton } from "@/components/ui/submit-button";
import { saveBannerAction } from "@/lib/actions/promotions";
import type { BannerSummary } from "@/lib/data/types";

function dateTimeValue(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 16);
}

export function BannerForm({ banner }: { banner?: BannerSummary }) {
  return (
    <form action={saveBannerAction} className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-4">
      {banner ? <input type="hidden" name="id" value={banner.id} /> : null}
      <Field label="Heading" className="md:col-span-2">
        <input
          className={inputClassName}
          name="heading"
          required
          maxLength={160}
          defaultValue={banner?.heading}
        />
      </Field>
      <Field label="Banner type">
        <select
          className={inputClassName}
          name="banner_type"
          defaultValue={banner?.banner_type ?? "hero"}
        >
          <option value="hero">Hero</option>
          <option value="strip">Announcement strip</option>
          <option value="category">Category feature</option>
          <option value="promotion">Promotion</option>
        </select>
      </Field>
      <Field label="Position">
        <input
          className={inputClassName}
          type="number"
          name="position"
          min={0}
          defaultValue={banner?.position ?? 0}
        />
      </Field>
      <Field label="Subheading" className="md:col-span-2">
        <textarea
          className={textareaClassName}
          name="subheading"
          maxLength={300}
          defaultValue={banner?.subheading ?? ""}
        />
      </Field>
      <Field label="Tagline">
        <input
          className={inputClassName}
          name="tagline"
          maxLength={160}
          defaultValue={banner?.tagline ?? ""}
        />
      </Field>
      <Field label="CTA label">
        <input
          className={inputClassName}
          name="cta_label"
          maxLength={60}
          defaultValue={banner?.cta_label ?? ""}
        />
      </Field>
      <Field label="CTA destination" hint="A /store path or complete HTTPS URL.">
        <input
          className={inputClassName}
          name="cta_href"
          maxLength={500}
          defaultValue={banner?.cta_href ?? ""}
          placeholder="/products"
        />
      </Field>
      <Field label="Status">
        <select className={inputClassName} name="status" defaultValue={banner?.status ?? "draft"}>
          <option value="draft">Draft</option>
          <option value="active">Active</option>
          <option value="archived">Archived</option>
        </select>
      </Field>
      <Field label="Visibility">
        <select
          className={inputClassName}
          name="visibility"
          defaultValue={banner?.visibility ?? "hidden"}
        >
          <option value="hidden">Hidden</option>
          <option value="visible">Visible</option>
        </select>
      </Field>
      <Field label="Starts (optional)">
        <input
          className={inputClassName}
          type="datetime-local"
          name="starts_at"
          defaultValue={dateTimeValue(banner?.starts_at)}
        />
      </Field>
      <Field label="Ends (optional)">
        <input
          className={inputClassName}
          type="datetime-local"
          name="ends_at"
          defaultValue={dateTimeValue(banner?.ends_at)}
        />
      </Field>
      <div className="flex items-end justify-end md:col-span-2 xl:col-span-4">
        <SubmitButton pendingLabel="Saving banner…">Save banner</SubmitButton>
      </div>
    </form>
  );
}
