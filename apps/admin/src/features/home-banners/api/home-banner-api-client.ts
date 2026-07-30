import type { AdminActionResult } from "@/lib/actions/result";

import type { HomeBanner, SignedBannerUpload, UploadedBannerMedia } from "../types";

async function request<T>(path: string, init?: RequestInit): Promise<AdminActionResult<T>> {
  try {
    const response = await fetch(`/api/admin/content/home-banners${path}`, {
      credentials: "same-origin",
      cache: "no-store",
      ...init,
      headers: { Accept: "application/json", ...init?.headers },
    });
    if (response.status === 204) return { success: true, data: null as T };
    const body = await response.json() as {
      success: boolean;
      data?: T;
      error?: { message: string; fieldErrors?: Record<string, string[]> };
    };
    if (!response.ok || !body.success) {
      return {
        success: false,
        error: body.error?.message ?? "The request failed.",
        ...(body.error?.fieldErrors ? { fieldErrors: body.error.fieldErrors } : {}),
      };
    }
    return { success: true, data: body.data as T };
  } catch {
    return { success: false, error: "Could not reach the server. Check your connection and try again." };
  }
}

const json = (body: unknown): RequestInit => ({
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

export const homeBannerApi = {
  create: (body: unknown) => request<HomeBanner>("", { method: "POST", ...json(body) }),
  update: (id: string, body: unknown) => request<HomeBanner>(`/${id}`, { method: "PATCH", ...json(body) }),
  remove: (id: string) => request<null>(`/${id}`, { method: "DELETE" }),
  reorder: (bannerIds: string[]) => request<null>("/reorder", { method: "POST", ...json({ bannerIds }) }),
  uploadImage: (body: FormData) => request<UploadedBannerMedia>("/upload", { method: "POST", body }),
  authorizeVideo: (body: unknown) => request<SignedBannerUpload>("/upload", { method: "POST", ...json(body) }),
  finalizeVideo: (body: unknown) => request<UploadedBannerMedia>("/upload/finalize", { method: "POST", ...json(body) }),
};
