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
        label: "Pembayaran",
        icon: CreditCard,
        children: [
          { label: "Monitoring Pembayaran", href: "/admin/pembayaran" },
          { label: "Jadwal Reminder", href: "/admin/pembayaran/reminder" },
          { label: "Laporan Pembayaran", href: "/admin/pembayaran/laporan" },
          { label: "Histori Pembayaran", href: "/admin/pembayaran/histori" },
          { label: "Peninjauan Pembayaran", href: "/admin/pembayaran/review" },
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
}

export function Sidebar({ role }: SidebarProps) {
  const pathname = usePathname();
  const { sidebarCollapsed: collapsed, toggleSidebar } = useAdminStore();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const { user } = useSession();
  const superAdmin = isSuperAdmin(role);

  // Build filtered sections based on role visibility
  const sections = role === "jamaah" ? jamaahNav : adminNav
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => isSidebarItemVisible(role, section.title, item.label)),
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

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 h-screen border-r bg-card transition-all duration-200 flex flex-col",
        collapsed ? "w-16" : "w-60"
      )}
    >
      {/* Logo */}
      <div className="flex h-14 items-center border-b px-4">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary">
              <Plane className="h-4 w-4 text-primary-foreground" />
            </div>
            <div className="text-sm font-semibold leading-tight">
              <div>VTU</div>
              <div className="text-[10px] text-muted-foreground font-normal">
                Operational System
              </div>
            </div>
          </div>
        )}
        {collapsed && (
          <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-md bg-primary">
            <Plane className="h-4 w-4 text-primary-foreground" />
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-5">
        {sections.map((section) => (
          <div key={section.title}>
            {/* Section title removed for a cleaner look */}
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const hasChildren = item.children !== undefined;
                const active = isParentActive(item);
                const isExpanded = expanded.has(item.label);

                if (hasChildren) {
                  return (
                    <li key={item.label}>
                      <button
                        onClick={() => toggleGroup(item.label)}
                        className={cn(
                          "w-full flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors text-left",
                          active && !collapsed
                            ? "bg-primary/10 text-primary"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground",
                          collapsed && "justify-center px-2"
                        )}
                        title={collapsed ? item.label : undefined}
                      >
                        <item.icon className="h-4 w-4 shrink-0" />
                        {!collapsed && (
                          <>
                            <span className="flex-1">{item.label}</span>
                            <ChevronDown
                              className={cn(
                                "h-3.5 w-3.5 shrink-0 transition-transform",
                                isExpanded && "rotate-180"
                              )}
                            />
                          </>
                        )}
                      </button>

                      {!collapsed && isExpanded && (
                        <ul className="mt-0.5 ml-4 space-y-0.5 border-l border-border pl-3">
                          {item.children!.map((child) => (
                            <li key={child.href}>
                              <Link
                                href={child.href}
                                className={cn(
                                  "block rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                                  isChildActive(child.href)
                                    ? "bg-primary/10 text-primary"
                                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                )}
                              >
                                {child.label}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      )}
                    </li>
                  );
                }

                return (
                  <li key={item.href}>
                    <Link
                      href={item.href!}
                      className={cn(
                        "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                        active
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground",
                        collapsed && "justify-center px-2"
                      )}
                      title={collapsed ? item.label : undefined}
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      {!collapsed && <span>{item.label}</span>}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t p-2">
        {!collapsed && (
          <div className="flex items-center gap-3 px-3 py-2">
            <div className={cn(
              "flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium",
              superAdmin ? "bg-amber-100 text-amber-700" : "bg-muted"
            )}>
              {avatarLetter}
            </div>
            <div className="text-sm min-w-0">
              <div className="font-medium truncate">{displayName}</div>
              <div className="text-xs text-muted-foreground truncate">{displayEmail}</div>
            </div>
          </div>
        )}
        <button
          onClick={toggleSidebar}
          className="flex w-full items-center justify-center rounded-md py-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </button>
      </div>
    </aside>
  );
}
