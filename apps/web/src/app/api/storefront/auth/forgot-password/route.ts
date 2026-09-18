import {
  crossOriginFailure,
  isSameOrigin,
  readJsonBody,
} from "@/lib/api/storefront-api";
import { forgotPasswordSchema } from "@/lib/auth/schemas";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return crossOriginFailure();
  const body = await readJsonBody(request);
  const parsed = forgotPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { ok: false, message: "Check the form." },
      { status: 422, headers: { "Cache-Control": "no-store" } },
    );
  }
  // No mail transport is configured on the storefront; respond generically so
  // account existence is never leaked.
  return Response.json(
    {
      ok: true,
      message: "If that address has an account, a reset link is on its way.",
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
