import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getWholesalerContext } from "@/lib/auth";
import WholesaleNav from "@/components/wholesale/WholesaleNav";

export const metadata: Metadata = {
  title: { default: "Wholesale", template: "%s · Wholesale · TechStore" },
};

export default async function WholesaleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, profile } = await getWholesalerContext();
  if (!user) redirect("/login?next=/wholesale");
  // Non-approved (or no profile) → the public page shows their application status.
  if (!profile || profile.status !== "approved") redirect("/become-a-wholesaler");

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="flex flex-col gap-8 lg:flex-row">
        <aside className="lg:w-56 lg:shrink-0">
          <div className="mb-4 flex items-center gap-2">
            <span className="rounded-md bg-blue-600 px-2 py-1 text-xs font-bold uppercase tracking-wide text-white">
              Wholesale
            </span>
            <span className="truncate text-sm text-white/50">{profile.businessName}</span>
          </div>
          <WholesaleNav />
          <Link href="/" className="mt-4 block text-sm font-medium text-brand-600 hover:underline">
            ← Back to store
          </Link>
        </aside>
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
