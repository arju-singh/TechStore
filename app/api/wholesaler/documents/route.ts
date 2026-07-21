import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { hasDatabase } from "@/lib/mongodb";
import {
  getWholesalerByUser,
  addWholesalerDocument,
} from "@/lib/wholesalers";
import { saveWholesaleDocument } from "@/lib/uploads";
import { enforceRateLimit } from "@/lib/rateLimit";

const DB_REQUIRED = "Wholesale requires a database. Set MONGODB_URI.";
const DOC_TYPES = new Set([
  "gst_certificate",
  "business_license",
  "id_proof",
  "store_photo",
  "warehouse_photo",
  "other",
]);

/**
 * Upload a real verification document (multipart/form-data). The file is stored
 * via lib/uploads (Cloudinary private assets in production, local disk in dev)
 * and its metadata appended to the caller's profile. The applicant must already
 * have a profile.
 */
export async function POST(request: Request) {
  const limited = enforceRateLimit(request, "wholesaler-docs", 30, 60 * 60 * 1000);
  if (limited) return limited;

  if (!hasDatabase) {
    return NextResponse.json({ error: DB_REQUIRED }, { status: 503 });
  }

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Please log in." }, { status: 401 });
  }

  const profile = await getWholesalerByUser(user.id);
  if (!profile) {
    return NextResponse.json(
      { error: "Submit your wholesale application before uploading documents." },
      { status: 404 }
    );
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Expected a multipart form upload." },
      { status: 400 }
    );
  }

  const file = form.get("file");
  const docTypeRaw = String(form.get("docType") || "other");
  const docType = DOC_TYPES.has(docTypeRaw) ? docTypeRaw : "other";
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file was provided." }, { status: 400 });
  }

  let saved;
  try {
    saved = await saveWholesaleDocument(file, docType);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Upload failed." },
      { status: 400 }
    );
  }

  const updated = await addWholesalerDocument(profile.id, saved);
  return NextResponse.json({ document: saved, profile: updated }, { status: 201 });
}
