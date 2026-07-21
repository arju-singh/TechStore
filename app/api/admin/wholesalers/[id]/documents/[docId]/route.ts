import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/auth";
import { hasDatabase } from "@/lib/mongodb";
import { getWholesalerById } from "@/lib/wholesalers";
import { readWholesaleDocument } from "@/lib/uploads";

/** Admin-only: stream a wholesaler's uploaded verification document for review. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; docId: string }> }
) {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  if (!hasDatabase) {
    return NextResponse.json(
      { error: "Wholesale requires a database. Set MONGODB_URI." },
      { status: 503 }
    );
  }

  const { id, docId } = await params;
  const profile = await getWholesalerById(id);
  if (!profile) {
    return NextResponse.json({ error: "Wholesaler not found." }, { status: 404 });
  }
  const doc = profile.documents.find((d) => d.id === docId);
  if (!doc) {
    return NextResponse.json({ error: "Document not found." }, { status: 404 });
  }

  let buf: Buffer;
  try {
    buf = await readWholesaleDocument(doc);
  } catch {
    return NextResponse.json(
      { error: "The stored file could not be read." },
      { status: 404 }
    );
  }

  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type": doc.mimeType,
      "Content-Disposition": `inline; filename="${doc.originalName.replace(/"/g, "")}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
