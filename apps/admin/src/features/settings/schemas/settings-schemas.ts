import { z } from "zod";

import { settingMoney } from "@/lib/forms/zod-forms";

export const settingsSchemas = {
  "store.profile": z.object({
    name: z.string().trim().min(1).max(120),
    tagline: z.string().max(240).optional(),
    email: z.string().refine((value) => value === "" || z.string().email().safeParse(value).success),
    phone: z.string().max(40),
    address: z.string().max(500),
  }),
  "shipping.rules": z.object({
    flatCharge: settingMoney,
    freeAbove: settingMoney,
    currency: z.literal("INR"),
  }),
  "cod.rules": z.object({
    enabled: z.boolean(),
    maxOrderAmount: settingMoney,
    pincodeMode: z.enum(["all", "allowlist"]),
    allowedPincodes: z.array(z.string().regex(/^[A-Za-z0-9 -]{3,12}$/)).max(5_000),
  }),
  "seo.defaults": z.object({
    title: z.string().trim().min(1).max(180),
    description: z.string().max(400),
    siteName: z.string().trim().min(1).max(120),
  }),
  "notifications.toggles": z.object({
    orderConfirmation: z.boolean(),
    paymentConfirmation: z.boolean(),
    shippingUpdate: z.boolean(),
    adminNewOrder: z.boolean(),
  }),
  "homepage.hero": z.object({
    eyebrow: z.string().max(100),
    title: z.string().trim().min(1).max(180),
    description: z.string().max(500),
    ctaLabel: z.string().max(80),
    ctaHref: z.string().regex(/^\/(?!\/)/),
    imageUrl: z
      .string()
      .refine((value) => value === "" || /^\/(?!\/)/.test(value) || /^https?:\/\//.test(value))
      .optional(),
    secondaryLabel: z.string().max(80).optional(),
    secondaryHref: z
      .string()
      .refine((value) => value === "" || /^\/(?!\/)/.test(value))
      .optional(),
  }),
} as const;

export type SettingKey = keyof typeof settingsSchemas;

export const settingGroups: Record<SettingKey, string> = {
  "store.profile": "store",
  "shipping.rules": "checkout",
  "cod.rules": "checkout",
  "seo.defaults": "seo",
  "notifications.toggles": "notifications",
  "homepage.hero": "content",
};
