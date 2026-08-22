// src/instances/contactInstance.ts
import { apiClient, type ApiResponse } from "@/lib/apiClient";

export interface ContactPayload {
  name: string;
  phone: string;
  email: string;
  message?: string;
}

interface ContactResponse extends ApiResponse {
  // shape depends on your backend, adjust if it returns data/result etc.
  data?: { id?: string } | null;
}

export const sendContact = async (payload: ContactPayload): Promise<void> => {
  try {
    const res = await apiClient.post<ContactResponse>("/contact", payload);

    if (!res.data?.success) {
      throw new Error(res.data?.message || "Failed to submit contact form");
    }
  } catch (error: unknown) {
      // Narrow with type predicate
      if (
        typeof error === "object" &&
        error !== null &&
        "response" in error
      ) {
        const err = error as { response?: { data?: { message?: string }; status?: number } };

        throw new Error(
          err.response?.data?.message ||
            `Server error (${err.response?.status})`
        );
      }

      throw new Error("Unable to reach server. Check your network.");
    }
};
