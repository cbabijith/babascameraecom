import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  crossOriginFailure,
  isSameOrigin,
  readJsonBody,
  storefrontFailure,
  storefrontSuccess,
  validationFailureResponse,
} from "@/lib/api/storefront-api";
import { SESSION_COOKIE_NAME, getOptionalUser } from "@/lib/auth/session";
import { createUserAddress } from "@/lib/data/storefront";

export const dynamic = "force-dynamic";

const addressSchema = z.object({
  label: z.string().trim().min(2).max(40),
  building: z.string().trim().max(180).optional(),
  line1: z.string().trim().min(1).max(180),
  line2: z.string().trim().max(180).optional(),
  city: z.string().trim().min(2).max(80),
  state: z.string().trim().min(2).max(80),
  pincode: z.string().trim().regex(/^\d{6}$/, "Enter a 6-digit PIN code."),
  country: z.string().trim().min(2).max(80),
  isDefault: z.union([z.boolean(), z.string()]).optional(),
});

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return crossOriginFailure();
  const body = await readJsonBody(request);
  const parsed = addressSchema.safeParse(body);
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
    const address = await createUserAddress({
      userId: user.id,
      label: parsed.data.label,
      building: parsed.data.building || null,
      line1: parsed.data.line1,
      line2: parsed.data.line2 || null,
      city: parsed.data.city,
      state: parsed.data.state,
      pincode: parsed.data.pincode,
      country: parsed.data.country,
      isDefault:
        parsed.data.isDefault === true ||
        parsed.data.isDefault === "on" ||
        parsed.data.isDefault === "true",
    });
    revalidatePath("/profile");
    revalidatePath("/checkout");
    return storefrontSuccess("Address saved.", { addressId: address.id });
  } catch (error) {
    console.error("Address creation failed", {
      type: error instanceof Error ? error.name : typeof error,
    });
    return storefrontFailure(
      "The address could not be saved. Please try again.",
      500,
    );
  }
}
