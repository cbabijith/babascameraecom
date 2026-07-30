import { NextResponse } from "next/server";
import { hasSupabasePublicConfig } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const body: {
    status: "ok";
    service: "storefront";
    supabase?: { status: "ok" };
  } = {
    status: "ok",
    service: "storefront",
  };

  if (hasSupabasePublicConfig()) {
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
      if (!result.error && result.data) {
        body.supabase = { status: "ok" };
      }
    } catch {
      // The base health response intentionally does not depend on Supabase.
    }
  }

  return NextResponse.json(body, {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
