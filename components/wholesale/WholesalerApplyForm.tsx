"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

const BUSINESS_TYPES: { value: string; label: string }[] = [
  { value: "distributor", label: "Distributor" },
  { value: "wholesaler", label: "Wholesaler" },
  { value: "retail_shop", label: "Retail shop" },
  { value: "supermarket", label: "Supermarket" },
  { value: "pet_shop", label: "Pet shop" },
  { value: "veterinary_clinic", label: "Veterinary clinic" },
  { value: "breeder", label: "Breeder" },
  { value: "ngo", label: "NGO" },
  { value: "importer", label: "Importer" },
  { value: "exporter", label: "Exporter" },
  { value: "other", label: "Other" },
];

const DOC_SLOTS: { docType: string; label: string }[] = [
  { docType: "gst_certificate", label: "GST certificate" },
  { docType: "business_license", label: "Business license" },
  { docType: "id_proof", label: "ID proof" },
];

export default function WholesalerApplyForm({
  categories,
  defaultEmail,
}: {
  categories: { slug: string; name: string }[];
  defaultEmail: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const fileRefs = {
    gst_certificate: useRef<HTMLInputElement>(null),
    business_license: useRef<HTMLInputElement>(null),
    id_proof: useRef<HTMLInputElement>(null),
  };

  const [form, setForm] = useState({
    businessName: "",
    ownerName: "",
    taxNumber: "",
    tradeLicenseNumber: "",
    businessType: "distributor",
    email: defaultEmail,
    phone: "",
    website: "",
    expectedMonthlyPurchase: "",
    bLine1: "",
    bLine2: "",
    bCity: "",
    bState: "",
    bPincode: "",
    wLine1: "",
    wCity: "",
    wState: "",
    wPincode: "",
  });
  const [cats, setCats] = useState<string[]>([]);

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }
  function toggleCat(slug: string) {
    setCats((c) => (c.includes(slug) ? c.filter((x) => x !== slug) : [...c, slug]));
  }

  async function uploadDocs() {
    for (const slot of DOC_SLOTS) {
      const file = fileRefs[slot.docType as keyof typeof fileRefs].current?.files?.[0];
      if (!file) continue;
      const fd = new FormData();
      fd.append("file", file);
      fd.append("docType", slot.docType);
      const res = await fetch("/api/wholesaler/documents", {
        method: "POST",
        body: fd,
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d?.error || `Could not upload ${slot.label}.`);
      }
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const res = await fetch("/api/wholesaler/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessName: form.businessName,
          ownerName: form.ownerName,
          taxNumber: form.taxNumber,
          tradeLicenseNumber: form.tradeLicenseNumber,
          businessType: form.businessType,
          email: form.email,
          phone: form.phone,
          website: form.website,
          expectedMonthlyPurchase: Number(form.expectedMonthlyPurchase) || 0,
          categoriesInterested: cats,
          businessAddress: {
            line1: form.bLine1,
            line2: form.bLine2,
            city: form.bCity,
            state: form.bState,
            pincode: form.bPincode,
          },
          warehouseAddress: {
            line1: form.wLine1,
            city: form.wCity,
            state: form.wState,
            pincode: form.wPincode,
          },
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Could not submit application.");

      // Application created — now upload any selected documents to it.
      await uploadDocs();

      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit application.");
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {error && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <Section title="Business details">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Business name" required>
            <input value={form.businessName} onChange={(e) => set("businessName", e.target.value)} required className={INPUT} />
          </Field>
          <Field label="Owner name" required>
            <input value={form.ownerName} onChange={(e) => set("ownerName", e.target.value)} required className={INPUT} />
          </Field>
          <Field label="GST number" required>
            <input value={form.taxNumber} onChange={(e) => set("taxNumber", e.target.value.toUpperCase())} required placeholder="22AAAAA0000A1Z5" className={INPUT} />
          </Field>
          <Field label="Trade license number">
            <input value={form.tradeLicenseNumber} onChange={(e) => set("tradeLicenseNumber", e.target.value)} className={INPUT} />
          </Field>
          <Field label="Business type" required>
            <select value={form.businessType} onChange={(e) => set("businessType", e.target.value)} className={INPUT}>
              {BUSINESS_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </Field>
          <Field label="Expected monthly purchase (₹)">
            <input type="number" value={form.expectedMonthlyPurchase} onChange={(e) => set("expectedMonthlyPurchase", e.target.value)} className={INPUT} />
          </Field>
          <Field label="Business email" required>
            <input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} required className={INPUT} />
          </Field>
          <Field label="Phone" required>
            <input value={form.phone} onChange={(e) => set("phone", e.target.value)} required placeholder="10-digit mobile" className={INPUT} />
          </Field>
          <Field label="Website">
            <input value={form.website} onChange={(e) => set("website", e.target.value)} placeholder="https://…" className={INPUT} />
          </Field>
        </div>
      </Section>

      {categories.length > 0 && (
        <Section title="Categories interested in">
          <div className="flex flex-wrap gap-2">
            {categories.map((c) => (
              <button
                type="button"
                key={c.slug}
                onClick={() => toggleCat(c.slug)}
                className={`rounded-full border px-3 py-1 text-sm ${
                  cats.includes(c.slug)
                    ? "border-brand-600 bg-brand-50 text-brand-700"
                    : "border-white/10 text-white/70 hover:bg-white/5"
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>
        </Section>
      )}

      <Section title="Business address">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Address line 1" required>
            <input value={form.bLine1} onChange={(e) => set("bLine1", e.target.value)} required className={INPUT} />
          </Field>
          <Field label="Address line 2">
            <input value={form.bLine2} onChange={(e) => set("bLine2", e.target.value)} className={INPUT} />
          </Field>
          <Field label="City" required>
            <input value={form.bCity} onChange={(e) => set("bCity", e.target.value)} required className={INPUT} />
          </Field>
          <Field label="State" required>
            <input value={form.bState} onChange={(e) => set("bState", e.target.value)} required className={INPUT} />
          </Field>
          <Field label="Pincode" required>
            <input value={form.bPincode} onChange={(e) => set("bPincode", e.target.value)} required className={INPUT} />
          </Field>
        </div>
      </Section>

      <Section title="Warehouse address (optional)">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Address line 1">
            <input value={form.wLine1} onChange={(e) => set("wLine1", e.target.value)} className={INPUT} />
          </Field>
          <Field label="City">
            <input value={form.wCity} onChange={(e) => set("wCity", e.target.value)} className={INPUT} />
          </Field>
          <Field label="State">
            <input value={form.wState} onChange={(e) => set("wState", e.target.value)} className={INPUT} />
          </Field>
          <Field label="Pincode">
            <input value={form.wPincode} onChange={(e) => set("wPincode", e.target.value)} className={INPUT} />
          </Field>
        </div>
      </Section>

      <Section title="Verification documents">
        <p className="mb-3 text-xs text-white/50">
          Upload a PDF or image (max 8 MB each). Real files are stored securely for
          admin review.
        </p>
        <div className="grid gap-4 sm:grid-cols-3">
          {DOC_SLOTS.map((slot) => (
            <Field key={slot.docType} label={slot.label}>
              <input
                ref={fileRefs[slot.docType as keyof typeof fileRefs]}
                type="file"
                accept="application/pdf,image/png,image/jpeg,image/webp"
                className="block w-full text-sm text-white/70 file:mr-3 file:rounded-md file:border-0 file:bg-white/10 file:px-3 file:py-1.5 file:text-sm file:font-medium hover:file:bg-white/10"
              />
            </Field>
          ))}
        </div>
      </Section>

      <button
        type="submit"
        disabled={saving}
        className="rounded-lg bg-brand-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
      >
        {saving ? "Submitting…" : "Submit application"}
      </button>
    </form>
  );
}

const INPUT =
  "w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm outline-none focus:border-brand-400 focus:bg-white/[0.02] focus:ring-2 focus:ring-brand-100";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="rounded-xl border border-white/10 p-5">
      <legend className="px-2 text-sm font-semibold text-white/70">{title}</legend>
      {children}
    </fieldset>
  );
}

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
