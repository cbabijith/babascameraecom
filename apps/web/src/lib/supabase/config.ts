import { z } from "zod";

const publicSupabaseSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_KEY: z.string().min(20),
});

function publicSupabaseValues() {
  return {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  };
}

export function hasPublicSupabaseConfig(): boolean {
  return publicSupabaseSchema.safeParse(publicSupabaseValues()).success;
}

export function publicSupabaseConfig() {
  const parsed = publicSupabaseSchema.safeParse(publicSupabaseValues());
  if (!parsed.success) {
    throw new Error("Supabase public environment variables are not configured.");
  }
  return {
    url: parsed.data.NEXT_PUBLIC_SUPABASE_URL,
    anonKey: parsed.data.NEXT_PUBLIC_SUPABASE_KEY,
  };
}
