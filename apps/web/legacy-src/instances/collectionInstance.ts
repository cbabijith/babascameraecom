// src/instances/collectionInstance.ts
import { apiClient } from "@/lib/apiClient";
import type { Collection, CollectionListResponse } from "@/types/collection";

/** GET /collection — returns the list of collections */
export const getCollections = async (): Promise<Collection[]> => {
  try {
    const res = await apiClient.get<CollectionListResponse>("/collection");
    if (res.data?.success && Array.isArray(res.data.results)) {
      return res.data.results;
    }
    throw new Error(res.data?.message || "Failed to fetch collections");
  } catch (e: unknown) {
    const msg =
      (e as { message?: string })?.message || "Unable to fetch collections";
    throw new Error(msg);
  }
};
