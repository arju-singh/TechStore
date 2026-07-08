import { NextResponse } from "next/server";
import { getVendorUser } from "@/lib/auth";
import { hasDatabase } from "@/lib/mongodb";
import { getRfqById, respondToRfq, type RfqResponse } from "@/lib/rfqs";
import { notify } from "@/lib/notifications";

const DB_REQUIRED = "Wholesale requires a database. Set MONGODB_URI.";

/**
 * Vendor: respond to an RFQ on one of their products — accept the buyer's
 * proposed price, reject, or counter with a price. Scoped to the vendor's own
 * RFQs. Notifies the wholesaler with the outcome.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await getVendorUser();
  if (!ctx) return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  if (!hasDatabase) return NextResponse.json({ error: DB_REQUIRED }, { status: 503 });

  const { id } = await params;
  const rfq = await getRfqById(id);
  // Don't distinguish "not found" from "not yours" — no probing.
  if (!rfq || rfq.vendorSlug !== ctx.vendor.slug) {
    return NextResponse.json({ error: "RFQ not found." }, { status: 404 });
  }
  if (rfq.status === "accepted" || rfq.status === "rejected") {
    return NextResponse.json(
      { error: "This RFQ has already been resolved." },
      { status: 409 }
    );
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const action = body?.action;
  const note = typeof body?.note === "string" ? body.note.slice(0, 500) : "";

  let response: RfqResponse;
  let title: string;
  if (action === "accept") {
    if (!(rfq.proposedPrice > 0)) {
      return NextResponse.json(
        { error: "No proposed price to accept — send a counter offer instead." },
        { status: 400 }
      );
    }
    response = { status: "accepted", agreedPrice: rfq.proposedPrice, vendorNote: note };
    title = "Your quote request was accepted";
  } else if (action === "reject") {
    response = { status: "rejected", vendorNote: note };
    title = "Your quote request was declined";
  } else if (action === "counter") {
    const counterPrice = Number(body?.counterPrice);
    if (!Number.isFinite(counterPrice) || counterPrice <= 0) {
      return NextResponse.json(
        { error: "Enter a valid counter price." },
        { status: 400 }
      );
    }
    response = { status: "countered", vendorCounterPrice: counterPrice, vendorNote: note };
    title = "You received a counter offer";
  } else {
    return NextResponse.json({ error: "Invalid action." }, { status: 400 });
  }

  const updated = await respondToRfq(id, response);
  if (!updated) {
    return NextResponse.json({ error: "RFQ not found." }, { status: 404 });
  }

  await notify({
    userId: rfq.userId,
    type: `rfq_${updated.status}`,
    title,
    body:
      updated.status === "countered"
        ? `${ctx.vendor.name} countered at ₹${updated.vendorCounterPrice}/unit for ${rfq.productName}.${note ? ` Note: ${note}` : ""}`
        : `${ctx.vendor.name} ${updated.status} your quote for ${rfq.productName}.${note ? ` Note: ${note}` : ""}`,
    meta: { rfqId: updated.id },
  });

  return NextResponse.json({ rfq: updated });
}
