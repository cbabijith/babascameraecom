"server-only";

import { addresses, desc, eq, getDatabase } from "@babascamera/db";
import { getOptionalUser, requireUser } from "@/lib/auth/session";
import type {
  Address,
  CreateAddressPayload,
  UpdateAddressPayload,
} from "@/types/profile";

export class AddressDataError extends Error {
  readonly status: number;

  constructor(message: string, status = 400, cause?: unknown) {
    super(message, { cause });
    this.name = "AddressDataError";
    this.status = status;
  }
}

function shapeDbAddress(
  row: typeof addresses.$inferSelect,
  userId: string,
): Address {
  return {
    _id: row.id,
    user: userId,
    name: row.label || "Home",
    phone: "",
    alternatePhone: "",
    building: "",
    line1: row.line1,
    line2: row.line2 ?? "",
    landmark: "",
    city: row.city,
    state: row.state,
    country: row.country || "India",
    postalCode: row.pincode,
    addressType: (row.label as Address["addressType"]) || "Home",
    category: "Shipping",
    isDefault: row.isDefault,
    status: "Active",
    createdAt: row.createdAt.toISOString(),
  };
}

export async function getUserAddresses(): Promise<Address[]> {
  try {
    const user = await getOptionalUser();
    if (!user) return [];

    const rows = await getDatabase()
      .select()
      .from(addresses)
      .where(eq(addresses.userId, user.id))
      .orderBy(desc(addresses.isDefault), desc(addresses.createdAt));

    return rows.map((r) => shapeDbAddress(r, user.id));
  } catch (error: unknown) {
    throw new AddressDataError(
      error instanceof Error ? error.message : "Failed to load addresses from database",
      500,
      error,
    );
  }
}

export async function createUserAddress(
  payload: CreateAddressPayload,
): Promise<Address> {
  if (!payload.line1?.trim() || !payload.city?.trim() || !payload.postalCode?.trim()) {
    throw new AddressDataError("Address line, city, and postal code are required.", 400);
  }

  try {
    const user = await requireUser("/account/addresses");

    const [created] = await getDatabase()
      .insert(addresses)
      .values({
        userId: user.id,
        label: payload.name || payload.addressType || "Home",
        line1: payload.line1,
        line2: payload.line2 ?? null,
        city: payload.city,
        state: payload.state || "State",
        pincode: payload.postalCode,
        country: payload.country || "India",
        isDefault: false,
      })
      .returning();

    if (!created) {
      throw new AddressDataError("Unable to create address", 500);
    }

    return shapeDbAddress(created, user.id);
  } catch (error: unknown) {
    if (error instanceof AddressDataError) throw error;
    throw new AddressDataError(
      error instanceof Error ? error.message : "Failed to create address in database",
      400,
      error,
    );
  }
}

export async function updateUserAddress(
  addressId: string,
  payload: UpdateAddressPayload,
): Promise<Address> {
  if (!addressId) {
    throw new AddressDataError("Address ID is required.", 400);
  }

  try {
    const user = await requireUser("/account/addresses");

    const [updated] = await getDatabase()
      .update(addresses)
      .set({
        ...(payload.line1 ? { line1: payload.line1 } : {}),
        ...(payload.line2 !== undefined ? { line2: payload.line2 } : {}),
        ...(payload.city ? { city: payload.city } : {}),
        ...(payload.state ? { state: payload.state } : {}),
        ...(payload.postalCode ? { pincode: payload.postalCode } : {}),
        ...(payload.country ? { country: payload.country } : {}),
        ...(payload.name ? { label: payload.name } : {}),
        updatedAt: new Date(),
      })
      .where(eq(addresses.id, addressId))
      .returning();

    if (!updated) {
      throw new AddressDataError("Address not found or update failed", 404);
    }

    return shapeDbAddress(updated, user.id);
  } catch (error: unknown) {
    if (error instanceof AddressDataError) throw error;
    throw new AddressDataError(
      error instanceof Error ? error.message : "Failed to update address in database",
      400,
      error,
    );
  }
}

export async function deleteUserAddress(addressId: string): Promise<boolean> {
  if (!addressId) {
    throw new AddressDataError("Address ID is required.", 400);
  }

  try {
    const user = await requireUser("/account/addresses");

    await getDatabase()
      .delete(addresses)
      .where(eq(addresses.id, addressId));

    return true;
  } catch (error: unknown) {
    if (error instanceof AddressDataError) throw error;
    throw new AddressDataError(
      error instanceof Error ? error.message : "Failed to delete address from database",
      400,
      error,
    );
  }
}
