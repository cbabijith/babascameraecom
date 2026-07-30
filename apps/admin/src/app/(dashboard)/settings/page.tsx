import { PageHeader } from "@/components/page-header";
import { SettingsManager } from "@/components/settings-manager";
import { getSettings } from "@/lib/data";

export const dynamic = "force-dynamic";

const definitions = [
  { key: "store.profile", label: "Store profile", description: "name, email, phone, and address.", fallback: { name: "Baba's Camera", email: "", phone: "", address: "" } },
  { key: "shipping.rules", label: "Shipping rules", description: "flatCharge and freeAbove are exact decimal rupee strings; currency is INR.", fallback: { flatCharge: "0.00", freeAbove: "0.00", currency: "INR" } },
  { key: "cod.rules", label: "Cash on delivery", description: "enabled, maxOrderAmount, pincodeMode, and allowedPincodes.", fallback: { enabled: true, maxOrderAmount: "25000.00", pincodeMode: "all", allowedPincodes: [] } },
  { key: "seo.defaults", label: "SEO defaults", description: "Default title, description, and siteName for the storefront.", fallback: { title: "Baba's Camera", description: "Cameras, lenses and photography equipment.", siteName: "Baba's Camera" } },
  { key: "notifications.toggles", label: "Notifications", description: "Order, payment, shipping, and administrator email toggles.", fallback: { orderConfirmation: true, paymentConfirmation: true, shippingUpdate: true, adminNewOrder: true } },
  { key: "homepage.hero", label: "Homepage hero", description: "Public hero copy, CTA, and optional image URL.", fallback: { eyebrow: "Baba's Camera", title: "Capture every story", description: "Shop trusted cameras, lenses and accessories.", ctaLabel: "Shop products", ctaHref: "/products", imageUrl: "" } },
] as const;

export default async function SettingsPage() {
  const current = await getSettings();
  const keyId = process.env.RAZORPAY_KEY_ID?.trim() ?? "";
  const hasSecret = Boolean(process.env.RAZORPAY_KEY_SECRET?.trim());
  const settings = definitions.map((definition) => {
    const stored = current.find((item) => item.key === definition.key);
    return { key: definition.key, label: definition.label, description: definition.description, value: stored?.value ?? definition.fallback };
  });
  return (
    <>
      <PageHeader title="Settings" description="Database-authoritative storefront settings; secrets remain server-only." />
      <SettingsManager
        settings={settings}
        razorpay={{
          configured: Boolean(keyId && hasSecret),
          maskedKeyId: keyId ? `${keyId.slice(0, 8)}••••${keyId.slice(-4)}` : null,
        }}
      />
    </>
  );
}
