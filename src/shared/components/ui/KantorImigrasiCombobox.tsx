"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Building2, Plus, Check, MapPin, X, ChevronDown, Search, Trash2 } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import {
  getStoredKantorImigrasiList,
  saveNewKantorImigrasi,
  getKotaFromKanimName,
  deleteCustomKantorImigrasi,
  isCustomKantorImigrasi,
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
  placeholder = "Cari atau ketik Kantor Imigrasi / Layanan Paspor...",
  className,
  disabled = false,
}: KantorImigrasiComboboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [list, setList] = useState<KantorImigrasiItem[]>([]);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load initial list from local cache + backend
  useEffect(() => {
    const stored = getStoredKantorImigrasiList();
    // Filter out accidental "malang" custom entry if any
    const cleaned = stored.filter(
      (k) => !(k.id !== "kanim-mlg" && k.nama.toLowerCase().trim() === "malang")
    );
    setList(cleaned);

    // Fetch freshest list from API in background
    fetch("/api/master/kantor-imigrasi")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.data) && data.data.length > 0) {
          const apiCleaned = data.data.filter(
            (k: KantorImigrasiItem) =>
              !(k.id !== "kanim-mlg" && k.nama.toLowerCase().trim() === "malang")
          );
          setList(apiCleaned);
        }
      })
      .catch(() => {});
  }, []);

  // Filtered items based on currently typed value
  const filteredList = useMemo(() => {
    if (!value || !value.trim()) return list.slice(0, 35);
    const q = value.toLowerCase().trim();
    return list
      .filter(
        (item) =>
          item.nama.toLowerCase().includes(q) ||
          item.shortLabel.toLowerCase().includes(q) ||
          item.kota.toLowerCase().includes(q) ||
          item.provinsi.toLowerCase().includes(q)
      )
      .slice(0, 35);
  }, [list, value]);

  // Check if current value matches an existing office name exactly
  const exactMatchExists = useMemo(() => {
    if (!value || !value.trim()) return true;
    const q = value.toLowerCase().trim();
    return list.some(
      (item) =>
        item.nama.toLowerCase().trim() === q ||
        item.shortLabel.toLowerCase().trim() === q
    );
  }, [list, value]);

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
  const handleSelect = useCallback(
    (item: KantorImigrasiItem) => {
      onChange(item.nama, item.kota);
      setIsOpen(false);
      setHighlightedIndex(-1);
    },
    [onChange]
  );

  // Handle direct text input
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVal = e.target.value;
    const detectedKota = getKotaFromKanimName(newVal);
    onChange(newVal, detectedKota);
    if (!isOpen) setIsOpen(true);
    setHighlightedIndex(-1);
  };

  // Handle clearing value
  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange("", "");
    inputRef.current?.focus();
  };

  // Handle deleting a custom office item
  const handleDeleteCustomItem = async (
    item: KantorImigrasiItem,
    e: React.MouseEvent
  ) => {
    e.stopPropagation();
    await deleteCustomKantorImigrasi(item.id);
    setList((prev) => prev.filter((k) => k.id !== item.id && k.nama !== item.nama));
    if (value && value.toLowerCase().trim() === item.nama.toLowerCase().trim()) {
      onChange("", "");
    }
  };

  // Handle creating a new office name on-the-fly and saving to DB
  const handleAddNewKanim = async () => {
    const trimmed = (value || "").trim();
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
    setHighlightedIndex(-1);
  };

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
      } else {
        setHighlightedIndex((prev) =>
          prev < filteredList.length - 1 ? prev + 1 : 0
        );
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (isOpen) {
        setHighlightedIndex((prev) =>
          prev > 0 ? prev - 1 : filteredList.length - 1
        );
      }
    } else if (e.key === "Enter") {
      if (isOpen) {
        e.preventDefault();
        if (highlightedIndex >= 0 && filteredList[highlightedIndex]) {
          handleSelect(filteredList[highlightedIndex]!);
        } else if (filteredList.length > 0 && exactMatchExists) {
          handleSelect(filteredList[0]!);
        } else if ((value || "").trim().length > 2) {
          handleAddNewKanim();
        } else {
          setIsOpen(false);
        }
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  return (
    <div ref={containerRef} className={cn("relative w-full", className)}>
      {/* ── DIRECT NATIVE INPUT BOX ── */}
      <div
        className={cn(
          "w-full min-h-[38px] px-3 py-1.5 text-xs rounded-lg border bg-background text-foreground transition-all flex items-center gap-2",
          isOpen
            ? "border-primary ring-2 ring-primary/20"
            : "border-stone-300 dark:border-stone-700 hover:border-primary/50 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20",
          disabled && "opacity-50 cursor-not-allowed pointer-events-none"
        )}
      >
        <Building2 className="h-4 w-4 text-primary shrink-0" />

        <input
          ref={inputRef}
          type="text"
          value={value || ""}
          onChange={handleInputChange}
          onFocus={() => {
            if (!disabled) setIsOpen(true);
          }}
          onClick={() => {
            if (!disabled && !isOpen) setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder={placeholder}
          className="w-full bg-transparent text-xs text-foreground placeholder:text-muted-foreground focus:outline-none font-medium"
        />

        <div className="flex items-center gap-1 shrink-0">
          {value && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 rounded-md text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
              title="Hapus / Kosongkan"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              if (!disabled) {
                setIsOpen((prev) => !prev);
                inputRef.current?.focus();
              }
            }}
            tabIndex={-1}
            className="p-1 rounded-md text-muted-foreground hover:text-foreground transition-colors"
            title="Buka / Tutup Rekomendasi"
          >
            <ChevronDown
              className={cn(
                "h-3.5 w-3.5 text-muted-foreground transition-transform duration-200",
                isOpen && "rotate-180 text-primary"
              )}
            />
          </button>
        </div>
      </div>

      {/* ── FLOATING POPOVER RECOMMENDATIONS ── */}
      {isOpen && !disabled && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-50 rounded-xl border-2 border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-950 dark:text-stone-50 shadow-2xl overflow-hidden animate-in fade-in-0 zoom-in-95">
          {/* Subheader info */}
          <div className="px-3 py-1.5 border-b border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950/60 flex items-center justify-between text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <Search className="h-3 w-3" />
              Pilih dari daftar atau lanjut ketik manual
            </span>
            <span>{filteredList.length} kantor ditemukan</span>
          </div>

          {/* List of Matched Offices */}
          <div className="max-h-56 overflow-y-auto p-1.5 space-y-1">
            {filteredList.map((item, idx) => {
              const isSelected =
                value &&
                (value.toLowerCase().trim() === item.nama.toLowerCase().trim() ||
                  value.toLowerCase().trim() === item.shortLabel.toLowerCase().trim());
              const isHighlighted = idx === highlightedIndex;
              const isCustom = isCustomKantorImigrasi(item);

              return (
                <div
                  key={item.id}
                  onClick={() => handleSelect(item)}
                  onMouseEnter={() => setHighlightedIndex(idx)}
                  className={cn(
                    "w-full text-left px-3 py-2 rounded-lg text-xs transition-all flex items-center justify-between gap-2 group cursor-pointer",
                    isSelected
                      ? "bg-primary/10 text-primary font-bold border border-primary/20"
                      : isHighlighted
                      ? "bg-stone-100 dark:bg-stone-800 text-foreground"
                      : "hover:bg-stone-100 dark:hover:bg-stone-800 text-foreground"
                  )}
                >
                  <div className="space-y-0.5 min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="font-semibold leading-tight group-hover:text-primary transition-colors truncate">
                        {item.nama}
                      </p>
                      {isCustom && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 font-normal shrink-0 border border-amber-500/20">
                          Kustom
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                      <span className="flex items-center gap-0.5 font-medium">
                        <MapPin className="h-2.5 w-2.5 text-primary shrink-0" />
                        {item.kota}
                      </span>
                      <span>&bull;</span>
                      <span>{item.provinsi}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {isCustom && (
                      <button
                        type="button"
                        onClick={(e) => handleDeleteCustomItem(item, e)}
                        className="p-1 rounded text-stone-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 transition-colors"
                        title={`Hapus "${item.nama}" dari daftar`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                    {isSelected && <Check className="h-4 w-4 text-primary shrink-0" />}
                  </div>
                </div>
              );
            })}

            {filteredList.length === 0 && (
              <div className="p-3 text-center text-xs text-muted-foreground">
                Tidak ada kantor di daftar dengan nama &quot;{value}&quot;. Ketikan Anda tetap akan tersimpan sebagai teks surat.
              </div>
            )}

            {/* If user typed a new office name not in the list, offer to save it */}
            {!exactMatchExists && (value || "").trim().length > 2 && (
              <button
                type="button"
                onClick={handleAddNewKanim}
                className="w-full text-left p-2.5 mt-1 rounded-lg border border-dashed border-emerald-500/50 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer"
              >
                <Plus className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                <div className="min-w-0">
                  <span>Simpan ke Database Master:</span>
                  <p className="font-bold text-emerald-950 dark:text-emerald-100 truncate">
                    &quot;{(value || "").trim()}&quot;
                  </p>
                  <p className="text-[10px] font-normal text-emerald-700 dark:text-emerald-400">
                    Otomatis terhubung dengan Kota Kanim di surat.
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
