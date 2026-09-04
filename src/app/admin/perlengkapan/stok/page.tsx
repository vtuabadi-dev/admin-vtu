"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Boxes,
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  History,
  PackagePlus,
} from "lucide-react";
import { Card, CardContent } from "@/shared/components/ui/Card";
import { Button } from "@/shared/components/ui/Button";
import { Input } from "@/shared/components/ui/Input";
import { Modal } from "@/shared/components/ui/Modal";
import { cn } from "@/shared/lib/utils";

interface MasterItem {
  id: string;
  code: string;
  name: string;
  stokTersedia: number;
  stokMinimum: number;
  satuan: string;
  isActive: boolean;
  mutasi?: any[];
}

interface MutasiRecord {
  id: string;
  tipe: "MASUK" | "KELUAR";
  jumlah: number;
  keterangan: string | null;
  petugas: string | null;
  createdAt: string;
  barang?: {
    code: string;
    name: string;
    satuan: string;
  };
}

export default function StokGudangPage() {
  const [items, setItems] = useState<MasterItem[]>([]);
  const [recentMutasi, setRecentMutasi] = useState<MutasiRecord[]>([]);
  const [stats, setStats] = useState({
    totalJenis: 0,
    totalStokFisik: 0,
    stokKritisCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Modals
  const [mutasiModalOpen, setMutasiModalOpen] = useState(false);
  const [selectedBarangId, setSelectedBarangId] = useState("");
  const [mutasiType, setMutasiType] = useState<"MASUK" | "KELUAR">("MASUK");
  const [mutasiJumlah, setMutasiJumlah] = useState("");
  const [mutasiKeterangan, setMutasiKeterangan] = useState("");
  const [submittingMutasi, setSubmittingMutasi] = useState(false);

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newCode, setNewCode] = useState("");
  const [newName, setNewName] = useState("");
  const [newStok, setNewStok] = useState("");
  const [newMin, setNewMin] = useState("10");
  const [newSatuan, setNewSatuan] = useState("pcs");
  const [submittingCreate, setSubmittingCreate] = useState(false);

  const [activeTab, setActiveTab] = useState<"stok" | "riwayat">("stok");

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/perlengkapan/stok");
      if (!res.ok) throw new Error("Gagal memuat data stok perlengkapan");
      const json = await res.json();
      if (json.success && json.data) {
        setItems(json.data.items || []);
        setRecentMutasi(json.data.recentMutasi || []);
        setStats(json.data.stats || { totalJenis: 0, totalStokFisik: 0, stokKritisCount: 0 });
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleOpenMutasi = (item?: MasterItem, type: "MASUK" | "KELUAR" = "MASUK") => {
    if (item) {
      setSelectedBarangId(item.id);
    } else if (items.length > 0 && items[0]) {
      setSelectedBarangId(items[0].id);
    }
    setMutasiType(type);
    setMutasiJumlah("");
    setMutasiKeterangan("");
    setMutasiModalOpen(true);
  };

  const handleSubmitMutasi = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBarangId || !mutasiJumlah) return;

    try {
      setSubmittingMutasi(true);
      const res = await fetch("/api/admin/perlengkapan/stok", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "mutasi",
          barangId: selectedBarangId,
          tipe: mutasiType,
          jumlah: parseInt(mutasiJumlah, 10),
          keterangan: mutasiKeterangan,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        alert(json.message || "Gagal mencatat mutasi stok");
        return;
      }

      setMutasiModalOpen(false);
      loadData();
    } catch (err: any) {
      alert("Terjadi kesalahan: " + err.message);
    } finally {
      setSubmittingMutasi(false);
    }
  };

  const handleSubmitCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCode || !newName) return;

    try {
      setSubmittingCreate(true);
      const res = await fetch("/api/admin/perlengkapan/stok", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          code: newCode,
          name: newName,
          stokTersedia: parseInt(newStok, 10) || 0,
          stokMinimum: parseInt(newMin, 10) || 10,
          satuan: newSatuan,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        alert(json.message || "Gagal menambah barang baru");
        return;
      }

      setCreateModalOpen(false);
      setNewCode("");
      setNewName("");
      setNewStok("");
      loadData();
    } catch (err: any) {
      alert("Terjadi kesalahan: " + err.message);
    } finally {
      setSubmittingCreate(false);
    }
  };

  const filteredItems = items.filter((it) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return it.name.toLowerCase().includes(s) || it.code.toLowerCase().includes(s);
  });

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-stone-200 dark:border-stone-800 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-500/10 dark:bg-amber-400/10 text-amber-600 dark:text-amber-400 rounded-lg">
              <Boxes className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-stone-900 dark:text-stone-100">
                Stok Gudang Perlengkapan
              </h1>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Monitoring ketersediaan atribut jamaah, mutasi barang masuk/keluar, dan ambang batas stok minimum.
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

          <Button
            variant="outline"
            size="sm"
            onClick={() => setCreateModalOpen(true)}
            className="border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/40"
          >
            <PackagePlus className="h-4 w-4 mr-1.5" />
            Item Baru
          </Button>

          <Button
            size="sm"
            onClick={() => handleOpenMutasi(undefined, "MASUK")}
            className="bg-amber-600 hover:bg-amber-700 text-white shadow-sm"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Catat Mutasi
          </Button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-stone-200/80 dark:border-stone-800 bg-white/80 dark:bg-stone-900/80 shadow-sm backdrop-blur">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Macam Perlengkapan</p>
              <h3 className="text-2xl font-black text-stone-900 dark:text-stone-100 mt-1">
                {stats.totalJenis} <span className="text-xs font-medium text-stone-400">Jenis Barang</span>
              </h3>
            </div>
            <div className="p-3 bg-stone-100 dark:bg-stone-800 rounded-xl text-stone-600 dark:text-stone-300">
              <Boxes className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-stone-200/80 dark:border-stone-800 bg-white/80 dark:bg-stone-900/80 shadow-sm backdrop-blur">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Total Fisik di Gudang</p>
              <h3 className="text-2xl font-black text-stone-900 dark:text-stone-100 mt-1">
                {stats.totalStokFisik.toLocaleString("id-ID")} <span className="text-xs font-medium text-stone-400">Unit Fisik</span>
              </h3>
            </div>
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className={cn(
          "border-stone-200/80 dark:border-stone-800 bg-white/80 dark:bg-stone-900/80 shadow-sm backdrop-blur",
          stats.stokKritisCount > 0 && "border-rose-300 dark:border-rose-800/80 bg-rose-50/20"
        )}>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Peringatan Stok Menipis</p>
              <h3 className={cn(
                "text-2xl font-black mt-1",
                stats.stokKritisCount > 0 ? "text-rose-600 dark:text-rose-400" : "text-stone-900 dark:text-stone-100"
              )}>
                {stats.stokKritisCount} <span className="text-xs font-medium text-stone-400">Perlu Restock Segera</span>
              </h3>
            </div>
            <div className={cn(
              "p-3 rounded-xl",
              stats.stokKritisCount > 0
                ? "bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400"
                : "bg-stone-100 dark:bg-stone-800 text-stone-500"
            )}>
              <AlertTriangle className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
        <div className="flex items-center gap-1 bg-stone-100 dark:bg-stone-800/80 p-1 rounded-lg border border-stone-200 dark:border-stone-700/60 w-fit">
          <button
            onClick={() => setActiveTab("stok")}
            className={cn(
              "px-3.5 py-1.5 text-xs font-bold rounded-md transition-all",
              activeTab === "stok"
                ? "bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100 shadow-sm"
                : "text-stone-600 dark:text-stone-400 hover:text-stone-900"
            )}
          >
            Daftar Stok Barang ({items.length})
          </button>
          <button
            onClick={() => setActiveTab("riwayat")}
            className={cn(
              "px-3.5 py-1.5 text-xs font-bold rounded-md transition-all flex items-center gap-1.5",
              activeTab === "riwayat"
                ? "bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100 shadow-sm"
                : "text-stone-600 dark:text-stone-400 hover:text-stone-900"
            )}
          >
            <History className="h-3.5 w-3.5" />
            Riwayat Mutasi ({recentMutasi.length})
          </button>
        </div>

        {activeTab === "stok" && (
          <div className="w-full sm:w-72">
            <Input
              placeholder="Cari kode atau nama barang..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="text-xs h-9 bg-white dark:bg-stone-900"
            />
          </div>
        )}
      </div>

      {/* Main Table Card */}
      {activeTab === "stok" ? (
        <Card className="border-stone-200 dark:border-stone-800 shadow-sm overflow-hidden bg-white dark:bg-stone-900">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead className="bg-stone-100 dark:bg-stone-800/90 text-stone-700 dark:text-stone-300 font-bold border-b border-stone-200 dark:border-stone-700 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-4 py-3 w-12 text-center">No</th>
                  <th className="px-4 py-3 w-28">Kode</th>
                  <th className="px-4 py-3">Nama Perlengkapan</th>
                  <th className="px-4 py-3 w-28 text-right">Stok Gudang</th>
                  <th className="px-4 py-3 w-28 text-right">Ambang Min.</th>
                  <th className="px-4 py-3 w-20 text-center">Satuan</th>
                  <th className="px-4 py-3 w-32 text-center">Status Stok</th>
                  <th className="px-4 py-3 w-40 text-center">Aksi Cepat</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200 dark:divide-stone-800 font-medium">
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-stone-500">
                      {loading ? "Memuat data perlengkapan..." : "Tidak ada perlengkapan yang cocok dengan pencarian."}
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item, idx) => {
                    const isKritis = item.stokTersedia <= item.stokMinimum;
                    const isKosong = item.stokTersedia === 0;

                    return (
                      <tr key={item.id} className="hover:bg-amber-50/30 dark:hover:bg-amber-950/20 transition-colors">
                        <td className="px-4 py-3 text-center text-stone-400 font-mono">{idx + 1}</td>
                        <td className="px-4 py-3 font-mono font-bold text-amber-700 dark:text-amber-400">
                          {item.code}
                        </td>
                        <td className="px-4 py-3 text-stone-900 dark:text-stone-100 font-semibold">
                          {item.name}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-stone-900 dark:text-stone-100 text-sm">
                          {item.stokTersedia.toLocaleString("id-ID")}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-stone-500">
                          {item.stokMinimum.toLocaleString("id-ID")}
                        </td>
                        <td className="px-4 py-3 text-center uppercase text-[11px] text-stone-500 font-semibold">
                          {item.satuan}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {isKosong ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black bg-rose-600 text-white shadow-sm">
                              HABIS (0)
                            </span>
                          ) : isKritis ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black bg-amber-500 text-white shadow-sm">
                              MENIPIS
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-600 text-white shadow-sm">
                              TERSEDIA
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => handleOpenMutasi(item, "MASUK")}
                              title="Tambah Stok Masuk"
                              className="px-2 py-1 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-700 rounded text-[10px] font-bold hover:bg-emerald-100"
                            >
                              + Masuk
                            </button>
                            <button
                              onClick={() => handleOpenMutasi(item, "KELUAR")}
                              title="Catat Barang Keluar"
                              className="px-2 py-1 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-300 dark:border-rose-700 rounded text-[10px] font-bold hover:bg-rose-100"
                            >
                              - Keluar
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <Card className="border-stone-200 dark:border-stone-800 shadow-sm overflow-hidden bg-white dark:bg-stone-900">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead className="bg-stone-100 dark:bg-stone-800/90 text-stone-700 dark:text-stone-300 font-bold border-b border-stone-200 dark:border-stone-700 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-4 py-3 w-12 text-center">No</th>
                  <th className="px-4 py-3 w-36">Waktu Mutasi</th>
                  <th className="px-4 py-3 w-28 text-center">Jenis Mutasi</th>
                  <th className="px-4 py-3">Nama Barang</th>
                  <th className="px-4 py-3 w-24 text-right">Jumlah</th>
                  <th className="px-4 py-3">Keterangan</th>
                  <th className="px-4 py-3 w-28">Petugas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200 dark:divide-stone-800 font-medium">
                {recentMutasi.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-stone-500">
                      Belum ada riwayat mutasi perlengkapan tercatat.
                    </td>
                  </tr>
                ) : (
                  recentMutasi.map((m, idx) => (
                    <tr key={m.id} className="hover:bg-stone-50 dark:hover:bg-stone-850">
                      <td className="px-4 py-3 text-center text-stone-400 font-mono">{idx + 1}</td>
                      <td className="px-4 py-3 font-mono text-stone-500">
                        {new Date(m.createdAt).toLocaleString("id-ID", {
                          dateStyle: "short",
                          timeStyle: "short",
                        })}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {m.tipe === "MASUK" ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                            <ArrowDownLeft className="h-3 w-3" /> MASUK
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
                            <ArrowUpRight className="h-3 w-3" /> KELUAR
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-semibold text-stone-800 dark:text-stone-200">
                        {m.barang?.name || "-"} ({m.barang?.code})
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-sm">
                        {m.tipe === "MASUK" ? "+" : "-"}
                        {m.jumlah} {m.barang?.satuan}
                      </td>
                      <td className="px-4 py-3 text-stone-600 dark:text-stone-400">
                        {m.keterangan || "-"}
                      </td>
                      <td className="px-4 py-3 font-semibold text-stone-700 dark:text-stone-300">
                        {m.petugas || "Admin"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Modal Mutasi Stok (Masuk / Keluar) */}
      <Modal
        isOpen={mutasiModalOpen}
        onClose={() => setMutasiModalOpen(false)}
        title="Catat Mutasi Stok Perlengkapan"
      >
        <form onSubmit={handleSubmitMutasi} className="space-y-4 pt-2">
          <div>
            <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
              Pilih Barang
            </label>
            <select
              value={selectedBarangId}
              onChange={(e) => setSelectedBarangId(e.target.value)}
              className="w-full text-xs font-semibold p-2.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-850"
              required
            >
              {items.map((it) => (
                <option key={it.id} value={it.id}>
                  [{it.code}] {it.name} (Stok: {it.stokTersedia} {it.satuan})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                Tipe Mutasi
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setMutasiType("MASUK")}
                  className={cn(
                    "flex-1 py-2 text-xs font-bold rounded-lg border transition-all flex items-center justify-center gap-1",
                    mutasiType === "MASUK"
                      ? "bg-emerald-600 text-white border-emerald-700 shadow-sm"
                      : "bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border-stone-200 dark:border-stone-700"
                  )}
                >
                  <ArrowDownLeft className="h-3.5 w-3.5" /> Masuk
                </button>
                <button
                  type="button"
                  onClick={() => setMutasiType("KELUAR")}
                  className={cn(
                    "flex-1 py-2 text-xs font-bold rounded-lg border transition-all flex items-center justify-center gap-1",
                    mutasiType === "KELUAR"
                      ? "bg-rose-600 text-white border-rose-700 shadow-sm"
                      : "bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border-stone-200 dark:border-stone-700"
                  )}
                >
                  <ArrowUpRight className="h-3.5 w-3.5" /> Keluar
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                Jumlah Unit
              </label>
              <Input
                type="number"
                min="1"
                placeholder="cth: 50"
                value={mutasiJumlah}
                onChange={(e) => setMutasiJumlah(e.target.value)}
                required
                className="text-xs h-9"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
              Keterangan / Referensi Mutasi
            </label>
            <Input
              placeholder="cth: Restock pengiriman vendor PT XYZ / Pengambilan rombongan"
              value={mutasiKeterangan}
              onChange={(e) => setMutasiKeterangan(e.target.value)}
              className="text-xs h-9"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-stone-200 dark:border-stone-800">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setMutasiModalOpen(false)}
            >
              Batal
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={submittingMutasi}
              className="bg-amber-600 hover:bg-amber-700 text-white font-bold"
            >
              {submittingMutasi ? "Menyimpan..." : "Simpan Mutasi Stok"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal Tambah Item Perlengkapan Baru */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Tambah Item Perlengkapan Baru"
      >
        <form onSubmit={handleSubmitCreate} className="space-y-4 pt-2">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                Kode Barang (*)
              </label>
              <Input
                placeholder="cth: KPR-28"
                value={newCode}
                onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                required
                className="text-xs h-9 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                Satuan
              </label>
              <Input
                placeholder="cth: pcs / set / meter"
                value={newSatuan}
                onChange={(e) => setNewSatuan(e.target.value)}
                required
                className="text-xs h-9"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
              Nama Lengkap Barang (*)
            </label>
            <Input
              placeholder="cth: Koper Ekstra Bagasi 28 Inch VTU"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              required
              className="text-xs h-9"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                Stok Awal Fisik
              </label>
              <Input
                type="number"
                min="0"
                placeholder="0"
                value={newStok}
                onChange={(e) => setNewStok(e.target.value)}
                className="text-xs h-9"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                Ambang Batas Minimum
              </label>
              <Input
                type="number"
                min="1"
                placeholder="10"
                value={newMin}
                onChange={(e) => setNewMin(e.target.value)}
                className="text-xs h-9"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-stone-200 dark:border-stone-800">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setCreateModalOpen(false)}
            >
              Batal
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={submittingCreate}
              className="bg-amber-600 hover:bg-amber-700 text-white font-bold"
            >
              {submittingCreate ? "Menyimpan..." : "Daftarkan Barang"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
