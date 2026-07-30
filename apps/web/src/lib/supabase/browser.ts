"use client";

import { createBrowserClient } from "@supabase/ssr";
import { publicSupabaseConfig } from "./config";

let browserClient: ReturnType<typeof createBrowserClient> | undefined;

export function createSupabaseBrowserClient() {
  const { url, anonKey } = publicSupabaseConfig();
  browserClient ??= createBrowserClient(url, anonKey);
  return browserClient;
}
