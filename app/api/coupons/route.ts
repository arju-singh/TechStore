import { NextResponse } from "next/server";
import { listActiveCoupons } from "@/lib/coupons";

// Public: list active coupons (code + description) to show as hints.
export async function GET() {
  const coupons = await listActiveCoupons();
  return NextResponse.json({
    coupons: coupons.map((c) => ({ code: c.code, description: c.description })),
  });
}
