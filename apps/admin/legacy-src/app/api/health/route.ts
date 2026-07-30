import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const body: {
    status: "ok";
    service: "admin";
    supabase?: { status: "ok" };
  } = { status: "ok", service: "admin" };

  if (
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  ) {
    try {
      const supabase = await createClient();
      const probe = supabase
        .from("public_store_settings")
        .select("namespace,setting_key")
        .eq("namespace", "checkout")
        .eq("setting_key", "payment_methods")
        .maybeSingle();
      const result = await Promise.race([
        probe,
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Supabase health probe timed out.")), 2_000),
        ),
      ]);
      if (!result.error && result.data) body.supabase = { status: "ok" };
    } catch {
      // Liveness remains available when the database is temporarily unreachable.
    }
  }

  return Response.json(
    body,
    {
      status: 200,
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
