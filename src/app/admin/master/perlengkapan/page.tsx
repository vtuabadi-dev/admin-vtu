"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Package,
  Warehouse,
  Ruler,
  SlidersHorizontal,
  Plus,
  RefreshCw,
  Clock,
  MapPin,
  ShieldCheck,
  UserCheck,
  Building,
  Check,
  X,
  Sparkles,
} from "lucide-react";
import { Card } from "@/shared/components/ui/Card";
import { Button } from "@/shared/components/ui/Button";
import { Input } from "@/shared/components/ui/Input";
import { Modal } from "@/shared/components/ui/Modal";
import { cn } from "@/shared/lib/utils";

interface Gudang {
  id: string;
  kodeGudang: string;
  namaGudang: string;
  alamat?: string;
  penanggungJawab?: string;
  isActive: boolean;
  _count?: { stokItems: number };
}

interface UkuranItem {
  id: string;
  barangId: string;
  kelompokUkuran: string;
  kodeUkuran: string;
  namaUkuran: string;
  stokGudang?: {
    gudangId: string;
    stokTersedia: number;
    gudang?: { namaGudang: string };
  }[];
}

interface BarangItem {
  id: string;
  code: string;
  name: string;
  satuan: string;
  tipePengambilan: "BEBAS_KAPAN_SAJA" | "SERENTAK_HARI_H";
  sifatPerlengkapan: "UMUM_WAJIB" | "PAKET_STANDAR" | "ADDON_KHUSUS";
  genderTarget: "ALL" | "LAKI_LAKI" | "PEREMPUAN";
  isActive: boolean;
  ukuran?: UkuranItem[];
}

export default function MasterPerlengkapanPage() {
  const [activeTab, setActiveTab] = useState<"gudang" | "barang" | "aturan">("gudang");

  // Data states
  const [gudangList, setGudangList] = useState<Gudang[]>([]);
  const [barangList, setBarangList] = useState<BarangItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Gudang Modal
  const [gudangModalOpen, setGudangModalOpen] = useState(false);
  const [editGudangId, setEditGudangId] = useState<string | null>(null);
  const [kodeGudang, setKodeGudang] = useState("");
  const [namaGudang, setNamaGudang] = useState("");
  const [alamatGudang, setAlamatGudang] = useState("");
  const [picGudang, setPicGudang] = useState("");
  const [submittingGudang, setSubmittingGudang] = useState(false);

  // Model Presets untuk Varian Ukuran VTU
  const VARIANT_PRESETS = [
    {
      id: "dewasa-laki",
      label: "Dewasa Laki-Laki",
      icon: "👔",
      desc: "Kemeja S - 4L",
      items: [
        { kodeUkuran: "S", namaUkuran: "Kemeja Dewasa S", kelompokUkuran: "DEWASA_LAKI" },
        { kodeUkuran: "M", namaUkuran: "Kemeja Dewasa M", kelompokUkuran: "DEWASA_LAKI" },
        { kodeUkuran: "L", namaUkuran: "Kemeja Dewasa L", kelompokUkuran: "DEWASA_LAKI" },
        { kodeUkuran: "XL", namaUkuran: "Kemeja Dewasa XL", kelompokUkuran: "DEWASA_LAKI" },
        { kodeUkuran: "XXL", namaUkuran: "Kemeja Dewasa XXL", kelompokUkuran: "DEWASA_LAKI" },
        { kodeUkuran: "4L", namaUkuran: "Kemeja Dewasa 4L", kelompokUkuran: "DEWASA_LAKI" },
      ],
    },
    {
      id: "dewasa-perempuan",
      label: "Dewasa Perempuan",
      icon: "👗",
      desc: "Outer/Gamis S - XL",
      items: [
        { kodeUkuran: "S", namaUkuran: "Outer Dewasa S", kelompokUkuran: "DEWASA_PEREMPUAN" },
        { kodeUkuran: "M", namaUkuran: "Outer Dewasa M", kelompokUkuran: "DEWASA_PEREMPUAN" },
        { kodeUkuran: "L", namaUkuran: "Outer Dewasa L", kelompokUkuran: "DEWASA_PEREMPUAN" },
        { kodeUkuran: "XL", namaUkuran: "Outer Dewasa XL", kelompokUkuran: "DEWASA_PEREMPUAN" },
      ],
    },
    {
      id: "anak-laki",
      label: "Anak-Anak",
      icon: "👦",
      desc: "Kemeja Anak No 3 - 10",
      items: [
        { kodeUkuran: "3", namaUkuran: "Kemeja Anak No 3", kelompokUkuran: "ANAK_LAKI" },
        { kodeUkuran: "4", namaUkuran: "Kemeja Anak No 4", kelompokUkuran: "ANAK_LAKI" },
        { kodeUkuran: "5", namaUkuran: "Kemeja Anak No 5", kelompokUkuran: "ANAK_LAKI" },
        { kodeUkuran: "6", namaUkuran: "Kemeja Anak No 6", kelompokUkuran: "ANAK_LAKI" },
        { kodeUkuran: "7", namaUkuran: "Kemeja Anak No 7", kelompokUkuran: "ANAK_LAKI" },
        { kodeUkuran: "8", namaUkuran: "Kemeja Anak No 8", kelompokUkuran: "ANAK_LAKI" },
        { kodeUkuran: "9", namaUkuran: "Kemeja Anak No 9", kelompokUkuran: "ANAK_LAKI" },
        { kodeUkuran: "10", namaUkuran: "Kemeja Anak No 10", kelompokUkuran: "ANAK_LAKI" },
      ],
    },
    {
      id: "ihram-pria",
      label: "Kain Ihram Pria",
      icon: "🕋",
      desc: "TK, SD, SMP, Dewasa",
      items: [
        { kodeUkuran: "TK", namaUkuran: "Ihram Ukuran TK", kelompokUkuran: "ANAK_LAKI" },
        { kodeUkuran: "SD", namaUkuran: "Ihram Ukuran SD", kelompokUkuran: "ANAK_LAKI" },
        { kodeUkuran: "SMP", namaUkuran: "Ihram Ukuran SMP", kelompokUkuran: "ANAK_LAKI" },
        { kodeUkuran: "DEWASA", namaUkuran: "Ihram Ukuran Dewasa", kelompokUkuran: "DEWASA_LAKI" },
      ],
    },
    {
      id: "bahan-kain",
      label: "Bahan Kain Belum Jadi",
      icon: "🧵",
      desc: "Bahan Kain Saja",
      items: [
        { kodeUkuran: "KAIN", namaUkuran: "Bahan Kain (Belum Jadi)", kelompokUkuran: "KAIN" },
      ],
    },
  ];

  // Edit Barang & Konfigurasi Varian Modal States
  const [barangModalOpen, setBarangModalOpen] = useState(false);
  const [selectedBarang, setSelectedBarang] = useState<BarangItem | null>(null);
  const [barangName, setBarangName] = useState("");
  const [barangSatuan, setBarangSatuan] = useState("");
  const [tipePengambilan, setTipePengambilan] = useState<"BEBAS_KAPAN_SAJA" | "SERENTAK_HARI_H">("BEBAS_KAPAN_SAJA");
  const [sifatPerlengkapan, setSifatPerlengkapan] = useState<"UMUM_WAJIB" | "PAKET_STANDAR" | "ADDON_KHUSUS">("PAKET_STANDAR");
  const [genderTarget, setGenderTarget] = useState<"ALL" | "LAKI_LAKI" | "PEREMPUAN">("ALL");
  const [barangIsActive, setBarangIsActive] = useState(true);

  // Variant Mode States
  const [hasVariants, setHasVariants] = useState(false);
  const [variantList, setVariantList] = useState<{ id?: string; kodeUkuran: string; namaUkuran: string; kelompokUkuran: string }[]>([]);
  const [customKode, setCustomKode] = useState("");
  const [customNama, setCustomNama] = useState("");
  const [customKelompok, setCustomKelompok] = useState("DEWASA_LAKI");
  const [submittingBarang, setSubmittingBarang] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [resGudang, resBarang] = await Promise.all([
        fetch("/api/master/gudang"),
        fetch("/api/master/perlengkapan"),
      ]);

      if (resGudang.ok) {
        const jsonG = await resGudang.json();
        if (jsonG.success) setGudangList(jsonG.data || []);
      }

      if (resBarang.ok) {
        const jsonB = await resBarang.json();
        if (jsonB.success && Array.isArray(jsonB.data)) {
          setBarangList(jsonB.data);
        }
      } else {
        // Fallback to legacy ukuran endpoint
        const resUkuran = await fetch("/api/master/perlengkapan/ukuran");
        if (resUkuran.ok) {
          const jsonU = await resUkuran.json();
          if (jsonU.success) {
            const map = new Map<string, BarangItem>();
            (jsonU.data || []).forEach((u: UkuranItem & { barang: BarangItem }) => {
              if (u.barang) {
                if (!map.has(u.barang.id)) {
                  map.set(u.barang.id, { ...u.barang, ukuran: [] });
                }
                map.get(u.barang.id)?.ukuran?.push(u);
              }
            });
            setBarangList(Array.from(map.values()));
          }
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Open modal edit barang & varian
  const openEditBarangModal = (b: BarangItem) => {
    setSelectedBarang(b);
    setBarangName(b.name);
    setBarangSatuan(b.satuan || "pcs");
    setTipePengambilan(b.tipePengambilan || "BEBAS_KAPAN_SAJA");
    setSifatPerlengkapan(b.sifatPerlengkapan || "PAKET_STANDAR");
    setGenderTarget(b.genderTarget || "ALL");
    setBarangIsActive(b.isActive !== false);

    const customVariants = (b.ukuran || []).filter((u) => u.kodeUkuran !== "STD");
    setHasVariants(customVariants.length > 0);
    setVariantList(
      customVariants.map((u) => ({
        id: u.id,
        kodeUkuran: u.kodeUkuran,
        namaUkuran: u.namaUkuran,
        kelompokUkuran: u.kelompokUkuran || "STANDAR",
      }))
    );
    setCustomKode("");
    setCustomNama("");
    setCustomKelompok("DEWASA_LAKI");
    setBarangModalOpen(true);
  };

  // Preset model varian handler
  const applyPreset = (presetItems: typeof VARIANT_PRESETS[0]["items"]) => {
    setVariantList((prev) => {
      const existingCodes = new Set(prev.map((p) => p.kodeUkuran.trim().toUpperCase()));
      const toAdd = presetItems.filter(
        (item) => !existingCodes.has(item.kodeUkuran.trim().toUpperCase())
      );
      return [...prev, ...toAdd];
    });
  };

  // Custom variant handlers
  const addCustomVariant = () => {
    if (!customKode.trim()) return;
    const cleanCode = customKode.trim().toUpperCase();
    if (variantList.some((v) => v.kodeUkuran.toUpperCase() === cleanCode)) {
      alert(`Kode varian "${cleanCode}" sudah ada di dalam daftar.`);
      return;
    }
    const cleanName = customNama.trim() || `${barangName} Ukuran ${cleanCode}`;
    setVariantList((prev) => [
      ...prev,
      {
        kodeUkuran: cleanCode,
        namaUkuran: cleanName,
        kelompokUkuran: customKelompok,
      },
    ]);
    setCustomKode("");
    setCustomNama("");
  };

  const removeVariant = (kodeUkuran: string) => {
    setVariantList((prev) => prev.filter((v) => v.kodeUkuran !== kodeUkuran));
  };

  // Handle Save Barang & Variants
  const handleSaveBarang = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBarang || !barangName.trim()) return;

    if (hasVariants && variantList.length === 0) {
      const proceed = confirm(
        "Mode varian diaktifkan tetapi belum ada daftar varian yang dimasukkan. Simpan tanpa varian (ukuran standar)?"
      );
      if (!proceed) return;
    }

    try {
      setSubmittingBarang(true);
      const res = await fetch("/api/master/perlengkapan", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedBarang.id,
          name: barangName,
          satuan: barangSatuan,
          tipePengambilan,
          sifatPerlengkapan,
          genderTarget,
          isActive: barangIsActive,
          hasVariants,
          variants: variantList,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        alert(json.message || "Gagal menyimpan data perlengkapan");
        return;
      }

      setBarangModalOpen(false);
      await loadData();
    } catch (err: any) {
      alert("Terjadi kesalahan: " + err.message);
    } finally {
      setSubmittingBarang(false);
    }
  };

  // Handle Save Gudang
  const handleSaveGudang = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!kodeGudang || !namaGudang) return;

    try {
      setSubmittingGudang(true);
      const isEdit = !!editGudangId;
      const url = "/api/master/gudang";
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(isEdit ? { id: editGudangId } : {}),
          kodeGudang,
          namaGudang,
          alamat: alamatGudang,
          penanggungJawab: picGudang,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        alert(json.message || "Gagal menyimpan data gudang");
        return;
      }

      setGudangModalOpen(false);
      loadData();
    } catch (err: any) {
      alert("Terjadi kesalahan: " + err.message);
    } finally {
      setSubmittingGudang(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-stone-200 dark:border-stone-800 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-lg">
              <Package className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-stone-900 dark:text-stone-100">
                Master Perlengkapan &amp; Gudang
              </h1>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Konfigurasi 3 Lokasi Gudang, Master Varian Ukuran, Sifat Perlengkapan, dan Aturan Paket Keberangkatan.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            disabled={loading}
            className="text-stone-600 dark:text-stone-300"
          >
            <RefreshCw className={cn("h-4 w-4 mr-1.5", loading && "animate-spin")} />
            Segarkan
          </Button>

          {activeTab === "gudang" && (
            <Button
              size="sm"
              onClick={() => {
                setEditGudangId(null);
                setKodeGudang(`GDG-${gudangList.length + 1}`);
                setNamaGudang("");
                setAlamatGudang("");
                setPicGudang("");
                setGudangModalOpen(true);
              }}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
            >
              <Plus className="h-4 w-4 mr-1.5" />
              Tambah Gudang
            </Button>
          )}
        </div>
      </div>

      {/* 3 Master Tabs */}
      <div className="flex border-b border-stone-200 dark:border-stone-800 space-x-1">
        <button
          onClick={() => setActiveTab("gudang")}
          className={cn(
            "flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all",
            activeTab === "gudang"
              ? "border-emerald-600 text-emerald-600 dark:text-emerald-400"
              : "border-transparent text-stone-500 hover:text-stone-900 dark:hover:text-stone-200"
          )}
        >
          <Warehouse className="h-4 w-4" />
          Tab 1: Master Gudang ({gudangList.length})
        </button>

        <button
          onClick={() => setActiveTab("barang")}
          className={cn(
            "flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all",
            activeTab === "barang"
              ? "border-emerald-600 text-emerald-600 dark:text-emerald-400"
              : "border-transparent text-stone-500 hover:text-stone-900 dark:hover:text-stone-200"
          )}
        >
          <Ruler className="h-4 w-4" />
          Tab 2: Master Barang &amp; Varian Ukuran ({barangList.length})
        </button>

        <button
          onClick={() => setActiveTab("aturan")}
          className={cn(
            "flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all",
            activeTab === "aturan"
              ? "border-emerald-600 text-emerald-600 dark:text-emerald-400"
              : "border-transparent text-stone-500 hover:text-stone-900 dark:hover:text-stone-200"
          )}
        >
          <SlidersHorizontal className="h-4 w-4" />
          Tab 3: Aturan Alokasi Paket Keberangkatan
        </button>
      </div>

      {/* TAB 1: MASTER GUDANG */}
      {activeTab === "gudang" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {gudangList.map((gdg) => (
            <Card key={gdg.id} className="p-5 border-stone-200 dark:border-stone-800 relative bg-white dark:bg-stone-900">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-xl">
                    <Building className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-stone-900 dark:text-stone-100 text-base">{gdg.namaGudang}</h3>
                    <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-stone-100 dark:bg-stone-800 text-amber-700 dark:text-amber-400">
                      {gdg.kodeGudang}
                    </span>
                  </div>
                </div>
                <span className={cn(
                  "px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider",
                  gdg.isActive ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300" : "bg-stone-200 text-stone-600"
                )}>
                  {gdg.isActive ? "Aktif" : "Non-Aktif"}
                </span>
              </div>

              <div className="mt-4 space-y-2 text-xs text-stone-600 dark:text-stone-400 border-t border-stone-100 dark:border-stone-800/80 pt-3">
                <div className="flex items-center gap-2">
                  <MapPin className="h-3.5 w-3.5 text-stone-400 shrink-0" />
                  <span className="truncate">{gdg.alamat || "Alamat belum diatur"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <UserCheck className="h-3.5 w-3.5 text-stone-400 shrink-0" />
                  <span>PIC: <strong className="text-stone-800 dark:text-stone-200">{gdg.penanggungJawab || "-"}</strong></span>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-stone-100 dark:border-stone-800 flex justify-between items-center text-xs">
                <span className="text-stone-500 font-mono text-[11px]">
                  Total Item Stok: <strong className="text-stone-900 dark:text-stone-100">{gdg._count?.stokItems || 0}</strong>
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setEditGudangId(gdg.id);
                    setKodeGudang(gdg.kodeGudang);
                    setNamaGudang(gdg.namaGudang);
                    setAlamatGudang(gdg.alamat || "");
                    setPicGudang(gdg.penanggungJawab || "");
                    setGudangModalOpen(true);
                  }}
                  className="h-7 text-[11px] font-bold"
                >
                  Edit
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* TAB 2: MASTER BARANG & VARIAN UKURAN */}
      {activeTab === "barang" && (
        <Card className="border-stone-200 dark:border-stone-800 overflow-hidden bg-white dark:bg-stone-900">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-stone-100 dark:bg-stone-800/90 font-bold border-b border-stone-200 dark:border-stone-700 uppercase tracking-wider text-[10px] text-stone-700 dark:text-stone-300">
                <tr>
                  <th className="px-4 py-3 w-12 text-center">No</th>
                  <th className="px-4 py-3 w-28">Kode Item</th>
                  <th className="px-4 py-3">Nama Perlengkapan</th>
                  <th className="px-4 py-3 w-36 text-center">Waktu Pengambilan</th>
                  <th className="px-4 py-3 w-36 text-center">Sifat Perlengkapan</th>
                  <th className="px-4 py-3 w-32 text-center">Target Gender</th>
                  <th className="px-4 py-3">Varian Ukuran Tersedia</th>
                  <th className="px-4 py-3 w-24 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200 dark:divide-stone-800 font-medium">
                {barangList.map((b, idx) => (
                  <tr key={b.id} className="hover:bg-amber-50/20 dark:hover:bg-amber-950/20 transition-colors">
                    <td className="px-4 py-3.5 text-center text-stone-400 font-mono">{idx + 1}</td>
                    <td className="px-4 py-3.5 font-mono font-bold text-amber-700 dark:text-amber-400">{b.code}</td>
                    <td className="px-4 py-3.5 font-bold text-stone-900 dark:text-stone-100">
                      {b.name}
                      <span className="ml-2 text-[10px] text-stone-400 font-mono">({b.satuan})</span>
                    </td>
                    {/* Waktu Pengambilan Badge */}
                    <td className="px-4 py-3.5 text-center">
                      {b.tipePengambilan === "SERENTAK_HARI_H" ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                          <Clock className="h-3 w-3 mr-1" /> SERENTAK HARI H
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                          BEBAS KAPAN SAJA
                        </span>
                      )}
                    </td>
                    {/* Sifat Perlengkapan Badge */}
                    <td className="px-4 py-3.5 text-center">
                      {b.sifatPerlengkapan === "UMUM_WAJIB" ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black bg-emerald-600 text-white shadow-sm">
                          <ShieldCheck className="h-3 w-3 mr-1" /> WAJIB UMUM (ALL)
                        </span>
                      ) : b.sifatPerlengkapan === "ADDON_KHUSUS" ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500 text-white">
                          ADD-ON KHUSUS
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300">
                          PAKET STANDAR
                        </span>
                      )}
                    </td>
                    {/* Target Gender */}
                    <td className="px-4 py-3.5 text-center">
                      {b.genderTarget === "PEREMPUAN" ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-pink-100 text-pink-800 dark:bg-pink-950 dark:text-pink-300">
                          KHUSUS PEREMPUAN
                        </span>
                      ) : b.genderTarget === "LAKI_LAKI" ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300">
                          KHUSUS LAKI-LAKI
                        </span>
                      ) : (
                        <span className="text-[10px] font-semibold text-stone-500">SEMUA GENDER</span>
                      )}
                    </td>
                    {/* Varian Ukuran */}
                    <td className="px-4 py-3.5">
                      <div className="flex flex-wrap gap-1">
                        {(b.ukuran || []).filter((u) => u.kodeUkuran !== "STD").length === 0 ? (
                          <span className="text-stone-400 font-mono text-[11px]">-</span>
                        ) : (
                          b.ukuran
                            ?.filter((u) => u.kodeUkuran !== "STD")
                            .map((u) => (
                              <span
                                key={u.id}
                                className="px-2 py-0.5 bg-stone-100 dark:bg-stone-800 rounded font-mono font-bold text-[10px] text-stone-800 dark:text-stone-200 border border-stone-200 dark:border-stone-700"
                              >
                                {u.kodeUkuran}
                              </span>
                            ))
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openEditBarangModal(b)}
                        className="h-7 text-[11px] font-bold px-2.5 flex items-center gap-1.5 border-stone-300 dark:border-stone-700 hover:border-amber-500 hover:text-amber-600 dark:hover:text-amber-400 mx-auto transition-colors"
                      >
                        <SlidersHorizontal className="h-3.5 w-3.5" />
                        Edit &amp; Atur
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* TAB 3: ATURAN ALOKASI PAKET */}
      {activeTab === "aturan" && (
        <Card className="p-6 border-stone-200 dark:border-stone-800 space-y-4 bg-white dark:bg-stone-900">
          <div className="flex items-center justify-between border-b border-stone-200 dark:border-stone-800 pb-3">
            <div>
              <h3 className="font-bold text-stone-900 dark:text-stone-100 text-base">
                Aturan Pemetaan Perlengkapan Per Kota Keberangkatan (Origin)
              </h3>
              <p className="text-xs text-stone-500">
                Menentukan alokasi fasilitas tambahan untuk paket Starting Surabaya, Starting Jakarta, atau Paket Plus.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div className="p-4 border border-stone-200 dark:border-stone-800 rounded-xl bg-stone-50 dark:bg-stone-850 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-black text-sm text-stone-900 dark:text-stone-100 uppercase tracking-wider">
                  Paket Starting Surabaya (SUB)
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500 text-white">SUB KHUSUS</span>
              </div>
              <p className="text-xs text-stone-600 dark:text-stone-400">
                Jamaah pendaftar paket keberangkatan dari Surabaya mendapatkan fasilitas tambahan khusus:
              </p>
              <ul className="text-xs space-y-1 list-disc pl-4 text-stone-700 dark:text-stone-300 font-semibold">
                <li>Tas Selempang VTU (All Gender)</li>
                <li>Khimar Wanita VTU (Khusus Perempuan)</li>
                <li>Sarung Tangan Wanita VTU (Khusus Perempuan)</li>
              </ul>
            </div>

            <div className="p-4 border border-stone-200 dark:border-stone-800 rounded-xl bg-stone-50 dark:bg-stone-850 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-black text-sm text-stone-900 dark:text-stone-100 uppercase tracking-wider">
                  Paket Starting Jakarta / Standar (JKT)
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-stone-300 dark:bg-stone-700 text-stone-800 dark:text-stone-200">STANDAR</span>
              </div>
              <p className="text-xs text-stone-600 dark:text-stone-400">
                Jamaah pendaftar paket standar keberangkatan Jakarta mendapatkan item standar umroh:
              </p>
              <ul className="text-xs space-y-1 list-disc pl-4 text-stone-700 dark:text-stone-300 font-semibold">
                <li>Buku Doa, Slayer, Tas Serut, ID Card (Wajib Umum)</li>
                <li>Koper 24&quot;, Seragam VTU, Mukena/Ihram, Cover Paspor, Tas Tenteng</li>
              </ul>
            </div>
          </div>
        </Card>
      )}

      {/* Modal Add/Edit Gudang */}
      <Modal
        isOpen={gudangModalOpen}
        onClose={() => setGudangModalOpen(false)}
        title={editGudangId ? "Edit Lokasi Gudang" : "Tambah Gudang Baru"}
      >
        <form onSubmit={handleSaveGudang} className="space-y-4 pt-1">
          <div>
            <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
              Kode Gudang (Unik)
            </label>
            <Input
              value={kodeGudang}
              onChange={(e) => setKodeGudang(e.target.value)}
              placeholder="cth: GDG-SUB"
              required
              className="text-xs font-mono font-bold"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
              Nama Lokasi Gudang
            </label>
            <Input
              value={namaGudang}
              onChange={(e) => setNamaGudang(e.target.value)}
              placeholder="cth: Gudang Utama Surabaya"
              required
              className="text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
              Alamat Fisik Gudang
            </label>
            <Input
              value={alamatGudang}
              onChange={(e) => setAlamatGudang(e.target.value)}
              placeholder="cth: Jl. Raya Surabaya No. 12"
              className="text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
              Penanggung Jawab / PIC Gudang
            </label>
            <Input
              value={picGudang}
              onChange={(e) => setPicGudang(e.target.value)}
              placeholder="cth: Admin Surabaya"
              className="text-xs"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-stone-200 dark:border-stone-800">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setGudangModalOpen(false)}
            >
              Batal
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={submittingGudang}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
            >
              {submittingGudang ? "Menyimpan..." : "Simpan Gudang"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal Edit Kriteria & Konfigurasi Varian Ukuran */}
      <Modal
        size="xl"
        isOpen={barangModalOpen}
        onClose={() => setBarangModalOpen(false)}
        title={`Edit Kriteria & Varian: ${selectedBarang?.name || ""}`}
        className="max-w-5xl max-h-[90vh] overflow-y-auto"
      >
        <form onSubmit={handleSaveBarang} className="space-y-6 pt-2">
          {/* Top banner / item identity */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-stone-50 dark:bg-stone-850 rounded-xl border border-stone-200 dark:border-stone-800">
            <div className="flex items-center gap-2">
              <span className="text-xs text-stone-500 font-semibold">Kode Item:</span>
              <span className="font-mono font-bold text-xs px-2.5 py-1 rounded bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/80">
                {selectedBarang?.code}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-stone-500 font-semibold">Status Master:</span>
              <button
                type="button"
                onClick={() => setBarangIsActive(!barangIsActive)}
                className={cn(
                  "px-2.5 py-0.5 rounded-full text-[11px] font-bold transition-colors flex items-center gap-1.5",
                  barangIsActive
                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800"
                    : "bg-stone-200 text-stone-600 dark:bg-stone-800 dark:text-stone-400"
                )}
              >
                <span className={cn("h-2 w-2 rounded-full", barangIsActive ? "bg-emerald-500 animate-pulse" : "bg-stone-400")} />
                {barangIsActive ? "Item Aktif" : "Item Non-Aktif"}
              </button>
            </div>
          </div>

          {/* 2-Column Grid Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Kriteria Perlengkapan (5 cols) */}
            <div className="lg:col-span-5 space-y-4 p-4 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 shadow-sm">
              <div className="flex items-center gap-2 pb-2 border-b border-stone-100 dark:border-stone-800">
                <SlidersHorizontal className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                <h3 className="text-xs font-black uppercase tracking-wider text-stone-800 dark:text-stone-200">
                  1. Kriteria &amp; Karakteristik Barang
                </h3>
              </div>

              {/* Nama Perlengkapan */}
              <div>
                <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                  Nama Perlengkapan <span className="text-rose-500">*</span>
                </label>
                <Input
                  value={barangName}
                  onChange={(e) => setBarangName(e.target.value)}
                  placeholder="cth: Koper Bagasi Besar 24 Inch"
                  required
                  className="text-xs font-bold"
                />
              </div>

              {/* Satuan */}
              <div>
                <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                  Satuan Barang <span className="text-rose-500">*</span>
                </label>
                <Input
                  value={barangSatuan}
                  onChange={(e) => setBarangSatuan(e.target.value)}
                  placeholder="cth: pcs, set, buku, pasang"
                  required
                  className="text-xs"
                />
              </div>

              {/* Sifat Perlengkapan */}
              <div>
                <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1.5">
                  Sifat Perlengkapan
                </label>
                <div className="grid grid-cols-1 gap-1.5">
                  {[
                    {
                      id: "PAKET_STANDAR",
                      label: "Paket Standar",
                      desc: "Diberikan pada seluruh jamaah paket standar",
                      activeBg: "bg-stone-100 dark:bg-stone-800 border-stone-600 dark:border-stone-400",
                    },
                    {
                      id: "UMUM_WAJIB",
                      label: "Wajib Umum (All Jamaah)",
                      desc: "Wajib bagi semua jamaah (termasuk paket tanpa perlengkapan)",
                      activeBg: "bg-emerald-50 dark:bg-emerald-950/60 border-emerald-600 text-emerald-900 dark:text-emerald-200",
                    },
                    {
                      id: "ADDON_KHUSUS",
                      label: "Add-On Khusus",
                      desc: "Tambahan khusus (misal: Paket Surabaya/Spesifik)",
                      activeBg: "bg-amber-50 dark:bg-amber-950/60 border-amber-600 text-amber-900 dark:text-amber-200",
                    },
                  ].map((sifat) => {
                    const isSelected = sifatPerlengkapan === sifat.id;
                    return (
                      <button
                        key={sifat.id}
                        type="button"
                        onClick={() => setSifatPerlengkapan(sifat.id as any)}
                        className={cn(
                          "w-full text-left p-2.5 rounded-lg border text-xs transition-all flex items-start justify-between",
                          isSelected
                            ? `${sifat.activeBg} shadow-sm font-bold ring-1 ring-stone-400 dark:ring-stone-600`
                            : "border-stone-200 dark:border-stone-800 hover:bg-stone-50 dark:hover:bg-stone-850"
                        )}
                      >
                        <div>
                          <div className="font-bold">{sifat.label}</div>
                          <div className="text-[10px] text-stone-500 font-normal leading-tight mt-0.5">
                            {sifat.desc}
                          </div>
                        </div>
                        {isSelected && <Check className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Waktu Pengambilan */}
              <div>
                <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1.5">
                  Waktu Pengambilan
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setTipePengambilan("BEBAS_KAPAN_SAJA")}
                    className={cn(
                      "p-2.5 rounded-lg border text-xs font-bold transition-all text-center",
                      tipePengambilan === "BEBAS_KAPAN_SAJA"
                        ? "bg-blue-50 dark:bg-blue-950/60 border-blue-600 text-blue-800 dark:text-blue-300 shadow-sm ring-1 ring-blue-500"
                        : "border-stone-200 dark:border-stone-800 hover:bg-stone-50 dark:hover:bg-stone-850 text-stone-600 dark:text-stone-400"
                    )}
                  >
                    Bebas Kapan Saja
                  </button>
                  <button
                    type="button"
                    onClick={() => setTipePengambilan("SERENTAK_HARI_H")}
                    className={cn(
                      "p-2.5 rounded-lg border text-xs font-bold transition-all text-center",
                      tipePengambilan === "SERENTAK_HARI_H"
                        ? "bg-purple-50 dark:bg-purple-950/60 border-purple-600 text-purple-800 dark:text-purple-300 shadow-sm ring-1 ring-purple-500"
                        : "border-stone-200 dark:border-stone-800 hover:bg-stone-50 dark:hover:bg-stone-850 text-stone-600 dark:text-stone-400"
                    )}
                  >
                    Serentak Hari H
                  </button>
                </div>
              </div>

              {/* Target Gender */}
              <div>
                <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1.5">
                  Target Gender Penerima
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "ALL", label: "Semua Gender" },
                    { id: "LAKI_LAKI", label: "Laki-Laki" },
                    { id: "PEREMPUAN", label: "Perempuan" },
                  ].map((g) => (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => setGenderTarget(g.id as any)}
                      className={cn(
                        "p-2 rounded-lg border text-xs font-bold transition-all text-center",
                        genderTarget === g.id
                          ? "bg-amber-500 text-white border-amber-600 shadow-sm"
                          : "border-stone-200 dark:border-stone-800 hover:bg-stone-50 dark:hover:bg-stone-850 text-stone-600 dark:text-stone-400"
                      )}
                    >
                      {g.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column: Konfigurasi Model Varian Ukuran (7 cols) */}
            <div className="lg:col-span-7 space-y-4 p-4 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 shadow-sm flex flex-col">
              {/* Header with Toggle Switch */}
              <div className="flex items-center justify-between pb-3 border-b border-stone-200 dark:border-stone-800">
                <div className="flex items-center gap-2">
                  <Ruler className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-wider text-stone-800 dark:text-stone-200">
                      2. Konfigurasi Varian Ukuran
                    </h3>
                    <p className="text-[11px] text-stone-500">
                      Menentukan apakah barang ini memiliki variasi ukuran atau bertipe ukuran standar.
                    </p>
                  </div>
                </div>

                {/* Toggle Switch */}
                <div className="flex items-center gap-2 bg-stone-100 dark:bg-stone-800 p-1 rounded-xl border border-stone-200 dark:border-stone-700">
                  <span className={cn("text-[11px] font-bold px-1.5", hasVariants ? "text-stone-400" : "text-stone-900 dark:text-stone-100")}>
                    Tidak
                  </span>
                  <button
                    type="button"
                    onClick={() => setHasVariants(!hasVariants)}
                    className={cn(
                      "w-11 h-6 rounded-full transition-colors relative focus:outline-none focus:ring-2 focus:ring-amber-500/50",
                      hasVariants ? "bg-amber-600" : "bg-stone-300 dark:bg-stone-600"
                    )}
                  >
                    <span
                      className={cn(
                        "absolute top-0.5 left-0.5 bg-white w-5 h-5 rounded-full shadow-md transition-transform duration-200 ease-in-out",
                        hasVariants ? "transform translate-x-5" : "transform translate-x-0"
                      )}
                    />
                  </button>
                  <span className={cn("text-[11px] font-bold px-1.5", hasVariants ? "text-amber-600 dark:text-amber-400" : "text-stone-400")}>
                    Ada Varian
                  </span>
                </div>
              </div>

              {/* Mode OFF: Standar (Tanpa Varian) */}
              {!hasVariants ? (
                <div className="flex-1 flex flex-col items-center justify-center p-6 text-center border border-dashed border-stone-200 dark:border-stone-800 rounded-xl bg-stone-50/50 dark:bg-stone-850/50 space-y-3 my-auto">
                  <div className="p-3 bg-stone-100 dark:bg-stone-800 text-stone-500 rounded-full">
                    <Package className="h-8 w-8 text-stone-400" />
                  </div>
                  <div>
                    <h4 className="font-bold text-stone-800 dark:text-stone-200 text-sm">
                      Barang Standar (Tanpa Varian Ukuran)
                    </h4>
                    <p className="text-xs text-stone-500 max-w-md mt-1 leading-relaxed">
                      Barang ini tidak memerlukan varian ukuran. Pada form serah terima/pengambilan jamaah, barang akan langsung dialokasikan <strong className="text-stone-700 dark:text-stone-300">tanpa ada dropdown pilihan ukuran varian</strong> karena tidak memiliki varian lain.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setHasVariants(true)}
                    className="text-xs font-bold border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/40 mt-2"
                  >
                    <Plus className="h-3.5 w-3.5 mr-1.5" />
                    Aktifkan Mode Varian
                  </Button>
                </div>
              ) : (
                /* Mode ON: Penentuan Model Varian */
                <div className="space-y-4 flex-1">
                  {/* Step A: Quick Preset Templates */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-stone-700 dark:text-stone-300 flex items-center gap-1.5">
                        <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                        Pilih Model Varian Cepat (Template):
                      </span>
                      <span className="text-[10px] text-stone-400">Klik untuk langsung memasukkan opsi</span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {VARIANT_PRESETS.map((preset) => (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => applyPreset(preset.items)}
                          className="p-2.5 rounded-lg border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-850 hover:border-amber-500 hover:bg-amber-50/40 dark:hover:bg-amber-950/20 text-left transition-all group"
                        >
                          <div className="flex items-center gap-1.5 font-bold text-xs text-stone-800 dark:text-stone-200 group-hover:text-amber-600 dark:group-hover:text-amber-400">
                            <span>{preset.icon}</span>
                            <span className="truncate">{preset.label}</span>
                          </div>
                          <div className="text-[10px] text-stone-500 mt-0.5 truncate">
                            {preset.desc}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Step B: Daftar Varian Aktif (Chips) */}
                  <div className="p-3 bg-stone-50 dark:bg-stone-850 rounded-xl border border-stone-200 dark:border-stone-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-stone-700 dark:text-stone-300">
                        Varian yang Digunakan ({variantList.length} varian):
                      </span>
                      {variantList.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setVariantList([])}
                          className="text-[10px] font-bold text-rose-600 dark:text-rose-400 hover:underline"
                        >
                          Hapus Semua
                        </button>
                      )}
                    </div>

                    {variantList.length === 0 ? (
                      <p className="text-xs text-stone-400 italic py-2 text-center">
                        Belum ada varian ukuran yang ditentukan. Pilih model preset di atas atau tambah varian kustom di bawah.
                      </p>
                    ) : (
                      <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto pr-1">
                        {variantList.map((v) => (
                          <span
                            key={v.kodeUkuran}
                            className="inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-lg bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 shadow-sm text-xs font-semibold text-stone-800 dark:text-stone-200"
                          >
                            <span className="font-mono font-bold text-amber-600 dark:text-amber-400">{v.kodeUkuran}</span>
                            <span className="text-[10px] text-stone-500 truncate max-w-[120px]">({v.namaUkuran})</span>
                            <button
                              type="button"
                              onClick={() => removeVariant(v.kodeUkuran)}
                              className="h-4 w-4 rounded-full flex items-center justify-center hover:bg-stone-100 dark:hover:bg-stone-700 text-stone-400 hover:text-rose-500"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Step C: Tambah Varian Kustom */}
                  <div className="p-3 border border-stone-200 dark:border-stone-800 rounded-xl space-y-2 bg-white dark:bg-stone-900">
                    <span className="text-xs font-bold text-stone-700 dark:text-stone-300 block">
                      + Tambah Varian Manual / Kustom:
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end">
                      <div className="sm:col-span-3">
                        <label className="block text-[10px] font-bold text-stone-500 mb-1">
                          Kelompok
                        </label>
                        <select
                          value={customKelompok}
                          onChange={(e) => setCustomKelompok(e.target.value)}
                          className="w-full text-xs font-medium p-1.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800"
                        >
                          <option value="DEWASA_LAKI">Dewasa Laki</option>
                          <option value="DEWASA_PEREMPUAN">Dewasa Perempuan</option>
                          <option value="ANAK_LAKI">Anak-Anak</option>
                          <option value="KAIN">Bahan Kain</option>
                          <option value="STANDAR">Lainnya</option>
                        </select>
                      </div>

                      <div className="sm:col-span-3">
                        <label className="block text-[10px] font-bold text-stone-500 mb-1">
                          Kode (Singkat)
                        </label>
                        <Input
                          value={customKode}
                          onChange={(e) => setCustomKode(e.target.value)}
                          placeholder="cth: 3L / XXL"
                          className="text-xs font-mono font-bold h-8"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              addCustomVariant();
                            }
                          }}
                        />
                      </div>

                      <div className="sm:col-span-4">
                        <label className="block text-[10px] font-bold text-stone-500 mb-1">
                          Nama Label Lengkap
                        </label>
                        <Input
                          value={customNama}
                          onChange={(e) => setCustomNama(e.target.value)}
                          placeholder="cth: Kemeja Ukuran 3L"
                          className="text-xs h-8"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              addCustomVariant();
                            }
                          }}
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <Button
                          type="button"
                          size="sm"
                          onClick={addCustomVariant}
                          className="w-full h-8 text-xs font-bold bg-stone-800 hover:bg-stone-900 text-white dark:bg-stone-700 dark:hover:bg-stone-600"
                        >
                          Tambah
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Dialog Action Buttons */}
          <div className="flex justify-end gap-2 pt-4 border-t border-stone-200 dark:border-stone-800">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setBarangModalOpen(false)}
            >
              Batal
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={submittingBarang}
              className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-5"
            >
              {submittingBarang ? "Menyimpan Perubahan..." : "Simpan Kriteria & Varian"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
