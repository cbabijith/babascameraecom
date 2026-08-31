// src/instances/authInstance.ts
import axios from 'axios';
import { apiClient } from '@/lib/apiClient';
import type {
  RegisterPayload,
  RegisterResponse,
  LoginPayload,
  LoginResponse,
  ForgotPasswordPayload,
  ForgotPasswordResponse,
  ResetPasswordPayload,
  ResetPasswordResponse,
  User,
} from '@/types/auth';
import type { AxiosResponse } from "axios";

// ---------- Helpers ----------
interface ApiErrorBody { message?: string }
const getErrorMessage = (e: unknown, fallback = 'Request failed'): string => {
  if (axios.isAxiosError(e)) {
    const data = e.response?.data as ApiErrorBody | undefined;
    return data?.message ?? e.message ?? fallback;
  }
  if (e instanceof Error) return e.message || fallback;
  return fallback;
};

// May come as { id } or { _id }, plus optional fields
interface ApiUserMaybe {
  id?: string;
  _id?: string;
  email: string;
  name?: string;
  userType?: string;
  status?: string;
}

// Profile endpoint can return user in `result` or `data`
interface ProfileResponse {
  success: boolean;
  result?: ApiUserMaybe;
  data?: ApiUserMaybe;
}

interface GoogleLoginResponse {
  success: boolean;
  message?: string;
  result: {
    token: string;
    user?: ApiUserMaybe; // ← allow same shape here too
  };
}

interface GoogleSignupResponse {
  success: boolean;
  message?: string;
  result: { token: string; user?: ApiUserMaybe };
}

// ✅ Normalizer removes the need for any-casts
const normalizeApiUser = (p: ApiUserMaybe): User => ({
  id: p.id || p._id || "",
  email: p.email,
  name: p.name ?? "",
  userType: p.userType,
  status: p.status,
});

export const setAuthToken = (token: string): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('authToken', token);
    apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }
};

export const getAuthToken = (): string | null => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('authToken');
  }
  return null;
};

export const removeAuthToken = (): void => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    delete apiClient.defaults.headers.common['Authorization'];
  }
};

export const setUserData = (user: User): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('user', JSON.stringify(user));
  }
};

export const getUserData = (): User | null => {
  if (typeof window !== 'undefined') {
    const userData = localStorage.getItem('user');
    return userData ? (JSON.parse(userData) as User) : null;
  }
  return null;
};

// ========================
// AUTH API METHODS
// ========================

export const signupWithGoogleAccessToken = async (
  gAccessToken: string
): Promise<{ token: string; user: User | null }> => {
  try {
    const res: AxiosResponse<GoogleSignupResponse> = await apiClient.post(
      "/user/g-auth-signup",
      null,
      { params: { gAccessToken } }
    );

    if (!res.data?.success) {
      throw new Error(res.data?.message || "Google sign-up failed");
    }

    const { token, user } = res.data.result;
    setAuthToken(token);

    let userData: User | null = null;
    if (user) {
      userData = normalizeApiUser(user);
      setUserData(userData);
    } else {
      try {
        const prof = await apiClient.get<ProfileResponse>("/user/profile");
        const p = prof.data.result ?? prof.data.data;
        if (prof.data.success && p) {
          userData = normalizeApiUser(p);
          setUserData(userData);
        }
      } catch {
        // ignore
      }
    }

    return { token, user: userData };
  } catch (e) {
    throw new Error(getErrorMessage(e, "Google sign-up failed"));
  }
};

export const registerUser = async (
  payload: RegisterPayload
): Promise<{ token: string; user: User }> => {
  try {
    const response = await apiClient.post<RegisterResponse>('/user/register', payload);

    if (response.data.success) {
      const { token, user } = response.data.result;
      setAuthToken(token);

      if (user) {
        const userData: User = {
          id: user.id,
          email: user.email,
          name: user.name,
        };
        setUserData(userData);
        return { token, user: userData };
      }

      const basicUser: User = {
        id: '',
        email: payload.email,
      };
      setUserData(basicUser);
      return { token, user: basicUser };
    }

    throw new Error(response.data.message || 'Registration failed');
  } catch (error: unknown) {
    const message = getErrorMessage(error, 'Registration failed');
    throw new Error(message);
  }
};

export const loginWithGoogleAccessToken = async (
  gAccessToken: string
): Promise<{ token: string; user: User | null }> => {
  try {
    const res: AxiosResponse<GoogleLoginResponse> = await apiClient.post(
      `/user/g-auth`,
      {},
      { params: { gAccessToken } }
    );

    if (!res.data?.success) {
      throw new Error(res.data?.message || "Google sign-in failed");
    }

    const { token, user } = res.data.result;
    setAuthToken(token);

    let userData: User | null = null;
    if (user) {
      userData = normalizeApiUser(user);
      setUserData(userData);
    } else {
      try {
        const prof = await apiClient.get<ProfileResponse>('/user/profile');
        const p = prof.data.result ?? prof.data.data;
        if (prof.data.success && p) {
          userData = normalizeApiUser(p);
          setUserData(userData);
        }
      } catch {
        // ignore
      }
    }

    return { token, user: userData };
  } catch (e) {
    throw new Error(getErrorMessage(e, "Google sign-in failed"));
  }
};

export const loginUser = async (
  payload: LoginPayload
): Promise<{ token: string; user: User | null }> => {
  try {
    const res = await apiClient.patch<LoginResponse>('/user/login', payload);

    if (!res.data.success) throw new Error(res.data.message || 'Login failed');

    const { token, user } = res.data.result;
    setAuthToken(token);

    let userData: User | null = null;
    if (user) {
      userData = normalizeApiUser(user);
    } else {
      try {
        const prof = await apiClient.get<ProfileResponse>('/user/profile');
        const p = prof.data.result ?? prof.data.data;
        if (prof.data.success && p) {
          userData = normalizeApiUser(p);
        }
      } catch {
        // keep null; still logged in via token
      }
    }

    if (userData) setUserData(userData);
    return { token, user: userData };
  } catch (err: unknown) {
    const message = getErrorMessage(err, 'Login failed');
    throw new Error(message);
  }
};

export const logoutUser = async (): Promise<void> => {
  try {
    // Server-side sign-out revokes the better-auth session cookie; without
    // this call the cookie survives and the user stays signed in.
    await apiClient.post('/user/logout');
  } catch {
    // Even if API fails, clear local tokens
    removeAuthToken();
  } finally {
    removeAuthToken();
  }
};

export const forgotPassword = async (payload: ForgotPasswordPayload): Promise<string> => {
  try {
    const response = await apiClient.patch<ForgotPasswordResponse>('/user/forget-password', payload);
    if (response.data.success) return response.data.message;
    throw new Error(response.data.message || 'Failed to send reset email');
  } catch (error: unknown) {
    const message = getErrorMessage(error, 'Failed to send reset email');
    throw new Error(message);
  }
};

export const resetPassword = async (payload: ResetPasswordPayload): Promise<string> => {
  try {
    const response = await apiClient.patch<ResetPasswordResponse>('/user/reset-password', payload);
    if (response.data.success) return response.data.message;
    throw new Error(response.data.message || 'Failed to reset password');
  } catch (error: unknown) {
    const message = getErrorMessage(error, 'Failed to reset password');
    throw new Error(message);
  }
};

export const isAuthenticated = (): boolean => {
  const token = getAuthToken();
  const user = getUserData();
  return !!(token && user);
};

export const initializeAuth = (): { token: string | null; user: User | null } => {
  const token = getAuthToken();
  const user = getUserData();
  if (token) {
    apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }
  return { token, user };
};

export const verifyToken = async (): Promise<boolean> => {
  try {
    const token = getAuthToken();
    if (!token) return false;
    const response = await apiClient.get<ProfileResponse>('/user/profile');
    return Boolean(response.data.success);
  } catch {
    removeAuthToken();
    return false;
  }
};
