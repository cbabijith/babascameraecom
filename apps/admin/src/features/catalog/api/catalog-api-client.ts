import type { AdminActionResult } from "@/lib/actions/result";

import type { CatalogApiResponse } from "./api-error";

async function decode<T>(response: Response): Promise<AdminActionResult<T>> {
  if (response.status === 204) return { success: true, data: null as T };
  let body: CatalogApiResponse<T>;
  try {
    body = await response.json() as CatalogApiResponse<T>;
  } catch {
    return { success: false, error: "The server returned an invalid response." };
  }
  if (!body.success) {
    return {
      success: false,
      error: body.error.message,
      ...(body.error.fieldErrors ? { fieldErrors: body.error.fieldErrors } : {}),
    };
  }
  return { success: true, data: body.data };
}

async function request<T>(path: string, init?: RequestInit) {
  try {
    const response = await fetch(`/api/admin/catalog${path}`, {
      credentials: "same-origin",
      cache: "no-store",
      ...init,
      headers: {
        Accept: "application/json",
        ...init?.headers,
      },
    });
    return await decode<T>(response);
  } catch {
    return { success: false, error: "Could not reach the server. Check your connection and try again." } satisfies AdminActionResult<never>;
  }
}

export const catalogApi = {
  createCategory: <T>(body: FormData) => request<T>("/categories", { method: "POST", body }),
  updateCategory: <T>(id: string, body: FormData) => request<T>(`/categories/${id}`, { method: "PATCH", body }),
  deleteCategory: (id: string) => request<null>(`/categories/${id}`, { method: "DELETE" }),
  reorderCategories: (body: FormData) => request<null>("/categories/reorder", { method: "POST", body }),
  setCategoryStatus: <T>(id: string, body: FormData) => request<T>(`/categories/${id}`, { method: "PATCH", body }),

  createBrand: <T>(body: FormData) => request<T>("/brands", { method: "POST", body }),
  updateBrand: <T>(id: string, body: FormData) => request<T>(`/brands/${id}`, { method: "PATCH", body }),
  deleteBrand: (id: string) => request<null>(`/brands/${id}`, { method: "DELETE" }),
  reorderBrands: (body: FormData) => request<null>("/brands/reorder", { method: "POST", body }),

  createProduct: <T>(body: FormData) => request<T>("/products", { method: "POST", body }),
  updateProduct: <T>(id: string, body: FormData) => request<T>(`/products/${id}`, { method: "PATCH", body }),
  deleteProduct: (id: string) => request<null>(`/products/${id}`, { method: "DELETE" }),
  setProductStatus: (id: string, body: FormData) => request<null>(`/products/${id}/status`, { method: "PATCH", body }),
  bulkProductStatus: (body: FormData) => request<null>("/products/bulk/status", { method: "PATCH", body }),
  bulkDeleteProducts: (body: FormData) => request<null>("/products/bulk/delete", { method: "POST", body }),
  uploadProductImages: (id: string, body: FormData) => request<null>(`/products/${id}/images`, { method: "POST", body }),
  deleteProductImage: (productId: string, imageId: string) =>
    request<null>(`/products/${productId}/images/${imageId}`, { method: "DELETE" }),
  setPrimaryImage: (productId: string, imageId: string) =>
    request<null>(`/products/${productId}/images/${imageId}/primary`, { method: "PATCH" }),
  reorderProductImages: (id: string, body: FormData) =>
    request<null>(`/products/${id}/images/reorder`, { method: "POST", body }),
};
