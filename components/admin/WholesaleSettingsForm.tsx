"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export interface WholesaleSettingsShape {
  moduleEnabled: boolean;
  maxDiscountPercent: number;
  wholesaleCommissionPercent: number;
  defaultCreditDays: number;
}

export default function WholesaleSettingsForm({
  initial,
}: {
  initial: WholesaleSettingsShape;
}) {
  const router = useRouter();
  const [form, setForm] = useState({
    moduleEnabled: initial.moduleEnabled,
    maxDiscountPercent: String(initial.maxDiscountPercent),
    wholesaleCommissionPercent: String(initial.wholesaleCommissionPercent),
    defaultCreditDays: String(initial.defaultCreditDays),
  });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setMsg(null);
    setError(null);
    try {
      const res = await fetch("/api/admin/wholesale-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          moduleEnabled: form.moduleEnabled,
          maxDiscountPercent: Number(form.maxDiscountPercent),
          wholesaleCommissionPercent: Number(form.wholesaleCommissionPercent),
          defaultCreditDays: Number(form.defaultCreditDays),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Could not save settings.");
      setMsg("Settings saved.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save settings.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      {error && <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      {msg && <div className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{msg}</div>}

      <label className="flex items-center gap-3">
        <input
          type="checkbox"
          checked={form.moduleEnabled}
          onChange={(e) => setForm((f) => ({ ...f, moduleEnabled: e.target.checked }))}
          className="h-4 w-4 accent-brand-600"
        />
        <span className="text-sm font-medium text-white/70">
          Wholesale module enabled (master switch)
        </span>
      </label>

      <NumberField
        label="Max discount cap (%)"
        hint="Vendors' wholesale tiers can't discount more than this off the retail price."
        value={form.maxDiscountPercent}
        onChange={(v) => setForm((f) => ({ ...f, maxDiscountPercent: v }))}
      />
      <NumberField
        label="Wholesale commission (%)"
        hint="Platform commission on wholesale orders (independent of retail)."
        value={form.wholesaleCommissionPercent}
        onChange={(v) => setForm((f) => ({ ...f, wholesaleCommissionPercent: v }))}
      />
      <NumberField
        label="Default credit days"
        hint="Net-N terms offered to approved credit accounts (e.g. 15 or 30)."
        value={form.defaultCreditDays}
        onChange={(v) => setForm((f) => ({ ...f, defaultCreditDays: v }))}
      />

      <button
        onClick={save}
        disabled={saving}
        className="rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
      >
        {saving ? "Saving…" : "Save settings"}
      </button>
    </div>
  );
}

function NumberField({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-white/70">{label}</span>
      <span className="mt-0.5 block text-xs text-white/40">{hint}</span>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-40 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-brand-400 focus:bg-white/[0.02] focus:ring-2 focus:ring-brand-100"
      />
    </label>
  );
}
