"use client";

import Image from "next/image";
import Link from "next/link";
import { useCart } from "@/lib/cart";
import { formatINR } from "@/lib/format";
import CouponInput from "./CouponInput";

export default function CartView() {
  const {
    items,
    pricedItems,
    totals,
    ready,
    isWholesaler,
    hasBlockingIssue,
    updateQty,
    removeItem,
    clear,
    couponCode,
  } = useCart();

  // Avoid a flash of "empty cart" before localStorage hydrates.
  if (!ready) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-20 text-center text-sm text-white/40 sm:px-6">
        Loading your cart…
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col items-center px-4 py-20 text-center sm:px-6">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-brand-50">
          <svg viewBox="0 0 24 24" fill="none" className="h-9 w-9 text-brand-600" stroke="currentColor" strokeWidth={1.6}>
            <path d="M3 3h2l.4 2M7 13h10l3-8H6.4M7 13 5.4 5M7 13l-2 4h12" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="9" cy="20" r="1.4" />
            <circle cx="17" cy="20" r="1.4" />
          </svg>
        </div>
        <h1 className="mt-6 text-2xl font-bold text-white">Your cart is empty</h1>
        <p className="mt-2 max-w-md text-sm text-white/50">
          Looks like you haven't added anything yet. Browse the catalog and find
          something you like.
        </p>
        <Link
          href="/products"
          className="mt-6 rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
        >
          Start shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white sm:text-3xl">
          Your cart
          <span className="ml-2 text-base font-normal text-white/40">
            ({totals.count} {totals.count === 1 ? "item" : "items"})
          </span>
        </h1>
        <button
          onClick={clear}
          className="text-sm font-medium text-white/50 hover:text-red-500"
        >
          Clear cart
        </button>
      </div>

      {isWholesaler && (
        <div className="mb-5 flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm text-blue-800">
          <span className="rounded bg-blue-600 px-1.5 py-0.5 text-[11px] font-bold text-white">
            WHOLESALE
          </span>
          Wholesale pricing is applied to eligible items that meet their minimum order quantity.
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Line items */}
        <ul className="space-y-4 lg:col-span-2">
          {pricedItems.map((item) => {
            const lineTotal = item.lineTotal;
            return (
              <li
                key={item.slug}
                className="flex gap-4 rounded-xl border border-white/10 bg-white/[0.02] p-4"
              >
                <Link
                  href={`/product/${item.slug}`}
                  className="relative h-24 w-24 shrink-0 overflow-hidden rounded-lg bg-white/10"
                >
                  <Image
                    src={item.image}
                    alt={item.name}
                    fill
                    sizes="96px"
                    className="object-cover"
                  />
                </Link>

                <div className="flex flex-1 flex-col">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-xs font-medium uppercase tracking-wide text-brand-600">
                        {item.brand}
                      </span>
                      <Link
                        href={`/product/${item.slug}`}
                        className="block text-sm font-semibold text-white/80 hover:text-brand-700"
                      >
                        {item.name}
                      </Link>
                    </div>
                    <button
                      onClick={() => removeItem(item.slug)}
                      aria-label={`Remove ${item.name}`}
                      className="text-white/40 hover:text-red-500"
                    >
                      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth={1.8}>
                        <path d="M4 7h16M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2m2 0v12a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V7" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                  </div>

                  <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-3">
                    <div className="flex items-center rounded-lg border border-white/10">
                      <button
                        onClick={() => updateQty(item.slug, item.qty - 1)}
                        aria-label="Decrease quantity"
                        className="flex h-8 w-8 items-center justify-center text-lg text-white/60 hover:bg-white/5"
                      >
                        −
                      </button>
                      <span className="w-9 text-center text-sm font-semibold">
                        {item.qty}
                      </span>
                      <button
                        onClick={() => updateQty(item.slug, item.qty + 1)}
                        disabled={item.qty >= item.stock}
                        aria-label="Increase quantity"
                        className="flex h-8 w-8 items-center justify-center text-lg text-white/60 hover:bg-white/5 disabled:text-white/30 disabled:hover:bg-transparent"
                      >
                        +
                      </button>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-white">
                        {formatINR(lineTotal)}
                      </div>
                      <div className="text-xs text-white/40">
                        {item.unitSavings > 0 ? (
                          <>
                            <span className="text-emerald-600">{formatINR(item.unitPrice)}</span>{" "}
                            <span className="line-through">{formatINR(item.price)}</span> each
                          </>
                        ) : (
                          <>{formatINR(item.unitPrice)} each</>
                        )}
                      </div>
                    </div>
                  </div>

                  {item.moqError && (
                    <p className="mt-2 rounded-md bg-amber-50 px-2.5 py-1.5 text-xs font-medium text-amber-700">
                      {item.moqError}
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ul>

        {/* Order summary */}
        <aside className="lg:col-span-1">
          <div className="sticky top-40 rounded-xl border border-white/10 bg-white/[0.02] p-5">
            <h2 className="text-lg font-bold text-white">Order summary</h2>
            <dl className="mt-4 space-y-2.5 text-sm">
              <Row label={`Subtotal (${totals.count} items)`} value={formatINR(totals.subtotal)} />
              {totals.savings > 0 && (
                <Row
                  label="Discount"
                  value={`− ${formatINR(totals.savings)}`}
                  valueClass="text-green-600"
                />
              )}
              {totals.couponDiscount > 0 && (
                <Row
                  label={`Coupon (${couponCode})`}
                  value={`− ${formatINR(totals.couponDiscount)}`}
                  valueClass="text-green-600"
                />
              )}
              <Row
                label="Delivery"
                value={totals.deliveryFee === 0 ? "FREE" : formatINR(totals.deliveryFee)}
                valueClass={totals.deliveryFee === 0 ? "text-green-600" : ""}
              />
            </dl>

            {/* Coupon */}
            <div className="mt-4 border-t border-white/10 pt-4">
              <CouponInput />
            </div>
            {totals.deliveryFee > 0 && (
              <p className="mt-2 text-xs text-white/40">
                Add {formatINR(499 - totals.subtotal)} more for free delivery.
              </p>
            )}
            <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-4">
              <span className="text-base font-semibold text-white">Total</span>
              <span className="text-xl font-bold text-white">
                {formatINR(totals.grandTotal)}
              </span>
            </div>
            {totals.savings > 0 && (
              <p className="mt-1 text-right text-xs font-medium text-green-600">
                You save {formatINR(totals.savings)}
              </p>
            )}

            {hasBlockingIssue ? (
              <>
                <button
                  disabled
                  className="mt-5 block w-full cursor-not-allowed rounded-lg bg-white/10 px-6 py-3 text-center text-sm font-semibold text-white/50"
                >
                  Proceed to checkout
                </button>
                <p className="mt-2 text-center text-xs font-medium text-amber-700">
                  Adjust the highlighted quantities to meet wholesale minimums.
                </p>
              </>
            ) : (
              <Link
                href="/checkout"
                className="mt-5 block w-full rounded-lg bg-brand-600 px-6 py-3 text-center text-sm font-semibold text-white hover:bg-brand-700"
              >
                Proceed to checkout
              </Link>
            )}
            <Link
              href="/products"
              className="mt-2 block text-center text-sm font-medium text-brand-600 hover:underline"
            >
              Continue shopping
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  valueClass = "",
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-white/50">{label}</dt>
      <dd className={`font-medium text-white/80 ${valueClass}`}>{value}</dd>
    </div>
  );
}
