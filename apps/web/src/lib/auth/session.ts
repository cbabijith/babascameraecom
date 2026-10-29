import "server-only";

import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { BACKEND_ORIGIN, backendFetchScoped } from "@/lib/backend-fetch";
import { safeInternalPath } from "./safe-redirect";

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  phone?: string | null;
  emailVerified: boolean;
  isActive: boolean;
  role: string;
}

export const SESSION_COOKIE_NAME = "better-auth.session_token";

async function loadSessionUser(): Promise<SessionUser | null> {
  try {
    // The backend owns the database; cookies are forwarded by backendFetch so
    // the better-auth session resolves against the same browser session.
    const { user } = await backendFetchScoped<{ user: SessionUser | null }>("/api/storefront/rsc/session");
    return user;
  } catch (error) {
    console.error("[session] Failed to load session user", error);
    return null;
  }
}

export const getOptionalUser = cache(async (): Promise<SessionUser | null> => {
  return loadSessionUser();
});

export async function requireUser(next = "/profile"): Promise<SessionUser> {
  const user = await getOptionalUser();
  if (!user) {
    redirect(`/login?next=${encodeURIComponent(safeInternalPath(next))}`);
  }
  return requireActiveUser(user, next);
}

export async function requireActiveUser(
  user: SessionUser,
  next = "/profile",
): Promise<SessionUser> {
  if (!user.isActive) {
    const cookieStore = await cookies();
    cookieStore.delete(SESSION_COOKIE_NAME);
    redirect(
      `/login?error=account-disabled&next=${encodeURIComponent(
        safeInternalPath(next),
      )}`,
    );
  }
  return user;
}

export async function signOutSession(): Promise<void> {
  try {
    const cookieHeader = (await cookies()).toString();
    await fetch(`${BACKEND_ORIGIN}/api/auth/sign-out`, {
      method: "POST",
      headers: {
        ...(cookieHeader ? { cookie: cookieHeader } : {}),
        "content-type": "application/json",
      },
      body: "{}",
    });
  } catch (error) {
    console.error("[session] Sign out failed", error);
  } finally {
    const cookieStore = await cookies();
    cookieStore.delete(SESSION_COOKIE_NAME);
  }
}
