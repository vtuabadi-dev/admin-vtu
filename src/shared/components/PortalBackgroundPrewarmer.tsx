"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";

const CRITICAL_ROUTES = [
  "/login",
  "/register",
  "/register/badal-umroh",
  "/register/wakaf-quran",
  "/track/badal-wakaf",
];

const CRITICAL_IMAGES = [
  "/assets/portals/bg-umroh.jpg",
  "/assets/portals/bg-badal.jpg",
  "/assets/portals/bg-wakaf.jpg",
  "/assets/portals/bg-track.jpg",
];

export default function PortalBackgroundPrewarmer() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (pathname.startsWith("/admin") || pathname.startsWith("/jamaah")) return;

    // Optional warming must not compete with the active page's data and assets.
    const warm = () => {

      // 1. Prefetch All Portal Routes in Next.js Client Cache
      CRITICAL_ROUTES.forEach((route) => {
        try {
          router.prefetch(route);
        } catch {}
      });

      // 2. Preload & Decode Heavy Visual Assets (Backgrounds / Posters) in GPU memory
      CRITICAL_IMAGES.forEach((src) => {
        try {
          const img = new Image();
          img.src = src;
          if ("decode" in img) {
            img.decode().catch(() => {});
          }
        } catch {}
      });

    };
    if ("requestIdleCallback" in window) {
      const idleId = window.requestIdleCallback(warm);
      return () => window.cancelIdleCallback(idleId);
    }
    const timeoutId = setTimeout(warm, 2000);
    return () => clearTimeout(timeoutId);
  }, [router, pathname]);

  return null;
}
