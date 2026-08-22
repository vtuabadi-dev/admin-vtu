"use client";

import React, { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

export default function PageTransitionWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [displayKey, setDisplayKey] = useState(pathname);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;

    if (pathname !== displayKey) {
      setIsTransitioning(true);
      timer = setTimeout(() => {
        setDisplayKey(pathname);
        setIsTransitioning(false);
      }, 50);
    }

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [pathname, displayKey]);

  return (
    <div className="relative min-h-screen w-full">
      {/* Sleek Golden Top Progress Glow Bar */}
      {isTransitioning && (
        <div className="fixed top-0 left-0 right-0 z-50 h-[3px] bg-gradient-to-r from-[#D4AF37] via-[#F5D061] to-[#B8860B] shadow-[0_0_12px_rgba(245,208,97,0.8)] animate-pulse pointer-events-none" />
      )}

      {/* Smooth Animated Content Canvas */}
      <div
        key={displayKey}
        className="w-full min-h-screen animate-portal-fade-in"
      >
        {children}
      </div>
    </div>
  );
}
