import { requireDatabase, connectToDatabase } from "@/lib/mongodb";
import MembershipSubscriptionModel from "@/lib/models/MembershipSubscription";
import { setMembershipTier } from "@/lib/wholesalers";
import type { MembershipTier } from "@/lib/membership";

/** Membership subscription data layer. DB-only, fail-loud. */

export interface MembershipSubscription {
  wholesalerId: string;
  tier: MembershipTier;
  status: "active" | "cancelled";
  startedAt: string;
  renewsAt: string;
  autoRenew: boolean;
}

function docToSub(doc: any): MembershipSubscription {
  return {
    wholesalerId: doc.wholesalerId,
    tier: (doc.tier ?? "none") as MembershipTier,
    status: (doc.status ?? "active") as "active" | "cancelled",
    startedAt: doc.startedAt ?? "",
    renewsAt: doc.renewsAt ?? "",
    autoRenew: Boolean(doc.autoRenew),
  };
}

export async function getSubscription(
  wholesalerId: string
): Promise<MembershipSubscription | null> {
  requireDatabase();
  await connectToDatabase();
  const doc = await MembershipSubscriptionModel.findOne({ wholesalerId })
    .lean()
    .catch(() => null);
  return doc ? docToSub(doc) : null;
}

/** Subscribe (or change) a membership tier — also updates the profile's tier. */
export async function subscribeMembership(
  wholesalerId: string,
  tier: MembershipTier,
  nowISO: string,
  renewsAtISO: string
): Promise<MembershipSubscription> {
  requireDatabase();
  await connectToDatabase();
  const doc = await MembershipSubscriptionModel.findOneAndUpdate(
    { wholesalerId },
    {
      $set: {
        tier,
        status: "active",
        startedAt: nowISO,
        renewsAt: renewsAtISO,
        autoRenew: true,
      },
      $setOnInsert: { wholesalerId },
    },
    { new: true, upsert: true }
  ).lean();
  await setMembershipTier(wholesalerId, tier);
  return docToSub(doc);
}

/** Cancel membership — reverts the profile to the free tier. */
export async function cancelMembership(
  wholesalerId: string
): Promise<MembershipSubscription | null> {
  requireDatabase();
  await connectToDatabase();
  const doc = await MembershipSubscriptionModel.findOneAndUpdate(
    { wholesalerId },
    { $set: { status: "cancelled", tier: "none", autoRenew: false } },
    { new: true }
  )
    .lean()
    .catch(() => null);
  await setMembershipTier(wholesalerId, "none");
  return doc ? docToSub(doc) : null;
}
