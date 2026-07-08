import { NextResponse } from "next/server";
import { getWholesalerUser } from "@/lib/auth";
import { hasDatabase } from "@/lib/mongodb";
import { deleteTemplate } from "@/lib/orderTemplates";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!hasDatabase) {
    return NextResponse.json(
      { error: "Wholesale requires a database. Set MONGODB_URI." },
      { status: 503 }
    );
  }
  const ctx = await getWholesalerUser();
  if (!ctx) return NextResponse.json({ error: "Approved wholesalers only." }, { status: 403 });
  const { id } = await params;
  const ok = await deleteTemplate(id, ctx.profile.id);
  if (!ok) return NextResponse.json({ error: "Template not found." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
