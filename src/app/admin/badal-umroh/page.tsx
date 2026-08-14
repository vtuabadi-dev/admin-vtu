"use client";

import { useState, useEffect, useMemo } from "react";
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
  Search,
  Building2,
  Truck,
  Send,
  Sparkles,
  Clock,
  FileText,
  RefreshCw,
} from "lucide-react";

const DEFAULT_PETUGAS_BADAL_OPTIONS = [
  "Ust. Ahmad Al-Makki",
  "Ust. Abdullah Al-Faisal",
  "Ust. Ridwan Seychan",
  "Ust. Hamzah Makkah",
  "Ust. Muhammad Zulkarnain",
  "Ust. Farhan Basalamah",
  "Ust. Zaki Mubarok",
];

export default function AdminBadalUmrohPage() {
  const [activeTab, setActiveTab] = useState<"validasi" | "pelaksanaan">("validasi");
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Edit / Pelaksanaan Modal State
  const [editItem, setEditItem] = useState<any | null>(null);
  const [editStatus, setEditStatus] = useState("Pending");
  const [editPaymentStatus, setEditPaymentStatus] = useState("Belum Bayar");
  const [petugasBadal, setPetugasBadal] = useState("");
  const [sertifikatUrl, setSertifikatUrl] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [catatanText, setCatatanText] = useState("");
  const [saving, setSaving] = useState(false);

  // Payment Proof Preview Modal
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const fetchList = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/badal-umroh?status=ALL`, { cache: "no-store" });
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

  const handleQuickUpdatePetugas = async (id: string, newPetugas: string) => {
    try {
      setSaving(true);
      const res = await fetch(`/api/badal-umroh/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ petugasBadal: newPetugas }),
      });
      const resJson = await res.json();
      if (resJson.success) {
        setList((prev) =>
          prev.map((item) =>
            item.id === id ? { ...item, petugasBadal: newPetugas } : item
          )
        );
      } else {
        alert(`Gagal memperbarui pelaksana badal: ${resJson.message}`);
      }
    } catch (err) {
      console.error(err);
      alert("Gagal memperbarui pelaksana badal.");
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    fetchList();
  }, []);

  // Filtered List based on Search & Status
  const filteredList = useMemo(() => {
    return list.filter((item) => {
      const q = searchQuery.toLowerCase();
      const matchSearch =
        !q ||
        (item.namaPemohon || "").toLowerCase().includes(q) ||
        (item.namaAlmarhum || "").toLowerCase().includes(q) ||
        (item.nomorWhatsapp || "").includes(q) ||
        (item.namaPaketUmroh || "").toLowerCase().includes(q) ||
        (item.petugasBadal || "").toLowerCase().includes(q);

      const matchStatus = statusFilter === "ALL" || item.status === statusFilter;

      return matchSearch && matchStatus;
    });
  }, [list, searchQuery, statusFilter]);

  // Validasi queue = belum lunas
  const validasiList = useMemo(
    () => filteredList.filter((item) => item.paymentStatus !== "Lunas"),
    [filteredList]
  );

  // Pelaksanaan = sudah lunas
  const pelaksanaanList = useMemo(
    () => filteredList.filter((item) => item.paymentStatus === "Lunas"),
    [filteredList]
  );

  // Stats Counters
  const stats = useMemo(() => {
    return {
      total: list.length,
      needValidation: list.filter((i) => i.paymentStatus !== "Lunas").length,
      inProgress: list.filter((i) => i.paymentStatus === "Lunas" && i.status === "Diproses").length,
      completed: list.filter((i) => i.status === "Selesai").length,
    };
  }, [list]);

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
          catatan: catatanText,
        }),
      });
      const resJson = await res.json();
      if (resJson.success) {
        setEditItem(null);
        setList((prev) =>
          prev.map((item) =>
            item.id === editItem.id
              ? {
                  ...item,
                  status: editStatus,
                  paymentStatus: editPaymentStatus,
                  petugasBadal,
                  sertifikatUrl,
                  videoUrl,
                  catatan: catatanText,
                }
              : item
          )
        );
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
        setList((prev) =>
          prev.map((item) =>
            item.id === id ? { ...item, paymentStatus: "Lunas" } : item
          )
        );
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
        setList((prev) => prev.filter((item) => item.id !== id));
      } else {
        alert(`Gagal menghapus: ${resJson.message}`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b pb-4">
        <div>
          <div className="flex items-center gap-2">
            <HeartHandshake className="h-6 w-6 text-emerald-600" />
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Manajemen Badal Umroh
            </h1>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Kelola pendaftaran, validasi bukti transfer pembayaran, dan penugasan pelaksana Badal Umroh di Makkah.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={fetchList}
            disabled={loading}
            className="h-9 text-xs font-semibold gap-1.5 bg-background shadow-xs hover:bg-muted"
            title="Segarkan Data Badal Umroh"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin text-emerald-600" : ""}`} />
            Segarkan
          </Button>

          <div className="flex items-center gap-2 border bg-muted/30 p-1 rounded-lg">
            <button
              onClick={() => setActiveTab("validasi")}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors relative ${
                activeTab === "validasi"
                  ? "bg-background shadow text-emerald-700 dark:text-emerald-400 font-extrabold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              💳 Validasi Pembayaran ({validasiList.length})
              {stats.needValidation > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-bold">
                  {stats.needValidation}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab("pelaksanaan")}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${
                activeTab === "pelaksanaan"
                  ? "bg-background shadow text-emerald-700 dark:text-emerald-400 font-extrabold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              🕋 Pelaksanaan Badal ({pelaksanaanList.length})
            </button>
          </div>
        </div>
      </div>

      {/* ── STATS CARDS OVERVIEW ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-3.5 border shadow-xs bg-card">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase">Total Pendaftaran</span>
            <ClipboardList className="h-4 w-4 text-slate-500" />
          </div>
          <p className="text-2xl font-black text-foreground mt-1">{stats.total}</p>
        </Card>

        <Card className="p-3.5 border shadow-xs bg-amber-50/50 dark:bg-amber-950/20 border-amber-200">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-amber-800 dark:text-amber-300 uppercase">Perlu Validasi</span>
            <CreditCard className="h-4 w-4 text-amber-600" />
          </div>
          <p className="text-2xl font-black text-amber-900 dark:text-amber-100 mt-1">{stats.needValidation}</p>
        </Card>

        <Card className="p-3.5 border shadow-xs bg-sky-50/50 dark:bg-sky-950/20 border-sky-200">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-sky-800 dark:text-sky-300 uppercase">Sedang Diproses</span>
            <Clock className="h-4 w-4 text-sky-600" />
          </div>
          <p className="text-2xl font-black text-sky-900 dark:text-sky-100 mt-1">{stats.inProgress}</p>
        </Card>

        <Card className="p-3.5 border shadow-xs bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-emerald-800 dark:text-emerald-300 uppercase">Badal Selesai</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-emerald-900 dark:text-emerald-100 mt-1">{stats.completed}</p>
        </Card>
      </div>

      {/* ── SEARCH & FILTER BAR ── */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-muted/20 p-3 rounded-lg border">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari pemohon, WA, almarhum..."
            className="pl-8 text-xs h-9 bg-background"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs text-muted-foreground whitespace-nowrap">Filter Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 px-3 rounded-md border border-input bg-background text-xs font-semibold"
          >
            <option value="ALL">Semua Status Execution</option>
            <option value="Pending">Pending</option>
            <option value="Diproses">Diproses</option>
            <option value="Selesai">Selesai</option>
            <option value="Dibatalkan">Dibatalkan</option>
          </select>
        </div>
      </div>

      {/* ── TAB 1: VALIDASI PEMBAYARAN ── */}
      {activeTab === "validasi" && (
        <div className="space-y-4">
          <div className="p-3.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 rounded-lg text-xs space-y-1">
            <p className="font-bold text-amber-900 dark:text-amber-100 flex items-center gap-1.5">
              <CreditCard className="h-4 w-4 text-amber-600" /> Antrian Validasi Pembayaran Badal Umroh
            </p>
            <p className="text-amber-800 dark:text-amber-200">
              Periksa foto bukti transfer. Setelah dikonfirmasi <strong>Lunas</strong>, data otomatis berpindah ke tab <strong>Pelaksanaan Badal</strong>.
            </p>
          </div>

          <Card className="border border-border shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted text-muted-foreground uppercase text-[11px] font-semibold border-b">
                  <tr>
                    <th className="px-4 py-3">Tanggal</th>
                    <th className="px-4 py-3">Pemohon & Status Jamaah</th>
                    <th className="px-4 py-3">Data Almarhum / Almarhumah</th>
                    <th className="px-4 py-3">Metode Penyerahan</th>
                    <th className="px-4 py-3">Pelaksana Badal</th>
                    <th className="px-4 py-3">Status Bayar</th>
                    <th className="px-4 py-3 text-center">Bukti TF</th>
                    <th className="px-4 py-3 text-right">Tindakan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {loading ? (
                    <tr><td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">Memuat data pendaftaran...</td></tr>
                  ) : validasiList.length > 0 ? (
                    validasiList.map((item) => (
                      <tr key={item.id} className="hover:bg-muted/40 transition-colors">
                        <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                          {new Date(item.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-bold text-foreground">{item.namaPemohon}</div>
                          <a
                            href={`https://wa.me/${item.nomorWhatsapp.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(`Assalamu'alaikum Bpk/Ibu ${item.namaPemohon}, mengenai pendaftaran Badal Umroh atas nama ${item.namaAlmarhum}...`)}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-emerald-600 hover:underline inline-flex items-center gap-1 text-[11px] font-semibold pt-0.5"
                          >
                            <Phone className="h-3 w-3" /> {item.nomorWhatsapp}
                          </a>
                          <div className="pt-1">
                            {item.isJamaahVauza ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-300">
                                <Sparkles className="h-3 w-3" /> Jamaah Vauza {item.namaPaketUmroh ? `(${item.namaPaketUmroh})` : ""}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-full border">
                                Pendaftaran Umum
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-bold text-emerald-700 dark:text-emerald-400 text-xs">{item.namaAlmarhum}</div>
                          <div className="text-[11px] text-muted-foreground">
                            {item.jenisKelamin === "L" ? "Laki-laki (Almarhum)" : "Perempuan (Almarhumah)"}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {item.catatan?.includes("Pengiriman Souvenir: Dikirim") || item.metodeSouvenir === "dikirim" ? (
                            <div className="space-y-0.5">
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-sky-800 bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                                <Truck className="h-3 w-3" /> Dikirim via Ekspedisi
                              </span>
                              <p className="text-[10px] text-muted-foreground truncate max-w-[180px]" title={item.catatan}>
                                {item.catatan}
                              </p>
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                              <Building2 className="h-3 w-3" /> Diambil di Kantor VTU
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <select
                            value={item.petugasBadal || ""}
                            onChange={(e) => handleQuickUpdatePetugas(item.id, e.target.value)}
                            disabled={saving}
                            className="h-8 px-2 rounded-md border border-emerald-300 bg-emerald-50/50 text-emerald-950 text-xs font-semibold focus:ring-1 focus:ring-emerald-500"
                            title="Pilih Pelaksana Badal"
                          >
                            <option value="">-- Pilih Pelaksana --</option>
                            {DEFAULT_PETUGAS_BADAL_OPTIONS.map((p) => (
                              <option key={p} value={p}>{p}</option>
                            ))}
                            {item.petugasBadal && !DEFAULT_PETUGAS_BADAL_OPTIONS.includes(item.petugasBadal) && (
                              <option value={item.petugasBadal}>{item.petugasBadal}</option>
                            )}
                          </select>
                        </td>
                        <td className="px-4 py-3">
                          <Badge className={
                            item.paymentStatus === "Menunggu Konfirmasi"
                              ? "bg-amber-500 text-white text-[10px] font-bold"
                              : "bg-rose-600 text-white text-[10px] font-bold"
                          }>
                            {item.paymentStatus || "Belum Bayar"}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {item.buktiBayarUrl ? (
                            <button
                              onClick={() => setPreviewUrl(item.buktiBayarUrl)}
                              className="p-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded-full transition-all transform hover:scale-110 shadow-xs inline-flex items-center justify-center"
                              title="Klik untuk melihat gambar Bukti Transfer"
                            >
                              <Eye className="h-4 w-4 text-emerald-700" />
                            </button>
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
                              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-1.5 h-8"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" /> Konfirmasi Lunas
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDelete(item.id, item.namaAlmarhum)}
                              className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10"
                              title="Hapus Order"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8} className="px-4 py-10 text-center text-muted-foreground">
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

      {/* ── TAB 2: PELAKSANAAN BADAL ── */}
      {activeTab === "pelaksanaan" && (
        <div className="space-y-4">
          <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 rounded-lg text-xs space-y-1">
            <p className="font-bold text-emerald-900 dark:text-emerald-100 flex items-center gap-1.5">
              <UserCheck className="h-4 w-4 text-emerald-600" /> Tab Pelaksanaan Badal Umroh (Pembayaran Lunas)
            </p>
            <p className="text-emerald-800 dark:text-emerald-200">
              Admin dapat menentukan **Petugas Pelaksana Badal**, memperbarui status pelaksanaan di Makkah, serta menambahkan link **Sertifikat** & **Video Execution**.
            </p>
          </div>

          <Card className="border border-border shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted text-muted-foreground uppercase text-[11px] font-semibold border-b">
                  <tr>
                    <th className="px-4 py-3">Tanggal</th>
                    <th className="px-4 py-3">Almarhum / Almarhumah</th>
                    <th className="px-4 py-3">Pemohon & WA</th>
                    <th className="px-4 py-3">Metode Penyerahan</th>
                    <th className="px-4 py-3">Pelaksana Badal</th>
                    <th className="px-4 py-3">Status Execution</th>
                    <th className="px-4 py-3">Dokumen Execution</th>
                    <th className="px-4 py-3 text-right">Tindakan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {loading ? (
                    <tr><td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">Memuat data pelaksanaan...</td></tr>
                  ) : pelaksanaanList.length > 0 ? (
                    pelaksanaanList.map((item) => (
                      <tr key={item.id} className="hover:bg-muted/40 transition-colors">
                        <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                          {new Date(item.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-bold text-emerald-700 dark:text-emerald-400 text-sm">{item.namaAlmarhum}</div>
                          <div className="text-[11px] text-muted-foreground">
                            {item.jenisKelamin === "L" ? "Laki-laki (Almarhum)" : "Perempuan (Almarhumah)"}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-foreground">{item.namaPemohon}</div>
                          <a
                            href={`https://wa.me/${item.nomorWhatsapp.replace(/[^0-9]/g, "")}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-emerald-600 hover:underline inline-flex items-center gap-1 text-[11px] font-semibold"
                          >
                            <Phone className="h-3 w-3" /> {item.nomorWhatsapp}
                          </a>
                        </td>
                        <td className="px-4 py-3">
                          {item.catatan?.includes("Pengiriman Souvenir: Dikirim") || item.metodeSouvenir === "dikirim" ? (
                            <div className="space-y-0.5">
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-sky-800 bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                                <Truck className="h-3 w-3" /> Dikirim via Ekspedisi
                              </span>
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                              <Building2 className="h-3 w-3" /> Diambil di Kantor VTU
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <select
                            value={item.petugasBadal || ""}
                            onChange={(e) => handleQuickUpdatePetugas(item.id, e.target.value)}
                            disabled={saving}
                            className="h-8 px-2 rounded-md border border-emerald-300 bg-emerald-50/50 text-emerald-950 text-xs font-semibold focus:ring-1 focus:ring-emerald-500"
                            title="Pilih Pelaksana Badal"
                          >
                            <option value="">-- Pilih Pelaksana --</option>
                            {DEFAULT_PETUGAS_BADAL_OPTIONS.map((p) => (
                              <option key={p} value={p}>{p}</option>
                            ))}
                            {item.petugasBadal && !DEFAULT_PETUGAS_BADAL_OPTIONS.includes(item.petugasBadal) && (
                              <option value={item.petugasBadal}>{item.petugasBadal}</option>
                            )}
                          </select>
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            className={
                              item.status === "Selesai"
                                ? "bg-emerald-600 text-white font-bold"
                                : item.status === "Diproses"
                                ? "bg-sky-600 text-white font-bold"
                                : "bg-slate-200 text-slate-800 font-bold"
                            }
                          >
                            {item.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col gap-1">
                            {item.sertifikatUrl ? (
                              <a
                                href={item.sertifikatUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-emerald-700 font-semibold hover:underline inline-flex items-center gap-1 text-[11px]"
                              >
                                <FileText className="h-3.5 w-3.5 text-emerald-600" /> Sertifikat Ready
                              </a>
                            ) : (
                              <span className="text-muted-foreground text-[10px] italic">Sertifikat: Belum</span>
                            )}

                            {item.videoUrl ? (
                              <a
                                href={item.videoUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-sky-700 font-semibold hover:underline inline-flex items-center gap-1 text-[11px]"
                              >
                                <ExternalLink className="h-3.5 w-3.5 text-sky-600" /> Video Ready
                              </a>
                            ) : (
                              <span className="text-muted-foreground text-[10px] italic">Video: Belum</span>
                            )}
                          </div>
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
                                setCatatanText(item.catatan || "");
                              }}
                              className="h-8 px-2.5 gap-1.5 font-bold"
                            >
                              <Edit className="h-3.5 w-3.5" /> Kelola
                            </Button>
                            
                            <a
                              href={`https://wa.me/${item.nomorWhatsapp.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(
                                `Assalamu'alaikum Bpk/Ibu ${item.namaPemohon}, berikut kami sampaikan status Badal Umroh atas nama Almarhum/ah: ${item.namaAlmarhum}.\nStatus: ${item.status}\nPetugas: ${item.petugasBadal || "-"}\n${item.sertifikatUrl ? `Sertifikat: ${item.sertifikatUrl}\n` : ""}${item.videoUrl ? `Video Pelaksanaan: ${item.videoUrl}` : ""}`
                              )}`}
                              target="_blank"
                              rel="noreferrer"
                              className="p-2 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 rounded-md transition-colors"
                              title="Kirim Update via WhatsApp"
                            >
                              <Send className="h-3.5 w-3.5" />
                            </a>

                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDelete(item.id, item.namaAlmarhum)}
                              className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10"
                              title="Hapus Order"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">
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

      {/* ── MODAL KELOLA PELAKSANAAN & UPDATE DATA ── */}
      <Modal open={!!editItem} onClose={() => setEditItem(null)} title="Kelola Pelaksanaan Badal Umroh">
        {editItem && (
          <div className="space-y-4 text-xs">
            <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 rounded-lg border border-emerald-200 dark:border-emerald-900 space-y-1">
              <p className="text-[11px] text-emerald-700 font-semibold uppercase">Data Almarhum / Almarhumah</p>
              <p className="text-base font-extrabold text-emerald-950 dark:text-emerald-100">{editItem.namaAlmarhum}</p>
              <p className="text-xs text-emerald-800 dark:text-emerald-300 font-medium">
                Pemohon: {editItem.namaPemohon} ({editItem.nomorWhatsapp})
              </p>
            </div>

            {/* Petugas Badal Dropdown */}
            <div className="space-y-1.5">
              <label className="font-semibold text-foreground flex items-center gap-1.5">
                <UserCheck className="h-4 w-4 text-emerald-600" /> Pilih / Masukkan Petugas Pelaksana Badal (di Makkah)
              </label>
              <select
                value={DEFAULT_PETUGAS_BADAL_OPTIONS.includes(petugasBadal) ? petugasBadal : (petugasBadal ? "CUSTOM" : "")}
                onChange={(e) => {
                  if (e.target.value === "CUSTOM") {
                    setPetugasBadal("");
                  } else {
                    setPetugasBadal(e.target.value);
                  }
                }}
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-xs font-semibold"
              >
                <option value="">-- Pilih Muthowif / Pelaksana Badal --</option>
                {DEFAULT_PETUGAS_BADAL_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
                <option value="CUSTOM">✍ Tulis Nama Kustom...</option>
              </select>

              {(!DEFAULT_PETUGAS_BADAL_OPTIONS.includes(petugasBadal) || petugasBadal === "") && (
                <Input
                  type="text"
                  value={petugasBadal}
                  onChange={(e) => setPetugasBadal(e.target.value)}
                  placeholder="Ketik nama muthowif/petugas pelaksana kustom..."
                  className="text-xs h-10 mt-1"
                />
              )}
            </div>

            {/* Status Execution & Payment Status */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="font-semibold text-foreground">Status Pelaksanaan Execution</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-xs font-semibold"
                >
                  <option value="Pending">Pending</option>
                  <option value="Diproses">Diproses (Sedang Dijalankan)</option>
                  <option value="Selesai">Selesai (Sudah Dilaksanakan)</option>
                  <option value="Dibatalkan">Dibatalkan</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-foreground">Status Pembayaran</label>
                <select
                  value={editPaymentStatus}
                  onChange={(e) => setEditPaymentStatus(e.target.value)}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-xs font-semibold"
                >
                  <option value="Belum Bayar">Belum Bayar</option>
                  <option value="Menunggu Konfirmasi">Menunggu Konfirmasi</option>
                  <option value="Lunas">Lunas</option>
                </select>
              </div>
            </div>



            {/* Catatan Tambahan */}
            <div className="space-y-1.5">
              <label className="font-semibold text-foreground">Catatan / Alamat Metode Penyerahan</label>
              <textarea
                rows={3}
                value={catatanText}
                onChange={(e) => setCatatanText(e.target.value)}
                placeholder="Catatan tambahan atau instruksi metode penyerahan..."
                className="w-full p-2.5 rounded-md border border-input bg-background text-xs"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t">
              <Button variant="outline" onClick={() => setEditItem(null)}>Batal</Button>
              <Button onClick={handleSave} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold">
                {saving ? "Menyimpan Perubahan..." : "Simpan Perubahan Data"}
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
            <div className="flex items-center justify-between border-b pb-2">
              <p className="font-bold text-sm flex items-center gap-2 text-foreground">
                <Eye className="h-4 w-4 text-emerald-600" /> Foto Bukti Transfer Pembayaran
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
                      <p class="text-sm">Tidak dapat menampilkan pratinjau gambar.</p>
                      <a href="${previewUrl}" target="_blank" class="text-emerald-600 font-bold underline text-xs mt-2 inline-block">Buka di Tab Baru</a>
                    </div>`
                  );
                }}
              />
            </div>
            <div className="flex justify-between items-center pt-1">
              <p className="text-[11px] text-muted-foreground">Klik di luar area untuk menutup</p>
              <a
                href={previewUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-emerald-600 font-bold flex items-center gap-1 hover:underline"
              >
                <ExternalLink className="h-3.5 w-3.5" /> Buka Ukuran Penuh
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
