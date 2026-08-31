"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { HeartHandshake, BookOpen, Search } from "lucide-react";
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
    <div className={cn("w-full max-w-xl mx-auto mb-6 px-3 sm:px-0", className)}>
      <div className="flex items-center justify-center gap-1.5 sm:gap-2 p-1.5 sm:p-2 rounded-2xl bg-gradient-to-r from-[#061e16]/85 via-[#041610]/90 to-[#061e16]/85 backdrop-blur-xl border-t border-t-amber-400/40 border-b border-b-black/80 border-x border-x-amber-400/20 shadow-[inset_0_1px_1px_rgba(255,255,255,0.18),inset_0_-1px_2px_rgba(0,0,0,0.6),0_12px_32px_rgba(0,0,0,0.65)]">
        <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar justify-center w-full">
          {PORTAL_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = pathname === tab.href;

            return (
              <GSAPLink
                key={tab.href}
                href={tab.href}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all duration-300 active:scale-95 whitespace-nowrap",
                  isActive
                    ? "bg-gradient-to-r from-[#e5b23e] via-[#d4a029] to-[#bf8818] text-[#061a13] font-black border-t border-t-white/40 shadow-[inset_0_1px_1px_rgba(255,255,255,0.35),0_4px_16px_rgba(216,177,91,0.35)] scale-100"
                    : "text-amber-100/75 hover:text-amber-300 hover:bg-emerald-950/50"
                )}
              >
                <Icon className={cn("h-4 w-4 shrink-0", isActive ? "text-[#061a13]" : "text-amber-400/90")} />
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
