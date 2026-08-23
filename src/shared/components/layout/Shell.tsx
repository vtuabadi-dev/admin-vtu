"use client";

import { useState, useEffect, useCallback } from "react";
import { GSAPLink } from "@/shared/gsap/GSAPProvider";
import { usePathname } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { cn } from "@/shared/lib/utils";
import { useAdminStore } from "@/stores/admin-store";
import { useSession } from "@/shared/hooks/use-session";
import { useKeyboardShortcut } from "@/shared/hooks/use-keyboard-shortcut";
import { NotificationBell } from "@/shared/components/NotificationBell";
import { SearchOverlay } from "@/shared/components/SearchOverlay";
import { CommandPalette } from "@/shared/components/CommandPalette";
import {
  Search,
  LogOut,
  Menu,
  LayoutDashboard,
  Users,
  Plane,
  CreditCard,
} from "lucide-react";
import { signOut } from "next-auth/react";
import type { OperationalRole } from "@/shared/types";

interface ShellProps {
  children: React.ReactNode;
  role: OperationalRole;
}

const ROLE_LABELS: Record<string, string> = {
  super_admin: "Super Admin",
  admin_operasional: "Admin Operasional",
  admin_pembayaran: "Admin Pembayaran",
  admin_manifest: "Admin Manifest",
  admin_dokumen: "Admin Dokumen",
  tour_leader: "Tour Leader",
  jamaah: "Jamaah",
};

export function Shell({ children, role }: ShellProps) {
  const pathname = usePathname();
  const sidebarCollapsed = useAdminStore((s) => s.sidebarCollapsed);
  const { updateActivity, user, logout } = useSession();
  const { isOpen: paletteOpen, close: closePalette } = useKeyboardShortcut();
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // ── 30-min inactivity timeout ──────────────────────────────────────────
  const handleActivity = useCallback(() => {
    updateActivity();
  }, [updateActivity]);

  useEffect(() => {
    window.addEventListener("mousedown", handleActivity);
    window.addEventListener("keydown", handleActivity);
    window.addEventListener("scroll", handleActivity, { passive: true });
    return () => {
      window.removeEventListener("mousedown", handleActivity);
      window.removeEventListener("keydown", handleActivity);
      window.removeEventListener("scroll", handleActivity);
    };
  }, [handleActivity]);

  // ── Search overlay keyboard shortcut (Ctrl+F or /) ─────────────────────
  useEffect(() => {
    function handleGlobalKeys(e: KeyboardEvent) {
      if (
        (e.ctrlKey && e.key.toLowerCase() === "f") ||
        (e.key === "/" && !isEditable(e.target as HTMLElement))
      ) {
        e.preventDefault();
        setSearchOpen(true);
      }
    }
    window.addEventListener("keydown", handleGlobalKeys);
    return () => window.removeEventListener("keydown", handleGlobalKeys);
  }, []);

  const mobileNavItems = [
    {
      label: "Dashboard",
      href: role === "jamaah" ? "/jamaah/dashboard" : "/admin/dashboard",
      icon: LayoutDashboard,
    },
    {
      label: "Jamaah",
      href: role === "jamaah" ? "/jamaah/dokumen" : "/admin/jamaah",
      icon: Users,
    },
    {
      label: "Paket",
      href: role === "jamaah" ? "/jamaah/progress" : "/admin/keberangkatan",
      icon: Plane,
    },
    {
      label: "Keuangan",
      href: role === "jamaah" ? "/jamaah/tagihan" : "/admin/keuangan-travel",
      icon: CreditCard,
    },
  ];

  return (
    <div className="min-h-screen bg-background pb-16 md:pb-0">
      {/* ── Sidebar Component (Desktop + Mobile Drawer) ── */}
      <Sidebar
        role={role}
        mobileOpen={mobileMenuOpen}
        onMobileClose={() => setMobileMenuOpen(false)}
      />

      {/* ── Main Content Area ── */}
      <main
        className={cn(
          "min-h-screen transition-all duration-200 pl-0",
          sidebarCollapsed ? "md:pl-16" : "md:pl-60"
        )}
      >
        {/* Top Navbar */}
        <div className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-[#D4AF37]/30 bg-[#062118] text-white backdrop-blur supports-[backdrop-filter]:bg-[#062118]/95 px-4 sm:px-6 shadow-md">
          {/* Hamburger Menu Button (Mobile Only) */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className="md:hidden flex h-9 w-9 items-center justify-center rounded-lg bg-[#0E4334] text-[#F5D061] hover:bg-[#165340] border border-[#D4AF37]/40 shrink-0"
            aria-label="Buka Menu Operasional"
          >
            <Menu className="h-5 w-5" />
          </button>

          {/* App Title on Mobile */}
          <div className="md:hidden font-black text-sm text-white tracking-wide truncate">
            VTU <span className="text-[#F5D061] text-[11px] font-bold">OPERASIONAL</span>
          </div>

          <div className="flex-1" />

          {/* Controls & Utilities */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="flex h-9 w-9 items-center justify-center rounded-lg transition-colors hover:bg-[#0E4334] text-emerald-100 hover:text-[#F5D061] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37]"
              aria-label="Cari"
              title="Cari (Ctrl+F atau /)"
            >
              <Search className="h-4 w-4" />
            </button>

            <NotificationBell />

            <span className="hidden md:inline-block text-xs text-emerald-200/90 font-medium">
              {new Date().toLocaleDateString("id-ID", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </span>

            {/* User Info & Logout */}
            <div className="flex items-center gap-2 pl-2 sm:pl-3 border-l border-[#D4AF37]/30">
              <div className="hidden sm:block text-right">
                <p className="text-xs font-bold text-white leading-tight">{user?.name ?? "User"}</p>
                <p className="text-[10px] text-[#F5D061] font-semibold leading-tight">
                  {ROLE_LABELS[role] ?? role}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  logout();
                  signOut({ callbackUrl: "/login" });
                }}
                className="flex items-center gap-1.5 px-2 py-1.5 text-xs font-semibold text-rose-300 hover:bg-rose-950/40 hover:text-rose-200 rounded-lg transition-colors border border-rose-500/30"
                title="Keluar"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Keluar</span>
              </button>
            </div>
          </div>
        </div>

        {/* Page Content */}
        <div className="p-4 sm:p-6 bg-arabic-pattern min-h-[calc(100vh-3.5rem)]">{children}</div>
      </main>

      {/* ── Mobile Bottom Navigation Bar (PWA App Bar) ── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#062118]/95 backdrop-blur-md border-t border-[#D4AF37]/40 h-16 flex items-center justify-around text-white px-2 shadow-2xl pb-[env(safe-area-inset-bottom)]">
        {mobileNavItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <GSAPLink
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center w-full h-full py-1 text-[10px] font-bold transition-all",
                isActive
                  ? "text-[#F5D061] font-black"
                  : "text-emerald-100/70 hover:text-white"
              )}
            >
              <div
                className={cn(
                  "p-1.5 rounded-xl transition-all",
                  isActive ? "bg-[#0E4334] text-[#F5D061] border border-[#D4AF37]/50 shadow-sm" : ""
                )}
              >
                <item.icon className="h-4 w-4" />
              </div>
              <span className="mt-0.5">{item.label}</span>
            </GSAPLink>
          );
        })}

        {/* Menu Drawer Toggle Button */}
        <button
          type="button"
          onClick={() => setMobileMenuOpen(true)}
          className="flex flex-col items-center justify-center w-full h-full py-1 text-[10px] font-bold text-emerald-100/70 hover:text-white"
        >
          <div className="p-1.5 rounded-xl">
            <Menu className="h-4 w-4" />
          </div>
          <span className="mt-0.5">Menu</span>
        </button>
      </nav>

      {/* Overlays */}
      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />
      <CommandPalette open={paletteOpen} onClose={closePalette} />
    </div>
  );
}

function isEditable(el: HTMLElement | null): boolean {
  if (!el) return false;
  const tag = el.tagName.toLowerCase();
  if (tag === "input" || tag === "textarea" || tag === "select") return true;
  return el.isContentEditable;
}
