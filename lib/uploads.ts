import "server-only";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { randomUUID } from "node:crypto";
import {
  cloudinaryConfigured,
  uploadBuffer,
  fetchAuthenticatedAsset,
} from "@/lib/cloudinary";

/**
 * Storage for wholesaler verification (KYC) documents.
 *
 * Dual-path: when Cloudinary is configured, files are uploaded as PRIVATE
 * (authenticated) assets — required for a serverless deploy (Vercel's filesystem
 * is ephemeral) and correct for sensitive KYC docs. Otherwise they fall back to
 * local disk under WHOLESALE_UPLOAD_DIR, so the app still runs with no cloud
 * dependency in local dev. Only metadata is ever stored in the profile.
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
  /** Disk filename, or the Cloudinary public id. */
  storedName: string;
  mimeType: string;
  size: number;
  uploadedAt: string;
  /** Where the bytes live. Absent on legacy records → treated as "disk". */
  storage?: "disk" | "cloudinary";
  /** Cloudinary resource type ("image" | "raw"), when storage is cloudinary. */
  resourceType?: string;
  /** Cloudinary format (extension), when storage is cloudinary. */
  format?: string;
}

/**
 * Validate + persist an uploaded File (to Cloudinary if configured, else disk)
 * and return its metadata. Throws on bad input.
 */
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

  const base = {
    docType,
    originalName: file.name || "document",
    mimeType,
    size: buf.length,
    uploadedAt: new Date().toISOString(),
  };

  if (cloudinaryConfigured) {
    const resourceType = mimeType === "application/pdf" ? "raw" : "image";
    const up = await uploadBuffer(buf, mimeType, {
      subfolder: "wholesale-docs",
      resourceType,
    });
    return {
      ...base,
      storage: "cloudinary",
      storedName: up.publicId,
      resourceType: up.resourceType,
      format: up.format || ext,
    };
  }

  const dir = uploadDir();
  await mkdir(dir, { recursive: true });
  const storedName = `${randomUUID()}.${ext}`;
  await writeFile(join(dir, storedName), buf);
  return { ...base, storage: "disk", storedName };
}

/**
 * Read a stored document (bytes) for admin review — from Cloudinary via a signed
 * server-side fetch, or from local disk. Legacy records without a `storage` flag
 * are read from disk. Guards against path traversal on the disk path.
 */
export async function readWholesaleDocument(
  doc: Pick<SavedDocument, "storedName" | "storage" | "resourceType" | "format">
): Promise<Buffer> {
  if (doc.storage === "cloudinary") {
    return fetchAuthenticatedAsset(
      doc.storedName,
      doc.resourceType === "raw" ? "raw" : "image",
      doc.format
    );
  }
  if (!/^[A-Za-z0-9._-]+$/.test(doc.storedName)) {
    throw new Error("Invalid document reference.");
  }
  return readFile(join(uploadDir(), doc.storedName));
}
