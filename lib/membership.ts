/**
 * Wholesale membership tiers. Client-safe (no DB imports) so both the pricing
 * engine and the membership UI can share it. A paid tier grants an extra
 * platform discount on wholesale catalog orders plus other perks; real
 * subscription billing is out of scope (the tier is recorded, not charged).
 */

export type MembershipTier = "none" | "silver" | "gold" | "platinum" | "diamond";

export interface MembershipPlan {
  tier: MembershipTier;
  label: string;
  pricePerMonth: number;
  extraDiscountPercent: number;
  benefits: string[];
}

export const MEMBERSHIP_PLANS: MembershipPlan[] = [
  {
    tier: "silver",
    label: "Silver",
    pricePerMonth: 999,
    extraDiscountPercent: 2,
    benefits: ["2% extra off catalog orders", "Priority email support", "Silver badge"],
  },
  {
    tier: "gold",
    label: "Gold",
    pricePerMonth: 2999,
    extraDiscountPercent: 4,
    benefits: ["4% extra off catalog orders", "Higher credit eligibility", "Priority support", "Gold badge"],
  },
  {
    tier: "platinum",
    label: "Platinum",
    pricePerMonth: 6999,
    extraDiscountPercent: 6,
    benefits: ["6% extra off catalog orders", "Dedicated account manager", "Early product access", "Platinum badge"],
  },
  {
    tier: "diamond",
    label: "Diamond",
    pricePerMonth: 14999,
    extraDiscountPercent: 8,
    benefits: ["8% extra off catalog orders", "Free shipping", "Highest credit limit", "Premium RFQ handling", "Diamond badge"],
  },
];

/** Extra discount (%) a membership tier grants on wholesale catalog prices. */
export function membershipDiscountPercent(tier: string): number {
  const plan = MEMBERSHIP_PLANS.find((p) => p.tier === tier);
  return plan ? plan.extraDiscountPercent : 0;
}

export function membershipLabel(tier: string): string {
  const plan = MEMBERSHIP_PLANS.find((p) => p.tier === tier);
  return plan ? plan.label : "None";
}
