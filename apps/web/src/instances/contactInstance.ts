// src/instances/contactInstance.ts
export interface ContactPayload {
  name: string;
  phone: string;
  email: string;
  message?: string;
}

export const sendContact = async (payload: ContactPayload): Promise<void> => {
  try {
    const res = await fetch("/api/storefront/contact", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = (await res.json().catch(() => null)) as
      | { success?: boolean; message?: string }
      | null;

    if (!res.ok || !data?.success) {
      throw new Error(data?.message || "Failed to submit contact form");
    }
  } catch {
    throw new Error("Unable to reach server. Check your network.");
  }
};
