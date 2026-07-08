import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/auth";
import {
  getVendorById,
  updateVendorStatus,
  setCommissionRate,
} from "@/lib/vendors";
import type { Vendor, VendorStatus } from "@/lib/types";

const STATUSES: VendorStatus[] = ["pending", "approved", "suspended", "rejected"];

/**
 * Admin: govern a vendor — change its lifecycle status and/or its commission
 * override. Body may carry `status`, `commissionRate` (a number, or null to
 * clear the override and fall back to the platform default), or both.
 */
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

  const hasStatus = body?.status !== undefined;
  const hasCommission = body?.commissionRate !== undefined;
  if (!hasStatus && !hasCommission) {
    return NextResponse.json(
      { error: "Nothing to update." },
      { status: 400 }
    );
  }

  let vendor: Vendor | null = null;

  if (hasStatus) {
    const status = body.status as VendorStatus;
    if (!STATUSES.includes(status)) {
      return NextResponse.json({ error: "Invalid status." }, { status: 400 });
    }
    vendor = await updateVendorStatus(id, status);
    if (!vendor) {
      return NextResponse.json({ error: "Vendor not found." }, { status: 404 });
    }
  }

  if (hasCommission) {
    const raw = body.commissionRate;
    let rate: number | null;
    if (raw === null || raw === "") {
      rate = null; // clear override → platform default
    } else {
      rate = Number(raw);
      if (!Number.isFinite(rate) || rate < 0 || rate > 100) {
        return NextResponse.json(
          { error: "Commission rate must be between 0 and 100." },
          { status: 400 }
        );
      }
    }
    vendor = await setCommissionRate(id, rate);
    if (!vendor) {
      return NextResponse.json({ error: "Vendor not found." }, { status: 404 });
    }
  }

  return NextResponse.json({ vendor: vendor ?? (await getVendorById(id)) });
}
