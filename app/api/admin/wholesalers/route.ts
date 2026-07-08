import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/auth";
import { hasDatabase } from "@/lib/mongodb";
import {
  getAllWholesalers,
  getWholesalersByStatus,
  type WholesalerStatus,
} from "@/lib/wholesalers";

const STATUSES = [
  "pending",
  "approved",
  "rejected",
  "needs_docs",
  "suspended",
  "blacklisted",
];

/** Admin: list wholesalers, optionally filtered by ?status=. */
export async function GET(request: Request) {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  if (!hasDatabase) {
    return NextResponse.json(
      { error: "Wholesale requires a database. Set MONGODB_URI." },
      { status: 503 }
    );
  }
  const status = new URL(request.url).searchParams.get("status");
  const wholesalers =
    status && STATUSES.includes(status)
      ? await getWholesalersByStatus(status as WholesalerStatus)
      : await getAllWholesalers();
  return NextResponse.json({ wholesalers });
}
