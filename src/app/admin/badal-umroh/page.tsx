"use client";

import { useState, useEffect } from "react";
import { Card } from "@/shared/components/ui/Card";
import { Badge } from "@/shared/components/ui/Badge";
import { Button } from "@/shared/components/ui/Button";
import { Modal } from "@/shared/components/ui/Modal";
import { Input } from "@/shared/components/ui/Input";
import {
  HeartHandshake,
  Phone,
  Trash2,
  Edit,
  CheckCircle2,
  CreditCard,
  ExternalLink,
  Eye,
  X,
  UserCheck,
  ClipboardList,
} from "lucide-react";

export default function AdminBadalUmrohPage() {
  const [activeTab, setActiveTab] = useState<"validasi" | "pelaksanaan">("validasi");
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit / Pelaksanaan Modal State
  const [editItem, setEditItem] = useState<any | null>(null);
  const [editStatus, setEditStatus] = useState("Pending");
  const [editPaymentStatus, setEditPaymentStatus] = useState("Belum Bayar");
  const [petugasBadal, setPetugasBadal] = useState("");
  const [sertifikatUrl, setSertifikatUrl] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [saving, setSaving] = useState(false);

  // Payment Proof Preview Modal
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const fetchList = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/badal-umroh?status=ALL`);
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
          petugasBadal,
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

  // Validasi queue = belum lunas
  const validasiList = list.filter(
    (item) => item.paymentStatus !== "Lunas"
  );
  // Pelaksanaan = sudah lunas
  const pelaksanaanList = list.filter(
    (item) => item.paymentStatus === "Lunas"
  );

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <HeartHandshake className="h-6 w-6 text-emerald-600" />
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Manajemen Badal Umroh
            </h1>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Validasi bukti transfer pembayaran dan tentukan petugas pelaksana pembadalan.
          </p>
        </div>

        <div className="flex items-center gap-2 border bg-muted/30 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab("validasi")}
            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors relative ${
              activeTab === "validasi"
                ? "bg-background shadow text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            💳 Validasi Pembayaran ({validasiList.length})
            {validasiList.length > 0 && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-rose-500 rounded-full animate-ping" />
            )}
          </button>
          <button
            onClick={() => setActiveTab("pelaksanaan")}
            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${
              activeTab === "pelaksanaan"
                ? "bg-background shadow text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            🕋 Pelaksanaan ({pelaksanaanList.length})
          </button>
        </div>
      </div>

      {/* ── TAB 1: VALIDASI PEMBAYARAN ── */}
      {activeTab === "validasi" && (
        <div className="space-y-4">
          <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 rounded-lg text-xs space-y-1">
            <p className="font-bold text-amber-900 dark:text-amber-100 flex items-center gap-1.5">
              <CreditCard className="h-4 w-4 text-amber-600" /> Antrian Validasi Pembayaran Badal Umroh
            </p>
            <p className="text-amber-800 dark:text-amber-200">
              Klik ikon <strong>👁 Mata</strong> untuk melihat foto bukti transfer. Setelah dikonfirmasi &quot;Lunas&quot;, data otomatis berpindah ke tab <strong>Pelaksanaan</strong>.
            </p>
          </div>

          <Card className="border border-border shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted text-muted-foreground uppercase text-[11px] font-semibold border-b">
                  <tr>
                    <th className="px-4 py-3">Tanggal</th>
                    <th className="px-4 py-3">Nama Pemohon & WhatsApp</th>
                    <th className="px-4 py-3">Almarhum / Almarhumah</th>
                    <th className="px-4 py-3">Status Bayar</th>
                    <th className="px-4 py-3 text-center">Bukti TF</th>
                    <th className="px-4 py-3 text-right">Tindakan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {loading ? (
                    <tr><td colSpan={6} className="px-4 py-8 text-center">Memuat data...</td></tr>
                  ) : validasiList.length > 0 ? (
                    validasiList.map((item) => (
                      <tr key={item.id} className="hover:bg-muted/40 transition-colors">
                        <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                          {new Date(item.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-semibold">{item.namaPeserta || item.namaPemohon}</div>
                          <a
                            href={`https://wa.me/${item.nomorWhatsapp.replace(/[^0-9]/g, "")}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-emerald-600 hover:underline flex items-center gap-1 text-[11px] pt-0.5"
                          >
                            <Phone className="h-3 w-3" /> {item.nomorWhatsapp}
                          </a>
                          {item.isJamaahVauza && item.namaPaketUmroh && (
                            <span className="text-[11px] text-emerald-700 dark:text-emerald-300 font-medium">
                              📦 {item.namaPaketUmroh}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-bold text-emerald-700 dark:text-emerald-400">{item.namaAlmarhum}</div>
                          <div className="text-[11px] text-muted-foreground">{item.paketBadal}</div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge className={
                            item.paymentStatus === "Menunggu Konfirmasi"
                              ? "bg-amber-500 text-white text-[10px]"
                              : "bg-rose-600 text-white text-[10px]"
                          }>
                            {item.paymentStatus || "Belum Bayar"}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {item.buktiBayarUrl ? (
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => setPreviewUrl(item.buktiBayarUrl)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-md text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition-colors text-[11px] font-semibold"
                                title="Lihat bukti transfer"
                              >
                                <Eye className="h-3.5 w-3.5" /> Lihat
                              </button>
                              <a
                                href={item.buktiBayarUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-muted-foreground hover:text-foreground"
                                title="Buka di tab baru"
                              >
                                <ExternalLink className="h-3.5 w-3.5" />
                              </a>
                            </div>
                          ) : (
                            <span className="text-rose-500 italic text-[11px]">Belum Upload</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              size="sm"
                              onClick={() => handleApprovePayment(item.id)}
                              disabled={saving}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs gap-1.5 h-8"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" /> Konfirmasi Lunas
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
                    <tr>
                      <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                        <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-emerald-500" />
                        Tidak ada antrian validasi. Seluruh pendaftaran telah terkonfirmasi Lunas.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* ── TAB 2: PELAKSANAAN ── */}
      {activeTab === "pelaksanaan" && (
        <div className="space-y-4">
          <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 rounded-lg text-xs space-y-1">
            <p className="font-bold text-emerald-900 dark:text-emerald-100 flex items-center gap-1.5">
              <UserCheck className="h-4 w-4 text-emerald-600" /> Tab Pelaksanaan — Penentuan Petugas Badal
            </p>
            <p className="text-emerald-800 dark:text-emerald-200">
              Daftar ini menampilkan seluruh pendaftaran Badal Umroh yang pembayarannya telah <strong>Lunas</strong>. Admin dapat menentukan siapa yang menjadi <strong>Petugas Pelaksana Badal</strong>, mengubah status pengerjaan, serta menambahkan link sertifikat & video.
            </p>
          </div>

          <Card className="border border-border shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted text-muted-foreground uppercase text-[11px] font-semibold border-b">
                  <tr>
                    <th className="px-4 py-3">Tanggal</th>
                    <th className="px-4 py-3">Almarhum / Almarhumah</th>
                    <th className="px-4 py-3">Pemohon & Paket</th>
                    <th className="px-4 py-3">Petugas Badal</th>
                    <th className="px-4 py-3">Status Execution</th>
                    <th className="px-4 py-3 text-right">Kelola</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {loading ? (
                    <tr><td colSpan={6} className="px-4 py-8 text-center">Memuat data...</td></tr>
                  ) : pelaksanaanList.length > 0 ? (
                    pelaksanaanList.map((item) => (
                      <tr key={item.id} className="hover:bg-muted/40 transition-colors">
                        <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                          {new Date(item.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-bold text-emerald-700 dark:text-emerald-400 text-sm">{item.namaAlmarhum}</div>
                          <div className="text-[11px] text-muted-foreground">
                            {item.jenisKelamin === "L" ? "Almarhum" : "Almarhumah"} · {item.hubungan}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-semibold">{item.namaPeserta || item.namaPemohon}</div>
                          {item.namaPaketUmroh && (
                            <div className="text-[11px] text-emerald-600 font-medium">{item.namaPaketUmroh}</div>
                          )}
                          <div className="text-[11px] text-muted-foreground">{item.paketBadal}</div>
                        </td>
                        <td className="px-4 py-3">
                          {item.petugasBadal ? (
                            <div className="flex items-center gap-1.5">
                              <UserCheck className="h-3.5 w-3.5 text-emerald-600" />
                              <span className="font-bold text-emerald-700 dark:text-emerald-400">{item.petugasBadal}</span>
                            </div>
                          ) : (
                            <span className="text-rose-500 italic text-[11px]">⚠ Belum ditentukan</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={item.status === "Selesai" ? "default" : "outline"}
                            className={item.status === "Selesai" ? "bg-emerald-600 text-white" : item.status === "Diproses" ? "border-blue-500 text-blue-600" : ""}>
                            {item.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setEditItem(item);
                                setEditStatus(item.status);
                                setEditPaymentStatus(item.paymentStatus || "Lunas");
                                setPetugasBadal(item.petugasBadal || "");
                                setSertifikatUrl(item.sertifikatUrl || "");
                                setVideoUrl(item.videoUrl || "");
                              }}
                              className="h-8 px-2 gap-1.5"
                            >
                              <Edit className="h-3.5 w-3.5" /> Kelola
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
                    <tr>
                      <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                        <ClipboardList className="h-8 w-8 mx-auto mb-2 opacity-40" />
                        Belum ada pendaftaran yang pembayarannya Lunas. Konfirmasi pembayaran terlebih dahulu dari tab Validasi Pembayaran.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* ── MODAL KELOLA PELAKSANAAN ── */}
      <Modal open={!!editItem} onClose={() => setEditItem(null)} title="Kelola Pelaksanaan Badal Umroh">
        {editItem && (
          <div className="space-y-4 text-xs">
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-lg border border-emerald-200 dark:border-emerald-900">
              <p className="text-[11px] text-muted-foreground">Almarhum / Almarhumah</p>
              <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400">{editItem.namaAlmarhum}</p>
              <p className="text-[11px] text-muted-foreground">Pemohon: {editItem.namaPeserta || editItem.namaPemohon} · {editItem.paketBadal}</p>
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-foreground flex items-center gap-1.5">
                <UserCheck className="h-3.5 w-3.5 text-emerald-600" /> Petugas Pelaksana Badal
              </label>
              <Input
                type="text"
                value={petugasBadal}
                onChange={(e) => setPetugasBadal(e.target.value)}
                placeholder="Masukkan nama petugas yang akan membadalkan..."
                className="text-xs"
              />
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
              <label className="font-semibold text-foreground">Link Video Execution</label>
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

      {/* ── MODAL PREVIEW BUKTI PEMBAYARAN ── */}
      {previewUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={() => setPreviewUrl(null)}
        >
          <div
            className="relative bg-background rounded-xl shadow-2xl max-w-lg w-full p-4 space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <p className="font-bold text-sm flex items-center gap-2">
                <Eye className="h-4 w-4 text-emerald-600" /> Bukti Transfer Pembayaran
              </p>
              <button
                onClick={() => setPreviewUrl(null)}
                className="h-7 w-7 flex items-center justify-center rounded-full bg-muted hover:bg-muted/80 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="rounded-lg overflow-hidden border border-border bg-muted/30 flex items-center justify-center min-h-48">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewUrl}
                alt="Bukti Transfer Pembayaran"
                className="max-w-full max-h-[70vh] object-contain rounded-md"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = "none";
                  target.insertAdjacentHTML(
                    "afterend",
                    `<div class="text-center p-8 text-muted-foreground">
                      <p class="text-sm">Tidak dapat menampilkan gambar.</p>
                      <a href="${previewUrl}" target="_blank" class="text-emerald-600 underline text-xs mt-2 inline-block">Buka di tab baru</a>
                    </div>`
                  );
                }}
              />
            </div>
            <div className="flex justify-between items-center pt-1">
              <p className="text-[11px] text-muted-foreground">Klik di luar untuk menutup</p>
              <a
                href={previewUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-emerald-600 font-semibold flex items-center gap-1 hover:underline"
              >
                <ExternalLink className="h-3.5 w-3.5" /> Buka di Tab Baru
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
