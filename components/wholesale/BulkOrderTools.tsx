"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Product } from "@/lib/types";
import { useCart } from "@/lib/cart";

interface Template {
  id: string;
  name: string;
  lines: { slug: string; qty: number }[];
}

/** Add {slug, qty} lines to the cart, fetching each product's live data. */
async function addLines(
  lines: { slug: string; qty: number }[],
  addItem: (p: Product, qty: number) => void
): Promise<string[]> {
  const missing: string[] = [];
  for (const l of lines) {
    const res = await fetch(`/api/products/${encodeURIComponent(l.slug)}`);
    if (!res.ok) {
      missing.push(l.slug);
      continue;
    }
    const { product } = await res.json();
    if (product) addItem(product as Product, l.qty);
    else missing.push(l.slug);
  }
  return missing;
}

export default function BulkOrderTools({ templates }: { templates: Template[] }) {
  const router = useRouter();
  const { items, addItem } = useCart();
  const [name, setName] = useState("");
  const [csv, setCsv] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function saveTemplate() {
    if (items.length === 0) {
      setMsg("Your cart is empty — add items first.");
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/wholesale/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name || "Untitled template",
          lines: items.map((i) => ({ slug: i.slug, qty: i.qty })),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Could not save.");
      setName("");
      setMsg("Template saved.");
      router.refresh();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Could not save.");
    } finally {
      setBusy(false);
    }
  }

  async function applyTemplate(t: Template) {
    setBusy(true);
    setMsg(null);
    const missing = await addLines(t.lines, addItem);
    setBusy(false);
    setMsg(missing.length ? `Added. Skipped unavailable: ${missing.join(", ")}` : "Added to cart.");
  }

  async function deleteTemplate(id: string) {
    await fetch(`/api/wholesale/templates/${id}`, { method: "DELETE" });
    router.refresh();
  }

  async function applyCsv() {
    const lines = csv
      .split("\n")
      .map((row) => row.trim())
      .filter(Boolean)
      .map((row) => {
        const [slug, qty] = row.split(",").map((c) => c.trim());
        return { slug, qty: Number(qty) };
      })
      .filter((l) => l.slug && l.slug.toLowerCase() !== "slug" && Number.isInteger(l.qty) && l.qty > 0);
    if (lines.length === 0) {
      setMsg("No valid rows. Use: slug,qty per line.");
      return;
    }
    setBusy(true);
    setMsg(null);
    const missing = await addLines(lines, addItem);
    setBusy(false);
    setMsg(missing.length ? `Added ${lines.length - missing.length}. Skipped: ${missing.join(", ")}` : `Added ${lines.length} lines to cart.`);
  }

  return (
    <div className="space-y-6">
      {msg && <div className="rounded-lg bg-white/10 px-4 py-3 text-sm text-white/70">{msg}</div>}

      <section className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
        <h2 className="font-semibold text-white">Save current cart as a template</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Template name"
            className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm"
          />
          <button onClick={saveTemplate} disabled={busy} className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50">
            Save
          </button>
        </div>
      </section>

      <section className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
        <h2 className="font-semibold text-white">Saved templates</h2>
        {templates.length === 0 ? (
          <p className="mt-2 text-sm text-white/50">No templates yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-white/10 text-sm">
            {templates.map((t) => (
              <li key={t.id} className="flex items-center justify-between py-2">
                <span className="text-white/70">
                  {t.name} <span className="text-white/40">· {t.lines.length} items</span>
                </span>
                <span className="flex items-center gap-3">
                  <button onClick={() => applyTemplate(t)} disabled={busy} className="text-xs font-medium text-brand-600 hover:underline disabled:opacity-50">
                    Add to cart
                  </button>
                  <button onClick={() => deleteTemplate(t.id)} className="text-xs font-medium text-red-600 hover:underline">
                    Delete
                  </button>
                </span>
              </li>
            ))}
          </ul>
        )}
        <Link href="/wholesale/cart" className="mt-3 inline-block text-sm font-medium text-brand-600 hover:underline">
          Go to bulk cart →
        </Link>
      </section>

      <section className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
        <h2 className="font-semibold text-white">Bulk upload (CSV)</h2>
        <p className="mt-1 text-xs text-white/50">One line per item: <code>product-slug,quantity</code></p>
        <textarea
          value={csv}
          onChange={(e) => setCsv(e.target.value)}
          rows={5}
          placeholder={"nova-lite-4g,20\necho-buds-pro,50"}
          className="mt-2 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 font-mono text-sm"
        />
        <button onClick={applyCsv} disabled={busy} className="mt-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50">
          Add CSV items to cart
        </button>
      </section>
    </div>
  );
}
