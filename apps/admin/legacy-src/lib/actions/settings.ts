"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  checkoutSettingsUpdateSchema,
  storeProfileSettingsSchema,
} from "@babas/domain";

import { requireAnyRole } from "@/lib/auth/admin";
import {
  formString,
  redirectWithMessage,
  validationMessage,
  writeAuditLog,
} from "@/lib/actions/helpers";
import { createClient } from "@/lib/supabase/server";
import { asBoolean, parsePaise } from "@/lib/utils";

const settingsRoles = ["admin", "super_admin"] as const;

const checkoutFormSchema = z
  .object({
    codEnabled: z.boolean(),
    codMinimumMinor: z.number().int().min(0),
    codMaximumMinor: z.number().int().min(0),
    razorpayEnabled: z.boolean(),
    razorpayFeeBps: z.number().int().min(0).max(10_000),
    bankTransferEnabled: z.boolean(),
    freeShippingEnabled: z.boolean(),
    freeShippingThresholdMinor: z.number().int().min(0),
    flatShippingMinor: z.number().int().min(0),
  })
  .refine(
    (value) =>
      value.codEnabled || value.razorpayEnabled || value.bankTransferEnabled,
    {
      message: "At least one checkout payment method must remain enabled.",
      path: ["codEnabled"],
    },
  )
  .refine((value) => value.codMaximumMinor >= value.codMinimumMinor, {
    message: "The COD maximum cannot be below the COD minimum.",
    path: ["codMaximumMinor"],
  });

export async function saveCheckoutSettingsAction(formData: FormData) {
  const admin = await requireAnyRole(settingsRoles);
  const feePercent = Number(formString(formData, "razorpay_fee_percent") || 0);
  const parsed = checkoutFormSchema.safeParse({
    codEnabled: asBoolean(formData.get("cod_enabled")),
    codMinimumMinor: parsePaise(formData.get("cod_minimum")),
    codMaximumMinor: parsePaise(formData.get("cod_maximum")),
    razorpayEnabled: asBoolean(formData.get("razorpay_enabled")),
    razorpayFeeBps: Number.isFinite(feePercent)
      ? Math.round(feePercent * 100)
      : Number.NaN,
    bankTransferEnabled: asBoolean(formData.get("bank_transfer_enabled")),
    freeShippingEnabled: asBoolean(formData.get("free_shipping_enabled")),
    freeShippingThresholdMinor: parsePaise(
      formData.get("free_shipping_threshold"),
    ),
    flatShippingMinor: parsePaise(formData.get("flat_shipping")),
  });
  if (!parsed.success) {
    redirectWithMessage("/settings", {
      error: validationMessage(parsed.error),
    });
  }

  const canonical = checkoutSettingsUpdateSchema.safeParse({
    payment_methods: {
      razorpay: {
        enabled: parsed.data.razorpayEnabled,
        gateway_fee_bps: parsed.data.razorpayFeeBps,
      },
      bank_transfer: { enabled: parsed.data.bankTransferEnabled },
      cod: {
        enabled: parsed.data.codEnabled,
        minimum_minor: parsed.data.codMinimumMinor,
        maximum_minor: parsed.data.codMaximumMinor,
      },
    },
    delivery: {
      flat_charge_minor: parsed.data.flatShippingMinor,
      enable_free_delivery: parsed.data.freeShippingEnabled,
      free_delivery_threshold_minor:
        parsed.data.freeShippingThresholdMinor,
    },
  });
  if (!canonical.success) {
    redirectWithMessage("/settings", {
      error: validationMessage(canonical.error),
    });
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("update_checkout_settings", {
    p_payment_methods: canonical.data.payment_methods,
    p_delivery: canonical.data.delivery,
  });
  if (error) redirectWithMessage("/settings", { error: error.message });

  await writeAuditLog({
    actorId: admin.id,
    action: "checkout_settings.update",
    table: "store_settings",
    entityId: "checkout",
    after: canonical.data,
  });
  revalidatePath("/settings");
  revalidatePath("/");
  redirectWithMessage("/settings", {
    success: "Checkout settings saved.",
  });
}

export async function saveStoreProfileAction(formData: FormData) {
  const admin = await requireAnyRole(settingsRoles);
  const parsed = storeProfileSettingsSchema.safeParse({
    name: formString(formData, "store_name"),
    // The current catalogue, checkout, Razorpay, tax, and display contracts are
    // deliberately single-currency. Do not expose a cosmetic setting that can
    // diverge from the financial ledger.
    currency: "INR",
    support_email: formString(formData, "support_email"),
    support_phone: formString(formData, "support_phone"),
  });
  if (!parsed.success) {
    redirectWithMessage("/settings", {
      error: validationMessage(parsed.error),
    });
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("update_store_profile", {
    p_profile: parsed.data,
  });
  if (error) redirectWithMessage("/settings", { error: error.message });

  await writeAuditLog({
    actorId: admin.id,
    action: "store_profile.update",
    table: "store_settings",
    entityId: "store.profile",
    after: parsed.data,
  });
  revalidatePath("/settings");
  revalidatePath("/");
  redirectWithMessage("/settings", { success: "Store profile saved." });
}
