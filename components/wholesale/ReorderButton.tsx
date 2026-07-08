"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Product } from "@/lib/types";
import { useCart } from "@/lib/cart";

/** Re-add a past order's lines to the bulk cart, then open the cart. */
export default function ReorderButton({
  lines,
}: {
  lines: { slug: string; qty: number }[];
}) {
  const router = useRouter();
  const { addItem } = useCart();
  const [busy, setBusy] = useState(false);

  async function reorder() {
    setBusy(true);
    for (const l of lines) {
      const res = await fetch(`/api/products/${encodeURIComponent(l.slug)}`);
      if (!res.ok) continue;
      const { product } = await res.json();
      if (product) addItem(product as Product, l.qty);
    }
    setBusy(false);
    router.push("/wholesale/cart");
  }

  return (
    <button
      onClick={reorder}
      disabled={busy}
      className="text-xs font-medium text-brand-600 hover:underline disabled:opacity-50"
    >
      {busy ? "Adding…" : "Reorder"}
    </button>
  );
}
