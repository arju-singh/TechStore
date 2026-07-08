"use client";

import { useEffect, useState } from "react";
import type { DeliveryEstimate } from "@/lib/delivery";

const STORAGE_KEY = "techstore.pincode";

export default function PincodeCheck() {
  const [pincode, setPincode] = useState("");
  const [result, setResult] = useState<DeliveryEstimate | null>(null);
  const [loading, setLoading] = useState(false);

  // Remember the last-checked pincode and re-check it on load.
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      setPincode(saved);
      check(saved);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function check(pin: string) {
    const code = pin.trim();
    if (!/^\d{6}$/.test(code)) {
      setResult({
        pincode: code,
        serviceable: false,
        codAvailable: false,
        etaDays: 0,
        zone: "",
        message: "Please enter a valid 6-digit pincode.",
      });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/delivery?pincode=${encodeURIComponent(code)}`);
      const data: DeliveryEstimate = await res.json();
      setResult(data);
      localStorage.setItem(STORAGE_KEY, code);
    } catch {
      setResult(null);
    } finally {
      setLoading(false);
    }
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    check(pincode);
  }

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-white/80">
        <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 text-brand-600" stroke="currentColor" strokeWidth={1.8}>
          <path d="M12 21s-7-5.2-7-10a7 7 0 1 1 14 0c0 4.8-7 10-7 10Z" strokeLinejoin="round" />
          <circle cx="12" cy="11" r="2.5" />
        </svg>
        Check delivery
      </div>

      <form onSubmit={onSubmit} className="mt-3 flex gap-2">
        <input
          type="text"
          inputMode="numeric"
          maxLength={6}
          value={pincode}
          onChange={(e) => setPincode(e.target.value.replace(/\D/g, ""))}
          placeholder="Enter 6-digit pincode"
          className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none transition focus:border-brand-400 focus:bg-white/[0.02] focus:ring-2 focus:ring-brand-100"
        />
        <button
          type="submit"
          disabled={loading}
          className="shrink-0 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {loading ? "…" : "Check"}
        </button>
      </form>

      {result && (
        <div className="mt-3 text-sm">
          {result.serviceable ? (
            <div className="rounded-lg bg-green-50 px-3 py-2 text-green-800">
              <p className="font-semibold">
                ✓ Delivery available
                {result.zone ? ` · ${result.zone}` : ""}
              </p>
              <p className="mt-0.5 text-green-700">
                Estimated {result.etaDays}–{result.etaDays + 1} business days.
              </p>
              <p className="mt-0.5 text-xs text-green-700">
                {result.codAvailable
                  ? "Cash on Delivery available."
                  : "Prepaid only — COD not available at this pincode."}
              </p>
            </div>
          ) : (
            <div className="rounded-lg bg-red-50 px-3 py-2 text-red-700">
              {result.message}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
