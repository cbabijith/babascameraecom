"server-only";

import {
  addresses,
  and,
  desc,
  eq,
  getDatabase,
} from "@babascamera/db";
import { getOptionalUser } from "@/lib/auth/session";

export class AddressDataError extends Error {
  readonly status: number;

  constructor(message: string, status = 400, cause?: unknown) {
    super(message, { cause });
    this.name = "AddressDataError";
    this.status = status;
  }
}

export async function listUserAddresses(userId: string) {
  return getDatabase()
    .select()
    .from(addresses)
    .where(eq(addresses.userId, userId))
    .orderBy(desc(addresses.isDefault), desc(addresses.createdAt));
}

export async function createUserAddress(input: {
  userId: string;
  label: string;
  building: string | null;
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  pincode: string;
  country: string;
  isDefault: boolean;
}) {
  const database = getDatabase();
  return database.transaction(async (transaction) => {
    if (input.isDefault) {
      await transaction
        .update(addresses)
        .set({ isDefault: false, updatedAt: new Date() })
        .where(eq(addresses.userId, input.userId));
    }
    const [created] = await transaction
      .insert(addresses)
      .values(input)
      .returning();
    if (!created) throw new Error("Unable to save address.");
    return created;
  });
}

export async function removeUserAddress(userId: string, addressId: string) {
  await getDatabase()
    .delete(addresses)
    .where(and(eq(addresses.id, addressId), eq(addresses.userId, userId)));
}

export async function setDefaultUserAddress(
  userId: string,
  addressId: string,
) {
  const database = getDatabase();
  await database.transaction(async (transaction) => {
    const [owned] = await transaction
      .select({ id: addresses.id })
      .from(addresses)
      .where(and(eq(addresses.id, addressId), eq(addresses.userId, userId)))
      .limit(1);
    if (!owned) throw new Error("Address not found.");
    await transaction
      .update(addresses)
      .set({ isDefault: false, updatedAt: new Date() })
      .where(eq(addresses.userId, userId));
    await transaction
      .update(addresses)
      .set({ isDefault: true, updatedAt: new Date() })
      .where(eq(addresses.id, addressId));
  });
}

/* ---------------- High-level API mapping helpers ---------------- */

/**
 * Legacy storefront contract: the profile/checkout UIs render name, phone,
 * building, addressType, landmark and postalCode, so every read returns the
 * full shape — name/phone come from the signed-in profile (the addresses
 * table has no per-address identity columns) and landmark is stored in
 * line2, which is what the address form saves it as.
 */
function toLegacyAddress(
  user: { name: string; phone?: string | null },
  addr: typeof addresses.$inferSelect,
) {
  return {
    _id: addr.id,
    id: addr.id,
    user: addr.userId,
    label: addr.label,
    addressType: addr.label,
    name: user.name,
    phone: user.phone ?? "",
    building: addr.building ?? "",
    line1: addr.line1,
    line2: "",
    landmark: addr.line2 ?? "",
    city: addr.city,
    state: addr.state,
    country: addr.country,
    pincode: addr.pincode,
    postalCode: addr.pincode,
    isDefault: addr.isDefault,
    status: "Active" as const,
    createdAt: addr.createdAt.toISOString(),
  };
}

export async function getUserAddresses() {
  try {
    const user = await getOptionalUser();
    if (!user) return [];
    const rows = await listUserAddresses(user.id);
    return rows.map((addr) => toLegacyAddress(user, addr));
  } catch (error: unknown) {
    throw new AddressDataError(
      error instanceof Error ? error.message : "Failed to fetch addresses",
      500,
      error,
    );
  }
}

export async function updateUserAddress(addressId: string, input: Partial<{
  label: string;
  building: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
  isDefault: boolean;
}>) {
  if (!addressId) throw new AddressDataError("Address ID is required", 400);
  try {
    const user = await getOptionalUser();
    if (!user) throw new AddressDataError("Authentication required", 401);
    const database = getDatabase();
    const [updated] = await database
      .update(addresses)
      .set({ ...input, updatedAt: new Date() })
      .where(and(eq(addresses.id, addressId), eq(addresses.userId, user.id)))
      .returning();
    if (!updated) throw new AddressDataError("Address not found", 404);
    return toLegacyAddress(user, updated);
  } catch (error: unknown) {
    if (error instanceof AddressDataError) throw error;
    throw new AddressDataError(
      error instanceof Error ? error.message : "Failed to update address",
      400,
      error,
    );
  }
}

export async function addUserAddress(rawInput: Record<string, unknown>) {
  try {
    const user = await getOptionalUser();
    if (!user) throw new AddressDataError("Authentication required to add an address.", 401);

    const label = (rawInput.label || rawInput.addressType || rawInput.name || "Home").toString().trim();
    // The form's required "House / Flat / Apartment" field is `building`;
    // persist it in its own column instead of dropping it when line1 exists.
    const building = (rawInput.building ?? "").toString().trim();
    const line1 = (rawInput.line1 || building || "").toString().trim();
    const line2 = rawInput.line2 || rawInput.landmark || null;
    const city = (rawInput.city || "").toString().trim();
    const state = (rawInput.state || "").toString().trim();
    const pincode = (rawInput.pincode || rawInput.postalCode || rawInput.zipCode || rawInput.zip || "").toString().trim();
    const country = (rawInput.country || "India").toString().trim();
    const isDefault = Boolean(rawInput.isDefault);

    if (!building && !line1) throw new AddressDataError("House / Flat / Apartment is required", 400);
    if (!city) throw new AddressDataError("City is required", 400);
    if (!state) throw new AddressDataError("State is required", 400);
    if (!pincode) throw new AddressDataError("PIN code is required", 400);

    const created = await createUserAddress({
      userId: user.id,
      label,
      building: building || null,
      line1,
      line2: line2 ? line2.toString().trim() : null,
      city,
      state,
      pincode,
      country,
      isDefault,
    });

    return toLegacyAddress(user, created);
  } catch (error: unknown) {
    if (error instanceof AddressDataError) throw error;
    throw new AddressDataError(
      error instanceof Error ? error.message : "Failed to save address",
      400,
      error,
    );
  }
}

export async function deleteUserAddress(addressId: string) {
  if (!addressId) throw new AddressDataError("Address ID is required", 400);
  try {
    const user = await getOptionalUser();
    if (!user) throw new AddressDataError("Authentication required", 401);
    await removeUserAddress(user.id, addressId);
    return { success: true };
  } catch (error: unknown) {
    if (error instanceof AddressDataError) throw error;
    throw new AddressDataError(
      error instanceof Error ? error.message : "Failed to delete address",
      400,
      error,
    );
  }
}
