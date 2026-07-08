import type { Metadata } from "next";
import WholesaleSection from "@/components/WholesaleSection";

export const metadata: Metadata = {
  title: "TechStore Business — Wholesale pricing",
  description:
    "Apply for a TechStore Business account to unlock wholesale pricing and bulk order minimums across the catalog.",
};

export default function BusinessPage() {
  return (
    <div className="bg-slate-50">
      {/* B2B hero — business-blue accent distinct from the retail storefront. */}
      <section className="bg-gradient-to-b from-[#0f2942] to-[#132f4c] text-white">
        <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-blue-100">
            TechStore Business
          </span>
          <h1 className="mt-4 max-w-2xl text-3xl font-bold leading-tight sm:text-4xl">
            Buy for your business at wholesale prices
          </h1>
          <p className="mt-3 max-w-2xl text-blue-100">
            Retail shoppers get great prices. Registered businesses get wholesale.
            Apply once, get approved, and unlock contract pricing and bulk minimums
            across the catalog.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
        <WholesaleSection />
      </div>
    </div>
  );
}
