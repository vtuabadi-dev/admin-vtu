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

  // Ukuran Modal
  const [ukuranModalOpen, setUkuranModalOpen] = useState(false);
  const [selectedBarangForUkuran, setSelectedBarangForUkuran] = useState<BarangItem | null>(null);
  const [kelompokUkuran, setKelompokUkuran] = useState("DEWASA_LAKI");
  const [kodeUkuran, setKodeUkuran] = useState("");
  const [namaUkuran, setNamaUkuran] = useState("");
  const [submittingUkuran, setSubmittingUkuran] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [resGudang, resBarang] = await Promise.all([
        fetch("/api/master/gudang"),
        fetch("/api/master/perlengkapan/ukuran"),
      ]);

      if (resGudang.ok) {
        const jsonG = await resGudang.json();
        if (jsonG.success) setGudangList(jsonG.data || []);
      }

      if (resBarang.ok) {
        const jsonB = await resBarang.json();
        if (jsonB.success) {
          // Group variants by barang
          const map = new Map<string, BarangItem>();
          (jsonB.data || []).forEach((u: UkuranItem & { barang: BarangItem }) => {
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
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

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

  // Handle Add Ukuran
  const handleSaveUkuran = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBarangForUkuran || !kodeUkuran || !namaUkuran) return;

    try {
      setSubmittingUkuran(true);
      const res = await fetch("/api/master/perlengkapan/ukuran", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          barangId: selectedBarangForUkuran.id,
          kelompokUkuran,
          kodeUkuran,
          namaUkuran,
          initialStockPerGudang: 100,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        alert(json.message || "Gagal menambahkan varian ukuran");
        return;
      }

      setUkuranModalOpen(false);
      loadData();
    } catch (err: any) {
      alert("Terjadi kesalahan: " + err.message);
    } finally {
      setSubmittingUkuran(false);
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
                        {(b.ukuran || []).length === 0 ? (
                          <span className="text-stone-400 italic text-[11px]">Ukuran Standar</span>
                        ) : (
                          b.ukuran?.map((u) => (
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
                        onClick={() => {
                          setSelectedBarangForUkuran(b);
                          setKodeUkuran("");
                          setNamaUkuran("");
                          setUkuranModalOpen(true);
                        }}
                        className="h-7 text-[10px] font-bold px-2"
                      >
                        + Varian
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

      {/* Modal Add Ukuran / Varian */}
      <Modal
        isOpen={ukuranModalOpen}
        onClose={() => setUkuranModalOpen(false)}
        title={`Tambah Varian Ukuran: ${selectedBarangForUkuran?.name || ""}`}
      >
        <form onSubmit={handleSaveUkuran} className="space-y-4 pt-1">
          <div>
            <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
              Kelompok Ukuran
            </label>
            <select
              value={kelompokUkuran}
              onChange={(e) => setKelompokUkuran(e.target.value)}
              className="w-full text-xs font-semibold p-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900"
            >
              <option value="ANAK_LAKI">Anak Laki-Laki (Kemeja No 3-10)</option>
              <option value="DEWASA_LAKI">Dewasa Laki-Laki (Kemeja S, M, L, XL, XXL, 4L)</option>
              <option value="DEWASA_PEREMPUAN">Dewasa Perempuan (Outer S, M, L, XL)</option>
              <option value="STANDAR">Ukuran Standar</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
              Kode Ukuran (Singkat)
            </label>
            <Input
              value={kodeUkuran}
              onChange={(e) => setKodeUkuran(e.target.value)}
              placeholder="cth: S / M / L / XL / 4L / 3 / 4"
              required
              className="text-xs font-mono font-bold"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
              Nama Label Ukuran Lengkap
            </label>
            <Input
              value={namaUkuran}
              onChange={(e) => setNamaUkuran(e.target.value)}
              placeholder="cth: Dewasa Laki Kemeja Ukuran XL"
              required
              className="text-xs"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-stone-200 dark:border-stone-800">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setUkuranModalOpen(false)}
            >
              Batal
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={submittingUkuran}
              className="bg-amber-600 hover:bg-amber-700 text-white font-bold"
            >
              {submittingUkuran ? "Menyimpan..." : "Tambah Varian Ukuran"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
