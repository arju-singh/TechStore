"use client";

import Image from "next/image";
import { useState } from "react";
import type { Product } from "@/lib/types";
import { useCart } from "@/lib/cart";
import { unitPriceFor } from "@/lib/pricing";
import { formatINR } from "@/lib/format";
import RfqRequestButton from "./RfqRequestButton";

const WCTX = { isWholesaler: true } as const;

export default function WholesaleProductCard({ product }: { product: Product }) {
  const { addItem } = useCart();
  const moq = product.wholesale?.moq ?? 1;
  const tiers = product.wholesale?.tiers ?? [];
  const [qty, setQty] = useState(moq);
  const [added, setAdded] = useState(false);

  const unit = unitPriceFor(product, qty, WCTX);
  const belowMoq = qty < moq;

  return (
    <div className="flex flex-col rounded-xl border border-white/10 bg-white/[0.02] p-4">
      <div className="relative mx-auto aspect-square w-full overflow-hidden rounded-lg bg-white p-3">
        <Image src={product.image} alt={product.name} fill sizes="200px" className="object-contain" />
      </div>
      <h3 className="mt-2 line-clamp-2 text-sm font-medium text-white/80">{product.name}</h3>
      <div className="mt-1 text-xs text-white/40">
        Retail {formatINR(product.price)} · MOQ {moq}
      </div>

      {tiers.length > 0 && (
        <table className="mt-2 w-full text-xs">
          <tbody>
            {tiers.map((t) => {
              const active = qty >= t.minQty && (t.maxQty == null || qty <= t.maxQty);
              return (
                <tr key={t.minQty} className={active ? "font-semibold text-brand-400" : "text-white/50"}>
                  <td className="py-0.5">
                    {t.minQty}
                    {t.maxQty == null ? "+" : `–${t.maxQty}`}
                  </td>
                  <td className="py-0.5 text-right tabular-nums">{formatINR(t.unitPrice)}/u</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      <div className="mt-3 flex items-center gap-2">
        <input
          type="number"
          value={qty}
          min={moq}
          onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))}
          className="w-20 rounded border border-white/10 bg-white/5 px-2 py-1 text-sm text-white"
        />
        <span className="text-sm font-semibold text-white">{formatINR(unit)}/u</span>
      </div>
      {belowMoq && (
        <p className="mt-1 text-[11px] text-amber-600">Minimum order is {moq} units.</p>
      )}

      <button
        onClick={() => {
          addItem(product, qty);
          setAdded(true);
          setTimeout(() => setAdded(false), 1500);
        }}
        disabled={belowMoq || product.stock <= 0}
        className="mt-2 rounded-lg bg-brand-600 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
      >
        {product.stock <= 0 ? "Out of stock" : added ? "Added ✓" : "Add to bulk cart"}
      </button>

      {product.vendorSlug && (
        <RfqRequestButton productSlug={product.slug} defaultQty={qty} />
      )}
    </div>
  );
}
