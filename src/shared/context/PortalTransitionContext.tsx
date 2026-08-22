"use client";

import React, { createContext, useContext, useState, useRef, useCallback, useTransition } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Compass, Sparkles } from "lucide-react";
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
  const goldStripeRef = useRef<HTMLDivElement | null>(null);
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

      // 1. GSAP Luxury Exit: Camera Pushback & Satin Curtain Rise
      if (pageContainerRef.current) {
        tl.to(pageContainerRef.current, {
          scale: 0.975,
          opacity: 0.25,
          filter: "blur(6px)",
          duration: 0.3,
          ease: "power2.inOut",
        });
      }

      if (curtainRef.current && emblemCardRef.current && goldStripeRef.current) {
        tl.to(
          curtainRef.current,
          {
            opacity: 1,
            pointerEvents: "auto",
            duration: 0.32,
            ease: "expo.out",
          },
          "-=0.2"
        );

        tl.fromTo(
          goldStripeRef.current,
          { scaleX: 0, opacity: 0 },
          { scaleX: 1, opacity: 1, duration: 0.4, ease: "power3.out" },
          "-=0.25"
        );

        tl.fromTo(
          emblemCardRef.current,
          {
            scale: 0.8,
            opacity: 0,
            y: 25,
            rotationX: 15,
          },
          {
            scale: 1,
            opacity: 1,
            y: 0,
            rotationX: 0,
            duration: 0.4,
            ease: "back.out(1.7)",
          },
          "-=0.3"
        );
      }

      // 2. Client Route Push
      setTimeout(() => {
        startTransition(() => {
          router.push(href);
        });

        // 3. GSAP Luxury Enter: Curtain Reveal & Smooth Focus
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
              scale: 0.9,
              opacity: 0,
              y: -20,
              duration: 0.28,
              ease: "power2.in",
            });
          }

          if (curtainRef.current) {
            enterTl.to(
              curtainRef.current,
              {
                opacity: 0,
                pointerEvents: "none",
                duration: 0.4,
                ease: "power3.inOut",
              },
              "-=0.15"
            );
          }

          if (pageContainerRef.current) {
            enterTl.fromTo(
              pageContainerRef.current,
              {
                scale: 0.985,
                opacity: 0,
                y: 18,
                filter: "blur(5px)",
              },
              {
                scale: 1,
                opacity: 1,
                y: 0,
                filter: "blur(0px)",
                duration: 0.5,
                ease: "power3.out",
              },
              "-=0.25"
            );
          }
        }, 200);
      }, 240);
    },
    [pathname, router]
  );

  return (
    <PortalTransitionContext.Provider value={{ navigateTo, isTransitioning }}>
      {/* ── Main Outer Page Canvas ── */}
      <div ref={pageContainerRef} className="w-full min-h-screen will-change-transform">
        {children}
      </div>

      {/* ── GSAP Luxury Emerald-Obsidian Curtain Overlay ── */}
      <div
        ref={curtainRef}
        className="fixed inset-0 z-[8888] flex flex-col items-center justify-center opacity-0 pointer-events-none bg-gradient-to-b from-[#020B08]/90 via-[#041710]/95 to-[#020B08]/90 backdrop-blur-xl transition-none"
      >
        {/* Top Molten Gold Streak */}
        <div
          ref={goldStripeRef}
          className="absolute top-0 left-0 right-0 h-[2.5px] bg-gradient-to-r from-transparent via-[#F5D061] to-transparent origin-center shadow-[0_0_15px_rgba(245,208,97,0.9)] pointer-events-none"
        />

        {/* Ambient Radial Golden Aura */}
        <div
          ref={glowRef}
          className="absolute w-96 h-96 rounded-full bg-[#D4AF37]/25 blur-3xl animate-pulse pointer-events-none"
        />

        {/* Floating High-End Glass Emblem Card */}
        <div
          ref={emblemCardRef}
          className="relative z-10 flex flex-col items-center gap-3.5 px-8 py-6 rounded-3xl bg-black/85 border border-[#D4AF37]/50 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.9),0_0_30px_rgba(212,175,55,0.2)]"
        >
          {/* Animated Gold Icon with Shimmer */}
          <div className="relative">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-[#F5D061] via-[#D4AF37] to-[#B8860B] flex items-center justify-center text-slate-950 shadow-lg shadow-[#D4AF37]/40">
              <Compass className="h-6 w-6 animate-spin-slow text-slate-950" />
            </div>
            <div className="absolute -top-1 -right-1 text-[#F5D061] animate-ping">
              <Sparkles className="h-4 w-4" />
            </div>
          </div>

          <div className="text-center space-y-0.5">
            <div className="text-[10px] font-black uppercase tracking-[0.25em] text-transparent bg-clip-text bg-gradient-to-r from-[#F5D061] via-[#D4AF37] to-[#B8860B]">
              ✦ MEMBUKA LAYANAN ✦
            </div>
            <div className="text-sm sm:text-base font-extrabold text-white tracking-wide drop-shadow-sm">
              {targetTitle || "Portal Layanan VTU"}
            </div>
          </div>

          {/* Luxury Micro Progress Line */}
          <div className="w-40 h-1.5 bg-white/10 rounded-full overflow-hidden mt-1 p-0.5 border border-[#D4AF37]/30">
            <div className="h-full w-full bg-gradient-to-r from-[#F5D061] via-[#D4AF37] to-[#B8860B] rounded-full animate-shimmer" />
          </div>
        </div>
      </div>
    </PortalTransitionContext.Provider>
  );
}
