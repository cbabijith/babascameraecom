import "server-only";

import { getDatabase, inArray, moneyToPaise, settings } from "@babascamera/db";

const settingKeys = [
  "store.profile",
  "shipping.rules",
  "cod.rules",
  "seo.defaults",
  "notifications.toggles",
  "homepage.hero",
] as const;

type SettingKey = (typeof settingKeys)[number];
type UnknownObject = Record<string, unknown>;

const defaults: Record<SettingKey, UnknownObject> = {
  "store.profile": {
    name: "Baba's Camera",
    email: "",
    phone: "",
    address: "",
  },
  "shipping.rules": {
    flatCharge: "0.00",
    freeAbove: "0.00",
    currency: "INR",
  },
  "cod.rules": {
    enabled: true,
    maxOrderAmount: "25000.00",
    pincodeMode: "all",
    allowedPincodes: [],
  },
  "seo.defaults": {
    title: "Baba's Camera",
    description: "Cameras, lenses and photography equipment.",
    siteName: "Baba's Camera",
  },
  "notifications.toggles": {
    orderConfirmation: true,
    paymentConfirmation: true,
    shippingUpdate: true,
    adminNewOrder: true,
  },
  "homepage.hero": {
    eyebrow: "Baba's Camera",
    title: "Capture every story",
    description: "Shop trusted cameras, lenses and accessories.",
    ctaLabel: "Shop products",
    ctaHref: "/products",
    imageUrl: "/camera2.png",
  },
};

function objectValue(value: unknown, fallback: UnknownObject): UnknownObject {
  return value && typeof value === "object" && !Array.isArray(value)
    ? { ...fallback, ...(value as UnknownObject) }
    : fallback;
}

export async function getStoreSettings() {
  const rows = await getDatabase()
    .select({ key: settings.key, value: settings.value })
    .from(settings)
    .where(inArray(settings.key, [...settingKeys]));
  const values = new Map<string, unknown>(
    rows.map((row) => [row.key, row.value]),
  );
  return Object.fromEntries(
    settingKeys.map((key) => [
      key,
      objectValue(values.get(key), defaults[key]),
    ]),
  ) as Record<SettingKey, UnknownObject>;
}

function stringValue(
  source: UnknownObject,
  key: string,
  fallback: string,
): string {
  return typeof source[key] === "string" && source[key]
    ? String(source[key])
    : fallback;
}

function moneySetting(value: unknown, fallback: string): number {
  try {
    return moneyToPaise(typeof value === "string" ? value : fallback);
  } catch {
    return moneyToPaise(fallback);
  }
}

export async function getCheckoutSettings() {
  const values = await getStoreSettings();
  const shipping = values["shipping.rules"];
  const cod = values["cod.rules"];
  const notifications = values["notifications.toggles"];
  const pincodeMode = cod.pincodeMode === "allowlist" ? "allowlist" : "all";
  return {
    freeShippingThresholdPaise: moneySetting(
      shipping.freeAbove,
      "0.00",
    ),
    defaultShippingChargePaise: moneySetting(
      shipping.flatCharge,
      "0.00",
    ),
    codEnabled: typeof cod.enabled === "boolean" ? cod.enabled : true,
    codMaxOrderPaise: moneySetting(cod.maxOrderAmount, "25000.00"),
    codPincodeMode: pincodeMode,
    codAllowedPincodes: Array.isArray(cod.allowedPincodes)
      ? cod.allowedPincodes.filter(
          (value): value is string => typeof value === "string",
        )
      : [],
    orderEmailEnabled:
      typeof notifications.orderConfirmation === "boolean"
        ? notifications.orderConfirmation
        : true,
  };
}

export async function getHomepageHero() {
  const values = await getStoreSettings();
  const hero = values["homepage.hero"];
  const fallback = defaults["homepage.hero"];
  return {
    eyebrow: stringValue(hero, "eyebrow", String(fallback.eyebrow)),
    title: stringValue(hero, "title", String(fallback.title)),
    description: stringValue(
      hero,
      "description",
      String(fallback.description),
    ),
    imageUrl: stringValue(hero, "imageUrl", String(fallback.imageUrl)),
    primaryLabel: stringValue(
      hero,
      "ctaLabel",
      String(fallback.ctaLabel),
    ),
    primaryHref: stringValue(hero, "ctaHref", String(fallback.ctaHref)),
    secondaryLabel: stringValue(hero, "secondaryLabel", "Explore cameras"),
    secondaryHref: stringValue(
      hero,
      "secondaryHref",
      "/categories/cameras",
    ),
  };
}
