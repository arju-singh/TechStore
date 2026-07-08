import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/auth";
import { getAllVendors } from "@/lib/vendors";

/** Admin: list every vendor (any status). */
export async function GET() {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  const vendors = await getAllVendors();
  return NextResponse.json({ vendors });
}
