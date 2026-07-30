"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Form, toast } from "@babascamera/ui";
import { useState } from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";

import { AdminCheckboxField, AdminInputField } from "@/components/admin-form-field";

import { brandsApi } from "../api/brands-api-client";
import { brandClientSchema } from "../schemas/brand";
import type { BrandListItem } from "../types";
import { BrandLogoField } from "./brand-logo-field";

type Values = z.infer<typeof brandClientSchema>;

export function BrandForm({
  brand,
  onCancel,
  onSaved,
}: {
  brand: BrandListItem | null;
  onCancel: () => void;
  onSaved: (brand: BrandListItem) => void;
}) {
  const [logo, setLogo] = useState<File | null>(null);
  const [removeLogo, setRemoveLogo] = useState(false);
  const form = useForm<Values>({
    resolver: zodResolver(brandClientSchema),
    defaultValues: { name: brand?.name ?? "", isActive: brand?.isActive ?? true },
  });
  const submit = form.handleSubmit(async (values) => {
    const body = new FormData();
    body.set("name", values.name);
    body.set("isActive", String(values.isActive));
    if (removeLogo) body.set("removeLogo", "true");
    if (logo) body.set("logo", logo);
    const result = brand ? await brandsApi.update(brand.id, body) : await brandsApi.create(body);
    if (!result.success) {
      for (const [name, messages] of Object.entries(result.fieldErrors ?? {})) {
        if (name === "name" || name === "isActive") {
          const message = messages[0];
          if (message) form.setError(name, { message });
        }
      }
      if (result.fieldErrors?.name) form.setFocus("name");
      toast.error(result.error);
      return;
    }
    toast.success(brand ? "Brand updated." : "Brand created.");
    onSaved(result.data);
  });
  return (
    <Form {...form}>
      <form onSubmit={submit} className="grid gap-4">
        <AdminInputField name="name" label="Brand name" inputProps={{ autoFocus: true, autoComplete: "organization" }} />
        <BrandLogoField
          currentLogoUrl={brand?.logoUrl ?? null}
          disabled={form.formState.isSubmitting}
          file={logo}
          onFileChange={setLogo}
          onRemoveChange={setRemoveLogo}
          removeLogo={removeLogo}
        />
        <AdminCheckboxField name="isActive" label="Active" />
        <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
          <Button type="button" variant="outline" disabled={form.formState.isSubmitting} onClick={onCancel}>Cancel</Button>
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "Saving..." : "Save brand"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
