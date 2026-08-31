"use client";

import React from "react";
import { cn } from "@/shared/lib/utils";

interface PortalLayoutWrapperProps {
  children: React.ReactNode;
  className?: string;
}

export default function PortalLayoutWrapper({ children, className }: PortalLayoutWrapperProps) {
  return (
    <div className="relative min-h-[100dvh] bg-[#07120f] font-sans overflow-x-hidden portal-theme">
      {/* ── Fixed Crystal-Clear Kaaba Makkah Backdrop ── */}
      <div
        className="fixed inset-0 z-0 pointer-events-none bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `linear-gradient(180deg, rgba(0, 0, 0, 0.22) 0%, rgba(0, 0, 0, 0.08) 45%, rgba(0, 0, 0, 0.35) 100%), url("/images/kaaba-makkah.jpg")`,
        }}
        aria-hidden="true"
      />

      {/* ── Ambient Radial Warm Glows ── */}
      <div
        className="fixed -right-16 top-10 w-[42vw] h-[42vw] rounded-full bg-amber-400/15 blur-[90px] pointer-events-none z-[1]"
        aria-hidden="true"
      />
      <div
        className="fixed left-10 bottom-10 w-[35vw] h-[35vw] rounded-full bg-emerald-500/15 blur-[90px] pointer-events-none z-[1]"
        aria-hidden="true"
      />

      {/* ── Outer Golden Aesthetic Frame ── */}
      <div
        className="fixed inset-3 sm:inset-4 rounded-[26px] sm:rounded-[30px] border border-[#d8b15b]/45 pointer-events-none z-[2]"
        aria-hidden="true"
      />

      {/* ── Foreground Main Portal Content ── */}
      <main className={cn("relative z-10 w-full max-w-4xl mx-auto px-3 sm:px-6 py-6 sm:py-10", className)}>
        {children}

        {/* ── Footer Blessing ── */}
        <footer className="mt-12 text-center pb-8 select-none">
          <span className="text-[#f5d061] font-serif text-xl sm:text-2xl block tracking-wider drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] font-bold">
            خَتَمَ اللهُ لَنَا وَلَكُمْ بِالْخَيْرِ
          </span>
          <p className="text-xs text-white/85 mt-1.5 font-medium tracking-wide drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
            Semoga Allah menerima amal ibadah kita semua.
          </p>
        </footer>
      </main>
    </div>
  );
}
