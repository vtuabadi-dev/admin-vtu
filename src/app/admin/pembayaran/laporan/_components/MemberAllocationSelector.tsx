"use client";

import React from "react";
import { AlertCircle, Check, Users } from "lucide-react";
import { Input } from "@/shared/components/ui/Input";
import { Select } from "@/shared/components/ui/Select";
import { DEFAULT_SATUAN_OPTIONS } from "./shared-constants";

/**
 * Mengekstrak daftar nama anggota rombongan yang bersih dan terurut untuk alokasi tagihan.
 */
export function extractGroupMemberNames(anggota?: any[] | null): string[] {
  if (!Array.isArray(anggota) || anggota.length === 0) return [];
  const seen = new Set<string>();
  const names: string[] = [];
  anggota.forEach((a, idx) => {
    const raw =
      a?.namaLengkap ||
      a?.nama ||
      a?.paspor?.manualData?.namaLengkap ||
      a?.paspor?.ocrData?.namaLengkap ||
      `Anggota ${idx + 1}`;
    const trimmed = String(raw || "").trim();
    if (!trimmed) return;
    const norm = trimmed.toLowerCase();
    if (!seen.has(norm)) {
      seen.add(norm);
      names.push(trimmed);
    }
  });
  return names;
}

/**
 * Memeriksa apakah pilihan anggota penanggung item sudah valid sebelum disimpan.
 */
export function isMemberAllocationValid(
  memberNames: string[],
  selectedMembers: string[],
  disabledAllocation = false
): boolean {
  if (disabledAllocation || memberNames.length === 0) return true;
  return selectedMembers.length > 0;
}

interface MemberAllocationSelectorProps {
  qty: number;
  onQtyChange: (nextQty: number) => void;
  satuan?: string;
  onSatuanChange?: (nextSatuan: string) => void;
  isCustomSatuanMode?: boolean;
  onCustomSatuanModeChange?: (isCustom: boolean) => void;
  satuanOptions?: string[];
  hideSatuanField?: boolean;
  memberNames: string[];
  selectedMembers: string[];
  onSelectedMembersChange: (nextMembers: string[]) => void;
  disabledAllocation?: boolean;
  autoSyncQtyWithSelection?: boolean;
  allocationTitle?: string;
  allocationHint?: string;
  satuanHelperText?: string;
}

/**
 * Komponen terpadu untuk input Quantity (+ shortcut "Semua N Pax"), Satuan Item,
 * dan pemilihan wajib anggota rombongan penanggung beban tagihan/potongan (ADR-0034).
 */
export function MemberAllocationSelector({
  qty,
  onQtyChange,
  satuan = "Pax",
  onSatuanChange,
  isCustomSatuanMode = false,
  onCustomSatuanModeChange,
  satuanOptions = DEFAULT_SATUAN_OPTIONS,
  hideSatuanField = false,
  memberNames,
  selectedMembers,
  onSelectedMembersChange,
  disabledAllocation = false,
  autoSyncQtyWithSelection = false,
  allocationTitle = "Diperuntukkan untuk Anggota Rombongan",
  allocationHint,
  satuanHelperText = "Contoh: Pax, Kamar, Pcs, Box, Kg.",
}: MemberAllocationSelectorProps) {
  const normalizedSelected = new Set(selectedMembers.map((s) => s.trim().toLowerCase()));
  const allSelected =
    memberNames.length > 0 && memberNames.every((name) => normalizedSelected.has(name.toLowerCase()));
  const isSemuaActive = memberNames.length > 0 && qty === memberNames.length && allSelected;
  const missingSelection = !disabledAllocation && memberNames.length > 0 && selectedMembers.length === 0;

  const handleToggleSemua = () => {
    if (memberNames.length === 0) return;
    onQtyChange(memberNames.length);
    onSelectedMembersChange([...memberNames]);
  };

  const handleToggleMember = (memberName: string, checked: boolean) => {
    const targetLower = memberName.trim().toLowerCase();
    const updated = checked
      ? [...selectedMembers.filter((n) => n.trim().toLowerCase() !== targetLower), memberName]
      : selectedMembers.filter((n) => n.trim().toLowerCase() !== targetLower);
    onSelectedMembersChange(updated);
    if (autoSyncQtyWithSelection) {
      onQtyChange(Math.max(1, updated.length));
    }
  };

  const mergedSatuanOptions = satuanOptions.includes(satuan) || !satuan
    ? satuanOptions
    : [...satuanOptions, satuan];

  return (
    <div className="space-y-3">
      <div className={hideSatuanField ? "space-y-1.5" : "grid grid-cols-1 sm:grid-cols-2 gap-3"}>
        <div>
          <div className="flex items-center justify-between gap-2 mb-1">
            <label className="text-xs font-bold text-foreground">Berapa Banyak (Quantity)</label>
            {!disabledAllocation && memberNames.length > 0 && (
              <button
                type="button"
                onClick={handleToggleSemua}
                className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md border transition-all cursor-pointer ${
                  isSemuaActive
                    ? "border-amber-500 bg-amber-500 text-white shadow-xs"
                    : "border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-300 hover:bg-amber-500/20"
                }`}
                title={`Atur Quantity = ${memberNames.length} dan pilih seluruh anggota rombongan`}
              >
                {isSemuaActive && <Check className="h-3 w-3" />}
                Semua ({memberNames.length} Pax)
              </button>
            )}
          </div>
          <Input
            type="number"
            min={1}
            placeholder="1"
            value={qty || ""}
            onChange={(e) => {
              const parsed = Math.max(1, Math.round(Number(e.target.value) || 1));
              onQtyChange(parsed);
            }}
          />
          <p className="text-[10px] text-muted-foreground mt-1">
            {memberNames.length > 0 && !disabledAllocation
              ? `Isi angka manual atau klik "Semua (${memberNames.length} Pax)".`
              : "Jumlah pembelian atau pemakaian item aktual."}
          </p>
        </div>

        {!hideSatuanField && onSatuanChange && (
          <div>
            <label className="text-xs font-bold text-foreground block mb-1">Satuan Item</label>
            {isCustomSatuanMode && onCustomSatuanModeChange ? (
              <div className="flex gap-1.5">
                <Input
                  placeholder="Ketik satuan (mis: Paket)"
                  value={satuan}
                  onChange={(e) => onSatuanChange(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => {
                    onCustomSatuanModeChange(false);
                    onSatuanChange("Pax");
                  }}
                  className="text-[11px] px-2.5 bg-muted hover:bg-stone-200 dark:hover:bg-stone-800 rounded-md font-semibold cursor-pointer shrink-0"
                >
                  Pilih
                </button>
              </div>
            ) : (
              <Select
                value={mergedSatuanOptions.includes(satuan) ? satuan : "custom"}
                onChange={(e) => {
                  if (e.target.value === "custom") {
                    if (onCustomSatuanModeChange) {
                      onCustomSatuanModeChange(true);
                    }
                    onSatuanChange("");
                  } else {
                    onSatuanChange(e.target.value);
                  }
                }}
                options={[
                  ...mergedSatuanOptions.map((opt) => ({ value: opt, label: opt })),
                  ...(onCustomSatuanModeChange
                    ? [{ value: "custom", label: "+ Tambah Satuan Lainnya..." }]
                    : []),
                ]}
              />
            )}
            <p className="text-[10px] text-muted-foreground mt-1">{satuanHelperText}</p>
          </div>
        )}
      </div>

      {!disabledAllocation && memberNames.length > 0 && (
        <div
          className={`p-3 rounded-lg border space-y-2 transition-colors ${
            missingSelection
              ? "bg-rose-500/10 border-rose-500/40"
              : "bg-amber-500/10 border-amber-500/30"
          }`}
        >
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <Users
                className={`h-4 w-4 shrink-0 ${
                  missingSelection ? "text-rose-600 dark:text-rose-400" : "text-amber-600 dark:text-amber-400"
                }`}
              />
              {allocationTitle}
              <span className="text-rose-600 dark:text-rose-400">*</span>
            </label>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                missingSelection
                  ? "text-rose-700 dark:text-rose-300 bg-rose-500/20 border-rose-500/30"
                  : "text-amber-700 dark:text-amber-300 bg-amber-500/20 border-amber-500/30"
              }`}
            >
              {missingSelection
                ? "Wajib pilih min. 1 jamaah"
                : `${selectedMembers.length}/${memberNames.length} Jamaah Terpilih`}
            </span>
          </div>

          <div className="flex items-center justify-between gap-2 flex-wrap text-[10px] text-muted-foreground">
            <span>
              {allocationHint ||
                (autoSyncQtyWithSelection
                  ? "Centang anggota yang terkena item ini (Quantity otomatis tersinkron)."
                  : "Centang anggota yang menanggung tagihan/potongan ini (tidak otomatis dibagi rata).")}
            </span>
            <div className="flex items-center gap-2 font-semibold">
              {!autoSyncQtyWithSelection &&
                selectedMembers.length > 0 &&
                selectedMembers.length !== qty && (
                  <>
                    <button
                      type="button"
                      onClick={() => onQtyChange(selectedMembers.length)}
                      className="text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer"
                    >
                      Samakan Qty ({selectedMembers.length})
                    </button>
                    <span>•</span>
                  </>
                )}
              <button
                type="button"
                onClick={() => {
                  onSelectedMembersChange([...memberNames]);
                  if (autoSyncQtyWithSelection) {
                    onQtyChange(Math.max(1, memberNames.length));
                  }
                }}
                className="text-amber-700 dark:text-amber-400 hover:underline cursor-pointer"
              >
                Pilih Semua ({memberNames.length})
              </button>
              <span>•</span>
              <button
                type="button"
                onClick={() => {
                  onSelectedMembersChange([]);
                  if (autoSyncQtyWithSelection) {
                    onQtyChange(1);
                  }
                }}
                className="text-stone-500 hover:underline cursor-pointer"
              >
                Kosongkan
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-36 overflow-y-auto bg-background p-2 rounded-md border">
            {memberNames.map((nama, idx) => {
              const isAllocated = normalizedSelected.has(nama.trim().toLowerCase());
              return (
                <label
                  key={`${nama}-${idx}`}
                  className={`flex items-center gap-2 p-1.5 rounded text-xs cursor-pointer transition-colors ${
                    isAllocated
                      ? "bg-amber-500/15 font-bold text-amber-900 dark:text-amber-200 border border-amber-500/30"
                      : "text-muted-foreground hover:bg-muted"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isAllocated}
                    onChange={(e) => handleToggleMember(nama, e.target.checked)}
                    className="rounded text-amber-600 focus:ring-amber-500 h-3.5 w-3.5 shrink-0"
                  />
                  <span className="truncate">{nama}</span>
                </label>
              );
            })}
          </div>

          {missingSelection && (
            <p className="text-[11px] font-medium text-rose-700 dark:text-rose-300 flex items-start gap-1.5">
              <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <span>
                Pilih minimal 1 anggota rombongan (atau klik &ldquo;Semua&rdquo;) agar beban tagihan tidak terbagi rata secara keliru di Manifest Pembayaran.
              </span>
            </p>
          )}
        </div>
      )}
    </div>
  );
}
