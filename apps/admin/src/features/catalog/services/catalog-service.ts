import { randomUUID } from "node:crypto";

import {
  and,
  db,
  eq,
  inArray,
  isNull,
  productImages,
  products,
  productVariants,
  categories,
} from "@babascamera/db";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  actionFailureFromError,
  actionSuccess,
  AdminActionError,
  type AdminActionResult,
  validationFailure,
} from "@/lib/actions/result";
import { parseMoney, parseOptionalMoney } from "@/lib/money";
import {
  PRODUCT_IMAGE_BUCKET,
  randomizedProductImagePath,
  storagePathFromPublicUrl,
  validateProductImage,
} from "@/lib/security/product-image";
import { sanitizeProductDescription } from "@/lib/security/rich-text";
import { getSupabasePublicConfig } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import { formBoolean, formInteger, optionalText, slugify } from "@/lib/utils";
import type { CategoryListItem } from "@/features/catalog/types";

const uuid = z.string().uuid();
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const booleanEntry = z.enum(["true", "false", "1", "0", "on"]).optional();
const requiredBooleanEntry = z.enum(["true", "false", "1", "0", "on"]);
const idFormSchema = z.object({ id: uuid });
const productImageFormSchema = z.object({ productId: uuid, imageId: uuid });
const categoryReorderSchema = z.object({
  parentId: z.union([uuid, z.literal("")]),
  categoryIds: z.string().optional(),
  orderedCategoryIds: z.string().optional(),
});
const productFormSchema = z.object({
  id: uuid.optional(),
  name: z.string().trim().min(1).max(180),
  slug: z.string(),
  sku: z.string().trim().max(120),
  categoryId: uuid,
  brandId: z.union([uuid, z.literal("")]),
  shortDescription: z.string().max(400),
  description: z.string().max(50_000),
  mrp: z.string().min(1),
  salePrice: z.string().min(1),
  costPrice: z.string(),
  gstRate: z.string(),
  priceIncludesGst: booleanEntry,
  stock: z.string().regex(/^\d+$/),
  lowStockThreshold: z.string().regex(/^\d+$/),
  weight: z.string(),
  shippingFee: z.string(),
  warranty: z.string().max(500),
  youtubeUrl: z.string().max(2_000),
  metaTitle: z.string().max(180),
  metaDescription: z.string().max(400),
  isActive: booleanEntry,
  isFeatured: booleanEntry,
  variants: z.string(),
});
const lookupFormSchema = z.object({
  id: uuid.optional(),
  name: z.string().trim().min(1).max(120),
  slug: z.string().optional(),
  description: z.string().max(1_000).optional(),
  isActive: booleanEntry,
  imageUrl: z.string().optional(),
  logoUrl: z.string().optional(),
  parentId: z.union([uuid, z.literal("")]).optional(),
  removeImage: booleanEntry,
});

const variantSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1).max(80),
  value: z.string().trim().min(1).max(120),
  sku: z.string().trim().min(1).max(120),
  additionalPrice: z.string(),
  stock: z.number().int().nonnegative(),
});

function validatedSlug(value: FormDataEntryValue | null, fallback: string) {
  const slug = slugify(String(value ?? "") || fallback);
  if (!slugPattern.test(slug)) throw new AdminActionError("Slug must contain lowercase letters, numbers, and hyphens.");
  return slug;
}

function generatedProductSku(name: string) {
  const base = slugify(name)
    .replaceAll("-", "")
    .slice(0, 32)
    .toUpperCase() || "PRODUCT";
  return `AUTO-${base}-${randomUUID().slice(0, 8).toUpperCase()}`;
}

function boundedText(value: FormDataEntryValue | null, label: string, maximum: number) {
  const text = optionalText(value);
  if (text && text.length > maximum) throw new AdminActionError(`${label} must be under ${maximum} characters.`);
  return text;
}

function publicUrl(value: FormDataEntryValue | null, label: string) {
  const text = boundedText(value, label, 2_000);
  if (!text) return null;
  let parsed: URL;
  try {
    parsed = new URL(text);
  } catch {
    throw new AdminActionError(`${label} must be an absolute HTTPS or HTTP URL.`);
  }
  if (!["https:", "http:"].includes(parsed.protocol)) {
    throw new AdminActionError(`${label} must use HTTPS or HTTP.`);
  }
  return parsed.toString();
}

function parseVariants(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || value.trim() === "") return [];
  let decoded: unknown;
  try {
    decoded = JSON.parse(value);
  } catch {
    throw new AdminActionError("Product variants are malformed.");
  }
  const result = z.array(variantSchema).max(100).safeParse(decoded);
  if (!result.success) throw new AdminActionError("Check every product variant and try again.");
  const parsed = result.data;
  const skus = parsed.map((item) => item.sku.toLowerCase());
  if (new Set(skus).size !== skus.length) throw new AdminActionError("Variant SKUs must be unique.");
  try {
    return parsed.map((item) => ({
      ...item,
      additionalPrice: parseMoney(item.additionalPrice).decimal,
    }));
  } catch (error) {
    throw new AdminActionError(error instanceof Error ? error.message : "Variant pricing is invalid.");
  }
}

function parseProductForm(formData: FormData) {
  const parsed = productFormSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { result: validationFailure(parsed.error) } as const;
  const input = parsed.data;
  try {
    const mrp = parseMoney(input.mrp);
    const salePrice = parseMoney(input.salePrice);
    if (salePrice.paise > mrp.paise) throw new AdminActionError("Sale price cannot exceed MRP.");
    const gstRate = parseOptionalMoney(input.gstRate)?.decimal ?? null;
    if (gstRate !== null && Number(gstRate) > 100) {
      throw new AdminActionError("GST cannot exceed 100%.");
    }
    const weightValue = input.weight.trim() || null;
    const parsedWeight = weightValue ? parseMoney(weightValue) : null;
    if (parsedWeight && parsedWeight.paise > 999_999) {
      throw new AdminActionError("Weight exceeds the supported numeric(6,2) range.");
    }
    const weight = parsedWeight?.decimal ?? null;
    if (weight === "0.00") throw new AdminActionError("Weight must be greater than zero.");
    const sku = input.sku.trim() || generatedProductSku(input.name);
    return {
      data: {
        id: input.id,
        values: {
          name: input.name,
          slug: validatedSlug(input.slug, input.name),
          description: sanitizeProductDescription(input.description) || null,
          shortDescription: optionalText(input.shortDescription),
          categoryId: input.categoryId,
          brandId: input.brandId || null,
          sku,
          mrp: mrp.decimal,
          salePrice: salePrice.decimal,
          costPrice: parseOptionalMoney(input.costPrice)?.decimal ?? null,
          gstRate,
          priceIncludesGst: formBoolean(input.priceIncludesGst ?? null),
          stock: formInteger(input.stock, "Stock"),
          lowStockThreshold: formInteger(input.lowStockThreshold, "Low-stock threshold"),
          weight,
          shippingFee: parseOptionalMoney(input.shippingFee)?.decimal ?? null,
          warranty: optionalText(input.warranty),
          youtubeUrl: publicUrl(input.youtubeUrl, "YouTube URL"),
          isFeatured: formBoolean(input.isFeatured ?? null),
          isActive: formBoolean(input.isActive ?? null),
          metaTitle: optionalText(input.metaTitle),
          metaDescription: optionalText(input.metaDescription),
          updatedAt: new Date(),
        },
        variants: parseVariants(input.variants),
      },
    } as const;
  } catch (error) {
    if (error instanceof AdminActionError) throw error;
    throw new AdminActionError(error instanceof Error ? error.message : "Product details are invalid.");
  }
}

async function uploadProductImages(productId: string, files: File[]) {
  if (!files.length) return [];
  let prepared;
  try {
    prepared = await Promise.all(files.map(async (file) => ({ file, ...(await validateProductImage(file)) })));
  } catch (error) {
    throw new AdminActionError(error instanceof Error ? error.message : "A product image is invalid.");
  }
  const supabase = await createClient();
  const uploadedPaths: string[] = [];
  try {
    const rows = [];
    for (const item of prepared) {
      const path = randomizedProductImagePath(productId, item.extension);
      const { error } = await supabase.storage
        .from(PRODUCT_IMAGE_BUCKET)
        .upload(path, item.bytes, { contentType: item.contentType, upsert: false });
      if (error) throw new AdminActionError("Image upload failed. Check Storage configuration and try again.");
      uploadedPaths.push(path);
      const { data } = supabase.storage.from(PRODUCT_IMAGE_BUCKET).getPublicUrl(path);
      rows.push({ path, url: data.publicUrl });
    }
    return rows;
  } catch (error) {
    if (uploadedPaths.length) await supabase.storage.from(PRODUCT_IMAGE_BUCKET).remove(uploadedPaths);
    throw error;
  }
}

async function persistNewImages(productId: string, files: File[]) {
  const uploaded = await uploadProductImages(productId, files);
  if (!uploaded.length) return;
  try {
    const existing = await db.query.productImages.findMany({
      where: (table, { eq: equals }) => equals(table.productId, productId),
      columns: { position: true, isPrimary: true },
    });
    const nextPosition = existing.reduce((max, image) => Math.max(max, image.position), -1) + 1;
    const hasPrimary = existing.some((image) => image.isPrimary);
    await db.insert(productImages).values(uploaded.map((image, index) => ({
      productId,
      url: image.url,
      position: nextPosition + index,
      isPrimary: !hasPrimary && index === 0,
    })));
  } catch (error) {
    const supabase = await createClient();
    await supabase.storage.from(PRODUCT_IMAGE_BUCKET).remove(uploaded.map((image) => image.path));
    throw error;
  }
}

async function removeManagedImages(paths: string[]) {
  if (!paths.length) return;
  const { error } = await (await createClient()).storage
    .from(PRODUCT_IMAGE_BUCKET)
    .remove(paths);
  if (error) console.error("Managed image cleanup failed.", error);
}

function managedStoragePath(url: string) {
  const path = storagePathFromPublicUrl(url);
  if (!path) return null;
  try {
    const expectedOrigin = new URL(getSupabasePublicConfig().url).origin;
    return new URL(url).origin === expectedOrigin ? path : null;
  } catch {
    return null;
  }
}

function optionalUpload(formData: FormData, field: string) {
  const value = formData.get(field);
  return value instanceof File && value.size > 0 ? value : null;
}

function imageFiles(formData: FormData) {
  const files = formData
    .getAll("images")
    .filter((entry): entry is File => entry instanceof File && entry.size > 0);
  if (files.length > 6) throw new AdminActionError("Upload at most six product images at a time.");
  return files;
}

function parseIdList(value: string, maximum: number) {
  let decoded: unknown;
  try {
    decoded = JSON.parse(value);
  } catch {
    throw new AdminActionError("The selected records are malformed. Refresh and try again.");
  }
  const parsed = z.array(uuid).min(1).max(maximum).safeParse(decoded);
  if (!parsed.success) {
    throw new AdminActionError("Select at least one valid record and try again.");
  }
  return parsed.data;
}

function sameIds(left: string[], right: string[]) {
  if (left.length !== right.length) return false;
  const rightSet = new Set(right);
  return left.every((id) => rightSet.has(id));
}

export async function saveProduct(
  formData: FormData,
): Promise<AdminActionResult<{ id: string; redirectTo: string }>> {
  const parsed = parseProductForm(formData);
  if ("result" in parsed) return parsed.result;
  const { id: idEntry, values, variants } = parsed.data;
  const productId = idEntry ?? randomUUID();
  try {
    const files = imageFiles(formData);
    const skuOwner = await db.query.products.findFirst({
      where: (table, { eq: equals }) => equals(table.sku, values.sku),
      columns: { id: true },
    });
    if (skuOwner && skuOwner.id !== productId) {
      throw new AdminActionError("SKU already exists.");
    }
    await db.transaction(async (tx) => {
      if (idEntry) {
        const [updated] = await tx.update(products).set(values).where(eq(products.id, productId)).returning({ id: products.id });
        if (!updated) throw new AdminActionError("Product not found.");
      } else {
        await tx.insert(products).values({ id: productId, ...values });
      }

      const existingVariants = await tx.query.productVariants.findMany({
        where: (table, { eq: equals }) => equals(table.productId, productId),
        columns: { id: true },
      });
      const retainedIds = variants.flatMap((variant) => variant.id ? [variant.id] : []);
      const removeIds = existingVariants.map((variant) => variant.id).filter((id) => !retainedIds.includes(id));
      if (removeIds.length) await tx.delete(productVariants).where(inArray(productVariants.id, removeIds));
      for (const variant of variants) {
        const variantValues = {
          productId,
          name: variant.name,
          value: variant.value,
          sku: variant.sku,
          additionalPrice: variant.additionalPrice,
          stock: variant.stock,
          updatedAt: new Date(),
        };
        if (variant.id) {
          const [updated] = await tx
            .update(productVariants)
            .set(variantValues)
            .where(and(eq(productVariants.id, variant.id), eq(productVariants.productId, productId)))
            .returning({ id: productVariants.id });
          if (!updated) throw new AdminActionError("A product variant no longer exists.");
        } else {
          await tx.insert(productVariants).values(variantValues);
        }
      }
    });

    await persistNewImages(productId, files);
    revalidatePath("/products");
    revalidatePath(`/products/${productId}`);
    return actionSuccess({ id: productId, redirectTo: `/products/${productId}?saved=1` });
  } catch (error) {
    return actionFailureFromError(error, "Product could not be saved.", "Product save failed.");
  }
}

export async function setProductActive(formData: FormData): Promise<AdminActionResult> {
  const parsed = z.object({ id: uuid, isActive: requiredBooleanEntry }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return validationFailure(parsed.error);
  try {
    const [updated] = await db
      .update(products)
      .set({ isActive: formBoolean(parsed.data.isActive), updatedAt: new Date() })
      .where(eq(products.id, parsed.data.id))
      .returning({ id: products.id });
    if (!updated) throw new AdminActionError("Product not found.");
    revalidatePath("/products");
    return actionSuccess(null);
  } catch (error) {
    return actionFailureFromError(error, "Product status could not be changed.", "Product status update failed.");
  }
}

export async function uploadProductImagesMutation(formData: FormData): Promise<AdminActionResult> {
  const parsed = z.object({ productId: uuid }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return validationFailure(parsed.error);
  try {
    const product = await db.query.products.findFirst({
      where: (table, { eq: equals }) => equals(table.id, parsed.data.productId),
      columns: { id: true },
    });
    if (!product) throw new AdminActionError("Product not found.");
    const files = imageFiles(formData);
    if (!files.length) throw new AdminActionError("Choose at least one image.");
    await persistNewImages(parsed.data.productId, files);
    revalidatePath(`/products/${parsed.data.productId}`);
    return actionSuccess(null);
  } catch (error) {
    return actionFailureFromError(error, "Product images could not be uploaded.", "Product image upload failed.");
  }
}

export async function bulkSetProductsActive(formData: FormData): Promise<AdminActionResult> {
  const parsed = z.object({
    productIds: z.string(),
    isActive: requiredBooleanEntry,
  }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return validationFailure(parsed.error);
  try {
    const ids = parseIdList(parsed.data.productIds, 500);
    await db
      .update(products)
      .set({
        isActive: formBoolean(parsed.data.isActive),
        updatedAt: new Date(),
      })
      .where(inArray(products.id, ids));
    revalidatePath("/products");
    return actionSuccess(null);
  } catch (error) {
    return actionFailureFromError(error, "Selected products could not be updated.", "Bulk product status update failed.");
  }
}

export async function bulkDeleteProducts(formData: FormData): Promise<AdminActionResult> {
  const parsed = z.object({ productIds: z.string() }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return validationFailure(parsed.error);
  try {
    const ids = parseIdList(parsed.data.productIds, 100);
    await deleteProductsByIds(ids);
    revalidatePath("/products");
    return actionSuccess(null);
  } catch (error) {
    return actionFailureFromError(error, "Selected products could not be deleted.", "Bulk product deletion failed.");
  }
}

export async function deleteProduct(formData: FormData): Promise<AdminActionResult> {
  const parsed = idFormSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return validationFailure(parsed.error);
  try {
    await deleteProductsByIds([parsed.data.id]);
    revalidatePath("/products");
    revalidatePath(`/products/${parsed.data.id}`);
    return actionSuccess(null);
  } catch (error) {
    return actionFailureFromError(error, "Product could not be deleted.", "Product deletion failed.");
  }
}

async function deleteProductsByIds(ids: string[]) {
    const images = await db.query.productImages.findMany({
      where: (table, { inArray: inValues }) => inValues(table.productId, ids),
      columns: { url: true },
    });
    await db.transaction(async (tx) => {
      const existing = await tx.query.products.findMany({
        where: (table, { inArray: inValues }) => inValues(table.id, ids),
        columns: { id: true },
      });
      if (existing.length !== ids.length) {
        throw new AdminActionError("One or more products were not found.");
      }
      const reservation = await tx.query.inventoryReservations.findFirst({
        where: (table, { inArray: inValues }) => inValues(table.productId, ids),
        columns: { id: true },
      });
      const orderItem = await tx.query.orderItems.findFirst({
        where: (table, { inArray: inValues }) => inValues(table.productId, ids),
        columns: { id: true },
      });
      if (reservation || orderItem) {
        throw new AdminActionError(
          "Products with order or inventory history cannot be deleted. Disable them instead.",
        );
      }
      await tx.delete(products).where(inArray(products.id, ids));
    });

    const paths = images.flatMap((image) => {
      const path = managedStoragePath(image.url);
      return path ? [path] : [];
    });
    if (paths.length) {
      const { error } = await (await createClient()).storage
        .from(PRODUCT_IMAGE_BUCKET)
        .remove(paths);
      if (error) {
        console.error("Product rows were deleted, but some Storage objects could not be removed.", error);
      }
    }
}

export async function setPrimaryProductImage(formData: FormData): Promise<AdminActionResult> {
  const parsed = productImageFormSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return validationFailure(parsed.error);
  const { productId, imageId } = parsed.data;
  try {
    await db.transaction(async (tx) => {
      await tx.update(productImages).set({ isPrimary: false, updatedAt: new Date() }).where(eq(productImages.productId, productId));
      const [updated] = await tx
        .update(productImages)
        .set({ isPrimary: true, updatedAt: new Date() })
        .where(and(eq(productImages.id, imageId), eq(productImages.productId, productId)))
        .returning({ id: productImages.id });
      if (!updated) throw new AdminActionError("Image not found.");
    });
    revalidatePath(`/products/${productId}`);
    return actionSuccess(null);
  } catch (error) {
    return actionFailureFromError(error, "Primary image could not be updated.", "Primary image update failed.");
  }
}

export async function deleteProductImage(formData: FormData): Promise<AdminActionResult> {
  const parsed = productImageFormSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return validationFailure(parsed.error);
  const { productId, imageId } = parsed.data;
  try {
    const image = await db.query.productImages.findFirst({
      where: (table, { and, eq: equals }) => and(equals(table.id, imageId), equals(table.productId, productId)),
    });
    if (!image) throw new AdminActionError("Image not found.");
    await db.delete(productImages).where(eq(productImages.id, image.id));
    const path = managedStoragePath(image.url);
    if (path) {
      const { error } = await (await createClient()).storage.from(PRODUCT_IMAGE_BUCKET).remove([path]);
      if (error) console.error("A deleted product image could not be removed from Storage.", error);
    }
    if (image.isPrimary) {
      const replacement = await db.query.productImages.findFirst({
        where: (table, { eq: equals }) => equals(table.productId, productId),
        orderBy: (table, { asc }) => [asc(table.position)],
      });
      if (replacement) {
        await db.update(productImages).set({ isPrimary: true, updatedAt: new Date() }).where(eq(productImages.id, replacement.id));
      }
    }
    revalidatePath(`/products/${productId}`);
    return actionSuccess(null);
  } catch (error) {
    return actionFailureFromError(error, "Product image could not be deleted.", "Product image deletion failed.");
  }
}

export async function reorderProductImages(formData: FormData): Promise<AdminActionResult> {
  const parsed = z.object({
    productId: uuid,
    imageIds: z.string(),
  }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return validationFailure(parsed.error);
  const { productId } = parsed.data;
  try {
    const ids = parseIdList(parsed.data.imageIds, 50);
    await db.transaction(async (tx) => {
      const existing = await tx.query.productImages.findMany({
        where: (table, { eq: equals }) => equals(table.productId, productId),
        columns: { id: true },
      });
      if (!sameIds(ids, existing.map((image) => image.id))) {
        throw new AdminActionError("Image order is stale. Refresh and try again.");
      }
      for (const [index, id] of ids.entries()) {
        await tx.update(productImages).set({ position: 1_000_000 + index }).where(and(eq(productImages.id, id), eq(productImages.productId, productId)));
      }
      for (const [index, id] of ids.entries()) {
        await tx.update(productImages).set({ position: index, updatedAt: new Date() }).where(and(eq(productImages.id, id), eq(productImages.productId, productId)));
      }
    });
    revalidatePath(`/products/${productId}`);
    return actionSuccess(null);
  } catch (error) {
    return actionFailureFromError(error, "Image order could not be saved.", "Product image reordering failed.");
  }
}

function lookupValues(input: z.infer<typeof lookupFormSchema>) {
  return {
    name: input.name,
    slug: validatedSlug(input.slug ?? null, input.name),
    description: optionalText(input.description ?? null),
    isActive: formBoolean(input.isActive ?? null),
    updatedAt: new Date(),
  };
}

async function readCategoryListItem(categoryId: string): Promise<CategoryListItem> {
  const row = await db.query.categories.findFirst({
    where: (table, { eq: equals }) => equals(table.id, categoryId),
    with: {
      parent: { columns: { name: true } },
      products: { columns: { id: true } },
    },
  });
  if (!row) throw new AdminActionError("Category not found.");
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    imageUrl: row.imageUrl,
    parentId: row.parentId,
    parentName: row.parent?.name ?? null,
    sortOrder: row.sortOrder,
    isActive: row.isActive,
    productCount: row.products.length,
  };
}

export async function saveCategory(
  formData: FormData,
): Promise<AdminActionResult<CategoryListItem>> {
  const parsed = lookupFormSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return validationFailure(parsed.error);
  const input = parsed.data;
  const categoryId = input.id ?? randomUUID();
  try {
    const existing = input.id
      ? await db.query.categories.findFirst({
        where: (table, { eq: equals }) => equals(table.id, categoryId),
        columns: { imageUrl: true },
      })
      : null;
    if (input.id && !existing) throw new AdminActionError("Category not found.");
    const lookup = lookupValues(input);
    const parentId = input.parentId || null;
    const requestedImageUrl = publicUrl(input.imageUrl ?? null, "Category image URL");
    const removeImage = formBoolean(input.removeImage ?? null);
    if (input.id && parentId === categoryId) {
      throw new AdminActionError("A category cannot be its own parent.");
    }
    if (input.id && parentId) {
      let cursor: string | null = parentId;
      const seen = new Set<string>();
      while (cursor) {
        if (cursor === categoryId) {
          throw new AdminActionError("Category hierarchy cannot contain a cycle.");
        }
        if (seen.has(cursor)) {
          throw new AdminActionError("The existing category hierarchy already contains a cycle.");
        }
        seen.add(cursor);
        const cursorId: string = cursor;
        const parent: { parentId: string | null } | undefined =
          await db.query.categories.findFirst({
          where: (table, { eq: equals }) => equals(table.id, cursorId),
          columns: { parentId: true },
        });
        cursor = parent?.parentId ?? null;
      }
    }
    const uploadFile = optionalUpload(formData, "image");
    const uploaded = uploadFile
      ? (await uploadProductImages(`categories/${categoryId}`, [uploadFile]))[0]
      : null;
    const values = {
      ...lookup,
      parentId,
      imageUrl: removeImage ? null : uploaded?.url ?? requestedImageUrl ?? existing?.imageUrl ?? null,
    };
    try {
      if (input.id) {
        await db.update(categories).set(values).where(eq(categories.id, categoryId));
      } else {
        const siblings = await db.query.categories.findMany({
          where: (table, { isNull: isNullValue, eq: equals }) =>
            parentId ? equals(table.parentId, parentId) : isNullValue(table.parentId),
          columns: { sortOrder: true },
        });
        await db.insert(categories).values({
          id: categoryId,
          ...values,
          sortOrder: siblings.reduce((max, item) => Math.max(max, item.sortOrder), -1) + 1,
        });
      }
    } catch (error) {
      if (uploaded) await removeManagedImages([uploaded.path]);
      throw error;
    }
    if (existing?.imageUrl && existing.imageUrl !== values.imageUrl) {
      const oldPath = managedStoragePath(existing.imageUrl);
      if (oldPath) await removeManagedImages([oldPath]);
    }
    revalidatePath("/categories");
    return actionSuccess(await readCategoryListItem(categoryId));
  } catch (error) {
    return actionFailureFromError(error, "Category could not be saved.", "Category save failed.");
  }
}

export async function setCategoryActive(formData: FormData): Promise<AdminActionResult<CategoryListItem>> {
  const parsed = z.object({ id: uuid, isActive: requiredBooleanEntry }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return validationFailure(parsed.error);
  try {
    const [updated] = await db
      .update(categories)
      .set({ isActive: formBoolean(parsed.data.isActive), updatedAt: new Date() })
      .where(eq(categories.id, parsed.data.id))
      .returning({ id: categories.id });
    if (!updated) throw new AdminActionError("Category not found.");
    revalidatePath("/categories");
    return actionSuccess(await readCategoryListItem(updated.id));
  } catch (error) {
    return actionFailureFromError(error, "Category status could not be changed.", "Category status update failed.");
  }
}

export async function reorderCategories(formData: FormData): Promise<AdminActionResult> {
  const parsed = categoryReorderSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return validationFailure(parsed.error);
  const parentId = parsed.data.parentId || null;
  try {
    const ids = parseIdList(parsed.data.orderedCategoryIds ?? parsed.data.categoryIds ?? "", 500);
    await db.transaction(async (tx) => {
      const siblings = await tx.query.categories.findMany({
        where: (table, { eq: equals, isNull: isNullValue }) =>
          parentId ? equals(table.parentId, parentId) : isNullValue(table.parentId),
        columns: { id: true },
      });
      const siblingIds = siblings.map((item) => item.id);
      if (!sameIds(ids, siblingIds)) {
        throw new AdminActionError("Category order is stale. Refresh and try again.");
      }
      for (const [index, id] of ids.entries()) {
        await tx
          .update(categories)
          .set({ sortOrder: index, updatedAt: new Date() })
          .where(and(eq(categories.id, id), parentId ? eq(categories.parentId, parentId) : isNull(categories.parentId)));
      }
    });
    revalidatePath("/categories");
    return actionSuccess(null);
  } catch (error) {
    return actionFailureFromError(error, "Category order could not be saved.", "Category reordering failed.");
  }
}

export async function deleteCategory(formData: FormData): Promise<AdminActionResult> {
  const parsed = idFormSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return validationFailure(parsed.error);
  try {
    const category = await db.query.categories.findFirst({
      where: (table, { eq: equals }) => equals(table.id, parsed.data.id),
      columns: { imageUrl: true },
      with: {
        children: { columns: { id: true } },
        products: { columns: { id: true } },
      },
    });
    if (!category) throw new AdminActionError("Category not found.");
    if (category.products.length) {
      throw new AdminActionError("Categories with products cannot be deleted. Move or remove the products first.");
    }
    if (category.children.length) {
      throw new AdminActionError("Categories with child categories cannot be deleted. Move or delete child categories first.");
    }
    await db.delete(categories).where(eq(categories.id, parsed.data.id));
    const path = category.imageUrl ? managedStoragePath(category.imageUrl) : null;
    if (path) await removeManagedImages([path]);
    revalidatePath("/categories");
    return actionSuccess(null);
  } catch (error) {
    return actionFailureFromError(error, "Category could not be deleted.", "Category deletion failed.");
  }
}
