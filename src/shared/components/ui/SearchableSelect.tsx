"use client";

import { useState, useRef, useEffect } from "react";
import { cn } from "@/shared/lib/utils";
import { ChevronDown, Check, X } from "lucide-react";

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
  allowCustomText?: boolean;
  maxHeight?: string;
}

export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = "-- Pilih --",
  disabled = false,
  className,
  size = "md",
  id,
  nextFocusId,
  allowCustomText = false,
  maxHeight = "max-h-[400px]",
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  // Sync query when value or selectedOption changes
  useEffect(() => {
    if (selectedOption) {
      setQuery(selectedOption.label);
    } else if (value && allowCustomText) {
      setQuery(value);
    } else if (!value) {
      setQuery("");
    }
  }, [value, selectedOption, allowCustomText]);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        if (selectedOption) {
          setQuery(selectedOption.label);
        } else if (value && allowCustomText) {
          setQuery(value);
        } else if (!value) {
          setQuery("");
        }
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [selectedOption, value, allowCustomText]);

  // Auto scroll highlighted option into view
  useEffect(() => {
    if (open && listRef.current) {
      const highlightedEl = listRef.current.children[highlightedIndex] as HTMLElement;
      if (highlightedEl) {
        highlightedEl.scrollIntoView({ block: "nearest", behavior: "smooth" });
      }
    }
  }, [highlightedIndex, open]);

  // Filter options based on query when open
  const filteredOptions = options.filter((opt) => {
    if (!open || !query.trim()) return true;
    const term = query.toLowerCase();
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
    const chosen = options.find((o) => o.value === val);
    if (chosen) {
      setQuery(chosen.label);
    }
    onChange(val);
    setOpen(false);
    focusNextElement();
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setQuery("");
    onChange("");
    inputRef.current?.focus();
    if (!open) setOpen(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open) {
      if (e.key === "ArrowDown" || e.key === "Enter") {
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
      if (selectedOption) {
        setQuery(selectedOption.label);
      }
    }
  };

  return (
    <div ref={containerRef} className={cn("relative w-full", className)}>
      {/* In-Place Direct Input */}
      <div className="relative flex items-center">
        <input
          ref={inputRef}
          id={id}
          type="text"
          disabled={disabled}
          value={query}
          placeholder={placeholder}
          onFocus={() => {
            setOpen(true);
            setHighlightedIndex(0);
          }}
          onChange={(e) => {
            const val = e.target.value;
            setQuery(val);
            if (allowCustomText) {
              onChange(val);
            }
            setHighlightedIndex(0);
            if (!open) setOpen(true);
          }}
          onKeyDown={handleKeyDown}
          className={cn(
            "w-full rounded-xl border border-stone-300 bg-white px-3.5 pr-14 text-slate-950 font-bold shadow-xs transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 disabled:cursor-not-allowed disabled:opacity-50 placeholder:text-stone-400 placeholder:font-normal",
            size === "sm" ? "h-9 text-xs" : "h-11 text-sm",
            open && "border-emerald-600 ring-2 ring-emerald-500"
          )}
        />

        {/* Action Icons: Clear (X) & Chevron */}
        <div className="absolute right-3 flex items-center gap-1.5 pointer-events-auto">
          {(query || value) && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 rounded-full text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer"
              title="Hapus / Reset"
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
                inputRef.current?.focus();
                setOpen(true);
              }
            }}
            className="p-0.5 text-stone-400 hover:text-stone-600 transition-colors cursor-pointer"
          >
            <ChevronDown
              className={cn(
                "h-4 w-4 transition-transform duration-200",
                open && "rotate-180 text-emerald-600"
              )}
            />
          </button>
        </div>
      </div>

      {/* Popover Options List */}
      {open && (
        <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-xl border border-stone-200 bg-white text-slate-900 shadow-2xl animate-in fade-in-0 zoom-in-95">
          <div ref={listRef} className={cn("overflow-y-auto p-1.5 space-y-1", maxHeight)}>
            {filteredOptions.length === 0 ? (
              <div className="py-4 text-center text-xs font-medium text-stone-500">
                Tidak ada data yang cocok dengan &quot;{query}&quot;
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
                      "flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-xs text-left transition-colors cursor-pointer",
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
                        <span className="text-[10px] text-stone-500 font-normal truncate mt-0.5">
                          {opt.sublabel}
                        </span>
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
