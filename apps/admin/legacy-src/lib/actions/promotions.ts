"use server";

import { revalidatePath } from "next/cache";

import { requireAnyRole } from "@/lib/auth/admin";
import {
  formInteger,
  formString,
  optionalFormString,
  redirectWithMessage,
  validationMessage,
  writeAuditLog,
} from "@/lib/actions/helpers";
import {
  bannerSchema,
  collectionSchema,
  couponSchema,
  dateTimeOrNull,
  uuidSchema,
} from "@/lib/actions/validation";
import { createClient } from "@/lib/supabase/server";
import { asBoolean, parsePaise, slugify } from "@/lib/utils";

const CATALOG_ROLES = ["catalog_manager", "admin", "super_admin"] as const;

export async function saveCouponAction(formData: FormData) {
  const admin = await requireAnyRole(CATALOG_ROLES);
  const id = optionalFormString(formData, "id");
  const startsAt = dateTimeOrNull(formString(formData, "starts_at"));
  const endsAt = dateTimeOrNull(formString(formData, "ends_at"));
  const couponType = formString(formData, "coupon_type");
  const rawValue = Number(formString(formData, "value"));
  const value =
    couponType === "percentage"
      ? Math.round(rawValue * 100)
      : couponType === "fixed"
        ? parsePaise(formData.get("value"))
        : 1;
  const parsed = couponSchema.safeParse({
    id: id ?? undefined,
    code: formString(formData, "code"),
    name: formString(formData, "name"),
    description: optionalFormString(formData, "description"),
    coupon_type: couponType,
    value,
    maximum_discount_minor: formString(formData, "maximum_discount")
      ? parsePaise(formData.get("maximum_discount"))
      : null,
    minimum_subtotal_minor: parsePaise(formData.get("minimum_subtotal")),
    starts_at: startsAt,
    ends_at: endsAt,
    total_usage_limit: formString(formData, "total_usage_limit")
      ? formInteger(formData, "total_usage_limit")
      : null,
    per_customer_limit: formInteger(formData, "per_customer_limit", 1),
    is_active: asBoolean(formData.get("is_active")),
  });
  if (!parsed.success) {
    redirectWithMessage("/coupons", { error: validationMessage(parsed.error) });
  }

  const supabase = await createClient();
  const payload = { ...parsed.data, updated_by: admin.id };
  delete payload.id;
  if (id) {
    const { data: before } = await supabase.from("coupons").select("*").eq("id", id).maybeSingle();
    const { error } = await supabase.from("coupons").update(payload).eq("id", id);
    if (error) redirectWithMessage("/coupons", { error: error.message });
    await writeAuditLog({
      actorId: admin.id,
      action: "coupons.update",
      table: "coupons",
      entityId: id,
      before,
      after: payload,
    });
  } else {
    const { data, error } = await supabase
      .from("coupons")
      .insert({ ...payload, created_by: admin.id })
      .select("id")
      .single();
    if (error) redirectWithMessage("/coupons", { error: error.message });
    await writeAuditLog({
      actorId: admin.id,
      action: "coupons.create",
      table: "coupons",
      entityId: data.id,
      after: payload,
    });
  }
  revalidatePath("/coupons");
  redirectWithMessage("/coupons", { success: "Coupon saved." });
}

export async function toggleCouponAction(formData: FormData) {
  const admin = await requireAnyRole(CATALOG_ROLES);
  const id = uuidSchema.safeParse(formString(formData, "id"));
  if (!id.success) redirectWithMessage("/coupons", { error: "Invalid coupon." });
  const enabled = asBoolean(formData.get("enabled"));
  const supabase = await createClient();
  const { error } = await supabase
    .from("coupons")
    .update({ is_active: enabled, updated_by: admin.id })
    .eq("id", id.data);
  if (error) redirectWithMessage("/coupons", { error: error.message });
  await writeAuditLog({
    actorId: admin.id,
    action: enabled ? "coupons.enable" : "coupons.disable",
    table: "coupons",
    entityId: id.data,
    after: { is_active: enabled },
  });
  revalidatePath("/coupons");
  redirectWithMessage("/coupons", { success: enabled ? "Coupon enabled." : "Coupon disabled." });
}

export async function saveBannerAction(formData: FormData) {
  const admin = await requireAnyRole(CATALOG_ROLES);
  const id = optionalFormString(formData, "id");
  const parsed = bannerSchema.safeParse({
    id: id ?? undefined,
    heading: formString(formData, "heading"),
    subheading: optionalFormString(formData, "subheading"),
    tagline: optionalFormString(formData, "tagline"),
    cta_label: optionalFormString(formData, "cta_label"),
    cta_href: optionalFormString(formData, "cta_href"),
    banner_type: formString(formData, "banner_type") || "hero",
    status: formString(formData, "status") || "draft",
    visibility: formString(formData, "visibility") || "hidden",
    position: formInteger(formData, "position"),
    starts_at: dateTimeOrNull(formString(formData, "starts_at")),
    ends_at: dateTimeOrNull(formString(formData, "ends_at")),
  });
  if (!parsed.success) {
    redirectWithMessage("/banners", { error: validationMessage(parsed.error) });
  }
  const supabase = await createClient();
  const payload = { ...parsed.data, updated_by: admin.id };
  delete payload.id;
  if (id) {
    const { data: before } = await supabase.from("banners").select("*").eq("id", id).maybeSingle();
    const { error } = await supabase.from("banners").update(payload).eq("id", id);
    if (error) redirectWithMessage("/banners", { error: error.message });
    await writeAuditLog({
      actorId: admin.id,
      action: "banners.update",
      table: "banners",
      entityId: id,
      before,
      after: payload,
    });
  } else {
    const { data, error } = await supabase
      .from("banners")
      .insert({ ...payload, created_by: admin.id })
      .select("id")
      .single();
    if (error) redirectWithMessage("/banners", { error: error.message });
    await writeAuditLog({
      actorId: admin.id,
      action: "banners.create",
      table: "banners",
      entityId: data.id,
      after: payload,
    });
  }
  revalidatePath("/banners");
  redirectWithMessage("/banners", { success: "Banner saved." });
}

export async function saveCollectionAction(formData: FormData) {
  const admin = await requireAnyRole(CATALOG_ROLES);
  const id = optionalFormString(formData, "id");
  const name = formString(formData, "name");
  const parsed = collectionSchema.safeParse({
    id: id ?? undefined,
    name,
    slug: formString(formData, "slug") || slugify(name),
    description: optionalFormString(formData, "description"),
    discount_bps: Math.round(Number(formString(formData, "discount_percentage") || 0) * 100),
    status: formString(formData, "status") || "draft",
    visibility: formString(formData, "visibility") || "hidden",
    position: formInteger(formData, "position"),
    starts_at: dateTimeOrNull(formString(formData, "starts_at")),
    ends_at: dateTimeOrNull(formString(formData, "ends_at")),
  });
  if (!parsed.success) {
    redirectWithMessage("/collections", { error: validationMessage(parsed.error) });
  }
  const supabase = await createClient();
  const payload = { ...parsed.data, updated_by: admin.id };
  delete payload.id;
  if (id) {
    const { data: before } = await supabase
      .from("collections")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    const { error } = await supabase.from("collections").update(payload).eq("id", id);
    if (error) redirectWithMessage("/collections", { error: error.message });
    await writeAuditLog({
      actorId: admin.id,
      action: "collections.update",
      table: "collections",
      entityId: id,
      before,
      after: payload,
    });
  } else {
    const { data, error } = await supabase
      .from("collections")
      .insert({ ...payload, created_by: admin.id })
      .select("id")
      .single();
    if (error) redirectWithMessage("/collections", { error: error.message });
    await writeAuditLog({
      actorId: admin.id,
      action: "collections.create",
      table: "collections",
      entityId: data.id,
      after: payload,
    });
  }
  revalidatePath("/collections");
  redirectWithMessage("/collections", { success: "Collection saved." });
}

export async function changeCollectionProductAction(formData: FormData) {
  await requireAnyRole(CATALOG_ROLES);
  const collectionId = uuidSchema.safeParse(formString(formData, "collection_id"));
  const productId = uuidSchema.safeParse(formString(formData, "product_id"));
  const operation = formString(formData, "operation");
  const position = formInteger(formData, "position");
  if (
    !collectionId.success ||
    !productId.success ||
    !["add", "remove"].includes(operation) ||
    position < 0
  ) {
    redirectWithMessage("/collections", { error: "Invalid collection product change." });
  }

  const supabase = await createClient();
  if (operation === "add") {
    const { error } = await supabase.from("collection_products").upsert(
      {
        collection_id: collectionId.data,
        product_id: productId.data,
        position,
      },
      { onConflict: "collection_id,product_id" },
    );
    if (error) redirectWithMessage("/collections", { error: error.message });
  } else {
    const { error } = await supabase
      .from("collection_products")
      .delete()
      .eq("collection_id", collectionId.data)
      .eq("product_id", productId.data);
    if (error) redirectWithMessage("/collections", { error: error.message });
  }
  revalidatePath("/collections");
  revalidatePath("/");
  redirectWithMessage("/collections", {
    success: operation === "add" ? "Product added to collection." : "Product removed.",
  });
}
