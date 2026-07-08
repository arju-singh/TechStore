import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getWholesalerUser } from "@/lib/auth";
import { membershipLabel } from "@/lib/membership";
import MembershipPlans from "@/components/wholesale/MembershipPlans";

export const metadata: Metadata = { title: "Membership" };

export default async function WholesaleMembershipPage() {
  const ctx = await getWholesalerUser();
  if (!ctx) redirect("/become-a-wholesaler");

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Premium membership</h1>
        <p className="mt-1 text-sm text-white/50">
          Current plan:{" "}
          <span className="font-semibold text-white/70">
            {membershipLabel(ctx.profile.membershipTier)}
          </span>
          . Upgrade for extra discounts and perks.
        </p>
      </div>
      <MembershipPlans currentTier={ctx.profile.membershipTier} />
    </div>
  );
}
