"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Product } from "@/lib/types";
import { useCart } from "@/lib/cart";
import { useAuth } from "@/lib/authClient";
import { unitPriceFor, moqError, type PricingContext } from "@/lib/pricing";
import { formatINR } from "@/lib/format";
import VolumePricing from "./VolumePricing";

export default function ProductPurchase({ product }: { product: Product }) {
  const router = useRouter();
  const { addItem, items } = useCart();
  const { user } = useAuth();
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  const ctx: PricingContext = { isWholesaler: Boolean(user?.isWholesaler) };
  const unitPrice = unitPriceFor(product, qty, ctx);
  const unitSaving = Math.max(0, product.price - unitPrice);
  const lineTotal = unitPrice * qty;
  const moqWarning = moqError(product, qty, ctx, product.name);

  const inStock = product.stock > 0;
  const inCart = items.find((i) => i.slug === product.slug)?.qty ?? 0;
  const maxAddable = Math.max(0, product.stock - inCart);
  const canAdd = inStock && maxAddable > 0;

  const blocked = !canAdd || Boolean(moqWarning);

  function handleAdd() {
    if (blocked) return;
    addItem(product, qty);
    setAdded(true);
    setTimeout(() => setAdded(false), 1800);
  }

  function handleBuyNow() {
    if (blocked) return;
    addItem(product, qty);
    router.push("/cart");
  }

  if (!inStock) {
    return (
      <button
        disabled
        className="w-full cursor-not-allowed rounded-lg bg-white/10 px-6 py-3 text-sm font-semibold text-white/50"
      >
        Out of stock
      </button>
    );
  }

  return (
    <div className="space-y-4">
      <VolumePricing product={product} qty={qty} />

      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-white/70">Quantity</span>
        <div className="flex items-center rounded-lg border border-white/10">
          <button
            type="button"
            onClick={() => setQty((q) => Math.max(1, q - 1))}
            disabled={qty <= 1}
            aria-label="Decrease quantity"
            className="flex h-9 w-9 items-center justify-center text-lg text-white/70 disabled:text-white/30"
          >
            −
          </button>
          <span className="w-10 text-center text-sm font-semibold">{qty}</span>
          <button
            type="button"
            onClick={() => setQty((q) => Math.min(maxAddable, q + 1))}
            disabled={qty >= maxAddable}
            aria-label="Increase quantity"
            className="flex h-9 w-9 items-center justify-center text-lg text-white/70 disabled:text-white/30"
          >
            +
          </button>
        </div>
        {inCart > 0 && (
          <span className="text-xs text-white/50">{inCart} already in cart</span>
        )}
      </div>

      {/* Live price for the selected quantity, reflecting volume/wholesale. */}
      {qty > 1 && (
        <div className="flex items-baseline justify-between rounded-lg bg-white/5 px-3 py-2 text-sm">
          <span className="text-white/70">
            {unitSaving > 0 ? (
              <>
                <span className="font-semibold text-emerald-700">{formatINR(unitPrice)}</span>
                <span className="text-white/40"> /unit · </span>
                <span className="text-emerald-700">save {formatINR(unitSaving)}/unit</span>
              </>
            ) : (
              <>
                <span className="font-semibold text-white/80">{formatINR(unitPrice)}</span>
                <span className="text-white/40"> /unit</span>
              </>
            )}
          </span>
          <span className="font-semibold text-white">{formatINR(lineTotal)}</span>
        </div>
      )}

      {moqWarning && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm font-medium text-amber-700">
          {moqWarning}
        </p>
      )}

      <div className="flex flex-col gap-2.5 sm:flex-row">
        <button
          onClick={handleAdd}
          disabled={blocked}
          className={`btn-primary flex-1 ${added ? "!bg-green-500 !border-green-600" : ""}`}
        >
          {added ? "Added to cart ✓" : maxAddable === 0 ? "Max in cart" : "Add to Cart"}
        </button>
        <button onClick={handleBuyNow} disabled={blocked} className="btn-buy flex-1">
          Buy Now
        </button>
      </div>
    </div>
  );
}
