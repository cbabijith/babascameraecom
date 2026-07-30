import {
  BadgePercent,
  ChartNoAxesCombined,
  FolderTree,
  PackageCheck,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Star,
  Tags,
  UsersRound,
  type LucideIcon,
} from "lucide-react";

export interface AdminNavigationItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export interface AdminNavigationSection {
  label: string;
  items: AdminNavigationItem[];
}

export const adminNavigationSections: AdminNavigationSection[] = [
  {
    label: "Overview",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: ChartNoAxesCombined },
      { href: "/orders", label: "Orders", icon: PackageCheck },
    ],
  },
  {
    label: "Catalogue",
    items: [
      { href: "/categories", label: "Categories", icon: FolderTree },
      { href: "/brands", label: "Brands", icon: Tags },
      { href: "/products", label: "Products", icon: ShoppingBag },
    ],
  },
  {
    label: "Customers",
    items: [
      { href: "/customers", label: "Customers", icon: UsersRound },
      { href: "/users", label: "Users & access", icon: ShieldCheck },
    ],
  },
  {
    label: "Growth",
    items: [
      { href: "/coupons", label: "Coupons", icon: BadgePercent },
      { href: "/reviews", label: "Reviews", icon: Star },
    ],
  },
  {
    label: "System",
    items: [
      { href: "/settings", label: "Settings", icon: Settings },
    ],
  },
];
