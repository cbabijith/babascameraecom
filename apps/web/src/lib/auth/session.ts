import "server-only";

import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { eq, getDatabase, users } from "@babascamera/db";
import { hasPublicSupabaseConfig } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { safeInternalPath } from "./safe-redirect";

export async function getOptionalUser(): Promise<User | null> {
  if (!hasPublicSupabaseConfig()) return null;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function requireUser(next = "/account"): Promise<User> {
  const user = await getOptionalUser();
  if (!user) {
    redirect(
      `/auth/login?next=${encodeURIComponent(safeInternalPath(next))}`,
    );
  }
  return requireActiveUser(user, next);
}

export async function requireActiveUser(
  user: User,
  next = "/account",
): Promise<User> {
  const [profile] = await getDatabase()
    .select({ isActive: users.isActive })
    .from(users)
    .where(eq(users.id, user.id))
    .limit(1);
  if (!profile?.isActive) {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
    redirect(
      `/auth/login?error=account-disabled&next=${encodeURIComponent(
        safeInternalPath(next),
      )}`,
    );
  }
  return user;
}
