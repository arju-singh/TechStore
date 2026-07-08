import Link from "next/link";
import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { hasDatabase } from "@/lib/mongodb";
import { getWholesalerByUser } from "@/lib/wholesalers";
import { getWholesaleSettings } from "@/lib/wholesaleSettings";
import { getCategories } from "@/lib/products";
import WholesalerApplyForm from "@/components/wholesale/WholesalerApplyForm";

export const metadata: Metadata = {
  title: "Become a wholesaler",
  description:
    "Buy in bulk at exclusive wholesale prices from verified vendors on TechStore. GST billing, faster shipping, and business support.",
};

const BENEFITS = [
  ["Exclusive wholesale prices", "Tiered pricing that drops as your order grows."],
  ["Direct from verified vendors", "Buy straight from sellers, no middleman markup."],
  ["GST tax invoices", "Compliant B2B invoices with your business details."],
  ["Net-15 / Net-30 credit", "Approved buyers can pay on terms, not upfront."],
  ["Request a quote (RFQ)", "Negotiate custom pricing on large orders."],
  ["Bulk & repeat ordering", "Reorder, templates, and CSV upload for big carts."],
];

export default async function BecomeWholesalerPage() {
  const user = await getCurrentUser();
  const settings = hasDatabase
    ? await getWholesaleSettings().catch(() => null)
    : null;
  const moduleEnabled = Boolean(settings?.moduleEnabled);
  const profile =
    user && hasDatabase
      ? await getWholesalerByUser(user.id).catch(() => null)
      : null;
  const categories = await getCategories();

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      {/* Hero */}
      <section className="rounded-3xl bg-gradient-to-br from-slate-900 to-brand-800 px-6 py-12 text-center text-white sm:px-12">
        <p className="text-sm font-semibold uppercase tracking-widest text-brand-200">
          TechStore Wholesale
        </p>
        <h1 className="mt-3 text-3xl font-bold sm:text-4xl">
          Buy in bulk. Pay wholesale.
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-sm text-white/80 sm:text-base">
          Exclusive wholesale pricing direct from verified vendors — better
          discounts on larger orders, GST billing, faster shipping, and dedicated
          business support.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <a
            href="#apply"
            className="rounded-lg bg-white/[0.02] px-5 py-2.5 text-sm font-semibold text-white hover:bg-white/10"
          >
            {profile ? "View my application" : "Apply now"}
          </a>
          <Link
            href="/products"
            className="rounded-lg border border-white/40 px-5 py-2.5 text-sm font-semibold text-white hover:bg-white/[0.02]/10"
          >
            Browse products
          </Link>
        </div>
      </section>

      {/* Why wholesale */}
      <section className="mt-10">
        <h2 className="text-xl font-bold text-white">Why buy wholesale</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {BENEFITS.map(([title, body]) => (
            <div key={title} className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
              <h3 className="font-semibold text-white">✔ {title}</h3>
              <p className="mt-1 text-sm text-white/50">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Apply */}
      <section id="apply" className="mt-10 scroll-mt-20">
        <h2 className="text-xl font-bold text-white">Apply for a wholesale account</h2>

        {!hasDatabase || !moduleEnabled ? (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800">
            Wholesale applications are currently unavailable. Please check back
            later.
          </div>
        ) : !user ? (
          <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.02] p-6">
            <p className="text-sm text-white/70">
              You need an account to apply for wholesale access.
            </p>
            <div className="mt-4 flex gap-3">
              <Link
                href="/login?redirect=/become-a-wholesaler"
                className="rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
              >
                Log in
              </Link>
              <Link
                href="/signup?redirect=/become-a-wholesaler"
                className="rounded-lg border border-white/10 px-5 py-2.5 text-sm font-semibold text-white/70 hover:bg-white/5"
              >
                Create account
              </Link>
            </div>
          </div>
        ) : profile ? (
          <ApplicationStatus status={profile.status} businessName={profile.businessName} />
        ) : (
          <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.02] p-6">
            <WholesalerApplyForm categories={categories} defaultEmail={user.email} />
          </div>
        )}
      </section>
    </div>
  );
}

function ApplicationStatus({
  status,
  businessName,
}: {
  status: string;
  businessName: string;
}) {
  const map: Record<string, { tone: string; title: string; body: string }> = {
    pending: {
      tone: "border-amber-200 bg-amber-50 text-amber-800",
      title: "Application under review",
      body: `Thanks for applying, ${businessName}. An admin is reviewing your documents — you'll be notified once it's decided.`,
    },
    needs_docs: {
      tone: "border-orange-200 bg-orange-50 text-orange-800",
      title: "More documents needed",
      body: `We need additional documents for ${businessName}. Please re-upload from your wholesale portal.`,
    },
    approved: {
      tone: "border-emerald-200 bg-emerald-50 text-emerald-800",
      title: "You're approved!",
      body: `${businessName} is an approved wholesaler. Open your wholesale portal to shop at bulk prices.`,
    },
    rejected: {
      tone: "border-red-200 bg-red-50 text-red-700",
      title: "Application not approved",
      body: `Unfortunately your application for ${businessName} wasn't approved. Contact support if you think this is a mistake.`,
    },
    suspended: {
      tone: "border-orange-200 bg-orange-50 text-orange-800",
      title: "Account suspended",
      body: `${businessName} is currently suspended. Contact support to resolve this.`,
    },
    blacklisted: {
      tone: "border-red-200 bg-red-50 text-red-700",
      title: "Account blocked",
      body: `${businessName} has been blocked from wholesale access.`,
    },
  };
  const c = map[status] ?? map.pending;
  return (
    <div className={`mt-4 rounded-xl border p-6 ${c.tone}`}>
      <h3 className="text-lg font-semibold">{c.title}</h3>
      <p className="mt-2 text-sm">{c.body}</p>
      <Link
        href="/wholesale"
        className="mt-4 inline-block text-sm font-semibold underline"
      >
        Go to wholesale portal →
      </Link>
    </div>
  );
}
