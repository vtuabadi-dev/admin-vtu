"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Search, Building2, Plus, Check, MapPin, X } from "lucide-react";
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
  placeholder = "Ketik atau pilih nama Kantor Imigrasi / Layanan Paspor...",
  className,
  disabled = false,
}: KantorImigrasiComboboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState(value || "");
  const [list, setList] = useState<KantorImigrasiItem[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

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

  // Synchronize searchQuery with value prop
  useEffect(() => {
    setSearchQuery(value || "");
  }, [value]);

  // Filtered items based on searchQuery
  const filteredList = useMemo(() => {
    if (!searchQuery || !searchQuery.trim()) return list.slice(0, 30);
    const q = searchQuery.toLowerCase().trim();
    return list
      .filter(
        (item) =>
          item.nama.toLowerCase().includes(q) ||
          item.shortLabel.toLowerCase().includes(q) ||
          item.kota.toLowerCase().includes(q) ||
          item.provinsi.toLowerCase().includes(q)
      )
      .slice(0, 30);
  }, [list, searchQuery]);

  // Check if current search query exactly matches an existing office name
  const exactMatchExists = useMemo(() => {
    if (!searchQuery || !searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return list.some(
      (item) => item.nama.toLowerCase().trim() === q || item.shortLabel.toLowerCase().trim() === q
    );
  }, [list, searchQuery]);

  // Auto-save typed office if not in list
  const autoSaveIfNew = useCallback(
    async (typedText: string) => {
      const trimmed = typedText.trim();
      if (trimmed.length < 3) return;

      const exists = list.some(
        (item) =>
          item.nama.toLowerCase().trim() === trimmed.toLowerCase() ||
          item.shortLabel.toLowerCase().trim() === trimmed.toLowerCase()
      );

      if (!exists) {
        const detectedKota = getKotaFromKanimName(trimmed) || "Di Tempat";
        const newItem = await saveNewKantorImigrasi({
          nama: trimmed,
          kota: detectedKota,
          provinsi: "Indonesia",
        });

        setList((prev) => [newItem, ...prev.filter((k) => k.id !== newItem.id)]);
      }
    },
    [list]
  );

  // Handle outside click to close dropdown & auto-save if newly typed
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        if (searchQuery.trim().length > 2 && !exactMatchExists) {
          autoSaveIfNew(searchQuery);
        }
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [searchQuery, exactMatchExists, autoSaveIfNew]);

  // Handle selecting an existing office
  const handleSelect = (item: KantorImigrasiItem) => {
    setSearchQuery(item.nama);
    onChange(item.nama, item.kota);
    setIsOpen(false);
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
    setSearchQuery(newItem.nama);
    onChange(newItem.nama, newItem.kota);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className={cn("relative w-full", className)}>
      <div className="relative flex items-center">
        <Building2 className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <input
          type="text"
          disabled={disabled}
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            onChange(e.target.value, getKotaFromKanimName(e.target.value));
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              if (searchQuery.trim().length > 2 && !exactMatchExists) {
                handleAddNewKanim();
              } else {
                setIsOpen(false);
              }
            }
          }}
          onBlur={() => {
            if (searchQuery.trim().length > 2 && !exactMatchExists) {
              autoSaveIfNew(searchQuery);
            }
          }}
          placeholder={placeholder}
          className="w-full pl-9 pr-9 py-2 text-xs rounded-lg border border-stone-300 dark:border-stone-700 bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none transition-all placeholder:text-muted-foreground"
        />
        {searchQuery ? (
          <button
            type="button"
            onClick={() => {
              setSearchQuery("");
              onChange("", "");
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 rounded-full"
            title="Hapus pilihan"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : (
          <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
        )}
      </div>

      {/* Floating Dropdown */}
      {isOpen && !disabled && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-50 max-h-64 overflow-y-auto rounded-xl border border-stone-200 dark:border-stone-800 bg-popover text-popover-foreground shadow-xl animate-in fade-in-50 zoom-in-95">
          {filteredList.length === 0 && exactMatchExists && (
            <div className="p-3 text-center text-xs text-muted-foreground">
              Tidak ada kantor imigrasi yang cocok.
            </div>
          )}

          {/* List of matched items */}
          <div className="p-1 space-y-0.5">
            {filteredList.map((item) => {
              const isSelected =
                value && (value.toLowerCase() === item.nama.toLowerCase() || value.toLowerCase() === item.shortLabel.toLowerCase());

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelect(item)}
                  className={cn(
                    "w-full text-left px-3 py-2 rounded-lg text-xs transition-colors flex items-start justify-between gap-2 group",
                    isSelected
                      ? "bg-primary/10 text-primary font-bold"
                      : "hover:bg-muted text-foreground"
                  )}
                >
                  <div className="space-y-0.5">
                    <p className="font-semibold leading-tight group-hover:text-primary transition-colors">
                      {item.nama}
                    </p>
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                      <span className="flex items-center gap-0.5">
                        <MapPin className="h-2.5 w-2.5 text-primary" />
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

            {/* If user typed a new office name not in the list, offer to save it */}
            {!exactMatchExists && searchQuery.trim().length > 2 && (
              <button
                type="button"
                onClick={handleAddNewKanim}
                className="w-full text-left p-2.5 mt-1 rounded-lg border border-dashed border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2 transition-colors"
              >
                <Plus className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                <div>
                  <span>Tambahkan sebagai Kantor Baru:</span>
                  <p className="font-bold text-emerald-900 dark:text-emerald-100 truncate">
                    &quot;{searchQuery.trim()}&quot;
                  </p>
                  <p className="text-[10px] font-normal text-emerald-700 dark:text-emerald-400">
                    Otomatis tersimpan ke database dan akan dapat dicari di masa depan.
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
