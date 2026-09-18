import { revalidatePath } from "next/cache";
import { z } from "zod";

import { subscribeNewsletter } from "@/lib/data/storefront";
import {
  crossOriginFailure,
  isSameOrigin,
  readJsonBody,
  storefrontFailure,
  storefrontSuccess,
  validationFailureResponse,
} from "@/lib/api/storefront-api";

export const dynamic = "force-dynamic";

const newsletterSchema = z.object({
  email: z.email().max(320),
  fullName: z.string().trim().max(100).optional(),
});

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return crossOriginFailure();
  const body = await readJsonBody(request);
  const parsed = newsletterSchema.safeParse(body);
  if (!parsed.success) return validationFailureResponse(parsed.error);
  try {
    await subscribeNewsletter(parsed.data.email, parsed.data.fullName);
    revalidatePath("/");
    return storefrontSuccess("You are subscribed to Baba's field notes.");
  } catch (error) {
    console.error("Newsletter subscription failed", {
      type: error instanceof Error ? error.name : typeof error,
    });
    return storefrontFailure(
      "We could not subscribe you. Please try again.",
      500,
    );
  }
}
