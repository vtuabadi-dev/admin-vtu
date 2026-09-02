"use client";

import { useState, useEffect } from "react";
import {
  Loader2,
  Save,
  Settings2,
  Wallet,
  Coins,
  CreditCard,
  Plus,
  Edit2,
  Trash2,
  Info,
} from "lucide-react";
import { Button } from "@/shared/components/ui/Button";
import { Input } from "@/shared/components/ui/Input";
import { Modal } from "@/shared/components/ui/Modal";
import { Badge } from "@/shared/components/ui/Badge";

const formatRupiah = (val: number) => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(val);
};

interface RekeningItem {
  id?: string;
  tipeLayanan: "WAKAF_QURAN" | "BADAL_UMROH";
  namaBank: string;
  nomorRekening: string;
  atasNama: string;
  keterangan?: string | null;
  isActive: boolean;
  urutan?: number;
}

export default function MasterBadalWakafPage() {
  const [loading, setLoading] = useState(true);
  const [savingPrice, setSavingPrice] = useState(false);
  const [prices, setPrices] = useState({
    BADAL_UMROH: 2500000,
    WAKAF_QURAN: 350000,
  });

  // Rekening State (Tersatu untuk Badal & Wakaf)
  const [rekeningList, setRekeningList] = useState<RekeningItem[]>([]);
  const [loadingRekening, setLoadingRekening] = useState(false);

  // Modal State for Rekening
  const [isRekeningModalOpen, setIsRekeningModalOpen] = useState(false);
  const [editingRekening, setEditingRekening] = useState<RekeningItem | null>(null);
  const [savingRekening, setSavingRekening] = useState(false);

  const [formRekening, setFormRekening] = useState<RekeningItem>({
    tipeLayanan: "BADAL_UMROH",
    namaBank: "",
    nomorRekening: "",
    atasNama: "PT VAUZA TIGA UTAMA",
    keterangan: "Rekening Resmi Operasional Badal & Wakaf",
    isActive: true,
    urutan: 1,
  });

  const fetchPrices = async () => {
    try {
      const res = await fetch("/api/master/harga-layanan");
      const json = await res.json();
      if (json.success && json.data) {
        setPrices(json.data);
      }
    } catch (error) {
      console.error("Failed to fetch prices:", error);
    }
  };

  const fetchRekening = async () => {
    try {
      setLoadingRekening(true);
      const res = await fetch("/api/master/rekening-layanan");
      const json = await res.json();
      if (json.success && json.data) {
        setRekeningList(json.data);
      }
    } catch (error) {
      console.error("Failed to fetch rekening:", error);
    } finally {
      setLoadingRekening(false);
    }
  };

  useEffect(() => {
    Promise.all([fetchPrices(), fetchRekening()]).finally(() => setLoading(false));
  }, []);

  const handleUpdatePrice = async (tipeLayanan: string, harga: number) => {
    setSavingPrice(true);
    try {
      const res = await fetch("/api/master/harga-layanan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipeLayanan, harga }),
      });
      const json = await res.json();
      if (json.success) {
        alert("Harga berhasil diupdate!");
      } else {
        alert(json.message || "Gagal mengupdate harga");
      }
    } catch (error) {
      console.error("Error updating price:", error);
      alert("Terjadi kesalahan sistem saat menyimpan harga.");
    } finally {
      setSavingPrice(false);
    }
  };

  const handleOpenAddRekening = () => {
    setEditingRekening(null);
    setFormRekening({
      tipeLayanan: "BADAL_UMROH",
      namaBank: "",
      nomorRekening: "",
      atasNama: "PT VAUZA TIGA UTAMA",
      keterangan: "Rekening Resmi Operasional Badal & Wakaf",
      isActive: true,
      urutan: rekeningList.length + 1,
    });
    setIsRekeningModalOpen(true);
  };

  const handleOpenEditRekening = (item: RekeningItem) => {
    setEditingRekening(item);
    setFormRekening({
      id: item.id,
      tipeLayanan: item.tipeLayanan || "BADAL_UMROH",
      namaBank: item.namaBank,
      nomorRekening: item.nomorRekening,
      atasNama: item.atasNama,
      keterangan: item.keterangan || "",
      isActive: item.isActive,
      urutan: item.urutan || 1,
    });
    setIsRekeningModalOpen(true);
  };

  const handleSaveRekening = async () => {
    if (!formRekening.namaBank.trim() || !formRekening.nomorRekening.trim() || !formRekening.atasNama.trim()) {
      alert("Mohon lengkapi Nama Bank, Nomor Rekening, dan Atas Nama.");
      return;
    }

    setSavingRekening(true);
    try {
      const res = await fetch("/api/master/rekening-layanan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formRekening),
      });
      const json = await res.json();
      if (json.success) {
        setIsRekeningModalOpen(false);
        fetchRekening();
      } else {
        alert(`Gagal menyimpan rekening: ${json.message}`);
      }
    } catch (error) {
      console.error("Error saving rekening:", error);
      alert("Terjadi kesalahan sistem saat menyimpan rekening.");
    } finally {
      setSavingRekening(false);
    }
  };

  const handleDeleteRekening = async (id: string, bank: string) => {
    if (!confirm(`Hapus konfigurasi rekening ${bank}?`)) return;
    try {
      const res = await fetch(`/api/master/rekening-layanan?id=${id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (json.success) {
        fetchRekening();
      } else {
        alert(`Gagal: ${json.message}`);
      }
    } catch (error) {
      console.error(error);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-200px)] items-center justify-center">
        <div className="flex flex-col items-center justify-center text-muted-foreground gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
          <p className="text-sm font-medium">Memuat konfigurasi master badal & wakaf...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
          <Settings2 className="h-6 w-6 text-emerald-600" />
          Master Badal Umroh &amp; Wakaf Al-Qur&apos;an
        </h1>
        <p className="text-slate-500 text-sm">
          Kelola referensi harga utama dan konfigurasi rekening bank resmi khusus untuk program Badal Umroh dan Wakaf Al-Qur&apos;an (terpisah dari rekening paket umroh reguler).
        </p>
      </div>

      {/* ════════════════════════════════════════════════════════════════════
          BAGIAN 1: MASTER HARGA LAYANAN
      ════════════════════════════════════════════════════════════════════ */}
      <div className="space-y-4">
        <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <Coins className="h-5 w-5 text-emerald-600" />
          1. Konfigurasi Harga Layanan
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card Harga Badal Umroh */}
          <div className="bg-white border rounded-xl shadow-sm overflow-hidden flex flex-col">
            <div className="p-5 border-b bg-slate-50 flex items-center gap-3">
              <div className="p-2.5 bg-emerald-100 text-emerald-700 rounded-lg">
                <Wallet className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-800">Harga Badal Umroh</h3>
                <p className="text-xs text-slate-500">Konfigurasi harga per 1 (satu) Badal</p>
              </div>
            </div>
            
            <div className="p-6 flex-1 flex flex-col justify-center space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Nominal Harga (Rp)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-medium">Rp</span>
                  <input 
                    type="number"
                    value={prices.BADAL_UMROH}
                    onChange={(e) => setPrices({ ...prices, BADAL_UMROH: Number(e.target.value) })}
                    className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all font-semibold text-slate-900"
                    placeholder="2500000"
                  />
                </div>
                <p className="text-xs text-slate-500 mt-1">Preview Format: <span className="font-semibold text-emerald-700">{formatRupiah(prices.BADAL_UMROH || 0)}</span></p>
              </div>
            </div>
            
            <div className="p-4 bg-slate-50 border-t flex justify-end">
              <button
                disabled={savingPrice}
                onClick={() => handleUpdatePrice("BADAL_UMROH", prices.BADAL_UMROH)}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-all shadow-sm active:scale-95 disabled:opacity-70 disabled:pointer-events-none"
              >
                {savingPrice ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Simpan Harga
              </button>
            </div>
          </div>

          {/* Card Harga Wakaf Quran */}
          <div className="bg-white border rounded-xl shadow-sm overflow-hidden flex flex-col">
            <div className="p-5 border-b bg-slate-50 flex items-center gap-3">
              <div className="p-2.5 bg-indigo-100 text-indigo-700 rounded-lg">
                <Coins className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-800">Harga Wakaf Al-Quran</h3>
                <p className="text-xs text-slate-500">Konfigurasi harga dasar per Mushaf</p>
              </div>
            </div>
            
            <div className="p-6 flex-1 flex flex-col justify-center space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Nominal Harga (Rp)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-medium">Rp</span>
                  <input 
                    type="number"
                    value={prices.WAKAF_QURAN}
                    onChange={(e) => setPrices({ ...prices, WAKAF_QURAN: Number(e.target.value) })}
                    className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-semibold text-slate-900"
                    placeholder="350000"
                  />
                </div>
                <p className="text-xs text-slate-500 mt-1">Preview Format: <span className="font-semibold text-indigo-700">{formatRupiah(prices.WAKAF_QURAN || 0)}</span></p>
              </div>
            </div>
            
            <div className="p-4 bg-slate-50 border-t flex justify-end">
              <button
                disabled={savingPrice}
                onClick={() => handleUpdatePrice("WAKAF_QURAN", prices.WAKAF_QURAN)}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-all shadow-sm active:scale-95 disabled:opacity-70 disabled:pointer-events-none"
              >
                {savingPrice ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Simpan Harga
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════════
          BAGIAN 2: MASTER REKENING RESMI BADAL & WAKAF (SATU KESATUAN)
      ════════════════════════════════════════════════════════════════════ */}
      <div className="space-y-4 pt-4 border-t">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-emerald-600" />
              2. Master Rekening Resmi Badal Umroh &amp; Wakaf Al-Qur&apos;an
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Daftar rekening bank resmi ini digunakan bersama untuk program Badal Umroh dan Wakaf Al-Qur&apos;an (terpisah dari rekening paket umroh reguler).
            </p>
          </div>

          <Button
            size="sm"
            onClick={handleOpenAddRekening}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold gap-1.5 h-9"
          >
            <Plus className="h-4 w-4" /> Tambah Rekening
          </Button>
        </div>

        {/* Info Banner */}
        <div className="p-3.5 bg-blue-50/80 border border-blue-200 rounded-xl text-blue-900 text-xs flex items-start gap-2.5">
          <Info className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
          <p className="text-[11.5px] leading-relaxed">
            Daftar rekening resmi di bawah ini otomatis tampil pada portal pendaftaran <strong>Wakaf Al-Qur&apos;an</strong>, portal pendaftaran <strong>Badal Umroh</strong>, serta halaman tracking jamaah.
          </p>
        </div>

        {/* List of Rekening Cards */}
        {loadingRekening ? (
          <div className="p-8 text-center bg-white border rounded-xl">
            <Loader2 className="h-6 w-6 animate-spin mx-auto text-emerald-600 mb-2" />
            <p className="text-xs text-slate-500">Memuat daftar rekening...</p>
          </div>
        ) : rekeningList.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {rekeningList.map((rek) => (
              <div
                key={rek.id || rek.nomorRekening}
                className="bg-white border rounded-2xl p-5 shadow-xs flex flex-col justify-between space-y-4 hover:border-emerald-500/50 transition-all"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-slate-900 uppercase tracking-wide">
                      {rek.namaBank}
                    </span>
                    <Badge variant={rek.isActive ? "default" : "outline"} className={rek.isActive ? "bg-emerald-600 text-white text-[10px]" : "text-slate-400 text-[10px]"}>
                      {rek.isActive ? "Aktif" : "Nonaktif"}
                    </Badge>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-0.5 font-mono">
                    <div className="text-base font-black text-slate-900 tracking-wider">
                      {rek.nomorRekening}
                    </div>
                    <div className="text-xs font-semibold text-slate-600 font-sans">
                      a.n. {rek.atasNama}
                    </div>
                  </div>

                  {rek.keterangan && (
                    <p className="text-[11px] text-slate-500 italic">
                      {rek.keterangan}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleOpenEditRekening(rek)}
                    className="h-8 px-2.5 text-xs font-bold gap-1 text-slate-700"
                  >
                    <Edit2 className="h-3 w-3" /> Edit
                  </Button>
                  {rek.id && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDeleteRekening(rek.id!, rek.namaBank)}
                      className="h-8 px-2 text-xs text-rose-600 hover:bg-rose-50"
                      title="Hapus Rekening"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center bg-white border rounded-xl text-slate-400 text-xs">
            Belum ada rekening yang dikonfigurasi. Klik tombol <strong>Tambah Rekening</strong> untuk menambahkan rekening resmi.
          </div>
        )}
      </div>

      {/* ── MODAL TAMBAH / EDIT REKENING ── */}
      <Modal
        open={isRekeningModalOpen}
        onClose={() => setIsRekeningModalOpen(false)}
        title={editingRekening ? "Edit Konfigurasi Rekening" : "Tambah Rekening Resmi Badal & Wakaf"}
      >
        <div className="space-y-4 pt-1 text-xs">
          <div className="space-y-1.5">
            <label className="font-bold text-slate-700">Peruntukan Layanan *</label>
            <select
              value={formRekening.tipeLayanan}
              onChange={(e) => setFormRekening({ ...formRekening, tipeLayanan: e.target.value as any })}
              className="w-full h-10 px-3 rounded-xl border border-slate-300 bg-white text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="BADAL_WAKAF">Semua Layanan (Badal Umroh &amp; Wakaf Al-Qur&apos;an)</option>
              <option value="WAKAF_QURAN">Khusus Wakaf Al-Qur&apos;an Saja</option>
              <option value="BADAL_UMROH">Khusus Badal Umroh Saja</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="font-bold text-slate-700">Nama Bank *</label>
            <Input
              value={formRekening.namaBank}
              onChange={(e) => setFormRekening({ ...formRekening, namaBank: e.target.value })}
              placeholder="Contoh: Bank Syariah Indonesia (BSI) / Bank Mandiri / BCA"
              className="text-xs h-10 rounded-xl"
            />
          </div>

          <div className="space-y-1.5">
            <label className="font-bold text-slate-700">Nomor Rekening *</label>
            <Input
              value={formRekening.nomorRekening}
              onChange={(e) => setFormRekening({ ...formRekening, nomorRekening: e.target.value })}
              placeholder="Contoh: 721 888 9991 atau 142 00 9988 7766"
              className="text-xs h-10 rounded-xl font-mono"
            />
          </div>

          <div className="space-y-1.5">
            <label className="font-bold text-slate-700">Atas Nama Pemilik Rekening *</label>
            <Input
              value={formRekening.atasNama}
              onChange={(e) => setFormRekening({ ...formRekening, atasNama: e.target.value })}
              placeholder="Contoh: PT VAUZA TIGA UTAMA"
              className="text-xs h-10 rounded-xl font-semibold"
            />
          </div>

          <div className="space-y-1.5">
            <label className="font-bold text-slate-700">Keterangan / Catatan Tambahan (Opsional)</label>
            <Input
              value={formRekening.keterangan || ""}
              onChange={(e) => setFormRekening({ ...formRekening, keterangan: e.target.value })}
              placeholder="Contoh: Rekening Resmi Operasional Badal & Wakaf"
              className="text-xs h-10 rounded-xl"
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="isActiveRekening"
              checked={formRekening.isActive}
              onChange={(e) => setFormRekening({ ...formRekening, isActive: e.target.checked })}
              className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
            />
            <label htmlFor="isActiveRekening" className="font-bold text-slate-700 cursor-pointer">
              Tampilkan Rekening Ini di Portal Pendaftaran (Status Aktif)
            </label>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsRekeningModalOpen(false)}
              disabled={savingRekening}
            >
              Batal
            </Button>
            <Button
              type="button"
              onClick={handleSaveRekening}
              disabled={savingRekening}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-1.5"
            >
              {savingRekening ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Menyimpan...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" /> Simpan Rekening
                </>
              )}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}


