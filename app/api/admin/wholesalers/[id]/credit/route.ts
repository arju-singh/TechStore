import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/auth";
import { hasDatabase } from "@/lib/mongodb";
import { getWholesalerById } from "@/lib/wholesalers";
import { getCreditTerms, setCreditTerms } from "@/lib/creditTerms";
import { notify } from "@/lib/notifications";
import { formatINR } from "@/lib/format";

const DB_REQUIRED = "Wholesale requires a database. Set MONGODB_URI.";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  if (!hasDatabase) return NextResponse.json({ error: DB_REQUIRED }, { status: 503 });
  const { id } = await params;
  const terms = await getCreditTerms(id);
  return NextResponse.json({ terms });
}

/** Admin: set a wholesaler's credit limit + terms. */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  if (!hasDatabase) return NextResponse.json({ error: DB_REQUIRED }, { status: 503 });

  const { id } = await params;
  const profile = await getWholesalerById(id);
  if (!profile) return NextResponse.json({ error: "Wholesaler not found." }, { status: 404 });

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const creditLimit = Number(body?.creditLimit);
  const termsDays = Number(body?.termsDays);
  if (!Number.isFinite(creditLimit) || creditLimit < 0) {
    return NextResponse.json({ error: "Credit limit must be 0 or more." }, { status: 400 });
  }
  if (!Number.isInteger(termsDays) || termsDays < 0 || termsDays > 180) {
    return NextResponse.json(
      { error: "Terms days must be a whole number between 0 and 180." },
      { status: 400 }
    );
  }

  const terms = await setCreditTerms(id, creditLimit, termsDays);
  await notify({
    userId: profile.userId,
    email: profile.email,
    type: "wholesale_credit_updated",
    title: "Credit line updated",
    body: `Your credit line is now ${formatINR(terms.creditLimit)} on Net-${terms.termsDays} terms.`,
    meta: { wholesalerId: profile.id },
  });
  return NextResponse.json({ terms });
}
