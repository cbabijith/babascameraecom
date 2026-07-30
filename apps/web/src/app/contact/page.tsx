import { Mail, MapPin, Phone } from "lucide-react";
import { getStoreSettings } from "@/lib/data/settings";

export const metadata = { title: "Contact us" };
export const dynamic = "force-dynamic";

export default async function ContactPage() {
  const settings = await getStoreSettings();
  const profile = settings["store.profile"];
  const email =
    typeof profile.email === "string" && profile.email
      ? profile.email
      : "photostore@babas.in";
  const phone =
    typeof profile.phone === "string" && profile.phone
      ? profile.phone
      : "+91 471 257 2111";
  const address =
    typeof profile.address === "string" ? profile.address : "";
  return (
    <section className="page-shell py-14">
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#E94560]">
        Support
      </p>
      <h1 className="mt-2 text-4xl font-bold">Contact Baba&apos;s Camera</h1>
      <p className="mt-4 max-w-2xl leading-7 text-slate-600">
        For order help, include your order number. For product advice, tell us
        the camera or equipment you already use.
      </p>
      <div className="mt-9 grid max-w-3xl gap-4 sm:grid-cols-2">
        <a
          href={`mailto:${email}`}
          className="rounded-2xl border border-slate-200 p-6 transition hover:border-[#E94560]"
        >
          <Mail className="h-6 w-6 text-[#E94560]" />
          <h2 className="mt-3 font-bold">Email</h2>
          <p className="mt-1 break-all text-sm text-slate-600">{email}</p>
        </a>
        <a
          href={`tel:${phone.replace(/[^\d+]/g, "")}`}
          className="rounded-2xl border border-slate-200 p-6 transition hover:border-[#E94560]"
        >
          <Phone className="h-6 w-6 text-[#E94560]" />
          <h2 className="mt-3 font-bold">Phone</h2>
          <p className="mt-1 text-sm text-slate-600">{phone}</p>
        </a>
        {address ? (
          <div className="rounded-2xl border border-slate-200 p-6 sm:col-span-2">
            <MapPin className="h-6 w-6 text-[#E94560]" />
            <h2 className="mt-3 font-bold">Store address</h2>
            <p className="mt-1 text-sm leading-6 text-slate-600">{address}</p>
          </div>
        ) : null}
      </div>
    </section>
  );
}
