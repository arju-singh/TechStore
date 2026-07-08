import { NextResponse } from "next/server";
import { getWholesalerUser } from "@/lib/auth";
import { hasDatabase } from "@/lib/mongodb";
import { subscribeMembership, cancelMembership } from "@/lib/memberships";
import { MEMBERSHIP_PLANS, type MembershipTier } from "@/lib/membership";
import { notify } from "@/lib/notifications";

const DB_REQUIRED = "Wholesale requires a database. Set MONGODB_URI.";

/**
 * Wholesaler: choose (or cancel) a membership tier. Records a subscription and
 * updates the profile tier. Billing is not integrated — the tier is recorded,
 * not charged.
 */
export async function POST(request: Request) {
  if (!hasDatabase) return NextResponse.json({ error: DB_REQUIRED }, { status: 503 });
  const ctx = await getWholesalerUser();
  if (!ctx) return NextResponse.json({ error: "Approved wholesalers only." }, { status: 403 });

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const tier = body?.tier as MembershipTier;
  if (tier === "none") {
    const sub = await cancelMembership(ctx.profile.id);
    await notify({
      userId: ctx.user.id,
      email: ctx.profile.email,
      type: "membership_cancelled",
      title: "Membership cancelled",
      body: "Your wholesale membership has been cancelled.",
    });
    return NextResponse.json({ subscription: sub });
  }

  const plan = MEMBERSHIP_PLANS.find((p) => p.tier === tier);
  if (!plan) {
    return NextResponse.json({ error: "Invalid membership tier." }, { status: 400 });
  }

  const now = new Date();
  const renews = new Date(now);
  renews.setDate(renews.getDate() + 30);
  const sub = await subscribeMembership(
    ctx.profile.id,
    tier,
    now.toISOString(),
    renews.toISOString()
  );

  await notify({
    userId: ctx.user.id,
    email: ctx.profile.email,
    type: "membership_active",
    title: `${plan.label} membership active`,
    body: `You're now a ${plan.label} member — enjoy ${plan.extraDiscountPercent}% extra off catalog orders.`,
  });

  return NextResponse.json({ subscription: sub });
}
