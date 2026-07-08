import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/auth";
import { getVendorBySlug } from "@/lib/vendors";
import {
  payoutSummaryForAllVendors,
  getVendorPayoutSummary,
  listPayouts,
  recordPayout,
} from "@/lib/payouts";

/** Admin: the full payout ledger — per-vendor balances + disbursement history. */
export async function GET() {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  const [summaries, payouts] = await Promise.all([
    payoutSummaryForAllVendors(),
    listPayouts(),
  ]);
  return NextResponse.json({ summaries, payouts });
}

/**
 * Admin: record a payout to a vendor. The amount is capped server-side at the
 * vendor's current payable balance so an admin can never over-disburse, and
 * defaults to paying the full balance when no amount is given.
 */
export async function POST(request: Request) {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const vendorSlug = typeof body?.vendorSlug === "string" ? body.vendorSlug : "";
  const vendor = await getVendorBySlug(vendorSlug);
  if (!vendor) {
    return NextResponse.json({ error: "Vendor not found." }, { status: 404 });
  }

  const { payable } = await getVendorPayoutSummary(vendorSlug);
  if (payable <= 0) {
    return NextResponse.json(
      { error: "This vendor has no outstanding balance." },
      { status: 400 }
    );
  }

  // Default to settling the full balance; never pay more than what's owed.
  const requested =
    body?.amount === undefined ? payable : Number(body.amount);
  if (!Number.isFinite(requested) || requested <= 0) {
    return NextResponse.json({ error: "Invalid amount." }, { status: 400 });
  }
  const amount = Math.min(requested, payable);

  const note = typeof body?.note === "string" ? body.note.slice(0, 200) : "";
  const payout = await recordPayout(
    { vendorSlug: vendor.slug, vendorName: vendor.name, amount, note },
    new Date().toISOString()
  );
  return NextResponse.json({ payout }, { status: 201 });
}
