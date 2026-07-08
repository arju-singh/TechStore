import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/auth";
import { listWholesaleApplicants } from "@/lib/users";

/** Admin: list all wholesale applications (pending / approved / rejected). */
export async function GET() {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  const applicants = await listWholesaleApplicants();
  return NextResponse.json({ applicants });
}
