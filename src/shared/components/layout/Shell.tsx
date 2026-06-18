"use client";

import { useState, useEffect, useCallback } from "react";
import { Sidebar } from "./Sidebar";
import { cn } from "@/shared/lib/utils";
import { useAdminStore } from "@/stores/admin-store";
import { useSession } from "@/shared/hooks/use-session";
import { useKeyboardShortcut } from "@/shared/hooks/use-keyboard-shortcut";
import { NotificationBell } from "@/shared/components/NotificationBell";
import { SearchOverlay } from "@/shared/components/SearchOverlay";
import { CommandPalette } from "@/shared/components/CommandPalette";
import { Search, LogOut } from "lucide-react";
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
  const sidebarCollapsed = useAdminStore((s) => s.sidebarCollapsed);
  const { updateActivity, user, logout } = useSession();
  const { isOpen: paletteOpen, close: closePalette } = useKeyboardShortcut();
  const [searchOpen, setSearchOpen] = useState(false);

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
      if ((e.ctrlKey && e.key.toLowerCase() === "f") || (e.key === "/" && !isEditable(e.target as HTMLElement))) {
        e.preventDefault();
        setSearchOpen(true);
      }
    }
    window.addEventListener("keydown", handleGlobalKeys);
    return () => window.removeEventListener("keydown", handleGlobalKeys);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Sidebar role={role} />
      <main
        className={cn(
          "min-h-screen transition-all duration-200",
          sidebarCollapsed ? "pl-16" : "pl-60"
        )}
      >
        {/* Top navbar */}
        <div className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-6">
          <div className="flex-1" />
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="flex h-9 w-9 items-center justify-center rounded-lg transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Cari"
              title="Cari (Ctrl+F atau /)"
            >
              <Search className="h-5 w-5 text-foreground" />
            </button>

            <NotificationBell />

            <span className="text-xs text-muted-foreground">
              {new Date().toLocaleDateString("id-ID", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </span>

            {/* User info + logout */}
            <div className="flex items-center gap-2 pl-2 border-l border-border">
              <div className="hidden sm:block text-right">
                <p className="text-xs font-medium text-foreground leading-tight">{user?.name ?? "User"}</p>
                <p className="text-[10px] text-muted-foreground leading-tight">{ROLE_LABELS[role] ?? role}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  logout();
                  signOut({ callbackUrl: "/login" });
                }}
                className="flex items-center gap-1 px-2 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="Keluar"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Keluar</span>
              </button>
            </div>
          </div>
        </div>

        {/* Page content */}
        <div className="p-6">{children}</div>
      </main>

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
