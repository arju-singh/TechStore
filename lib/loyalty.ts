import { requireDatabase, connectToDatabase } from "@/lib/mongodb";
import LoyaltyTransactionModel from "@/lib/models/LoyaltyTransaction";
import { incrementLoyaltyPoints } from "@/lib/wholesalers";

/** Loyalty / reward-points ledger. DB-only, fail-loud. */

export interface LoyaltyTransaction {
  id: string;
  wholesalerId: string;
  delta: number;
  reason: string;
  orderId: string;
  balanceAfter: number;
  createdAt: string;
}

function docToTxn(doc: any): LoyaltyTransaction {
  return {
    id: String(doc._id ?? doc.id),
    wholesalerId: doc.wholesalerId,
    delta: Number(doc.delta) || 0,
    reason: doc.reason ?? "",
    orderId: doc.orderId ?? "",
    balanceAfter: Number(doc.balanceAfter) || 0,
    createdAt:
      doc.createdAt instanceof Date
        ? doc.createdAt.toISOString()
        : String(doc.createdAt ?? ""),
  };
}

/**
 * Award (or deduct) loyalty points: updates the profile balance atomically and
 * writes a ledger entry. Returns the new balance.
 */
export async function recordLoyalty(
  wholesalerId: string,
  delta: number,
  reason: string,
  orderId = ""
): Promise<number> {
  requireDatabase();
  await connectToDatabase();
  const profile = await incrementLoyaltyPoints(wholesalerId, delta);
  const balanceAfter = profile?.loyaltyPoints ?? 0;
  await LoyaltyTransactionModel.create({
    wholesalerId,
    delta,
    reason,
    orderId,
    balanceAfter,
  });
  return balanceAfter;
}

/** Points earned on a wholesale order (1 point per ₹100 spent). */
export async function awardOrderPoints(
  wholesalerId: string,
  orderTotal: number,
  orderId: string
): Promise<void> {
  const points = Math.floor(orderTotal / 100);
  if (points <= 0) return;
  await recordLoyalty(wholesalerId, points, "Wholesale order", orderId);
}

export async function getLoyaltyLedger(
  wholesalerId: string
): Promise<LoyaltyTransaction[]> {
  requireDatabase();
  await connectToDatabase();
  const docs = await LoyaltyTransactionModel.find({ wholesalerId })
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();
  return docs.map(docToTxn);
}
