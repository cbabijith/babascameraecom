import "server-only";

import { getDatabase, inArray, moneyToPaise, settings } from "@babascamera/db";
import { withTtlCache } from "@/lib/data/ttl-cache";

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
  return withTtlCache("settings:store", async () => {
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
  });
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

function booleanValue(
  source: UnknownObject,
  key: string,
  fallback: boolean,
): boolean {
  return typeof source[key] === "boolean"
    ? source[key]
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
  const store = values["store.profile"];
  const pincodeMode = cod.pincodeMode === "allowlist" ? "allowlist" : "all";
  const adminNotifyEmail = stringValue(store, "email", "");
  return {
    freeShippingThresholdPaise: moneySetting(
      shipping.freeAbove,
      "0.00",
    ),
    defaultShippingChargePaise: moneySetting(
      shipping.flatCharge,
      "0.00",
    ),
    codEnabled: booleanValue(cod, "enabled", true),
    codMaxOrderPaise: moneySetting(cod.maxOrderAmount, "25000.00"),
    codPincodeMode: pincodeMode,
    codAllowedPincodes: Array.isArray(cod.allowedPincodes)
      ? cod.allowedPincodes.filter(
          (value): value is string => typeof value === "string",
        )
      : [],
    orderEmailEnabled:
      booleanValue(notifications, "orderConfirmation", true),
    paymentEmailEnabled: booleanValue(
      notifications,
      "paymentConfirmation",
      true,
    ),
    shippingUpdateEmailEnabled: booleanValue(
      notifications,
      "shippingUpdate",
      true,
    ),
    adminNewOrderEmailEnabled: booleanValue(
      notifications,
      "adminNewOrder",
      true,
    ),
    // Recipient for staff notifications; sourced from the Store profile
    // settings (with an optional env fallback) so merchants control it.
    adminNotifyEmail:
      adminNotifyEmail ||
      (process.env.ADMIN_NOTIFY_EMAIL?.trim() ?? ""),
  };
}

export async function getStoreProfile() {
  const values = await getStoreSettings();
  const store = values["store.profile"];
  return {
    name: stringValue(store, "name", String(defaults["store.profile"].name)),
    tagline: stringValue(store, "tagline", ""),
    email: stringValue(store, "email", ""),
    phone: stringValue(store, "phone", ""),
    address: stringValue(store, "address", ""),
  };
}

export async function getSeoDefaults() {
  const values = await getStoreSettings();
  const seo = values["seo.defaults"];
  const fallback = defaults["seo.defaults"];
  return {
    title: stringValue(seo, "title", String(fallback.title)),
    description: stringValue(seo, "description", String(fallback.description)),
    siteName: stringValue(seo, "siteName", String(fallback.siteName)),
  };
}

/** COD policy for client-side UI (amounts in rupees). The server stays the
    authority — this only drives display, e.g. hiding unavailable options. */
export async function getCodPolicySettings() {
  const checkout = await getCheckoutSettings();
  return {
    codEnabled: checkout.codEnabled,
    codMaxOrderAmount:
      Number(checkout.codMaxOrderPaise) / 100,
    codPincodeMode: checkout.codPincodeMode,
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

export async function getSpecificDeliverySettings(scope = "Delivery") {
  // The client also asks this endpoint for the COD policy (scope=COD) so the
  // checkout UI can reflect the admin's cod.rules; the server keeps enforcing
  // them at order creation regardless.
  if (scope === "COD") {
    try {
      const cod = await getCodPolicySettings();
      return {
        _id: "cod_settings",
        scope,
        data: cod,
        createdAt: new Date().toISOString(),
      };
    } catch {
      return {
        _id: "cod_settings",
        scope,
        data: { codEnabled: true, codMaxOrderAmount: 25000, codPincodeMode: "all" },
        createdAt: new Date().toISOString(),
      };
    }
  }

  return getDeliverySettingsForScope(scope);
}

export interface DeliverySettingsData {
  enableFreeDelivery: boolean;
  deliveryChargeFlat: number;
  freeDeliveryThreshold: number;
}

/** Delivery-charge settings shaped for the legacy settings endpoint and the
    legacy order path. Zero is a real value here (e.g. free delivery): only
    fall back when the whole settings read fails, never when a value is 0. */
export async function getDeliverySettingsForScope(scope = "Delivery"): Promise<{
  _id: string;
  scope: string;
  data: DeliverySettingsData;
  createdAt: string;
}> {
  try {
    const checkoutSettings = await getCheckoutSettings();
    const flatCharge = safeRupees(checkoutSettings.defaultShippingChargePaise);
    const freeThreshold = safeRupees(checkoutSettings.freeShippingThresholdPaise);

    return {
      _id: "delivery_settings",
      scope,
      data: {
        enableFreeDelivery: true,
        deliveryChargeFlat: flatCharge,
        freeDeliveryThreshold: freeThreshold,
      },
      createdAt: new Date().toISOString(),
    };
  } catch {
    return {
      _id: "delivery_settings",
      scope,
      data: {
        enableFreeDelivery: true,
        deliveryChargeFlat: 100,
        freeDeliveryThreshold: 3000,
      },
      createdAt: new Date().toISOString(),
    };
  }
}

function safeRupees(paise: number): number {
  const value = Number(paise) / 100;
  return Number.isFinite(value) && value >= 0 ? value : 0;
}
