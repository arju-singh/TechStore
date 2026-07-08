import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/auth";
import { hasDatabase } from "@/lib/mongodb";
import {
  getWholesalerById,
  updateWholesalerStatus,
  type WholesalerStatus,
} from "@/lib/wholesalers";
import { notify } from "@/lib/notifications";

const STATUSES: WholesalerStatus[] = [
  "pending",
  "approved",
  "rejected",
  "needs_docs",
  "suspended",
  "blacklisted",
];

const TITLES: Record<WholesalerStatus, string> = {
  pending: "Wholesale application updated",
  approved: "Wholesale account approved",
  rejected: "Wholesale application rejected",
  needs_docs: "More documents needed",
  suspended: "Wholesale account suspended",
  blacklisted: "Wholesale access blocked",
};

/**
 * Admin: decide a wholesaler's status (approve / reject / needs-docs / suspend /
 * blacklist). Sends a real notification to the applicant on every decision.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  if (!hasDatabase) {
    return NextResponse.json(
      { error: "Wholesale requires a database. Set MONGODB_URI." },
      { status: 503 }
    );
  }

  const { id } = await params;
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const status = body?.status as WholesalerStatus;
  if (!STATUSES.includes(status)) {
    return NextResponse.json({ error: "Invalid status." }, { status: 400 });
  }
  const reason = typeof body?.reason === "string" ? body.reason.slice(0, 500) : "";
  if ((status === "rejected" || status === "needs_docs") && reason.trim().length < 3) {
    return NextResponse.json(
      { error: "Please provide a reason for this decision." },
      { status: 400 }
    );
  }

  const existing = await getWholesalerById(id);
  if (!existing) {
    return NextResponse.json({ error: "Wholesaler not found." }, { status: 404 });
  }

  const profile = await updateWholesalerStatus(id, {
    status,
    approvedBy: admin.email,
    rejectionReason: reason,
  });
  if (!profile) {
    return NextResponse.json({ error: "Wholesaler not found." }, { status: 404 });
  }

  await notify({
    userId: profile.userId,
    email: profile.email,
    type: `wholesaler_${status}`,
    title: TITLES[status],
    body:
      reason ||
      `Your wholesale account status is now ${status.replace(/_/g, " ")}.`,
    meta: { wholesalerId: profile.id },
  });

  return NextResponse.json({ wholesaler: profile });
}
