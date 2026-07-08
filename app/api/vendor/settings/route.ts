import { NextResponse } from "next/server";
import { getVendorUser } from "@/lib/auth";
import { updateVendor } from "@/lib/vendors";

/**
 * Vendor: update this store's own profile. The slug, status, owner and
 * commission are NOT editable here — those are identity / admin-governed fields.
 */
export async function PATCH(request: Request) {
  const ctx = await getVendorUser();
  if (!ctx) return NextResponse.json({ error: "Forbidden." }, { status: 403 });

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
      { error: "Store name must be at least 2 characters." },
      { status: 400 }
    );
  }

  const vendor = await updateVendor(ctx.vendor.id, {
    name,
    email: s(body?.email),
    phone: s(body?.phone),
    description: s(body?.description),
    logo: s(body?.logo),
    gstin: s(body?.gstin),
    policies: s(body?.policies),
    address: {
      line1: s(body?.address?.line1),
      line2: s(body?.address?.line2),
      city: s(body?.address?.city),
      state: s(body?.address?.state),
      pincode: s(body?.address?.pincode),
    },
  });
  if (!vendor) {
    return NextResponse.json({ error: "Store not found." }, { status: 404 });
  }
  return NextResponse.json({ vendor });
}
