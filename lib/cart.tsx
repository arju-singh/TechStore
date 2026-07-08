"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useState,
} from "react";
import type { PriceTier, Product, WholesaleConfig } from "@/lib/types";
import {
  computeTotals,
  priceLines,
  unitPriceFor,
  moqError,
  type PricingContext,
  type Totals as CartTotals,
} from "@/lib/pricing";
import { useAuth } from "@/lib/authClient";

export interface CartItem {
  slug: string;
  name: string;
  brand: string;
  image: string;
  price: number;
  mrp: number;
  stock: number;
  qty: number;
  /** Pricing metadata carried for display-time volume/wholesale math. */
  priceTiers?: PriceTier[];
  wholesale?: WholesaleConfig;
}

interface CartState {
  items: CartItem[];
}

type CartAction =
  | { type: "HYDRATE"; items: CartItem[] }
  | { type: "ADD"; product: Product; qty: number }
  | { type: "REMOVE"; slug: string }
  | { type: "SET_QTY"; slug: string; qty: number }
  | { type: "CLEAR" };

const STORAGE_KEY = "techstore.cart.v1";

function clampQty(qty: number, stock: number): number {
  const max = stock > 0 ? stock : 0;
  return Math.max(1, Math.min(qty, max || qty));
}

function reducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case "HYDRATE":
      return { items: action.items };

    case "ADD": {
      const { product, qty } = action;
      const existing = state.items.find((i) => i.slug === product.slug);
      if (existing) {
        return {
          items: state.items.map((i) =>
            i.slug === product.slug
              ? { ...i, qty: clampQty(i.qty + qty, product.stock) }
              : i
          ),
        };
      }
      const item: CartItem = {
        slug: product.slug,
        name: product.name,
        brand: product.brand,
        image: product.image,
        price: product.price,
        mrp: product.mrp,
        stock: product.stock,
        qty: clampQty(qty, product.stock),
        priceTiers: product.priceTiers,
        wholesale: product.wholesale,
      };
      return { items: [...state.items, item] };
    }

    case "SET_QTY":
      return {
        items: state.items
          .map((i) =>
            i.slug === action.slug
              ? { ...i, qty: clampQty(action.qty, i.stock) }
              : i
          )
          .filter((i) => i.qty > 0),
      };

    case "REMOVE":
      return { items: state.items.filter((i) => i.slug !== action.slug) };

    case "CLEAR":
      return { items: [] };

    default:
      return state;
  }
}

const COUPON_KEY = "techstore.coupon.v1";

/** A cart line enriched with the effective (buyer-aware) unit price for display. */
export interface PricedCartItem extends CartItem {
  /** Effective per-unit price for this quantity + buyer context. */
  unitPrice: number;
  /** unitPrice * qty. */
  lineTotal: number;
  /** How much cheaper than the retail unit price (0 if none). */
  unitSavings: number;
  /** Set when a wholesaler line is below the wholesale MOQ. */
  moqError: string | null;
}

interface CartContextValue {
  items: CartItem[];
  /** Lines enriched with effective pricing for display. */
  pricedItems: PricedCartItem[];
  totals: CartTotals;
  /** True once localStorage has been read — guards against SSR hydration flicker. */
  ready: boolean;
  /** True when the signed-in buyer is an approved wholesaler. */
  isWholesaler: boolean;
  /** True when any line blocks checkout (e.g. below wholesale MOQ). */
  hasBlockingIssue: boolean;
  addItem: (product: Product, qty?: number) => void;
  removeItem: (slug: string) => void;
  updateQty: (slug: string, qty: number) => void;
  clear: () => void;
  /** Applied coupon code, or null. */
  couponCode: string | null;
  couponError: string | null;
  applyCoupon: (code: string) => Promise<boolean>;
  removeCoupon: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const isWholesaler = Boolean(user?.isWholesaler);
  const [state, dispatch] = useReducer(reducer, { items: [] });
  const [ready, setReady] = useState(false);
  const [couponCode, setCouponCode] = useState<string | null>(null);
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [couponError, setCouponError] = useState<string | null>(null);

  // Load persisted cart + coupon once on mount.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const items = JSON.parse(raw) as CartItem[];
        if (Array.isArray(items)) dispatch({ type: "HYDRATE", items });
      }
      const savedCoupon = localStorage.getItem(COUPON_KEY);
      if (savedCoupon) setCouponCode(savedCoupon);
    } catch {
      // ignore corrupt storage
    }
    setReady(true);
  }, []);

  // Persist items on every change (after the initial hydrate).
  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.items));
    } catch {
      // storage full / unavailable — non-fatal
    }
  }, [state.items, ready]);

  // Re-validate the applied coupon whenever the cart or coupon changes, so the
  // discount always matches the current cart (and clears if it no longer
  // qualifies). The server is the source of truth for the amount.
  useEffect(() => {
    if (!ready) return;
    if (!couponCode) {
      setCouponDiscount(0);
      localStorage.removeItem(COUPON_KEY);
      return;
    }
    localStorage.setItem(COUPON_KEY, couponCode);
    if (state.items.length === 0) {
      setCouponDiscount(0);
      return;
    }
    let active = true;
    fetch("/api/coupons/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: couponCode,
        items: state.items.map((i) => ({ slug: i.slug, qty: i.qty })),
      }),
    })
      .then((r) => r.json())
      .then((res) => {
        if (!active) return;
        if (res.valid) {
          setCouponDiscount(res.discount);
          setCouponError(null);
        } else {
          // Cart no longer qualifies — drop the coupon.
          setCouponDiscount(0);
          setCouponCode(null);
          setCouponError(res.message ?? null);
        }
      })
      .catch(() => active && setCouponDiscount(0));
    return () => {
      active = false;
    };
  }, [couponCode, state.items, ready]);

  const ctx: PricingContext = useMemo(() => ({ isWholesaler }), [isWholesaler]);

  // Enrich each line with its effective (buyer-aware) unit price + MOQ status.
  const pricedItems = useMemo<PricedCartItem[]>(
    () =>
      state.items.map((item) => {
        const unitPrice = unitPriceFor(item, item.qty, ctx);
        return {
          ...item,
          unitPrice,
          lineTotal: unitPrice * item.qty,
          unitSavings: Math.max(0, item.price - unitPrice),
          moqError: moqError(item, item.qty, ctx, item.name),
        };
      }),
    [state.items, ctx]
  );

  const totals = useMemo<CartTotals>(
    () => computeTotals(priceLines(state.items.map((i) => ({ product: i, qty: i.qty })), ctx), couponDiscount),
    [state.items, ctx, couponDiscount]
  );

  const hasBlockingIssue = pricedItems.some((i) => i.moqError !== null);

  async function applyCoupon(code: string): Promise<boolean> {
    setCouponError(null);
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return false;
    try {
      const res = await fetch("/api/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: trimmed,
          items: state.items.map((i) => ({ slug: i.slug, qty: i.qty })),
        }),
      });
      const data = await res.json();
      if (data.valid) {
        setCouponCode(trimmed);
        setCouponDiscount(data.discount);
        setCouponError(null);
        return true;
      }
      setCouponError(data.message || "This coupon isn't valid.");
      return false;
    } catch {
      setCouponError("Couldn't apply coupon. Please try again.");
      return false;
    }
  }

  function removeCoupon() {
    setCouponCode(null);
    setCouponDiscount(0);
    setCouponError(null);
  }

  const value: CartContextValue = {
    items: state.items,
    pricedItems,
    totals,
    ready,
    isWholesaler,
    hasBlockingIssue,
    addItem: (product, qty = 1) => dispatch({ type: "ADD", product, qty }),
    removeItem: (slug) => dispatch({ type: "REMOVE", slug }),
    updateQty: (slug, qty) => dispatch({ type: "SET_QTY", slug, qty }),
    clear: () => {
      dispatch({ type: "CLEAR" });
      removeCoupon();
    },
    couponCode,
    couponError,
    applyCoupon,
    removeCoupon,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within a CartProvider");
  return ctx;
}
