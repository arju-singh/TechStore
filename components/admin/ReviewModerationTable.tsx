"use client";

import { useState } from "react";
import Link from "next/link";
import Stars from "@/components/Stars";
import type { Review } from "@/lib/reviewShared";

export default function ReviewModerationTable({
  initialReviews,
}: {
  initialReviews: Review[];
}) {
  const [reviews, setReviews] = useState<Review[]>(initialReviews);
  const [busy, setBusy] = useState<string | null>(null);

  async function setStatus(id: string, status: "published" | "hidden") {
    setBusy(id);
    try {
      const res = await fetch(`/api/admin/reviews/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        setReviews((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
      }
    } finally {
      setBusy(null);
    }
  }

  async function remove(id: string) {
    setBusy(id);
    try {
      const res = await fetch(`/api/admin/reviews/${id}`, { method: "DELETE" });
      if (res.ok) setReviews((prev) => prev.filter((r) => r.id !== id));
    } finally {
      setBusy(null);
    }
  }

  if (reviews.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-white/10 p-10 text-center text-sm text-white/50">
        No reviews yet.
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {reviews.map((r) => (
        <li
          key={r.id}
          className={`rounded-2xl border p-4 ${
            r.status === "hidden"
              ? "border-white/5 bg-white/[0.01] opacity-70"
              : "border-white/10 bg-white/[0.02]"
          }`}
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Stars rating={r.rating} />
                <span className="text-sm font-semibold text-white">{r.userName}</span>
                {r.verifiedPurchase && (
                  <span className="rounded-full bg-brand-400/10 px-2 py-0.5 text-[11px] font-medium text-brand-300">
                    Verified
                  </span>
                )}
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                    r.status === "published"
                      ? "bg-green-500/10 text-green-400"
                      : "bg-white/10 text-white/50"
                  }`}
                >
                  {r.status}
                </span>
              </div>
              <Link
                href={`/product/${r.productSlug}`}
                className="mt-1 block text-xs text-brand-400 hover:underline"
              >
                {r.productSlug}
              </Link>
              {r.title && <p className="mt-1 text-sm font-semibold text-white/90">{r.title}</p>}
              <p className="mt-1 text-sm text-white/60">{r.body}</p>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              {r.status === "published" ? (
                <button
                  onClick={() => setStatus(r.id, "hidden")}
                  disabled={busy === r.id}
                  className="rounded-lg border border-white/15 px-3 py-1.5 text-xs font-medium text-white/70 transition hover:bg-white/10 disabled:opacity-50"
                >
                  Hide
                </button>
              ) : (
                <button
                  onClick={() => setStatus(r.id, "published")}
                  disabled={busy === r.id}
                  className="rounded-lg border border-green-500/30 px-3 py-1.5 text-xs font-medium text-green-400 transition hover:bg-green-500/10 disabled:opacity-50"
                >
                  Publish
                </button>
              )}
              <button
                onClick={() => remove(r.id)}
                disabled={busy === r.id}
                className="rounded-lg border border-red-500/30 px-3 py-1.5 text-xs font-medium text-red-400 transition hover:bg-red-500/10 disabled:opacity-50"
              >
                Delete
              </button>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
