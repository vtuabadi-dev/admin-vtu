"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  PackageCheck,
  Search,
  RefreshCw,
  CheckCircle2,
  Clock,
  AlertCircle,
  CheckSquare,
  Square,
} from "lucide-react";
import { Card } from "@/shared/components/ui/Card";
import { Button } from "@/shared/components/ui/Button";
import { Input } from "@/shared/components/ui/Input";
import { Modal } from "@/shared/components/ui/Modal";
import { cn, formatDateShort } from "@/shared/lib/utils";

interface JamaahPerlengkapan {
  id: string;
  registrationId: string;
  nomorPeserta: string;
  namaLengkap: string;
  jenisKelamin?: string;
  nomorTelepon: string;
  nomorPaspor: string;
  statusPerlengkapan: string;
  tanggalAmbilPerlengkapan: string | null;
  catatanPerlengkapan: string | null;
  groupName: string;
  groupCode: string;
  paketId?: string;
  namaPaket: string;
  tanggalKeberangkatan?: string;
  checklist: {
    barangId: string;
    namaBarang?: string;
    code?: string;
    status: string;
    tanggalAmbil?: string;
    petugas?: string;
  }[];
}

interface MasterItem {
  id: string;
  code: string;
  name: string;
  stokTersedia: number;
  satuan: string;
  tipePengambilan?: "BEBAS_KAPAN_SAJA" | "SERENTAK_HARI_H";
  sifatPerlengkapan?: "UMUM_WAJIB" | "PAKET_STANDAR" | "ADDON_KHUSUS";
  genderTarget?: "ALL" | "LAKI_LAKI" | "PEREMPUAN";
  ukuran?: {
    id: string;
    kelompokUkuran: string;
    kodeUkuran: string;
    namaUkuran: string;
  }[];
}

interface PackageItem {
  id: string;
  namaPaket: string;
  kodeKeberangkatan?: string;
  kodeIndividu?: string;
  tanggalBerangkat?: string;
  tanggalKeberangkatan?: string;
  status: string;
}

export default function PengambilanPerlengkapanPage() {
  const [packages, setPackages] = useState<PackageItem[]>([]);
  const [masterItems, setMasterItems] = useState<MasterItem[]>([]);
  const [jamaahList, setJamaahList] = useState<JamaahPerlengkapan[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    tanpa: 0,
    belumAmbil: 0,
    sebagian: 0,
    sudahAmbil: 0,
  });
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedPaketId, setSelectedPaketId] = useState<string>("all");
  const [selectedStatusTab, setSelectedStatusTab] = useState<string>("ALL");
  const [search, setSearch] = useState<string>("");

  // Checklist / Update Modal
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedJamaah, setSelectedJamaah] = useState<JamaahPerlengkapan | null>(null);
  const [editStatus, setEditStatus] = useState<string>("BELUM_AMBIL");
  const [editTanggal, setEditTanggal] = useState<string>("");
  const [editCatatan, setEditCatatan] = useState<string>("");
  const [itemCheckState, setItemCheckState] = useState<Record<string, boolean>>({});
  const [submittingEdit, setSubmittingEdit] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedPaketId && selectedPaketId !== "all") params.append("paketId", selectedPaketId);
      if (search) params.append("search", search);

      const res = await fetch(`/api/admin/perlengkapan/pengambilan?${params.toString()}`);
      if (!res.ok) throw new Error("Gagal memuat data pengambilan perlengkapan");

      const json = await res.json();
      if (json.success && json.data) {
        setPackages(json.data.packages || []);
        setMasterItems(json.data.masterItems || []);
        setJamaahList(json.data.jamaah || []);
        setStats(json.data.stats || { total: 0, tanpa: 0, belumAmbil: 0, sebagian: 0, sudahAmbil: 0 });
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [selectedPaketId, search]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleOpenEdit = (j: JamaahPerlengkapan) => {
    setSelectedJamaah(j);
    setEditStatus(j.statusPerlengkapan || "BELUM_AMBIL");
    const defaultDate = (new Date().toISOString().split("T")[0] as string);
    const existingDate = j.tanggalAmbilPerlengkapan
      ? (new Date(j.tanggalAmbilPerlengkapan).toISOString().split("T")[0] as string)
      : defaultDate;
    setEditTanggal(existingDate);
    setEditCatatan(j.catatanPerlengkapan || "");

    // Populate checklist map
    const checks: Record<string, boolean> = {};
    const checklist = j.checklist || [];
    for (const item of (masterItems || [])) {
      const match = checklist.find((c) => c?.barangId === item.id);
      checks[item.id] = match ? match.status === "SUDAH" : j.statusPerlengkapan === "SUDAH_AMBIL";
    }
    setItemCheckState(checks);
    setEditModalOpen(true);
  };

  const toggleItemCheck = (itemId: string) => {
    const updated = { ...itemCheckState, [itemId]: !itemCheckState[itemId] };
    setItemCheckState(updated);

    // Auto calculate status if not manually set to TANPA
    if (editStatus !== "TANPA") {
      const totalChecked = Object.values(updated).filter(Boolean).length;
      if (totalChecked === masterItems.length) {
        setEditStatus("SUDAH_AMBIL");
      } else if (totalChecked > 0) {
        setEditStatus("SEBAGIAN");
      } else {
        setEditStatus("BELUM_AMBIL");
      }
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedJamaah) return;

    try {
      setSubmittingEdit(true);
      const itemsPayload = masterItems.map((m) => ({
        barangId: m.id,
        status: itemCheckState[m.id] ? "SUDAH" : "BELUM",
      }));

      const res = await fetch("/api/admin/perlengkapan/pengambilan", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jamaahId: selectedJamaah.id,
          statusPerlengkapan: editStatus,
          tanggalAmbilPerlengkapan:
            editStatus === "SUDAH_AMBIL" || editStatus === "SEBAGIAN" ? editTanggal : null,
          catatanPerlengkapan: editCatatan,
          items: itemsPayload,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        alert(json.message || "Gagal memperbarui status pengambilan");
        return;
      }

      setEditModalOpen(false);
      loadData();
    } catch (err: any) {
      alert("Terjadi kesalahan: " + err.message);
    } finally {
      setSubmittingEdit(false);
    }
  };

  const filteredJamaah = useMemo(() => {
    return jamaahList.filter((j) => {
      if (selectedStatusTab !== "ALL" && j.statusPerlengkapan !== selectedStatusTab) {
        return false;
      }
      return true;
    });
  }, [jamaahList, selectedStatusTab]);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-stone-200 dark:border-stone-800 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-lg">
              <PackageCheck className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-stone-900 dark:text-stone-100">
                Pengambilan Perlengkapan Jamaah
              </h1>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Checklist serah terima koper, ihram/mukena, batik, dan seragam umroh per jamaah keberangkatan.
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
        </div>
      </div>

      {/* KPI Cards (Exact User Status Colors) */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {/* Total */}
        <Card
          onClick={() => setSelectedStatusTab("ALL")}
          className={cn(
            "cursor-pointer border transition-all p-3.5",
            selectedStatusTab === "ALL"
              ? "border-amber-500 shadow-md ring-2 ring-amber-500/20 bg-amber-50/20 dark:bg-amber-950/20"
              : "hover:border-stone-400"
          )}
        >
          <p className="text-[11px] font-bold text-stone-500 uppercase">Total Jamaah</p>
          <p className="text-2xl font-black text-stone-900 dark:text-stone-100 mt-1">
            {stats.total}
          </p>
        </Card>

        {/* Tanpa: Stabilo Hitam + Tulisan Putih */}
        <Card
          onClick={() => setSelectedStatusTab("TANPA")}
          className={cn(
            "cursor-pointer border transition-all p-3.5 bg-black text-white shadow-sm",
            selectedStatusTab === "TANPA" && "ring-2 ring-stone-400"
          )}
        >
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-extrabold uppercase tracking-wider text-white">TANPA PERLENGKAPAN</p>
            <span className="h-2.5 w-2.5 rounded-full bg-white animate-pulse" />
          </div>
          <p className="text-2xl font-black text-white mt-1">
            {stats.tanpa} <span className="text-[10px] font-normal text-stone-300">Pax</span>
          </p>
        </Card>

        {/* Belum Ambil: Orange */}
        <Card
          onClick={() => setSelectedStatusTab("BELUM_AMBIL")}
          className={cn(
            "cursor-pointer border transition-all p-3.5 bg-amber-500 text-white shadow-sm",
            selectedStatusTab === "BELUM_AMBIL" && "ring-2 ring-amber-300"
          )}
        >
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-extrabold uppercase tracking-wider text-white">BELUM AMBIL</p>
            <Clock className="h-4 w-4 text-white" />
          </div>
          <p className="text-2xl font-black text-white mt-1">
            {stats.belumAmbil} <span className="text-[10px] font-normal text-amber-100">Pax</span>
          </p>
        </Card>

        {/* Ambil Sebagian: Kuning */}
        <Card
          onClick={() => setSelectedStatusTab("SEBAGIAN")}
          className={cn(
            "cursor-pointer border transition-all p-3.5 bg-yellow-400 text-stone-950 shadow-sm",
            selectedStatusTab === "SEBAGIAN" && "ring-2 ring-stone-900"
          )}
        >
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-black uppercase tracking-wider text-stone-950">AMBIL SEBAGIAN</p>
            <AlertCircle className="h-4 w-4 text-stone-950" />
          </div>
          <p className="text-2xl font-black text-stone-950 mt-1">
            {stats.sebagian} <span className="text-[10px] font-bold text-stone-800">Pax</span>
          </p>
        </Card>

        {/* Sudah Ambil: Hijau */}
        <Card
          onClick={() => setSelectedStatusTab("SUDAH_AMBIL")}
          className={cn(
            "cursor-pointer border transition-all p-3.5 bg-emerald-600 text-white shadow-sm",
            selectedStatusTab === "SUDAH_AMBIL" && "ring-2 ring-emerald-300"
          )}
        >
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-extrabold uppercase tracking-wider text-white">SUDAH AMBIL</p>
            <CheckCircle2 className="h-4 w-4 text-white" />
          </div>
          <p className="text-2xl font-black text-white mt-1">
            {stats.sudahAmbil} <span className="text-[10px] font-normal text-emerald-100">Pax</span>
          </p>
        </Card>
      </div>

      {/* Filter Controls Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3 bg-stone-50 dark:bg-stone-850 p-3 rounded-xl border border-stone-200 dark:border-stone-700/60">
        <div className="w-full sm:w-72">
          <label className="block text-[10px] font-bold uppercase text-stone-500 mb-1">
            Pilih Paket Keberangkatan
          </label>
          <select
            value={selectedPaketId}
            onChange={(e) => setSelectedPaketId(e.target.value)}
            className="w-full text-xs font-semibold p-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900"
          >
            <option value="all">Semua Paket Keberangkatan</option>
            {packages.map((pkg) => (
              <option key={pkg.id} value={pkg.id}>
                {pkg.namaPaket} ({formatDateShort(pkg.tanggalBerangkat || pkg.tanggalKeberangkatan)})
              </option>
            ))}
          </select>
        </div>

        <div className="w-full sm:flex-1">
          <label className="block text-[10px] font-bold uppercase text-stone-500 mb-1">
            Pencarian Jamaah / ID Register / Paspor
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-stone-400" />
            <Input
              placeholder="Cari nama, ID reg (GRP-...), no paspor..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="text-xs pl-8 h-9 bg-white dark:bg-stone-900"
            />
          </div>
        </div>
      </div>

      {/* Table of Jamaah & Equipment Status */}
      <Card className="border-stone-200 dark:border-stone-800 shadow-sm overflow-hidden bg-white dark:bg-stone-900">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead className="bg-stone-100 dark:bg-stone-800/90 text-stone-700 dark:text-stone-300 font-bold border-b border-stone-200 dark:border-stone-700 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-4 py-3 w-12 text-center">No</th>
                <th className="px-4 py-3 w-36">ID Register</th>
                <th className="px-4 py-3">Nama Jamaah &amp; Rombongan</th>
                <th className="px-4 py-3">Paket Keberangkatan</th>
                <th className="px-4 py-3 w-36 text-center">Status Perlengkapan</th>
                <th className="px-4 py-3 w-32">Tgl Pengambilan</th>
                <th className="px-4 py-3 w-28 text-center">Item Diambil</th>
                <th className="px-4 py-3">Catatan</th>
                <th className="px-4 py-3 w-28 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200 dark:divide-stone-800 font-medium">
              {filteredJamaah.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-stone-500">
                    {loading ? "Memuat data pengambilan perlengkapan..." : "Tidak ada data jamaah yang sesuai kriteria."}
                  </td>
                </tr>
              ) : (
                filteredJamaah.map((j, idx) => {
                  const checklist = j.checklist || [];
                  const activeMasterItems = (masterItems || []).filter((it) => it.tipePengambilan !== "SERENTAK_HARI_H");
                  const itemsCheckedCount = checklist.filter((c) => c?.status === "SUDAH" && activeMasterItems.some((a) => a.id === c?.barangId)).length;
                  const totalMaster = activeMasterItems.length;

                  return (
                    <tr key={j.id} className="hover:bg-amber-50/30 dark:hover:bg-amber-950/20 transition-colors">
                      <td className="px-4 py-3 text-center text-stone-400 font-mono">{idx + 1}</td>
                      <td className="px-4 py-3 font-mono font-bold text-amber-700 dark:text-amber-400">
                        {j.registrationId || j.nomorPeserta}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-bold text-stone-900 dark:text-stone-100">{j.namaLengkap}</div>
                        <div className="text-[10px] text-stone-500">
                          Grup: <span className="font-semibold text-stone-700 dark:text-stone-300">{j.groupName}</span> ({j.groupCode})
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-stone-800 dark:text-stone-200">{j.namaPaket}</div>
                        {j.tanggalKeberangkatan && (
                          <div className="text-[10px] text-stone-500 font-mono">
                            Keberangkatan: {formatDateShort(j.tanggalKeberangkatan)}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {/* The exact 4 badge styles required by user */}
                        {j.statusPerlengkapan === "TANPA" ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded text-[10px] font-black bg-black text-white shadow-sm border border-stone-800 tracking-wider">
                            TANPA
                          </span>
                        ) : j.statusPerlengkapan === "SUDAH_AMBIL" ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded text-[10px] font-bold bg-emerald-600 text-white shadow-sm">
                            SUDAH AMBIL
                          </span>
                        ) : j.statusPerlengkapan === "SEBAGIAN" ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded text-[10px] font-bold bg-yellow-400 text-stone-950 shadow-sm">
                            AMBIL SEBAGIAN
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-1 rounded text-[10px] font-bold bg-amber-500 text-white shadow-sm">
                            BELUM AMBIL
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono text-stone-600 dark:text-stone-400 text-[11px]">
                        {j.tanggalAmbilPerlengkapan
                          ? new Date(j.tanggalAmbilPerlengkapan).toLocaleDateString("id-ID")
                          : "-"}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {j.statusPerlengkapan === "TANPA" ? (
                          <span className="text-stone-400">-</span>
                        ) : (
                          <span className="font-mono font-bold text-xs bg-stone-100 dark:bg-stone-800 px-2 py-0.5 rounded text-stone-700 dark:text-stone-300">
                            {itemsCheckedCount}/{totalMaster}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-stone-500 text-[11px] truncate max-w-xs">
                        {j.catatanPerlengkapan || "-"}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenEdit(j)}
                          className="text-[10px] h-7 px-2.5 font-bold border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/40"
                        >
                          Checklist
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Checklist / Serah Terima Modal */}
      <Modal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title="Checklist Serah Terima Perlengkapan"
      >
        {selectedJamaah && (
          <form onSubmit={handleSaveEdit} className="space-y-4 pt-1">
            {/* Jamaah info banner with Auto-Detected Gender */}
            <div className="p-3 bg-stone-100 dark:bg-stone-800/60 rounded-lg border border-stone-200 dark:border-stone-700/60">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-sm text-stone-900 dark:text-stone-100">
                      {selectedJamaah.namaLengkap}
                    </h4>
                    {/* Auto Detected Gender Badge */}
                    {selectedJamaah.jenisKelamin?.toUpperCase().includes("P") ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-pink-100 text-pink-800 dark:bg-pink-950 dark:text-pink-300 border border-pink-200">
                        PEREMPUAN (OTOMATIS)
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300 border border-sky-200">
                        LAKI-LAKI (OTOMATIS)
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-stone-500 font-mono mt-0.5">
                    ID Reg: <span className="font-bold text-amber-600">{selectedJamaah.registrationId}</span> | Grup: {selectedJamaah.groupName}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-stone-400 block">Paket:</span>
                  <span className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                    {selectedJamaah.namaPaket}
                  </span>
                </div>
              </div>
            </div>

            {/* Status Selection */}
            <div>
              <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1.5">
                Status Pengambilan Utama
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => setEditStatus("TANPA")}
                  className={cn(
                    "py-2 px-2 text-xs font-black rounded-lg border transition-all text-center",
                    editStatus === "TANPA"
                      ? "bg-black text-white border-stone-900 shadow-sm ring-2 ring-stone-400"
                      : "bg-stone-50 dark:bg-stone-800 text-stone-600 dark:text-stone-400 border-stone-200"
                  )}
                >
                  TANPA
                </button>
                <button
                  type="button"
                  onClick={() => setEditStatus("BELUM_AMBIL")}
                  className={cn(
                    "py-2 px-2 text-xs font-bold rounded-lg border transition-all text-center",
                    editStatus === "BELUM_AMBIL"
                      ? "bg-amber-500 text-white border-amber-600 shadow-sm ring-2 ring-amber-300"
                      : "bg-stone-50 dark:bg-stone-800 text-stone-600 dark:text-stone-400 border-stone-200"
                  )}
                >
                  BELUM AMBIL
                </button>
                <button
                  type="button"
                  onClick={() => setEditStatus("SEBAGIAN")}
                  className={cn(
                    "py-2 px-2 text-xs font-black rounded-lg border transition-all text-center",
                    editStatus === "SEBAGIAN"
                      ? "bg-yellow-400 text-stone-950 border-yellow-500 shadow-sm ring-2 ring-stone-900"
                      : "bg-stone-50 dark:bg-stone-800 text-stone-600 dark:text-stone-400 border-stone-200"
                  )}
                >
                  AMBIL SEBAGIAN
                </button>
                <button
                  type="button"
                  onClick={() => setEditStatus("SUDAH_AMBIL")}
                  className={cn(
                    "py-2 px-2 text-xs font-bold rounded-lg border transition-all text-center",
                    editStatus === "SUDAH_AMBIL"
                      ? "bg-emerald-600 text-white border-emerald-700 shadow-sm ring-2 ring-emerald-300"
                      : "bg-stone-50 dark:bg-stone-800 text-stone-600 dark:text-stone-400 border-stone-200"
                  )}
                >
                  SUDAH AMBIL
                </button>
              </div>
            </div>

            {/* Checklist of Master Items */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-stone-700 dark:text-stone-300">
                  Checklist Item Perlengkapan (Sesuai Gender &amp; Paket)
                </label>
                <div className="flex gap-2 text-[10px]">
                  <button
                    type="button"
                    onClick={() => {
                      const allTrue: Record<string, boolean> = {};
                      masterItems.forEach((m) => (allTrue[m.id] = true));
                      setItemCheckState(allTrue);
                      setEditStatus("SUDAH_AMBIL");
                    }}
                    className="text-emerald-600 font-bold hover:underline"
                  >
                    Pilih Semua
                  </button>
                  <span>|</span>
                  <button
                    type="button"
                    onClick={() => {
                      const allFalse: Record<string, boolean> = {};
                      masterItems.forEach((m) => (allFalse[m.id] = false));
                      setItemCheckState(allFalse);
                      setEditStatus("BELUM_AMBIL");
                    }}
                    className="text-stone-500 font-bold hover:underline"
                  >
                    Kosongkan
                  </button>
                </div>
              </div>

              <div className="space-y-1.5 max-h-56 overflow-y-auto p-2 bg-stone-50 dark:bg-stone-900 rounded-lg border border-stone-200 dark:border-stone-800">
                {masterItems
                  .filter((item) => {
                    // Exclude Hari H items from Admin pre-departure checklist form
                    if (item.tipePengambilan === "SERENTAK_HARI_H") return false;

                    const isFemale = selectedJamaah.jenisKelamin?.toUpperCase().includes("P");
                    // Gender filtering
                    if (isFemale && item.genderTarget === "LAKI_LAKI") return false;
                    if (!isFemale && item.genderTarget === "PEREMPUAN") return false;

                    // If TANPA status, only show Universal Mandatory items
                    if (editStatus === "TANPA" && item.sifatPerlengkapan !== "UMUM_WAJIB") {
                      return false;
                    }
                    return true;
                  })
                  .map((item) => {
                    const isChecked = !!itemCheckState[item.id];
                    return (
                      <div
                        key={item.id}
                        onClick={() => toggleItemCheck(item.id)}
                        className={cn(
                          "flex items-center justify-between p-2 rounded cursor-pointer transition-colors text-xs select-none",
                          isChecked
                            ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800"
                            : "hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300"
                        )}
                      >
                        <div className="flex items-center gap-2">
                          {isChecked ? (
                            <CheckSquare className="h-4 w-4 text-emerald-600 shrink-0" />
                          ) : (
                            <Square className="h-4 w-4 text-stone-400 shrink-0" />
                          )}
                          <div>
                            <span className="font-semibold">{item.name}</span>
                            <span className="ml-1.5 text-[10px] font-mono text-stone-400">({item.code})</span>

                            {/* Property Badges */}
                            <div className="flex gap-1.5 mt-0.5">
                              {item.sifatPerlengkapan === "UMUM_WAJIB" && (
                                <span className="text-[9px] font-black px-1.5 py-0.2 bg-emerald-600 text-white rounded">WAJIB UMUM</span>
                              )}
                              {item.tipePengambilan === "SERENTAK_HARI_H" && (
                                <span className="text-[9px] font-bold px-1.5 py-0.2 bg-purple-100 text-purple-800 rounded">HARI H</span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Size Selection Dropdown for Seragam / Items with Variants */}
                        {(item.ukuran || []).filter((u) => u.kodeUkuran !== "STD").length > 0 ? (
                          <select
                            onClick={(e) => e.stopPropagation()}
                            className="text-[11px] font-bold p-1 rounded border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-800 dark:text-stone-100"
                          >
                            <option value="">Pilih Ukuran / Opsi...</option>
                            {item.ukuran?.map((u) => (
                              <option key={u.id} value={u.kodeUkuran}>
                                {u.namaUkuran}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className="text-[10px] font-bold text-stone-400">
                            Stok: {item.stokTersedia} {item.satuan}
                          </span>
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Tanggal Pengambilan & Catatan */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                  Tanggal Pengambilan
                </label>
                <Input
                  type="date"
                  value={editTanggal}
                  onChange={(e) => setEditTanggal(e.target.value)}
                  className="text-xs h-9"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                  Penerima / Catatan Khusus
                </label>
                <Input
                  placeholder="cth: Diambil oleh suami / Koper dikirim kurir"
                  value={editCatatan}
                  onChange={(e) => setEditCatatan(e.target.value)}
                  className="text-xs h-9"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-stone-200 dark:border-stone-800">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setEditModalOpen(false)}
              >
                Batal
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={submittingEdit}
                className="bg-amber-600 hover:bg-amber-700 text-white font-bold"
              >
                {submittingEdit ? "Menyimpan..." : "Simpan Status Pengambilan"}
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
