import { Archive } from "lucide-react";

import { Field, inputClassName, textareaClassName } from "@/components/ui/form-controls";
import { SubmitButton } from "@/components/ui/submit-button";
import {
  archiveCatalogItemAction,
  saveBrandAction,
  saveCategoryAction,
} from "@/lib/actions/catalog";
import type { CatalogLookup } from "@/lib/data/types";

export function LookupForm({
  type,
  item,
  allCategories = [],
}: {
  type: "brand" | "category";
  item?: CatalogLookup;
  allCategories?: CatalogLookup[];
}) {
  const saveAction = type === "brand" ? saveBrandAction : saveCategoryAction;

  return (
    <form action={saveAction} className="grid gap-4 p-5 sm:grid-cols-2">
      {item ? <input type="hidden" name="id" value={item.id} /> : null}
      <Field label={`${type === "brand" ? "Brand" : "Category"} name`}>
        <input className={inputClassName} name="name" defaultValue={item?.name} required />
      </Field>
      <Field label="URL slug" hint="Leave blank to derive it from the name.">
        <input className={inputClassName} name="slug" defaultValue={item?.slug} />
      </Field>
      <Field label="Code">
        <input className={inputClassName} name="code" defaultValue={item?.code} required />
      </Field>
      {type === "category" ? (
        <Field label="Parent category">
          <select
            className={inputClassName}
            name="parent_id"
            defaultValue={item?.parent_id ?? ""}
          >
            <option value="">No parent</option>
            {allCategories
              .filter((category) => category.id !== item?.id)
              .map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
          </select>
        </Field>
      ) : null}
      <Field label="Status">
        <select className={inputClassName} name="status" defaultValue={item?.status ?? "draft"}>
          <option value="draft">Draft</option>
          <option value="active">Active</option>
          <option value="archived">Archived</option>
        </select>
      </Field>
      <Field label="Visibility">
        <select
          className={inputClassName}
          name="visibility"
          defaultValue={item?.visibility ?? "hidden"}
        >
          <option value="hidden">Hidden</option>
          <option value="visible">Visible</option>
        </select>
      </Field>
      <Field label="Display position">
        <input
          className={inputClassName}
          type="number"
          name="position"
          min={0}
          defaultValue={item?.position ?? 0}
        />
      </Field>
      <Field label="Description" className="sm:col-span-2">
        <textarea
          className={textareaClassName}
          name="description"
          defaultValue={item?.description ?? ""}
          maxLength={2000}
        />
      </Field>
      <div className="flex flex-wrap justify-end gap-3 sm:col-span-2">
        {item && item.status !== "archived" ? (
          <button
            type="submit"
            formAction={archiveCatalogItemAction}
            name="table"
            value={type === "brand" ? "brands" : "categories"}
            className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-rose-200 px-4 text-sm font-bold text-rose-700 hover:bg-rose-50"
          >
            <Archive className="size-4" />
            Archive
          </button>
        ) : null}
        <SubmitButton pendingLabel="Saving…">
          {item ? "Save changes" : `Create ${type}`}
        </SubmitButton>
      </div>
    </form>
  );
}
