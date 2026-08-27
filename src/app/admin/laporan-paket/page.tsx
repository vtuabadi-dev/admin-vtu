"use client";

import { useState, useEffect, useRef } from "react";
import { Card } from "@/shared/components/ui/Card";
import { Badge } from "@/shared/components/ui/Badge";
import {
  Layers,
  BookOpen,
  HeartHandshake,
  ChevronDown,
  Search,
  CalendarDays,
  X,
  MessageCircle,
  Copy,
} from "lucide-react";
import { Button } from "@/shared/components/ui/Button";
import { Modal } from "@/shared/components/ui/Modal";

const formatRupiah = (val: number) => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(val);
};

const BULAN_LIST = [
  { value: "1", label: "Januari" },
  { value: "2", label: "Februari" },
  { value: "3", label: "Maret" },
  { value: "4", label: "April" },
  { value: "5", label: "Mei" },
  { value: "6", label: "Juni" },
  { value: "7", label: "Juli" },
  { value: "8", label: "Agustus" },
  { value: "9", label: "September" },
  { value: "10", label: "Oktober" },
  { value: "11", label: "November" },
  { value: "12", label: "Desember" },
];

const currentYear = new Date().getFullYear();
const TAHUN_LIST = Array.from({ length: 5 }, (_, i) => String(currentYear - i));

const DEFAULT_HEADER = `*LAPORAN KOLEKTIF BADAL UMROH & WAKAF QURAN*`;
const DEFAULT_BADAL_FORMAT = `[no]. [nama] ([gender] - [hubungan])`;
const DEFAULT_WAKAF_FORMAT = `[no]. [nama] ([jumlah] Mushaf)`;
const DEFAULT_FOOTER = `Demikian laporan kolektif paket ini.`;

const splitNiatNames = (niatStr: string | null | undefined): string[] => {
  if (!niatStr || !niatStr.trim()) return ["Niat Hamba Allah / Keluarga"];
  const parts = niatStr
    .split(/[\n,;]+/)
    .map((s) => s.replace(/^\d+[\.\)\-]\s*/, "").trim())
    .filter((s) => s.length > 0);
  return parts.length > 0 ? parts : [niatStr.trim()];
};

// ── Searchable Combobox ──
function SearchableCombobox({
  options,
  value,
  onChange,
  placeholder,
  disabled,
}: {
  options: string[];
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = options.filter((o) =>
    o.toLowerCase().includes(query.toLowerCase())
  );

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        if (!value) setQuery("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [value]);

  const handleSelect = (paket: string) => {
    onChange(paket);
    setQuery(paket);
    setOpen(false);
  };

  const handleClear = () => {
    onChange("");
    setQuery("");
    setOpen(false);
    inputRef.current?.focus();
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={open ? query : value || query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!open) setOpen(true);
            if (value) onChange(""); // clear selection on new type
          }}
          onFocus={() => {
            setOpen(true);
            if (value) setQuery(value);
          }}
          placeholder={disabled ? "Pilih bulan & tahun terlebih dahulu..." : placeholder}
          disabled={disabled}
          className="w-full h-11 pl-10 pr-10 text-sm rounded-lg border border-input bg-background focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          autoComplete="off"
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {(value || query) && !disabled ? (
            <button
              onClick={handleClear}
              className="text-muted-foreground hover:text-foreground transition-colors"
              type="button"
              tabIndex={-1}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          ) : null}
          <ChevronDown
            className={`h-4 w-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
          />
        </div>
      </div>

      {/* Dropdown List */}
      {open && !disabled && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-background border border-border rounded-lg shadow-lg overflow-hidden max-h-60 overflow-y-auto">
          {filtered.length > 0 ? (
            filtered.map((paket) => (
              <button
                key={paket}
                type="button"
                onClick={() => handleSelect(paket)}
                className={`w-full text-left px-4 py-2.5 text-sm hover:bg-muted transition-colors ${
                  value === paket ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 font-semibold" : ""
                }`}
              >
                <span className="flex items-center gap-2">
                  <HeartHandshake className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                  {paket}
                </span>
              </button>
            ))
          ) : (
            <div className="px-4 py-6 text-center text-sm text-muted-foreground">
              {options.length === 0
                ? "Tidak ada paket ditemukan untuk bulan ini."
                : "Tidak ada paket yang cocok dengan pencarian Anda."}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main Page ──
export default function AdminLaporanPaketPage() {
  const now = new Date();
  const [selectedBulan, setSelectedBulan] = useState(String(now.getMonth() + 1));
  const [selectedTahun, setSelectedTahun] = useState(String(now.getFullYear()));

  const [daftarPaket, setDaftarPaket] = useState<string[]>([]);
  const [loadingPaket, setLoadingPaket] = useState(false);
  const [selectedPaket, setSelectedPaket] = useState<string>("");

  const [laporanBadal, setLaporanBadal] = useState<any[]>([]);
  const [laporanWakaf, setLaporanWakaf] = useState<any[]>([]);
  const [linkedPackageNames, setLinkedPackageNames] = useState<string[]>([]);
  const [loadingLaporan, setLoadingLaporan] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Manual linking states
  const [refreshCounter, setRefreshCounter] = useState(0);
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [selectedTargetPackage, setSelectedTargetPackage] = useState("");
  const [linking, setLinking] = useState(false);
  const [unlinking, setUnlinking] = useState(false);

  const refetchLaporan = () => setRefreshCounter((c) => c + 1);

  // WA Template configuration states
  const [activeWaTab, setActiveWaTab] = useState<"preview" | "settings">("preview");
  const [waHeader, setWaHeader] = useState(DEFAULT_HEADER);
  const [waBadalFormat, setWaBadalFormat] = useState(DEFAULT_BADAL_FORMAT);
  const [waWakafFormat, setWaWakafFormat] = useState(DEFAULT_WAKAF_FORMAT);
  const [waFooter, setWaFooter] = useState(DEFAULT_FOOTER);

  // Data Master Harga
  const [hargaBadal, setHargaBadal] = useState<number>(0);
  const [hargaWakaf, setHargaWakaf] = useState<number>(0);

  // WA Template State
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [waTemplate, setWaTemplate] = useState("");

  useEffect(() => {
    fetch("/api/master/harga-layanan")
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data) {
          setHargaBadal(json.data.BADAL_UMROH || 0);
          setHargaWakaf(json.data.WAKAF_QURAN || 0);
        }
      })
      .catch(console.error);
  }, []);

  const handleLinkPackage = async () => {
    if (!selectedTargetPackage) return;
    setLinking(true);
    try {
      const res = await fetch("/api/admin/laporan-paket/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceName: selectedPaket,
          targetName: selectedTargetPackage,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setIsLinkModalOpen(false);
        setSelectedTargetPackage("");
        refetchLaporan();
      } else {
        alert(data.message || "Gagal menggabungkan paket");
      }
    } catch (err) {
      console.error(err);
      alert("Terjadi kesalahan saat menggabungkan paket");
    } finally {
      setLinking(false);
    }
  };

  const handleUnlinkPackage = async (packageName: string) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus hubungan laporan untuk paket "${packageName}"?`)) {
      return;
    }
    setUnlinking(true);
    try {
      const res = await fetch(`/api/admin/laporan-paket/link?name=${encodeURIComponent(packageName)}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        refetchLaporan();
      } else {
        alert(data.message || "Gagal menghapus hubungan paket");
      }
    } catch (err) {
      console.error(err);
      alert("Terjadi kesalahan saat menghapus hubungan paket");
    } finally {
      setUnlinking(false);
    }
  };

  // Load WA template settings on modal open
  useEffect(() => {
    if (typeof window !== "undefined" && isTemplateModalOpen) {
      setWaHeader(localStorage.getItem("wa_header") || DEFAULT_HEADER);
      setWaBadalFormat(localStorage.getItem("wa_badal_format") || DEFAULT_BADAL_FORMAT);
      
      const storedWakaf = localStorage.getItem("wa_wakaf_format");
      if (!storedWakaf || storedWakaf.includes("[lokasi]")) {
        const cleanedWakaf = storedWakaf ? storedWakaf.replace(/\s*-\s*\[lokasi\]/g, "").replace(/\[lokasi\]/g, "").trim() : DEFAULT_WAKAF_FORMAT;
        setWaWakafFormat(cleanedWakaf || DEFAULT_WAKAF_FORMAT);
        localStorage.setItem("wa_wakaf_format", cleanedWakaf || DEFAULT_WAKAF_FORMAT);
      } else {
        setWaWakafFormat(storedWakaf);
      }

      setWaFooter(localStorage.getItem("wa_footer") || DEFAULT_FOOTER);
      setActiveWaTab("preview");
    }
  }, [isTemplateModalOpen]);

  const handleSaveSettings = () => {
    localStorage.setItem("wa_header", waHeader);
    localStorage.setItem("wa_badal_format", waBadalFormat);
    localStorage.setItem("wa_wakaf_format", waWakafFormat);
    localStorage.setItem("wa_footer", waFooter);
    generateWaTemplate(waHeader, waBadalFormat, waWakafFormat, waFooter);
    setActiveWaTab("preview");
    alert("Pengaturan template berhasil disimpan dan diterapkan!");
  };

  const handleResetSettings = () => {
    if (confirm("Apakah Anda yakin ingin mengembalikan pengaturan template ke bawaan (default)?")) {
      setWaHeader(DEFAULT_HEADER);
      setWaBadalFormat(DEFAULT_BADAL_FORMAT);
      setWaWakafFormat(DEFAULT_WAKAF_FORMAT);
      setWaFooter(DEFAULT_FOOTER);
      localStorage.removeItem("wa_header");
      localStorage.removeItem("wa_badal_format");
      localStorage.removeItem("wa_wakaf_format");
      localStorage.removeItem("wa_footer");
      alert("Pengaturan template dikembalikan ke bawaan.");
    }
  };

  const generateWaTemplate = (
    header = typeof window !== "undefined" ? localStorage.getItem("wa_header") || DEFAULT_HEADER : DEFAULT_HEADER,
    badalFormat = typeof window !== "undefined" ? localStorage.getItem("wa_badal_format") || DEFAULT_BADAL_FORMAT : DEFAULT_BADAL_FORMAT,
    wakafFormat = typeof window !== "undefined" 
      ? (localStorage.getItem("wa_wakaf_format")?.replace(/\s*-\s*\[lokasi\]/g, "").replace(/\[lokasi\]/g, "").trim() || DEFAULT_WAKAF_FORMAT) 
      : DEFAULT_WAKAF_FORMAT,
    footer = typeof window !== "undefined" ? localStorage.getItem("wa_footer") || DEFAULT_FOOTER : DEFAULT_FOOTER
  ) => {
    let msg = `${header}\n\n`;
    if (linkedPackageNames.length > 1) {
      msg += `*PAKET GABUNGAN:*\n`;
      linkedPackageNames.forEach((pName, idx) => {
        msg += `${idx + 1}. ${pName}\n`;
      });
      msg += `\n`;
    } else {
      msg += `*PAKET:* ${selectedPaket}\n\n`;
    }

    if (laporanBadal.length > 0) {
      msg += `*Daftar Badal Umroh (${laporanBadal.length} Data)*\n`;
      laporanBadal.forEach((b, i) => {
        let line = badalFormat
          .replaceAll("[no]", String(i + 1))
          .replaceAll("[nama]", b.namaAlmarhum || "")
          .replaceAll("[gender]", b.jenisKelamin === "L" ? "L" : "P")
          .replaceAll("[hubungan]", b.hubungan || "")
          .replaceAll("[paket]", b.paketBadal || "")
          .replaceAll("[petugas]", b.petugasBadal || "-");
        msg += `${line}\n`;
      });
      msg += `\n`;
    }

    if (laporanWakaf.length > 0) {
      const totalMushaf = laporanWakaf.reduce((sum, w) => sum + (w.jumlahMushaf || 0), 0);
      msg += `*Daftar Wakaf Al-Quran (${totalMushaf} Mushaf)*\n`;
      let counter = 1;
      laporanWakaf.forEach((w) => {
        const names = splitNiatNames(w.niatAtasNama);
        const qtyPerName =
          names.length > 1
            ? Math.max(1, Math.round((w.jumlahMushaf || 1) / names.length))
            : (w.jumlahMushaf || 1);
        names.forEach((nama) => {
          let line = wakafFormat
            .replaceAll("[no]", String(counter))
            .replaceAll("[nama]", nama)
            .replaceAll("[jumlah]", String(qtyPerName))
            .replaceAll(" - [lokasi]", "")
            .replaceAll("-[lokasi]", "")
            .replaceAll("[lokasi]", "")
            .trim();
          msg += `${line}\n`;
          counter++;
        });
      });
      msg += `\n`;
    }

    msg += footer;
    setWaTemplate(msg);
    setIsTemplateModalOpen(true);
  };

  // Fetch daftar paket whenever bulan/tahun changes
  useEffect(() => {
    const fetchPaket = async () => {
      setLoadingPaket(true);
      setSelectedPaket(""); // reset selected paket on month change
      setHasSearched(false);
      setLaporanBadal([]);
      setLaporanWakaf([]);
      try {
        const res = await fetch(
          `/api/admin/daftar-paket?bulan=${selectedBulan}&tahun=${selectedTahun}`
        );
        const resJson = await res.json();
        if (resJson.success) {
          setDaftarPaket(resJson.data || []);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingPaket(false);
      }
    };
    fetchPaket();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBulan, selectedTahun]);

  // Fetch laporan when paket selected
  useEffect(() => {
    if (!selectedPaket) {
      setLaporanBadal([]);
      setLaporanWakaf([]);
      setHasSearched(false);
      return;
    }
    const fetchLaporan = async () => {
      setLoadingLaporan(true);
      setHasSearched(true);
      try {
        const res = await fetch(
          `/api/admin/laporan-paket?namaPaket=${encodeURIComponent(selectedPaket)}`
        );
        const resJson = await res.json();
        if (resJson.success) {
          setLaporanBadal(resJson.data.badalList || []);
          setLaporanWakaf(resJson.data.wakafList || []);
          setLinkedPackageNames(resJson.data.linkedPackageNames || []);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingLaporan(false);
      }
    };
    fetchLaporan();
  }, [selectedPaket, refreshCounter]);

  const bulanLabel = BULAN_LIST.find((b) => b.value === selectedBulan)?.label ?? "";

  const flattenedWakafList = laporanWakaf.flatMap((w) => {
    const names = splitNiatNames(w.niatAtasNama);
    const qtyPerName =
      names.length > 1
        ? Math.max(1, Math.round((w.jumlahMushaf || 1) / names.length))
        : (w.jumlahMushaf || 1);
    return names.map((nama, idx) => ({
      uniqueKey: `${w.id}-${idx}`,
      nama,
      jumlahMushaf: qtyPerName,
      lokasiWakaf: w.lokasiWakaf,
      namaTourLeader: w.namaTourLeader,
      namaMuthowif: w.namaMuthowif,
    }));
  });

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Layers className="h-6 w-6 text-emerald-600" />
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Laporan Kolektif Per Paket Umroh
            </h1>
          </div>
          {selectedPaket && !loadingLaporan && hasSearched && (
            <Button onClick={() => generateWaTemplate()} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2">
              <MessageCircle className="h-4 w-4" />
              Kirim / Salin Template WA
            </Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Pilih bulan, tahun, lalu cari paket umroh untuk menampilkan rekapitulasi niat badal & wakaf kolektif.
        </p>
      </div>

      {/* ── STEP 1: Filter Bulan & Tahun ── */}
      <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-5">
        {/* Bulan + Tahun */}
        <div className="space-y-2">
          <label className="text-sm font-bold text-foreground flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-emerald-600" />
            Langkah 1 — Pilih Bulan & Tahun Keberangkatan
          </label>
          <div className="flex gap-3">
            <div className="relative">
              <select
                value={selectedBulan}
                onChange={(e) => setSelectedBulan(e.target.value)}
                className="h-10 pl-3 pr-8 text-sm rounded-lg border border-input bg-background focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 appearance-none cursor-pointer min-w-[140px]"
              >
                {BULAN_LIST.map((b) => (
                  <option key={b.value} value={b.value}>{b.label}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            </div>
            <div className="relative">
              <select
                value={selectedTahun}
                onChange={(e) => setSelectedTahun(e.target.value)}
                className="h-10 pl-3 pr-8 text-sm rounded-lg border border-input bg-background focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 appearance-none cursor-pointer min-w-[100px]"
              >
                {TAHUN_LIST.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            </div>

            {/* Info count */}
            {!loadingPaket && (
              <div className="flex items-center text-xs text-muted-foreground px-1">
                {daftarPaket.length > 0
                  ? <span className="text-emerald-600 font-semibold">{daftarPaket.length} paket ditemukan pada {bulanLabel} {selectedTahun}</span>
                  : <span className="text-amber-600">Tidak ada paket pada {bulanLabel} {selectedTahun}</span>
                }
              </div>
            )}
            {loadingPaket && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground px-1">
                <div className="h-3.5 w-3.5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                Memuat paket...
              </div>
            )}
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-border" />

        {/* Searchable Paket Combobox */}
        <div className="space-y-2">
          <label className="text-sm font-bold text-foreground flex items-center gap-2">
            <HeartHandshake className="h-4 w-4 text-emerald-600" />
            Langkah 2 — Cari & Pilih Paket Umroh
          </label>
          <SearchableCombobox
            options={daftarPaket}
            value={selectedPaket}
            onChange={setSelectedPaket}
            placeholder="Ketik nama paket untuk mencari..."
            disabled={loadingPaket || daftarPaket.length === 0}
          />
          {daftarPaket.length === 0 && !loadingPaket && (
            <p className="text-xs text-amber-600">
              ⚠ Tidak ada paket umroh yang terdaftar pada {bulanLabel} {selectedTahun}. Coba ganti bulan atau tahun.
            </p>
          )}
        </div>
      </div>

      {/* ── PLACEHOLDER ── */}
      {!selectedPaket && !loadingLaporan && (
        <div className="flex flex-col items-center justify-center py-16 text-center bg-muted/20 border border-dashed border-border rounded-xl">
          <div className="h-16 w-16 rounded-full bg-emerald-100 dark:bg-emerald-950/50 flex items-center justify-center mb-4">
            <Layers className="h-8 w-8 text-emerald-600 opacity-60" />
          </div>
          <h3 className="text-base font-bold text-foreground mb-1">Pilih Paket Umroh untuk Melihat Laporan</h3>
          <p className="text-sm text-muted-foreground max-w-xs">
            Setelah memilih bulan, tahun, dan nama paket di atas, laporan rekapitulasi akan ditampilkan di sini.
          </p>
        </div>
      )}

      {/* ── LOADING ── */}
      {loadingLaporan && (
        <div className="flex items-center justify-center py-12 gap-3 text-muted-foreground">
          <div className="h-5 w-5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm">Memuat laporan untuk &quot;{selectedPaket}&quot;...</span>
        </div>
      )}

      {/* ── LAPORAN DATA ── */}
      {selectedPaket && !loadingLaporan && hasSearched && (
        <>
          {/* Dual / Tambah Starting Point Notice Banner */}
          {linkedPackageNames.length > 1 ? (
            <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-xl p-4 flex items-start gap-3 shadow-sm">
              <div className="p-2 bg-amber-500 text-slate-950 rounded-lg font-bold shrink-0 mt-0.5">
                <Layers className="h-5 w-5" />
              </div>
              <div className="space-y-1 flex-1">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h4 className="text-sm font-bold text-amber-900 dark:text-amber-300 flex items-center gap-2">
                    Laporan Konsolidasi Gabungan
                  </h4>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs bg-white text-slate-800 border-amber-300 hover:bg-amber-100 dark:bg-slate-900 dark:text-slate-100 dark:border-amber-800 dark:hover:bg-slate-800 gap-1"
                    onClick={() => setIsLinkModalOpen(true)}
                  >
                    <Layers className="h-3 w-3" />
                    Tambah Hubungan Paket
                  </Button>
                </div>
                <p className="text-xs text-amber-800 dark:text-amber-400">
                  Data Badal Umroh &amp; Wakaf Al-Qur&apos;an disatukan sebagai satu kesatuan laporan untuk paket-paket berikut:
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
                  {linkedPackageNames.map((pkgName) => (
                    <span
                      key={pkgName}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold border ${
                        pkgName === selectedPaket
                          ? "bg-emerald-600 text-white border-emerald-700 shadow-sm"
                          : "bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 border-amber-300 dark:border-amber-700"
                      }`}
                    >
                      {pkgName}
                      {pkgName !== selectedPaket && (
                        <button
                          type="button"
                          onClick={() => handleUnlinkPackage(pkgName)}
                          disabled={unlinking}
                          className="hover:text-red-500 transition-colors disabled:opacity-50 ml-1"
                          title="Hapus hubungan paket"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-muted/30 border border-border rounded-xl p-4 flex items-center justify-between flex-wrap gap-3 shadow-sm">
              <div className="space-y-0.5">
                <h4 className="text-sm font-bold text-foreground">
                  Laporan Paket Standalone
                </h4>
                <p className="text-xs text-muted-foreground">
                  Paket ini belum digabungkan dengan paket lain. Anda dapat menggabungkannya agar laporannya disatukan.
                </p>
              </div>
              <Button
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
                onClick={() => setIsLinkModalOpen(true)}
              >
                <Layers className="h-3.5 w-3.5" />
                Gabungkan dengan Paket Lain
              </Button>
            </div>
          )}

          {/* Summary Cards */}
          <div className="grid grid-cols-2 gap-4">
            <Card className="p-4 flex items-center justify-between border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/30">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-full bg-emerald-600 flex items-center justify-center shrink-0">
                  <HeartHandshake className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">{laporanBadal.length}</p>
                  <p className="text-xs text-muted-foreground font-medium">Almarhum/ah Dibadalkan</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-emerald-700 dark:text-emerald-400">{formatRupiah(laporanBadal.length * hargaBadal)}</p>
                <p className="text-[10px] text-muted-foreground">Estimasi Pendapatan Badal</p>
              </div>
            </Card>
            <Card className="p-4 flex items-center justify-between border-sky-200 dark:border-sky-900 bg-sky-50 dark:bg-sky-950/30">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-full bg-sky-600 flex items-center justify-center shrink-0">
                  <BookOpen className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-sky-700 dark:text-sky-400">
                    {laporanWakaf.reduce((sum: number, w: any) => sum + (w.jumlahMushaf || 0), 0)}
                  </p>
                  <p className="text-xs text-muted-foreground font-medium">Total Mushaf Diwakafkan</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-sky-700 dark:text-sky-400">
                  {formatRupiah(laporanWakaf.reduce((sum: number, w: any) => sum + (w.jumlahMushaf || 0), 0) * hargaWakaf)}
                </p>
                <p className="text-[10px] text-muted-foreground">Estimasi Pendapatan Wakaf</p>
              </div>
            </Card>
          </div>

          {/* Tabel Badal */}
          <Card className="border border-border shadow-sm overflow-hidden">
            <div className="p-4 bg-emerald-600 text-white font-bold text-xs flex items-center justify-between">
              <span className="flex items-center gap-2">
                <HeartHandshake className="h-4 w-4" />
                DAFTAR NAMA ALMARHUM / ALMARHUMAH YANG DIBADALKAN
                <span className="opacity-80 font-normal">
                  — {linkedPackageNames.length > 1 ? linkedPackageNames.join(" & ") : selectedPaket}
                </span>
              </span>
              <Badge variant="outline" className="text-white border-white/40">{laporanBadal.length} Data</Badge>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted text-muted-foreground uppercase text-[11px] font-semibold border-b">
                  <tr>
                    <th className="px-4 py-3">No</th>
                    <th className="px-4 py-3">Tour Leader / Muthowif</th>
                    <th className="px-4 py-3">Nama Almarhum / Almarhumah</th>
                    <th className="px-4 py-3">Jenis Kelamin & Hubungan</th>
                    <th className="px-4 py-3">Paket Badal</th>
                    <th className="px-4 py-3">Petugas Badal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {laporanBadal.length > 0 ? (
                    laporanBadal.map((item, index) => (
                      <tr key={item.id} className="hover:bg-muted/40">
                        <td className="px-4 py-3 font-semibold text-muted-foreground">{index + 1}</td>
                        <td className="px-4 py-3">
                          <div>TL: <span className="font-semibold">{item.namaTourLeader || "-"}</span></div>
                          <div>Muthowif: <span className="font-semibold">{item.namaMuthowif || "-"}</span></div>
                        </td>
                        <td className="px-4 py-3 font-bold text-sm">{item.namaAlmarhum}</td>
                        <td className="px-4 py-3">
                          <div>{item.jenisKelamin === "L" ? "Almarhum (L)" : "Almarhumah (P)"}</div>
                          <div className="text-muted-foreground">{item.hubungan}</div>
                        </td>
                        <td className="px-4 py-3"><Badge variant="outline">{item.paketBadal}</Badge></td>
                        <td className="px-4 py-3">
                          {item.petugasBadal ? (
                            <Badge className="bg-emerald-600 text-white">{item.petugasBadal}</Badge>
                          ) : (
                            <span className="text-muted-foreground italic text-[11px]">Belum ditentukan</span>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                        Tidak ada data Badal Umroh untuk paket &quot;{selectedPaket}&quot;.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Tabel Wakaf */}
          <Card className="border border-border shadow-sm overflow-hidden">
            <div className="p-4 bg-sky-600 text-white font-bold text-xs flex items-center justify-between">
              <span className="flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                DAFTAR KOLEKTIF NIAT WAKAF AL-QUR&apos;AN (TANPA NAMA PEWAKAF)
                <span className="opacity-80 font-normal">
                  — {linkedPackageNames.length > 1 ? linkedPackageNames.join(" & ") : selectedPaket}
                </span>
              </span>
              <Badge variant="outline" className="text-white border-white/40">
                {flattenedWakafList.length} Nama · {laporanWakaf.reduce((s: number, w: any) => s + (w.jumlahMushaf || 0), 0)} Mushaf
              </Badge>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted text-muted-foreground uppercase text-[11px] font-semibold border-b">
                  <tr>
                    <th className="px-4 py-3">No</th>
                    <th className="px-4 py-3">Tour Leader / Muthowif</th>
                    <th className="px-4 py-3">Nama Yang Diniatkan Wakaf</th>
                    <th className="px-4 py-3">Jumlah Mushaf</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {flattenedWakafList.length > 0 ? (
                    flattenedWakafList.map((item, index) => (
                      <tr key={item.uniqueKey} className="hover:bg-muted/40">
                        <td className="px-4 py-3 font-semibold text-muted-foreground">{index + 1}</td>
                        <td className="px-4 py-3">
                          <div>TL: <span className="font-semibold">{item.namaTourLeader || "-"}</span></div>
                          <div>Muthowif: <span className="font-semibold">{item.namaMuthowif || "-"}</span></div>
                        </td>
                        <td className="px-4 py-3 font-bold text-sm">{item.nama}</td>
                        <td className="px-4 py-3"><Badge className="bg-sky-600 text-white">{item.jumlahMushaf} Mushaf</Badge></td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                        Tidak ada data Wakaf Al-Qur&apos;an untuk paket &quot;{selectedPaket}&quot;.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      {/* Modal WA Template */}
      <Modal open={isTemplateModalOpen} onClose={() => setIsTemplateModalOpen(false)} title="Konfigurasi Template WhatsApp" size="lg">
        <div className="space-y-4 pt-2">
          {/* Tab Header */}
          <div className="flex border-b border-border">
            <button
              className={`px-4 py-2 text-sm font-bold border-b-2 transition-colors ${
                activeWaTab === "preview"
                  ? "border-emerald-600 text-emerald-600 font-semibold"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => setActiveWaTab("preview")}
            >
              Kirim &amp; Salin Teks
            </button>
            <button
              className={`px-4 py-2 text-sm font-bold border-b-2 transition-colors ${
                activeWaTab === "settings"
                  ? "border-emerald-600 text-emerald-600 font-semibold"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => setActiveWaTab("settings")}
            >
              Pengaturan Format
            </button>
          </div>

          {activeWaTab === "preview" ? (
            <div className="space-y-4">
              <p className="text-xs text-muted-foreground">
                Teks laporan ini dibuat secara otomatis menggunakan pengaturan format Anda. Anda dapat menyesuaikannya secara langsung di bawah sebelum menyalin atau mengirim.
              </p>
              <textarea
                className="w-full h-80 p-3 text-sm rounded-lg border border-input bg-background font-mono focus:ring-2 focus:ring-emerald-500 outline-none"
                value={waTemplate}
                onChange={(e) => setWaTemplate(e.target.value)}
              />
              <div className="flex items-center justify-end gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    navigator.clipboard.writeText(waTemplate);
                    alert("Template berhasil disalin ke clipboard!");
                  }}
                  className="gap-2"
                >
                  <Copy className="h-4 w-4" /> Salin Teks
                </Button>
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(waTemplate)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 h-10 px-4 py-2 bg-emerald-600 text-white hover:bg-emerald-700 gap-2"
                >
                  <MessageCircle className="h-4 w-4" /> Buka WhatsApp Desktop/Web
                </a>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-foreground block">
                    Header Laporan
                  </label>
                  <textarea
                    rows={2}
                    className="w-full p-2.5 text-sm rounded-lg border border-input bg-background font-mono focus:ring-2 focus:ring-emerald-500 outline-none"
                    value={waHeader}
                    onChange={(e) => setWaHeader(e.target.value)}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-foreground block">
                    Format Baris Badal Umroh
                  </label>
                  <input
                    type="text"
                    className="w-full p-2.5 text-sm rounded-lg border border-input bg-background font-mono focus:ring-2 focus:ring-emerald-500 outline-none"
                    value={waBadalFormat}
                    onChange={(e) => setWaBadalFormat(e.target.value)}
                  />
                  <span className="text-[10px] text-muted-foreground block">
                    Tag: <code className="bg-muted px-1 rounded">[no]</code> (nomor), <code className="bg-muted px-1 rounded">[nama]</code> (almarhum), <code className="bg-muted px-1 rounded">[gender]</code> (L/P), <code className="bg-muted px-1 rounded">[hubungan]</code>, <code className="bg-muted px-1 rounded">[paket]</code>, <code className="bg-muted px-1 rounded">[petugas]</code>
                  </span>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-foreground block">
                    Format Baris Wakaf Al-Quran
                  </label>
                  <input
                    type="text"
                    className="w-full p-2.5 text-sm rounded-lg border border-input bg-background font-mono focus:ring-2 focus:ring-emerald-500 outline-none"
                    value={waWakafFormat}
                    onChange={(e) => setWaWakafFormat(e.target.value)}
                  />
                  <span className="text-[10px] text-muted-foreground block">
                    Tag: <code className="bg-muted px-1 rounded">[no]</code> (nomor), <code className="bg-muted px-1 rounded">[nama]</code> (atas nama), <code className="bg-muted px-1 rounded">[jumlah]</code> (jumlah mushaf)
                  </span>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-foreground block">
                    Footer Laporan
                  </label>
                  <textarea
                    rows={2}
                    className="w-full p-2.5 text-sm rounded-lg border border-input bg-background font-mono focus:ring-2 focus:ring-emerald-500 outline-none"
                    value={waFooter}
                    onChange={(e) => setWaFooter(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-border">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleResetSettings}
                  className="text-amber-600 border-amber-300 hover:bg-amber-50"
                >
                  Reset Default
                </Button>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setActiveWaTab("preview")}
                  >
                    Batal
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSaveSettings}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    Simpan &amp; Terapkan
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* Modal Hubungkan Laporan Paket */}
      <Modal
        open={isLinkModalOpen}
        onClose={() => {
          setIsLinkModalOpen(false);
          setSelectedTargetPackage("");
        }}
        title="Gabungkan Laporan Paket"
        size="lg"
      >
        <div className="space-y-4 pt-2">
          <p className="text-sm text-muted-foreground">
            Pilih paket keberangkatan lain yang ingin digabungkan dengan paket <strong>{selectedPaket}</strong>. Setelah digabungkan, laporan niat badal &amp; wakaf untuk paket-paket ini akan disatukan seterusnya.
          </p>
          
          <div className="space-y-2">
            <label className="text-xs font-bold text-foreground block">
              Pilih Paket Yang Akan Digabungkan
            </label>
            <SearchableCombobox
              options={daftarPaket.filter(
                (p) => p !== selectedPaket && !linkedPackageNames.includes(p)
              )}
              value={selectedTargetPackage}
              onChange={setSelectedTargetPackage}
              placeholder="Cari & pilih paket..."
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
            <Button
              variant="outline"
              onClick={() => {
                setIsLinkModalOpen(false);
                setSelectedTargetPackage("");
              }}
              disabled={linking}
            >
              Batal
            </Button>
            <Button
              onClick={handleLinkPackage}
              disabled={linking || !selectedTargetPackage}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {linking ? "Menghubungkan..." : "Gabungkan Laporan"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
