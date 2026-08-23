"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/shared/lib/utils";
import {
  LayoutDashboard,
  Users,
  Plane,
  FileText,
  CreditCard,
  FileCheck,
  Receipt,
  Database,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  BarChart3,
  Settings,
  Shield,
  Activity,
  Wrench,
  ScrollText,
  HeartHandshake,
  X,
  type LucideIcon,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useAdminStore } from "@/stores/admin-store";
import { useSession } from "@/shared/hooks/use-session";
import { isSidebarItemVisible, isSuperAdmin } from "@/shared/lib/rbac-utils";
import type { OperationalRole } from "@/shared/types";

interface NavChild {
  label: string;
  href: string;
}

interface NavItem {
  label: string;
  icon: LucideIcon;
  href?: string;
  children?: NavChild[];
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const adminNav: NavSection[] = [
  {
    title: "UTAMA",
    items: [
      { label: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
    ],
  },
  {
    title: "MASTER DATA",
    items: [
      {
        label: "Master Data",
        icon: Database,
        children: [
          {
            label: "Konfigurasi Paket Umroh",
            href: "/admin/master-data/konfigurasi-paket-umroh",
          },
          {
            label: "Master Badal & Wakaf",
            href: "/admin/master/badal-wakaf",
          },
          {
            label: "Master Petugas",
            href: "/admin/master/petugas",
          },
        ],
      },
    ],
  },
  {
    title: "PAKET UMROH",
    items: [
      {
        label: "Paket Umroh",
        icon: Plane,
        children: [
          { label: "Generate Paket", href: "/admin/paket-umroh/generate" },
          { label: "Info Hotel", href: "/admin/paket-umroh/info-hotel" },
          { label: "Paket Aktif", href: "/admin/keberangkatan" },
        ],
      },
    ],
  },
  {
    title: "BADAL & WAKAF",
    items: [
      {
        label: "Badal Umroh & Wakaf",
        icon: HeartHandshake,
        children: [
          { label: "Manajemen Badal Umroh", href: "/admin/badal-umroh" },
          { label: "Manajemen Wakaf Qur'an", href: "/admin/wakaf-quran" },
          { label: "Laporan Kolektif Per Paket", href: "/admin/laporan-paket" },
        ],
      },
    ],
  },
  {
    title: "JAMAAH",
    items: [
      {
        label: "Jamaah",
        icon: Users,
        children: [
          { label: "Semua Jamaah", href: "/admin/jamaah" },
          { label: "Pencarian Jamaah", href: "/admin/jamaah?search" },
          { label: "Histori Paket", href: "/admin/jamaah/histori-paket" },
          { label: "Dokumen Jamaah", href: "/admin/dokumen" },
          { label: "Review OCR Dokumen", href: "/admin/ocr-review" },
        ],
      },
    ],
  },
  {
    title: "PEMBAYARAN",
    items: [
      {
        label: "Pembayaran & Keuangan",
        icon: CreditCard,
        children: [
          { label: "Modul Keuangan Travel", href: "/admin/keuangan-travel" },
          { label: "Monitoring Pembayaran", href: "/admin/pembayaran" },
          { label: "Jadwal Reminder", href: "/admin/pembayaran/reminder" },
          { label: "Manajemen Invoice", href: "/admin/pembayaran/laporan" },
          { label: "Histori Pembayaran", href: "/admin/pembayaran/histori" },
        ],
      },
    ],
  },
  {
    title: "MANIFEST",
    items: [
      {
        label: "Manifest",
        icon: FileText,
        children: [
          { label: "Semua Manifest", href: "/admin/manifest" },
          { label: "Manifest Visa", href: "/admin/manifest?type=visa" },
          { label: "Manifest Blockseat", href: "/admin/manifest?type=blockseat" },
          { label: "Manifest Hotel", href: "/admin/rooming" },
          { label: "Manifest SISKOPATUH", href: "/admin/manifest?type=siskopatuh" },
        ],
      },
    ],
  },
  {
    title: "LAINNYA",
    items: [
      { label: "Manajemen User", href: "/admin/users", icon: Users },
      { label: "Laporan", href: "/admin/laporan", icon: BarChart3 },
      { label: "Pengaturan", href: "/admin/pengaturan", icon: Settings },
      { label: "Aturan Operasional", href: "/admin/pengaturan/aturan-operasional", icon: ScrollText },
      { label: "Audit Trail", href: "/admin/audit-log", icon: Shield },
      { label: "Kesehatan Sistem", href: "/admin/kesehatan-sistem", icon: Activity },
      { label: "Maintenance", href: "/admin/maintenance", icon: Wrench },
    ],
  },
];

const jamaahNav: NavSection[] = [
  {
    title: "PORTAL JAMAAH",
    items: [
      { label: "Dashboard", href: "/jamaah/dashboard", icon: LayoutDashboard },
      { label: "Upload Dokumen", href: "/jamaah/dokumen/upload", icon: FileCheck },
      { label: "Status Dokumen", href: "/jamaah/dokumen", icon: FileText },
      { label: "Progress", href: "/jamaah/progress", icon: Plane },
      { label: "Invoice", href: "/jamaah/invoice", icon: Receipt },
      { label: "Tagihan", href: "/jamaah/tagihan", icon: CreditCard },
    ],
  },
];

interface SidebarProps {
  role: OperationalRole;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export function Sidebar({ role, mobileOpen = false, onMobileClose }: SidebarProps) {
  const pathname = usePathname();
  const { sidebarCollapsed: collapsed, toggleSidebar } = useAdminStore();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const { user } = useSession();
  const superAdmin = isSuperAdmin(role);

  // Build filtered sections based on role visibility
  const sections =
    role === "jamaah"
      ? jamaahNav
      : adminNav
          .map((section) => ({
            ...section,
            items: section.items.filter((item) =>
              isSidebarItemVisible(role, section.title, item.label)
            ),
          }))
          .filter((section) => section.items.length > 0);

  // Auto-expand parent when a child route is active
  useEffect(() => {
    const next = new Set(expanded);
    for (const section of sections) {
      for (const item of section.items) {
        if (item.children) {
          const hasActiveChild = item.children.some(
            (child) => pathname === child.href || pathname.startsWith(child.href + "/")
          );
          if (hasActiveChild) {
            next.add(item.label);
          }
        }
      }
    }
    setExpanded(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  function toggleGroup(label: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(label)) {
        next.delete(label);
      } else {
        next.add(label);
      }
      return next;
    });
  }

  function isParentActive(item: NavItem): boolean {
    if (item.href) return pathname === item.href || pathname.startsWith(item.href + "/");
    if (item.children) {
      return item.children.some(
        (child) => pathname === child.href || pathname.startsWith(child.href + "/")
      );
    }
    return false;
  }

  function isChildActive(href: string): boolean {
    return pathname === href || pathname.startsWith(href + "/");
  }

  const displayName = user?.name ?? "Admin VTU";
  const displayEmail = user?.email ?? "";
  const avatarLetter = displayName.charAt(0).toUpperCase();

  const handleNavClick = () => {
    if (onMobileClose) {
      onMobileClose();
    }
  };

  return (
    <>
      {/* ── Mobile Backdrop Overlay ── */}
      <div
        className={cn(
          "fixed inset-0 z-40 bg-black/60 backdrop-blur-xs transition-opacity duration-300 md:hidden",
          mobileOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={onMobileClose}
        aria-hidden="true"
      />

      {/* ── Off-Canvas Sidebar / Drawer ── */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-50 h-screen border-r border-[#D4AF37]/30 bg-gradient-to-b from-[#041710] via-[#062118] to-[#0A2E23] text-white flex flex-col shadow-2xl transition-all duration-300 ease-in-out",
          mobileOpen ? "translate-x-0 w-72" : "-translate-x-full md:translate-x-0",
          collapsed ? "md:w-16" : "md:w-60"
        )}
      >
        {/* Logo Header */}
        <div className="flex h-14 items-center justify-between border-b border-[#D4AF37]/30 px-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-tr from-[#F5D061] via-[#D4AF37] to-[#B8860B] text-slate-950 shadow-md">
              <Plane className="h-4 w-4 text-slate-950" />
            </div>
            {(!collapsed || mobileOpen) && (
              <div className="text-sm font-black leading-tight tracking-wide">
                <div className="text-white">
                  VTU{" "}
                  <span className="text-[#F5D061] text-[10px] font-extrabold uppercase">
                    Operasional
                  </span>
                </div>
                <div className="text-[10px] text-emerald-200/70 font-medium">Travel System</div>
              </div>
            )}
          </div>

          {/* Close button on mobile */}
          {onMobileClose && (
            <button
              type="button"
              onClick={onMobileClose}
              className="md:hidden flex h-8 w-8 items-center justify-center rounded-lg text-emerald-200 hover:bg-[#0E4334] hover:text-white"
              aria-label="Tutup menu"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-4">
          {sections.map((section) => (
            <div key={section.title}>
              <ul className="space-y-1">
                {section.items.map((item) => {
                  const hasChildren = item.children !== undefined;
                  const active = isParentActive(item);
                  const isExpanded = expanded.has(item.label);

                  if (hasChildren) {
                    return (
                      <li key={item.label} className="my-1">
                        <button
                          onClick={() => toggleGroup(item.label)}
                          className={cn(
                            "w-full flex items-center gap-2.5 rounded-2xl px-3 py-2.5 text-xs font-bold transition-all text-left border shadow-xs",
                            active && (!collapsed || mobileOpen)
                              ? "bg-[#0E4334] text-[#F5D061] border-[#D4AF37]/60 shadow-md"
                              : "bg-[#062118]/60 text-emerald-100/90 hover:bg-[#0E4334]/80 hover:text-white border-[#D4AF37]/20",
                            collapsed && !mobileOpen && "justify-center px-2"
                          )}
                          title={collapsed && !mobileOpen ? item.label : undefined}
                        >
                          <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-[#D4AF37]/20 border border-[#D4AF37]/40 text-[#F5D061] shrink-0">
                            <item.icon className="h-4 w-4" />
                          </div>
                          {(!collapsed || mobileOpen) && (
                            <>
                              <span className="flex-1 font-bold text-white tracking-wide">
                                {item.label}
                              </span>
                              <ChevronDown
                                className={cn(
                                  "h-4 w-4 shrink-0 text-[#F5D061] transition-transform duration-200",
                                  isExpanded && "rotate-180"
                                )}
                              />
                            </>
                          )}
                        </button>

                        {/* Sub-menu items */}
                        {(!collapsed || mobileOpen) && isExpanded && (
                          <div className="mt-2.5 mb-1.5 relative rounded-2xl p-2 bg-[#0E4334] border-2 border-[#D4AF37]/50 shadow-2xl overflow-hidden">
                            <div className="absolute left-2.5 top-2.5 bottom-2.5 w-1 bg-gradient-to-b from-[#F5D061] via-[#D4AF37] to-[#B8860B] rounded-full" />
                            <ul className="pl-3 space-y-1">
                              {item.children!.map((child) => (
                                <li key={child.href}>
                                  <Link
                                    href={child.href}
                                    onClick={handleNavClick}
                                    className={cn(
                                      "flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold transition-all",
                                      isChildActive(child.href)
                                        ? "bg-gradient-to-r from-[#F5D061] via-[#D4AF37] to-[#B8860B] text-slate-950 font-black shadow-md"
                                        : "text-emerald-100 hover:bg-[#165340] hover:text-[#F5D061]"
                                    )}
                                  >
                                    <div className="h-1.5 w-1.5 rounded-full bg-[#F5D061] shrink-0" />
                                    <span className="truncate">{child.label}</span>
                                  </Link>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </li>
                    );
                  }

                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href!}
                        onClick={handleNavClick}
                        className={cn(
                          "flex items-center gap-3 rounded-lg px-3 py-2 text-xs font-semibold transition-all",
                          active
                            ? "bg-[#D4AF37]/20 text-[#F5D061] border-l-2 border-[#F5D061] font-bold shadow-xs"
                            : "text-emerald-100/75 hover:bg-[#0E4334]/70 hover:text-white",
                          collapsed && !mobileOpen && "justify-center px-2"
                        )}
                        title={collapsed && !mobileOpen ? item.label : undefined}
                      >
                        <item.icon className="h-4 w-4 shrink-0" />
                        {(!collapsed || mobileOpen) && <span>{item.label}</span>}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="border-t border-[#D4AF37]/30 p-2.5 bg-[#041710]/50">
          {(!collapsed || mobileOpen) && (
            <div className="flex items-center gap-2.5 px-2 py-1.5 mb-1">
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold shrink-0 border border-[#D4AF37]/40",
                  superAdmin ? "bg-[#D4AF37]/25 text-[#F5D061]" : "bg-emerald-900 text-emerald-100"
                )}
              >
                {avatarLetter}
              </div>
              <div className="text-xs min-w-0">
                <div className="font-bold text-white truncate leading-tight">{displayName}</div>
                <div className="text-[10px] text-emerald-200/70 truncate leading-tight">
                  {displayEmail}
                </div>
              </div>
            </div>
          )}
          <button
            type="button"
            onClick={toggleSidebar}
            className="hidden md:flex w-full items-center justify-center rounded-lg py-1.5 text-emerald-200/80 hover:bg-[#0E4334] hover:text-white transition-colors"
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>
      </aside>
    </>
  );
}
