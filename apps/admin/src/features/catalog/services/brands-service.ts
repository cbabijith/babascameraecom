import { randomUUID } from "node:crypto";

import { slugify } from "@/lib/utils";

import {
  brandMutationSchema,
  brandQuerySchema,
  brandReorderSchema,
  brandStatusSchema,
  normalizeBrandName,
} from "../schemas/brand";
import {
  createBrandRecord,
  deleteBrandRecord,
  findBrand,
  findBrandByNormalizedName,
  listBrands,
  reorderBrandRecords,
  updateBrandRecord,
  updateBrandStatusRecord,
} from "../repositories/brands-repository";
import { removeManagedBrandLogo, uploadBrandLogo } from "./brand-logo-service";
import { BrandServiceError } from "./brands-service-error";

export { BrandServiceError } from "./brands-service-error";

function validationError(error: { flatten: () => { fieldErrors: Record<string, string[] | undefined>; formErrors: string[] } }): never {
  const flattened = error.flatten();
  const fieldErrors = Object.fromEntries(
    Object.entries(flattened.fieldErrors).filter((entry): entry is [string, string[]] => Boolean(entry[1]?.length)),
  );
  throw new BrandServiceError(
    flattened.formErrors[0] ?? Object.values(fieldErrors)[0]?.[0] ?? "Check the brand details.",
    "BRAND_VALIDATION_FAILED",
    422,
    fieldErrors,
  );
}

function formObject(formData: FormData) {
  const allowed = new Set(["name", "isActive", "removeLogo", "logo"]);
  for (const key of formData.keys()) {
    if (!allowed.has(key)) {
      throw new BrandServiceError("Brand request contains unsupported fields.", "BRAND_VALIDATION_FAILED", 422);
    }
  }
  const logo = formData.get("logo");
  return {
    name: formData.get("name"),
    isActive: formData.get("isActive"),
    removeLogo: formData.get("removeLogo") ?? undefined,
    logo: logo instanceof File && logo.size > 0 ? logo : undefined,
  };
}

async function assertUniqueName(name: string, currentId?: string) {
  const conflict = await findBrandByNormalizedName(name);
  if (conflict && conflict.id !== currentId) {
    throw new BrandServiceError(
      "A brand with this name already exists.",
      "BRAND_NAME_CONFLICT",
      409,
      { name: ["A brand with this name already exists."] },
    );
  }
}

function brandSlug(name: string) {
  const slug = slugify(name);
  if (!slug) {
    throw new BrandServiceError(
      "Brand name must contain at least one letter or number.",
      "BRAND_VALIDATION_FAILED",
      422,
      { name: ["Brand name must contain at least one letter or number."] },
    );
  }
  return slug;
}

function throwConflictForUniqueViolation(error: unknown): never {
  if (typeof error === "object" && error && "code" in error && error.code === "23505") {
    throw new BrandServiceError(
      "A brand with this name already exists.",
      "BRAND_NAME_CONFLICT",
      409,
      { name: ["A brand with this name already exists."] },
    );
  }
  throw error;
}

export async function getBrands(input: unknown) {
  const parsed = brandQuerySchema.safeParse(input);
  if (!parsed.success) validationError(parsed.error);
  return listBrands(parsed.data);
}

export async function getBrand(id: string) {
  const brand = await findBrand(id);
  if (!brand) throw new BrandServiceError("Brand not found.", "BRAND_NOT_FOUND", 404);
  return brand;
}

export async function createBrand(formData: FormData) {
  const parsed = brandMutationSchema.safeParse(formObject(formData));
  if (!parsed.success) validationError(parsed.error);
  const name = normalizeBrandName(parsed.data.name);
  await assertUniqueName(name);
  const id = randomUUID();
  const uploaded = parsed.data.logo ? await uploadBrandLogo(id, parsed.data.logo) : null;
  try {
    await createBrandRecord({
      id,
      name,
      slug: brandSlug(name),
      logoUrl: uploaded?.url ?? null,
      isActive: ["true", "1", "on"].includes(parsed.data.isActive),
    });
  } catch (error) {
    if (uploaded) await removeManagedBrandLogo(uploaded.path);
    throwConflictForUniqueViolation(error);
  }
  return getBrand(id);
}

export async function updateBrand(id: string, formData: FormData) {
  const existing = await getBrand(id);
  const parsed = brandMutationSchema.safeParse(formObject(formData));
  if (!parsed.success) validationError(parsed.error);
  const name = normalizeBrandName(parsed.data.name);
  await assertUniqueName(name, id);
  const uploaded = parsed.data.logo ? await uploadBrandLogo(id, parsed.data.logo) : null;
  const removeLogo = parsed.data.removeLogo && ["true", "1", "on"].includes(parsed.data.removeLogo);
  const logoUrl = uploaded?.url ?? (removeLogo ? null : existing.logoUrl);
  try {
    const updated = await updateBrandRecord(id, {
      name,
      slug: brandSlug(name),
      logoUrl,
      isActive: ["true", "1", "on"].includes(parsed.data.isActive),
    });
    if (!updated) throw new BrandServiceError("Brand not found.", "BRAND_NOT_FOUND", 404);
  } catch (error) {
    if (uploaded) await removeManagedBrandLogo(uploaded.path);
    throwConflictForUniqueViolation(error);
  }
  if (existing.logoUrl && existing.logoUrl !== logoUrl) await removeManagedBrandLogo(existing.logoUrl);
  return getBrand(id);
}

export async function setBrandStatus(id: string, input: unknown) {
  const parsed = brandStatusSchema.safeParse(input);
  if (!parsed.success) validationError(parsed.error);
  const updated = await updateBrandStatusRecord(id, parsed.data.isActive);
  if (!updated) throw new BrandServiceError("Brand not found.", "BRAND_NOT_FOUND", 404);
  return getBrand(id);
}

export async function reorderBrands(input: unknown) {
  const parsed = brandReorderSchema.safeParse(input);
  if (!parsed.success) validationError(parsed.error);
  if (!await reorderBrandRecords(parsed.data.brandIds)) {
    throw new BrandServiceError(
      "Brand order is stale. Refresh and try again.",
      "BRAND_ORDER_CONFLICT",
      409,
    );
  }
}

export async function deleteBrand(id: string) {
  const result = await deleteBrandRecord(id);
  if (result.kind === "missing") throw new BrandServiceError("Brand not found.", "BRAND_NOT_FOUND", 404);
  if (result.kind === "dependency") {
    throw new BrandServiceError(
      "Brands with products cannot be deleted. Move or remove those products first.",
      "BRAND_HAS_PRODUCTS",
      409,
    );
  }
  await removeManagedBrandLogo(result.logoUrl);
}
