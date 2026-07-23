"use client";

import { useState, useEffect } from "react";
import { Card } from "@/shared/components/ui/Card";
import { Badge } from "@/shared/components/ui/Badge";
import { Button } from "@/shared/components/ui/Button";
import { Modal } from "@/shared/components/ui/Modal";
import { Input } from "@/shared/components/ui/Input";
import { BookOpen, Phone, Trash2, Edit, CheckCircle2, CreditCard, ExternalLink } from "lucide-react";

export default function AdminWakafQuranPage() {
  const [activeTab, setActiveTab] = useState<"daftar" | "validasi">("daftar");
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Edit Modal State
  const [editItem, setEditItem] = useState<any | null>(null);
  const [editStatus, setEditStatus] = useState("Pending");
  const [editPaymentStatus, setEditPaymentStatus] = useState("Belum Bayar");
  const [fotoPenyerahanUrl, setFotoPenyerahanUrl] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchList = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/wakaf-quran?status=${statusFilter}`);
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

  useEffect(() => {
    fetchList();
  }, [statusFilter]);

  const handleSave = async () => {
    if (!editItem) return;
    try {
      setSaving(true);
      const res = await fetch(`/api/wakaf-quran/${editItem.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: editStatus,
          paymentStatus: editPaymentStatus,
          fotoPenyerahanUrl,
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
      const res = await fetch(`/api/wakaf-quran/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentStatus: "Lunas" }),
      });
      const resJson = await res.json();
      if (resJson.success) {
        alert("Pembayaran Wakaf berhasil dikonfirmasi Lunas! Data berpindah ke daftar terkonfirmasi.");
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
    if (!confirm(`Apakah Anda yakin ingin menghapus pendaftaran Wakaf Qur'an atas nama: ${nama}?`)) return;
    try {
      const res = await fetch(`/api/wakaf-quran/${id}`, { method: "DELETE" });
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
            <BookOpen className="h-6 w-6 text-sky-600" />
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Manajemen Wakaf Al-Qur&apos;an
            </h1>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Kelola pendaftaran wakaf mushaf Al-Qur&apos;an di Makkah/Madinah & validasi bukti pembayaran.
          </p>
        </div>

        <div className="flex items-center gap-2 border bg-muted/30 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab("daftar")}
            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${
              activeTab === "daftar" ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            📖 Daftar Wakaf ({list.length})
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
        </div>
      </div>

      {/* ── TAB 1: DAFTAR WAKAF ── */}
      {activeTab === "daftar" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-card p-4 rounded-lg border">
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold">Filter Status Penyaluran:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-8 px-2.5 text-xs rounded-md border border-input bg-background focus:ring-1 focus:ring-primary"
              >
                <option value="ALL">Semua Status</option>
                <option value="Pending">Pending</option>
                <option value="Diproses">Diproses</option>
                <option value="Disalurkan">Disalurkan</option>
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
                    <th className="px-4 py-3">Pewakaf & Klaster Jamaah</th>
                    <th className="px-4 py-3">Niat Atas Nama</th>
                    <th className="px-4 py-3">Jumlah & Status Bayar</th>
                    <th className="px-4 py-3">Status Penyaluran</th>
                    <th className="px-4 py-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {loading ? (
                    <tr><td colSpan={6} className="px-4 py-8 text-center">Memuat data Wakaf Qur&apos;an...</td></tr>
                  ) : list.length > 0 ? (
                    list.map((item) => (
                      <tr key={item.id} className="hover:bg-muted/40 transition-colors">
                        <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                          {new Date(item.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                        </td>
                        <td className="px-4 py-3 font-bold text-foreground">
                          <div className="flex flex-col gap-0.5">
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm text-sky-700 dark:text-sky-400">{item.namaPeserta || item.namaPewakaf}</span>
                              {item.isJamaahVauza ? (
                                <Badge className="bg-sky-600 text-white text-[10px] px-1.5 py-0">Jamaah VTU</Badge>
                              ) : (
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0">Umum</Badge>
                              )}
                            </div>
                            {item.isJamaahVauza && item.namaPaketUmroh && (
                              <span className="text-[11px] font-medium text-sky-700 dark:text-sky-300">
                                {item.namaPaketUmroh} (TL: {item.namaTourLeader || "-"} / Muthowif: {item.namaMuthowif || "-"})
                              </span>
                            )}
                            <a
                              href={`https://wa.me/${item.nomorWhatsapp.replace(/[^0-9]/g, "")}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-sky-600 hover:underline flex items-center gap-1 text-[11px] pt-0.5"
                            >
                              <Phone className="h-3 w-3" /> {item.nomorWhatsapp}
                            </a>
                          </div>
                        </td>
                        <td className="px-4 py-3 font-semibold text-foreground">
                          {item.niatAtasNama || "-"}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col gap-1">
                            <span className="font-bold text-sky-600">{item.jumlahMushaf} Mushaf</span>
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
                                setFotoPenyerahanUrl(item.fotoPenyerahanUrl || "");
                              }}
                              className="h-8 px-2"
                            >
                              <Edit className="h-3.5 w-3.5" /> Edit Status / Foto
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDelete(item.id, item.namaPewakaf)}
                              className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Belum ada data Wakaf Qur&apos;an.</td></tr>
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
              <CreditCard className="h-4 w-4 text-amber-600" /> Kolom Validasi Pembayaran Wakaf
            </p>
            <p className="text-amber-800 dark:text-amber-200">
              Pendaftaran Wakaf Qur&apos;an baru & bukti bayar masuk ke antrian ini. Setelah dikonfirmasi Lunas, data otomatis masuk ke Laporan Resmi Terkonfirmasi.
            </p>
          </div>

          <Card className="border border-border shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted text-muted-foreground uppercase text-[11px] font-semibold border-b">
                  <tr>
                    <th className="px-4 py-3">Tanggal Upload</th>
                    <th className="px-4 py-3">Nama Pewakaf & WhatsApp</th>
                    <th className="px-4 py-3">Niat Atas Nama & Jumlah</th>
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
                            <span>{item.namaPeserta || item.namaPewakaf}</span>
                            <p className="text-[11px] font-normal text-muted-foreground">{item.nomorWhatsapp}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col">
                            <span className="font-bold text-sky-700 dark:text-sky-400">{item.jumlahMushaf} Mushaf</span>
                            <span className="text-[11px] text-muted-foreground">Niat: {item.niatAtasNama || "-"}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {item.buktiBayarUrl ? (
                            <a
                              href={item.buktiBayarUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-sky-600 font-semibold underline"
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
                        Tidak ada antrian validasi pembayaran wakaf. Seluruh pendaftaran telah terkonfirmasi Lunas.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* ── MODAL EDIT WAKAF ── */}
      <Modal open={!!editItem} onClose={() => setEditItem(null)} title="Edit Status Wakaf & Foto Penyerahan">
        {editItem && (
          <div className="space-y-4 text-xs">
            <div>
              <p className="font-semibold text-muted-foreground">Pewakaf / Niat:</p>
              <p className="text-sm font-bold text-sky-700 dark:text-sky-400">{editItem.namaPeserta || editItem.namaPewakaf} ({editItem.jumlahMushaf} Mushaf)</p>
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-foreground">Status Penyaluran</label>
              <select
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value)}
                className="w-full h-9 px-3 rounded-md border border-input bg-background text-xs"
              >
                <option value="Pending">Pending</option>
                <option value="Diproses">Diproses</option>
                <option value="Disalurkan">Disalurkan</option>
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
              <label className="font-semibold text-foreground">Link Foto Penyerahan Wakaf</label>
              <Input
                type="url"
                value={fotoPenyerahanUrl}
                onChange={(e) => setFotoPenyerahanUrl(e.target.value)}
                placeholder="https://cloud.com/foto-penyerahan.jpg"
                className="text-xs"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button variant="outline" onClick={() => setEditItem(null)}>Batal</Button>
              <Button onClick={handleSave} disabled={saving} className="bg-sky-600 hover:bg-sky-700 text-white">
                {saving ? "Menyimpan..." : "Simpan Perubahan"}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
