"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { Product } from "@/lib/types";

export interface WishlistItem {
  slug: string;
  name: string;
  brand: string;
  image: string;
  price: number;
  mrp: number;
  stock: number;
}

const STORAGE_KEY = "techstore.wishlist.v1";

interface WishlistContextValue {
  items: WishlistItem[];
  count: number;
  ready: boolean;
  has: (slug: string) => boolean;
  toggle: (product: Product) => void;
  remove: (slug: string) => void;
  clear: () => void;
}

const WishlistContext = createContext<WishlistContextValue | null>(null);

function snapshot(p: Product): WishlistItem {
  return {
    slug: p.slug,
    name: p.name,
    brand: p.brand,
    image: p.image,
    price: p.price,
    mrp: p.mrp,
    stock: p.stock,
  };
}

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as WishlistItem[];
        if (Array.isArray(parsed)) setItems(parsed);
      }
    } catch {
      // ignore corrupt storage
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // non-fatal
    }
  }, [items, ready]);

  const has = useCallback(
    (slug: string) => items.some((i) => i.slug === slug),
    [items]
  );

  const toggle = useCallback((product: Product) => {
    setItems((prev) =>
      prev.some((i) => i.slug === product.slug)
        ? prev.filter((i) => i.slug !== product.slug)
        : [snapshot(product), ...prev]
    );
  }, []);

  const remove = useCallback((slug: string) => {
    setItems((prev) => prev.filter((i) => i.slug !== slug));
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const value = useMemo<WishlistContextValue>(
    () => ({ items, count: items.length, ready, has, toggle, remove, clear }),
    [items, ready, has, toggle, remove, clear]
  );

  return (
    <WishlistContext.Provider value={value}>
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist(): WishlistContextValue {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error("useWishlist must be used within a WishlistProvider");
  return ctx;
}
