"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { Enums, Json } from "@babas/database";

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
  jsonObject,
  productSchema,
  uuidSchema,
  variantSchema,
} from "@/lib/actions/validation";
import { createClient } from "@/lib/supabase/server";
import {
  canCancelOrder,
  canTransitionOrder,
  canTransitionReturn,
} from "@/lib/workflows";
import { parsePaise, slugify } from "@/lib/utils";

export async function createProductAction(formData: FormData) {
  const admin = await requireAnyRole(["catalog_manager", "admin", "super_admin"]);
  const name = formString(formData, "name");
  let specifications: Record<string, unknown>;
  try {
    specifications = jsonObject(formString(formData, "specifications"));
  } catch (error) {
    redirectWithMessage("/products/new", {
      error: error instanceof Error ? error.message : "Specifications are invalid.",
    });
  }

  const product = productSchema.safeParse({
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
  if (!product.success) {
    redirectWithMessage("/products/new", { error: validationMessage(product.error) });
  }
  if (product.data.status === "archived") {
    redirectWithMessage("/products/new", {
      error: "Create the product as a draft or active item.",
    });
  }

  const variant = variantSchema.omit({ product_id: true, id: true }).safeParse({
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
    is_default: true,
    is_active: true,
  });
  if (!variant.success) {
    redirectWithMessage("/products/new", { error: validationMessage(variant.error) });
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_product_with_default_variant", {
    p_product: product.data as unknown as Json,
    p_variant: {
      ...variant.data,
      option_values: {},
      currency: "INR",
    } as unknown as Json,
  });
  if (error) redirectWithMessage("/products/new", { error: error.message });
  const created = data?.[0];
  if (!created?.created_product_id) {
    redirectWithMessage("/products/new", { error: "The product was not created." });
  }
  await writeAuditLog({
    actorId: admin.id,
    action: "products.create",
    table: "products",
    entityId: created.created_product_id,
    after: { product: product.data, variant: variant.data },
  });
  revalidatePath("/products");
  redirectWithMessage(`/products/${created.created_product_id}`, {
    success: "Product and default variant created.",
  });
}

export async function transitionOrderAction(formData: FormData) {
  const admin = await requireAnyRole(["order_manager", "admin", "super_admin"]);
  const orderId = uuidSchema.safeParse(formString(formData, "order_id"));
  const fromStatus = formString(formData, "from_status");
  const toStatus = formString(formData, "to_status");
  const reason = optionalFormString(formData, "reason");
  const destination = orderId.success ? `/orders/${orderId.data}` : "/orders";
  if (!orderId.success || !canTransitionOrder(fromStatus, toStatus)) {
    redirectWithMessage(destination, { error: "That order status transition is not allowed." });
  }
  if (["cancelled", "failed"].includes(toStatus) && !reason) {
    redirectWithMessage(destination, { error: "A reason is required for this transition." });
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("transition_order", {
    p_order_id: orderId.data,
    p_to_status: toStatus as Enums<"order_status">,
    p_reason: reason,
  });
  if (error) redirectWithMessage(destination, { error: error.message });
  await writeAuditLog({
    actorId: admin.id,
    action: "orders.transition",
    table: "orders",
    entityId: orderId.data,
    before: { status: fromStatus },
    after: { status: toStatus, reason },
  });
  revalidatePath("/orders");
  revalidatePath(destination);
  redirectWithMessage(destination, { success: `Order moved to ${toStatus.replaceAll("_", " ")}.` });
}

export async function cancelOrderAction(formData: FormData) {
  const admin = await requireAnyRole(["order_manager", "admin", "super_admin"]);
  const orderId = uuidSchema.safeParse(formString(formData, "order_id"));
  const fromStatus = formString(formData, "from_status");
  const reason = formString(formData, "reason");
  const destination = orderId.success ? `/orders/${orderId.data}` : "/orders";
  if (!orderId.success || !canCancelOrder(fromStatus)) {
    redirectWithMessage(destination, { error: "This order can no longer be cancelled." });
  }
  if (reason.trim().length < 3) {
    redirectWithMessage(destination, { error: "A cancellation reason is required." });
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("cancel_order", {
    p_order_id: orderId.data,
    p_reason: reason,
  });
  if (error) redirectWithMessage(destination, { error: error.message });
  await writeAuditLog({
    actorId: admin.id,
    action: "orders.cancel",
    table: "orders",
    entityId: orderId.data,
    before: { status: fromStatus },
    after: { status: "cancelled", reason },
  });
  revalidatePath("/orders");
  revalidatePath(destination);
  redirectWithMessage(destination, { success: "Order cancelled and inventory released." });
}

export async function adjustInventoryAction(formData: FormData) {
  const admin = await requireAnyRole(["inventory_manager", "admin", "super_admin"]);
  const variantId = uuidSchema.safeParse(formString(formData, "variant_id"));
  const locationId = uuidSchema.safeParse(formString(formData, "location_id"));
  const delta = formInteger(formData, "delta");
  const reason = formString(formData, "reason");
  if (!variantId.success || !locationId.success || !delta || reason.length < 3) {
    redirectWithMessage("/inventory", {
      error: "Choose a valid item and location, enter a non-zero adjustment, and give a reason.",
    });
  }
  const supabase = await createClient();
  const idempotencyKey = `admin:${admin.id}:${randomUUID()}`;
  const { error } = await supabase.rpc("adjust_inventory", {
    p_variant_id: variantId.data,
    p_location_id: locationId.data,
    p_on_hand_delta: delta,
    p_reason: reason,
    p_idempotency_key: idempotencyKey,
  });
  if (error) redirectWithMessage("/inventory", { error: error.message });
  revalidatePath("/inventory");
  revalidatePath("/");
  redirectWithMessage("/inventory", { success: "Inventory adjusted and movement recorded." });
}

export async function reviewBankTransferAction(formData: FormData) {
  await requireAnyRole(["order_manager", "admin", "super_admin"]);
  const submissionId = uuidSchema.safeParse(formString(formData, "submission_id"));
  const decision = formString(formData, "decision");
  const note = optionalFormString(formData, "review_note");
  if (!submissionId.success || !["approve", "reject"].includes(decision)) {
    redirectWithMessage("/payments", { error: "Invalid bank-transfer review." });
  }
  if (decision === "reject" && !note) {
    redirectWithMessage("/payments", { error: "Explain why the proof was rejected." });
  }
  const supabase = await createClient();
  const { error } = await supabase.rpc("verify_bank_transfer", {
    p_submission_id: submissionId.data,
    p_approve: decision === "approve",
    p_review_note: note,
  });
  if (error) redirectWithMessage("/payments", { error: error.message });
  revalidatePath("/payments");
  revalidatePath("/orders");
  redirectWithMessage("/payments", {
    success: decision === "approve" ? "Bank transfer verified." : "Bank transfer rejected.",
  });
}

const staffRoleSchema = z.enum([
  "support",
  "catalog_manager",
  "inventory_manager",
  "order_manager",
  "admin",
  "super_admin",
]);

export async function changeUserRoleAction(formData: FormData) {
  const admin = await requireAnyRole(["super_admin"]);
  const userId = uuidSchema.safeParse(formString(formData, "user_id"));
  const role = staffRoleSchema.safeParse(formString(formData, "role"));
  const operation = formString(formData, "operation");
  if (!userId.success || !role.success || !["grant", "revoke"].includes(operation)) {
    redirectWithMessage("/customers", { error: "Invalid role change." });
  }
  if (
    operation === "revoke" &&
    userId.data === admin.id &&
    role.data === "super_admin"
  ) {
    redirectWithMessage("/customers", {
      error: "You cannot revoke your own super administrator role.",
    });
  }
  const supabase = await createClient();
  const { error } =
    operation === "grant"
      ? await supabase.rpc("grant_user_role", {
          p_user_id: userId.data,
          p_role: role.data,
        })
      : await supabase.rpc("revoke_user_role", {
      p_user_id: userId.data,
      p_role: role.data,
        });
  if (error) redirectWithMessage("/customers", { error: error.message });
  revalidatePath("/customers");
  redirectWithMessage("/customers", {
    success: `${role.data.replaceAll("_", " ")} role ${operation === "grant" ? "granted" : "revoked"}.`,
  });
}

export async function changeAccountStatusAction(formData: FormData) {
  const admin = await requireAnyRole(["admin", "super_admin"]);
  const userId = uuidSchema.safeParse(formString(formData, "user_id"));
  const status = z
    .enum(["active", "suspended", "disabled"])
    .safeParse(formString(formData, "account_status"));
  if (!userId.success || !status.success) {
    redirectWithMessage("/customers", { error: "Invalid account status." });
  }
  if (userId.data === admin.id && status.data !== "active") {
    redirectWithMessage("/customers", { error: "You cannot disable your own account." });
  }
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_account_status", {
    p_user_id: userId.data,
    p_status: status.data,
  });
  if (error) redirectWithMessage("/customers", { error: error.message });
  await writeAuditLog({
    actorId: admin.id,
    action: "profiles.account_status",
    table: "profiles",
    entityId: userId.data,
    after: { account_status: status.data },
  });
  revalidatePath("/customers");
  redirectWithMessage("/customers", { success: "Account status updated." });
}

export async function transitionReturnAction(formData: FormData) {
  const admin = await requireAnyRole(["order_manager", "admin", "super_admin"]);
  const returnId = uuidSchema.safeParse(formString(formData, "return_id"));
  const fromStatus = formString(formData, "from_status");
  const toStatus = formString(formData, "to_status");
  const note = optionalFormString(formData, "internal_note");
  if (!returnId.success || !canTransitionReturn(fromStatus, toStatus)) {
    redirectWithMessage("/returns", { error: "That return transition is not allowed." });
  }
  if (toStatus === "rejected" && !note) {
    redirectWithMessage("/returns", { error: "A rejection reason is required." });
  }
  const supabase = await createClient();
  const { error } = await supabase.rpc("transition_return", {
    p_return_request_id: returnId.data,
    p_to_status: toStatus as Enums<"return_status">,
    p_internal_note: note,
  });
  if (error) redirectWithMessage("/returns", { error: error.message });
  await writeAuditLog({
    actorId: admin.id,
    action: "return_requests.transition",
    table: "return_requests",
    entityId: returnId.data,
    before: { status: fromStatus },
    after: { status: toStatus, internal_note: note },
  });
  revalidatePath("/returns");
  redirectWithMessage("/returns", { success: `Return moved to ${toStatus}.` });
}

export async function requestRefundAction(formData: FormData) {
  await requireAnyRole(["order_manager", "admin", "super_admin"]);
  const orderId = uuidSchema.safeParse(formString(formData, "order_id"));
  const idempotencyKey = uuidSchema.safeParse(
    formString(formData, "idempotency_key"),
  );
  const amountMinor = parsePaise(formData.get("amount"));
  const reason = formString(formData, "reason");
  if (
    !orderId.success ||
    !idempotencyKey.success ||
    amountMinor <= 0 ||
    reason.length < 3
  ) {
    redirectWithMessage("/returns", { error: "Enter a valid refund amount and reason." });
  }
  const supabase = await createClient();
  const { error } = await supabase.rpc("create_refund_request", {
    p_order_id: orderId.data,
    p_amount_minor: amountMinor,
    p_reason: reason,
    p_idempotency_key: idempotencyKey.data,
  });
  if (error) redirectWithMessage("/returns", { error: error.message });
  revalidatePath("/returns");
  revalidatePath("/payments");
  redirectWithMessage("/returns", {
    success: "Refund request queued. Fulfil only after provider confirmation.",
  });
}
