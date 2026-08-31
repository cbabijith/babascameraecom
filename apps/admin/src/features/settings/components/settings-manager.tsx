"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Form,
  toast,
} from "@babascamera/ui";
import { useForm } from "react-hook-form";
import { z } from "zod";

import {
  AdminCheckboxField,
  AdminInputField,
  AdminSelectField,
  AdminTextareaField,
} from "@/components/admin-form-field";

import { saveSettingAction } from "../server/actions";

interface Setting {
  key: string;
  label: string;
  description: string;
  value: unknown;
}

const money = /^\d+(?:\.\d{1,2})?$/;

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function stringValue(source: Record<string, unknown>, key: string, fallback = "") {
  return typeof source[key] === "string" ? String(source[key]) : fallback;
}

function booleanValue(source: Record<string, unknown>, key: string, fallback = false) {
  return typeof source[key] === "boolean" ? Boolean(source[key]) : fallback;
}

async function persist(key: string, label: string, value: unknown) {
  const payload = new FormData();
  payload.set("key", key);
  payload.set("label", label);
  payload.set("value", JSON.stringify(value));
  try {
    const result = await saveSettingAction(payload);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success(`${label} saved.`);
  } catch {
    toast.error(`${label} could not be saved.`);
  }
}

function StoreForm({ setting }: { setting: Setting }) {
  const value = asObject(setting.value);
  const schema = z.object({
    name: z.string().trim().min(1).max(120),
    tagline: z.string().max(240),
    email: z.string().refine((item) => item === "" || z.string().email().safeParse(item).success),
    phone: z.string().max(40),
    address: z.string().max(500),
  });
  type Values = z.infer<typeof schema>;
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: stringValue(value, "name", "Baba's Camera"),
      tagline: stringValue(value, "tagline"),
      email: stringValue(value, "email"),
      phone: stringValue(value, "phone"),
      address: stringValue(value, "address"),
    },
  });
  return (
    <Form {...form}>
      <SettingsCard setting={setting}>
        <form onSubmit={form.handleSubmit((values) => persist(setting.key, setting.label, values))} className="grid gap-4 sm:grid-cols-2">
          <AdminInputField name="name" label="Store name" />
          <AdminInputField name="tagline" label="Tagline" />
          <AdminInputField name="email" label="Contact email" inputProps={{ type: "email" }} />
          <AdminInputField name="phone" label="Phone" inputProps={{ type: "tel" }} />
          <AdminTextareaField name="address" label="Address" className="sm:col-span-2" />
          <SaveButton pending={form.formState.isSubmitting} />
        </form>
      </SettingsCard>
    </Form>
  );
}

function ShippingForm({ setting }: { setting: Setting }) {
  const value = asObject(setting.value);
  const schema = z.object({
    flatCharge: z.string().regex(money),
    freeAbove: z.string().regex(money),
  });
  type Values = z.infer<typeof schema>;
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      flatCharge: stringValue(value, "flatCharge", "0.00"),
      freeAbove: stringValue(value, "freeAbove", "0.00"),
    },
  });
  return (
    <Form {...form}>
      <SettingsCard setting={setting}>
        <form onSubmit={form.handleSubmit((values) => persist(setting.key, setting.label, { ...values, currency: "INR" }))} className="grid gap-4 sm:grid-cols-2">
          <AdminInputField name="flatCharge" label="Default shipping charge (₹)" inputProps={{ inputMode: "decimal" }} />
          <AdminInputField name="freeAbove" label="Free shipping above (₹)" inputProps={{ inputMode: "decimal" }} />
          <p className="text-xs text-slate-500 sm:col-span-2">Currency is fixed to INR. Values are validated as exact numeric(10,2) decimal strings.</p>
          <SaveButton pending={form.formState.isSubmitting} />
        </form>
      </SettingsCard>
    </Form>
  );
}

function CodForm({ setting }: { setting: Setting }) {
  const value = asObject(setting.value);
  const allowed = Array.isArray(value.allowedPincodes)
    ? value.allowedPincodes.filter((item): item is string => typeof item === "string").join("\n")
    : "";
  const schema = z.object({
    enabled: z.boolean(),
    maxOrderAmount: z.string().regex(money),
    pincodeMode: z.enum(["all", "allowlist"]),
    allowedPincodes: z.string(),
  });
  type Values = z.infer<typeof schema>;
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      enabled: booleanValue(value, "enabled", true),
      maxOrderAmount: stringValue(value, "maxOrderAmount", "25000.00"),
      pincodeMode: value.pincodeMode === "allowlist" ? "allowlist" : "all",
      allowedPincodes: allowed,
    },
  });
  return (
    <Form {...form}>
      <SettingsCard setting={setting}>
        <form
          onSubmit={form.handleSubmit((values) => persist(setting.key, setting.label, {
            enabled: values.enabled,
            maxOrderAmount: values.maxOrderAmount,
            pincodeMode: values.pincodeMode,
            allowedPincodes: values.allowedPincodes.split(/[\s,]+/).map((item) => item.trim()).filter(Boolean),
          }))}
          className="grid gap-4 sm:grid-cols-2"
        >
          <AdminCheckboxField name="enabled" label="Enable cash on delivery" />
          <AdminInputField name="maxOrderAmount" label="Maximum COD order (₹)" inputProps={{ inputMode: "decimal" }} />
          <AdminSelectField name="pincodeMode" label="Pincode mode">
            <option value="all">All pincodes</option>
            <option value="allowlist">Allowlist only</option>
          </AdminSelectField>
          <AdminTextareaField name="allowedPincodes" label="Allowed pincodes" textareaProps={{ placeholder: "One pincode per line" }} />
          <SaveButton pending={form.formState.isSubmitting} />
        </form>
      </SettingsCard>
    </Form>
  );
}

function SeoForm({ setting }: { setting: Setting }) {
  const value = asObject(setting.value);
  const schema = z.object({
    title: z.string().trim().min(1).max(180),
    description: z.string().max(400),
    siteName: z.string().trim().min(1).max(120),
  });
  type Values = z.infer<typeof schema>;
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: stringValue(value, "title", "Baba's Camera"),
      description: stringValue(value, "description"),
      siteName: stringValue(value, "siteName", "Baba's Camera"),
    },
  });
  return (
    <Form {...form}>
      <SettingsCard setting={setting}>
        <form onSubmit={form.handleSubmit((values) => persist(setting.key, setting.label, values))} className="grid gap-4">
          <AdminInputField name="title" label="Default title" />
          <AdminInputField name="siteName" label="Site name" />
          <AdminTextareaField name="description" label="Default description" />
          <SaveButton pending={form.formState.isSubmitting} />
        </form>
      </SettingsCard>
    </Form>
  );
}

function NotificationForm({ setting }: { setting: Setting }) {
  const value = asObject(setting.value);
  const schema = z.object({
    orderConfirmation: z.boolean(),
    paymentConfirmation: z.boolean(),
    shippingUpdate: z.boolean(),
    adminNewOrder: z.boolean(),
  });
  type Values = z.infer<typeof schema>;
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      orderConfirmation: booleanValue(value, "orderConfirmation", true),
      paymentConfirmation: booleanValue(value, "paymentConfirmation", true),
      shippingUpdate: booleanValue(value, "shippingUpdate", true),
      adminNewOrder: booleanValue(value, "adminNewOrder", true),
    },
  });
  const options = [
    ["orderConfirmation", "Customer order confirmation"],
    ["paymentConfirmation", "Customer payment confirmation"],
    ["shippingUpdate", "Customer shipping updates"],
    ["adminNewOrder", "Administrator new-order alert"],
  ] as const;
  return (
    <Form {...form}>
      <SettingsCard setting={setting}>
        <form onSubmit={form.handleSubmit((values) => persist(setting.key, setting.label, values))} className="grid gap-3">
          {options.map(([key, label]) => (
            <AdminCheckboxField key={key} name={key} label={label} className="rounded-xl border p-3" />
          ))}
          <SaveButton pending={form.formState.isSubmitting} />
        </form>
      </SettingsCard>
    </Form>
  );
}

function HeroForm({ setting }: { setting: Setting }) {
  const value = asObject(setting.value);
  const schema = z.object({
    eyebrow: z.string().max(100),
    title: z.string().trim().min(1).max(180),
    description: z.string().max(500),
    ctaLabel: z.string().max(80),
    ctaHref: z.string().regex(/^\/(?!\/)/),
    imageUrl: z.string(),
    secondaryLabel: z.string().max(80),
    secondaryHref: z.string().refine((item) => item === "" || /^\/(?!\/)/.test(item)),
  });
  type Values = z.infer<typeof schema>;
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      eyebrow: stringValue(value, "eyebrow"),
      title: stringValue(value, "title", "Capture every story"),
      description: stringValue(value, "description"),
      ctaLabel: stringValue(value, "ctaLabel", "Shop products"),
      ctaHref: stringValue(value, "ctaHref", "/products"),
      imageUrl: stringValue(value, "imageUrl"),
      secondaryLabel: stringValue(value, "secondaryLabel"),
      secondaryHref: stringValue(value, "secondaryHref"),
    },
  });
  return (
    <Form {...form}>
      <SettingsCard setting={setting}>
        <form onSubmit={form.handleSubmit((values) => persist(setting.key, setting.label, values))} className="grid gap-4 sm:grid-cols-2">
          <AdminInputField name="eyebrow" label="Eyebrow" />
          <AdminInputField name="title" label="Title" />
          <AdminTextareaField name="description" label="Description" className="sm:col-span-2" />
          <AdminInputField name="ctaLabel" label="Primary CTA label" />
          <AdminInputField name="ctaHref" label="Primary CTA path" />
          <AdminInputField name="secondaryLabel" label="Secondary CTA label" />
          <AdminInputField name="secondaryHref" label="Secondary CTA path" />
          <AdminInputField name="imageUrl" label="Hero image URL or local path" className="sm:col-span-2" />
          <SaveButton pending={form.formState.isSubmitting} />
        </form>
      </SettingsCard>
    </Form>
  );
}

function SettingsCard({ setting, children }: { setting: Setting; children: React.ReactNode }) {
  return (
    <Card className="border-slate-200">
      <CardHeader><CardTitle>{setting.label}</CardTitle><CardDescription>{setting.description}</CardDescription></CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function SaveButton({ pending }: { pending: boolean }) {
  return <Button type="submit" disabled={pending} className="justify-self-start">{pending ? "Saving…" : "Save changes"}</Button>;
}

export function SettingsManager({
  settings,
  razorpay,
}: {
  settings: Setting[];
  razorpay: { configured: boolean; maskedKeyId: string | null };
}) {
  const byKey = new Map(settings.map((setting) => [setting.key, setting]));
  const required = (key: string) => {
    const setting = byKey.get(key);
    if (!setting) throw new Error(`Missing settings definition: ${key}`);
    return setting;
  };
  return (
    <>
      <Card className={razorpay.configured ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}>
        <CardHeader><CardTitle>Razorpay server configuration</CardTitle><CardDescription>
          {razorpay.configured ? `Configured with ${razorpay.maskedKeyId}.` : "RAZORPAY_KEY_ID and/or RAZORPAY_KEY_SECRET are missing."}
          {" "}Operational credentials are environment-only and never persisted.
        </CardDescription></CardHeader>
      </Card>
      <div className="grid gap-5 xl:grid-cols-2">
        <StoreForm setting={required("store.profile")} />
        <ShippingForm setting={required("shipping.rules")} />
        <CodForm setting={required("cod.rules")} />
        <SeoForm setting={required("seo.defaults")} />
        <NotificationForm setting={required("notifications.toggles")} />
        <HeroForm setting={required("homepage.hero")} />
      </div>
    </>
  );
}
