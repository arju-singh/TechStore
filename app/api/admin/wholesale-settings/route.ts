import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/auth";
import { hasDatabase } from "@/lib/mongodb";
import {
  getWholesaleSettings,
  updateWholesaleSettings,
} from "@/lib/wholesaleSettings";

const DB_REQUIRED = "Wholesale requires a database. Set MONGODB_URI.";

export async function GET() {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  if (!hasDatabase) return NextResponse.json({ error: DB_REQUIRED }, { status: 503 });
  const settings = await getWholesaleSettings();
  return NextResponse.json({ settings });
}

export async function PUT(request: Request) {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  if (!hasDatabase) return NextResponse.json({ error: DB_REQUIRED }, { status: 503 });

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const patch: Record<string, unknown> = {};
  if (typeof body?.moduleEnabled === "boolean") patch.moduleEnabled = body.moduleEnabled;
  if (body?.maxDiscountPercent !== undefined) {
    const n = Number(body.maxDiscountPercent);
    if (!Number.isFinite(n) || n < 0 || n > 100) {
      return NextResponse.json(
        { error: "Max discount must be between 0 and 100." },
        { status: 400 }
      );
    }
    patch.maxDiscountPercent = n;
  }
  if (body?.wholesaleCommissionPercent !== undefined) {
    const n = Number(body.wholesaleCommissionPercent);
    if (!Number.isFinite(n) || n < 0 || n > 100) {
      return NextResponse.json(
        { error: "Commission must be between 0 and 100." },
        { status: 400 }
      );
    }
    patch.wholesaleCommissionPercent = n;
  }
  if (body?.defaultCreditDays !== undefined) {
    const n = Number(body.defaultCreditDays);
    if (!Number.isInteger(n) || n < 0 || n > 180) {
      return NextResponse.json(
        { error: "Default credit days must be a whole number between 0 and 180." },
        { status: 400 }
      );
    }
    patch.defaultCreditDays = n;
  }

  const settings = await updateWholesaleSettings(patch);
  return NextResponse.json({ settings });
}
