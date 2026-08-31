"use client";

import React from "react";
import { cn } from "@/shared/lib/utils";

interface PortalLayoutWrapperProps {
  children: React.ReactNode;
  className?: string;
}

export default function PortalLayoutWrapper({ children, className }: PortalLayoutWrapperProps) {
  return (
    <div className="relative min-h-[100dvh] bg-[#f7f9f7] text-slate-850 font-sans overflow-x-hidden portal-theme">
      {/* ── Fixed Islamic Luxury Poster Backdrop (Bright Daylight Aesthetic) ── */}
      <div
        className="fixed inset-0 z-0 pointer-events-none bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `linear-gradient(180deg, rgba(247, 249, 247, 0.94) 0%, rgba(240, 246, 242, 0.92) 50%, rgba(245, 248, 245, 0.96) 100%), url("/images/kaaba-makkah.jpg")`,
        }}
        aria-hidden="true"
      />

      {/* ── Ambient Radial Warm Glows ── */}
      <div
        className="fixed -right-16 top-10 w-[42vw] h-[42vw] rounded-full bg-amber-400/10 blur-[90px] pointer-events-none z-[1]"
        aria-hidden="true"
      />
      <div
        className="fixed left-10 bottom-10 w-[35vw] h-[35vw] rounded-full bg-emerald-500/10 blur-[90px] pointer-events-none z-[1]"
        aria-hidden="true"
      />

      {/* ── Outer Golden Aesthetic Frame ── */}
      <div
        className="fixed inset-3 sm:inset-4 rounded-[26px] sm:rounded-[30px] border border-[#d8b15b]/40 pointer-events-none z-[2]"
        aria-hidden="true"
      />

      {/* ── Foreground Main Portal Content ── */}
      <main className={cn("relative z-10 w-full max-w-4xl mx-auto px-3 sm:px-6 py-6 sm:py-10", className)}>
        {children}

        {/* ── Footer Blessing ── */}
        <footer className="mt-12 text-center pb-8 select-none">
          <span className="text-[#967117] font-serif text-xl sm:text-2xl block tracking-wider drop-shadow-xs font-bold">
            خَتَمَ اللهُ لَنَا وَلَكُمْ بِالْخَيْرِ
          </span>
          <p className="text-xs text-slate-500 mt-1.5 font-medium tracking-wide">
            Semoga Allah menerima amal ibadah kita semua.
          </p>
        </footer>
      </main>
    </div>
  );
}
