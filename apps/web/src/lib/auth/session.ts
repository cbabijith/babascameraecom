import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { eq, getDatabase, users } from "@babascamera/db";
import { getWebRequest, getWebAuth } from "@/lib/auth/better-auth";
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
    const auth = getWebAuth();
    const request = await getWebRequest();
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) return null;

    const [profile] = await getDatabase()
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        fullName: users.fullName,
        phone: users.phone,
        emailVerified: users.emailVerified,
        isActive: users.isActive,
        role: users.role,
      })
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1);

    if (!profile) return null;

    return {
      id: profile.id,
      email: profile.email,
      name: profile.name ?? profile.fullName ?? profile.email.split("@")[0],
      phone: profile.phone,
      emailVerified: profile.emailVerified,
      isActive: profile.isActive,
      role: profile.role,
    };
  } catch (error) {
    console.error("[session] Failed to load session user", error);
    return null;
  }
}

export async function getOptionalUser(): Promise<SessionUser | null> {
  return loadSessionUser();
}

export async function requireUser(next = "/account"): Promise<SessionUser> {
  const user = await getOptionalUser();
  if (!user) {
    redirect(`/login?next=${encodeURIComponent(safeInternalPath(next))}`);
  }
  return requireActiveUser(user, next);
}

export async function requireActiveUser(
  user: SessionUser,
  next = "/account",
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
    const auth = getWebAuth();
    const request = await getWebRequest();
    await auth.api.signOut({ headers: request.headers });
  } catch (error) {
    console.error("[session] Sign out failed", error);
  } finally {
    const cookieStore = await cookies();
    cookieStore.delete(SESSION_COOKIE_NAME);
  }
}
