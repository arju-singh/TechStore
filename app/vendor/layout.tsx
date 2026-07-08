import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getVendorContext } from "@/lib/auth";
import VendorNav from "@/components/vendor/VendorNav";

export const metadata: Metadata = {
  title: { default: "Seller Center", template: "%s · Seller · TechStore" },
};

export default async function VendorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, vendor } = await getVendorContext();
  // Middleware already requires a session; this is the authoritative re-check.
  if (!user) redirect("/login?next=/vendor");

  // Only an approved store gets the full portal shell + nav. Every other state
  // (no store yet / pending / suspended / rejected) renders inside a simple
  // container — the page itself shows the right message or the apply form.
  const approved = vendor?.status === "approved";
  if (!approved) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">{children}</div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="flex flex-col gap-8 lg:flex-row">
        <aside className="lg:w-56 lg:shrink-0">
          <div className="mb-4 flex items-center gap-2">
            <span className="rounded-md bg-brand-600 px-2 py-1 text-xs font-bold uppercase tracking-wide text-white">
              Seller
            </span>
            <span className="truncate text-sm text-white/50">{vendor.name}</span>
          </div>
          <VendorNav />
          <Link
            href="/"
            className="mt-4 block text-sm font-medium text-brand-600 hover:underline"
          >
            ← Back to store
          </Link>
        </aside>
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
