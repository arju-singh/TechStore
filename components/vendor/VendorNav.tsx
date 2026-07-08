"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/vendor", label: "Dashboard", exact: true },
  { href: "/vendor/products", label: "Products", exact: false },
  { href: "/vendor/orders", label: "Orders", exact: false },
  { href: "/vendor/wholesale", label: "Wholesale pricing", exact: true },
  { href: "/vendor/wholesale-orders", label: "Wholesale orders", exact: false },
  { href: "/vendor/rfqs", label: "Quotes (RFQ)", exact: false },
  { href: "/vendor/payouts", label: "Payouts", exact: false },
  { href: "/vendor/settings", label: "Settings", exact: false },
];

export default function VendorNav() {
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
