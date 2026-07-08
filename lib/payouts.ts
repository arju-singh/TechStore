import { hasDatabase, connectToDatabase } from "@/lib/mongodb";
import PayoutModel from "@/lib/models/Payout";
import { getAllOrders, type Order } from "@/lib/orders";
import { getAllVendors, type Vendor } from "@/lib/vendors";

/**
 * Commission + payout accounting for the marketplace. The platform takes a
 * commission on each vendor's gross sales; the remainder (net) is what the
 * vendor is owed. Money is never actually transferred here — this is the ledger
 * that records what has been paid out and derives what is still payable.
 *
 * All figures come from the per-item snapshots stamped at order time
 * (`item.price`, `item.commissionRate`), so a later change to a vendor's rate
 * never retroactively rewrites historical earnings.
 */

/** Order statuses that represent a real, earned sale (money the vendor is owed). */
const EARNING_STATUSES = new Set<Order["status"]>([
  "confirmed",
  "paid",
  "shipped",
  "delivered",
  "credit_invoiced",
]);

/** Platform-wide default commission (%), overridable per vendor. */
export function platformCommissionRate(): number {
  const raw = Number(process.env.PLATFORM_COMMISSION_RATE);
  return Number.isFinite(raw) && raw >= 0 && raw <= 100 ? raw : 10;
}

/** A vendor's effective commission rate: their override, else the platform default. */
export function resolveCommissionRate(
  vendor: Pick<Vendor, "commissionRate">
): number {
  return typeof vendor.commissionRate === "number"
    ? vendor.commissionRate
    : platformCommissionRate();
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export interface VendorEarnings {
  gross: number;
  commission: number;
  net: number;
  ordersCount: number;
}

/**
 * Pure earnings computation from a set of orders for one vendor. Only counts
 * that vendor's line items in orders that represent earned sales.
 */
export function earningsFromOrders(
  orders: Order[],
  vendorSlug: string
): VendorEarnings {
  let gross = 0;
  let commission = 0;
  let ordersCount = 0;
  for (const order of orders) {
    if (!EARNING_STATUSES.has(order.status)) continue;
    let touched = false;
    for (const item of order.items) {
      if ((item.vendorSlug ?? "") !== vendorSlug) continue;
      const lineTotal = item.price * item.qty;
      const rate =
        typeof item.commissionRate === "number" ? item.commissionRate : 0;
      gross += lineTotal;
      commission += (lineTotal * rate) / 100;
      touched = true;
    }
    if (touched) ordersCount += 1;
  }
  return {
    gross: round2(gross),
    commission: round2(commission),
    net: round2(gross - commission),
    ordersCount,
  };
}

// ---------------------------------------------------------------------------
// Payout ledger (Mongo + in-memory fallback)
// ---------------------------------------------------------------------------

export interface Payout {
  id: string;
  vendorSlug: string;
  vendorName: string;
  amount: number;
  orderIds: string[];
  status: "pending" | "paid";
  note: string;
  paidAt: string;
  createdAt: string;
}

declare global {
  // eslint-disable-next-line no-var
  var _memPayouts: Payout[] | undefined;
}
const memPayouts: Payout[] = global._memPayouts ?? [];
global._memPayouts = memPayouts;

let memSeq = memPayouts.length;
function nextMemId(): string {
  memSeq += 1;
  return `pay_${String(memSeq).padStart(6, "0")}`;
}

function docToPayout(doc: any): Payout {
  return {
    id: String(doc._id ?? doc.id),
    vendorSlug: doc.vendorSlug,
    vendorName: doc.vendorName ?? "",
    amount: doc.amount,
    orderIds: Array.isArray(doc.orderIds) ? doc.orderIds : [],
    status: (doc.status ?? "paid") as Payout["status"],
    note: doc.note ?? "",
    paidAt: doc.paidAt ?? "",
    createdAt:
      doc.createdAt instanceof Date
        ? doc.createdAt.toISOString()
        : String(doc.createdAt ?? ""),
  };
}

export interface NewPayoutInput {
  vendorSlug: string;
  vendorName: string;
  amount: number;
  orderIds?: string[];
  note?: string;
}

/** Record a disbursement to a vendor. Marks it paid immediately (accounting only). */
export async function recordPayout(
  input: NewPayoutInput,
  nowISO: string
): Promise<Payout> {
  const base = {
    vendorSlug: input.vendorSlug,
    vendorName: input.vendorName,
    amount: round2(input.amount),
    orderIds: input.orderIds ?? [],
    status: "paid" as const,
    note: input.note ?? "",
    paidAt: nowISO,
  };
  if (!hasDatabase) {
    const payout: Payout = { id: nextMemId(), ...base, createdAt: nowISO };
    memPayouts.unshift(payout);
    return payout;
  }
  await connectToDatabase();
  const doc = await PayoutModel.create(base);
  return docToPayout(doc.toObject());
}

export async function listPayouts(vendorSlug?: string): Promise<Payout[]> {
  if (!hasDatabase) {
    const list = vendorSlug
      ? memPayouts.filter((p) => p.vendorSlug === vendorSlug)
      : memPayouts;
    return [...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
  await connectToDatabase();
  const filter = vendorSlug ? { vendorSlug } : {};
  const docs = await PayoutModel.find(filter).sort({ createdAt: -1 }).lean();
  return docs.map(docToPayout);
}

/** Total already paid out to a vendor. */
export function totalPaidOut(payouts: Payout[], vendorSlug: string): number {
  return round2(
    payouts
      .filter((p) => p.vendorSlug === vendorSlug && p.status === "paid")
      .reduce((s, p) => s + p.amount, 0)
  );
}

export interface VendorPayoutSummary extends VendorEarnings {
  vendor: Vendor;
  effectiveCommissionRate: number;
  paidOut: number;
  /** Net earned minus what's already been paid out (never negative). */
  payable: number;
}

/** Earnings + payout balance for a single vendor. */
export async function getVendorPayoutSummary(
  vendorSlug: string
): Promise<VendorEarnings & { paidOut: number; payable: number }> {
  const [orders, payouts] = await Promise.all([
    getAllOrders(),
    listPayouts(vendorSlug),
  ]);
  const earnings = earningsFromOrders(orders, vendorSlug);
  const paidOut = totalPaidOut(payouts, vendorSlug);
  return { ...earnings, paidOut, payable: Math.max(0, round2(earnings.net - paidOut)) };
}

/** Full ledger across every vendor — powers the admin payouts page. */
export async function payoutSummaryForAllVendors(): Promise<
  VendorPayoutSummary[]
> {
  const [vendors, orders, payouts] = await Promise.all([
    getAllVendors(),
    getAllOrders(),
    listPayouts(),
  ]);
  return vendors.map((vendor) => {
    const earnings = earningsFromOrders(orders, vendor.slug);
    const paidOut = totalPaidOut(payouts, vendor.slug);
    return {
      vendor,
      ...earnings,
      effectiveCommissionRate: resolveCommissionRate(vendor),
      paidOut,
      payable: Math.max(0, round2(earnings.net - paidOut)),
    };
  });
}
