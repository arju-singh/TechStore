import { NextResponse } from "next/server";
import { getWholesalerUser } from "@/lib/auth";
import { hasDatabase } from "@/lib/mongodb";
import { getProductBySlug } from "@/lib/products";
import { getVendorBySlug } from "@/lib/vendors";
import { createRfq } from "@/lib/rfqs";
import { notify } from "@/lib/notifications";
import { enforceRateLimit } from "@/lib/rateLimit";

const DB_REQUIRED = "Wholesale requires a database. Set MONGODB_URI.";

/**
 * Wholesaler: submit an RFQ for custom pricing on a bulk order of a vendor's
 * product. Notifies the vendor who owns the product.
 */
export async function POST(request: Request) {
  const limited = enforceRateLimit(request, "wholesale-rfq", 20, 60 * 60 * 1000);
  if (limited) return limited;

  if (!hasDatabase) return NextResponse.json({ error: DB_REQUIRED }, { status: 503 });

  const ctx = await getWholesalerUser();
  if (!ctx) return NextResponse.json({ error: "Approved wholesalers only." }, { status: 403 });

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const qty = Number(body?.requestedQty);
  if (!Number.isInteger(qty) || qty < 1) {
    return NextResponse.json({ error: "Enter a valid quantity." }, { status: 400 });
  }
  const product = await getProductBySlug(String(body?.productSlug || ""));
  if (!product) {
    return NextResponse.json({ error: "Product not found." }, { status: 404 });
  }
  const vendorSlug = product.vendorSlug ?? "";
  if (!vendorSlug) {
    return NextResponse.json(
      { error: "Quotes are only available for vendor-sold products." },
      { status: 400 }
    );
  }

  const proposedPrice = Number(body?.proposedPrice);
  const rfq = await createRfq({
    wholesalerId: ctx.profile.id,
    userId: ctx.user.id,
    businessName: ctx.profile.businessName,
    vendorSlug,
    productSlug: product.slug,
    productName: product.name,
    requestedQty: qty,
    proposedPrice: Number.isFinite(proposedPrice) && proposedPrice > 0 ? proposedPrice : 0,
    notes: typeof body?.notes === "string" ? body.notes.slice(0, 500) : "",
  });

  const vendor = await getVendorBySlug(vendorSlug);
  if (vendor?.ownerUserId) {
    await notify({
      userId: vendor.ownerUserId,
      type: "rfq_new",
      title: "New quote request",
      body: `${ctx.profile.businessName} requested a quote for ${qty} × ${product.name}.`,
      meta: { rfqId: rfq.id },
    });
  }

  return NextResponse.json({ rfq }, { status: 201 });
}
