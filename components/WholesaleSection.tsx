"use client";

import { useAuth } from "@/lib/authClient";
import WholesaleApplyForm from "./WholesaleApplyForm";
import WholesaleDashboard from "./WholesaleDashboard";

const PERKS = [
  {
    title: "Wholesale pricing",
    body: "Approved businesses see contract wholesale prices on eligible products — below every public rate.",
  },
  {
    title: "Volume breaks for everyone",
    body: "Buy in bulk and the unit price drops automatically. No account needed for public volume tiers.",
  },
  {
    title: "Credit, quotes & fast fulfilment",
    body: "Net-30 credit and request-a-quote at checkout, on the same pincode-serviced delivery network.",
  },
];

/** Approved wholesalers see their dashboard; everyone else sees the pitch + apply form. */
export default function WholesaleSection() {
  const { user, loading } = useAuth();

  if (!loading && user?.isWholesaler) {
    return <WholesaleDashboard />;
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1.1fr_1fr]">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Why go Business</h2>
        <div className="mt-4 space-y-4">
          {PERKS.map((p) => (
            <div key={p.title} className="rounded-xl border border-slate-200 bg-white p-5">
              <p className="font-semibold text-slate-900">{p.title}</p>
              <p className="mt-1 text-sm text-slate-500">{p.body}</p>
            </div>
          ))}
        </div>
      </div>
      <div>
        <WholesaleApplyForm />
      </div>
    </div>
  );
}
