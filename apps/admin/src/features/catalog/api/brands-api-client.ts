import type { AdminActionResult } from "@/lib/actions/result";

import type { BrandListItem, BrandStatusFilter } from "../types";

interface ApiBody<T> {
  success: boolean;
  data?: T;
  error?: { message: string; fieldErrors?: Record<string, string[]> };
}

async function request<T>(path: string, init?: RequestInit): Promise<AdminActionResult<T>> {
  try {
    const response = await fetch(`/api/admin/catalog/brands${path}`, {
      credentials: "same-origin",
      cache: "no-store",
      ...init,
      headers: { Accept: "application/json", ...init?.headers },
    });
    if (response.status === 204) return { success: true, data: null as T };
    const body = await response.json() as ApiBody<T>;
    if (!response.ok || !body.success) {
      return {
        success: false,
        error: body.error?.message ?? "Brand request failed.",
        ...(body.error?.fieldErrors ? { fieldErrors: body.error.fieldErrors } : {}),
      };
    }
    return { success: true, data: body.data as T };
  } catch {
    return { success: false, error: "Could not reach the server. Check your connection and try again." };
  }
}

export const brandsApi = {
  list(query: { q?: string; status?: BrandStatusFilter } = {}) {
    const params = new URLSearchParams();
    if (query.q) params.set("q", query.q);
    if (query.status && query.status !== "all") params.set("status", query.status);
    return request<BrandListItem[]>(params.size ? `?${params}` : "");
  },
  get: (id: string) => request<BrandListItem>(`/${id}`),
  create: (body: FormData) => request<BrandListItem>("", { method: "POST", body }),
  update: (id: string, body: FormData) => request<BrandListItem>(`/${id}`, { method: "PATCH", body }),
  setStatus: (id: string, isActive: boolean) => request<BrandListItem>(`/${id}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ isActive }),
  }),
  reorder: (brandIds: string[]) => request<null>("/reorder", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ brandIds }),
  }),
  remove: (id: string) => request<null>(`/${id}`, { method: "DELETE" }),
};
