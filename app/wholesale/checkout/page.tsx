import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getWholesalerUser } from "@/lib/auth";
import { getCreditTerms } from "@/lib/creditTerms";
import WholesaleCheckoutView from "@/components/wholesale/WholesaleCheckoutView";

export const metadata: Metadata = { title: "Checkout" };

export default async function WholesaleCheckoutPage() {
  const ctx = await getWholesalerUser();
  if (!ctx) redirect("/become-a-wholesaler");
  const terms = await getCreditTerms(ctx.profile.id);
  const hasCredit = Boolean(terms && terms.creditLimit > 0 && terms.available > 0);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-white">Wholesale checkout</h1>
      <WholesaleCheckoutView
        hasCredit={hasCredit}
        creditAvailable={terms?.available ?? 0}
        termsDays={terms?.termsDays ?? 30}
        defaultName={ctx.profile.businessName || ctx.user.name}
      />
    </div>
  );
}
