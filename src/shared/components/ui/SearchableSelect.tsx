"use client";

import { useState, useRef, useEffect } from "react";
import { cn } from "@/shared/lib/utils";
import { Search, ChevronDown, Check, X } from "lucide-react";

export interface SearchableOption {
  value: string;
  label: string;
  sublabel?: string;
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
}

export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = "-- Pilih --",
  searchPlaceholder = "Cari data...",
  disabled = false,
  className,
  size = "md",
  id,
  nextFocusId,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Focus search input when popover opens & reset highlight
  useEffect(() => {
    if (open) {
      setHighlightedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setSearch("");
    }
  }, [open]);

  // Auto scroll highlighted option into view when navigating with Arrow keys
  useEffect(() => {
    if (open && listRef.current) {
      const highlightedEl = listRef.current.children[highlightedIndex] as HTMLElement;
      if (highlightedEl) {
        highlightedEl.scrollIntoView({ block: "nearest", behavior: "smooth" });
      }
    }
  }, [highlightedIndex, open]);

  const filteredOptions = options.filter((opt) => {
    if (!search.trim()) return true;
    const term = search.toLowerCase();
    const labelMatch = opt.label.toLowerCase().includes(term);
    const subMatch = opt.sublabel?.toLowerCase().includes(term);
    return labelMatch || subMatch;
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
    onChange(val);
    setOpen(false);
    focusNextElement();
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) {
      if (e.key === "Enter" || e.key === "ArrowDown") {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev + 1) % (filteredOptions.length || 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev - 1 + filteredOptions.length) % (filteredOptions.length || 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const targetOption = filteredOptions[highlightedIndex];
      if (targetOption) {
        handleSelect(targetOption.value);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div ref={containerRef} className={cn("relative w-full", className)}>
      {/* Trigger Button */}
      <button
        id={id}
        type="button"
        disabled={disabled}
        onClick={() => setOpen((prev) => !prev)}
        onKeyDown={handleKeyDown}
        className={cn(
          "flex w-full items-center justify-between rounded-xl border border-stone-300 bg-white px-3.5 text-left text-slate-950 font-bold shadow-xs transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 disabled:cursor-not-allowed disabled:opacity-50",
          size === "sm" ? "h-9 text-xs" : "h-10 text-sm",
          open && "border-emerald-600 ring-2 ring-emerald-500"
        )}
      >
        <span className={cn("truncate font-bold", !selectedOption ? "text-stone-400 font-normal" : "text-slate-950")}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <div className="flex items-center gap-1 shrink-0 ml-2">
          {value && !disabled && (
            <span
              onClick={handleClear}
              className="p-0.5 rounded-full hover:bg-stone-100 text-stone-400 hover:text-stone-700 transition-colors cursor-pointer"
              title="Hapus Pilihan"
            >
              <X className="h-3.5 w-3.5" />
            </span>
          )}
          <ChevronDown className={cn("h-4 w-4 text-stone-500 transition-transform duration-200", open && "rotate-180 text-emerald-600")} />
        </div>
      </button>

      {/* Popover Content */}
      {open && (
        <div className="absolute z-50 mt-1 max-h-60 w-full overflow-hidden rounded-xl border border-stone-200 bg-white text-slate-900 shadow-2xl animate-in fade-in-0 zoom-in-95">
          {/* Search Header */}
          <div className="flex items-center border-b border-stone-200 px-3 py-2 bg-stone-50">
            <Search className="h-4 w-4 shrink-0 text-stone-400 mr-2" />
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setHighlightedIndex(0);
              }}
              onKeyDown={handleKeyDown}
              placeholder={searchPlaceholder}
              className="w-full bg-transparent text-xs font-medium text-slate-900 focus:outline-none placeholder:text-stone-400"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="text-xs font-semibold text-stone-400 hover:text-stone-700 px-1"
              >
                Clear
              </button>
            )}
          </div>

          {/* Options List */}
          <div ref={listRef} className="max-h-48 overflow-y-auto p-1.5 space-y-1">
            {filteredOptions.length === 0 ? (
              <div className="py-4 text-center text-xs font-medium text-stone-500">
                Tidak ada data yang cocok
              </div>
            ) : (
              filteredOptions.map((opt, idx) => {
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
                      isSelected
                        ? "bg-emerald-50 text-emerald-950 font-extrabold border border-emerald-300 shadow-2xs"
                        : isHighlighted
                        ? "bg-stone-100 text-slate-950 font-bold"
                        : "text-slate-800 font-semibold hover:bg-stone-50"
                    )}
                  >
                    <div className="flex flex-col truncate pr-2">
                      <span className="truncate">{opt.label}</span>
                      {opt.sublabel && (
                        <span className="text-[10px] text-stone-500 font-normal truncate">{opt.sublabel}</span>
                      )}
                    </div>
                    {isSelected && <Check className="h-4 w-4 shrink-0 text-emerald-700 font-black" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
