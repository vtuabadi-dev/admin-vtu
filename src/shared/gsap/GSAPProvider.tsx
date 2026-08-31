"use client";

import React, {
  createContext,
  useContext,
  useRef,
  useState,
  useCallback,
  useTransition,
  useEffect,
} from "react";
import { useRouter, usePathname } from "next/navigation";
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
  const pageWrapperRef = useRef<HTMLDivElement | null>(null);
  const meltVeilRef = useRef<HTMLDivElement | null>(null);
  const isInitialRender = useRef(true);

  // ── GSAP Entrance Animation: Buttery Smooth Crossfade (Zero Layout Shift) ──
  useEffect(() => {
    if (!pageWrapperRef.current) return;

    const duration = isInitialRender.current ? 0.35 : 0.38;
    isInitialRender.current = false;

    const ctx = gsap.context(() => {
      // Clean, silky smooth opacity entrance with zero translation/scale jump
      gsap.fromTo(
        pageWrapperRef.current,
        {
          opacity: 0,
        },
        {
          opacity: 1,
          duration,
          ease: "power2.out",
          clearProps: "opacity",
        }
      );

      // Dissolve the ambient veil smoothly
      if (meltVeilRef.current) {
        gsap.to(meltVeilRef.current, {
          opacity: 0,
          duration: 0.3,
          ease: "power2.out",
          onComplete: () => {
            if (meltVeilRef.current) {
              meltVeilRef.current.style.pointerEvents = "none";
            }
          },
        });
      }
    }, pageWrapperRef);

    return () => ctx.revert();
  }, [pathname]);

  // ── GSAP Exit Animation: Smooth Seamless Fade (Zero Layout Shift) ──
  const navigateTo = useCallback(
    (href: string) => {
      if (href === pathname) return;

      setIsNavigating(true);

      const tl = gsap.timeline({
        onComplete: () => {
          startTransition(() => {
            router.push(href);
          });
          setIsNavigating(false);
        },
      });

      // Pure smooth opacity fade without jarring translation or scale jump
      if (pageWrapperRef.current) {
        tl.to(
          pageWrapperRef.current,
          {
            opacity: 0,
            duration: 0.24,
            ease: "power2.inOut",
          },
          0
        );
      }
    },
    [pathname, router, startTransition]
  );

  // ── Global Internal Link Interceptor for Seamless GSAP Transition ──
  useEffect(() => {
    const handleDocumentClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement)?.closest("a");
      if (!target) return;

      const href = target.getAttribute("href");
      if (!href) return;

      // Ignore external, hash links, mailto, tel, target=_blank, download, or modifier keys
      if (
        href.startsWith("http") ||
        href.startsWith("#") ||
        href.startsWith("mailto:") ||
        href.startsWith("tel:") ||
        target.target === "_blank" ||
        target.hasAttribute("download") ||
        e.metaKey ||
        e.ctrlKey ||
        e.shiftKey ||
        e.altKey
      ) {
        return;
      }

      // If it's an internal route link and not a same-page hash anchor
      if (href.startsWith("/")) {
        const cleanHref = href.split("?")[0] || "";
        const targetBase = cleanHref.split("#")[0] || "";
        const cleanPath = (pathname.split("?")[0] || "").split("#")[0] || "";
        if (targetBase === cleanPath && href.includes("#")) {
          return;
        }

        e.preventDefault();
        navigateTo(href);
      }
    };

    document.addEventListener("click", handleDocumentClick);
    return () => document.removeEventListener("click", handleDocumentClick);
  }, [navigateTo, pathname]);

  return (
    <GSAPTransitionContext.Provider value={{ navigateTo, isNavigating }}>
      {/* ── Ethereal Chromatic Liquid Melt Veil ── */}
      <div
        ref={meltVeilRef}
        aria-hidden="true"
        className="fixed inset-0 z-[9998] pointer-events-none opacity-0 overflow-hidden bg-slate-50/40 dark:bg-slate-950/40 backdrop-blur-2xl"
        style={{
          backgroundImage:
            "radial-gradient(circle at 25% 25%, rgba(16, 185, 129, 0.25) 0%, transparent 50%), " +
            "radial-gradient(circle at 75% 75%, rgba(245, 158, 11, 0.2) 0%, transparent 50%), " +
            "radial-gradient(circle at 50% 50%, rgba(6, 182, 212, 0.18) 0%, transparent 60%), " +
            "radial-gradient(circle at 80% 20%, rgba(139, 92, 246, 0.16) 0%, transparent 50%)",
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-tr from-emerald-500/10 via-amber-500/5 to-cyan-500/10 mix-blend-overlay" />
      </div>

      {/* ── Main Page Canvas with Hardware-Accelerated Smooth Transitions ── */}
      <div
        ref={pageWrapperRef}
        className="w-full min-h-screen"
      >
        {children}
      </div>
    </GSAPTransitionContext.Provider>
  );
}

// ── Drop-in Direct GSAP Navigation Link with Hover Prefetch ──
export function GSAPLink({
  href,
  children,
  className,
  onClick,
  ...props
}: React.AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string;
  children: React.ReactNode;
}) {
  const { navigateTo } = useGSAPTransition();
  const router = useRouter();

  const handleMouseEnter = () => {
    if (href && href.startsWith("/")) {
      try {
        router.prefetch(href);
      } catch {
        /* graceful */
      }
    }
  };

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
    <a
      href={href}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      className={className}
      {...props}
    >
      {children}
    </a>
  );
}
