"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/lib/authClient";

const STATUS_COPY: Record<string, { title: string; body: string; tone: string }> = {
  pending: {
    title: "Application under review",
    body: "Thanks! Our team is reviewing your wholesale application. You'll get access to wholesale pricing as soon as it's approved.",
    tone: "bg-amber-50 text-amber-800 border-amber-200",
  },
  approved: {
    title: "You're an approved wholesaler",
    body: "Wholesale prices and minimum order quantities are now unlocked across the catalog. Look for the wholesale badge on eligible products.",
    tone: "bg-emerald-50 text-emerald-800 border-emerald-200",
  },
  rejected: {
    title: "Application not approved",
    body: "Your previous application wasn't approved. You can update your details and re-apply below.",
    tone: "bg-red-50 text-red-700 border-red-200",
  },
};

export default function WholesaleApplyForm() {
  const router = useRouter();
  const { user, loading } = useAuth();

  const [companyName, setCompanyName] = useState("");
  const [gstin, setGstin] = useState("");
  const [businessPhone, setBusinessPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  if (loading) {
    return <div className="py-16 text-center text-sm text-slate-500">Loading…</div>;
  }

  if (!user) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Log in to apply</h2>
        <p className="mt-1 text-sm text-slate-500">
          You need a TechStore account to apply for wholesale pricing.
        </p>
        <div className="mt-5 flex justify-center gap-3">
          <Link
            href="/login?redirect=/business"
            className="rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800"
          >
            Log in
          </Link>
          <Link
            href="/signup?redirect=/business"
            className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Create account
          </Link>
        </div>
      </div>
    );
  }

  const status = done ? "pending" : user.wholesaleStatus;
  const showForm = status === "none" || status === "rejected";
  const banner = status !== "none" ? STATUS_COPY[status] : null;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/wholesale/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyName, gstin, businessPhone }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Could not submit your application.");
      setDone(true);
      router.refresh(); // pick up the new pending status
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      {banner && (
        <div className={`rounded-xl border px-4 py-3 text-sm ${banner.tone}`}>
          <p className="font-semibold">{banner.title}</p>
          <p className="mt-0.5">{banner.body}</p>
        </div>
      )}

      {showForm && (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Business details</h2>
          <p className="mt-1 text-sm text-slate-500">
            Tell us about your business. Approval unlocks wholesale pricing and bulk
            minimums across eligible products.
          </p>

          {error && (
            <div className="mt-5 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <Field
              label="Business / company name"
              value={companyName}
              onChange={setCompanyName}
              placeholder="Sharma Electronics Pvt Ltd"
              autoComplete="organization"
            />
            <Field
              label="Business phone"
              value={businessPhone}
              onChange={setBusinessPhone}
              placeholder="10-digit mobile"
              autoComplete="tel"
            />
            <Field
              label="GSTIN (optional)"
              value={gstin}
              onChange={setGstin}
              placeholder="e.g. 22AAAAA0000A1Z5"
              required={false}
            />
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:opacity-60"
            >
              {submitting ? "Submitting…" : "Submit application"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  autoComplete,
  required = true,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoComplete?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        autoComplete={autoComplete}
        placeholder={placeholder}
        className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
      />
    </label>
  );
}
