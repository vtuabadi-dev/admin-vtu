"use client";

import { useState, useEffect } from "react";
import { Card } from "@/shared/components/ui/Card";
import { Badge } from "@/shared/components/ui/Badge";
import { Button } from "@/shared/components/ui/Button";
import { Modal } from "@/shared/components/ui/Modal";
import { Input } from "@/shared/components/ui/Input";
import { HeartHandshake, Phone, Trash2, Edit, CheckCircle2, Search, ExternalLink, Layers, CreditCard } from "lucide-react";

export default function AdminBadalUmrohPage() {
  const [activeTab, setActiveTab] = useState<"daftar" | "validasi" | "laporan">("daftar");
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Edit Modal State
  const [editItem, setEditItem] = useState<any | null>(null);
  const [editStatus, setEditStatus] = useState("Pending");
  const [editPaymentStatus, setEditPaymentStatus] = useState("Belum Bayar");
  const [sertifikatUrl, setSertifikatUrl] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [saving, setSaving] = useState(false);

  // Laporan Paket State
  const [searchPaket, setSearchPaket] = useState("");
  const [laporanBadal, setLaporanBadal] = useState<any[]>([]);
  const [laporanWakaf, setLaporanWakaf] = useState<any[]>([]);
  const [loadingLaporan, setLoadingLaporan] = useState(false);

  const fetchList = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/badal-umroh?status=${statusFilter}`);
      const resJson = await res.json();
      if (resJson.success) {
        setList(resJson.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchLaporan = async () => {
    try {
      setLoadingLaporan(true);
      const res = await fetch(`/api/admin/laporan-paket?namaPaket=${encodeURIComponent(searchPaket || "ALL")}`);
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

  useEffect(() => {
    fetchList();
  }, [statusFilter]);

  useEffect(() => {
    if (activeTab === "laporan") {
      fetchLaporan();
    }
  }, [activeTab, searchPaket]);

  const handleSave = async () => {
    if (!editItem) return;
    try {
      setSaving(true);
      const res = await fetch(`/api/badal-umroh/${editItem.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: editStatus,
          paymentStatus: editPaymentStatus,
          sertifikatUrl,
          videoUrl,
        }),
      });
      const resJson = await res.json();
      if (resJson.success) {
        setEditItem(null);
        fetchList();
      } else {
        alert(`Gagal: ${resJson.message}`);
      }
    } catch (err) {
      console.error(err);
      alert("Terjadi kesalahan saat menyimpan perubahan.");
    } finally {
      setSaving(false);
    }
  };

  const handleApprovePayment = async (id: string) => {
    try {
      setSaving(true);
      const res = await fetch(`/api/badal-umroh/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentStatus: "Lunas" }),
      });
      const resJson = await res.json();
      if (resJson.success) {
        alert("Pembayaran berhasil dikonfirmasi Lunas! Data berpindah ke daftar terkonfirmasi.");
        fetchList();
      } else {
        alert(`Gagal: ${resJson.message}`);
      }
    } catch (err) {
      console.error(err);
      alert("Gagal mengonfirmasi pembayaran.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, nama: string) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus pendaftaran Badal Umroh atas nama: ${nama}?`)) return;
    try {
      const res = await fetch(`/api/badal-umroh/${id}`, { method: "DELETE" });
      const resJson = await res.json();
      if (resJson.success) {
        fetchList();
      } else {
        alert(`Gagal menghapus: ${resJson.message}`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const validasiList = list.filter((item) => item.paymentStatus === "Menunggu Konfirmasi" || item.paymentStatus === "Belum Bayar");

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <HeartHandshake className="h-6 w-6 text-emerald-600" />
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Manajemen Badal Umroh & Wakaf
            </h1>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Kelola pendaftaran Badal Umroh, validasi bukti transfer, & laporan rekapitulasi niat per paket umroh.
          </p>
        </div>

        <div className="flex items-center gap-2 border bg-muted/30 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab("daftar")}
            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${
              activeTab === "daftar" ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            📋 Daftar Terdaftar ({list.length})
          </button>
          <button
            onClick={() => setActiveTab("validasi")}
            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors relative ${
              activeTab === "validasi" ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            💳 Validasi Pembayaran ({validasiList.length})
            {validasiList.length > 0 && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-rose-500 rounded-full animate-ping" />
            )}
          </button>
          <button
            onClick={() => setActiveTab("laporan")}
            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${
              activeTab === "laporan" ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            📊 Laporan Paket (Rekap Niat)
          </button>
        </div>
      </div>

      {/* ── TAB 1: DAFTAR UTAMA BADAL UMROH ── */}
      {activeTab === "daftar" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-card p-4 rounded-lg border">
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold">Filter Status Pengerjaan:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-8 px-2.5 text-xs rounded-md border border-input bg-background focus:ring-1 focus:ring-primary"
              >
                <option value="ALL">Semua Status</option>
                <option value="Pending">Pending</option>
                <option value="Diproses">Diproses</option>
                <option value="Selesai">Selesai</option>
                <option value="Dibatalkan">Dibatalkan</option>
              </select>
            </div>
            <Button size="sm" onClick={fetchList} disabled={loading} variant="outline">
              Refresh
            </Button>
          </div>

          <Card className="border border-border shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted text-muted-foreground uppercase text-[11px] font-semibold border-b">
                  <tr>
                    <th className="px-4 py-3">Tanggal</th>
                    <th className="px-4 py-3">Almarhum / Almarhumah</th>
                    <th className="px-4 py-3">Pemohon & Klaster Jamaah</th>
                    <th className="px-4 py-3">Paket Badal & Status Bayar</th>
                    <th className="px-4 py-3">Status Execution</th>
                    <th className="px-4 py-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {loading ? (
                    <tr><td colSpan={6} className="px-4 py-8 text-center">Memuat data...</td></tr>
                  ) : list.length > 0 ? (
                    list.map((item) => (
                      <tr key={item.id} className="hover:bg-muted/40 transition-colors">
                        <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                          {new Date(item.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                        </td>
                        <td className="px-4 py-3 font-bold text-foreground">
                          <div className="flex flex-col">
                            <span className="text-emerald-700 dark:text-emerald-400">{item.namaAlmarhum}</span>
                            <span className="text-[11px] font-normal text-muted-foreground">
                              {item.jenisKelamin === "L" ? "Almarhum (Laki-laki)" : "Almarhumah (Perempuan)"} — {item.hubungan}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col gap-0.5">
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold">{item.namaPeserta || item.namaPemohon}</span>
                              {item.isJamaahVauza ? (
                                <Badge className="bg-emerald-600 text-white text-[10px] px-1.5 py-0">Jamaah VTU</Badge>
                              ) : (
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0">Umum</Badge>
                              )}
                            </div>
                            {item.isJamaahVauza && item.namaPaketUmroh && (
                              <span className="text-[11px] font-medium text-emerald-700 dark:text-emerald-300">
                                {item.namaPaketUmroh} (TL: {item.namaTourLeader || "-"} / Muthowif: {item.namaMuthowif || "-"})
                              </span>
                            )}
                            <a
                              href={`https://wa.me/${item.nomorWhatsapp.replace(/[^0-9]/g, "")}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-emerald-600 hover:underline flex items-center gap-1 text-[11px] pt-0.5"
                            >
                              <Phone className="h-3 w-3" /> {item.nomorWhatsapp}
                            </a>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col gap-1">
                            <span className="font-semibold">{item.paketBadal}</span>
                            <Badge className={
                              item.paymentStatus === "Lunas" ? "bg-emerald-600 text-white w-fit text-[10px]" :
                              item.paymentStatus === "Menunggu Konfirmasi" ? "bg-amber-500 text-white w-fit text-[10px]" : "bg-rose-600 text-white w-fit text-[10px]"
                            }>
                              Bayar: {item.paymentStatus || "Belum Bayar"}
                            </Badge>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="outline">{item.status}</Badge>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setEditItem(item);
                                setEditStatus(item.status);
                                setEditPaymentStatus(item.paymentStatus || "Belum Bayar");
                                setSertifikatUrl(item.sertifikatUrl || "");
                                setVideoUrl(item.videoUrl || "");
                              }}
                              className="h-8 px-2"
                            >
                              <Edit className="h-3.5 w-3.5" /> Edit Status / Link
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDelete(item.id, item.namaAlmarhum)}
                              className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Belum ada data pendaftaran.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* ── TAB 2: VALIDASI PEMBAYARAN ── */}
      {activeTab === "validasi" && (
        <div className="space-y-4">
          <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 rounded-lg text-xs space-y-1">
            <p className="font-bold text-amber-900 dark:text-amber-100 flex items-center gap-1.5">
              <CreditCard className="h-4 w-4 text-amber-600" /> Kolom Validasi Pembayaran Masuk
            </p>
            <p className="text-amber-800 dark:text-amber-200">
              Setiap pendaftaran baru atau upload bukti bayar akan masuk ke antrian ini. Begitu dikonfirmasi &quot;Lunas&quot; oleh admin, data otomatis hilang dari antrian validasi dan masuk ke Laporan Resmi Terkonfirmasi.
            </p>
          </div>

          <Card className="border border-border shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted text-muted-foreground uppercase text-[11px] font-semibold border-b">
                  <tr>
                    <th className="px-4 py-3">Tanggal Upload</th>
                    <th className="px-4 py-3">Nama Pemohon & WhatsApp</th>
                    <th className="px-4 py-3">Jenis Pendaftaran & Niat/Almarhum</th>
                    <th className="px-4 py-3">Bukti Pembayaran</th>
                    <th className="px-4 py-3 text-right">Tindakan Validasi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {validasiList.length > 0 ? (
                    validasiList.map((item) => (
                      <tr key={item.id} className="hover:bg-muted/40 transition-colors">
                        <td className="px-4 py-3 whitespace-nowrap font-medium text-muted-foreground">
                          {new Date(item.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                        </td>
                        <td className="px-4 py-3 font-semibold">
                          <div>
                            <span>{item.namaPeserta || item.namaPemohon}</span>
                            <p className="text-[11px] font-normal text-muted-foreground">{item.nomorWhatsapp}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col">
                            <span className="font-bold text-emerald-700 dark:text-emerald-400">{item.namaAlmarhum}</span>
                            <span className="text-[11px] text-muted-foreground">Paket: {item.paketBadal}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {item.buktiBayarUrl ? (
                            <a
                              href={item.buktiBayarUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-emerald-600 font-semibold underline"
                            >
                              <ExternalLink className="h-3.5 w-3.5" /> Lihat Bukti Transfer
                            </a>
                          ) : (
                            <span className="text-rose-600 italic">Belum Mengunggah Struk</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button
                            size="sm"
                            onClick={() => handleApprovePayment(item.id)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs gap-1.5"
                          >
                            <CheckCircle2 className="h-4 w-4" /> Konfirmasi Lunas & Pindahkan
                          </Button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                        Tidak ada antrian validasi pembayaran. Seluruh pendaftaran telah terkonfirmasi Lunas.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* ── TAB 3: LAPORAN KOLEKTIF PAKET UMROH ── */}
      {activeTab === "laporan" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card p-4 rounded-lg border">
            <div>
              <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                <Layers className="h-4 w-4 text-emerald-600" /> Rekapitulasi Kolektif Niat Wakaf & Badal Per Paket
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Menampilkan seluruh nama almarhum yang dibadalkan & nama-nama niat wakaf Al-Qur&apos;an secara kolektif (tanpa mencantumkan identitas pewakaf).
              </p>
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                type="text"
                value={searchPaket}
                onChange={(e) => setSearchPaket(e.target.value)}
                placeholder="Cari / Ketik Nama Paket Umroh..."
                className="pl-8 text-xs h-9"
              />
            </div>
          </div>

          {/* Tabel 1: Rekap Niat Badal Umroh */}
          <Card className="border border-border shadow-sm overflow-hidden">
            <div className="p-4 bg-emerald-600 text-white font-bold text-xs flex items-center justify-between">
              <span>🕋 DAFTAR NAMA ALMARHUM / ALMARHUMAH YANG DIBADALKAN</span>
              <Badge variant="outline" className="text-white border-white/40">{laporanBadal.length} Jamaah Badal</Badge>
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
                    <th className="px-4 py-3">Pilihan Paket Badal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {loadingLaporan ? (
                    <tr><td colSpan={6} className="px-4 py-6 text-center">Memuat laporan...</td></tr>
                  ) : laporanBadal.length > 0 ? (
                    laporanBadal.map((item, index) => (
                      <tr key={item.id} className="hover:bg-muted/40">
                        <td className="px-4 py-3 font-semibold text-muted-foreground">{index + 1}</td>
                        <td className="px-4 py-3 font-bold text-emerald-700 dark:text-emerald-400">{item.namaPaketUmroh || "Umum"}</td>
                        <td className="px-4 py-3">TL: {item.namaTourLeader || "-"} / Muthowif: {item.namaMuthowif || "-"}</td>
                        <td className="px-4 py-3 font-bold text-base">{item.namaAlmarhum}</td>
                        <td className="px-4 py-3">{item.jenisKelamin === "L" ? "Almarhum (Laki-laki)" : "Almarhumah (Perempuan)"} ({item.hubungan})</td>
                        <td className="px-4 py-3"><Badge variant="outline">{item.paketBadal}</Badge></td>
                      </tr>
                    ))
                  ) : (
                    <tr><td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">Tidak ada data Badal Umroh pada paket ini.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Tabel 2: Rekap Kolektif Niat Wakaf Al-Qur'an (Tanpa Nama Pewakaf) */}
          <Card className="border border-border shadow-sm overflow-hidden">
            <div className="p-4 bg-sky-600 text-white font-bold text-xs flex items-center justify-between">
              <span>📖 DAFTAR KOLEKTIF NAMA-NAMA YANG DINIATKAN WAKAF AL-QUR&apos;AN (TANPA NAMA PEWAKAF)</span>
              <Badge variant="outline" className="text-white border-white/40">{laporanWakaf.length} Catatan Wakaf</Badge>
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
                  {loadingLaporan ? (
                    <tr><td colSpan={6} className="px-4 py-6 text-center">Memuat laporan...</td></tr>
                  ) : laporanWakaf.length > 0 ? (
                    laporanWakaf.map((item, index) => (
                      <tr key={item.id} className="hover:bg-muted/40">
                        <td className="px-4 py-3 font-semibold text-muted-foreground">{index + 1}</td>
                        <td className="px-4 py-3 font-bold text-sky-700 dark:text-sky-400">{item.namaPaketUmroh || "Umum"}</td>
                        <td className="px-4 py-3">TL: {item.namaTourLeader || "-"} / Muthowif: {item.namaMuthowif || "-"}</td>
                        <td className="px-4 py-3 font-bold text-sm text-foreground">{item.niatAtasNama || "Niat Hamba Allah / Keluarga"}</td>
                        <td className="px-4 py-3"><Badge className="bg-sky-600 text-white">{item.jumlahMushaf} Mushaf</Badge></td>
                        <td className="px-4 py-3 text-muted-foreground">{item.lokasiWakaf}</td>
                      </tr>
                    ))
                  ) : (
                    <tr><td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">Tidak ada data Wakaf Al-Qur&apos;an pada paket ini.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* ── MODAL EDIT STATUS & LINK SERTIFIKAT ── */}
      <Modal open={!!editItem} onClose={() => setEditItem(null)} title="Edit Status Pengerjaan & Link Berkas">
        {editItem && (
          <div className="space-y-4 text-xs">
            <div>
              <p className="font-semibold text-muted-foreground">Almarhum / Almarhumah:</p>
              <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400">{editItem.namaAlmarhum}</p>
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-foreground">Status Pengerjaan</label>
              <select
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value)}
                className="w-full h-9 px-3 rounded-md border border-input bg-background text-xs"
              >
                <option value="Pending">Pending</option>
                <option value="Diproses">Diproses</option>
                <option value="Selesai">Selesai</option>
                <option value="Dibatalkan">Dibatalkan</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-foreground">Status Pembayaran</label>
              <select
                value={editPaymentStatus}
                onChange={(e) => setEditPaymentStatus(e.target.value)}
                className="w-full h-9 px-3 rounded-md border border-input bg-background text-xs"
              >
                <option value="Belum Bayar">Belum Bayar</option>
                <option value="Menunggu Konfirmasi">Menunggu Konfirmasi</option>
                <option value="Lunas">Lunas</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-foreground">Link Sertifikat (PDF / Gambar)</label>
              <Input
                type="url"
                value={sertifikatUrl}
                onChange={(e) => setSertifikatUrl(e.target.value)}
                placeholder="https://cloud.com/sertifikat.pdf"
                className="text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-foreground">Link Video Execution (YouTube / Drive)</label>
              <Input
                type="url"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="https://youtube.com/watch?v=xxx"
                className="text-xs"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button variant="outline" onClick={() => setEditItem(null)}>Batal</Button>
              <Button onClick={handleSave} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                {saving ? "Menyimpan..." : "Simpan Perubahan"}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
