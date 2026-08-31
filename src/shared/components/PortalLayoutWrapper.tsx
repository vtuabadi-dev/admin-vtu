"use client";

import React from "react";
import { cn } from "@/shared/lib/utils";

interface PortalLayoutWrapperProps {
  children: React.ReactNode;
  className?: string;
}

export default function PortalLayoutWrapper({ children, className }: PortalLayoutWrapperProps) {
  return (
    <div className="relative min-h-[100dvh] bg-[#07120f] text-[#f7f4ea] font-sans overflow-x-hidden portal-theme">
      {/* ── Fixed Islamic Luxury Poster Backdrop (Identical to Login Page) ── */}
      <div
        className="fixed inset-0 z-0 pointer-events-none bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `linear-gradient(90deg, rgba(4, 13, 10, 0.95) 0%, rgba(4, 13, 10, 0.82) 43%, rgba(4, 13, 10, 0.35) 100%), linear-gradient(0deg, rgba(4, 13, 10, 0.65), transparent 50%), url("/images/kaaba-makkah.jpg")`,
        }}
        aria-hidden="true"
      />

      {/* ── Ambient Radial Glows & Golden Light Particles ── */}
      <div
        className="fixed -right-16 top-10 w-[42vw] h-[42vw] rounded-full bg-[#d8b15b]/10 blur-[90px] pointer-events-none z-[1]"
        aria-hidden="true"
      />
      <div
        className="fixed left-10 bottom-10 w-[35vw] h-[35vw] rounded-full bg-[#10b981]/10 blur-[90px] pointer-events-none z-[1]"
        aria-hidden="true"
      />

      {/* ── Outer Golden Aesthetic Frame ── */}
      <div
        className="fixed inset-3 sm:inset-4 rounded-[26px] sm:rounded-[30px] border border-[#d8b15b]/25 pointer-events-none z-[2]"
        aria-hidden="true"
      />

      {/* ── Foreground Main Portal Content ── */}
      <main className={cn("relative z-10 w-full max-w-4xl mx-auto px-3 sm:px-6 py-6 sm:py-10", className)}>
        {children}

        {/* ── Footer Blessing (Identical to Login Page) ── */}
        <footer className="mt-12 text-center pb-8 select-none">
          <span className="text-[#f0d99a] font-serif text-xl sm:text-2xl block tracking-wider drop-shadow-sm">
            خَتَمَ اللهُ لَنَا وَلَكُمْ بِالْخَيْرِ
          </span>
          <p className="text-xs text-[#f7f4ea]/60 mt-1.5 font-medium tracking-wide">
            Semoga Allah menerima amal ibadah kita semua.
          </p>
        </footer>
      </main>
    </div>
  );
}
