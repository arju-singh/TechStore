"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/admin", label: "Dashboard", exact: true },
  { href: "/admin/products", label: "Products", exact: false },
  { href: "/admin/pricing", label: "Bulk pricing", exact: false },
  { href: "/admin/flash-sales", label: "Flash sales", exact: false },
  { href: "/admin/orders", label: "Orders", exact: false },
  { href: "/admin/reviews", label: "Reviews", exact: false },
  { href: "/admin/stores", label: "Stores", exact: false },
  { href: "/admin/payouts", label: "Payouts", exact: false },
  { href: "/admin/wholesalers", label: "Wholesalers", exact: false },
  { href: "/admin/wholesale-orders", label: "Wholesale orders", exact: false },
  { href: "/admin/wholesale-analytics", label: "Wholesale analytics", exact: false },
  { href: "/admin/wholesale-settings", label: "Wholesale settings", exact: false },
];

export default function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="space-y-1">
      {LINKS.map((link) => {
        const active = link.exact
          ? pathname === link.href
          : pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`block rounded-lg px-3 py-2 text-sm font-medium transition ${
              active
                ? "bg-brand-50 text-brand-700"
                : "text-white/70 hover:bg-white/10"
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
