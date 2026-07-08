import "server-only";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { randomUUID } from "node:crypto";

/**
 * Real local-disk storage for wholesaler verification documents. Files are
 * written under WHOLESALE_UPLOAD_DIR (default `.uploads/wholesale`) with opaque
 * names; only metadata is stored in the profile. No cloud dependency, no fake
 * storage — a failed write throws loudly. (Local disk suits this self-hosted
 * app; a serverless deployment would swap in object storage here.)
 */

const ALLOWED_TYPES: Record<string, string> = {
  "application/pdf": "pdf",
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};
const MAX_BYTES = 8 * 1024 * 1024; // 8 MB

function uploadDir(): string {
  return resolve(
    process.cwd(),
    process.env.WHOLESALE_UPLOAD_DIR || ".uploads/wholesale"
  );
}

export interface SavedDocument {
  docType: string;
  originalName: string;
  storedName: string;
  mimeType: string;
  size: number;
  uploadedAt: string;
}

/** Persist an uploaded File to disk and return its metadata. Throws on bad input. */
export async function saveWholesaleDocument(
  file: File,
  docType: string
): Promise<SavedDocument> {
  if (!file || typeof file.arrayBuffer !== "function") {
    throw new Error("No file was provided.");
  }
  const mimeType = file.type || "application/octet-stream";
  const ext = ALLOWED_TYPES[mimeType];
  if (!ext) {
    throw new Error(
      "Unsupported file type. Upload a PDF or an image (PNG, JPG, or WebP)."
    );
  }
  if (file.size > MAX_BYTES) {
    throw new Error("File is too large (maximum 8 MB).");
  }
  const buf = Buffer.from(await file.arrayBuffer());
  if (buf.length === 0) throw new Error("The uploaded file is empty.");

  const dir = uploadDir();
  await mkdir(dir, { recursive: true });
  const storedName = `${randomUUID()}.${ext}`;
  await writeFile(join(dir, storedName), buf);

  return {
    docType,
    originalName: file.name || "document",
    storedName,
    mimeType,
    size: buf.length,
    uploadedAt: new Date().toISOString(),
  };
}

/** Read a stored document for admin review. Guards against path traversal. */
export async function readWholesaleDocument(storedName: string): Promise<Buffer> {
  if (!/^[A-Za-z0-9._-]+$/.test(storedName)) {
    throw new Error("Invalid document reference.");
  }
  return readFile(join(uploadDir(), storedName));
}
