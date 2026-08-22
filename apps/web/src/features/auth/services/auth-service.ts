"server-only";

import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { and, eq, getDatabase, accounts, sessions, users } from "@babascamera/db";
import { APIError } from "better-auth";
import { hashPassword, makeSignature } from "better-auth/crypto";
import { getRequestOrigin, getWebRequest, getWebAuth } from "@/lib/auth/better-auth";
import { SESSION_COOKIE_NAME } from "@/lib/auth/session";
import {
  loginSchema,
  registerSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "@/lib/auth/schemas";
import { mergeGuestCartAfterAuthentication } from "@/lib/cart-session";
import type { User } from "@/types/auth";

export class AuthDataError extends Error {
  readonly status: number;

  constructor(message: string, status = 400, cause?: unknown) {
    super(message, { cause });
    this.name = "AuthDataError";
    this.status = status;
  }
}

export interface AuthResult {
  token: string;
  user: User;
  message?: string;
  redirectTo?: string;
  url?: string;
}

const SESSION_LIFETIME_SECONDS = 60 * 60 * 24 * 7; // 7 days

interface CookieParts {
  name: string;
  value: string;
  attributes: Record<string, string | boolean | number | Date>;
}

function parseSetCookieHeader(header: string): CookieParts | null {
  const [pair, ...rest] = header.split(";");
  if (!pair || !pair.includes("=")) return null;
  const separator = pair.indexOf("=");
  const name = pair.slice(0, separator).trim();
  const value = pair.slice(separator + 1).trim();
  if (!name) return null;
  const attributes: Record<string, string | boolean | number | Date> = {};
  for (const raw of rest) {
    const part = raw.trim();
    if (!part) continue;
    if (part.includes("=")) {
      const idx = part.indexOf("=");
      const key = part.slice(0, idx).trim().toLowerCase();
      const val = part.slice(idx + 1).trim();
      if (key === "max-age") {
        const parsed = Number(val);
        if (Number.isFinite(parsed)) attributes.maxAge = parsed;
      } else if (key === "expires") {
        attributes.expires = new Date(val);
      } else {
        attributes[key] = val;
      }
    } else {
      attributes[part.toLowerCase()] = true;
    }
  }
  return { name, value, attributes };
}

/** Forward better-auth's Set-Cookie headers onto the active Next.js response. */
async function applyAuthCookies(response: Response): Promise<void> {
  const cookieStore = await cookies();
  for (const header of response.headers.getSetCookie?.() ?? []) {
    const parsed = parseSetCookieHeader(header);
    if (!parsed) continue;
    // Next re-encodes cookie values on serialization; decode first so the
    // round trip reproduces better-auth's original value exactly.
    let value = parsed.value;
    try {
      value = decodeURIComponent(parsed.value);
    } catch {
      /* keep raw value */
    }
    cookieStore.set(parsed.name, value, {
      path: "/",
      httpOnly: parsed.attributes.httponly === true,
      secure: parsed.attributes.secure === true || process.env.NODE_ENV === "production",
      sameSite:
        parsed.attributes.samesite === "none"
          ? "none"
          : parsed.attributes.samesite === "strict"
            ? "strict"
            : "lax",
      ...(typeof parsed.attributes.maxAge === "number"
        ? { maxAge: parsed.attributes.maxAge }
        : {}),
    });
  }
}

function describeAuthError(error: unknown, fallback: string): AuthDataError {
  if (error instanceof APIError) {
    const status = typeof error.status === "number" ? error.status : 400;
    const message =
      typeof error.body === "string"
        ? error.body
        : (error.body as { message?: string } | undefined)?.message ??
          error.message ??
          fallback;
    return new AuthDataError(message, status >= 400 ? status : 400, error);
  }
  if (error instanceof AuthDataError) return error;
  return new AuthDataError(
    error instanceof Error ? error.message : fallback,
    400,
    error,
  );
}

interface BetterAuthSessionBody {
  token?: string;
  user?: {
    id?: string;
    email?: string;
    name?: string | null;
    image?: string | null;
    emailVerified?: boolean;
  };
}

async function callAuthEndpoint(
  endpoint: "signInEmail" | "signUpEmail",
  body: Record<string, unknown>,
): Promise<{ token: string; user: User }> {
  const origin = await getRequestOrigin();
  const auth = getWebAuth(origin);
  const request = await getWebRequest();
  try {
    const response = await auth.api[endpoint]({
      body: body as never,
      headers: request.headers,
      asResponse: true,
    });
    await applyAuthCookies(response);
    if (!response.ok) {
      const text = await response.text().catch(() => "");
      let message = text;
      try {
        message = JSON.parse(text)?.message ?? text;
      } catch {
        /* keep raw text */
      }
      throw new AuthDataError(message || "Authentication failed.", response.status);
    }
    const data = (await response.json()) as BetterAuthSessionBody;
    const profile = data.user;
    if (!profile?.id) {
      throw new AuthDataError("Authentication session was not created.", 500);
    }
    const user: User = {
      id: profile.id,
      email: profile.email ?? String(body.email ?? ""),
      name: profile.name ?? profile.email?.split("@")[0] ?? "",
    };
    return { token: data.token ?? "session", user };
  } catch (error) {
    throw describeAuthError(error, "Authentication failed.");
  }
}

export async function registerUser(payload: unknown): Promise<AuthResult> {
  const rawObj = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};
  const email = typeof rawObj.email === "string" ? rawObj.email.trim() : "";
  const password = typeof rawObj.password === "string" ? rawObj.password : "";

  const emailPrefix = email.includes("@") ? email.split("@")[0] : "User";
  const nameFromEmail = emailPrefix
    .replaceAll(".", " ")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

  const fullName =
    typeof (rawObj.fullName ?? rawObj.name) === "string" &&
    String(rawObj.fullName ?? rawObj.name).trim()
      ? String(rawObj.fullName ?? rawObj.name).trim()
      : nameFromEmail;

  const confirmPassword =
    typeof rawObj.confirmPassword === "string" && rawObj.confirmPassword
      ? rawObj.confirmPassword
      : password;

  const parsed = registerSchema.safeParse({
    fullName,
    email,
    password,
    confirmPassword,
  });

  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0]?.message ?? "Invalid registration details.";
    throw new AuthDataError(firstIssue, 400, parsed.error);
  }

  const { email: validEmail, password: validPassword } = parsed.data;

  const { token, user } = await callAuthEndpoint("signUpEmail", {
    email: validEmail,
    password: validPassword,
    name: fullName,
  });

  await mergeGuestCartAfterAuthentication(user.id).catch(() => null);

  return {
    token,
    user,
    message: "Your account is ready.",
    redirectTo: "/account",
  };
}

export async function loginUser(payload: unknown): Promise<AuthResult> {
  const rawObj = payload && typeof payload === "object" ? payload : {};
  const parsed = loginSchema.safeParse(rawObj);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0]?.message ?? "Invalid login details.";
    throw new AuthDataError(firstIssue, 400, parsed.error);
  }

  const { email, password } = parsed.data;

  const { token, user } = await callAuthEndpoint("signInEmail", { email, password });

  await mergeGuestCartAfterAuthentication(user.id).catch(() => null);

  return { token, user };
}

interface GoogleProfile {
  sub: string;
  email: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
}

async function fetchGoogleProfile(accessToken: string): Promise<GoogleProfile> {
  const response = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) {
    throw new AuthDataError("Google sign-in could not be verified.", 401);
  }
  const profile = (await response.json()) as GoogleProfile;
  if (!profile.email) {
    throw new AuthDataError("Google account did not expose an email address.", 400);
  }
  return profile;
}

async function createSessionForUser(userId: string): Promise<string> {
  const database = getDatabase();
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_LIFETIME_SECONDS * 1000);
  await database.insert(sessions).values({
    id: crypto.randomUUID(),
    token,
    userId,
    expiresAt,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  const origin = await getRequestOrigin();
  const auth = getWebAuth(origin);
  const signature = await makeSignature(token, auth.options.secret);
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, `${token}.${signature}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_LIFETIME_SECONDS,
  });
  return token;
}

export async function googleAuth(options?: {
  next?: string;
  gAccessToken?: string;
}): Promise<AuthResult> {
  const accessToken = options?.gAccessToken?.trim();
  if (!accessToken) {
    throw new AuthDataError("A Google access token is required.", 400);
  }

  const profile = await fetchGoogleProfile(accessToken);
  const database = getDatabase();

  let [existing] = await database
    .select()
    .from(users)
    .where(eq(users.email, profile.email.toLowerCase()))
    .limit(1);

  if (existing && !existing.isActive) {
    throw new AuthDataError("This account has been disabled.", 403);
  }

  if (!existing) {
    const [created] = await database
      .insert(users)
      .values({
        email: profile.email.toLowerCase(),
        name: profile.name ?? profile.email.split("@")[0],
        fullName: profile.name ?? null,
        emailVerified: Boolean(profile.email_verified),
        image: profile.picture ?? null,
        role: "customer",
        isActive: true,
      })
      .returning();
    if (!created) {
      throw new AuthDataError("Could not create your account.", 500);
    }
    existing = created;
  }

  const [googleAccount] = await database
    .select()
    .from(accounts)
    .where(
      and(
        eq(accounts.providerId, "google"),
        eq(accounts.accountId, profile.sub),
      ),
    )
    .limit(1);

  if (!googleAccount) {
    await database.insert(accounts).values({
      id: crypto.randomUUID(),
      accountId: profile.sub,
      providerId: "google",
      userId: existing.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  const token = await createSessionForUser(existing.id);

  await mergeGuestCartAfterAuthentication(existing.id).catch(() => null);

  return {
    token,
    user: {
      id: existing.id,
      email: existing.email,
      name: existing.name ?? existing.fullName ?? profile.email.split("@")[0],
    },
    redirectTo: options?.next ?? "/account",
  };
}

export async function forgotPassword(payload: unknown): Promise<{ message: string }> {
  const rawObj = payload && typeof payload === "object" ? payload : {};
  const parsed = forgotPasswordSchema.safeParse(rawObj);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0]?.message ?? "Invalid email address.";
    throw new AuthDataError(firstIssue, 400, parsed.error);
  }

  // No mail transport is wired into the storefront yet. Respond generically so
  // we never leak which addresses have an account.
  return { message: "If that address has an account, a reset link is on its way." };
}

export async function resetPassword(payload: unknown): Promise<{ message: string }> {
  const rawObj = payload && typeof payload === "object" ? payload : {};
  const parsed = resetPasswordSchema.safeParse(rawObj);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0]?.message ?? "Invalid password.";
    throw new AuthDataError(firstIssue, 400, parsed.error);
  }

  const { password } = parsed.data;
  const auth = getWebAuth();
  const request = await getWebRequest();

  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      throw new AuthDataError("Your password reset session has expired.", 401);
    }

    const hashed = await hashPassword(password);
    const database = getDatabase();
    const [credential] = await database
      .select({ id: accounts.id })
      .from(accounts)
      .where(
        and(
          eq(accounts.userId, session.user.id),
          eq(accounts.providerId, "credential"),
        ),
      )
      .limit(1);

    if (credential) {
      await database
        .update(accounts)
        .set({ password: hashed, updatedAt: new Date() })
        .where(eq(accounts.id, credential.id));
    } else {
      await database.insert(accounts).values({
        id: crypto.randomUUID(),
        accountId: session.user.id,
        providerId: "credential",
        userId: session.user.id,
        password: hashed,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    // Invalidate all sessions after a password change; the user signs in again.
    await database.delete(sessions).where(eq(sessions.userId, session.user.id));
  } catch (error) {
    throw describeAuthError(error, "Failed to reset password");
  }

  return { message: "Password reset successfully." };
}

export async function logoutUser(): Promise<{ message: string }> {
  try {
    const origin = await getRequestOrigin();
    const auth = getWebAuth(origin);
    const request = await getWebRequest();
    const response = await auth.api.signOut({
      headers: request.headers,
      asResponse: true,
    });
    await applyAuthCookies(response);
  } catch {
    // Always clear the cookie locally even if the server call fails.
    const cookieStore = await cookies();
    cookieStore.delete(SESSION_COOKIE_NAME);
  }
  return { message: "Logged out successfully." };
}

export async function getUserProfile(): Promise<Record<string, unknown>> {
  const database = getDatabase();
  const auth = getWebAuth();
  const request = await getWebRequest();
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (session?.user) {
      const [profile] = await database
        .select({
          id: users.id,
          email: users.email,
          name: users.name,
          fullName: users.fullName,
          phone: users.phone,
          role: users.role,
          isActive: users.isActive,
          createdAt: users.createdAt,
        })
        .from(users)
        .where(eq(users.id, session.user.id))
        .limit(1);

      if (!profile) {
        throw new AuthDataError("Profile not found.", 404);
      }

      return {
        id: profile.id,
        _id: profile.id,
        email: profile.email,
        name: profile.name ?? profile.fullName ?? profile.email.split("@")[0],
        phone: profile.phone ?? "",
        userType: profile.role === "admin" ? "Retailer" : "Consumer",
        status: profile.isActive ? "Active" : "Inactive",
        createdAt: profile.createdAt.toISOString(),
        code: profile.id,
      };
    }
  } catch (error) {
    if (error instanceof AuthDataError) throw error;
    console.error("[getUserProfile] Failed to load session", error);
  }

  throw new AuthDataError("Please log in to continue.", 401);
}

export async function updateUserProfile(
  payload: Record<string, unknown>,
): Promise<{ message: string; result: Record<string, unknown> }> {
  const database = getDatabase();
  const auth = getWebAuth();
  const request = await getWebRequest();

  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      throw new AuthDataError("Please log in to continue.", 401);
    }

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (typeof payload.name === "string" && payload.name.trim()) {
      updates.name = payload.name.trim();
      updates.fullName = payload.name.trim();
    }
    if (typeof payload.fullName === "string" && payload.fullName.trim()) {
      updates.name = payload.fullName.trim();
      updates.fullName = payload.fullName.trim();
    }
    if (typeof payload.phone === "string") {
      updates.phone = payload.phone.trim() || null;
    }

    if (Object.keys(updates).length > 1) {
      await database
        .update(users)
        .set(updates)
        .where(eq(users.id, session.user.id));
    }
  } catch (error) {
    throw describeAuthError(error, "Failed to update profile");
  }

  return { message: "Profile updated successfully.", result: payload };
}
