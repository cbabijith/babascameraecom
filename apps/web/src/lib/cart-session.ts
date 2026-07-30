import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import {
  getOptionalUser,
  requireActiveUser,
} from "@/lib/auth/session";
import {
  mergeGuestCartIntoUser,
  type CartOwner,
} from "@/lib/data/storefront";

export const CART_SESSION_COOKIE = "bc_cart_session";
const SESSION_PATTERN = /^[A-Za-z0-9_-]{32,128}$/;

function newSessionId(): string {
  return randomBytes(32).toString("base64url");
}

export async function getCartOwner(): Promise<CartOwner> {
  const user = await getOptionalUser();
  if (user) {
    await requireActiveUser(user, "/cart");
    return { userId: user.id };
  }
  const cookieStore = await cookies();
  let sessionId = cookieStore.get(CART_SESSION_COOKIE)?.value;
  if (!sessionId || !SESSION_PATTERN.test(sessionId)) {
    sessionId = newSessionId();
    try {
      cookieStore.set(CART_SESSION_COOKIE, sessionId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 30 * 24 * 60 * 60,
      });
    } catch {
      // Middleware persists the session on the response when this helper runs
      // in a Server Component, where cookie writes are intentionally blocked.
    }
  }
  return { sessionId };
}

export function guestOwnerHash(sessionId: string): string {
  if (!SESSION_PATTERN.test(sessionId)) {
    throw new Error("Guest cart session is invalid.");
  }
  return createHash("sha256").update(sessionId).digest("hex");
}

export async function mergeGuestCartAfterAuthentication(userId: string) {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(CART_SESSION_COOKIE)?.value;
  if (!sessionId || !SESSION_PATTERN.test(sessionId)) return;
  await mergeGuestCartIntoUser(sessionId, userId);
  cookieStore.delete(CART_SESSION_COOKIE);
}
