"use client";

import { useEffect, useState } from "react";
import { useOperationalStore } from "@/stores/operational-store";
import { Shield, Loader2 } from "lucide-react";

export function SplashScreen() {
  const isLoaded = useOperationalStore((s) => s.isLoaded);
  const loadAllData = useOperationalStore((s) => s.loadAllData);

  const [loadingText, setLoadingText] = useState("Menghubungkan ke server...");
  const [shouldRender, setShouldRender] = useState(true);
  const [isFadingOut, setIsFadingOut] = useState(false);

  // Cycle through loading texts to feel alive
  useEffect(() => {
    if (isLoaded) return;
    const texts = [
      "Menghubungkan ke server...",
      "Memuat data statistik...",
      "Sinkronisasi manifes & dokumen...",
      "Menganalisis kesiapan paket...",
      "Mempersiapkan dasbor...",
    ];
    let idx = 0;
    const interval = setInterval(() => {
      idx = (idx + 1) % texts.length;
      setLoadingText(texts[idx] || "");
    }, 600);

    return () => clearInterval(interval);
  }, [isLoaded]);

  // Handle initialization and minimum display duration (2.5 seconds)
  useEffect(() => {
    const startTime = Date.now();

    async function init() {
      try {
        await loadAllData();
      } catch (err) {
        console.error("Failed to load pre-fetch data:", err);
      } finally {
        const elapsedTime = Date.now() - startTime;
        const minDuration = 2500; // 2.5 seconds for visual aftereffect
        const delay = Math.max(0, minDuration - elapsedTime);

        setTimeout(() => {
          setIsFadingOut(true);
          setTimeout(() => {
            setShouldRender(false);
          }, 700); // match duration-700
        }, delay);
      }
    }

    if (!isLoaded) {
      init();
    } else {
      setShouldRender(false);
    }
  }, [isLoaded, loadAllData]);

  if (!shouldRender) return null;

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-gradient-to-br from-[#03150e] via-[#062118] to-[#010906] transition-opacity duration-700 ease-out ${
        isFadingOut ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
    >
      {/* Ambient background gold & green light glows */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-amber-400/5 rounded-full blur-[80px] pointer-events-none" />

      {/* Main Content Card container */}
      <div className="flex flex-col items-center text-center max-w-md px-6 select-none animate-in fade-in zoom-in-95 duration-1000">
        
        {/* Animated Gold Shield Emblem */}
        <div className="relative mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-tr from-[#D4AF37]/20 to-emerald-900/30 border border-[#D4AF37]/30 shadow-xl shadow-black/40 animate-pulse">
          <Shield className="h-10 w-10 text-[#F5D061]" />
          <div className="absolute inset-0 rounded-3xl border border-amber-400/20 animate-ping" />
        </div>

        {/* Text Logo: Shimmering Gold Gradient Title */}
        <h1 className="text-3xl font-black tracking-widest bg-gradient-to-r from-amber-200 via-amber-400 to-yellow-500 bg-clip-text text-transparent drop-shadow-md mb-2">
          VTU OPERASIONAL
        </h1>

        {/* Premium Sage Green Tagline */}
        <p className="text-[10px] uppercase font-bold tracking-[0.25em] text-emerald-400/60 mb-10">
          TRAVEL OPERATIONAL SYSTEM
        </p>

        {/* Loading Spinner & Status Text */}
        <div className="flex flex-col items-center gap-3 bg-black/20 backdrop-blur-md px-6 py-4 rounded-2xl border border-white/5 shadow-inner">
          <Loader2 className="h-5 w-5 animate-spin text-[#F5D061]" />
          <span className="text-xs text-emerald-100/75 font-semibold transition-all duration-300">
            {loadingText}
          </span>
        </div>

      </div>

      {/* Footer copyright */}
      <div className="absolute bottom-6 text-[9px] font-bold uppercase tracking-[0.3em] text-emerald-600/40">
        © VTU ABADI • ALL RIGHTS RESERVED
      </div>
    </div>
  );
}
