"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { UserPlus, HeartHandshake, BookOpen, Search, ArrowLeft } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { GSAPLink } from "@/shared/gsap/GSAPProvider";

interface PortalTab {
  label: string;
  shortLabel: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const PORTAL_TABS: PortalTab[] = [
  {
    label: "Registrasi Jamaah",
    shortLabel: "Jamaah",
    href: "/register",
    icon: UserPlus,
  },
  {
    label: "Badal Umroh",
    shortLabel: "Badal",
    href: "/register/badal-umroh",
    icon: HeartHandshake,
  },
  {
    label: "Wakaf Al-Qur'an",
    shortLabel: "Wakaf",
    href: "/register/wakaf-quran",
    icon: BookOpen,
  },
  {
    label: "Cek Status",
    shortLabel: "Status",
    href: "/track/badal-wakaf",
    icon: Search,
  },
];

export default function PortalSwitcherNav({ className }: { className?: string }) {
  const pathname = usePathname();

  return (
    <div className={cn("w-full max-w-4xl mx-auto mb-6 px-3 sm:px-0", className)}>
      <div className="flex items-center justify-between gap-2 p-1.5 sm:p-2 rounded-2xl bg-black/40 backdrop-blur-xl border border-[#D4AF37]/35 shadow-xl shadow-black/20">
        
        {/* Back to Login button */}
        <GSAPLink
          href="/login"
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-white/80 hover:text-[#F5D061] hover:bg-white/10 transition-all active:scale-95 shrink-0"
          title="Kembali ke Halaman Login"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span className="hidden md:inline">Login</span>
        </GSAPLink>

        {/* Portal Switcher Tabs */}
        <div className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto no-scrollbar flex-1 justify-center">
          {PORTAL_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = pathname === tab.href;

            return (
              <GSAPLink
                key={tab.href}
                href={tab.href}
                className={cn(
                  "flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all duration-300 active:scale-95 whitespace-nowrap",
                  isActive
                    ? "bg-gradient-to-r from-[#F5D061] via-[#D4AF37] to-[#B8860B] text-slate-950 shadow-md shadow-[#D4AF37]/30 scale-100"
                    : "text-white/75 hover:text-white hover:bg-white/10"
                )}
              >
                <Icon className={cn("h-3.5 w-3.5 shrink-0", isActive ? "text-slate-950" : "text-[#F5D061]")} />
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden">{tab.shortLabel}</span>
              </GSAPLink>
            );
          })}
        </div>

      </div>
    </div>
  );
}
