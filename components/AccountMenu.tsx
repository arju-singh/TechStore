"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/authClient";

export default function AccountMenu() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  if (loading) {
    return <div className="h-9 w-20 animate-pulse rounded bg-white/[0.02]/10" />;
  }

  if (!user) {
    return (
      <Link
        href="/login"
        className="rounded border border-transparent px-2 py-1.5 leading-tight text-white hover:border-white"
      >
        <span className="block text-xs text-white/80">Hello, sign in</span>
        <span className="block text-sm font-bold">Account &amp; Lists</span>
      </Link>
    );
  }

  const initial = user.name.trim().charAt(0).toUpperCase() || "U";

  async function handleLogout() {
    await logout();
    setOpen(false);
    router.push("/");
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded border border-transparent px-2 py-1.5 leading-tight text-white hover:border-white"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span className="hidden text-left sm:block">
          <span className="block text-xs text-white/80">
            Hello, {user.name.split(" ")[0]}
          </span>
          <span className="block text-sm font-bold">Account &amp; Lists</span>
        </span>
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-amz-orange text-xs font-bold text-ink sm:hidden">
          {initial}
        </span>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-56 overflow-hidden rounded-xl border border-white/10 bg-white/[0.02] shadow-lg"
        >
          <div className="border-b border-white/10 px-4 py-3">
            <p className="truncate text-sm font-semibold text-white/80">
              {user.name}
            </p>
            <p className="truncate text-xs text-white/50">{user.email}</p>
            {user.isWholesaler && (
              <span className="mt-1.5 inline-block rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700">
                Wholesale account
              </span>
            )}
          </div>
          <Link
            href="/account"
            onClick={() => setOpen(false)}
            className="block px-4 py-2.5 text-sm text-white/70 hover:bg-white/5"
            role="menuitem"
          >
            My account
          </Link>
          <Link
            href={user.isWholesaler ? "/wholesale" : "/become-a-wholesaler"}
            onClick={() => setOpen(false)}
            className="block px-4 py-2.5 text-sm text-white/70 hover:bg-white/5"
            role="menuitem"
          >
            {user.isWholesaler ? "Wholesale portal" : "Become a wholesaler"}
          </Link>
          {user.role === "admin" && (
            <Link
              href="/admin"
              onClick={() => setOpen(false)}
              className="block px-4 py-2.5 text-sm text-white/70 hover:bg-white/5"
              role="menuitem"
            >
              Admin panel
            </Link>
          )}
          <button
            onClick={handleLogout}
            className="block w-full px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50"
            role="menuitem"
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
