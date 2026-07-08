import { NextResponse } from "next/server";
import { getWholesalerUser } from "@/lib/auth";
import { hasDatabase } from "@/lib/mongodb";
import { calculateWholesaleCart } from "@/lib/wholesalePricing";

const DB_REQUIRED = "Wholesale requires a database. Set MONGODB_URI.";

/**
 * Server-authoritative price calculation for a wholesale cart. The client sends
 * only { slug, qty }; every price, discount, and total is computed here. Used by
 * the wholesale cart for a trustworthy live preview.
 */
export async function POST(request: Request) {
  if (!hasDatabase) return NextResponse.json({ error: DB_REQUIRED }, { status: 503 });

  const ctx = await getWholesalerUser();
  if (!ctx) {
    return NextResponse.json(
      { error: "Approved wholesalers only." },
      { status: 403 }
    );
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  try {
    const calc = await calculateWholesaleCart(body?.items, ctx.profile.membershipTier);
    return NextResponse.json({ lines: calc.lines, totals: calc.totals });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not price the cart." },
      { status: 400 }
    );
  }
}
