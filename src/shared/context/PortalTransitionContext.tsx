"use client";

import React, { createContext, useContext, useState, useCallback, useTransition } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Sparkles } from "lucide-react";

interface PortalTransitionContextType {
  navigateTo: (href: string) => void;
  isTransitioning: boolean;
}

const PortalTransitionContext = createContext<PortalTransitionContextType>({
  navigateTo: () => {},
  isTransitioning: false,
});

export const usePortalTransition = () => useContext(PortalTransitionContext);

export function PortalTransitionProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [, startTransition] = useTransition();

  const [isTransitioning, setIsTransitioning] = useState(false);
  const [targetTitle, setTargetTitle] = useState<string>("");

  const getPortalTitle = (href: string) => {
    if (href.includes("badal-umroh")) return "Pendaftaran Badal Umroh";
    if (href.includes("wakaf-quran")) return "Pendaftaran Wakaf Al-Qur'an";
    if (href.includes("track")) return "Portal Cek Status Badal & Wakaf";
    if (href.includes("register")) return "Portal Registrasi Jamaah Umroh";
    if (href.includes("login")) return "Portal Utama / Sign In";
    return "Portal Layanan VTU";
  };

  const navigateTo = useCallback(
    (href: string) => {
      if (href === pathname) return;

      setTargetTitle(getPortalTitle(href));
      setIsTransitioning(true);

      // Short cinematic anticipation delay to allow exit animation
      setTimeout(() => {
        startTransition(() => {
          router.push(href);
        });

        // Softly resolve transition after new page renders
        setTimeout(() => {
          setIsTransitioning(false);
        }, 320);
      }, 200);
    },
    [pathname, router]
  );

  return (
    <PortalTransitionContext.Provider value={{ navigateTo, isTransitioning }}>
      {/* ── Outer Page Canvas with Smooth Scale/Blur Response ── */}
      <div
        className={`w-full min-h-screen transition-all duration-300 ease-out ${
          isTransitioning ? "scale-[0.985] opacity-40 blur-[2px] pointer-events-none" : "scale-100 opacity-100 blur-0"
        }`}
      >
        {children}
      </div>

      {/* ── Cinematic Emerald & Gold Soft Translucent Curtain ── */}
      <div
        className={`fixed inset-0 z-[8888] flex flex-col items-center justify-center pointer-events-none transition-all duration-300 ease-out ${
          isTransitioning
            ? "opacity-100 backdrop-blur-md bg-slate-950/60"
            : "opacity-0 backdrop-blur-none bg-slate-950/0"
        }`}
      >
        {/* Ambient Golden Radial Glow */}
        <div className="absolute w-72 h-72 rounded-full bg-[#D4AF37]/15 blur-3xl animate-pulse pointer-events-none" />

        {/* Floating Golden Emblem Card */}
        <div
          className={`relative z-10 flex flex-col items-center gap-3 px-6 py-4 rounded-2xl bg-black/70 border border-[#D4AF37]/40 shadow-2xl shadow-black/60 transition-all duration-300 transform ${
            isTransitioning ? "scale-100 translate-y-0 opacity-100" : "scale-90 translate-y-3 opacity-0"
          }`}
        >
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-[#F5D061] via-[#D4AF37] to-[#B8860B] flex items-center justify-center text-slate-950 shadow-md shadow-[#D4AF37]/30 animate-spin-slow">
            <Sparkles className="h-5 w-5" />
          </div>

          <div className="text-center">
            <div className="text-[10px] font-extrabold uppercase tracking-widest text-[#F5D061]/90 mb-0.5">
              ✦ Menyiapkan Halaman ✦
            </div>
            <div className="text-xs sm:text-sm font-bold text-white tracking-wide">
              {targetTitle || "Portal Layanan VTU"}
            </div>
          </div>

          {/* Golden Micro Progress Line */}
          <div className="w-32 h-1 bg-white/10 rounded-full overflow-hidden mt-1">
            <div className="h-full w-full bg-gradient-to-r from-[#F5D061] via-[#D4AF37] to-[#B8860B] animate-shimmer" />
          </div>
        </div>
      </div>
    </PortalTransitionContext.Provider>
  );
}
