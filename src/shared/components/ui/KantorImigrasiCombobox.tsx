"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { Search, Building2, Plus, Check, MapPin, X, ChevronDown } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import {
  getStoredKantorImigrasiList,
  saveNewKantorImigrasi,
  getKotaFromKanimName,
} from "@/shared/lib/kantor-imigrasi";
import type { KantorImigrasiItem } from "@/shared/lib/kantor-imigrasi";

interface KantorImigrasiComboboxProps {
  value: string;
  onChange: (nama: string, kota?: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function KantorImigrasiCombobox({
  value,
  onChange,
  placeholder = "Cari atau pilih Kantor Imigrasi / Layanan Paspor...",
  className,
  disabled = false,
}: KantorImigrasiComboboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [list, setList] = useState<KantorImigrasiItem[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Load initial list from local cache + backend
  useEffect(() => {
    const stored = getStoredKantorImigrasiList();
    setList(stored);

    // Fetch freshest list from API in background
    fetch("/api/master/kantor-imigrasi")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.data) && data.data.length > 0) {
          setList(data.data);
        }
      })
      .catch(() => {});
  }, []);

  // When opening dropdown, autofocus search input
  useEffect(() => {
    if (isOpen) {
      setSearchQuery("");
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  // Find currently selected item
  const selectedItem = useMemo(() => {
    if (!value || !value.trim()) return null;
    const cleanVal = value.toLowerCase().trim();
    return (
      list.find(
        (item) =>
          item.nama.toLowerCase().trim() === cleanVal ||
          item.shortLabel.toLowerCase().trim() === cleanVal
      ) || null
    );
  }, [list, value]);

  // Filtered items based on searchQuery
  const filteredList = useMemo(() => {
    if (!searchQuery || !searchQuery.trim()) return list.slice(0, 35);
    const q = searchQuery.toLowerCase().trim();
    return list
      .filter(
        (item) =>
          item.nama.toLowerCase().includes(q) ||
          item.shortLabel.toLowerCase().includes(q) ||
          item.kota.toLowerCase().includes(q) ||
          item.provinsi.toLowerCase().includes(q)
      )
      .slice(0, 35);
  }, [list, searchQuery]);

  // Check if current search query matches an existing office name exactly
  const exactMatchExists = useMemo(() => {
    if (!searchQuery || !searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return list.some(
      (item) =>
        item.nama.toLowerCase().trim() === q ||
        item.shortLabel.toLowerCase().trim() === q
    );
  }, [list, searchQuery]);

  // Handle outside click to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Handle selecting an existing office
  const handleSelect = (item: KantorImigrasiItem) => {
    onChange(item.nama, item.kota);
    setIsOpen(false);
  };

  // Handle clearing value
  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange("", "");
  };

  // Handle creating a new office name on-the-fly and saving to DB
  const handleAddNewKanim = async () => {
    const trimmed = searchQuery.trim();
    if (!trimmed) return;

    // Detect kota from name if possible
    const detectedKota = getKotaFromKanimName(trimmed) || "Di Tempat";

    const newItem = await saveNewKantorImigrasi({
      nama: trimmed,
      kota: detectedKota,
      provinsi: "Indonesia",
    });

    setList((prev) => [newItem, ...prev.filter((k) => k.id !== newItem.id)]);
    onChange(newItem.nama, newItem.kota);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className={cn("relative w-full", className)}>
      {/* Searchable Trigger Button */}
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        onClick={() => {
          if (!disabled) setIsOpen((prev) => !prev);
        }}
        onKeyDown={(e) => {
          if ((e.key === "Enter" || e.key === " ") && !disabled) {
            e.preventDefault();
            setIsOpen((prev) => !prev);
          }
        }}
        className={cn(
          "w-full min-h-[38px] px-3 py-2 text-xs rounded-lg border bg-background text-foreground transition-all flex items-center justify-between gap-2 cursor-pointer select-none",
          isOpen
            ? "border-primary ring-2 ring-primary/20"
            : "border-stone-300 dark:border-stone-700 hover:border-primary/50",
          disabled && "opacity-50 cursor-not-allowed pointer-events-none"
        )}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <Building2 className="h-4 w-4 text-primary shrink-0" />
          {value ? (
            <div className="flex items-center gap-1.5 truncate">
              <span className="font-semibold text-foreground truncate">{value}</span>
              {selectedItem?.kota && (
                <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded shrink-0">
                  {selectedItem.kota}
                </span>
              )}
            </div>
          ) : (
            <span className="text-muted-foreground truncate">{placeholder}</span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {value && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 rounded-md text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
              title="Hapus pilihan"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
          <ChevronDown
            className={cn(
              "h-3.5 w-3.5 text-muted-foreground transition-transform duration-200",
              isOpen && "rotate-180 text-primary"
            )}
          />
        </div>
      </div>

      {/* Floating Popover (100% Solid Opaque Background & High Stacking Context) */}
      {isOpen && !disabled && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-50 rounded-xl border-2 border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-950 dark:text-stone-50 shadow-2xl overflow-hidden animate-in fade-in-0 zoom-in-95">
          {/* Search Bar Input */}
          <div className="p-2.5 border-b border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950/60 space-y-1.5">
            <div className="relative flex items-center">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    if (filteredList.length > 0 && exactMatchExists) {
                      handleSelect(filteredList[0]!);
                    } else if (searchQuery.trim().length > 2) {
                      handleAddNewKanim();
                    }
                  } else if (e.key === "Escape") {
                    setIsOpen(false);
                  }
                }}
                placeholder="Ketik kantor, kota (Surabaya, Malang, Sidoarjo)..."
                className="w-full pl-8 pr-7 py-1.5 text-xs rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary placeholder:text-muted-foreground"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-stone-400 hover:text-stone-600 rounded-full"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>

            <div className="flex items-center justify-between px-1 text-[10px] text-muted-foreground">
              <span>Daftar Kantor Imigrasi / Kanim</span>
              <span>{filteredList.length} kantor tersedia</span>
            </div>
          </div>

          {/* List of Matched Offices */}
          <div className="max-h-56 overflow-y-auto p-1.5 space-y-1">
            {filteredList.map((item) => {
              const isSelected =
                value &&
                (value.toLowerCase().trim() === item.nama.toLowerCase().trim() ||
                  value.toLowerCase().trim() === item.shortLabel.toLowerCase().trim());

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelect(item)}
                  className={cn(
                    "w-full text-left px-3 py-2 rounded-lg text-xs transition-all flex items-start justify-between gap-2 group cursor-pointer",
                    isSelected
                      ? "bg-primary/10 text-primary font-bold border border-primary/20"
                      : "hover:bg-stone-100 dark:hover:bg-stone-800 text-foreground"
                  )}
                >
                  <div className="space-y-0.5 min-w-0">
                    <p className="font-semibold leading-tight group-hover:text-primary transition-colors truncate">
                      {item.nama}
                    </p>
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                      <span className="flex items-center gap-0.5 font-medium">
                        <MapPin className="h-2.5 w-2.5 text-primary shrink-0" />
                        {item.kota}
                      </span>
                      <span>&bull;</span>
                      <span>{item.provinsi}</span>
                    </div>
                  </div>
                  {isSelected && <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />}
                </button>
              );
            })}

            {filteredList.length === 0 && (
              <div className="p-3 text-center text-xs text-muted-foreground">
                Tidak ada kantor imigrasi yang cocok dengan &quot;{searchQuery}&quot;.
              </div>
            )}

            {/* If user typed a new office name not in the list, offer to save it */}
            {!exactMatchExists && searchQuery.trim().length > 2 && (
              <button
                type="button"
                onClick={handleAddNewKanim}
                className="w-full text-left p-2.5 mt-1 rounded-lg border border-dashed border-emerald-500/50 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer"
              >
                <Plus className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                <div className="min-w-0">
                  <span>Tambahkan sebagai Kantor Baru:</span>
                  <p className="font-bold text-emerald-950 dark:text-emerald-100 truncate">
                    &quot;{searchQuery.trim()}&quot;
                  </p>
                  <p className="text-[10px] font-normal text-emerald-700 dark:text-emerald-400">
                    Otomatis tersimpan ke database & terhubung dengan Kota Kanim.
                  </p>
                </div>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
