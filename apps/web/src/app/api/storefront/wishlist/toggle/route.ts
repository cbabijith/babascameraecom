import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { SESSION_COOKIE_NAME, getOptionalUser } from "@/lib/auth/session";
import { toggleWishlistProduct } from "@/lib/data/storefront";
import {
  crossOriginFailure,
  isSameOrigin,
  readJsonBody,
  storefrontFailure,
  storefrontSuccess,
  validationFailureResponse,
} from "@/lib/api/storefront-api";

export const dynamic = "force-dynamic";

const bodySchema = z.object({ productId: z.uuid() });

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return crossOriginFailure();
  const body = await readJsonBody(request);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return validationFailureResponse(parsed.error);

  const user = await getOptionalUser();
  if (!user) {
    return storefrontFailure("Sign in to save products to your wishlist.", 401, {
      redirectTo: "/login?next=%2Fwishlist",
    });
  }
  if (!user.isActive) {
    const cookieStore = await cookies();
    cookieStore.delete(SESSION_COOKIE_NAME);
    return storefrontFailure("Your account has been disabled.", 403, {
      redirectTo: "/login?error=account-disabled&next=%2Fwishlist",
    });
  }

  try {
    const saved = await toggleWishlistProduct(user.id, parsed.data.productId);
    revalidatePath("/wishlist");
    revalidatePath("/products");
    return storefrontSuccess(
      saved ? "Saved to your wishlist." : "Removed from your wishlist.",
      { saved },
    );
  } catch (error) {
    console.error("Wishlist update failed", {
      type: error instanceof Error ? error.name : typeof error,
    });
    return storefrontFailure(
      "Your wishlist could not be updated. Please try again.",
      500,
    );
  }
}
