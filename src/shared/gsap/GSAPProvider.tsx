"use client";

import React, { createContext, useContext, useRef, useState, useCallback, useTransition, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import gsap from "gsap";
import { cn } from "@/shared/lib/utils";

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

  // ── Pure Direct GSAP Page Entrance on Route Mount ──
  useEffect(() => {
    if (!pageWrapperRef.current) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        pageWrapperRef.current,
        {
          opacity: 0.4,
        },
        {
          opacity: 1,
          duration: 0.22,
          ease: "power2.out",
          clearProps: "opacity",
        }
      );
    }, pageWrapperRef);

    return () => ctx.revert();
  }, [pathname]);

  // ── Pure Direct GSAP Page Crossfade Transition ──
  const navigateTo = useCallback(
    (href: string) => {
      if (href === pathname) return;

      setIsNavigating(true);

      // Phase 1: Smooth direct page fade-out
      if (pageWrapperRef.current) {
        gsap.to(pageWrapperRef.current, {
          opacity: 0.4,
          duration: 0.12,
          ease: "power2.inOut",
          onComplete: () => {
            // Phase 2: Route Push
            startTransition(() => {
              router.push(href);
            });
            setIsNavigating(false);
          },
        });
      } else {
        startTransition(() => {
          router.push(href);
        });
        setIsNavigating(false);
      }
    },
    [pathname, router]
  );

  return (
    <GSAPTransitionContext.Provider value={{ navigateTo, isNavigating }}>
      {/* Direct Clean Page Canvas */}
      <div
        ref={pageWrapperRef}
        className={cn("w-full min-h-screen", isNavigating && "will-change-transform")}
      >
        {children}
      </div>
    </GSAPTransitionContext.Provider>
  );
}

// ── Drop-in Direct GSAP Navigation Link ──
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
