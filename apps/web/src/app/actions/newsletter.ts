"use server";

import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { z } from "zod";
import { subscribeNewsletter } from "@/lib/data/storefront";
import {
  actionFailure,
  validationFailure,
  type StorefrontActionState,
} from "@/lib/action-state";

const newsletterSchema = z.object({
  email: z.email().max(320),
  fullName: z.string().trim().max(100).optional(),
});

export async function subscribeNewsletterAction(formData: FormData) {
  const parsed = newsletterSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return validationFailure(parsed.error);
  try {
    await subscribeNewsletter(parsed.data.email, parsed.data.fullName);
    revalidatePath("/");
    return {
      success: true,
      message: "You are subscribed to Baba's field notes.",
    } satisfies StorefrontActionState;
  } catch (error) {
    unstable_rethrow(error);
    console.error("Newsletter subscription failed", {
      type: error instanceof Error ? error.name : typeof error,
    });
    return actionFailure("We could not subscribe you. Please try again.");
  }
}
