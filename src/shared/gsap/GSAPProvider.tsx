"use client";

import React, { createContext, useContext, useCallback, useTransition } from "react";
import Link from "next/link";
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
  const navigateTo = useCallback((href: string) => {
    startTransition(() => router.push(href));
  }, [router]);

  // Keep the current page visible while Next prepares the next route.
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
  ...props
}: React.AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string;
  children: React.ReactNode;
}) {
  return <Link href={href} {...props}>{children}</Link>;
}
