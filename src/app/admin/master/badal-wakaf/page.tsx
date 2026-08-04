"use client";

import { useState, useEffect } from "react";
import { Loader2, Save, Settings2, Wallet, Coins } from "lucide-react";

const formatRupiah = (val: number) => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(val);
};

export default function MasterBadalWakafPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [prices, setPrices] = useState({
    BADAL_UMROH: 2500000,
    WAKAF_QURAN: 350000,
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
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrices();
  }, []);

  const handleUpdate = async (tipeLayanan: string, harga: number) => {
    setSaving(true);
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
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-200px)] items-center justify-center">
        <div className="flex flex-col items-center justify-center text-muted-foreground gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
          <p className="text-sm font-medium">Memuat konfigurasi harga...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
          <Settings2 className="h-6 w-6 text-emerald-600" />
          Master Harga Badal & Wakaf
        </h1>
        <p className="text-slate-500 text-sm">
          Kelola referensi harga utama untuk layanan Badal Umroh dan Wakaf Al-Quran. Harga yang diatur di sini akan langsung berlaku pada portal pendaftaran jamaah.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card Harga Badal Umroh */}
        <div className="bg-white border rounded-xl shadow-sm overflow-hidden flex flex-col">
          <div className="p-5 border-b bg-slate-50 flex items-center gap-3">
            <div className="p-2.5 bg-emerald-100 text-emerald-700 rounded-lg">
              <Wallet className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-semibold text-slate-800">Harga Badal Umroh</h2>
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
              disabled={saving}
              onClick={() => handleUpdate("BADAL_UMROH", prices.BADAL_UMROH)}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-all shadow-sm active:scale-95 disabled:opacity-70 disabled:pointer-events-none"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
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
              <h2 className="font-semibold text-slate-800">Harga Wakaf Al-Quran</h2>
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
              disabled={saving}
              onClick={() => handleUpdate("WAKAF_QURAN", prices.WAKAF_QURAN)}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-all shadow-sm active:scale-95 disabled:opacity-70 disabled:pointer-events-none"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Simpan Harga
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
