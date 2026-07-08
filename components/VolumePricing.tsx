"use client";

import Link from "next/link";
import type { Product } from "@/lib/types";
import { useAuth } from "@/lib/authClient";
import { unitPriceFor, type PricingContext } from "@/lib/pricing";
import { formatINR } from "@/lib/format";

/**
 * Renders a product's public volume breaks (and, for approved wholesalers, the
 * wholesale price) as a small table, highlighting the row that applies at the
 * current quantity. Buyers who aren't wholesalers see the wholesale row as a
 * locked "For Business" teaser. Purely presentational — the server re-derives
 * the actual charged price.
 */
export default function VolumePricing({
  product,
  qty,
}: {
  product: Product;
  qty: number;
}) {
  const { user } = useAuth();
  const isWholesaler = Boolean(user?.isWholesaler);
  const ctx: PricingContext = { isWholesaler };

  const tiers = product.priceTiers ?? [];
  const wholesale = product.wholesale;
  const hasWholesale = Boolean(wholesale?.enabled);
  if (tiers.length === 0 && !hasWholesale) return null;

  const effective = unitPriceFor(product, qty, ctx);

  type Row = {
    key: string;
    label: string;
    unit: number;
    active: boolean;
    locked?: boolean;
    note?: string;
  };
  const rows: Row[] = [
    {
      key: "base",
      label: "1+",
      unit: product.price,
      active: qty >= 1 && effective === product.price,
    },
    ...tiers.map((t) => ({
      key: `t-${t.minQty}`,
      label: `${t.minQty}+`,
      unit: t.unitPrice,
      active: qty >= t.minQty && effective === t.unitPrice,
    })),
  ];
  if (hasWholesale && wholesale) {
    if (isWholesaler) {
      rows.push({
        key: "wholesale",
        label: `MOQ ${wholesale.moq}`,
        unit: wholesale.unitPrice,
        active: effective === wholesale.unitPrice,
        note: "Wholesale",
      });
    } else {
      rows.push({
        key: "wholesale-locked",
        label: `${wholesale.moq}+`,
        unit: wholesale.unitPrice,
        active: false,
        locked: true,
        note: "Business",
      });
    }
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Buy more, save more
        </span>
        {!isWholesaler && hasWholesale && (
          <Link href="/business" className="text-xs font-semibold text-blue-700 hover:underline">
            For Business →
          </Link>
        )}
      </div>
      <table className="w-full text-sm">
        <tbody>
          {rows.map((r) => (
            <tr
              key={r.key}
              className={`${
                r.active ? "font-semibold text-slate-900" : "text-slate-600"
              }`}
            >
              <td className="py-1">
                <span className="inline-flex items-center gap-1.5">
                  <span
                    className={`inline-block h-1.5 w-1.5 rounded-full ${
                      r.active ? "bg-emerald-500" : "bg-transparent"
                    }`}
                  />
                  {r.label} units
                  {r.note && (
                    <span
                      className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                        r.locked
                          ? "bg-blue-50 text-blue-700"
                          : "bg-emerald-50 text-emerald-700"
                      }`}
                    >
                      {r.note}
                    </span>
                  )}
                </span>
              </td>
              <td className="py-1 text-right tabular-nums">
                <span className={r.locked ? "text-slate-400" : ""}>
                  {formatINR(r.unit)}
                </span>
                <span className="text-xs text-slate-400"> /unit</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
