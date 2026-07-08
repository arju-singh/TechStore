import { NextResponse } from "next/server";
import { checkPincode } from "@/lib/delivery";

// Public serviceability lookup: GET /api/delivery?pincode=560001
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const pincode = searchParams.get("pincode") ?? "";
  const estimate = checkPincode(pincode);
  const status = estimate.serviceable ? 200 : 400;
  return NextResponse.json(estimate, { status });
}
