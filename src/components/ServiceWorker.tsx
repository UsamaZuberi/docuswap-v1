"use client";

import { useEffect } from "react";

export function ServiceWorker() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") return;
    const host = window.location.hostname;
    if (host === "localhost" || host === "127.0.0.1" || host === "0.0.0.0") return;

    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Swallow registration errors in client environments.
    });
  }, []);

  return null;
}
