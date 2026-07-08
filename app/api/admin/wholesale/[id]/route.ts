import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/auth";
import { setWholesaleStatus } from "@/lib/users";
import type { WholesaleStatus } from "@/lib/types";

// An admin may only move an application to a decided state (or reset it).
const ALLOWED: WholesaleStatus[] = ["approved", "rejected", "none"];

/** Admin: approve / reject (or reset) a user's wholesale application. */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  const { id } = await params;
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const status = body?.status as WholesaleStatus;
  if (!ALLOWED.includes(status)) {
    return NextResponse.json({ error: "Invalid status." }, { status: 400 });
  }

  const user = await setWholesaleStatus(id, status);
  if (!user) {
    return NextResponse.json({ error: "Applicant not found." }, { status: 404 });
  }
  return NextResponse.json({
    applicant: {
      id: user.id,
      wholesaleStatus: user.wholesaleStatus,
      accountType: user.accountType,
    },
  });
}
