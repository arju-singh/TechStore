import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { hasDatabase } from "@/lib/mongodb";
import {
  getWholesalerByUser,
  createWholesalerProfile,
} from "@/lib/wholesalers";
import { validateWholesalerApplication } from "@/lib/validation";
import { assertWholesaleEnabled } from "@/lib/wholesaleSettings";
import { notify, notifyAdmins } from "@/lib/notifications";
import { enforceRateLimit } from "@/lib/rateLimit";

const DB_REQUIRED = "Wholesale requires a database. Set MONGODB_URI.";

/**
 * Become a wholesaler: create a PENDING profile for the current user and notify
 * the applicant + admins. One profile per user. DB-only, fail-loud: rejects a
 * malformed GSTIN and a disabled module with specific errors.
 */
export async function POST(request: Request) {
  const limited = enforceRateLimit(request, "wholesaler-apply", 5, 60 * 60 * 1000);
  if (limited) return limited;

  if (!hasDatabase) {
    return NextResponse.json({ error: DB_REQUIRED }, { status: 503 });
  }

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Please log in." }, { status: 401 });
  }

  try {
    await assertWholesaleEnabled();
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Wholesale is unavailable." },
      { status: 403 }
    );
  }

  const existing = await getWholesalerByUser(user.id);
  if (existing) {
    return NextResponse.json(
      { error: "You already have a wholesaler application.", profile: existing },
      { status: 409 }
    );
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const result = validateWholesalerApplication(body);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const profile = await createWholesalerProfile({
    userId: user.id,
    ...result.application,
  });

  // Real notifications — persisted in-app (and emailed if a provider is set up).
  await notify({
    userId: user.id,
    email: profile.email,
    type: "wholesaler_application_submitted",
    title: "Wholesale application received",
    body: `Your application for ${profile.businessName} is under review. We'll notify you once it's decided.`,
    meta: { wholesalerId: profile.id },
  });
  await notifyAdmins({
    type: "wholesaler_application_new",
    title: "New wholesaler application",
    body: `${profile.businessName} (${profile.ownerName}) applied for a wholesale account.`,
    meta: { wholesalerId: profile.id },
  });

  return NextResponse.json({ profile }, { status: 201 });
}
