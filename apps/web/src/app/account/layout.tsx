import Link from "next/link";
import {
  Heart,
  House,
  MapPin,
  Package,
  UserRound,
} from "lucide-react";
import { Button } from "@babascamera/ui";
import { signOutAction } from "@/app/actions/auth";
import { requireUser } from "@/lib/auth/session";

const accountNavigation = [
  { href: "/account", label: "Overview", icon: House },
  { href: "/account/orders", label: "Orders", icon: Package },
  { href: "/account/addresses", label: "Addresses", icon: MapPin },
  { href: "/account/wishlist", label: "Wishlist", icon: Heart },
  { href: "/account/profile", label: "Profile", icon: UserRound },
];

export default async function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser("/account");
  return (
    <div className="page-shell grid gap-8 py-10 lg:grid-cols-[15rem_1fr]">
      <aside>
        <p className="truncate text-sm text-slate-500">{user.email}</p>
        <nav className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-5 lg:grid-cols-1">
          {accountNavigation.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium hover:bg-slate-100 hover:text-[#E94560]"
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ))}
        </nav>
        <form action={signOutAction} className="mt-5">
          <Button variant="outline" type="submit" className="w-full">
            Sign out
          </Button>
        </form>
      </aside>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
