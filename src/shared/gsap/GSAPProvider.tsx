"use client";

import React, { createContext, useContext, useCallback, useTransition } from "react";
import { useRouter } from "next/navigation";

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
  const [isNavigating, startTransition] = useTransition();

  const navigateTo = useCallback(
    (href: string) => {
      if (typeof window === "undefined") return;
      const [targetPath] = href.split("?");
      if (window.location.pathname === targetPath && !href.includes("?")) return;

      startTransition(() => {
        router.push(href);
      });

      // Guard fallback: If Next.js App Router client transition fails to commit
      // (e.g. tree patch divergence across nested layout boundaries), guarantee seamless recovery.
      setTimeout(() => {
        if (window.location.pathname !== targetPath) {
          window.location.assign(href);
        }
      }, 350);
    },
    [router]
  );

  return (
    <GSAPTransitionContext.Provider value={{ navigateTo, isNavigating }}>
      {isNavigating && (
        <div role="status" aria-label="Membuka halaman" className="fixed inset-x-0 top-0 z-[10000] h-1 bg-emerald-100">
          <div className="h-full w-full animate-pulse bg-emerald-500 motion-reduce:animate-none" />
        </div>
      )}
      <div className="w-full min-h-screen">{children}</div>
    </GSAPTransitionContext.Provider>
  );
}

export function GSAPLink({
  href,
  children,
  onClick,
  ...props
}: React.AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { navigateTo } = useGSAPTransition();

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
    if (onClick) onClick(e);
    if (e.defaultPrevented) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

    e.preventDefault();
    navigateTo(href);
  };

  return (
    <a
      href={href}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      {...props}
    >
      {children}
    </a>
  );
}
