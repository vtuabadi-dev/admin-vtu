"use client";

import React, { createContext, useContext, useRef, useState, useCallback, useTransition, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Compass, Sparkles } from "lucide-react";
import gsap from "gsap";

interface GSAPTransitionContextType {
  navigateTo: (href: string) => void;
  isNavigating: boolean;
}

const GSAPTransitionContext = createContext<GSAPTransitionContextType>({
  navigateTo: () => {},
  isNavigating: false,
});

export const useGSAPTransition = () => useContext(GSAPTransitionContext);

export function GSAPProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [, startTransition] = useTransition();

  const [isNavigating, setIsNavigating] = useState(false);
  const [destinationTitle, setDestinationTitle] = useState("");

  const pageWrapperRef = useRef<HTMLDivElement | null>(null);
  const curtainRef = useRef<HTMLDivElement | null>(null);
  const emblemRef = useRef<HTMLDivElement | null>(null);
  const goldStreakRef = useRef<HTMLDivElement | null>(null);
  const auraRef = useRef<HTMLDivElement | null>(null);

  const getTitle = (href: string) => {
    if (href.includes("badal-umroh")) return "Pendaftaran Badal Umroh";
    if (href.includes("wakaf-quran")) return "Pendaftaran Wakaf Al-Qur'an";
    if (href.includes("track")) return "Cek Status Badal & Wakaf";
    if (href.includes("register")) return "Registrasi Jamaah Umroh";
    if (href.includes("login")) return "Portal Utama";
    return "Portal Layanan VTU";
  };

  // ── Automatic GSAP Page Mount Animation on Route Change ──
  useEffect(() => {
    if (!pageWrapperRef.current) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        pageWrapperRef.current,
        {
          opacity: 0,
          y: 20,
          scale: 0.99,
          filter: "blur(4px)",
        },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          filter: "blur(0px)",
          duration: 0.5,
          ease: "power3.out",
          clearProps: "transform,filter",
        }
      );
    }, pageWrapperRef);

    return () => ctx.revert();
  }, [pathname]);

  // ── Programmatic GSAP Inter-Portal Transition ──
  const navigateTo = useCallback(
    (href: string) => {
      if (href === pathname) return;

      const title = getTitle(href);
      setDestinationTitle(title);
      setIsNavigating(true);

      const tl = gsap.timeline();

      // Phase 1: Current Page Retract & Blur
      if (pageWrapperRef.current) {
        tl.to(pageWrapperRef.current, {
          scale: 0.97,
          opacity: 0.2,
          filter: "blur(8px)",
          duration: 0.28,
          ease: "power2.inOut",
        });
      }

      // Phase 2: Luxury Curtain & Emblem Sweep
      if (curtainRef.current && emblemRef.current && goldStreakRef.current) {
        tl.to(
          curtainRef.current,
          {
            opacity: 1,
            pointerEvents: "auto",
            duration: 0.3,
            ease: "expo.out",
          },
          "-=0.18"
        );

        tl.fromTo(
          goldStreakRef.current,
          { scaleX: 0, opacity: 0 },
          { scaleX: 1, opacity: 1, duration: 0.35, ease: "power3.out" },
          "-=0.25"
        );

        tl.fromTo(
          emblemRef.current,
          {
            scale: 0.75,
            opacity: 0,
            y: 30,
            rotationX: 20,
          },
          {
            scale: 1,
            opacity: 1,
            y: 0,
            rotationX: 0,
            duration: 0.38,
            ease: "back.out(1.8)",
          },
          "-=0.3"
        );
      }

      // Phase 3: Route Push
      setTimeout(() => {
        startTransition(() => {
          router.push(href);
        });

        // Phase 4: Curtain Reveal & New Page Arrival
        setTimeout(() => {
          const enterTl = gsap.timeline({
            onComplete: () => {
              setIsNavigating(false);
              if (pageWrapperRef.current) {
                gsap.set(pageWrapperRef.current, { clearProps: "all" });
              }
            },
          });

          if (emblemRef.current) {
            enterTl.to(emblemRef.current, {
              scale: 0.88,
              opacity: 0,
              y: -25,
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
                duration: 0.38,
                ease: "power3.inOut",
              },
              "-=0.12"
            );
          }
        }, 180);
      }, 220);
    },
    [pathname, router]
  );

  return (
    <GSAPTransitionContext.Provider value={{ navigateTo, isNavigating }}>
      {/* Main Page Canvas */}
      <div ref={pageWrapperRef} className="w-full min-h-screen will-change-transform">
        {children}
      </div>

      {/* GSAP Obsidian-Emerald Silk Curtain */}
      <div
        ref={curtainRef}
        className="fixed inset-0 z-[8888] flex flex-col items-center justify-center opacity-0 pointer-events-none bg-gradient-to-b from-[#010805]/95 via-[#03140E]/95 to-[#010805]/95 backdrop-blur-xl transition-none"
      >
        {/* Top Molten Gold Streak */}
        <div
          ref={goldStreakRef}
          className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#F5D061] to-transparent origin-center shadow-[0_0_15px_rgba(245,208,97,0.9)] pointer-events-none"
        />

        {/* Ambient Gold Aura */}
        <div
          ref={auraRef}
          className="absolute w-[500px] h-[500px] rounded-full bg-[#D4AF37]/15 blur-3xl pointer-events-none animate-pulse"
        />

        {/* Floating Glassmorphic Emblem */}
        <div
          ref={emblemRef}
          className="relative z-10 flex flex-col items-center gap-3.5 px-8 py-6 rounded-3xl bg-black/85 border border-[#D4AF37]/50 shadow-[0_25px_70px_-15px_rgba(0,0,0,0.9),0_0_35px_rgba(212,175,55,0.25)]"
        >
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
            <div className="text-sm sm:text-base font-extrabold text-white tracking-wide">
              {destinationTitle || "Portal Layanan VTU"}
            </div>
          </div>

          {/* Micro Shimmer Line */}
          <div className="w-40 h-1.5 bg-white/10 rounded-full overflow-hidden mt-1 p-0.5 border border-[#D4AF37]/30">
            <div className="h-full w-full bg-gradient-to-r from-[#F5D061] via-[#D4AF37] to-[#B8860B] rounded-full animate-shimmer" />
          </div>
        </div>
      </div>
    </GSAPTransitionContext.Provider>
  );
}

// ── Drop-in GSAP Navigation Link Component ──
export function GSAPLink({
  href,
  children,
  className,
  onClick,
  ...props
}: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; children: React.ReactNode }) {
  const { navigateTo } = useGSAPTransition();

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
      if (onClick) onClick(e);
      return;
    }
    e.preventDefault();
    if (onClick) onClick(e);
    navigateTo(href);
  };

  return (
    <a href={href} onClick={handleClick} className={className} {...props}>
      {children}
    </a>
  );
}
