export type JsonPrimitive = boolean | number | string | null;

export type JsonValue =
  JsonPrimitive | { readonly [key: string]: JsonValue | undefined } | readonly JsonValue[];

export interface ShippingAddressSnapshot {
  readonly fullName: string;
  readonly phone: string;
  readonly label?: string;
  readonly line1: string;
  readonly line2?: string;
  readonly city: string;
  readonly state: string;
  readonly pincode: string;
  readonly country: string;
}

export type JsonObject = Readonly<Record<string, JsonValue | undefined>>;
