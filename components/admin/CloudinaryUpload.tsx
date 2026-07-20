"use client";

import { useRef, useState } from "react";

/**
 * Uploads an image straight to Cloudinary from the browser: it asks our server
 * for a short-lived signature (POST /api/uploads/sign), then POSTs the file
 * directly to Cloudinary (never through our serverless function, so large images
 * don't hit the body-size limit). Calls `onUploaded` with the secure CDN URL.
 * Degrades gracefully when Cloudinary isn't configured (503).
 */
export default function CloudinaryUpload({
  onUploaded,
  className = "",
}: {
  onUploaded: (url: string) => void;
  className?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<"idle" | "signing" | "uploading" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setError(null);
    setStatus("signing");
    try {
      const sigRes = await fetch("/api/uploads/sign", { method: "POST" });
      const sig = await sigRes.json().catch(() => ({}));
      if (!sigRes.ok) throw new Error(sig?.error || "Couldn't start the upload.");

      setStatus("uploading");
      const fd = new FormData();
      fd.append("file", file);
      fd.append("api_key", sig.apiKey);
      fd.append("timestamp", String(sig.timestamp));
      fd.append("folder", sig.folder);
      fd.append("signature", sig.signature);

      const upRes = await fetch(
        `https://api.cloudinary.com/v1_1/${sig.cloudName}/image/upload`,
        { method: "POST", body: fd }
      );
      const up = await upRes.json().catch(() => ({}));
      if (!upRes.ok || !up.secure_url) {
        throw new Error(up?.error?.message || "Upload failed.");
      }
      onUploaded(up.secure_url as string);
      setStatus("idle");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
      setStatus("error");
    }
  }

  const busy = status === "signing" || status === "uploading";

  return (
    <div className={className}>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
          e.target.value = ""; // allow re-selecting the same file
        }}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        className="inline-flex items-center gap-2 rounded-lg border border-white/15 px-3 py-2 text-sm font-medium text-white/80 transition hover:bg-white/5 disabled:opacity-60"
      >
        <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth={1.8}>
          <path d="M12 16V4m0 0 4 4m-4-4-4 4M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {status === "signing" ? "Preparing…" : status === "uploading" ? "Uploading…" : "Upload image"}
      </button>
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </div>
  );
}
