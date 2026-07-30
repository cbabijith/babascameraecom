import { Field, inputClassName, textareaClassName } from "@/components/ui/form-controls";
import { SubmitButton } from "@/components/ui/submit-button";
import { saveCollectionAction } from "@/lib/actions/promotions";
import type { CollectionSummary } from "@/lib/data/types";

function dateTimeValue(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 16);
}

export function CollectionForm({ collection }: { collection?: CollectionSummary }) {
  return (
    <form action={saveCollectionAction} className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-4">
      {collection ? <input type="hidden" name="id" value={collection.id} /> : null}
      <Field label="Collection name">
        <input
          className={inputClassName}
          name="name"
          required
          maxLength={160}
          defaultValue={collection?.name}
        />
      </Field>
      <Field label="URL slug" hint="Leave blank to generate from the name.">
        <input
          className={inputClassName}
          name="slug"
          maxLength={160}
          defaultValue={collection?.slug}
        />
      </Field>
      <Field label="Collection discount (%)">
        <input
          className={inputClassName}
          type="number"
          name="discount_percentage"
          min={0}
          max={100}
          step="0.01"
          defaultValue={(collection?.discount_bps ?? 0) / 100}
        />
      </Field>
      <Field label="Position">
        <input
          className={inputClassName}
          type="number"
          name="position"
          min={0}
          defaultValue={collection?.position ?? 0}
        />
      </Field>
      <Field label="Description" className="md:col-span-2">
        <textarea
          className={textareaClassName}
          name="description"
          maxLength={2000}
          defaultValue={collection?.description ?? ""}
        />
      </Field>
      <Field label="Status">
        <select
          className={inputClassName}
          name="status"
          defaultValue={collection?.status ?? "draft"}
        >
          <option value="draft">Draft</option>
          <option value="active">Active</option>
          <option value="archived">Archived</option>
        </select>
      </Field>
      <Field label="Visibility">
        <select
          className={inputClassName}
          name="visibility"
          defaultValue={collection?.visibility ?? "hidden"}
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
          defaultValue={dateTimeValue(collection?.starts_at)}
        />
      </Field>
      <Field label="Ends (optional)">
        <input
          className={inputClassName}
          type="datetime-local"
          name="ends_at"
          defaultValue={dateTimeValue(collection?.ends_at)}
        />
      </Field>
      <div className="flex items-end justify-end md:col-span-2 xl:col-span-4">
        <SubmitButton pendingLabel="Saving collection…">Save collection</SubmitButton>
      </div>
    </form>
  );
}
