"use client";

import { useState, useEffect } from "react";
import { Card } from "@/shared/components/ui/Card";
import { Badge } from "@/shared/components/ui/Badge";
import { Button } from "@/shared/components/ui/Button";
import { Modal } from "@/shared/components/ui/Modal";
import { Input } from "@/shared/components/ui/Input";
import { BookOpen, Phone, Trash2, Edit } from "lucide-react";

export default function AdminWakafQuranPage() {
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Edit Modal State
  const [editItem, setEditItem] = useState<any | null>(null);
  const [editStatus, setEditStatus] = useState("Pending");
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Disalurkan":
      case "Selesai":
        return <Badge className="bg-sky-500 text-white">Disalurkan</Badge>;
      case "Diproses":
        return <Badge className="bg-blue-500 text-white">Diproses</Badge>;
      case "Dibatalkan":
        return <Badge variant="destructive">Dibatalkan</Badge>;
      default:
        return <Badge variant="outline" className="border-amber-500 text-amber-600 bg-amber-50">Pending</Badge>;
    }
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-sky-600" />
            Manajemen Wakaf Al-Qur&apos;an
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Kelola pendaftaran Wakaf Mushaf Qur&apos;an dari portal online, update penyaluran di Makkah/Madinah, dan dokumentasi foto.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 px-3 py-1 text-xs rounded-md border border-input bg-background"
          >
            <option value="ALL">Semua Status</option>
            <option value="Pending">Pending</option>
            <option value="Diproses">Diproses</option>
            <option value="Disalurkan">Disalurkan</option>
            <option value="Dibatalkan">Dibatalkan</option>
          </select>
          <Button size="sm" onClick={fetchList} disabled={loading} variant="outline">
            Refresh
          </Button>
        </div>
      </div>

      <Card className="border border-border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-muted text-muted-foreground uppercase text-[11px] font-semibold border-b">
              <tr>
                <th className="px-4 py-3">Tanggal</th>
                <th className="px-4 py-3">Pewakaf & Niat</th>
                <th className="px-4 py-3">Jumlah & Lokasi</th>
                <th className="px-4 py-3">Kontak WA</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                    Memuat data Wakaf Qur&apos;an...
                  </td>
                </tr>
              ) : list.length > 0 ? (
                list.map((item) => (
                  <tr key={item.id} className="hover:bg-muted/40 transition-colors">
                    <td className="px-4 py-3 font-medium whitespace-nowrap text-muted-foreground">
                      {new Date(item.createdAt).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-4 py-3 font-bold text-foreground">
                      <div className="flex flex-col">
                        <span className="text-sm text-sky-700 dark:text-sky-400">{item.namaPewakaf}</span>
                        {item.niatAtasNama && (
                          <span className="text-[11px] font-normal text-muted-foreground">
                            Niat Atas Nama: {item.niatAtasNama}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="font-bold text-sky-600">{item.jumlahMushaf} Mushaf</span>
                        <span className="text-[11px] text-muted-foreground">{item.lokasiWakaf}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <a
                        href={`https://wa.me/${item.nomorWhatsapp.replace(/[^0-9]/g, "")}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sky-600 hover:underline flex items-center gap-1 font-semibold"
                      >
                        <Phone className="h-3 w-3" /> {item.nomorWhatsapp}
                      </a>
                    </td>
                    <td className="px-4 py-3">{getStatusBadge(item.status)}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 px-2 text-[11px] gap-1"
                          onClick={() => {
                            setEditItem(item);
                            setEditStatus(item.status);
                            setFotoPenyerahanUrl(item.fotoPenyerahanUrl || "");
                          }}
                        >
                          <Edit className="h-3 w-3" /> Edit / Update
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10"
                          onClick={() => handleDelete(item.id, item.namaPewakaf)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                    Belum ada data pendaftaran Wakaf Qur&apos;an.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Edit Modal */}
      {editItem && (
        <Modal
          open={!!editItem}
          onClose={() => setEditItem(null)}
          title={`Update Status Wakaf Qur'an — ${editItem.namaPewakaf}`}
          description="Ubah status penyaluran dan masukkan tautan foto dokumentasi penyerahan mushaf."
        >
          <div className="space-y-4 mt-3 text-xs">
            <div className="space-y-1">
              <label className="font-semibold text-foreground">Status Penyaluran</label>
              <select
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value)}
                className="w-full h-9 px-3 rounded-md border border-input bg-background text-xs"
              >
                <option value="Pending">Pending (Menunggu Pembayaran / Pengadaan)</option>
                <option value="Diproses">Diproses (Pengadaan Mushaf / Persiapan Serah Terima)</option>
                <option value="Disalurkan">Disalurkan (Telah Diserahkan di Makkah / Madinah)</option>
                <option value="Dibatalkan">Dibatalkan</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-foreground">Link / URL Foto Dokumen Penyerahan (Google Drive / Foto)</label>
              <Input
                type="text"
                value={fotoPenyerahanUrl}
                onChange={(e) => setFotoPenyerahanUrl(e.target.value)}
                placeholder="https://drive.google.com/file/d/..."
                className="text-xs"
              />
            </div>

            <div className="pt-3 border-t flex justify-end gap-2">
              <Button variant="outline" type="button" onClick={() => setEditItem(null)} disabled={saving}>
                Batal
              </Button>
              <Button onClick={handleSave} disabled={saving} className="bg-sky-600 hover:bg-sky-700 text-white">
                {saving ? "Simpan Perubahan..." : "Simpan Perubahan"}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
