"use client";

import { useEffect } from "react";

/**
 * Registers the PWA service worker on the client, in production only.
 *
 * In development the SW is intentionally NOT registered (and any previously
 * installed one is torn down) because aggressive caching fights Next's HMR and
 * makes edits appear not to land. Renders nothing.
 */
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    if (process.env.NODE_ENV !== "production") {
      // Ensure a stale dev SW never shadows the running dev server.
      navigator.serviceWorker
        .getRegistrations()
        .then((regs) => regs.forEach((r) => r.unregister()))
        .catch(() => {});
      return;
    }

    const onLoad = () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Registration failures are non-fatal — the app works without the SW.
      });
    };
    window.addEventListener("load", onLoad);
    return () => window.removeEventListener("load", onLoad);
  }, []);

  return null;
}
