import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/auth";
import { getAllReviews } from "@/lib/reviews";

/** Every review across all products, for the admin moderation queue. */
export async function GET() {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  const reviews = await getAllReviews();
  return NextResponse.json({ reviews });
}
