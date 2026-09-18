import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  crossOriginFailure,
  isSameOrigin,
  storefrontFailure,
  storefrontSuccess,
  validationFailureResponse,
} from "@/lib/api/storefront-api";
import { SESSION_COOKIE_NAME, getOptionalUser } from "@/lib/auth/session";
import { setDefaultUserAddress } from "@/lib/data/storefront";

export const dynamic = "force-dynamic";

const paramsSchema = z.object({ id: z.uuid() });

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  if (!isSameOrigin(request)) return crossOriginFailure();
  const { id } = await context.params;
  const parsed = paramsSchema.safeParse({ id });
  if (!parsed.success) return validationFailureResponse(parsed.error);

  const user = await getOptionalUser();
  if (!user) {
    return storefrontFailure("Sign in to manage your addresses.", 401, {
      redirectTo: "/login?next=%2Fprofile",
    });
  }
  if (!user.isActive) {
    const cookieStore = await cookies();
    cookieStore.delete(SESSION_COOKIE_NAME);
    return storefrontFailure("Your account has been disabled.", 403, {
      redirectTo: "/login?error=account-disabled&next=%2Fprofile",
    });
  }

  try {
    await setDefaultUserAddress(user.id, parsed.data.id);
    revalidatePath("/profile");
    revalidatePath("/checkout");
    return storefrontSuccess("Default address updated.");
  } catch (error) {
    console.error("Default address update failed", {
      type: error instanceof Error ? error.name : typeof error,
    });
    return storefrontFailure(
      "The default address could not be updated. Please try again.",
      500,
    );
  }
}
