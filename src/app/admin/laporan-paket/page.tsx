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
} from "lucide-react";

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
  const [loadingLaporan, setLoadingLaporan] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

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
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingLaporan(false);
      }
    };
    fetchLaporan();
  }, [selectedPaket]);

  const bulanLabel = BULAN_LIST.find((b) => b.value === selectedBulan)?.label ?? "";

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <Layers className="h-6 w-6 text-emerald-600" />
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Laporan Kolektif Per Paket Umroh
          </h1>
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
          {/* Summary Cards */}
          <div className="grid grid-cols-2 gap-4">
            <Card className="p-4 flex items-center gap-4 border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/30">
              <div className="h-10 w-10 rounded-full bg-emerald-600 flex items-center justify-center shrink-0">
                <HeartHandshake className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">{laporanBadal.length}</p>
                <p className="text-xs text-muted-foreground font-medium">Almarhum/ah Dibadalkan</p>
              </div>
            </Card>
            <Card className="p-4 flex items-center gap-4 border-sky-200 dark:border-sky-900 bg-sky-50 dark:bg-sky-950/30">
              <div className="h-10 w-10 rounded-full bg-sky-600 flex items-center justify-center shrink-0">
                <BookOpen className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-sky-700 dark:text-sky-400">
                  {laporanWakaf.reduce((sum: number, w: any) => sum + (w.jumlahMushaf || 0), 0)}
                </p>
                <p className="text-xs text-muted-foreground font-medium">Total Mushaf Diwakafkan</p>
              </div>
            </Card>
          </div>

          {/* Tabel Badal */}
          <Card className="border border-border shadow-sm overflow-hidden">
            <div className="p-4 bg-emerald-600 text-white font-bold text-xs flex items-center justify-between">
              <span className="flex items-center gap-2">
                <HeartHandshake className="h-4 w-4" />
                DAFTAR NAMA ALMARHUM / ALMARHUMAH YANG DIBADALKAN
                <span className="opacity-80 font-normal">— {selectedPaket}</span>
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
                <span className="opacity-80 font-normal">— {selectedPaket}</span>
              </span>
              <Badge variant="outline" className="text-white border-white/40">
                {laporanWakaf.length} Catatan · {laporanWakaf.reduce((s: number, w: any) => s + (w.jumlahMushaf || 0), 0)} Mushaf
              </Badge>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted text-muted-foreground uppercase text-[11px] font-semibold border-b">
                  <tr>
                    <th className="px-4 py-3">No</th>
                    <th className="px-4 py-3">Tour Leader / Muthowif</th>
                    <th className="px-4 py-3">Daftar Nama-Nama Yang Diniatkan Wakaf</th>
                    <th className="px-4 py-3">Jumlah Mushaf</th>
                    <th className="px-4 py-3">Lokasi Penyaluran</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {laporanWakaf.length > 0 ? (
                    laporanWakaf.map((item, index) => (
                      <tr key={item.id} className="hover:bg-muted/40">
                        <td className="px-4 py-3 font-semibold text-muted-foreground">{index + 1}</td>
                        <td className="px-4 py-3">
                          <div>TL: <span className="font-semibold">{item.namaTourLeader || "-"}</span></div>
                          <div>Muthowif: <span className="font-semibold">{item.namaMuthowif || "-"}</span></div>
                        </td>
                        <td className="px-4 py-3 font-bold text-sm">{item.niatAtasNama || "Niat Hamba Allah / Keluarga"}</td>
                        <td className="px-4 py-3"><Badge className="bg-sky-600 text-white">{item.jumlahMushaf} Mushaf</Badge></td>
                        <td className="px-4 py-3 text-muted-foreground">{item.lokasiWakaf}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
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
    </div>
  );
}
