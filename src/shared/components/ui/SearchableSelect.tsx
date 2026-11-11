"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/shared/lib/utils";
import { ChevronDown, Check, X } from "lucide-react";

export interface SearchableOption {
  value: string;
  label: string;
  sublabel?: string;
}

/**
 * Menyaring opsi berdasarkan query pencarian dan membatasi jumlah opsi terlihat jika maxVisibleOptions diset.
 */
export function filterAndLimitOptions(
  options: SearchableOption[],
  query: string,
  config: {
    isOpen: boolean;
    selectedLabel?: string;
    maxVisibleOptions?: number;
  }
): { filteredOptions: SearchableOption[]; visibleOptions: SearchableOption[] } {
  const filteredOptions = options.filter((opt) => {
    if (!config.isOpen || !query.trim()) return true;
    if (config.selectedLabel && query === config.selectedLabel) return true;
    const term = query.toLowerCase();
    const labelMatch = opt.label.toLowerCase().includes(term);
    const subMatch = opt.sublabel?.toLowerCase().includes(term);
    return labelMatch || subMatch;
  });

  const visibleOptions =
    config.maxVisibleOptions && config.maxVisibleOptions > 0
      ? filteredOptions.slice(0, config.maxVisibleOptions)
      : filteredOptions;

  return { filteredOptions, visibleOptions };
}

export interface SearchableSelectProps {
  options: SearchableOption[];
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  className?: string;
  size?: "sm" | "md";
  id?: string;
  nextFocusId?: string;
  allowCustomText?: boolean;
  maxHeight?: string;
  variant?: "default" | "portal";
  /** Batas jumlah opsi yang ditampilkan di dropdown agar list tidak terlalu panjang */
  maxVisibleOptions?: number;
  /** Render daftar opsi menggunakan React Portal (position: fixed) agar tidak terpotong scroll Modal */
  renderInPortal?: boolean;
  /** Jika false, tombol X hanya mengosongkan teks pencarian tanpa mereset value terpilih */
  allowClear?: boolean;
}

export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = "-- Pilih --",
  searchPlaceholder,
  disabled = false,
  className,
  size = "md",
  id,
  nextFocusId,
  allowCustomText = false,
  maxHeight = "max-h-[400px]",
  variant = "default",
  maxVisibleOptions,
  renderInPortal = false,
  allowClear = true,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [portalCoords, setPortalCoords] = useState<{
    top?: number;
    bottom?: number;
    left: number;
    width: number;
  } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);
  const selectedLabel = selectedOption?.label;

  const updatePortalPosition = useCallback(() => {
    if (!renderInPortal || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const estimatedHeight = 290;
    const width = Math.min(Math.max(rect.width, 220), window.innerWidth - 16);
    const left = Math.max(8, Math.min(rect.left, window.innerWidth - width - 8));

    if (spaceBelow < estimatedHeight && spaceAbove > spaceBelow) {
      setPortalCoords({
        bottom: window.innerHeight - rect.top + 4,
        left,
        width,
      });
    } else {
      setPortalCoords({
        top: rect.bottom + 4,
        left,
        width,
      });
    }
  }, [renderInPortal]);

  // Sync query when value or selectedLabel changes
  useEffect(() => {
    if (selectedLabel !== undefined) {
      setQuery(selectedLabel);
    } else if (value && allowCustomText) {
      setQuery(value);
    } else if (!value) {
      setQuery("");
    }
  }, [value, selectedLabel, allowCustomText]);

  // Recalculate fixed portal coordinates while open (handles modal scrolling & window resize)
  useEffect(() => {
    if (!renderInPortal || !open) return;
    updatePortalPosition();
    window.addEventListener("scroll", updatePortalPosition, true);
    window.addEventListener("resize", updatePortalPosition);
    return () => {
      window.removeEventListener("scroll", updatePortalPosition, true);
      window.removeEventListener("resize", updatePortalPosition);
    };
  }, [renderInPortal, open, updatePortalPosition]);

  // Close on outside click (checking both input container and portaled popover)
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      const insideContainer = containerRef.current?.contains(target);
      const insidePopover = popoverRef.current?.contains(target);
      if (!insideContainer && !insidePopover) {
        setOpen(false);
        if (selectedLabel !== undefined) {
          setQuery(selectedLabel);
        } else if (value && allowCustomText) {
          setQuery(value);
        } else if (!value) {
          setQuery("");
        }
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [selectedLabel, value, allowCustomText]);

  // Auto scroll highlighted option into view
  useEffect(() => {
    if (open && listRef.current) {
      const highlightedEl = listRef.current.children[highlightedIndex] as HTMLElement | undefined;
      if (typeof highlightedEl?.scrollIntoView === "function") {
        highlightedEl.scrollIntoView({ block: "nearest", behavior: "smooth" });
      }
    }
  }, [highlightedIndex, open]);

  // Filter options and apply top-N limit if configured
  const { filteredOptions, visibleOptions } = filterAndLimitOptions(options, query, {
    isOpen: open,
    selectedLabel,
    maxVisibleOptions,
  });

  const focusNextElement = () => {
    if (nextFocusId) {
      let attempts = 0;
      const tryFocus = () => {
        const nextEl = document.getElementById(nextFocusId);
        if (nextEl) {
          nextEl.focus();
          if (nextEl.tagName === "BUTTON") {
            nextEl.click();
          } else if (nextEl instanceof HTMLInputElement) {
            nextEl.select();
          }
        } else if (attempts < 5) {
          attempts++;
          setTimeout(tryFocus, 40);
        }
      };
      setTimeout(tryFocus, 40);
    }
  };

  const handleSelect = (val: string) => {
    const chosen = options.find((o) => o.value === val);
    if (chosen) {
      setQuery(chosen.label);
    }
    onChange(val);
    setOpen(false);
    focusNextElement();
  };

  const getInitialHighlightIndex = () => {
    const baseList =
      maxVisibleOptions && maxVisibleOptions > 0
        ? options.slice(0, maxVisibleOptions)
        : options;
    const idx = baseList.findIndex((opt) => opt.value === value);
    return idx >= 0 ? idx : 0;
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setQuery("");
    if (allowClear) {
      onChange("");
    }
    setHighlightedIndex(0);
    if (renderInPortal) {
      updatePortalPosition();
    }
    inputRef.current?.focus();
    if (!open) setOpen(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open) {
      if (e.key === "ArrowDown" || e.key === "Enter") {
        e.preventDefault();
        if (renderInPortal) updatePortalPosition();
        setOpen(true);
      }
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev + 1) % (visibleOptions.length || 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev - 1 + visibleOptions.length) % (visibleOptions.length || 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const targetOption = visibleOptions[highlightedIndex];
      if (targetOption) {
        handleSelect(targetOption.value);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      e.nativeEvent.stopImmediatePropagation?.();
      setOpen(false);
      if (selectedOption) {
        setQuery(selectedOption.label);
      } else if (value && allowCustomText) {
        setQuery(value);
      } else if (!value) {
        setQuery("");
      }
    }
  };

  const isPortal = variant === "portal";
  const showClearButton = (allowClear ? Boolean(query || value) : Boolean(query)) && !disabled;

  const popoverNode = open ? (
    <div
      ref={popoverRef}
      style={
        renderInPortal && portalCoords
          ? {
              position: "fixed",
              top: portalCoords.top,
              bottom: portalCoords.bottom,
              left: portalCoords.left,
              width: portalCoords.width,
            }
          : undefined
      }
      className={cn(
        renderInPortal
          ? "z-[120] overflow-hidden rounded-xl border-2 shadow-2xl animate-in fade-in-0 zoom-in-95"
          : "absolute z-50 mt-1 w-full overflow-hidden rounded-xl border-2 shadow-2xl animate-in fade-in-0 zoom-in-95",
        isPortal
          ? "border-[#D4AF37] bg-[#2D1B0E] text-white"
          : "border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-slate-900 dark:text-white"
      )}
    >
      <div ref={listRef} className={cn("overflow-y-auto p-1.5 space-y-1", maxHeight)}>
        {visibleOptions.length === 0 ? (
          <div className={cn("py-4 text-center text-xs font-medium", isPortal ? "text-amber-200/70" : "text-stone-500 dark:text-stone-400")}>
            Tidak ada data yang cocok dengan &quot;{query}&quot;
          </div>
        ) : (
          visibleOptions.map((opt, idx) => {
            const isSelected = opt.value === value;
            const isHighlighted = idx === highlightedIndex;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => handleSelect(opt.value)}
                onMouseEnter={() => setHighlightedIndex(idx)}
                className={cn(
                  "flex w-full items-center justify-between rounded-lg px-3 py-2 text-xs text-left transition-colors cursor-pointer",
                  isPortal
                    ? isSelected
                      ? "bg-[#D4AF37] text-slate-950 font-black shadow-2xs"
                      : isHighlighted
                      ? "bg-[#3D2513] text-amber-200 font-bold"
                      : "text-white font-semibold hover:bg-[#3D2513]"
                    : isSelected
                    ? "bg-emerald-50 dark:bg-emerald-950/80 text-emerald-950 dark:text-emerald-200 font-extrabold border border-emerald-300 dark:border-emerald-700 shadow-2xs"
                    : isHighlighted
                    ? "bg-stone-100 dark:bg-stone-800 text-slate-950 dark:text-white font-bold"
                    : "text-slate-800 dark:text-stone-200 font-semibold hover:bg-stone-50 dark:hover:bg-stone-800/60"
                )}
              >
                <div className="flex flex-col truncate pr-2">
                  <span className="truncate">{opt.label}</span>
                  {opt.sublabel && (
                    <span className={cn(
                      "text-[10px] font-normal truncate mt-0.5",
                      isPortal
                        ? (isSelected ? "text-slate-800 font-bold" : "text-amber-200/70")
                        : (isSelected ? "text-emerald-700 dark:text-emerald-300 font-medium" : "text-stone-500 dark:text-stone-400")
                    )}>
                      {opt.sublabel}
                    </span>
                  )}
                </div>
                {isSelected && <Check className={cn("h-4 w-4 shrink-0 font-black", isPortal ? "text-slate-950" : "text-emerald-700 dark:text-emerald-400")} />}
              </button>
            );
          })
        )}
      </div>
      {filteredOptions.length > visibleOptions.length && (
        <div
          className={cn(
            "border-t px-3 py-1.5 text-[10px] font-medium flex items-center justify-between gap-2",
            isPortal
              ? "border-[#D4AF37]/30 bg-[#24150B] text-amber-200/80"
              : "border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950/60 text-stone-500 dark:text-stone-400"
          )}
        >
          <span>Menampilkan {visibleOptions.length} teratas dari {filteredOptions.length}</span>
          <span className="italic shrink-0">Ketik untuk mencari</span>
        </div>
      )}
    </div>
  ) : null;

  return (
    <div ref={containerRef} className={cn("relative w-full", open && "z-50", className)}>
      {/* In-Place Direct Input */}
      <div className="relative flex items-center">
        <input
          ref={inputRef}
          id={id}
          type="text"
          disabled={disabled}
          value={query}
          placeholder={open && searchPlaceholder ? searchPlaceholder : placeholder}
          onFocus={(e) => {
            if (renderInPortal) updatePortalPosition();
            setOpen(true);
            setHighlightedIndex(getInitialHighlightIndex());
            e.currentTarget.select();
          }}
          onChange={(e) => {
            const val = e.target.value;
            setQuery(val);
            if (allowCustomText) {
              onChange(val);
            }
            setHighlightedIndex(0);
            if (!open) {
              if (renderInPortal) updatePortalPosition();
              setOpen(true);
            }
          }}
          onKeyDown={handleKeyDown}
          className={cn(
            "w-full rounded-xl pr-14 font-bold shadow-xs transition-colors focus:outline-none disabled:cursor-not-allowed disabled:opacity-50",
            size === "sm" ? "h-9 text-xs px-3" : "h-11 text-sm px-3.5",
            isPortal
              ? "bg-[#2D1B0E] border-2 border-[#D4AF37] text-white placeholder:text-[#D4AF37]/60 focus:ring-2 focus:ring-[#F5D061]/50 focus:border-[#F5D061]"
              : "border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-slate-950 dark:text-white placeholder:text-stone-400 placeholder:font-normal focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600",
            open && (isPortal ? "border-[#F5D061] ring-2 ring-[#F5D061]/50" : "border-emerald-600 ring-2 ring-emerald-500")
          )}
        />

        {/* Action Icons: Clear (X) & Chevron */}
        <div className="absolute right-3 flex items-center gap-1.5 pointer-events-auto">
          {showClearButton && (
            <button
              type="button"
              onClick={handleClear}
              className={cn(
                "p-1 rounded-full transition-colors cursor-pointer",
                isPortal
                  ? "text-[#D4AF37] hover:text-[#F5D061] hover:bg-[#3D2513]"
                  : "text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800"
              )}
              title={allowClear ? "Hapus / Reset" : "Bersihkan pencarian"}
            >
              <X className="h-4 w-4" />
            </button>
          )}
          <button
            type="button"
            tabIndex={-1}
            disabled={disabled}
            onClick={() => {
              if (open) {
                setOpen(false);
              } else {
                if (renderInPortal) updatePortalPosition();
                setOpen(true);
                setHighlightedIndex(getInitialHighlightIndex());
                inputRef.current?.focus();
              }
            }}
            className={cn(
              "p-0.5 transition-colors cursor-pointer",
              isPortal ? "text-[#D4AF37] hover:text-[#F5D061]" : "text-stone-400 hover:text-stone-600 dark:hover:text-stone-300"
            )}
          >
            <ChevronDown
              className={cn(
                "h-4 w-4 transition-transform duration-200",
                open && (isPortal ? "rotate-180 text-[#F5D061]" : "rotate-180 text-emerald-600 dark:text-emerald-400")
              )}
            />
          </button>
        </div>
      </div>

      {/* Popover Options List */}
      {popoverNode && (renderInPortal && typeof document !== "undefined" ? createPortal(popoverNode, document.body) : popoverNode)}
    </div>
  );
}
