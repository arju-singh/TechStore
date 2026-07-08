import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getVendorByOwner, createVendor } from "@/lib/vendors";
import { enforceRateLimit } from "@/lib/rateLimit";

/**
 * Become a seller: create a pending vendor owned by the current user. One vendor
 * per user — a second application is rejected. An admin approves it later via
 * the admin Stores section before the store goes live.
 */
export async function POST(request: Request) {
  const limited = enforceRateLimit(request, "vendor-apply", 5, 60 * 60 * 1000);
  if (limited) return limited;

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Please log in." }, { status: 401 });
  }

  // One store per account.
  const existing = await getVendorByOwner(user.id);
  if (existing) {
    return NextResponse.json(
      { error: "You already have a store.", vendor: existing },
      { status: 409 }
    );
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const s = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  const name = s(body?.name);
  if (name.length < 2) {
    return NextResponse.json(
      { error: "Please enter a store name (at least 2 characters)." },
      { status: 400 }
    );
  }

  const vendor = await createVendor(
    {
      name,
      ownerUserId: user.id,
      email: s(body?.email) || user.email,
      phone: s(body?.phone),
      description: s(body?.description),
      gstin: s(body?.gstin),
      policies: s(body?.policies),
      address: {
        line1: s(body?.address?.line1),
        line2: s(body?.address?.line2),
        city: s(body?.address?.city),
        state: s(body?.address?.state),
        pincode: s(body?.address?.pincode),
      },
    },
    new Date().toISOString()
  );

  return NextResponse.json({ vendor }, { status: 201 });
}
