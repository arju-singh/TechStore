import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "You're offline",
  robots: { index: false, follow: false },
};

/**
 * Offline fallback rendered by the service worker when a navigation fails with
 * no network. Kept deliberately self-contained (no data fetching) so it is safe
 * to precache.
 */
export default function OfflinePage() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center px-4 py-16 text-center">
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03]">
        <svg viewBox="0 0 24 24" fill="none" className="h-8 w-8 text-brand-400" stroke="currentColor" strokeWidth={1.8}>
          <path d="M1 1l22 22M16.72 11.06A10.94 10.94 0 0119 12.55M5 12.55a10.94 10.94 0 015.17-2.39M10.71 5.05A16 16 0 0122.58 9M1.42 9a15.91 15.91 0 014.7-2.88M8.53 16.11a6 6 0 016.95 0M12 20h.01" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <h1 className="text-2xl font-bold text-white sm:text-3xl">You&apos;re offline</h1>
      <p className="mt-2 max-w-md text-sm text-white/60">
        We couldn&apos;t reach the network. Check your connection — pages you&apos;ve
        already visited are still available, and everything will pick back up once
        you&apos;re reconnected.
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Link href="/" className="btn-primary">Back to home</Link>
        <Link href="/products" className="btn-ghost">Browse products</Link>
      </div>
    </div>
  );
}
