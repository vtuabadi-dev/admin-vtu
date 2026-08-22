"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const CRITICAL_ROUTES = [
  "/login",
  "/register",
  "/register/badal-umroh",
  "/register/wakaf-quran",
  "/track/badal-wakaf",
];

const CRITICAL_IMAGES = [
  "/images/bg-makkah-madinah-canvas.jpg",
  "/api/badal-umroh/background",
];

const CRITICAL_APIS = [
  "/api/master/harga-layanan",
];

export default function PortalBackgroundPrewarmer() {
  const router = useRouter();

  useEffect(() => {
    if (typeof window === "undefined") return;

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

    // 3. Pre-warm Public Form APIs (master harga layanan, etc.)
    CRITICAL_APIS.forEach((api) => {
      try {
        fetch(api, { method: "GET" }).catch(() => {});
      } catch {}
    });
  }, [router]);

  return null;
}
