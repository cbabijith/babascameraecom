"use server";

import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import { upsertProductReview } from "@/lib/data/storefront";
import {
  actionFailure,
  validationFailure,
  type StorefrontActionState,
} from "@/lib/action-state";

const reviewSchema = z.object({
  productId: z.uuid(),
  productSlug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  rating: z.coerce.number().int().min(1).max(5),
  title: z.string().trim().max(100),
  body: z.string().trim().max(2000),
});

export async function submitReviewAction(formData: FormData) {
  const parsed = reviewSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return validationFailure(parsed.error);
  try {
    const user = await requireUser(
      `/products/${parsed.data.productSlug}#reviews`,
    );
    await upsertProductReview({
      userId: user.id,
      productId: parsed.data.productId,
      rating: parsed.data.rating,
      title: parsed.data.title || null,
      body: parsed.data.body || null,
    });
    revalidatePath(`/products/${parsed.data.productSlug}`);
    return {
      success: true,
      message: "Your review was submitted for moderation.",
    } satisfies StorefrontActionState;
  } catch (error) {
    unstable_rethrow(error);
    console.error("Review submission failed", {
      type: error instanceof Error ? error.name : typeof error,
    });
    return actionFailure("Your review could not be submitted. Please try again.");
  }
}
