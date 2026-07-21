import { NextResponse } from "next/server";
import { getCurrentUser, getVendorUser } from "@/lib/auth";
import { createUploadSignature, cloudinaryConfigured } from "@/lib/cloudinary";
import { enforceRateLimit } from "@/lib/rateLimit";

/**
 * Issues a short-lived Cloudinary upload signature so the browser can upload a
 * file DIRECTLY to Cloudinary (bypassing our serverless function's body-size
 * limit). Only admins and approved vendors may upload, and the destination
 * folder is derived from their role server-side — a client can't pick where the
 * file lands. The API secret never leaves the server.
 */
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  }

  // Role → allowed upload folder.
  let subfolder: string | null = null;
  if (user.role === "admin") {
    subfolder = "products";
  } else {
    const vendor = await getVendorUser();
    if (vendor) subfolder = `vendors/${vendor.vendor.slug}`;
  }
  if (!subfolder) {
    return NextResponse.json(
      { error: "Only admins and approved vendors can upload media." },
      { status: 403 }
    );
  }

  if (!cloudinaryConfigured) {
    return NextResponse.json(
      { error: "Image uploads aren't configured yet." },
      { status: 503 }
    );
  }

  const limited = enforceRateLimit(request, "upload-sign", 30, 60_000);
  if (limited) return limited;

  const signature = createUploadSignature(subfolder);
  return NextResponse.json(signature);
}
