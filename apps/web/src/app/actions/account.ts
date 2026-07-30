"use server";

import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import {
  actionFailure,
  validationFailure,
  type StorefrontActionState,
} from "@/lib/action-state";
import {
  createUserAddress,
  removeUserAddress,
  setDefaultUserAddress,
  updateUserProfile,
} from "@/lib/data/storefront";

const profileSchema = z.object({
  fullName: z.string().trim().min(2).max(100),
  phone: z
    .string()
    .trim()
    .regex(/^[+0-9 ()-]{8,20}$/)
    .or(z.literal("")),
  avatarUrl: z
    .string()
    .trim()
    .max(2048)
    .refine((value) => {
      if (!value) return true;
      try {
        return new URL(value).protocol === "https:";
      } catch {
        return false;
      }
    }, {
      message: "Avatar URL must use HTTPS.",
    }),
});

const addressSchema = z.object({
  label: z.string().trim().min(2).max(40),
  line1: z.string().trim().min(5).max(180),
  line2: z.string().trim().max(180).optional(),
  city: z.string().trim().min(2).max(80),
  state: z.string().trim().min(2).max(80),
  pincode: z.string().trim().regex(/^\d{6}$/, "Enter a 6-digit PIN code."),
  country: z.string().trim().min(2).max(80),
  isDefault: z.string().optional(),
});

export async function updateProfileAction(formData: FormData) {
  const parsed = profileSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return validationFailure(parsed.error);
  try {
    const user = await requireUser("/account/profile");
    await updateUserProfile({
      userId: user.id,
      fullName: parsed.data.fullName,
      phone: parsed.data.phone || null,
      avatarUrl: parsed.data.avatarUrl || null,
    });
    revalidatePath("/account");
    revalidatePath("/account/profile");
    return {
      success: true,
      message: "Profile saved.",
    } satisfies StorefrontActionState;
  } catch (error) {
    unstable_rethrow(error);
    console.error("Profile update failed", {
      type: error instanceof Error ? error.name : typeof error,
    });
    return actionFailure("Your profile could not be saved. Please try again.");
  }
}

export async function addAddressAction(formData: FormData) {
  const parsed = addressSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return validationFailure(parsed.error);
  try {
    const user = await requireUser("/account/addresses");
    const address = await createUserAddress({
      userId: user.id,
      label: parsed.data.label,
      line1: parsed.data.line1,
      line2: parsed.data.line2 || null,
      city: parsed.data.city,
      state: parsed.data.state,
      pincode: parsed.data.pincode,
      country: parsed.data.country,
      isDefault: parsed.data.isDefault === "on",
    });
    revalidatePath("/account/addresses");
    revalidatePath("/checkout");
    return {
      success: true,
      message: "Address saved.",
      data: { addressId: address.id },
    } satisfies StorefrontActionState<{ addressId: string }>;
  } catch (error) {
    unstable_rethrow(error);
    console.error("Address creation failed", {
      type: error instanceof Error ? error.name : typeof error,
    });
    return actionFailure("The address could not be saved. Please try again.");
  }
}

export async function removeAddressAction(formData: FormData) {
  const parsed = z
    .object({ addressId: z.uuid() })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return validationFailure(parsed.error);
  try {
    const user = await requireUser("/account/addresses");
    await removeUserAddress(user.id, parsed.data.addressId);
    revalidatePath("/account/addresses");
    revalidatePath("/checkout");
    return {
      success: true,
      message: "Address removed.",
    } satisfies StorefrontActionState;
  } catch (error) {
    unstable_rethrow(error);
    console.error("Address removal failed", {
      type: error instanceof Error ? error.name : typeof error,
    });
    return actionFailure("The address could not be removed. Please try again.");
  }
}

export async function setDefaultAddressAction(formData: FormData) {
  const parsed = z
    .object({ addressId: z.uuid() })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return validationFailure(parsed.error);
  try {
    const user = await requireUser("/account/addresses");
    await setDefaultUserAddress(user.id, parsed.data.addressId);
    revalidatePath("/account/addresses");
    revalidatePath("/checkout");
    return {
      success: true,
      message: "Default address updated.",
    } satisfies StorefrontActionState;
  } catch (error) {
    unstable_rethrow(error);
    console.error("Default address update failed", {
      type: error instanceof Error ? error.name : typeof error,
    });
    return actionFailure(
      "The default address could not be updated. Please try again.",
    );
  }
}
