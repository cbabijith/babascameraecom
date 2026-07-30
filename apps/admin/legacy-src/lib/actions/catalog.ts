"use server";

import { createHash, randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";

import type { Json, TablesUpdate } from "@babas/database";

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
  catalogLookupSchema,
  jsonObject,
  productSchema,
  uuidSchema,
  variantSchema,
} from "@/lib/actions/validation";
import { createClient } from "@/lib/supabase/server";
import { asBoolean, parsePaise, slugify } from "@/lib/utils";

type LookupTable = "brands" | "categories";
const CATALOG_ROLES = ["catalog_manager", "admin", "super_admin"] as const;
const CATALOG_MEDIA_MAX_BYTES = 10 * 1024 * 1024;
const CATALOG_MEDIA_EXTENSIONS: Record<string, string> = {
  "image/avif": "avif",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

async function upsertLookup(
  table: LookupTable,
  formData: FormData,
  path: "/brands" | "/categories",
) {
  const admin = await requireAnyRole(CATALOG_ROLES);
  const id = optionalFormString(formData, "id");
  const name = formString(formData, "name");
  const parsed = catalogLookupSchema.safeParse({
    id: id ?? undefined,
    name,
    slug: formString(formData, "slug") || slugify(name),
    code: formString(formData, "code"),
    description: optionalFormString(formData, "description"),
    status: formString(formData, "status") || "draft",
    visibility: formString(formData, "visibility") || "hidden",
    position: formInteger(formData, "position"),
    parent_id:
      table === "categories" ? optionalFormString(formData, "parent_id") : undefined,
  });

  if (!parsed.success) {
    redirectWithMessage(path, { error: validationMessage(parsed.error) });
  }

  const supabase = await createClient();
  const payload = {
    name: parsed.data.name,
    slug: parsed.data.slug,
    code: parsed.data.code,
    description: parsed.data.description,
    status: parsed.data.status,
    visibility: parsed.data.visibility,
    position: parsed.data.position,
    updated_by: admin.id,
  };

  if (id) {
    const beforeResult =
      table === "categories"
        ? await supabase.from("categories").select("*").eq("id", id).maybeSingle()
        : await supabase.from("brands").select("*").eq("id", id).maybeSingle();
    const { error } =
      table === "categories"
        ? await supabase
            .from("categories")
            .update({ ...payload, parent_id: parsed.data.parent_id ?? null })
            .eq("id", id)
        : await supabase.from("brands").update(payload).eq("id", id);
    if (error) redirectWithMessage(path, { error: error.message });
    await writeAuditLog({
      actorId: admin.id,
      action: `${table}.update`,
      table,
      entityId: id,
      before: beforeResult.data,
      after: payload,
    });
  } else {
    const { data, error } =
      table === "categories"
        ? await supabase
            .from("categories")
            .insert({
              ...payload,
              parent_id: parsed.data.parent_id ?? null,
              created_by: admin.id,
            })
            .select("id")
            .single()
        : await supabase
            .from("brands")
            .insert({ ...payload, created_by: admin.id })
            .select("id")
            .single();
    if (error) redirectWithMessage(path, { error: error.message });
    await writeAuditLog({
      actorId: admin.id,
      action: `${table}.create`,
      table,
      entityId: data.id,
      after: payload,
    });
  }

  revalidatePath(path);
  revalidatePath("/products");
  redirectWithMessage(path, { success: `${name} saved.` });
}

export async function saveBrandAction(formData: FormData) {
  return upsertLookup("brands", formData, "/brands");
}

export async function saveCategoryAction(formData: FormData) {
  return upsertLookup("categories", formData, "/categories");
}

export async function archiveCatalogItemAction(formData: FormData) {
  const admin = await requireAnyRole(CATALOG_ROLES);
  const table = formString(formData, "table");
  const idResult = uuidSchema.safeParse(formString(formData, "id"));
  const path = table === "categories" ? "/categories" : "/brands";
  if ((table !== "brands" && table !== "categories") || !idResult.success) {
    redirectWithMessage(path, { error: "Invalid archive request." });
  }
  const supabase = await createClient();
  const { data: before } = await supabase.from(table).select("*").eq("id", idResult.data).maybeSingle();
  const { error } = await supabase
    .from(table)
    .update({
      status: "archived",
      visibility: "hidden",
      updated_by: admin.id,
    })
    .eq("id", idResult.data);
  if (error) redirectWithMessage(path, { error: error.message });
  await writeAuditLog({
    actorId: admin.id,
    action: `${table}.archive`,
    table,
    entityId: idResult.data,
    before,
    after: { status: "archived", visibility: "hidden" },
  });
  revalidatePath(path);
  redirectWithMessage(path, { success: "Item archived." });
}

function parseProduct(formData: FormData) {
  const id = optionalFormString(formData, "id");
  const name = formString(formData, "name");
  let specifications: Record<string, unknown>;
  try {
    specifications = jsonObject(formString(formData, "specifications"));
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Specifications are invalid." } as const;
  }

  const parsed = productSchema.safeParse({
    id: id ?? undefined,
    brand_id: formString(formData, "brand_id"),
    primary_category_id: formString(formData, "primary_category_id"),
    name,
    slug: formString(formData, "slug") || slugify(name),
    code: formString(formData, "code"),
    description: optionalFormString(formData, "description"),
    key_features: formString(formData, "key_features")
      .split(/\r?\n/)
      .map((value) => value.trim())
      .filter(Boolean),
    specifications,
    measuring_unit: formString(formData, "measuring_unit") || "unit",
    payment_eligibility: formString(formData, "payment_eligibility") || "both",
    status: formString(formData, "status") || "draft",
    visibility: formString(formData, "visibility") || "hidden",
    position: formInteger(formData, "position"),
    seo_title: optionalFormString(formData, "seo_title"),
    seo_description: optionalFormString(formData, "seo_description"),
  });
  return parsed.success
    ? ({ data: parsed.data } as const)
    : ({ error: validationMessage(parsed.error) } as const);
}

export async function updateProductAction(formData: FormData) {
  const admin = await requireAnyRole(CATALOG_ROLES);
  const parsed = parseProduct(formData);
  const id = formString(formData, "id");
  const destination = id ? `/products/${id}` : "/products";
  if ("error" in parsed) redirectWithMessage(destination, { error: parsed.error });
  const idResult = uuidSchema.safeParse(id);
  if (!idResult.success) redirectWithMessage("/products", { error: "Invalid product." });

  const supabase = await createClient();
  const { data: before } = await supabase
    .from("products")
    .select("*")
    .eq("id", idResult.data)
    .maybeSingle();
  if (!before) {
    redirectWithMessage("/products", { error: "Product not found." });
  }
  const data = { ...parsed.data };
  delete data.id;
  const payload: TablesUpdate<"products"> = {
    ...data,
    primary_category_id: data.primary_category_id,
    status:
      before.status === "archived"
        ? "archived"
        : data.status === "archived"
          ? before.status
          : data.status,
    specifications: data.specifications as Json,
    updated_by: admin.id,
  };
  const { error } = await supabase.from("products").update(payload).eq("id", idResult.data);
  if (error) redirectWithMessage(destination, { error: error.message });
  await writeAuditLog({
    actorId: admin.id,
    action: "products.update",
    table: "products",
    entityId: idResult.data,
    before,
    after: payload,
  });
  revalidatePath("/products");
  revalidatePath(destination);
  redirectWithMessage(destination, { success: "Product details saved." });
}

export async function saveVariantAction(formData: FormData) {
  const admin = await requireAnyRole(CATALOG_ROLES);
  const productId = formString(formData, "product_id");
  const variantId = optionalFormString(formData, "id");
  const destination = `/products/${productId}`;
  const parsed = variantSchema.safeParse({
    id: variantId ?? undefined,
    product_id: productId,
    sku: formString(formData, "sku"),
    barcode: optionalFormString(formData, "barcode"),
    hsn_code: optionalFormString(formData, "hsn_code"),
    color: optionalFormString(formData, "color"),
    color_label: optionalFormString(formData, "color_label"),
    price_minor: parsePaise(formData.get("price")),
    compare_at_minor: formString(formData, "compare_at_price")
      ? parsePaise(formData.get("compare_at_price"))
      : null,
    cost_minor: formString(formData, "cost_price")
      ? parsePaise(formData.get("cost_price"))
      : null,
    tax_rate_bps: Math.round(Number(formString(formData, "tax_rate") || 0) * 100),
    tax_mode: formString(formData, "tax_mode") || "inclusive",
    weight_grams: formString(formData, "weight_grams")
      ? formInteger(formData, "weight_grams")
      : null,
    is_default: asBoolean(formData.get("is_default")),
    is_active: asBoolean(formData.get("is_active")),
  });
  if (!parsed.success) {
    redirectWithMessage(destination, { error: validationMessage(parsed.error) });
  }

  const supabase = await createClient();
  const {
    id: _parsedVariantId,
    is_default: shouldBeDefault,
    product_id: parsedProductId,
    ...variantValues
  } = parsed.data;
  void _parsedVariantId;
  let savedVariantId = variantId;

  if (variantId) {
    const { data: before } = await supabase
      .from("staff_product_variants")
      .select("*")
      .eq("id", variantId)
      .maybeSingle();
    const { error } = await supabase
      .from("product_variants")
      .update(variantValues)
      .eq("id", variantId)
      .eq("product_id", productId);
    if (error) redirectWithMessage(destination, { error: error.message });
    await writeAuditLog({
      actorId: admin.id,
      action: "product_variants.update",
      table: "product_variants",
      entityId: variantId,
      before,
      after: { ...variantValues, is_default: shouldBeDefault },
    });
  } else {
    const { data, error } = await supabase
      .from("product_variants")
      .insert({
        ...variantValues,
        product_id: parsedProductId,
      })
      .select("id")
      .single();
    if (error) redirectWithMessage(destination, { error: error.message });
    savedVariantId = data.id;
    await writeAuditLog({
      actorId: admin.id,
      action: "product_variants.create",
      table: "product_variants",
      entityId: data.id,
      after: {
        ...variantValues,
        product_id: parsedProductId,
        is_default: shouldBeDefault,
      },
    });
  }

  if (shouldBeDefault && savedVariantId) {
    const { error } = await supabase.rpc("set_default_variant", {
      p_product_id: productId,
      p_variant_id: savedVariantId,
    });
    if (error) redirectWithMessage(destination, { error: error.message });
  }

  revalidatePath("/products");
  revalidatePath(destination);
  redirectWithMessage(destination, { success: "Variant saved." });
}

export async function uploadProductMediaAction(formData: FormData) {
  const admin = await requireAnyRole(CATALOG_ROLES);
  const productId = uuidSchema.safeParse(formString(formData, "product_id"));
  const file = formData.get("file");
  const altText = formString(formData, "alt_text");
  const position = formInteger(formData, "position", 0);
  const destination = productId.success
    ? `/products/${productId.data}`
    : "/products";

  if (
    !productId.success ||
    !(file instanceof File) ||
    file.size <= 0 ||
    file.size > CATALOG_MEDIA_MAX_BYTES ||
    !CATALOG_MEDIA_EXTENSIONS[file.type] ||
    altText.length > 180 ||
    position < 0 ||
    position > 100_000
  ) {
    redirectWithMessage(destination, {
      error:
        "Choose a JPEG, PNG, WebP, or AVIF image up to 10 MB and check its details.",
    });
  }

  const supabase = await createClient();
  const { data: product, error: productError } = await supabase
    .from("products")
    .select("id,name")
    .eq("id", productId.data)
    .maybeSingle();
  if (productError || !product) {
    redirectWithMessage("/products", { error: "Product not found." });
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const checksum = createHash("sha256").update(bytes).digest("hex");
  const bucket = "catalog-public";
  const extension = CATALOG_MEDIA_EXTENSIONS[file.type];
  const objectPath = `products/${productId.data}/${randomUUID()}.${extension}`;
  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(objectPath, bytes, {
      contentType: file.type,
      cacheControl: "public, max-age=31536000, immutable",
      upsert: false,
    });
  if (uploadError) {
    redirectWithMessage(destination, { error: uploadError.message });
  }

  const { data: asset, error: assetError } = await supabase
    .from("media_assets")
    .insert({
      bucket,
      object_path: objectPath,
      original_name: file.name.slice(0, 240),
      mime_type: file.type,
      byte_size: file.size,
      checksum_sha256: checksum,
      alt_text: altText || product.name,
      is_public: true,
      created_by: admin.id,
    })
    .select("id")
    .single();
  if (assetError || !asset) {
    await supabase.storage.from(bucket).remove([objectPath]);
    redirectWithMessage(destination, {
      error: assetError?.message ?? "Unable to record the image.",
    });
  }

  const { error: linkError } = await supabase.from("product_media").insert({
    product_id: productId.data,
    media_id: asset.id,
    media_role: position === 0 ? "primary" : "gallery",
    alt_text: altText || product.name,
    position,
  });
  if (linkError) {
    await supabase.from("media_assets").delete().eq("id", asset.id);
    await supabase.storage.from(bucket).remove([objectPath]);
    redirectWithMessage(destination, { error: linkError.message });
  }

  await writeAuditLog({
    actorId: admin.id,
    action: "product_media.create",
    table: "product_media",
    entityId: asset.id,
    after: {
      product_id: productId.data,
      media_id: asset.id,
      object_path: objectPath,
      position,
    },
  });
  revalidatePath("/products");
  revalidatePath(destination);
  redirectWithMessage(destination, { success: "Product image uploaded." });
}

export async function removeProductMediaAction(formData: FormData) {
  const admin = await requireAnyRole(CATALOG_ROLES);
  const productId = uuidSchema.safeParse(formString(formData, "product_id"));
  const linkId = uuidSchema.safeParse(formString(formData, "product_media_id"));
  const destination = productId.success
    ? `/products/${productId.data}`
    : "/products";
  if (!productId.success || !linkId.success) {
    redirectWithMessage(destination, { error: "Invalid product image." });
  }

  const supabase = await createClient();
  const { data: before, error: readError } = await supabase
    .from("product_media")
    .select("*")
    .eq("id", linkId.data)
    .eq("product_id", productId.data)
    .maybeSingle();
  if (readError || !before) {
    redirectWithMessage(destination, { error: "Product image not found." });
  }
  const { error } = await supabase
    .from("product_media")
    .delete()
    .eq("id", linkId.data)
    .eq("product_id", productId.data);
  if (error) redirectWithMessage(destination, { error: error.message });

  await writeAuditLog({
    actorId: admin.id,
    action: "product_media.unlink",
    table: "product_media",
    entityId: linkId.data,
    before,
  });
  revalidatePath("/products");
  revalidatePath(destination);
  redirectWithMessage(destination, { success: "Product image removed." });
}

export async function archiveProductAction(formData: FormData) {
  const admin = await requireAnyRole(CATALOG_ROLES);
  const parsed = uuidSchema.safeParse(formString(formData, "id"));
  if (!parsed.success) redirectWithMessage("/products", { error: "Invalid product." });
  const supabase = await createClient();
  const { data: before } = await supabase
    .from("products")
    .select("*")
    .eq("id", parsed.data)
    .maybeSingle();
  const { error } = await supabase
    .from("products")
    .update({
      status: "archived",
      visibility: "hidden",
      archived_at: new Date().toISOString(),
      updated_by: admin.id,
    })
    .eq("id", parsed.data);
  if (error) redirectWithMessage("/products", { error: error.message });
  await writeAuditLog({
    actorId: admin.id,
    action: "products.archive",
    table: "products",
    entityId: parsed.data,
    before,
    after: { status: "archived", visibility: "hidden" },
  });
  revalidatePath("/products");
  redirectWithMessage("/products", { success: "Product archived." });
}
