import Link from "next/link";
import { Heart, MapPin, Package, UserRound } from "lucide-react";
import { Card, CardContent } from "@babascamera/ui";
import { requireUser } from "@/lib/auth/session";

const cards = [
  {
    href: "/account/orders",
    title: "Your orders",
    description: "Track deliveries, payments and invoices.",
    icon: Package,
  },
  {
    href: "/account/addresses",
    title: "Saved addresses",
    description: "Keep delivery details ready for checkout.",
    icon: MapPin,
  },
  {
    href: "/account/wishlist",
    title: "Wishlist",
    description: "Return to the gear you have saved.",
    icon: Heart,
  },
  {
    href: "/account/profile",
    title: "Profile",
    description: "Update your name and contact details.",
    icon: UserRound,
  },
];

export const metadata = { title: "Your account" };

export default async function AccountPage() {
  const user = await requireUser("/account");
  const name =
    typeof user.user_metadata.full_name === "string"
      ? user.user_metadata.full_name
      : "there";
  return (
    <div>
      <p className="text-sm font-semibold text-[#E94560]">Your account</p>
      <h1 className="mt-1 text-3xl font-bold">Hello, {name}</h1>
      <p className="mt-2 text-slate-600">
        Manage your Baba&apos;s Camera shopping in one place.
      </p>
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {cards.map(({ href, title, description, icon: Icon }) => (
          <Link key={href} href={href}>
            <Card className="h-full transition hover:-translate-y-0.5 hover:shadow-md">
              <CardContent className="flex gap-4 pt-6">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-50 text-[#E94560]">
                  <Icon className="h-5 w-5" />
                </span>
                <span>
                  <span className="font-semibold">{title}</span>
                  <span className="mt-1 block text-sm leading-5 text-slate-500">
                    {description}
                  </span>
                </span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
