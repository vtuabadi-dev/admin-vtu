"use client";

import { useState, useEffect } from "react";
import { Card } from "@/shared/components/ui/Card";
import { Badge } from "@/shared/components/ui/Badge";
import { Input } from "@/shared/components/ui/Input";
import { Layers, Search, BookOpen, HeartHandshake } from "lucide-react";

export default function AdminLaporanPaketPage() {
  const [searchPaket, setSearchPaket] = useState("");
  const [laporanBadal, setLaporanBadal] = useState<any[]>([]);
  const [laporanWakaf, setLaporanWakaf] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchLaporan = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/laporan-paket?namaPaket=${encodeURIComponent(searchPaket || "ALL")}`);
      const resJson = await res.json();
      if (resJson.success) {
        setLaporanBadal(resJson.data.badalList || []);
        setLaporanWakaf(resJson.data.wakafList || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLaporan();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchPaket]);

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Layers className="h-6 w-6 text-emerald-600" />
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Laporan Kolektif Per Paket Umroh
            </h1>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Rekapitulasi seluruh nama almarhum yang dibadalkan & nama-nama niat wakaf Al-Qur&apos;an (tanpa mencantumkan identitas pewakaf).
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center gap-4 bg-card p-4 rounded-lg border">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            value={searchPaket}
            onChange={(e) => setSearchPaket(e.target.value)}
            placeholder="Cari / Ketik Nama Paket Umroh untuk filter..."
            className="pl-9 text-sm"
          />
        </div>
        <p className="text-xs text-muted-foreground">
          {searchPaket ? `Menampilkan data untuk paket: "${searchPaket}"` : "Menampilkan semua paket"}
        </p>
      </div>

      {/* Summary badges */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="p-4 flex items-center gap-4 border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/30">
          <div className="h-10 w-10 rounded-full bg-emerald-600 flex items-center justify-center">
            <HeartHandshake className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">{laporanBadal.length}</p>
            <p className="text-xs text-muted-foreground font-medium">Almarhum/ah Dibadalkan</p>
          </div>
        </Card>
        <Card className="p-4 flex items-center gap-4 border-sky-200 dark:border-sky-900 bg-sky-50 dark:bg-sky-950/30">
          <div className="h-10 w-10 rounded-full bg-sky-600 flex items-center justify-center">
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

      {/* Tabel 1: Rekap Niat Badal Umroh */}
      <Card className="border border-border shadow-sm overflow-hidden">
        <div className="p-4 bg-emerald-600 text-white font-bold text-xs flex items-center justify-between">
          <span className="flex items-center gap-2">
            <HeartHandshake className="h-4 w-4" />
            DAFTAR NAMA ALMARHUM / ALMARHUMAH YANG DIBADALKAN
          </span>
          <Badge variant="outline" className="text-white border-white/40">{laporanBadal.length} Data</Badge>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-muted text-muted-foreground uppercase text-[11px] font-semibold border-b">
              <tr>
                <th className="px-4 py-3">No</th>
                <th className="px-4 py-3">Nama Paket Umroh</th>
                <th className="px-4 py-3">Tour Leader / Muthowif</th>
                <th className="px-4 py-3">Nama Almarhum / Almarhumah</th>
                <th className="px-4 py-3">Jenis Kelamin & Hubungan</th>
                <th className="px-4 py-3">Paket Badal</th>
                <th className="px-4 py-3">Petugas Badal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">Memuat laporan...</td></tr>
              ) : laporanBadal.length > 0 ? (
                laporanBadal.map((item, index) => (
                  <tr key={item.id} className="hover:bg-muted/40">
                    <td className="px-4 py-3 font-semibold text-muted-foreground">{index + 1}</td>
                    <td className="px-4 py-3 font-bold text-emerald-700 dark:text-emerald-400">{item.namaPaketUmroh || "Umum / Non-Jamaah"}</td>
                    <td className="px-4 py-3 text-xs">
                      <div>TL: <span className="font-semibold">{item.namaTourLeader || "-"}</span></div>
                      <div>Muthowif: <span className="font-semibold">{item.namaMuthowif || "-"}</span></div>
                    </td>
                    <td className="px-4 py-3 font-bold text-base text-foreground">{item.namaAlmarhum}</td>
                    <td className="px-4 py-3">
                      {item.jenisKelamin === "L" ? "Almarhum (Laki-laki)" : "Almarhumah (Perempuan)"}
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
                <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">Tidak ada data Badal Umroh pada filter ini.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Tabel 2: Rekap Kolektif Niat Wakaf Al-Qur'an */}
      <Card className="border border-border shadow-sm overflow-hidden">
        <div className="p-4 bg-sky-600 text-white font-bold text-xs flex items-center justify-between">
          <span className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            DAFTAR KOLEKTIF NAMA-NAMA YANG DINIATKAN WAKAF AL-QUR&apos;AN (TANPA NAMA PEWAKAF)
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
                <th className="px-4 py-3">Nama Paket Umroh</th>
                <th className="px-4 py-3">Tour Leader / Muthowif</th>
                <th className="px-4 py-3">Daftar Nama-Nama Yang Diniatkan Wakaf</th>
                <th className="px-4 py-3">Jumlah Mushaf</th>
                <th className="px-4 py-3">Lokasi Penyaluran</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr><td colSpan={6} className="px-4 py-6 text-center">Memuat laporan...</td></tr>
              ) : laporanWakaf.length > 0 ? (
                laporanWakaf.map((item, index) => (
                  <tr key={item.id} className="hover:bg-muted/40">
                    <td className="px-4 py-3 font-semibold text-muted-foreground">{index + 1}</td>
                    <td className="px-4 py-3 font-bold text-sky-700 dark:text-sky-400">{item.namaPaketUmroh || "Umum / Non-Jamaah"}</td>
                    <td className="px-4 py-3 text-xs">
                      <div>TL: <span className="font-semibold">{item.namaTourLeader || "-"}</span></div>
                      <div>Muthowif: <span className="font-semibold">{item.namaMuthowif || "-"}</span></div>
                    </td>
                    <td className="px-4 py-3 font-bold text-sm text-foreground">{item.niatAtasNama || "Niat Hamba Allah / Keluarga"}</td>
                    <td className="px-4 py-3"><Badge className="bg-sky-600 text-white">{item.jumlahMushaf} Mushaf</Badge></td>
                    <td className="px-4 py-3 text-muted-foreground">{item.lokasiWakaf}</td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">Tidak ada data Wakaf Al-Qur&apos;an pada filter ini.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
