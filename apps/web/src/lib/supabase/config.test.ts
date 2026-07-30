import { afterEach, describe, expect, it } from "vitest";
import {
  hasPublicSupabaseConfig,
  publicSupabaseConfig,
} from "./config";

const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const originalAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const originalPublishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

function restoreEnvironment(name: string, value: string | undefined) {
  if (value === undefined) {
    Reflect.deleteProperty(process.env, name);
  } else {
    process.env[name] = value;
  }
}

afterEach(() => {
  restoreEnvironment("NEXT_PUBLIC_SUPABASE_URL", originalUrl);
  restoreEnvironment("NEXT_PUBLIC_SUPABASE_ANON_KEY", originalAnonKey);
  restoreEnvironment(
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    originalPublishableKey,
  );
});

describe("public Supabase configuration", () => {
  it("accepts a Supabase publishable key", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL =
      "https://example-project.supabase.co";
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY =
      "sb_publishable_example_key_value";

    expect(hasPublicSupabaseConfig()).toBe(true);
    expect(publicSupabaseConfig().anonKey).toBe(
      "sb_publishable_example_key_value",
    );
  });

  it("prefers the publishable key when both formats are configured", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL =
      "https://example-project.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY =
      "legacy_anon_key_example_value";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY =
      "sb_publishable_preferred_example";

    expect(publicSupabaseConfig().anonKey).toBe(
      "sb_publishable_preferred_example",
    );
  });

  it("reports missing public credentials without throwing", () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

    expect(hasPublicSupabaseConfig()).toBe(false);
  });
});
