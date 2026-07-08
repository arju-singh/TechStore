"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/wholesale", label: "Dashboard", exact: true },
  { href: "/wholesale/catalog", label: "Catalog", exact: false },
  { href: "/wholesale/cart", label: "Bulk cart", exact: false },
  { href: "/wholesale/checkout", label: "Checkout", exact: false },
  { href: "/wholesale/orders", label: "Orders", exact: false },
  { href: "/wholesale/rfqs", label: "My quotes", exact: false },
  { href: "/wholesale/templates", label: "Templates", exact: false },
  { href: "/wholesale/loyalty", label: "Rewards", exact: false },
  { href: "/wholesale/membership", label: "Membership", exact: false },
];

export default function WholesaleNav() {
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
              active ? "bg-brand-50 text-brand-700" : "text-white/70 hover:bg-white/10"
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
