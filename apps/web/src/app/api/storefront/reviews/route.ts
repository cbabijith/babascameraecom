import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { SESSION_COOKIE_NAME, getOptionalUser } from "@/lib/auth/session";
import { upsertProductReview } from "@/lib/data/storefront";
import {
  crossOriginFailure,
  isSameOrigin,
  readJsonBody,
  storefrontFailure,
  storefrontSuccess,
  validationFailureResponse,
} from "@/lib/api/storefront-api";

export const dynamic = "force-dynamic";

const reviewSchema = z.object({
  productId: z.uuid(),
  productSlug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  rating: z.coerce.number().int().min(1).max(5),
  title: z.string().trim().max(100),
  body: z.string().trim().max(2000),
});

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return crossOriginFailure();
  const body = await readJsonBody(request);
  const parsed = reviewSchema.safeParse(body);
  if (!parsed.success) return validationFailureResponse(parsed.error);

  const nextPath = `/products/${parsed.data.productSlug}#reviews`;
  const user = await getOptionalUser();
  if (!user) {
    return storefrontFailure("Sign in to write a review.", 401, {
      redirectTo: `/login?next=${encodeURIComponent(nextPath)}`,
    });
  }
  if (!user.isActive) {
    const cookieStore = await cookies();
    cookieStore.delete(SESSION_COOKIE_NAME);
    return storefrontFailure("Your account has been disabled.", 403, {
      redirectTo: `/login?error=account-disabled&next=${encodeURIComponent(nextPath)}`,
    });
  }

  try {
    await upsertProductReview({
      userId: user.id,
      productId: parsed.data.productId,
      rating: parsed.data.rating,
      title: parsed.data.title || null,
      body: parsed.data.body || null,
    });
    revalidatePath(`/products/${parsed.data.productSlug}`);
    return storefrontSuccess("Your review was submitted for moderation.");
  } catch (error) {
    console.error("Review submission failed", {
      type: error instanceof Error ? error.name : typeof error,
    });
    return storefrontFailure(
      "Your review could not be submitted. Please try again.",
      500,
    );
  }
}
