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
import { updateUserProfile } from "@/lib/data/storefront";

export const dynamic = "force-dynamic";

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

export async function PUT(request: Request) {
  if (!isSameOrigin(request)) return crossOriginFailure();
  const body = await readJsonBody(request);
  const parsed = profileSchema.safeParse(body);
  if (!parsed.success) return validationFailureResponse(parsed.error);

  const user = await getOptionalUser();
  if (!user) {
    return storefrontFailure("Sign in to manage your profile.", 401, {
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
    await updateUserProfile({
      userId: user.id,
      fullName: parsed.data.fullName,
      phone: parsed.data.phone || null,
      avatarUrl: parsed.data.avatarUrl || null,
    });
    revalidatePath("/profile");
    return storefrontSuccess("Profile saved.");
  } catch (error) {
    console.error("Profile update failed", {
      type: error instanceof Error ? error.name : typeof error,
    });
    return storefrontFailure(
      "Your profile could not be saved. Please try again.",
      500,
    );
  }
}
