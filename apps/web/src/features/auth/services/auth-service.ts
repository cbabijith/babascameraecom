"server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hasPublicSupabaseConfig } from "@/lib/supabase/config";
import type {
	RegisterPayload,
	LoginPayload,
	ForgotPasswordPayload,
	ResetPasswordPayload,
	User,
} from "@/types/auth";

export class AuthDataError extends Error {
	readonly status: number;

	constructor(
		message: string,
		status = 400,
		cause?: unknown,
	) {
		super(message, { cause });
		this.name = "AuthDataError";
		this.status = status;
	}
}


export interface AuthResult {
	token: string;
	user: User;
}

export async function registerUser(payload: RegisterPayload): Promise<AuthResult> {
	const { email, password, name } = payload;
	if (!email?.trim() || !password) {
		throw new AuthDataError("Email and password are required.");
	}

	if (hasPublicSupabaseConfig()) {
		try {
			const supabase = await createSupabaseServerClient();
			const { data, error } = await supabase.auth.signUp({
				email,
				password,
				options: { data: { full_name: name ?? "" } },
			});

			if (error) {
				throw new AuthDataError(error.message, 400, error);
			}

			const token = data.session?.access_token ?? "mock-auth-token";
			const user: User = {
				id: data.user?.id ?? "user_1",
				email: data.user?.email ?? email,
				name: name ?? data.user?.user_metadata?.full_name ?? email.split("@")[0],
			};
			return { token, user };
		} catch (err: unknown) {
			if (err instanceof AuthDataError) throw err;
			throw new AuthDataError(
				err instanceof Error ? err.message : "Registration failed",
				400,
				err,
			);
		}
	}

	return {
		token: "mock-auth-token",
		user: {
			id: "user_1",
			email,
			name: name ?? email.split("@")[0],
		},
	};
}

export async function loginUser(payload: LoginPayload): Promise<AuthResult> {
	const { email, password } = payload;
	if (!email?.trim() || !password) {
		throw new AuthDataError("Email and password are required.");
	}

	if (hasPublicSupabaseConfig()) {
		try {
			const supabase = await createSupabaseServerClient();
			const { data, error } = await supabase.auth.signInWithPassword({
				email,
				password,
			});

			if (error) {
				throw new AuthDataError("Invalid email or password", 401, error);
			}

			const token = data.session?.access_token ?? "mock-auth-token";
			const user: User = {
				id: data.user?.id ?? "user_1",
				email: data.user?.email ?? email,
				name: data.user?.user_metadata?.full_name ?? email.split("@")[0],
			};
			return { token, user };
		} catch (err: unknown) {
			if (err instanceof AuthDataError) throw err;
			throw new AuthDataError(
				err instanceof Error ? err.message : "Login failed",
				401,
				err,
			);
		}
	}

	return {
		token: "mock-auth-token",
		user: {
			id: "user_1",
			email,
			name: email.split("@")[0],
		},
	};
}

export async function googleAuth(): Promise<AuthResult> {
	return {
		token: "mock-google-token",
		user: {
			id: "g_user_1",
			email: "googleuser@example.com",
			name: "Google User",
		},
	};
}

export async function forgotPassword(
	payload: ForgotPasswordPayload,
): Promise<{ message: string }> {
	const { email } = payload;
	if (!email?.trim()) {
		throw new AuthDataError("Email is required.");
	}

	if (hasPublicSupabaseConfig()) {
		try {
			const supabase = await createSupabaseServerClient();
			await supabase.auth.resetPasswordForEmail(email);
		} catch {
			// Intentionally suppressed to avoid leaking user existence
		}
	}

	return { message: "Password reset link sent to your email." };
}

export async function resetPassword(
	payload: ResetPasswordPayload,
): Promise<{ message: string }> {
	const { password } = payload;
	if (!password) {
		throw new AuthDataError("Password is required.");
	}

	if (hasPublicSupabaseConfig()) {
		try {
			const supabase = await createSupabaseServerClient();
			const { error } = await supabase.auth.updateUser({ password });
			if (error) {
				throw new AuthDataError(error.message, 400, error);
			}
		} catch (err: unknown) {
			if (err instanceof AuthDataError) throw err;
			throw new AuthDataError(
				err instanceof Error ? err.message : "Failed to reset password",
				400,
				err,
			);
		}
	}

	return { message: "Password reset successfully." };
}

export async function getUserProfile(): Promise<User> {
	if (hasPublicSupabaseConfig()) {
		try {
			const supabase = await createSupabaseServerClient();
			const {
				data: { user },
			} = await supabase.auth.getUser();

			if (user) {
				return {
					id: user.id,
					email: user.email ?? "",
					name: user.user_metadata?.full_name ?? user.email?.split("@")[0] ?? "User",
					status: "Active",
					phone: user.phone || (user.user_metadata?.phone as string ?? ""),
				};
			}
		} catch {
			// Fallback if session/client check fails
		}
	}

	return {
		id: "user_1",
		email: "user@example.com",
		name: "Customer",
		status: "Active",
	};
}

export async function updateUserProfile(
	payload: Record<string, unknown>,
): Promise<{ message: string; result: Record<string, unknown> }> {
	if (hasPublicSupabaseConfig() && typeof payload.name === "string") {
		try {
			const supabase = await createSupabaseServerClient();
			await supabase.auth.updateUser({ data: { full_name: payload.name } });
		} catch {
			// Suppress profile update errors
		}
	}

	return { message: "Profile updated successfully.", result: payload };
}
