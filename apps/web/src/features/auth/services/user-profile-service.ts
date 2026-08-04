"server-only";

import { and, eq, getDatabase, users } from "@babascamera/db";

export async function getUserProfileById(userId: string) {
  const [profile] = await getDatabase()
    .select({
      id: users.id,
      email: users.email,
      fullName: users.fullName,
      phone: users.phone,
      avatarUrl: users.avatarUrl,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return profile ?? null;
}

export async function updateUserProfileInDb(input: {
  userId: string;
  fullName: string;
  phone: string | null;
  avatarUrl: string | null;
}) {
  const [profile] = await getDatabase()
    .update(users)
    .set({
      fullName: input.fullName,
      phone: input.phone,
      avatarUrl: input.avatarUrl,
      updatedAt: new Date(),
    })
    .where(and(eq(users.id, input.userId), eq(users.isActive, true)))
    .returning({
      id: users.id,
      fullName: users.fullName,
      phone: users.phone,
      avatarUrl: users.avatarUrl,
    });
  if (!profile) throw new Error("Active profile not found.");
  return profile;
}
