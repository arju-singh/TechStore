"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useCart } from "@/lib/cart";
import { useAuth } from "@/lib/authClient";
import { formatINR } from "@/lib/format";
import type { DeliveryEstimate } from "@/lib/delivery";

const INITIAL_ADDRESS = {
  fullName: "",
  phone: "",
  line1: "",
  line2: "",
  city: "",
  state: "",
  pincode: "",
};

const RAZORPAY_SRC = "https://checkout.razorpay.com/v1/checkout.js";

/** Load the Razorpay checkout script once, resolving when it's ready. */
function loadRazorpayScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if ((window as any).Razorpay) return resolve();
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${RAZORPAY_SRC}"]`
    );
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("script failed")));
      return;
    }
    const s = document.createElement("script");
    s.src = RAZORPAY_SRC;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Could not load Razorpay."));
    document.body.appendChild(s);
  });
}

export default function CheckoutView() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { items, pricedItems, totals, ready, clear, couponCode, hasBlockingIssue } =
    useCart();

  const isWholesaler = Boolean(user?.isWholesaler);
  const [address, setAddress] = useState(INITIAL_ADDRESS);
  const [payment, setPayment] = useState<"cod" | "razorpay" | "credit">("cod");
  const [poNumber, setPoNumber] = useState("");
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [delivery, setDelivery] = useState<DeliveryEstimate | null>(null);

  // Require login to check out.
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login?redirect=/checkout");
    }
  }, [authLoading, user, router]);

  // Look up delivery serviceability whenever a full pincode is entered.
  useEffect(() => {
    const pin = address.pincode.trim();
    if (!/^\d{6}$/.test(pin)) {
      setDelivery(null);
      return;
    }
    let active = true;
    fetch(`/api/delivery?pincode=${pin}`)
      .then((r) => r.json())
      .then((d: DeliveryEstimate) => active && setDelivery(d))
      .catch(() => active && setDelivery(null));
    return () => {
      active = false;
    };
  }, [address.pincode]);

  // If the pincode is COD-only-unavailable, force online payment.
  useEffect(() => {
    if (delivery && !delivery.codAvailable && payment === "cod") {
      setPayment("razorpay");
    }
  }, [delivery, payment]);

  // Prefill the recipient name from the account.
  useEffect(() => {
    if (user) setAddress((a) => (a.fullName ? a : { ...a, fullName: user.name }));
  }, [user]);

  if (authLoading || !ready || !user) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-20 text-center text-sm text-slate-400 sm:px-6">
        Loading checkout…
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center sm:px-6">
        <h1 className="text-2xl font-bold text-slate-900">Your cart is empty</h1>
        <p className="mt-2 text-sm text-slate-500">
          Add something to your cart before checking out.
        </p>
        <Link
          href="/products"
          className="mt-6 inline-block rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
        >
          Browse products
        </Link>
      </div>
    );
  }

  function set(field: keyof typeof INITIAL_ADDRESS) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setAddress((a) => ({ ...a, [field]: e.target.value }));
  }

  async function submitOrder(method: "cod" | "razorpay" | "credit" | "quote") {
    setError(null);
    setPlacing(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((i) => ({ slug: i.slug, qty: i.qty })),
          address,
          paymentMethod: method,
          couponCode: couponCode ?? "",
          poNumber: poNumber.trim(),
          // Guards against a duplicate order if the request is retried.
          idempotencyKey:
            typeof crypto !== "undefined" && "randomUUID" in crypto
              ? crypto.randomUUID()
              : `${user?.id ?? "u"}-${totals.grandTotal}-${totals.count}`,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Could not place order.");

      // COD / credit / quote all complete server-side; only razorpay needs the modal.
      if (method !== "razorpay") {
        clear();
        router.push(`/order/${data.order.id}?placed=1`);
        return;
      }
      await payWithRazorpay(data.order, data.razorpay);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not place order.");
      setPlacing(false);
    }
  }

  async function placeOrder(e: React.FormEvent) {
    e.preventDefault();
    await submitOrder(payment);
  }

  async function payWithRazorpay(
    order: { id: string },
    rzp: { orderId: string; keyId: string; amount: number; currency: string }
  ) {
    await loadRazorpayScript();
    const RazorpayCtor = (window as any).Razorpay;
    if (!RazorpayCtor) throw new Error("Could not load the payment gateway.");

    const rz = new RazorpayCtor({
      key: rzp.keyId,
      amount: rzp.amount,
      currency: rzp.currency,
      name: "TechStore",
      description: `Order ${order.id.slice(-8)}`,
      order_id: rzp.orderId,
      prefill: {
        name: address.fullName,
        contact: address.phone,
        email: user?.email,
      },
      theme: { color: "#1f47f5" },
      handler: async (resp: any) => {
        try {
          const vres = await fetch("/api/payments/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              orderId: order.id,
              razorpay_order_id: resp.razorpay_order_id,
              razorpay_payment_id: resp.razorpay_payment_id,
              razorpay_signature: resp.razorpay_signature,
            }),
          });
          const vdata = await vres.json().catch(() => ({}));
          if (!vres.ok) throw new Error(vdata?.error || "Payment verification failed.");
          clear();
          router.push(`/order/${order.id}?placed=1`);
        } catch (err) {
          setError(err instanceof Error ? err.message : "Payment verification failed.");
          setPlacing(false);
        }
      },
      modal: {
        ondismiss: () => {
          setError("Payment cancelled. Your order is saved as pending — you can retry from your orders.");
          setPlacing(false);
        },
      },
    });
    rz.on("payment.failed", (resp: any) => {
      setError(resp?.error?.description || "Payment failed. Please try again.");
      setPlacing(false);
    });
    rz.open();
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <h1 className="mb-6 text-2xl font-bold text-slate-900 sm:text-3xl">Checkout</h1>

      <form onSubmit={placeOrder} className="grid gap-8 lg:grid-cols-3">
        {/* Address + payment */}
        <div className="space-y-6 lg:col-span-2">
          <section className="rounded-xl border border-slate-200 bg-white p-6">
            <h2 className="text-lg font-bold text-slate-900">Delivery address</h2>
            {error && (
              <div className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label="Full name" value={address.fullName} onChange={set("fullName")} autoComplete="name" />
              <Field label="Mobile number" value={address.phone} onChange={set("phone")} autoComplete="tel" placeholder="10-digit number" inputMode="numeric" />
              <Field label="Address (house, street)" value={address.line1} onChange={set("line1")} autoComplete="address-line1" className="sm:col-span-2" />
              <Field label="Apartment, landmark (optional)" value={address.line2} onChange={set("line2")} autoComplete="address-line2" required={false} className="sm:col-span-2" />
              <Field label="City" value={address.city} onChange={set("city")} autoComplete="address-level2" />
              <Field label="State" value={address.state} onChange={set("state")} autoComplete="address-level1" />
              <Field label="Pincode" value={address.pincode} onChange={set("pincode")} autoComplete="postal-code" placeholder="6-digit pincode" inputMode="numeric" />
            </div>

            {delivery && (
              <div
                className={`mt-4 rounded-lg px-3 py-2 text-sm ${
                  delivery.serviceable
                    ? "bg-green-50 text-green-800"
                    : "bg-red-50 text-red-700"
                }`}
              >
                {delivery.serviceable ? (
                  <>
                    ✓ Delivers in {delivery.etaDays}–{delivery.etaDays + 1} business days
                    {delivery.codAvailable ? "." : " · Prepaid only (no COD here)."}
                  </>
                ) : (
                  delivery.message
                )}
              </div>
            )}
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-6">
            <h2 className="text-lg font-bold text-slate-900">Payment method</h2>
            <div className="mt-4 space-y-3">
              <PaymentOption
                value="razorpay"
                checked={payment === "razorpay"}
                onSelect={() => setPayment("razorpay")}
                title="Pay online"
                subtitle="UPI, cards, netbanking & wallets via Razorpay (test mode)."
              />
              <PaymentOption
                value="cod"
                checked={payment === "cod"}
                onSelect={() => setPayment("cod")}
                title="Cash on Delivery"
                subtitle="Pay in cash when your order arrives."
                disabled={Boolean(delivery && !delivery.codAvailable)}
                disabledNote="Not available for this pincode"
              />
              {isWholesaler && (
                <PaymentOption
                  value="credit"
                  checked={payment === "credit"}
                  onSelect={() => setPayment("credit")}
                  title="Credit — Net 30"
                  subtitle="Approved wholesale accounts: pay within 30 days against an invoice."
                />
              )}
            </div>

            {isWholesaler && (
              <div className="mt-4">
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-slate-700">
                    PO number <span className="font-normal text-slate-400">(optional)</span>
                  </span>
                  <input
                    type="text"
                    value={poNumber}
                    onChange={(e) => setPoNumber(e.target.value)}
                    placeholder="Your purchase-order reference"
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
                  />
                </label>
              </div>
            )}
          </section>
        </div>

        {/* Summary */}
        <aside>
          <div className="sticky top-40 rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="text-lg font-bold text-slate-900">Order summary</h2>
            <ul className="mt-4 space-y-3">
              {pricedItems.map((i) => (
                <li key={i.slug} className="flex justify-between gap-3 text-sm">
                  <span className="text-slate-600">
                    {i.name} <span className="text-slate-400">× {i.qty}</span>
                    {i.unitSavings > 0 && (
                      <span className="ml-1 rounded bg-emerald-50 px-1 py-0.5 text-[10px] font-semibold text-emerald-700">
                        {formatINR(i.unitPrice)}/unit
                      </span>
                    )}
                  </span>
                  <span className="whitespace-nowrap font-medium text-slate-800">
                    {formatINR(i.lineTotal)}
                  </span>
                </li>
              ))}
            </ul>
            {hasBlockingIssue && (
              <p className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700">
                Some items are below their wholesale minimum. Adjust quantities in
                your cart to continue.
              </p>
            )}
            <dl className="mt-4 space-y-2 border-t border-slate-100 pt-4 text-sm">
              <Row label={`Subtotal (${totals.count} items)`} value={formatINR(totals.subtotal)} />
              {totals.savings > 0 && (
                <Row label="Discount" value={`− ${formatINR(totals.savings)}`} valueClass="text-green-600" />
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
            <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4">
              <span className="text-base font-semibold text-slate-900">Total</span>
              <span className="text-xl font-bold text-slate-900">
                {formatINR(totals.grandTotal)}
              </span>
            </div>
            <button
              type="submit"
              disabled={placing || hasBlockingIssue}
              className="mt-5 w-full rounded-lg bg-brand-600 px-6 py-3 text-sm font-semibold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {placing
                ? "Processing…"
                : payment === "razorpay"
                ? `Pay ${formatINR(totals.grandTotal)}`
                : payment === "credit"
                ? "Place order on credit"
                : "Place order"}
            </button>

            {isWholesaler && (
              <button
                type="button"
                onClick={() => submitOrder("quote")}
                disabled={placing || hasBlockingIssue}
                className="mt-2 w-full rounded-lg border border-blue-200 bg-blue-50 px-6 py-2.5 text-sm font-semibold text-blue-800 hover:bg-blue-100 disabled:opacity-60"
              >
                Request a quote instead
              </button>
            )}

            <Link
              href="/cart"
              className="mt-2 block text-center text-sm font-medium text-brand-600 hover:underline"
            >
              Back to cart
            </Link>
          </div>
        </aside>
      </form>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  autoComplete,
  placeholder,
  className = "",
  required = true,
  inputMode,
}: {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  autoComplete?: string;
  placeholder?: string;
  className?: string;
  required?: boolean;
  inputMode?: "numeric" | "text";
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
      <input
        type="text"
        value={value}
        onChange={onChange}
        required={required}
        autoComplete={autoComplete}
        placeholder={placeholder}
        inputMode={inputMode}
        className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-brand-400 focus:bg-white focus:ring-2 focus:ring-brand-100"
      />
    </label>
  );
}

function PaymentOption({
  value,
  checked,
  onSelect,
  title,
  subtitle,
  disabled = false,
  disabledNote,
}: {
  value: string;
  checked: boolean;
  onSelect: () => void;
  title: string;
  subtitle: string;
  disabled?: boolean;
  disabledNote?: string;
}) {
  return (
    <label
      className={`flex items-center gap-3 rounded-lg border p-4 transition ${
        disabled
          ? "cursor-not-allowed border-slate-200 bg-slate-50 opacity-60"
          : checked
          ? "cursor-pointer border-brand-300 bg-brand-50"
          : "cursor-pointer border-slate-200 hover:bg-slate-50"
      }`}
    >
      <input
        type="radio"
        name="payment"
        value={value}
        checked={checked}
        onChange={onSelect}
        disabled={disabled}
        className="h-4 w-4 accent-brand-600"
      />
      <span>
        <span className="block text-sm font-semibold text-slate-800">{title}</span>
        <span className="block text-xs text-slate-500">
          {disabled && disabledNote ? disabledNote : subtitle}
        </span>
      </span>
    </label>
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
      <dt className="text-slate-500">{label}</dt>
      <dd className={`font-medium text-slate-800 ${valueClass}`}>{value}</dd>
    </div>
  );
}
