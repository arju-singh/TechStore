import { NextResponse } from "next/server";
import { getWholesalerUser } from "@/lib/auth";
import { hasDatabase } from "@/lib/mongodb";
import { createTemplate, listTemplates } from "@/lib/orderTemplates";

const DB_REQUIRED = "Wholesale requires a database. Set MONGODB_URI.";

export async function GET() {
  if (!hasDatabase) return NextResponse.json({ error: DB_REQUIRED }, { status: 503 });
  const ctx = await getWholesalerUser();
  if (!ctx) return NextResponse.json({ error: "Approved wholesalers only." }, { status: 403 });
  const templates = await listTemplates(ctx.profile.id);
  return NextResponse.json({ templates });
}

export async function POST(request: Request) {
  if (!hasDatabase) return NextResponse.json({ error: DB_REQUIRED }, { status: 503 });
  const ctx = await getWholesalerUser();
  if (!ctx) return NextResponse.json({ error: "Approved wholesalers only." }, { status: 403 });

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const name = typeof body?.name === "string" ? body.name.trim().slice(0, 80) : "";
  if (name.length < 1) {
    return NextResponse.json({ error: "Give the template a name." }, { status: 400 });
  }
  const rawLines = Array.isArray(body?.lines) ? body.lines : [];
  const lines = rawLines
    .map((l: any) => ({ slug: String(l?.slug || ""), qty: Number(l?.qty) }))
    .filter((l: any) => l.slug && Number.isInteger(l.qty) && l.qty > 0);
  if (lines.length === 0) {
    return NextResponse.json({ error: "The template has no valid items." }, { status: 400 });
  }

  const template = await createTemplate(ctx.profile.id, name, lines);
  return NextResponse.json({ template }, { status: 201 });
}
