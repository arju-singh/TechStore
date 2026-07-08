"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * Become-a-seller application. Creates a pending store owned by the current
 * user; an admin approves it before it goes live. Only the store name is
 * required — everything else can be filled in later from Settings.
 */
export default function VendorApplyForm({
  defaultEmail,
}: {
  defaultEmail: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: defaultEmail,
    phone: "",
    description: "",
    gstin: "",
    line1: "",
    city: "",
    state: "",
    pincode: "",
    policies: "",
  });

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const res = await fetch("/api/vendor/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          phone: form.phone,
          description: form.description,
          gstin: form.gstin,
          policies: form.policies,
          address: {
            line1: form.line1,
            city: form.city,
            state: form.state,
            pincode: form.pincode,
          },
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Could not submit application.");
      router.push("/vendor");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit application.");
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      {error && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <Field label="Store name" required>
        <input
          value={form.name}
          onChange={(e) => set("name", e.target.value)}
          required
          placeholder="e.g. Gadget Galaxy"
          className={inputClass}
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Contact email">
          <input value={form.email} onChange={(e) => set("email", e.target.value)} className={inputClass} />
        </Field>
        <Field label="Phone">
          <input value={form.phone} onChange={(e) => set("phone", e.target.value)} className={inputClass} />
        </Field>
      </div>

      <Field label="What do you sell?">
        <textarea
          value={form.description}
          onChange={(e) => set("description", e.target.value)}
          rows={3}
          placeholder="A short description of your store, shown on your storefront."
          className={inputClass}
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="GSTIN (optional)">
          <input value={form.gstin} onChange={(e) => set("gstin", e.target.value)} className={inputClass} />
        </Field>
        <Field label="Pickup pincode">
          <input value={form.pincode} onChange={(e) => set("pincode", e.target.value)} className={inputClass} />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Pickup address">
          <input value={form.line1} onChange={(e) => set("line1", e.target.value)} className={inputClass} />
        </Field>
        <Field label="City">
          <input value={form.city} onChange={(e) => set("city", e.target.value)} className={inputClass} />
        </Field>
        <Field label="State">
          <input value={form.state} onChange={(e) => set("state", e.target.value)} className={inputClass} />
        </Field>
      </div>

      <button
        type="submit"
        disabled={saving}
        className="rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
      >
        {saving ? "Submitting…" : "Submit application"}
      </button>
    </form>
  );
}

const inputClass =
  "w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm outline-none focus:border-brand-400 focus:bg-white/[0.02] focus:ring-2 focus:ring-brand-100";

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-white/70">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </span>
      {children}
    </label>
  );
}
