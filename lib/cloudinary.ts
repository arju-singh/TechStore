import "server-only";
import crypto from "node:crypto";

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "";
const API_KEY = process.env.CLOUDINARY_API_KEY || "";
const API_SECRET = process.env.CLOUDINARY_API_SECRET || "";

export const cloudinaryConfigured = Boolean(CLOUD_NAME && API_KEY && API_SECRET);

/** Root folder for all TechStore media in Cloudinary. */
export const CLOUDINARY_ROOT = "techstore";

export interface TransformOptions {
  width?: number;
  height?: number;
  crop?: "fill" | "fit" | "limit" | "scale" | "thumb";
  quality?: number | "auto";
  format?: "auto" | "webp" | "jpg" | "png";
}

/**
 * Cloudinary's upload signature: the signable params (everything except file,
 * api_key, cloud_name, resource_type) sorted alphabetically, joined as
 * `k=v&k2=v2`, with the API secret appended, then SHA-1 hex. Pure — the secret
 * is passed in so it's unit-testable with a known vector.
 */
export function cloudinarySignature(
  params: Record<string, string | number>,
  apiSecret: string
): string {
  const EXCLUDE = new Set(["file", "api_key", "cloud_name", "resource_type"]);
  const toSign = Object.keys(params)
    .filter((k) => !EXCLUDE.has(k) && params[k] !== "" && params[k] !== undefined)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join("&");
  return crypto.createHash("sha1").update(toSign + apiSecret).digest("hex");
}

/**
 * Build a Cloudinary transformation string. Defaults to `f_auto,q_auto`
 * (automatic format + quality) so every delivered image is optimized and
 * CDN-cached. Pure.
 */
export function buildTransform(opts: TransformOptions = {}): string {
  const t = [`f_${opts.format ?? "auto"}`, `q_${opts.quality ?? "auto"}`];
  if (opts.width) t.push(`w_${opts.width}`);
  if (opts.height) t.push(`h_${opts.height}`);
  if (opts.crop) t.push(`c_${opts.crop}`);
  return t.join(",");
}

/** Optimized CDN delivery URL for a stored asset (publicId). */
export function cloudinaryUrl(publicId: string, opts: TransformOptions = {}): string {
  return `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/${buildTransform(opts)}/${publicId}`;
}

/**
 * Params the browser needs for a SIGNED, direct-to-Cloudinary upload. The secret
 * never leaves the server; the client POSTs the file + these fields to
 * `https://api.cloudinary.com/v1_1/<cloud>/image/upload`. Folder is fixed
 * server-side so a client can't write outside the allowed tree.
 */
export function createUploadSignature(subfolder: string): {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  folder: string;
  signature: string;
} {
  if (!cloudinaryConfigured) throw new Error("Cloudinary is not configured.");
  const folder = `${CLOUDINARY_ROOT}/${subfolder}`.replace(/[^a-zA-Z0-9/_-]/g, "");
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = cloudinarySignature({ folder, timestamp }, API_SECRET);
  return { cloudName: CLOUD_NAME, apiKey: API_KEY, timestamp, folder, signature };
}

/**
 * Server-side upload of a remote image URL into Cloudinary (e.g. migrating the
 * seed catalog's dummyjson images). Returns the stored publicId + secure URL.
 */
export async function uploadRemoteImage(
  imageUrl: string,
  subfolder: string
): Promise<{ publicId: string; secureUrl: string }> {
  if (!cloudinaryConfigured) throw new Error("Cloudinary is not configured.");
  const folder = `${CLOUDINARY_ROOT}/${subfolder}`.replace(/[^a-zA-Z0-9/_-]/g, "");
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = cloudinarySignature({ folder, timestamp }, API_SECRET);

  const form = new URLSearchParams({
    file: imageUrl,
    api_key: API_KEY,
    timestamp: String(timestamp),
    folder,
    signature,
  });
  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
    { method: "POST", body: form }
  );
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((json as any)?.error?.message || `Cloudinary upload failed (${res.status})`);
  }
  return { publicId: (json as any).public_id, secureUrl: (json as any).secure_url };
}

/** Delete a stored asset by publicId (signed admin call). */
export async function deleteAsset(publicId: string): Promise<boolean> {
  if (!cloudinaryConfigured) throw new Error("Cloudinary is not configured.");
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = cloudinarySignature({ public_id: publicId, timestamp }, API_SECRET);
  const form = new URLSearchParams({
    public_id: publicId,
    api_key: API_KEY,
    timestamp: String(timestamp),
    signature,
  });
  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/destroy`,
    { method: "POST", body: form }
  );
  const json = await res.json().catch(() => ({}));
  return (json as any)?.result === "ok";
}
