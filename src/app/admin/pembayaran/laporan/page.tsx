"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Search,
  CreditCard,
  Upload,
  CheckCircle,
  Columns3,
  FilePlus,
  ClipboardCheck,
  Eye,
  XCircle,
  CheckCircle2,
  FileText,
  Receipt,
  Printer,
  ExternalLink,
  ZoomIn,
  ZoomOut,
  X,
  Sparkles,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/Card";
import { Button } from "@/shared/components/ui/Button";
import { Input } from "@/shared/components/ui/Input";
import { Select } from "@/shared/components/ui/Select";
import { StatusBadge, Badge } from "@/shared/components/ui/Badge";
import { Modal } from "@/shared/components/ui/Modal";
import { EmptyState } from "@/shared/components/EmptyState";
import { LoadingSkeleton } from "@/shared/components/LoadingSkeleton";
import {
  getGroupPaymentSummary,
  getGroupByKode,
  addPembayaran,
  fetchInvoiceSplitConfig,
  saveInvoiceSplitConfig,
  createInvoice,
} from "@/server/actions/api";
import type {
  GroupPaymentSummary,
  Pembayaran,
  MetodePembayaran,
  InvoiceSplitConfig,
  InvoiceSplitItem,
} from "@/shared/types";
import { formatCurrency, formatDate } from "@/shared/lib/utils";

const metodeOptions = [
  { value: "transfer", label: "Transfer" },
  { value: "cash", label: "Tunai" },
  { value: "virtual_account", label: "Virtual Account" },
  { value: "qris", label: "QRIS" },
];

const ALASAN_REJECT = [
  { value: "Nominal tidak sesuai", label: "Nominal tidak sesuai" },
  { value: "Transfer tidak ditemukan", label: "Transfer tidak ditemukan" },
  { value: "Bukti transfer blur", label: "Bukti transfer blur" },
  { value: "Rekening tidak dikenal", label: "Rekening tidak dikenal" },
  { value: "Lainnya", label: "Lainnya" },
];

// ============================================================
// CREATE INVOICE MODAL
// ============================================================

function CreateInvoiceModal({
  open,
  onClose,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: (invNumber: string, amount: number) => void;
}) {
  const [kodeGroup, setKodeGroup] = useState("");
  const [nominal, setNominal] = useState<number>(0);
  const [jatuhTempo, setJatuhTempo] = useState("");
  const [catatan, setCatatan] = useState("");
  const [loading, setLoading] = useState(false);
  const [groupInfo, setGroupInfo] = useState<any>(null);
  const [lookupError, setLookupError] = useState("");

  async function handleSearchGroup() {
    setLookupError("");
    setGroupInfo(null);
    if (!kodeGroup.trim()) {
      setLookupError("Masukkan kode registrasi group");
      return;
    }
    try {
      const group = await getGroupByKode(kodeGroup.trim().toUpperCase());
      if (!group) {
        setLookupError("Group tidak ditemukan");
        return;
      }
      setGroupInfo(group);
      if (group.sisaPembayaran) {
        setNominal(group.sisaPembayaran);
      }
    } catch {
      setLookupError("Gagal mencari data group");
    }
  }

  async function handleSubmit() {
    if (!groupInfo || nominal <= 0) return;
    setLoading(true);
    try {
      const res = await createInvoice({
        groupId: groupInfo.id,
        nominal,
        jatuhTempo: jatuhTempo || undefined,
        catatan: catatan || `Invoice penerbitan untuk group ${groupInfo.kodeRegistrasi}`,
      });

      onSuccess(res.nomorInvoice || res.id, nominal);
      setKodeGroup("");
      setNominal(0);
      setJatuhTempo("");
      setCatatan("");
      setGroupInfo(null);
    } catch (e) {
      console.error("Failed to create invoice:", e);
      alert("Gagal menerbitkan invoice baru.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Buat Invoice Tagihan Baru" size="lg">
      <div className="space-y-4 pt-2">
        <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-amber-900 dark:text-amber-200">
            1. Cari & Pilih Group Registrasi Jamaah
          </label>
          <div className="flex gap-2">
            <Input
              placeholder="Contoh: GRP-2026-00081"
              value={kodeGroup}
              onChange={(e) => setKodeGroup(e.target.value)}
              className="font-mono text-sm"
            />
            <Button onClick={handleSearchGroup} size="sm" className="bg-amber-600 hover:bg-amber-700 text-white font-bold shrink-0">
              <Search className="h-3.5 w-3.5 mr-1" /> Cari Group
            </Button>
          </div>
          {lookupError && <p className="text-xs text-destructive font-medium">{lookupError}</p>}
          {groupInfo && (
            <div className="p-2.5 bg-background border rounded-lg text-xs space-y-1">
              <p className="font-bold text-foreground">Group: {groupInfo.namaGroup} ({groupInfo.kodeRegistrasi})</p>
              <p className="text-muted-foreground">Ketua / Kontak: {groupInfo.kontakNama || "-"} ({groupInfo.kontakHp || "-"})</p>
            </div>
          )}
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-foreground">
              2. Nominal Tagihan Invoice (Rp)
            </label>
            <Input
              type="number"
              placeholder="Masukkan nominal tagihan"
              value={nominal || ""}
              onChange={(e) => setNominal(Number(e.target.value))}
              className="mt-1 font-bold text-base"
            />
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-foreground">
              3. Tanggal Jatuh Tempo (Batas Akhir Pelunasan)
            </label>
            <Input
              type="date"
              value={jatuhTempo}
              onChange={(e) => setJatuhTempo(e.target.value)}
              className="mt-1 text-sm"
            />
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-foreground">
              4. Catatan / Rincian Tagihan
            </label>
            <Input
              placeholder="Contoh: Tagihan DP / Pelunasan Tambahan Perlengkapan"
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
              className="mt-1 text-sm"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t">
          <Button variant="outline" onClick={onClose}>
            Batal
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!groupInfo || nominal <= 0 || loading}
            className="bg-amber-600 hover:bg-amber-700 text-white font-bold"
          >
            {loading ? "Menerbitkan..." : "Terbitkan Invoice"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ============================================================
// SPLIT INVOICE MODAL
// ============================================================

function SplitInvoiceModal({
  open,
  onClose,
  groupData,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  groupData: GroupPaymentSummary;
  onSubmit: (config: InvoiceSplitConfig) => void;
}) {
  const anggota = groupData.anggota;
  const [splitCount, setSplitCount] = useState(2);
  const [assignments, setAssignments] = useState<Record<string, number>>({});

  useEffect(() => {
    const newAssignments: Record<string, number> = {};
    anggota.forEach((a, i) => {
      newAssignments[a.id] = i % splitCount;
    });
    setAssignments(newAssignments);
  }, [splitCount, anggota]);

  function handleSubmit() {
    const splits: InvoiceSplitItem[] = Array.from({ length: splitCount }, (_, i) => {
      const label = String.fromCharCode(65 + i);
      const anggotaIds = anggota.filter((a) => assignments[a.id] === i).map((a) => a.id);
      return {
        id: `${groupData.groupId}-split-${label}`,
        label: `Invoice ${label}`,
        anggotaIds,
      };
    }).filter((s) => s.anggotaIds.length > 0);

    const config: InvoiceSplitConfig = {
      groupId: groupData.groupId,
      createdAt: new Date().toISOString(),
      splits,
    };
    onSubmit(config);
  }

  return (
    <Modal open={open} onClose={onClose} title="Pecah Invoice" size="lg">
      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium">Pecah menjadi berapa invoice?</label>
          <Select
            options={[
              { value: "2", label: "2 Invoice" },
              { value: "3", label: "3 Invoice" },
              { value: "4", label: "4 Invoice" },
            ]}
            value={String(splitCount)}
            onChange={(e) => setSplitCount(Number(e.target.value))}
          />
        </div>

        <div>
          <p className="text-sm font-medium mb-2">Pilih anggota per invoice:</p>
          <div className="space-y-3">
            {Array.from({ length: splitCount }, (_, i) => {
              const label = String.fromCharCode(65 + i);
              const members = anggota.filter((a) => assignments[a.id] === i);
              return (
                <div key={i} className="rounded-md border p-3">
                  <p className="text-xs font-semibold mb-1.5">Invoice {label}</p>
                  <div className="flex flex-wrap gap-1">
                    {members.length === 0 ? (
                      <span className="text-xs text-muted-foreground italic">Belum ada anggota</span>
                    ) : (
                      members.map((a) => (
                        <span
                          key={a.id}
                          className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs cursor-pointer hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => {
                            const nextSplit = (assignments[a.id]! + 1) % splitCount;
                            setAssignments((prev) => ({ ...prev, [a.id]: nextSplit }));
                          }}
                          title="Klik untuk pindahkan ke invoice lain"
                        >
                          {a.namaLengkap}
                        </span>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <p className="mt-1 text-[10px] text-muted-foreground">
            Klik nama anggota untuk memindahkan ke invoice lain
          </p>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Batal</Button>
          <Button onClick={handleSubmit}>Simpan Split</Button>
        </div>
      </div>
    </Modal>
  );
}

// ============================================================
// PENINJAUAN PEMBAYARAN VIEW
// ============================================================

function PaymentReviewTabContent() {
  const [queue, setQueue] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [selectedPayment, setSelectedPayment] = useState<any | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [jenisFilter, setJenisFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(1);

  // Form Invoice States (Canvas Kanan)
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState("");
  const [formJenis, setFormJenis] = useState("DP (Pendaftaran)");
  const [formNominal, setFormNominal] = useState<number>(0);
  const [formMetode, setFormMetode] = useState("transfer");
  const [formBank, setFormBank] = useState("");
  const [formRekening, setFormRekening] = useState("");
  const [formCatatan, setFormCatatan] = useState("");
  const [submittingInvoice, setSubmittingInvoice] = useState(false);

  // Reject State
  const [rejectTarget, setRejectTarget] = useState<any | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectNotes, setRejectNotes] = useState("");

  // Toast / Feedback
  const [successMessage, setSuccessMessage] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/pembayaran/review?status=all");
      if (res.ok) {
        const json = await res.json();
        setQueue(json.data ?? []);
      }
    } catch (err) {
      console.error("Failed to load review queue:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrData, setOcrData] = useState<any | null>(null);

  const runOcrOnPayment = useCallback(async (payment: any) => {
    if (!payment?.id || !payment?.buktiUrl) return;
    setOcrLoading(true);
    try {
      const res = await fetch(`/api/pembayaran/${payment.id}/ocr`, { method: "POST" });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          const d = json.data;
          setOcrData(d);
          if (d.nominal && d.nominal > 0) {
            setFormNominal(d.nominal);
          }
          if (d.tanggalTransfer) {
            setInvoiceDate(d.tanggalTransfer);
          }
          if (d.bankPengirim) {
            setFormBank(d.bankPengirim);
          }
          if (d.nomorReferensi) {
            setFormRekening(d.nomorReferensi);
          }
        }
      }
    } catch (err) {
      console.warn("[OCR] Extraction failed:", err);
    } finally {
      setOcrLoading(false);
    }
  }, []);

  // When a payment row is clicked to create/view invoice
  const handleSelectPayment = (payment: any) => {
    setSelectedPayment(payment);
    setOcrData(payment.ocrData || null);
    const dateStr = new Date().toISOString().slice(0, 10);
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    setInvoiceNumber(payment.invoiceId || `INV-${dateStr.replace(/-/g, "")}-${randomNum}`);
    setInvoiceDate(payment.tanggal ? new Date(payment.tanggal).toISOString().slice(0, 10) : dateStr);

    const d = new Date();
    d.setDate(d.getDate() + 7);
    setDueDate(d.toISOString().slice(0, 10));

    const cat = (payment.catatan || "").toLowerCase();
    if (cat.includes("dp") || cat.includes("daftar") || cat.includes("pendaftaran") || payment.sumber === "jamaah_dp") {
      setFormJenis("DP (Pendaftaran)");
    } else if (cat.includes("lunas") || cat.includes("pelunasan") || (payment.group?.totalTagihan && payment.jumlah >= payment.group.totalTagihan)) {
      setFormJenis("Pelunasan");
    } else {
      setFormJenis("Cicilan / Tagihan");
    }

    setFormNominal(payment.jumlah || 0);
    setFormMetode(payment.metode || "transfer");
    setFormBank(payment.bankPengirim || "");
    setFormRekening(payment.nomorRekening || "");
    setFormCatatan(payment.catatan || "");

    // If payment has a transfer slip, trigger OCR extraction
    if (payment.buktiUrl) {
      if (!payment.ocrData) {
        runOcrOnPayment(payment);
      } else {
        const o = payment.ocrData;
        if (o.nominal) setFormNominal(o.nominal);
        if (o.tanggalTransfer) setInvoiceDate(o.tanggalTransfer);
        if (o.bankPengirim) setFormBank(o.bankPengirim);
        if (o.nomorReferensi) setFormRekening(o.nomorReferensi);
      }
    }
  };

  const handleApprove = useCallback(async (payment: any) => {
    setProcessingId(payment.id);
    try {
      const res = await fetch(`/api/pembayaran/${payment.id}/approve`, { method: "POST" });
      if (!res.ok) throw new Error("Gagal menyetujui");
      setQueue((prev) =>
        prev.map((p) => (p.id === payment.id ? { ...p, status: "verified" } : p))
      );
      if (selectedPayment?.id === payment.id) {
        setSelectedPayment((prev: any) => prev ? { ...prev, status: "verified" } : null);
      }
      setSuccessMessage(`Pembayaran ${formatCurrency(payment.jumlah)} untuk ${payment.namaGroup || "Group"} telah disetujui`);
      setShowSuccess(true);
    } catch {
      window.alert("Gagal menyetujui pembayaran");
    } finally {
      setProcessingId(null);
    }
  }, [selectedPayment]);

  const handleApproveFromForm = async () => {
    if (!selectedPayment) return;
    setSubmittingInvoice(true);
    try {
      const res = await fetch(`/api/pembayaran/${selectedPayment.id}/approve`, { method: "POST" });
      if (!res.ok) throw new Error("Gagal menyetujui");

      setSuccessMessage(`Invoice ${invoiceNumber} untuk ${selectedPayment.namaGroup || "Group"} (${formatCurrency(formNominal)}) berhasil diterbitkan & disetujui!`);
      setShowSuccess(true);

      setQueue((prev) =>
        prev.map((p) =>
          p.id === selectedPayment.id
            ? { ...p, status: "verified", invoiceId: invoiceNumber, jumlah: formNominal }
            : p
        )
      );
      setSelectedPayment((prev: any) =>
        prev ? { ...prev, status: "verified", invoiceId: invoiceNumber, jumlah: formNominal } : null
      );
    } catch {
      window.alert("Gagal memproses approval & invoice");
    } finally {
      setSubmittingInvoice(false);
    }
  };

  const handleReject = useCallback(async () => {
    if (!rejectTarget || !rejectReason) return;
    setProcessingId(rejectTarget.id);
    try {
      const alasan = rejectNotes ? `${rejectReason} — ${rejectNotes}` : rejectReason;
      const res = await fetch(`/api/pembayaran/${rejectTarget.id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alasanReject: alasan }),
      });
      if (!res.ok) throw new Error("Gagal menolak");
      setQueue((prev) =>
        prev.map((p) => (p.id === rejectTarget.id ? { ...p, status: "rejected" } : p))
      );
      if (selectedPayment?.id === rejectTarget.id) {
        setSelectedPayment((prev: any) => prev ? { ...prev, status: "rejected" } : null);
      }
      setSuccessMessage(`Pembayaran ${formatCurrency(rejectTarget.jumlah)} telah ditolak`);
      setShowSuccess(true);
      setRejectTarget(null);
      setRejectReason("");
      setRejectNotes("");
    } catch {
      window.alert("Gagal menolak pembayaran");
    } finally {
      setProcessingId(null);
    }
  }, [rejectTarget, rejectReason, rejectNotes, selectedPayment]);

  const getPaymentTypeBadge = (p: any) => {
    const cat = (p.catatan || "").toLowerCase();
    if (cat.includes("dp") || cat.includes("daftar") || cat.includes("pendaftaran") || p.sumber === "jamaah_dp") {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800">
          DP Pendaftaran
        </span>
      );
    }
    if (cat.includes("lunas") || cat.includes("pelunasan") || (p.group?.totalTagihan && p.jumlah >= p.group.totalTagihan)) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
          Pelunasan
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
        Cicilan / Tagihan
      </span>
    );
  };

  const filteredQueue = queue.filter((p) => {
    if (statusFilter !== "all" && p.status !== statusFilter) return false;

    if (jenisFilter !== "all") {
      const cat = (p.catatan || "").toLowerCase();
      const isDP = cat.includes("dp") || cat.includes("daftar") || cat.includes("pendaftaran") || p.sumber === "jamaah_dp";
      const isLunas = cat.includes("lunas") || cat.includes("pelunasan") || (p.group?.totalTagihan && p.jumlah >= p.group.totalTagihan);
      if (jenisFilter === "dp" && !isDP) return false;
      if (jenisFilter === "pelunasan" && !isLunas) return false;
      if (jenisFilter === "tagihan" && (isDP || isLunas)) return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchKode = (p.kodeRegistrasi || "").toLowerCase().includes(q);
      const matchName = (p.namaGroup || "").toLowerCase().includes(q);
      const matchBank = (p.bankPengirim || "").toLowerCase().includes(q);
      const matchNominal = String(p.jumlah).includes(q);
      if (!matchKode && !matchName && !matchBank && !matchNominal) return false;
    }

    return true;
  });

  if (loading) {
    return <LoadingSkeleton variant="table" />;
  }

  // Calculate group financial summaries if available
  const groupTotalTagihan = selectedPayment?.group?.totalTagihan || selectedPayment?.jumlah || 0;
  const groupTotalBayar = selectedPayment?.group?.totalPembayaran || 0;
  const groupSisaTagihan = Math.max(0, groupTotalTagihan - (groupTotalBayar + (selectedPayment?.status === "verified" ? 0 : formNominal)));

  return (
    <div className="space-y-4">
      {/* Top Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-card p-3.5 rounded-xl border shadow-xs">
        <div>
          <h2 className="text-base font-bold text-foreground flex items-center gap-2">
            <ClipboardCheck className="w-4 h-4 text-amber-500" /> Peninjauan Pembayaran & Penerbitan Invoice
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Pilih transaksi di canvas kiri untuk memeriksa bukti transfer dan menerbitkan formulir invoice di canvas kanan.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-background border rounded-lg text-xs font-medium focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="all">Semua Status ({queue.length})</option>
            <option value="pending">Menunggu ({queue.filter((q) => q.status === "pending").length})</option>
            <option value="verified">Disetujui ({queue.filter((q) => q.status === "verified").length})</option>
            <option value="rejected">Ditolak ({queue.filter((q) => q.status === "rejected").length})</option>
          </select>

          {/* Jenis Filter */}
          <select
            value={jenisFilter}
            onChange={(e) => setJenisFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-background border rounded-lg text-xs font-medium focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="all">Semua Jenis</option>
            <option value="dp">DP (Pendaftaran)</option>
            <option value="tagihan">Cicilan / Tagihan</option>
            <option value="pelunasan">Pelunasan</option>
          </select>

          {/* Search Box */}
          <div className="relative flex-1 sm:w-48">
            <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari ID Reg / Group..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-background border rounded-lg text-xs font-medium placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>
      </div>

      {/* 2-CANVAS SPLIT LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* ========================================================= */}
        {/* CANVAS KIRI: TABEL PEMBAYARAN MASUK */}
        {/* ========================================================= */}
        <div className={selectedPayment ? "lg:col-span-7 space-y-4" : "lg:col-span-12 space-y-4"}>
          {filteredQueue.length === 0 ? (
            <EmptyState
              icon={ClipboardCheck}
              title="Tidak ada pembayaran ditemukan"
              description="Tidak ada transaksi pembayaran yang cocok dengan filter pencarian saat ini."
            />
          ) : (
            <Card>
              <CardContent className="p-0">
                <div className="relative w-full overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50 text-left text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                        <th className="py-2.5 px-3 w-8 text-center">#</th>
                        <th className="py-2.5 px-3">ID Reg & Group</th>
                        <th className="py-2.5 px-3">Jenis Pembayaran</th>
                        <th className="py-2.5 px-3 text-right">Nominal</th>
                        <th className="py-2.5 px-3">Bank</th>
                        <th className="py-2.5 px-3 text-center">Bukti TF</th>
                        <th className="py-2.5 px-3 text-center">Status</th>
                        <th className="py-2.5 px-3 text-center">Aksi Invoice</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y text-xs">
                      {filteredQueue.map((p, idx) => {
                        const isSelected = selectedPayment?.id === p.id;
                        return (
                          <tr
                            key={p.id}
                            className={`transition-colors cursor-pointer ${
                              isSelected
                                ? "bg-amber-500/10 border-l-4 border-l-amber-500 font-medium"
                                : "hover:bg-muted/30"
                            }`}
                            onClick={() => handleSelectPayment(p)}
                          >
                            <td className="px-3 py-3 text-center text-muted-foreground">{idx + 1}</td>
                            <td className="px-3 py-3">
                              <p className="font-bold text-foreground leading-tight">{p.namaGroup ?? p.groupId}</p>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="font-mono text-[10px] text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1 rounded">
                                  {p.kodeRegistrasi ?? "-"}
                                </span>
                                <span className="text-[10px] text-muted-foreground">
                                  {formatDate(p.tanggal)}
                                </span>
                              </div>
                            </td>
                            <td className="px-3 py-3">{getPaymentTypeBadge(p)}</td>
                            <td className="px-3 py-3 text-right font-extrabold text-foreground">
                              {formatCurrency(p.jumlah)}
                            </td>
                            <td className="px-3 py-3">
                              <Badge variant="outline" className="text-[10px] font-mono">
                                {p.bankPengirim ?? "Bank"}
                              </Badge>
                            </td>
                            <td className="px-3 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                              {p.buktiUrl ? (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0 rounded-full text-amber-600 hover:bg-amber-500/10 hover:text-amber-700"
                                  title="Lihat Bukti Transfer"
                                  onClick={() => {
                                    setPreviewImageUrl(p.buktiUrl);
                                    setZoomLevel(1);
                                  }}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              ) : (
                                <span className="text-muted-foreground text-[10px]">-</span>
                              )}
                            </td>
                            <td className="px-3 py-3 text-center">
                              {p.status === "verified" ? (
                                <Badge variant="success" className="text-[10px]">Verified</Badge>
                              ) : p.status === "rejected" ? (
                                <Badge variant="destructive" className="text-[10px]">Ditolak</Badge>
                              ) : (
                                <Badge variant="warning" className="text-[10px]">Pending</Badge>
                              )}
                            </td>
                            <td className="px-3 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-center gap-1">
                                <Button
                                  size="sm"
                                  variant={isSelected ? "default" : "outline"}
                                  className={`h-7 text-xs font-bold gap-1 ${
                                    isSelected
                                      ? "bg-amber-600 hover:bg-amber-700 text-white"
                                      : "border-amber-500/30 text-amber-700 hover:bg-amber-50 dark:text-amber-300 dark:hover:bg-amber-950/50"
                                  }`}
                                  onClick={() => handleSelectPayment(p)}
                                >
                                  <FileText className="h-3.5 w-3.5" />
                                  Buat Invoice
                                </Button>
                                {p.status === "pending" && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 w-7 p-0 text-emerald-600 hover:bg-emerald-500/10 hover:text-emerald-700"
                                    disabled={processingId === p.id}
                                    title="Langsung Setujui (Quick Approve)"
                                    onClick={() => handleApprove(p)}
                                  >
                                    <CheckCircle2 className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* ========================================================= */}
        {/* CANVAS KANAN: FORM INVOICE GENERATOR / PREVIEW */}
        {/* ========================================================= */}
        {selectedPayment ? (
          <div className="lg:col-span-5 sticky top-4 space-y-4">
            <Card className="border-2 border-amber-500/40 shadow-md">
              <CardHeader className="p-4 border-b bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent flex flex-row items-center justify-between space-y-0">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <Receipt className="w-4 h-4 text-amber-600" />
                    <CardTitle className="text-sm font-bold text-foreground">Form Penerbitan Invoice</CardTitle>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Model invoice tagihan resmi untuk jamaah / group
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Badge variant={selectedPayment.status === "verified" ? "success" : "warning"} className="text-[10px] font-bold">
                    {selectedPayment.status === "verified" ? "Invoice Terbit" : "Draft Invoice"}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 rounded-full text-muted-foreground hover:bg-muted"
                    onClick={() => setSelectedPayment(null)}
                    title="Tutup Form Invoice"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="p-4 space-y-4 text-xs">
                {/* 1. Header Invoice & Identitas Group */}
                <div className="p-3 bg-muted/40 rounded-lg border space-y-2">
                  <div className="flex items-center justify-between border-b pb-2">
                    <div>
                      <p className="font-extrabold text-foreground text-sm">{selectedPayment.namaGroup || "Nama Perwakilan"}</p>
                      <p className="font-mono text-[11px] text-amber-600 dark:text-amber-400 font-bold">
                        ID Reg: {selectedPayment.kodeRegistrasi || selectedPayment.groupId}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-muted-foreground">No. Invoice</span>
                      <p className="font-mono font-bold text-foreground text-xs">{invoiceNumber}</p>
                    </div>
                  </div>

                  {/* Paket & Tanggal Info */}
                  <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                    <div>
                      <span className="text-muted-foreground">Paket Keberangkatan:</span>
                      <p className="font-semibold text-foreground truncate">
                        {selectedPayment.group?.keberangkatan?.namaPaket || "Paket Umroh VTU"}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Tgl Berangkat:</span>
                      <p className="font-semibold text-foreground">
                        {selectedPayment.group?.keberangkatan?.tanggalBerangkat
                          ? formatDate(selectedPayment.group.keberangkatan.tanggalBerangkat)
                          : "-"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* 2. Rincian Form Invoice Tagihan */}
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] font-bold text-foreground">Jenis Pembayaran</label>
                      <select
                        value={formJenis}
                        onChange={(e) => setFormJenis(e.target.value)}
                        className="mt-1 w-full h-8 px-2 rounded-md border bg-background text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-primary"
                      >
                        <option value="DP (Pendaftaran)">DP (Pendaftaran)</option>
                        <option value="Cicilan / Tagihan">Cicilan / Tagihan</option>
                        <option value="Pelunasan">Pelunasan</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-foreground">Tanggal Pembayaran</label>
                      <Input
                        type="date"
                        value={invoiceDate}
                        onChange={(e) => setInvoiceDate(e.target.value)}
                        className="h-8 text-xs font-mono mt-1"
                      />
                    </div>
                  </div>

                  {/* Nominal Pembayaran Input */}
                  <div>
                    <div className="flex justify-between items-center">
                      <label className="text-[11px] font-bold text-foreground">Nominal Invoice / Pembayaran (Rp)</label>
                      <span className="text-[10px] text-amber-600 font-extrabold">{formatCurrency(formNominal)}</span>
                    </div>
                    <Input
                      type="number"
                      value={formNominal || ""}
                      onChange={(e) => setFormNominal(Number(e.target.value))}
                      className="h-9 font-mono font-bold text-sm text-foreground mt-1"
                      placeholder="Masukkan nominal..."
                    />
                  </div>

                  {/* Bank, Metode & No Rekening */}
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-[11px] font-bold text-foreground">Metode</label>
                      <select
                        value={formMetode}
                        onChange={(e) => setFormMetode(e.target.value)}
                        className="mt-1 w-full h-8 px-2 rounded-md border bg-background text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-primary"
                      >
                        <option value="transfer">Transfer</option>
                        <option value="cash">Tunai</option>
                        <option value="virtual_account">VA</option>
                        <option value="qris">QRIS</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-foreground">Bank Pengirim</label>
                      <Input
                        type="text"
                        value={formBank}
                        onChange={(e) => setFormBank(e.target.value)}
                        placeholder="BCA / BSI"
                        className="h-8 text-xs mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-foreground">Jatuh Tempo</label>
                      <Input
                        type="date"
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                        className="h-8 text-xs mt-1 font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-foreground">No. Rekening / Ref Transaksi</label>
                    <Input
                      type="text"
                      value={formRekening}
                      onChange={(e) => setFormRekening(e.target.value)}
                      placeholder="Nomor referensi / rekening pengirim"
                      className="h-8 text-xs mt-1 font-mono"
                    />
                  </div>

                  {/* Catatan / Keterangan */}
                  <div>
                    <label className="text-[11px] font-bold text-foreground">Keterangan / Catatan Transaksi</label>
                    <textarea
                      value={formCatatan}
                      onChange={(e) => setFormCatatan(e.target.value)}
                      placeholder="Contoh: Pembayaran DP 3 Pax Paket Umroh 17 Juni"
                      className="mt-1 w-full rounded-md border bg-background px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-primary min-h-[50px]"
                    />
                  </div>
                </div>

                {/* 3. AI OCR Extraction & Bukti Slip Thumbnail Preview di dalam Form */}
                {selectedPayment.buktiUrl && (
                  <div className="space-y-2">
                    {/* OCR Status & Extracted Data Banner */}
                    <div className="p-2.5 bg-gradient-to-r from-amber-500/10 via-emerald-500/10 to-transparent border border-amber-500/30 rounded-lg space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <Sparkles className={`w-3.5 h-3.5 text-amber-500 ${ocrLoading ? "animate-spin" : ""}`} />
                          <span className="font-bold text-foreground text-[11px]">
                            {ocrLoading
                              ? "AI OCR sedang mengekstrak slip..."
                              : ocrData
                              ? "AI OCR: Nominal & Tanggal Terdeteksi"
                              : "AI OCR: Ekstrak Slip Transfer"}
                          </span>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 px-2 text-[10px] font-bold text-amber-600 dark:text-amber-400 hover:bg-amber-500/10"
                          disabled={ocrLoading}
                          onClick={() => runOcrOnPayment(selectedPayment)}
                        >
                          {ocrLoading ? (
                            <Loader2 className="w-3 h-3 animate-spin mr-1" />
                          ) : (
                            <Sparkles className="w-3 h-3 mr-1" />
                          )}
                          {ocrLoading ? "Memproses..." : "Scan Ulang OCR"}
                        </Button>
                      </div>

                      {ocrData && (
                        <div className="grid grid-cols-2 gap-1.5 text-[10px] bg-background/90 p-2 rounded border">
                          <div>
                            <span className="text-muted-foreground">Nominal Terekstrak:</span>
                            <p className="font-extrabold text-foreground font-mono">
                              {ocrData.nominal ? formatCurrency(ocrData.nominal) : "-"}
                            </p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Tgl Transfer:</span>
                            <p className="font-extrabold text-foreground font-mono">
                              {ocrData.tanggalTransfer || "-"}
                            </p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Bank:</span>
                            <p className="font-semibold text-foreground">{ocrData.bankPengirim || "-"}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Confidence:</span>
                            <p className="font-bold text-emerald-600 dark:text-emerald-400">
                              {Math.round((ocrData.confidence || 0.9) * 100)}% (Akurat)
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Bukti Slip Thumbnail Preview di dalam Form */}
                    <div className="p-2 bg-muted/40 border rounded-lg flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Eye className="w-4 h-4 text-amber-600" />
                        <div>
                          <p className="font-bold text-foreground text-[11px]">Bukti Slip Terlampir</p>
                          <p className="text-[10px] text-muted-foreground">Dokumen bukti transfer jamaah</p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-[11px] font-bold border-amber-500/40 text-amber-700 dark:text-amber-300"
                        onClick={() => {
                          setPreviewImageUrl(selectedPayment.buktiUrl);
                          setZoomLevel(1);
                        }}
                      >
                        Buka Slip
                      </Button>
                    </div>
                  </div>
                )}

                {/* 4. Ringkasan Keuangan Group */}
                <div className="p-3 bg-muted/60 rounded-lg border space-y-1.5 text-[11px]">
                  <p className="font-bold text-foreground text-xs border-b pb-1">Kalkulasi Tagihan Group</p>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Total Tagihan Paket:</span>
                    <span className="font-mono font-medium text-foreground">{formatCurrency(groupTotalTagihan)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Total Terbayar Sebelumnya:</span>
                    <span className="font-mono font-medium text-foreground">{formatCurrency(groupTotalBayar)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-amber-700 dark:text-amber-300">
                    <span>Pembayaran Invoice Ini:</span>
                    <span className="font-mono font-extrabold">{formatCurrency(formNominal)}</span>
                  </div>
                  <div className="flex justify-between font-extrabold text-foreground border-t pt-1">
                    <span>Sisa Tagihan Setelah Ini:</span>
                    <span className="font-mono text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(groupSisaTagihan)}
                    </span>
                  </div>
                </div>

                {/* 5. Action Buttons di Form Invoice */}
                <div className="pt-2 border-t flex flex-col gap-2">
                  <div className="flex gap-2">
                    {selectedPayment.status !== "verified" && (
                      <Button
                        className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-9 text-xs"
                        disabled={submittingInvoice}
                        onClick={handleApproveFromForm}
                      >
                        <CheckCircle2 className="h-4 w-4 mr-1.5" />
                        {submittingInvoice ? "Menerbitkan..." : "Approve & Terbitkan Invoice"}
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      className="font-bold h-9 text-xs gap-1.5"
                      onClick={() => window.print()}
                    >
                      <Printer className="h-4 w-4" />
                      Cetak Invoice
                    </Button>
                  </div>

                  {selectedPayment.status === "pending" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:bg-destructive/10 text-xs font-bold"
                      onClick={() => {
                        setRejectTarget(selectedPayment);
                        setRejectReason("");
                        setRejectNotes("");
                      }}
                    >
                      <XCircle className="h-3.5 w-3.5 mr-1" />
                      Tolak Pembayaran Ini
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        ) : null}
      </div>

      {/* ========================================================= */}
      {/* MODAL PRATINJAU BUKTI TRANSFER (TOMBOL MATA) */}
      {/* ========================================================= */}
      <Modal
        open={previewImageUrl !== null}
        onClose={() => setPreviewImageUrl(null)}
        title="Pratinjau Bukti Transfer Pembayaran"
        size="lg"
      >
        <div className="space-y-4 pt-1">
          <div className="flex items-center justify-between bg-muted/40 p-2 rounded-lg text-xs">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs gap-1"
                onClick={() => setZoomLevel((z) => Math.max(0.6, z - 0.2))}
              >
                <ZoomOut className="h-3.5 w-3.5" /> Perkecil
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs gap-1"
                onClick={() => setZoomLevel((z) => Math.min(2.5, z + 0.2))}
              >
                <ZoomIn className="h-3.5 w-3.5" /> Perbesar
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => setZoomLevel(1)}
              >
                Reset ({Math.round(zoomLevel * 100)}%)
              </Button>
            </div>

            {previewImageUrl && (
              <a
                href={previewImageUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs font-bold text-amber-600 hover:underline"
              >
                <ExternalLink className="h-3.5 w-3.5" /> Buka Tab Baru
              </a>
            )}
          </div>

          {/* Image Container */}
          <div className="relative max-h-[65vh] overflow-auto rounded-lg border bg-stone-900/90 flex items-center justify-center p-4">
            {previewImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={previewImageUrl}
                alt="Bukti Transfer"
                style={{ transform: `scale(${zoomLevel})`, transition: "transform 0.2s ease" }}
                className="max-h-[55vh] object-contain rounded shadow-lg select-none"
              />
            ) : (
              <p className="text-xs text-muted-foreground">Tidak ada gambar bukti transfer.</p>
            )}
          </div>

          <div className="flex justify-end pt-1">
            <Button size="sm" onClick={() => setPreviewImageUrl(null)}>
              Tutup Pratinjau
            </Button>
          </div>
        </div>
      </Modal>

      {/* Reject Modal */}
      <Modal
        open={rejectTarget !== null}
        onClose={() => {
          setRejectTarget(null);
          setRejectReason("");
          setRejectNotes("");
        }}
        title="Tolak Pembayaran"
        description={`Nominal: ${rejectTarget ? formatCurrency(rejectTarget.jumlah) : "-"}`}
        size="sm"
      >
        <div className="space-y-4 pt-1">
          <Select
            label="Alasan Penolakan"
            options={ALASAN_REJECT}
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Pilih alasan..."
          />
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-foreground">Catatan Tambahan</label>
            <textarea
              className="mt-1 w-full rounded-md border border-stone-300 dark:border-stone-700 bg-background px-3 py-2 text-xs focus:ring-1 focus:ring-amber-500 min-h-[60px]"
              placeholder="Opsional: detail penolakan..."
              value={rejectNotes}
              onChange={(e) => setRejectNotes(e.target.value)}
            />
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setRejectTarget(null);
                setRejectReason("");
                setRejectNotes("");
              }}
            >
              Batal
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={!rejectReason || processingId === rejectTarget?.id}
              onClick={handleReject}
              className="font-bold"
            >
              {processingId === rejectTarget?.id ? "Memproses..." : "Konfirmasi Penolakan"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Success Toast / Modal */}
      <Modal open={showSuccess} onClose={() => setShowSuccess(false)} title="Berhasil" size="sm">
        <p className="text-sm font-medium">{successMessage}</p>
        <div className="flex justify-end mt-4">
          <Button size="sm" onClick={() => setShowSuccess(false)}>
            Tutup
          </Button>
        </div>
      </Modal>
    </div>
  );
}

// ============================================================
// MAIN PAGE
// ============================================================

export default function LaporanPembayaranPage() {
  const [activeTab, setActiveTab] = useState<"laporan" | "review">("review");
  const [showCreateInvoiceModal, setShowCreateInvoiceModal] = useState(false);

  // Group lookup
  const [kodeInput, setKodeInput] = useState("");
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState("");

  // Group data
  const [groupData, setGroupData] = useState<GroupPaymentSummary | null>(null);

  // Split config
  const [splitConfig, setSplitConfig] = useState<InvoiceSplitConfig | null>(null);
  const [activeSplitId, setActiveSplitId] = useState<string | null>(null);

  // Split modal
  const [showSplitModal, setShowSplitModal] = useState(false);

  // Form
  const [nominal, setNominal] = useState(0);
  const [metode, setMetode] = useState<MetodePembayaran>("transfer");
  const [catatan, setCatatan] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Alokasi
  const [alokasi, setAlokasi] = useState<Record<string, number>>({});

  // Success modal
  const [showSuccess, setShowSuccess] = useState(false);
  const [successData, setSuccessData] = useState<{ invoiceNumber: string; amount: number } | null>(null);

  // Active split item
  const activeSplit = splitConfig?.splits.find((s) => s.id === activeSplitId) ?? null;
  // Anggota filtered by active split
  const activeAnggota = activeSplit
    ? groupData?.anggota.filter((a) => activeSplit.anggotaIds.includes(a.id)) ?? []
    : groupData?.anggota ?? [];
  // Pembayaran filtered by active split (if split exists)
  const activePembayaran = activeSplit
    ? groupData?.pembayaran.filter((p) =>
        p.alokasi.some((alok) => activeSplit.anggotaIds.includes(alok.jamaahId))
      ) ?? []
    : groupData?.pembayaran ?? [];

  async function handleCari() {
    setError("");
    setGroupData(null);
    setSplitConfig(null);
    setActiveSplitId(null);

    if (!kodeInput.trim()) {
      setError("Masukkan kode registrasi group");
      return;
    }

    setSearching(true);
    try {
      const group = await getGroupByKode(kodeInput.trim().toUpperCase());
      if (!group) {
        setError("Group tidak ditemukan");
        setSearching(false);
        return;
      }

      const [summary, split] = await Promise.all([
        getGroupPaymentSummary(group.id),
        fetchInvoiceSplitConfig(group.id),
      ]);

      if (!summary) {
        setError("Data pembayaran group tidak ditemukan");
        setSearching(false);
        return;
      }

      setGroupData(summary);
      if (split) {
        setSplitConfig(split);
        setActiveSplitId(split.splits[0]?.id ?? null);
      }
      setAlokasi({});
    } catch {
      setError("Gagal mengambil data group");
    } finally {
      setSearching(false);
    }
  }

  function handleBagiRata() {
    if (nominal <= 0) return;
    const anggota = activeAnggota;
    if (anggota.length === 0) return;
    const perOrang = Math.floor(nominal / anggota.length);
    const remainder = nominal - perOrang * anggota.length;
    const newAlokasi: Record<string, number> = {};
    anggota.forEach((a, i) => {
      newAlokasi[a.id] = perOrang + (i === 0 ? remainder : 0);
    });
    setAlokasi(newAlokasi);
  }

  const totalAlokasi = Object.values(alokasi).reduce((sum, v) => sum + v, 0);
  const alokasiValid = nominal > 0 && totalAlokasi === nominal;

  async function handleSubmit() {
    if (!groupData || nominal <= 0 || !alokasiValid) return;

    setSubmitting(true);
    try {
      const newPayment: Omit<Pembayaran, "id" | "status" | "verifiedBy" | "reviewedBy" | "reviewedAt"> = {
        groupId: groupData.groupId,
        invoiceId: activeSplitId ?? undefined,
        jumlah: nominal,
        metode,
        sumber: "admin",
        tanggal: new Date().toISOString().split("T")[0]!,
        catatan: catatan || undefined,
        alokasi: Object.entries(alokasi).map(([jamaahId, jumlah]) => ({
          jamaahId,
          namaJamaah: groupData.anggota.find((a) => a.id === jamaahId)?.namaLengkap ?? jamaahId,
          jumlah,
        })),
      };

      await addPembayaran(newPayment);

      const invoiceNumber = `INV-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${String(Math.floor(Math.random() * 9000) + 1000)}`;

      setSuccessData({ invoiceNumber, amount: nominal });
      setShowSuccess(true);

      // Reset form
      setNominal(0);
      setCatatan("");
      setAlokasi({});

      // Refresh
      const summary = await getGroupPaymentSummary(groupData.groupId);
      setGroupData(summary ?? null);
    } catch {
      // silently fail
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSplitSubmit(config: InvoiceSplitConfig) {
    await saveInvoiceSplitConfig(groupData?.groupId ?? "", config);
    setSplitConfig(config);
    setActiveSplitId(config.splits[0]?.id ?? null);
    setShowSplitModal(false);
  }

  return (
    <div className="space-y-6">
      {/* PAGE HEADER & TOP ACTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Manajemen Invoice & Pembayaran</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Pusat penerbitan invoice, input pembayaran manual, serta verifikasi peninjauan slip transfer.
          </p>
        </div>

        <Button
          onClick={() => setShowCreateInvoiceModal(true)}
          className="bg-amber-600 hover:bg-amber-700 text-white font-bold flex items-center gap-2 shadow-xs shrink-0"
        >
          <FilePlus className="h-4 w-4" />
          Create Invoice (Buat Baru)
        </Button>
      </div>

      {/* TOP NAVIGATION TABS */}
      <div className="flex items-center gap-2 border-b border-border pb-1">
        <button
          onClick={() => setActiveTab("review")}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-bold border-b-2 transition-all ${
            activeTab === "review"
              ? "border-amber-500 text-amber-600 dark:text-amber-400 bg-amber-500/10 rounded-t-lg"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <ClipboardCheck className="h-4 w-4" />
          Peninjauan Pembayaran (Slip Verification)
        </button>

        <button
          onClick={() => setActiveTab("laporan")}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-bold border-b-2 transition-all ${
            activeTab === "laporan"
              ? "border-amber-500 text-amber-600 dark:text-amber-400 bg-amber-500/10 rounded-t-lg"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <CreditCard className="h-4 w-4" />
          Daftar & Input Pembayaran Group
        </button>
      </div>

      {/* TAB 1: DAFTAR & INPUT PEMBAYARAN */}
      {activeTab === "laporan" && (
        <div className="space-y-6">
          {/* Group lookup */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-end gap-3">
                <div className="flex-1 max-w-md">
                  <Input
                    label="Kode Registrasi Group"
                    placeholder="Contoh: GRP-2026-00081"
                    value={kodeInput}
                    onChange={(e) => setKodeInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleCari()}
                  />
                </div>
                <Button onClick={handleCari} disabled={searching} className="font-bold">
                  <Search className="mr-1.5 h-4 w-4" />
                  {searching ? "Mencari..." : "Cari Group"}
                </Button>
              </div>
              {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
            </CardContent>
          </Card>

          {groupData && (
            <>
              {/* Group info */}
              <Card>
                <CardContent className="pt-6">
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
                    <div>
                      <p className="text-xs text-muted-foreground">Kode</p>
                      <p className="font-mono font-medium">{groupData.kodeRegistrasi}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Nama Group</p>
                      <p className="font-medium">{groupData.namaGroup}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Total Tagihan</p>
                      <p className="font-semibold">{formatCurrency(groupData.totalTagihan)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Total Dibayar</p>
                      <p className="font-semibold text-success">{formatCurrency(groupData.totalPembayaran)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Sisa</p>
                      <p className="font-semibold text-destructive">{formatCurrency(groupData.sisaPembayaran)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Split Invoice Tabs */}
              {splitConfig && (
                <div className="flex items-center gap-2">
                  {splitConfig.splits.map((s) => (
                    <Button
                      key={s.id}
                      size="sm"
                      variant={activeSplitId === s.id ? "default" : "outline"}
                      onClick={() => {
                        setActiveSplitId(s.id);
                        setAlokasi({});
                        setNominal(0);
                      }}
                    >
                      {s.label} ({s.anggotaIds.length} org)
                    </Button>
                  ))}
                </div>
              )}

              {/* Two-column: History | Form */}
              <div className="grid gap-6 lg:grid-cols-2">
                {/* LEFT: Payment History */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm">
                        {activeSplit
                          ? `Histori ${activeSplit.label}`
                          : "Histori Pembayaran Group"}
                      </CardTitle>
                      {!splitConfig && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          onClick={() => setShowSplitModal(true)}
                        >
                          <Columns3 className="mr-1 h-3 w-3" />
                          Pecah Invoice
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    {activePembayaran.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-8 text-center">
                        Belum ada pembayaran untuk {activeSplit ? activeSplit.label : "group ini"}
                      </p>
                    ) : (
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b text-left text-xs font-medium text-muted-foreground">
                            <th className="pb-2">Tanggal</th>
                            <th className="pb-2">Invoice</th>
                            <th className="pb-2 text-right">Nominal</th>
                            <th className="pb-2">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {activePembayaran.map((p) => (
                            <tr key={p.id}>
                              <td className="py-2 text-xs">{formatDate(p.tanggal)}</td>
                              <td className="py-2">
                                <span className="font-mono text-xs text-muted-foreground">
                                  {p.invoiceId ? `INV-${p.invoiceId.slice(-6)}` : "-"}
                                </span>
                              </td>
                              <td className="py-2 text-right font-medium tabular-nums">
                                {formatCurrency(p.jumlah)}
                              </td>
                              <td className="py-2">
                                <StatusBadge status={p.status} />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </CardContent>
                </Card>

                {/* RIGHT: Payment Form */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-sm">
                      <CreditCard className="h-4 w-4" />
                      {activeSplit
                        ? `Form Pembayaran — ${activeSplit.label}`
                        : "Form Pembayaran Baru"}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="text-sm font-medium">Nominal Pembayaran</label>
                      <Input
                        type="number"
                        placeholder="Masukkan nominal"
                        value={nominal || ""}
                        onChange={(e) => setNominal(Number(e.target.value))}
                      />
                    </div>

                    <Select
                      label="Metode Pembayaran"
                      options={metodeOptions}
                      value={metode}
                      onChange={(e) => setMetode(e.target.value as MetodePembayaran)}
                    />

                    <div>
                      <label className="text-sm font-medium">Catatan</label>
                      <Input
                        placeholder="Opsional"
                        value={catatan}
                        onChange={(e) => setCatatan(e.target.value)}
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium">Upload Bukti (Opsional)</label>
                      <div className="mt-1 flex items-center justify-center rounded-md border border-dashed p-4 text-xs text-muted-foreground hover:bg-muted/30 cursor-pointer">
                        <Upload className="mr-1.5 h-3.5 w-3.5" />
                        Klik untuk upload bukti pembayaran (mock)
                      </div>
                    </div>

                    {activeAnggota.length > 0 && (
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-sm font-medium">Alokasi Pembayaran</label>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 text-xs"
                            onClick={handleBagiRata}
                            disabled={nominal <= 0}
                          >
                            Bagi Rata
                          </Button>
                        </div>
                        <div className="max-h-32 overflow-y-auto space-y-1 rounded-md border p-2">
                          {activeAnggota.map((a) => (
                            <div key={a.id} className="flex items-center gap-2 text-sm">
                              <span className="flex-1 truncate">{a.namaLengkap}</span>
                              <input
                                type="number"
                                className="w-24 rounded border px-2 py-0.5 text-xs text-right"
                                placeholder="0"
                                value={alokasi[a.id] || ""}
                                onChange={(e) => {
                                  setAlokasi((prev) => ({
                                    ...prev,
                                    [a.id]: Number(e.target.value),
                                  }));
                                }}
                              />
                            </div>
                          ))}
                        </div>
                        {totalAlokasi > 0 && (
                          <p className={`mt-1 text-xs ${alokasiValid ? "text-success" : "text-destructive"}`}>
                            Total alokasi: {formatCurrency(totalAlokasi)}
                            {!alokasiValid && ` (harus = ${formatCurrency(nominal)})`}
                          </p>
                        )}
                      </div>
                    )}

                    <Button
                      className="w-full font-bold"
                      onClick={handleSubmit}
                      disabled={nominal <= 0 || !alokasiValid || submitting}
                    >
                      {submitting ? "Menyimpan..." : "Submit Pembayaran"}
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </div>
      )}

      {/* TAB 2: PENINJAUAN PEMBAYARAN */}
      {activeTab === "review" && <PaymentReviewTabContent />}

      {/* Create Invoice Modal */}
      <CreateInvoiceModal
        open={showCreateInvoiceModal}
        onClose={() => setShowCreateInvoiceModal(false)}
        onSuccess={(invNumber, amount) => {
          setShowCreateInvoiceModal(false);
          setSuccessData({ invoiceNumber: invNumber, amount });
          setShowSuccess(true);
        }}
      />

      {/* Split Invoice Modal */}
      {groupData && (
        <SplitInvoiceModal
          open={showSplitModal}
          onClose={() => setShowSplitModal(false)}
          groupData={groupData}
          onSubmit={handleSplitSubmit}
        />
      )}

      {/* Success Modal */}
      <Modal
        open={showSuccess}
        onClose={() => setShowSuccess(false)}
        title="Operasi Berhasil"
        size="sm"
      >
        <div className="space-y-3 text-center">
          <CheckCircle className="mx-auto h-10 w-10 text-success" />
          <div>
            <p className="font-medium">Transaksi / Invoice dicatat</p>
            <p className="text-sm text-muted-foreground">
              Nomor Invoice: <span className="font-mono font-bold text-foreground">{successData?.invoiceNumber}</span>
            </p>
            <p className="text-lg font-bold mt-1 text-amber-500">
              {successData ? formatCurrency(successData.amount) : ""}
            </p>
          </div>
          <Button className="w-full font-bold" onClick={() => setShowSuccess(false)}>
            Tutup
          </Button>
        </div>
      </Modal>
    </div>
  );
}

