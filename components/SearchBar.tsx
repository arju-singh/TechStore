"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { formatINR } from "@/lib/format";
import type { SearchSuggestions } from "@/lib/products";

const RECENT_KEY = "techstore:recent-searches";
const RECENT_MAX = 6;
const DEBOUNCE_MS = 180;

/** A single keyboard-navigable row in the dropdown. */
type Item =
  | { kind: "query"; label: string; href: string; term: string }
  | { kind: "product"; label: string; href: string; sub: string; image: string; price: number }
  | { kind: "category"; label: string; href: string }
  | { kind: "brand"; label: string; href: string; term: string }
  | { kind: "recent"; label: string; href: string; term: string }
  | { kind: "trending"; label: string; href: string; term: string };

const EMPTY: SearchSuggestions = {
  query: "",
  products: [],
  categories: [],
  brands: [],
  trending: [],
};

function loadRecent(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = JSON.parse(localStorage.getItem(RECENT_KEY) || "[]");
    return Array.isArray(raw) ? raw.filter((x) => typeof x === "string").slice(0, RECENT_MAX) : [];
  } catch {
    return [];
  }
}

function searchHref(term: string): string {
  return `/products?search=${encodeURIComponent(term)}`;
}

/** Bold the portion of `text` that matches `q` (case-insensitive, first hit). */
function highlight(text: string, q: string) {
  const query = q.trim();
  if (!query) return text;
  const i = text.toLowerCase().indexOf(query.toLowerCase());
  if (i === -1) return text;
  return (
    <>
      {text.slice(0, i)}
      <span className="font-semibold text-white">{text.slice(i, i + query.length)}</span>
      {text.slice(i + query.length)}
    </>
  );
}

export default function SearchBar({ className = "" }: { className?: string }) {
  const router = useRouter();
  const params = useSearchParams();

  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<SearchSuggestions>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(-1);
  const [recent, setRecent] = useState<string[]>([]);

  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Keep the input in sync with the URL when landing on /products?search=…
  useEffect(() => {
    setQ(params.get("search") ?? "");
  }, [params]);

  useEffect(() => {
    setRecent(loadRecent());
  }, []);

  // Debounced fetch of suggestions whenever the (open) query changes.
  useEffect(() => {
    if (!open) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      setLoading(true);
      try {
        const res = await fetch(`/api/search/suggestions?q=${encodeURIComponent(q.trim())}`, {
          signal: ctrl.signal,
        });
        if (!res.ok) throw new Error("bad status");
        const json: SearchSuggestions = await res.json();
        setData(json);
      } catch (err) {
        if ((err as Error)?.name !== "AbortError") setData(EMPTY);
      } finally {
        setLoading(false);
      }
    }, DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [q, open]);

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const persistRecent = useCallback((term: string) => {
    const t = term.trim();
    if (!t) return;
    const next = [t, ...loadRecent().filter((x) => x.toLowerCase() !== t.toLowerCase())].slice(
      0,
      RECENT_MAX
    );
    try {
      localStorage.setItem(RECENT_KEY, JSON.stringify(next));
    } catch {
      /* storage may be unavailable (private mode) — non-fatal */
    }
    setRecent(next);
  }, []);

  const clearRecent = useCallback(() => {
    try {
      localStorage.removeItem(RECENT_KEY);
    } catch {
      /* ignore */
    }
    setRecent([]);
  }, []);

  const hasQuery = q.trim().length > 0;

  // Flatten everything shown into one ordered list so Arrow keys traverse it.
  const items = useMemo<Item[]>(() => {
    const out: Item[] = [];
    if (hasQuery) {
      const term = q.trim();
      out.push({ kind: "query", label: term, href: searchHref(term), term });
      for (const p of data.products) {
        out.push({
          kind: "product",
          label: p.name,
          href: `/product/${p.slug}`,
          sub: p.brand,
          image: p.image,
          price: p.price,
        });
      }
      for (const c of data.categories) {
        out.push({ kind: "category", label: c.name, href: `/products?category=${c.slug}` });
      }
      for (const b of data.brands) {
        out.push({ kind: "brand", label: b, href: searchHref(b), term: b });
      }
    } else {
      for (const r of recent) out.push({ kind: "recent", label: r, href: searchHref(r), term: r });
      for (const t of data.trending)
        out.push({ kind: "trending", label: t, href: searchHref(t), term: t });
    }
    return out;
  }, [hasQuery, q, data, recent]);

  // Keep the active row valid as the list changes.
  useEffect(() => {
    setActive((a) => (a >= items.length ? items.length - 1 : a));
  }, [items.length]);

  const go = useCallback(
    (item: Item) => {
      if ("term" in item) persistRecent(item.term);
      setOpen(false);
      setActive(-1);
      inputRef.current?.blur();
      router.push(item.href);
    },
    [persistRecent, router]
  );

  function onFocus() {
    setOpen(true);
    // Prime the dropdown immediately so focus shows recent/trending or fresh hits.
    if (!hasQuery && data.trending.length === 0) {
      fetch(`/api/search/suggestions?q=`)
        .then((r) => r.json())
        .then((j: SearchSuggestions) => setData(j))
        .catch(() => {});
    }
  }

  // Run the current selection: a highlighted row if any, else a full-text search
  // for the typed query. Shared by Enter (keydown) and the submit button.
  const runSearch = useCallback(() => {
    if (active >= 0 && items[active]) {
      go(items[active]);
      return;
    }
    const term = q.trim();
    if (term) persistRecent(term);
    setOpen(false);
    setActive(-1);
    inputRef.current?.blur();
    router.push(term ? searchHref(term) : "/products");
  }, [active, items, q, go, persistRecent, router]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    runSearch();
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!open) setOpen(true);
      setActive((a) => (items.length === 0 ? -1 : (a + 1) % items.length));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => (items.length === 0 ? -1 : (a - 1 + items.length) % items.length));
    } else if (e.key === "Escape") {
      setOpen(false);
      setActive(-1);
    } else if (e.key === "Enter") {
      // Handle Enter explicitly rather than relying on implicit form submission,
      // so a highlighted row is honored and it works consistently.
      e.preventDefault();
      runSearch();
    }
  }

  const showPanel = open && (hasQuery ? true : recent.length > 0 || data.trending.length > 0);
  const listId = "search-suggest-list";
  const optId = (i: number) => `search-opt-${i}`;

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <form
        onSubmit={submit}
        className={`flex items-center gap-2.5 rounded-full border bg-white/5 px-4 py-2 transition ${
          showPanel ? "border-white/30 bg-white/[0.07]" : "border-white/10"
        } focus-within:border-white/30 focus-within:bg-white/[0.07]`}
        role="search"
      >
        <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 shrink-0 text-white/40" stroke="currentColor" strokeWidth={2.2}>
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" strokeLinecap="round" />
        </svg>
        <input
          ref={inputRef}
          type="text"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
            setActive(-1);
          }}
          onFocus={onFocus}
          onKeyDown={onKeyDown}
          placeholder="Search phones, laptops, audio…"
          aria-label="Search products"
          autoComplete="off"
          role="combobox"
          aria-expanded={showPanel}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={active >= 0 ? optId(active) : undefined}
          className="w-full bg-transparent text-sm text-white placeholder:text-white/40 outline-none"
        />
        {loading && hasQuery && (
          <span
            className="h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-white/20 border-t-brand-400"
            aria-hidden="true"
          />
        )}
        {q && (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => {
              setQ("");
              setActive(-1);
              inputRef.current?.focus();
            }}
            className="shrink-0 text-white/40 transition hover:text-white"
          >
            <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth={2.2}>
              <path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" />
            </svg>
          </button>
        )}
        <button type="submit" aria-label="Search" className="sr-only">
          Search
        </button>
      </form>

      {showPanel && (
        <div
          id={listId}
          role="listbox"
          aria-label="Search suggestions"
          className="absolute left-0 right-0 top-[calc(100%+8px)] z-50 max-h-[70vh] overflow-y-auto overscroll-contain rounded-2xl border border-white/10 bg-[#0e0e11] p-2 shadow-glow-lg"
        >
          {hasQuery ? (
            <>
              {/* Primary: run the full search */}
              <Row
                id={optId(0)}
                active={active === 0}
                onHover={() => setActive(0)}
                onSelect={() => items[0] && go(items[0])}
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/5 text-white/50">
                  <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth={2.2}>
                    <circle cx="11" cy="11" r="7" />
                    <path d="m20 20-3.5-3.5" strokeLinecap="round" />
                  </svg>
                </span>
                <span className="truncate text-sm text-white/80">
                  Search for “<span className="font-semibold text-white">{q.trim()}</span>”
                </span>
              </Row>

              {data.products.length > 0 && <SectionLabel>Products</SectionLabel>}
              {data.products.map((p, idx) => {
                const i = 1 + idx;
                return (
                  <Row
                    key={p.slug}
                    id={optId(i)}
                    active={active === i}
                    onHover={() => setActive(i)}
                    onSelect={() => go(items[i])}
                  >
                    <span className="relative h-9 w-9 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-white">
                      <Image src={p.image} alt="" fill sizes="36px" className="object-contain p-1" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm text-white/90">
                        {highlight(p.name, q)}
                      </span>
                      <span className="block truncate text-xs text-white/40">{p.brand}</span>
                    </span>
                    <span className="shrink-0 text-sm font-semibold text-white/90">
                      {formatINR(p.price)}
                    </span>
                  </Row>
                );
              })}

              {data.categories.length > 0 && <SectionLabel>Categories</SectionLabel>}
              {data.categories.map((c, idx) => {
                const i = 1 + data.products.length + idx;
                return (
                  <Row
                    key={c.slug}
                    id={optId(i)}
                    active={active === i}
                    onHover={() => setActive(i)}
                    onSelect={() => go(items[i])}
                  >
                    <TagIcon />
                    <span className="truncate text-sm text-white/80">{highlight(c.name, q)}</span>
                    <span className="ml-auto shrink-0 text-xs text-white/30">in Categories</span>
                  </Row>
                );
              })}

              {data.brands.length > 0 && <SectionLabel>Brands</SectionLabel>}
              {data.brands.map((b, idx) => {
                const i = 1 + data.products.length + data.categories.length + idx;
                return (
                  <Row
                    key={b}
                    id={optId(i)}
                    active={active === i}
                    onHover={() => setActive(i)}
                    onSelect={() => go(items[i])}
                  >
                    <TagIcon />
                    <span className="truncate text-sm text-white/80">{highlight(b, q)}</span>
                    <span className="ml-auto shrink-0 text-xs text-white/30">Brand</span>
                  </Row>
                );
              })}

              {!loading &&
                data.products.length === 0 &&
                data.categories.length === 0 &&
                data.brands.length === 0 && (
                  <p className="px-3 py-4 text-center text-sm text-white/40">
                    No matches — press Enter to search all products.
                  </p>
                )}
            </>
          ) : (
            <>
              {recent.length > 0 && (
                <>
                  <div className="flex items-center justify-between px-3 pt-1">
                    <SectionLabel inline>Recent</SectionLabel>
                    <button
                      type="button"
                      onClick={clearRecent}
                      className="text-xs text-white/40 transition hover:text-white/70"
                    >
                      Clear
                    </button>
                  </div>
                  {recent.map((r, idx) => (
                    <Row
                      key={`r-${r}`}
                      id={optId(idx)}
                      active={active === idx}
                      onHover={() => setActive(idx)}
                      onSelect={() => go(items[idx])}
                    >
                      <ClockIcon />
                      <span className="truncate text-sm text-white/80">{r}</span>
                    </Row>
                  ))}
                </>
              )}

              {data.trending.length > 0 && (
                <>
                  <SectionLabel>Trending</SectionLabel>
                  <div className="flex flex-wrap gap-2 px-2 pb-1 pt-0.5">
                    {data.trending.map((t, idx) => {
                      const i = recent.length + idx;
                      return (
                        <button
                          key={`t-${t}`}
                          type="button"
                          id={optId(i)}
                          role="option"
                          aria-selected={active === i}
                          onMouseEnter={() => setActive(i)}
                          onClick={() => go(items[i])}
                          className={`rounded-full border px-3 py-1.5 text-xs transition ${
                            active === i
                              ? "border-brand-400/60 bg-brand-400/10 text-white"
                              : "border-white/10 bg-white/5 text-white/70 hover:border-white/25 hover:text-white"
                          }`}
                        >
                          {t}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function Row({
  id,
  active,
  onHover,
  onSelect,
  children,
}: {
  id: string;
  active: boolean;
  onHover: () => void;
  onSelect: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      id={id}
      role="option"
      aria-selected={active}
      onMouseEnter={onHover}
      // onMouseDown (not onClick) so selection fires before the input's blur closes the panel.
      onMouseDown={(e) => {
        e.preventDefault();
        onSelect();
      }}
      className={`flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2 transition ${
        active ? "bg-white/10" : "hover:bg-white/[0.06]"
      }`}
    >
      {children}
    </div>
  );
}

function SectionLabel({ children, inline }: { children: React.ReactNode; inline?: boolean }) {
  return (
    <div
      className={`px-3 text-[11px] font-semibold uppercase tracking-wide text-white/30 ${
        inline ? "" : "pb-1 pt-2"
      }`}
    >
      {children}
    </div>
  );
}

function TagIcon() {
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/5 text-white/40">
      <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth={2}>
        <path d="M20.59 13.41 12 22l-9-9V4a1 1 0 0 1 1-1h9l7.59 7.59a2 2 0 0 1 0 2.82Z" strokeLinejoin="round" />
        <circle cx="7.5" cy="7.5" r="1.2" fill="currentColor" />
      </svg>
    </span>
  );
}

function ClockIcon() {
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/5 text-white/40">
      <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth={2}>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}
