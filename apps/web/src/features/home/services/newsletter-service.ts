"server-only";

import { getDatabase, newsletterSubscriptions } from "@babascamera/db";

export async function subscribeNewsletter(
  email: string,
  fullName?: string | null,
) {
  await getDatabase()
    .insert(newsletterSubscriptions)
    .values({
      email,
      fullName: fullName || null,
      source: "storefront",
      isActive: true,
      unsubscribedAt: null,
      subscribedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: newsletterSubscriptions.email,
      set: {
        fullName: fullName || null,
        isActive: true,
        unsubscribedAt: null,
        subscribedAt: new Date(),
        updatedAt: new Date(),
      },
    });
}
