"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/shared/lib/utils";
import { useDebounce } from "@/shared/hooks/useDebounce";
import { globalSearch, getResultTypeLabel } from "@/shared/lib/search-utils";
import {
  getJamaahList,
  getGroupList,
  getKeberangkatanList,
  getManifestList,
  getInvoiceList,
} from "@/services/mock/handlers";
import type {
  Jamaah,
  RegistrationGroup,
  Keberangkatan,
  Manifest,
  Invoice,
  GlobalSearchResult,
} from "@/shared/types";
import {
  Search,
  LayoutDashboard,
  Plane,
  FileText,
  Building2,
  CreditCard,
  FileCheck,
  BarChart3,
  Download,
  Layers,
  ShieldAlert,
  TrendingUp,
  Bell,
  Send,
  Users,
  Package,
} from "lucide-react";

// ─── Data Definitions ────────────────────────────────────────────────────────

interface PageItem {
  label: string;
  link: string;
  icon: React.ElementType;
}

const PAGES: PageItem[] = [
  { label: "Dashboard", link: "/admin/dashboard", icon: LayoutDashboard },
  { label: "Keberangkatan", link: "/admin/keberangkatan", icon: Plane },
  { label: "Manifest", link: "/admin/manifest", icon: FileText },
  { label: "Rooming", link: "/admin/rooming", icon: Building2 },
  { label: "Pembayaran", link: "/admin/pembayaran", icon: CreditCard },
  { label: "Dokumen", link: "/admin/dokumen", icon: FileCheck },
  { label: "Command Center", link: "/admin/command-center", icon: BarChart3 },
  { label: "Export Center", link: "/admin/export-center", icon: Download },
  { label: "Bulk Operations", link: "/admin/bulk-operations", icon: Layers },
  { label: "Audit Log", link: "/admin/audit-log", icon: ShieldAlert },
  { label: "Monitoring Dokumen", link: "/admin/dokumen-monitoring", icon: FileText },
  { label: "Analitik Operasional", link: "/admin/operational-analytics", icon: TrendingUp },
  { label: "Pengingat", link: "/admin/pengingat", icon: Bell },
];

interface QuickActionItem {
  label: string;
  link: string;
  icon: React.ElementType;
}

const QUICK_ACTIONS: QuickActionItem[] = [
  { label: "Generate Manifest", link: "/admin/manifest", icon: FileText },
  { label: "Generate Rooming", link: "/admin/rooming", icon: Building2 },
  { label: "Kirim Reminder", link: "/admin/pengingat", icon: Send },
  { label: "Export Data", link: "/admin/export-center", icon: Download },
  { label: "Review Dokumen", link: "/admin/ocr-review", icon: FileCheck },
  { label: "Bulk Operations", link: "/admin/bulk-operations", icon: Layers },
];

// ─── Flat item type for combined keyboard navigation ────────────────────────

type FlatItem =
  | { kind: "page"; label: string; link: string; icon: React.ElementType }
  | { kind: "action"; label: string; link: string; icon: React.ElementType }
  | {
      kind: "search";
      label: string;
      subtitle: string;
      link: string;
      searchType: string;
    };

// ─── Icons for search result types ───────────────────────────────────────────

function getSearchIcon(type: string): React.ElementType {
  switch (type) {
    case "jamaah":
      return Users;
    case "group":
      return Users;
    case "invoice":
      return CreditCard;
    case "keberangkatan":
      return Package;
    case "hotel":
      return Building2;
    default:
      return FileText;
  }
}

// ─── Component ───────────────────────────────────────────────────────────────

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, 200);

  const [selectedIndex, setSelectedIndex] = useState(-1);

  // Master data
  const [jamaah, setJamaah] = useState<Jamaah[]>([]);
  const [groups, setGroups] = useState<RegistrationGroup[]>([]);
  const [keberangkatan, setKeberangkatan] = useState<Keberangkatan[]>([]);
  const [manifests, setManifests] = useState<Manifest[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [searchResults, setSearchResults] = useState<GlobalSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // ── Fetch master data on mount ────────────────────────────────────────────

  useEffect(() => {
    if (!open) return;
    Promise.all([
      getJamaahList(),
      getGroupList(),
      getKeberangkatanList(),
      getManifestList(),
      getInvoiceList(),
    ]).then(([j, g, k, m, i]) => {
      setJamaah(j);
      setGroups(g);
      setKeberangkatan(k);
      setManifests(m);
      setInvoices(i);
    });
  }, [open]);

  // ── Live search via debounced query ────────────────────────────────────────

  useEffect(() => {
    if (debouncedQuery.trim().length >= 2) {
      setIsSearching(true);
      const results = globalSearch(debouncedQuery, {
        jamaah,
        groups,
        invoices,
        keberangkatan,
        manifests,
      } as any);
      setSearchResults(results);
      setSelectedIndex(-1);
      setIsSearching(false);
    } else {
      setSearchResults([]);
      setSelectedIndex(-1);
    }
  }, [debouncedQuery, jamaah, groups, invoices, keberangkatan, manifests]);

  // ── Focus input when opened ───────────────────────────────────────────────

  useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedIndex(-1);
      setSearchResults([]);
      // Small delay so the DOM is rendered before focusing
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  // ── Filter helpers ────────────────────────────────────────────────────────

  const shouldSearch = debouncedQuery.trim().length >= 2;

  const filteredPages = useMemo(() => {
    if (!shouldSearch) return PAGES;
    const q = debouncedQuery.toLowerCase();
    return PAGES.filter((p) => p.label.toLowerCase().includes(q));
  }, [debouncedQuery, shouldSearch]);

  const filteredActions = useMemo(() => {
    if (!shouldSearch) return QUICK_ACTIONS;
    const q = debouncedQuery.toLowerCase();
    return QUICK_ACTIONS.filter((a) => a.label.toLowerCase().includes(q));
  }, [debouncedQuery, shouldSearch]);

  // ── Build sections and flat list for keyboard navigation ──────────────────

  const { sections, flatItems } = useMemo(() => {
    const secs: { title: string; items: FlatItem[] }[] = [];

    if (filteredPages.length > 0) {
      secs.push({
        title: "Halaman",
        items: filteredPages.map(
          (p): FlatItem => ({ kind: "page", ...p })
        ),
      });
    }

    if (filteredActions.length > 0) {
      secs.push({
        title: "Aksi Cepat",
        items: filteredActions.map(
          (a): FlatItem => ({ kind: "action", ...a })
        ),
      });
    }

    if (shouldSearch && searchResults.length > 0) {
      secs.push({
        title: "Pencarian Global",
        items: searchResults.map(
          (r): FlatItem => ({
            kind: "search",
            label: r.title,
            subtitle: r.subtitle,
            link: r.link,
            searchType: r.type,
          })
        ),
      });
    }

    return { sections: secs, flatItems: secs.flatMap((s) => s.items) };
  }, [filteredPages, filteredActions, searchResults, shouldSearch]);

  const hasResults = flatItems.length > 0;

  // ── Navigation ────────────────────────────────────────────────────────────

  const navigateTo = useCallback(
    (link: string) => {
      router.push(link);
      onClose();
    },
    [router, onClose]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev < flatItems.length - 1 ? prev + 1 : 0
          );
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev > 0 ? prev - 1 : flatItems.length - 1
          );
          break;
        case "Enter":
          e.preventDefault();
          if (selectedIndex >= 0 && selectedIndex < flatItems.length) {
            const item = flatItems[selectedIndex];
            if (item) navigateTo(item.link);
          }
          break;
        case "Escape":
          e.preventDefault();
          onClose();
          break;
      }
    },
    [flatItems, selectedIndex, navigateTo, onClose]
  );

  // ── Scroll selected item into view ────────────────────────────────────────

  useEffect(() => {
    if (selectedIndex < 0 || !resultsRef.current) return;
    const items = resultsRef.current.querySelectorAll<HTMLElement>(
      "[data-result-index]"
    );
    const el = items[selectedIndex];
    el?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  // ── Click outside handler ─────────────────────────────────────────────────

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) {
        onClose();
      }
    },
    [onClose]
  );

  // ── Render ────────────────────────────────────────────────────────────────

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 pt-[15vh]"
      onClick={handleBackdropClick}
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-xl border bg-card shadow-2xl"
        onKeyDown={handleKeyDown}
      >
        {/* Search input */}
        <div className="flex h-14 items-center border-b px-4">
          <Search className="mr-3 h-5 w-5 shrink-0 text-muted-foreground" />
          <input
            ref={inputRef}
            type="text"
            className="flex-1 bg-transparent text-lg outline-none placeholder:text-muted-foreground/60"
            placeholder="Ketik untuk mencari..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        {/* Results area */}
        <div ref={resultsRef} className="max-h-80 overflow-y-auto p-2">
          {sections.map((section) => (
            <div key={section.title} className="mb-1">
              {/* Section header */}
              <div className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                {section.title}
              </div>

              {/* Section items */}
              <div className="space-y-1">
                {section.items.map((item) => {
                  // Find global index in flatItems
                  const globalIdx = flatItems.indexOf(item);
                  const isSelected = globalIdx === selectedIndex;

                  if (item.kind === "search") {
                    const Icon = getSearchIcon(item.searchType);
                    return (
                      <button
                        key={`search-${item.label}-${item.link}`}
                        data-result-index={globalIdx}
                        className={cn(
                          "flex h-12 w-full items-center gap-3 rounded-md px-3 text-left transition-colors",
                          isSelected
                            ? "bg-accent"
                            : "hover:bg-muted/50"
                        )}
                        onClick={() => navigateTo(item.link)}
                        onMouseEnter={() => setSelectedIndex(globalIdx)}
                        type="button"
                      >
                        <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <div className="flex-1 min-w-0">
                          <div className="truncate font-medium text-sm">
                            {item.label}
                          </div>
                          <div className="truncate text-xs text-muted-foreground">
                            {item.subtitle}
                          </div>
                        </div>
                        <span className="inline-flex shrink-0 items-center rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                          {getResultTypeLabel(item.searchType)}
                        </span>
                      </button>
                    );
                  }

                  // Page or Action item
                  const Icon = item.icon;
                  return (
                    <button
                      key={`${item.kind}-${item.label}`}
                      data-result-index={globalIdx}
                      className={cn(
                        "flex h-12 w-full items-center gap-3 rounded-md px-3 text-left transition-colors",
                        isSelected
                          ? "bg-accent"
                          : "hover:bg-muted/50"
                      )}
                      onClick={() => navigateTo(item.link)}
                      onMouseEnter={() => setSelectedIndex(globalIdx)}
                      type="button"
                    >
                      <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <div className="flex-1 min-w-0">
                        <div className="truncate font-medium text-sm">
                          {item.label}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Empty state */}
          {!hasResults && !isSearching && shouldSearch && (
            <div className="py-8 text-center text-sm text-muted-foreground">
              Tidak ada hasil untuk &lsquo;{debouncedQuery}&rsquo;
            </div>
          )}

          {/* Loading state */}
          {isSearching && shouldSearch && (
            <div className="py-8 text-center text-sm text-muted-foreground">
              Mencari...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
