"use client";

import React, { createContext, useContext, useState, useRef, useCallback, useTransition } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Sparkles } from "lucide-react";
import gsap from "gsap";

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

  const pageContainerRef = useRef<HTMLDivElement | null>(null);
  const curtainRef = useRef<HTMLDivElement | null>(null);
  const emblemCardRef = useRef<HTMLDivElement | null>(null);
  const glowRef = useRef<HTMLDivElement | null>(null);

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

      const title = getPortalTitle(href);
      setTargetTitle(title);
      setIsTransitioning(true);

      const tl = gsap.timeline();

      // 1. Cinematic Exit Transition using GSAP
      if (pageContainerRef.current) {
        tl.to(pageContainerRef.current, {
          scale: 0.98,
          opacity: 0.3,
          filter: "blur(4px)",
          duration: 0.25,
          ease: "power2.inOut",
        });
      }

      if (curtainRef.current && emblemCardRef.current) {
        tl.to(
          curtainRef.current,
          {
            opacity: 1,
            pointerEvents: "auto",
            duration: 0.28,
            ease: "power3.out",
          },
          "-=0.15"
        );

        tl.fromTo(
          emblemCardRef.current,
          {
            scale: 0.85,
            opacity: 0,
            y: 20,
          },
          {
            scale: 1,
            opacity: 1,
            y: 0,
            duration: 0.35,
            ease: "back.out(1.5)",
          },
          "-=0.2"
        );
      }

      // 2. Perform router push during curtain cover
      setTimeout(() => {
        startTransition(() => {
          router.push(href);
        });

        // 3. Cinematic Enter Transition for new page
        setTimeout(() => {
          const enterTl = gsap.timeline({
            onComplete: () => {
              setIsTransitioning(false);
              if (pageContainerRef.current) {
                gsap.set(pageContainerRef.current, { clearProps: "all" });
              }
            },
          });

          if (emblemCardRef.current) {
            enterTl.to(emblemCardRef.current, {
              scale: 0.92,
              opacity: 0,
              y: -15,
              duration: 0.25,
              ease: "power2.in",
            });
          }

          if (curtainRef.current) {
            enterTl.to(
              curtainRef.current,
              {
                opacity: 0,
                pointerEvents: "none",
                duration: 0.35,
                ease: "power3.inOut",
              },
              "-=0.1"
            );
          }

          if (pageContainerRef.current) {
            enterTl.fromTo(
              pageContainerRef.current,
              {
                scale: 0.985,
                opacity: 0,
                y: 16,
                filter: "blur(4px)",
              },
              {
                scale: 1,
                opacity: 1,
                y: 0,
                filter: "blur(0px)",
                duration: 0.45,
                ease: "power3.out",
              },
              "-=0.2"
            );
          }
        }, 220);
      }, 250);
    },
    [pathname, router]
  );

  return (
    <PortalTransitionContext.Provider value={{ navigateTo, isTransitioning }}>
      {/* ── Main Outer Page Canvas ── */}
      <div ref={pageContainerRef} className="w-full min-h-screen will-change-transform">
        {children}
      </div>

      {/* ── GSAP-Controlled Emerald & Gold Silk Curtain Overlay ── */}
      <div
        ref={curtainRef}
        className="fixed inset-0 z-[8888] flex flex-col items-center justify-center opacity-0 pointer-events-none bg-slate-950/75 backdrop-blur-md transition-none"
      >
        {/* Ambient Radial Golden Aura */}
        <div
          ref={glowRef}
          className="absolute w-80 h-80 rounded-full bg-[#D4AF37]/20 blur-3xl animate-pulse pointer-events-none"
        />

        {/* Floating Emblem Card */}
        <div
          ref={emblemCardRef}
          className="relative z-10 flex flex-col items-center gap-3.5 px-7 py-5 rounded-2xl bg-black/80 border border-[#D4AF37]/45 shadow-2xl shadow-black/80"
        >
          <div className="h-11 w-11 rounded-2xl bg-gradient-to-tr from-[#F5D061] via-[#D4AF37] to-[#B8860B] flex items-center justify-center text-slate-950 shadow-lg shadow-[#D4AF37]/35 animate-bounce">
            <Sparkles className="h-5 w-5" />
          </div>

          <div className="text-center">
            <div className="text-[10px] font-extrabold uppercase tracking-widest text-[#F5D061]/90 mb-1">
              ✦ MEMBUKA PORTAL ✦
            </div>
            <div className="text-sm font-black text-white tracking-wide">
              {targetTitle || "Portal Layanan VTU"}
            </div>
          </div>

          {/* Golden Loading Bar */}
          <div className="w-36 h-1.5 bg-white/10 rounded-full overflow-hidden mt-1">
            <div className="h-full w-full bg-gradient-to-r from-[#F5D061] via-[#D4AF37] to-[#B8860B] animate-shimmer" />
          </div>
        </div>
      </div>
    </PortalTransitionContext.Provider>
  );
}
