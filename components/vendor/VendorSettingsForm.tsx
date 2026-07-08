"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Vendor } from "@/lib/types";

/** Edit the store's own profile (everything except slug / status / commission). */
export default function VendorSettingsForm({ vendor }: { vendor: Vendor }) {
  const router = useRouter();
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: vendor.name,
    email: vendor.email,
    phone: vendor.phone,
    description: vendor.description,
    logo: vendor.logo,
    gstin: vendor.gstin,
    policies: vendor.policies,
    line1: vendor.address.line1,
    line2: vendor.address.line2,
    city: vendor.address.city,
    state: vendor.address.state,
    pincode: vendor.address.pincode,
  });

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMsg(null);
    setSaving(true);
    try {
      const res = await fetch("/api/vendor/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          phone: form.phone,
          description: form.description,
          logo: form.logo,
          gstin: form.gstin,
          policies: form.policies,
          address: {
            line1: form.line1,
            line2: form.line2,
            city: form.city,
            state: form.state,
            pincode: form.pincode,
          },
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Could not save.");
      setMsg("Saved.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      {error && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}
      {msg && (
        <div className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{msg}</div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Store name">
          <input value={form.name} onChange={(e) => set("name", e.target.value)} required className={inputClass} />
        </Field>
        <Field label="Store URL">
          <input value={`/store/${vendor.slug}`} disabled className={`${inputClass} disabled:bg-white/10 disabled:text-white/40`} />
        </Field>
        <Field label="Contact email">
          <input value={form.email} onChange={(e) => set("email", e.target.value)} className={inputClass} />
        </Field>
        <Field label="Phone">
          <input value={form.phone} onChange={(e) => set("phone", e.target.value)} className={inputClass} />
        </Field>
        <Field label="GSTIN">
          <input value={form.gstin} onChange={(e) => set("gstin", e.target.value)} className={inputClass} />
        </Field>
        <Field label="Logo URL">
          <input value={form.logo} onChange={(e) => set("logo", e.target.value)} placeholder="https://…" className={inputClass} />
        </Field>
      </div>

      <Field label="Store description">
        <textarea value={form.description} onChange={(e) => set("description", e.target.value)} rows={3} className={inputClass} />
      </Field>

      <Field label="Policies (returns, shipping)">
        <textarea value={form.policies} onChange={(e) => set("policies", e.target.value)} rows={2} className={inputClass} />
      </Field>

      <fieldset className="rounded-xl border border-white/10 p-4">
        <legend className="px-2 text-sm font-semibold text-white/70">Pickup address</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Address line 1">
            <input value={form.line1} onChange={(e) => set("line1", e.target.value)} className={inputClass} />
          </Field>
          <Field label="Address line 2">
            <input value={form.line2} onChange={(e) => set("line2", e.target.value)} className={inputClass} />
          </Field>
          <Field label="City">
            <input value={form.city} onChange={(e) => set("city", e.target.value)} className={inputClass} />
          </Field>
          <Field label="State">
            <input value={form.state} onChange={(e) => set("state", e.target.value)} className={inputClass} />
          </Field>
          <Field label="Pincode">
            <input value={form.pincode} onChange={(e) => set("pincode", e.target.value)} className={inputClass} />
          </Field>
        </div>
      </fieldset>

      <button
        type="submit"
        disabled={saving}
        className="rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
      >
        {saving ? "Saving…" : "Save changes"}
      </button>
    </form>
  );
}

const inputClass =
  "w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm outline-none focus:border-brand-400 focus:bg-white/[0.02] focus:ring-2 focus:ring-brand-100";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-white/70">{label}</span>
      {children}
    </label>
  );
}
