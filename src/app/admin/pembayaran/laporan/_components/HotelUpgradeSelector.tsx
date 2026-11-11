"use client";

import { useMemo } from "react";
import { Building } from "lucide-react";
import {
  SearchableSelect,
  type SearchableOption,
} from "@/shared/components/ui/SearchableSelect";

const MAX_VISIBLE_HOTEL_OPTIONS = 6;

export interface BuildHotelUpgradeOptionsParams {
  options: string[];
  packageHotel?: string;
  currentHotel?: string;
  selectedHotel?: string;
}

/**
 * Menyusun daftar opsi hotel yang terurut (hotel upgrade aktif, asal paket, pilihan saat ini, lalu daftar lengkap)
 * tanpa duplikasi untuk dipakai pada SearchableSelect.
 */
export function buildHotelUpgradeOptions({
  options,
  packageHotel = "",
  currentHotel = "",
  selectedHotel = "",
}: BuildHotelUpgradeOptionsParams): SearchableOption[] {
  const seen = new Set<string>();
  const result: SearchableOption[] = [];

  const pushHotel = (rawName: string, sublabel?: string) => {
    const name = rawName.trim();
    if (!name || seen.has(name)) return;
    seen.add(name);
    result.push({
      value: name,
      label: name,
      ...(sublabel ? { sublabel } : {}),
    });
  };

  if (currentHotel && currentHotel !== packageHotel) {
    pushHotel(currentHotel, "Hotel Saat Ini - Upgrade");
  }
  if (packageHotel) {
    pushHotel(packageHotel, "Asal Paket Standar");
  }
  if (selectedHotel && selectedHotel !== currentHotel && selectedHotel !== packageHotel) {
    pushHotel(selectedHotel, "Pilihan Saat Ini");
  }
  for (const h of options) {
    pushHotel(h);
  }

  return result;
}

export interface HotelUpgradeSelectorProps {
  currentHotelMekkah: string;
  packageHotelMekkah: string;
  selectedHotelMekkah: string;
  onChangeHotelMekkah: (value: string) => void;
  mekkahHotelOptions: string[];
  currentHotelMadinah: string;
  packageHotelMadinah: string;
  selectedHotelMadinah: string;
  onChangeHotelMadinah: (value: string) => void;
  madinahHotelOptions: string[];
}

/**
 * Selector tujuan upgrade hotel Makkah & Madinah dengan searchable dropdown (maksimal 6 opsi teratas).
 */
export function HotelUpgradeSelector({
  currentHotelMekkah,
  packageHotelMekkah,
  selectedHotelMekkah,
  onChangeHotelMekkah,
  mekkahHotelOptions,
  currentHotelMadinah,
  packageHotelMadinah,
  selectedHotelMadinah,
  onChangeHotelMadinah,
  madinahHotelOptions,
}: HotelUpgradeSelectorProps) {
  const mekkahSelectOptions = useMemo(
    () =>
      buildHotelUpgradeOptions({
        options: mekkahHotelOptions,
        packageHotel: packageHotelMekkah,
        currentHotel: currentHotelMekkah,
        selectedHotel: selectedHotelMekkah,
      }),
    [mekkahHotelOptions, packageHotelMekkah, currentHotelMekkah, selectedHotelMekkah]
  );

  const madinahSelectOptions = useMemo(
    () =>
      buildHotelUpgradeOptions({
        options: madinahHotelOptions,
        packageHotel: packageHotelMadinah,
        currentHotel: currentHotelMadinah,
        selectedHotel: selectedHotelMadinah,
      }),
    [madinahHotelOptions, packageHotelMadinah, currentHotelMadinah, selectedHotelMadinah]
  );

  const isUpgradeDetected =
    currentHotelMekkah !== packageHotelMekkah ||
    currentHotelMadinah !== packageHotelMadinah ||
    (selectedHotelMekkah && selectedHotelMekkah !== packageHotelMekkah) ||
    (selectedHotelMadinah && selectedHotelMadinah !== packageHotelMadinah);

  const cityFields = [
    {
      key: "mekkah",
      label: "🕋 Hotel Makkah",
      placeholder: "Pilih hotel Makkah...",
      searchPlaceholder: "Ketik nama hotel Makkah...",
      packageHotel: packageHotelMekkah,
      currentHotel: currentHotelMekkah,
      value: selectedHotelMekkah || currentHotelMekkah || packageHotelMekkah,
      onChange: onChangeHotelMekkah,
      options: mekkahSelectOptions,
    },
    {
      key: "madinah",
      label: "🕌 Hotel Madinah",
      placeholder: "Pilih hotel Madinah...",
      searchPlaceholder: "Ketik nama hotel Madinah...",
      packageHotel: packageHotelMadinah,
      currentHotel: currentHotelMadinah,
      value: selectedHotelMadinah || currentHotelMadinah || packageHotelMadinah,
      onChange: onChangeHotelMadinah,
      options: madinahSelectOptions,
    },
  ];

  return (
    <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
          <Building className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          Pilih Hotel Tujuan Upgrade (Makkah & Madinah):
        </label>
        {isUpgradeDetected && (
          <span className="text-[10px] font-bold bg-amber-500/20 text-amber-800 dark:text-amber-300 px-2 py-0.5 rounded border border-amber-500/30">
            Upgrade Terdeteksi / Aktif
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {cityFields.map((field) => (
          <div key={field.key} className="space-y-1">
            <label className="text-[11px] font-semibold text-foreground flex items-center justify-between gap-2">
              <span className="shrink-0">{field.label}</span>
              {field.packageHotel && (
                <span
                  className="text-[10px] text-muted-foreground truncate max-w-[150px]"
                  title={`Asal Paket: ${field.packageHotel}`}
                >
                  Asal Paket: {field.packageHotel}
                </span>
              )}
            </label>
            <SearchableSelect
              options={field.options}
              value={field.value}
              onChange={field.onChange}
              placeholder={field.placeholder}
              searchPlaceholder={field.searchPlaceholder}
              size="sm"
              maxVisibleOptions={MAX_VISIBLE_HOTEL_OPTIONS}
              renderInPortal
              allowClear={false}
            />
            {field.currentHotel && field.currentHotel !== field.packageHotel && (
              <p className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                ✨ Hotel saat ini di manifest: <strong>{field.currentHotel}</strong>
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

