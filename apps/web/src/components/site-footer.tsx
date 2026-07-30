import Link from "next/link";
import { ExternalLink, Mail, Phone } from "lucide-react";
import { Button } from "@babascamera/ui";
import { subscribeNewsletterAction } from "@/app/actions/newsletter";
import { ActionForm } from "@/components/action-form";

const groups = [
  {
    title: "Shop",
    links: [
      ["/products", "All products"],
      ["/categories", "Categories"],
      ["/brands", "Brands"],
    ],
  },
  {
    title: "Support",
    links: [
      ["/account/orders", "Track an order"],
      ["/contact", "Contact us"],
      ["/shipping", "Shipping"],
      ["/returns", "Returns"],
    ],
  },
  {
    title: "Company",
    links: [
      ["/about", "About Baba's"],
      ["/privacy", "Privacy"],
      ["/terms", "Terms"],
    ],
  },
] as const;

export function SiteFooter() {
  const email =
    process.env.NEXT_PUBLIC_STORE_EMAIL?.trim() || "photostore@babas.in";
  const phone =
    process.env.NEXT_PUBLIC_STORE_PHONE?.trim() || "+91 471 257 2111";
  const address = process.env.NEXT_PUBLIC_STORE_ADDRESS?.trim() || "";
  const tel = phone.replace(/[^\d+]/g, "");

  return (
    <footer className="mt-20 border-t border-slate-200 bg-[#1A1A2E] text-white">
      <div className="page-shell grid gap-9 py-14 sm:grid-cols-2 lg:grid-cols-[1.25fr_repeat(3,.75fr)_1.2fr]">
        <div>
          <p className="text-xl font-bold">Baba&apos;s Camera</p>
          <p className="mt-3 max-w-sm text-sm leading-6 text-slate-300">
            Trusted cameras, lenses and creator gear, backed by expert support
            from Kerala to every corner of India.
          </p>
          <div className="mt-4 space-y-2 text-sm text-slate-300">
            <a
              href={`mailto:${email}`}
              className="flex items-center gap-2 hover:text-white"
            >
              <Mail className="h-4 w-4" />
              {email}
            </a>
            <a
              href={`tel:${tel}`}
              className="flex items-center gap-2 hover:text-white"
            >
              <Phone className="h-4 w-4" />
              {phone}
            </a>
            {address ? <p className="leading-5">{address}</p> : null}
          </div>
          <div className="mt-4 flex gap-3">
            <a
              href="https://www.facebook.com/babastvm/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Baba's Camera on Facebook"
              className="rounded-full border border-slate-600 p-2 hover:border-white"
            >
              <ExternalLink className="h-4 w-4" />
              <span className="sr-only">Facebook</span>
            </a>
            <a
              href="https://www.instagram.com/babas_photostore/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Baba's Camera on Instagram"
              className="rounded-full border border-slate-600 p-2 hover:border-white"
            >
              <ExternalLink className="h-4 w-4" />
              <span className="sr-only">Instagram</span>
            </a>
          </div>
        </div>
        {groups.map((group) => (
          <div key={group.title}>
            <p className="font-semibold">{group.title}</p>
            <ul className="mt-3 space-y-2 text-sm text-slate-300">
              {group.links.map(([href, label]) => (
                <li key={href}>
                  <Link href={href} className="hover:text-white">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
        <div>
          <p className="font-semibold">Field notes</p>
          <p className="mt-3 text-sm leading-6 text-slate-300">
            Product launches and practical photography advice, sent
            occasionally.
          </p>
          <ActionForm
            action={subscribeNewsletterAction}
            className="mt-4 space-y-2"
            resetOnSuccess
          >
            <input
              type="email"
              name="email"
              required
              aria-label="Email for newsletter"
              placeholder="you@example.com"
              className="h-10 w-full rounded-lg bg-white px-3 text-sm text-[#1A1A2E]"
            />
            <Button
              type="submit"
              size="sm"
              className="w-full bg-[#E94560] hover:bg-[#D63852]"
            >
              Subscribe
            </Button>
          </ActionForm>
        </div>
      </div>
      <div className="border-t border-slate-700 py-5 text-center text-xs text-slate-400">
        © {new Date().getFullYear()} Baba&apos;s Camera. All rights reserved.
      </div>
    </footer>
  );
}
