"use client";

import { useState, useEffect, useRef, useCallback } from "react";
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
import { Search, Users, Package, Building2, FileText, CreditCard } from "lucide-react";

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

interface SearchOverlayProps {
  open: boolean;
  onClose: () => void;
}

export function SearchOverlay({ open, onClose }: SearchOverlayProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, 300);

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

  // ── Focus input when opened / reset state ─────────────────────────────────

  useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedIndex(-1);
      setSearchResults([]);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  // ── Navigate to result ────────────────────────────────────────────────────

  const navigateTo = useCallback(
    (link: string) => {
      router.push(link);
      onClose();
    },
    [router, onClose]
  );

  // ── Keyboard navigation ───────────────────────────────────────────────────

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev < searchResults.length - 1 ? prev + 1 : 0
          );
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev > 0 ? prev - 1 : searchResults.length - 1
          );
          break;
        case "Enter":
          e.preventDefault();
          if (selectedIndex >= 0 && selectedIndex < searchResults.length) {
            const item = searchResults[selectedIndex];
            if (item) navigateTo(item.link);
          }
          break;
        case "Escape":
          e.preventDefault();
          onClose();
          break;
      }
    },
    [searchResults, selectedIndex, navigateTo, onClose]
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

  const shouldSearch = debouncedQuery.trim().length >= 2;

  return (
    <div
      className="fixed inset-0 z-40 bg-black/30 pt-16"
      onClick={handleBackdropClick}
    >
      <div
        className="mx-auto w-full max-w-xl rounded-b-xl border-x border-b bg-card shadow-lg"
        onKeyDown={handleKeyDown}
      >
        {/* Search input */}
        <div className="flex h-12 items-center border-b px-4">
          <Search className="mr-3 h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            ref={inputRef}
            type="text"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/60"
            placeholder="Cari jamaah, paket, group, manifest..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        {/* Results area */}
        <div ref={resultsRef} className="max-h-96 overflow-y-auto">
          {searchResults.length > 0 &&
            searchResults.map((result, idx) => {
              const Icon = getSearchIcon(result.type);
              const isSelected = idx === selectedIndex;
              return (
                <button
                  key={`${result.type}-${result.id}`}
                  data-result-index={idx}
                  className={cn(
                    "flex h-12 w-full items-center gap-3 px-4 text-left transition-colors",
                    isSelected ? "bg-accent" : "hover:bg-muted/50"
                  )}
                  onClick={() => navigateTo(result.link)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  type="button"
                >
                  <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">
                      {result.title}
                    </div>
                    <div className="truncate text-xs text-muted-foreground">
                      {result.subtitle}
                    </div>
                  </div>
                  <span className="inline-flex shrink-0 items-center rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                    {getResultTypeLabel(result.type)}
                  </span>
                </button>
              );
            })}

          {/* Empty state — user typed but nothing matched */}
          {searchResults.length === 0 && !isSearching && shouldSearch && (
            <div className="py-8 text-center text-sm text-muted-foreground">
              Tidak ada hasil untuk &lsquo;{debouncedQuery}&rsquo;
            </div>
          )}

          {/* Loading state */}
          {isSearching && (
            <div className="py-8 text-center text-sm text-muted-foreground">
              Mencari...
            </div>
          )}

          {/* Idle state — no query yet, show hint */}
          {!shouldSearch && query.length === 0 && (
            <div className="py-8 text-center text-sm text-muted-foreground/60">
              Ketik minimal 2 karakter untuk memulai pencarian
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
