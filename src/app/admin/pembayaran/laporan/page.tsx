"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
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
  Send,
  Mail,
  Copy,
  Check,
  Calendar,
  Download,
  FileDown,
  PlusCircle,
  Plus,
  Settings2,
  Edit3,
  Trash2,
  AlertTriangle,
  ShoppingBag,
  Building,
  Users,
} from "lucide-react";
import { downloadInvoicePdf, shareInvoicePdf, type InvoiceOrderItem } from "@/shared/lib/invoice-pdf";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/Card";
import { Button } from "@/shared/components/ui/Button";
import { Input } from "@/shared/components/ui/Input";
import { Select } from "@/shared/components/ui/Select";
import { Modal } from "@/shared/components/ui/Modal";

export interface BillingItem {
  id: string;
  nama: string;
  kategori: "utama" | "tambahan" | "potongan";
  nominal: number;
  qty: number;
  catatan?: string;
  isDefault?: boolean;
}
import { StatusBadge, Badge } from "@/shared/components/ui/Badge";
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
import { formatCurrency, formatDate, formatInvoicePersonName, getManifestAlamat } from "@/shared/lib/utils";

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
  const [h40Warning, setH40Warning] = useState<{ isLate: boolean; days: number; h40Formatted: string } | null>(null);

  async function handleSearchGroup() {
    setLookupError("");
    setGroupInfo(null);
    setH40Warning(null);
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

      // Calculate H-40 for group's package departure
      const tglBerangkatRaw = (group as any)?.paketKeberangkatan?.tanggalBerangkat || (group as any)?.keberangkatan?.tanggalBerangkat;
      if (tglBerangkatRaw) {
        const tglBerangkat = new Date(tglBerangkatRaw);
        const h40 = new Date(tglBerangkat);
        h40.setDate(h40.getDate() - 40);

        const now = new Date();
        const diffMs = tglBerangkat.getTime() - now.getTime();
        const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        const isLate = days <= 40 || now.getTime() >= h40.getTime();
        const h40Formatted = h40.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });

        setH40Warning({ isLate, days, h40Formatted });

        if (isLate) {
          const fallback = new Date();
          fallback.setDate(fallback.getDate() + 3);
          setJatuhTempo(fallback.toISOString().slice(0, 10));
        } else {
          setJatuhTempo(h40.toISOString().slice(0, 10));
        }
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
      setH40Warning(null);
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
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-foreground">
                3. Tanggal Jatuh Tempo (Batas Akhir Pelunasan)
              </label>
              {h40Warning && (
                <span
                  className={`text-[9.5px] font-bold px-1.5 py-0.5 rounded border ${
                    h40Warning.isLate
                      ? "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300 border-red-300 dark:border-red-800 animate-pulse"
                      : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800"
                  }`}
                >
                  {h40Warning.isLate ? "⚠️ ≤ H-40 Mepet" : "Standar H-40"}
                </span>
              )}
            </div>
            <Input
              type="date"
              value={jatuhTempo}
              onChange={(e) => setJatuhTempo(e.target.value)}
              className={`mt-1 text-sm ${h40Warning?.isLate ? "border-red-500 font-bold bg-red-50/30" : ""}`}
            />
            {h40Warning?.isLate ? (
              <p className="mt-1 text-[11px] text-red-600 dark:text-red-400 font-medium">
                ⚠️ Batas normal H-40 ({h40Warning.h40Formatted}) sudah lewat / $\le$ 40 hari lagi. Silakan sesuaikan tanggal jatuh tempo manual!
              </p>
            ) : h40Warning ? (
              <p className="mt-1 text-[11px] text-emerald-600 dark:text-emerald-400">
                Otomatis diset ke batas akhir pelunasan H-40 Keberangkatan ({h40Warning.h40Formatted}).
              </p>
            ) : null}
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
// PRESETS PENYESUAIAN & TAMBAHAN ORDER LAYANAN
// ============================================================

const ORDER_PRESETS = [
  {
    category: "fast_train",
    label: "Kereta Cepat (Fast Train)",
    defaultName: "Tiket Kereta Cepat Haramain (Mekkah - Madinah)",
    defaultNominal: 1250000,
    type: "penambahan" as const,
    icon: "🚅",
  },
  {
    category: "upgrade_kamar",
    label: "Upgrade Kamar",
    defaultName: "Upgrade Kamar Quad ke Double/Triple",
    defaultNominal: 3500000,
    type: "penambahan" as const,
    icon: "🛏️",
  },
  {
    category: "upgrade_hotel",
    label: "Upgrade Hotel",
    defaultName: "Upgrade Hotel Bintang 5 Ring 1",
    defaultNominal: 4500000,
    type: "penambahan" as const,
    icon: "🏨",
  },
  {
    category: "perlengkapan",
    label: "Tambah Perlengkapan",
    defaultName: "Tambahan Set Koper & Seragam Umroh",
    defaultNominal: 1200000,
    type: "penambahan" as const,
    icon: "🎒",
  },
  {
    category: "jahit_seragam",
    label: "Ongkos Jahit Seragam",
    defaultName: "Ongkos Jahit Seragam Batik / Abaya",
    defaultNominal: 250000,
    type: "penambahan" as const,
    icon: "✂️",
  },
  {
    category: "kursi_roda",
    label: "Sewa Kursi Roda & Pendorong",
    defaultName: "Sewa Kursi Roda + Muthawwif Pendorong",
    defaultNominal: 1500000,
    type: "penambahan" as const,
    icon: "♿",
  },
  {
    category: "paspor",
    label: "Biaya Paspor / Visa",
    defaultName: "Biaya Penanganan Paspor & Dokumen Jamaah",
    defaultNominal: 650000,
    type: "penambahan" as const,
    icon: "🛂",
  },
  {
    category: "diskon",
    label: "Diskon / Potongan Harga",
    defaultName: "Potongan Khusus / Promo Grup Umroh",
    defaultNominal: 1000000,
    type: "pengurangan" as const,
    icon: "🎁",
  },
];

const DEFAULT_TAMBAHAN_OPTIONS = [
  "Upgrade Kamar Double",
  "Upgrade Kamar Single",
  "Tiket Kereta Cepat Haramain (Mekkah - Madinah)",
  "Upgrade Hotel Bintang 5",
  "Paspor Express & Penanganan Dokumen",
  "Perlengkapan Tambahan & Handling",
  "Ongkos Jahit Seragam Batik",
  "Sewa Kursi Roda & Muthawwif Pendorong",
  "Pengurusan Visa Khusus / Single",
  "Biaya Overbagasi / Airport Handling",
];

const DEFAULT_POTONGAN_OPTIONS = [
  "Diskon Promo Early Bird",
  "Voucher Potongan Khusus",
  "Potongan Group / Cashback",
  "Keringanan Biaya Anak / Balita",
  "Potongan Manajemen / Direksi",
  "Diskon Spesial Mitra",
];

function getInitialTambahanOptions(): string[] {
  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem("vtu_master_tambahan_opts");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
  }
  return DEFAULT_TAMBAHAN_OPTIONS;
}

function getInitialPotonganOptions(): string[] {
  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem("vtu_master_potongan_opts");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
  }
  return DEFAULT_POTONGAN_OPTIONS;
}

// Module-level in-memory cache for Review Queue to avoid skeleton flicker on tab switch/revisit
let cachedReviewQueue: any[] | null = null;

function getInitialReviewQueue(): any[] {
  if (cachedReviewQueue && cachedReviewQueue.length > 0) return cachedReviewQueue;
  if (typeof window !== "undefined") {
    try {
      const stored = sessionStorage.getItem("vtu_review_queue_cache");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          cachedReviewQueue = parsed;
          return parsed;
        }
      }
    } catch {}
  }
  return [];
}

function PaymentReviewTabContent() {
  const initialQueue = getInitialReviewQueue();
  const [queue, setQueue] = useState<any[]>(initialQueue);
  const [loading, setLoading] = useState(initialQueue.length === 0);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [selectedPayment, setSelectedPayment] = useState<any | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [jenisFilter, setJenisFilter] = useState<string>("all");
  const [datePreset, setDatePreset] = useState<string>("all");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
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
  const [formHotelMekkah, setFormHotelMekkah] = useState("GRAND AL MASSA");
  const [formHotelMadinah, setFormHotelMadinah] = useState("DURRAT AL EIMAN");
  const [formAlamat, setFormAlamat] = useState("");
  const [selectedAnggota, setSelectedAnggota] = useState<string[]>([]);
  const [availableAnggota, setAvailableAnggota] = useState<string[]>([]);
  const [submittingInvoice, setSubmittingInvoice] = useState(false);

  // Order Items / Adjustments (Beban Tambahan & Pengurangan Biaya)
  const [orderItems, setOrderItems] = useState<InvoiceOrderItem[]>([]);
  const [showAddOrderModal, setShowAddOrderModal] = useState(false);
  const [newOrderCategory, setNewOrderCategory] = useState("fast_train");
  const [newOrderName, setNewOrderName] = useState("");
  const [newOrderType, setNewOrderType] = useState<"penambahan" | "pengurangan">("penambahan");
  const [newOrderNominal, setNewOrderNominal] = useState<number>(0);

  // Reject State
  const [rejectTarget, setRejectTarget] = useState<any | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectNotes, setRejectNotes] = useState("");

  // Send Invoice Modal States
  const [sendInvoiceTarget, setSendInvoiceTarget] = useState<any | null>(null);
  const [targetPhone, setTargetPhone] = useState("");
  const [targetEmail, setTargetEmail] = useState("");
  const [copiedInvoiceText, setCopiedInvoiceText] = useState(false);

  // Toast / Feedback
  const [successMessage, setSuccessMessage] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);

  // Delete Trial Data States
  const [deletePaymentTarget, setDeletePaymentTarget] = useState<any | null>(null);
  const [showDeleteAllPaymentsModal, setShowDeleteAllPaymentsModal] = useState(false);
  const [cascadeGroupDelete, setCascadeGroupDelete] = useState(true);
  const [isDeletingPayment, setIsDeletingPayment] = useState(false);

  const loadData = useCallback(async (isSilent = false) => {
    try {
      if (!isSilent && cachedReviewQueue === null) {
        setLoading(true);
      }
      const res = await fetch("/api/pembayaran/review?status=all");
      if (res.ok) {
        const json = await res.json();
        const data = json.data ?? [];
        cachedReviewQueue = data;
        if (typeof window !== "undefined") {
          try {
            sessionStorage.setItem("vtu_review_queue_cache", JSON.stringify(data));
          } catch {}
        }
        setQueue(data);
      }
    } catch (err) {
      console.error("Failed to load review queue:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData(initialQueue.length > 0);
  }, [loadData, initialQueue.length]);

  const handleDeleteSinglePayment = async () => {
    if (!deletePaymentTarget) return;
    setIsDeletingPayment(true);
    try {
      const res = await fetch(`/api/pembayaran/${deletePaymentTarget.id}?cascade=${cascadeGroupDelete}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMessage(data.message || "Data pembayaran berhasil dihapus");
        setShowSuccess(true);
        if (selectedPayment?.id === deletePaymentTarget.id) {
          setSelectedPayment(null);
        }
        setDeletePaymentTarget(null);
        loadData();
      } else {
        window.alert(data.message || "Gagal menghapus data pembayaran");
      }
    } catch {
      window.alert("Terjadi kesalahan saat menghapus data pembayaran.");
    } finally {
      setIsDeletingPayment(false);
    }
  };

  const handleDeleteAllPayments = async () => {
    setIsDeletingPayment(true);
    try {
      const res = await fetch(`/api/pembayaran`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMessage(data.message || "Semua data pembayaran percobaan berhasil dihapus");
        setShowSuccess(true);
        setSelectedPayment(null);
        setShowDeleteAllPaymentsModal(false);
        loadData();
      } else {
        window.alert(data.message || "Gagal menghapus antrian pembayaran");
      }
    } catch {
      window.alert("Terjadi kesalahan saat menghapus antrian pembayaran.");
    } finally {
      setIsDeletingPayment(false);
    }
  };

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

  // Calculation helper for H-40 & late registration warning indicator
  const h40Info = useMemo(() => {
    if (!selectedPayment?.group?.keberangkatan?.tanggalBerangkat) return null;
    const tglBerangkat = new Date(selectedPayment.group.keberangkatan.tanggalBerangkat);
    if (isNaN(tglBerangkat.getTime())) return null;

    const h40Date = new Date(tglBerangkat);
    h40Date.setDate(h40Date.getDate() - 40);

    const regDate = selectedPayment.tanggal ? new Date(selectedPayment.tanggal) : new Date();
    const diffMs = tglBerangkat.getTime() - regDate.getTime();
    const daysToDeparture = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const isLate = daysToDeparture <= 40 || regDate.getTime() >= h40Date.getTime();

    return {
      tglBerangkat,
      h40Date,
      daysToDeparture,
      isLate,
      h40Formatted: h40Date.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }),
      tglBerangkatFormatted: tglBerangkat.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }),
    };
  }, [selectedPayment]);

  // When a payment row is clicked to create/view invoice
  const handleSelectPayment = (payment: any) => {
    setSelectedPayment(payment);
    setOcrData(payment.ocrData || null);
    const dateStr = new Date().toISOString().slice(0, 10);
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const monthRom = ["I","II","III","IV","V","VI","VII","VIII","IX","X","XI","XII"][new Date().getMonth()] || "VIII";
    const yearVal = new Date().getFullYear();
    setInvoiceNumber(payment.invoiceId || `${randomNum}/INV.VT/${monthRom}/${yearVal}`);
    setInvoiceDate(payment.tanggal ? new Date(payment.tanggal).toISOString().slice(0, 10) : dateStr);

    // Calculate H-40 Jatuh Tempo Pelunasan from Paket Keberangkatan
    const tglBerangkatRaw = payment.group?.keberangkatan?.tanggalBerangkat;
    const regDate = payment.tanggal ? new Date(payment.tanggal) : new Date();

    if (tglBerangkatRaw) {
      const tglBerangkat = new Date(tglBerangkatRaw);
      const h40Date = new Date(tglBerangkat);
      h40Date.setDate(h40Date.getDate() - 40);

      const diffMs = tglBerangkat.getTime() - regDate.getTime();
      const daysToDeparture = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (daysToDeparture <= 40 || regDate.getTime() >= h40Date.getTime()) {
        // Late registration (within H-40): default to +3 days from registration date
        const fallbackDue = new Date(regDate);
        fallbackDue.setDate(fallbackDue.getDate() + 3);
        setDueDate(fallbackDue.toISOString().slice(0, 10));
      } else {
        // Normal registration: default strictly to H-40 before departure
        setDueDate(h40Date.toISOString().slice(0, 10));
      }
    } else {
      const d = new Date(regDate);
      d.setDate(d.getDate() + 14);
      setDueDate(d.toISOString().slice(0, 10));
    }

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
    setFormBank(payment.bankPengirim || "MANDIRI");
    setFormRekening(payment.nomorRekening || "");
    setFormCatatan(payment.catatan || "");

    // Hotel Information from Package
    const kbr = payment.group?.keberangkatan;
    setFormHotelMekkah(kbr?.hotelMekkah || "GRAND AL MASSA");
    setFormHotelMadinah(kbr?.hotelMadinah || "DURRAT AL EIMAN");

    // Alamat (Single Source of Truth from Manifest / Jamaah / KTP / Group)
    const alamat = getManifestAlamat(payment.group || payment);
    setFormAlamat(alamat);

    // Anggota List & Split Support
    const memberNames: string[] = [];
    if (payment.group?.anggota && payment.group.anggota.length > 0) {
      payment.group.anggota.forEach((m: any) => {
        if (m.namaLengkap) memberNames.push(m.namaLengkap);
      });
    } else if (payment.namaGroup) {
      memberNames.push(payment.namaGroup);
    }
    setAvailableAnggota(memberNames);
    setSelectedAnggota(memberNames);

    // If payment has a transfer slip, trigger OCR extraction
    if (payment.buktiUrl) {
      if (!payment.ocrData || payment.ocrData.extractedVia === "fallback_heuristic" || !payment.ocrData.nominal) {
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

  useEffect(() => {
    if (sendInvoiceTarget) {
      const p = sendInvoiceTarget;
      const phone =
        p.group?.ketuaGroup?.nomorTelepon ||
        p.group?.anggota?.[0]?.nomorTelepon ||
        "";
      const email =
        p.group?.ketuaGroup?.email ||
        p.group?.anggota?.[0]?.email ||
        "";
      setTargetPhone(phone);
      setTargetEmail(email);
      setCopiedInvoiceText(false);
    }
  }, [sendInvoiceTarget]);

  const generateInvoiceMessage = useCallback((p: any, invNum: string, nominal: number) => {
    const groupName = p.namaGroup || p.group?.namaGroup || "Bapak/Ibu";
    const kodeReg = p.kodeRegistrasi || p.group?.kodeRegistrasi || "-";
    const paketName = p.group?.keberangkatan?.namaPaket || "Paket Umroh VTU";
    const tgl = p.tanggal
      ? new Date(p.tanggal).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })
      : new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
    const bank = p.bankPengirim || formBank || "Bank Transfer";

    const totalBeban = orderItems
      .filter((it) => it.tipe === "penambahan")
      .reduce((sum, it) => sum + (it.nominal || 0), 0);
    const totalDiskon = orderItems
      .filter((it) => it.tipe === "pengurangan")
      .reduce((sum, it) => sum + (it.nominal || 0), 0);
    const tagihanBase = p.group?.totalTagihan || p.jumlah || nominal || 0;
    const tagihanDisesuaikan = Math.max(0, tagihanBase + totalBeban - totalDiskon);

    const orderLines = orderItems.length > 0 ? [
      ``,
      `📋 *Rincian Tambahan Layanan / Penyesuaian:*`,
      ...orderItems.map((item) => `• [${item.tipe === "penambahan" ? "+" : "-"}] ${item.nama}: Rp ${item.nominal.toLocaleString("id-ID")}`),
      `*Total Tagihan Disesuaikan:* Rp ${tagihanDisesuaikan.toLocaleString("id-ID")}`,
    ] : [];

    const baseUrl = typeof window !== "undefined" && window.location.origin
      ? window.location.origin
      : "https://vtuabadi.com";
    const downloadPdfUrl = `${baseUrl}/invoice/${encodeURIComponent(invNum)}?kode=${encodeURIComponent(kodeReg)}`;

    return [
      `*INVOICE PEMBAYARAN RESMI — VTU ABADI TRAVEL*`,
      `--------------------------------------------------`,
      `Assalamu'alaikum Warahmatullahi Wabarakatuh.`,
      ``,
      `Yth. *${groupName}* (Kode Reg: *${kodeReg}*)`,
      `Alhamdulillah, pembayaran Anda telah berhasil kami verifikasi dengan rincian sebagai berikut:`,
      ``,
      `📄 *No. Invoice:* ${invNum}`,
      `📦 *Paket Umroh:* ${paketName}`,
      `💳 *Jenis Pembayaran:* ${formJenis || "DP Pendaftaran"}`,
      `💰 *Nominal Terverifikasi:* Rp ${nominal.toLocaleString("id-ID")}`,
      ...orderLines,
      `📅 *Tanggal Transaksi:* ${tgl}`,
      `🏦 *Metode / Bank:* ${bank}`,
      `✅ *Status:* LUNAS / TERVERIFIKASI`,
      ``,
      `📥 *Unduh Dokumen PDF Resmi Secara Online:*`,
      `👉 ${downloadPdfUrl}`,
      ``,
      `Dokumen kuitansi & invoice ini merupakan bukti pembayaran resmi yang diterbitkan oleh PT Vauza Tamma Abadi (VTU ABADI Travel).`,
      `Semoga Allah SWT senantiasa memberikan kelancaran dan kemudahan dalam persiapan ibadah ke Baitullah.`,
      ``,
      `Wassalamu'alaikum Warahmatullahi Wabarakatuh.`,
      `*Finance & Operational Team — VTU ABADI Travel*`,
      `🌐 https://vtuabadi.com`,
    ].join("\n");
  }, [formJenis, formBank, orderItems]);

  const getInvoicePdfPayload = useCallback((p: any, invNum: string, nominal: number) => {
    const rawTgl = p.tanggal ? new Date(p.tanggal) : new Date();
    const formattedTgl = !isNaN(rawTgl.getTime())
      ? rawTgl.toLocaleDateString("id-ID", { day: "2-digit", month: "2-digit", year: "numeric" })
      : new Date().toLocaleDateString("id-ID", { day: "2-digit", month: "2-digit", year: "numeric" });

    const totalBeban = orderItems
      .filter((it) => it.tipe === "penambahan")
      .reduce((sum, it) => sum + (it.nominal || 0), 0);
    const totalDiskon = orderItems
      .filter((it) => it.tipe === "pengurangan")
      .reduce((sum, it) => sum + (it.nominal || 0), 0);

    const totalTagihanBase = p.group?.totalTagihan || p.jumlah || nominal || 0;
    const totalTagihanDisesuaikan = Math.max(0, totalTagihanBase + totalBeban - totalDiskon);
    const totalBayarVal = p.group?.totalPembayaran || 0;
    const sisaTagihanVal = Math.max(0, totalTagihanDisesuaikan - (totalBayarVal + (p.status === "verified" ? 0 : nominal)));

    // Payment History from group payments
    const history: any[] = [];
    if (p.group?.pembayaran && p.group.pembayaran.length > 0) {
      p.group.pembayaran.forEach((item: any) => {
        const itemTgl = item.tanggal ? new Date(item.tanggal).toLocaleDateString("id-ID", { day: "2-digit", month: "2-digit", year: "numeric" }) : "-";
        history.push({
          tanggal: itemTgl,
          metode: item.bankPengirim ? `TF ${item.bankPengirim.toUpperCase()}` : (item.metode || "TF MANDIRI").toUpperCase(),
          nominal: item.jumlah || 0,
        });
      });
    } else {
      history.push({
        tanggal: formattedTgl,
        metode: formBank ? `TF ${formBank.toUpperCase()}` : "TF MANDIRI",
        nominal: nominal || p.jumlah || 0,
      });
    }

    const membersToInclude = selectedAnggota.length > 0 ? selectedAnggota : (availableAnggota.length > 0 ? availableAnggota : [p.namaGroup || "Jamaah"]);

    const resolvedPersonName = formatInvoicePersonName(
      p.namaGroup || p.group?.namaGroup,
      p.group?.ketuaGroup?.namaLengkap || p.ketuaGroup?.namaLengkap
    );

    return {
      invoiceNumber: invNum,
      invoiceDate: formattedTgl,
      idReg: p.group?.kodeRegistrasi?.replace(/[^0-9]/g, "").slice(-4) || "3575",
      kode: p.group?.kodeRegistrasi?.slice(-3) || "104",
      namaGroup: resolvedPersonName,
      alamat: formAlamat || getManifestAlamat(p.group || p),
      telepon: targetPhone || p.group?.ketuaGroup?.nomorTelepon,
      kodeRegistrasi: p.kodeRegistrasi || p.group?.kodeRegistrasi || "-",
      namaPaket: p.group?.keberangkatan?.namaPaket || formCatatan || "PAKET UMROH 10 H SBY ( JED.C )",
      tipePaket: p.group?.keberangkatan?.packageType?.name || "SILVER",
      jumlahPax: membersToInclude.length || p.group?.paxCount || 2,
      hargaSatuanPaket: p.group?.keberangkatan?.hargaPaket || 37400000,
      tanggalBerangkat: p.group?.keberangkatan?.tanggalBerangkat
        ? new Date(p.group.keberangkatan.tanggalBerangkat).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })
        : undefined,
      hotelMekkah: formHotelMekkah || p.group?.keberangkatan?.hotelMekkah || "GRAND AL MASSA",
      hotelMadinah: formHotelMadinah || p.group?.keberangkatan?.hotelMadinah || "DURRAT AL EIMAN",
      anggota: membersToInclude,
      orderItems: orderItems,
      paymentHistory: history,
      totalTagihan: totalTagihanBase,
      totalPembayaran: totalBayarVal + (p.status === "verified" ? 0 : nominal),
      sisaTagihan: sisaTagihanVal,
      maksimalPelunasan: dueDate
        ? new Date(dueDate).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })
        : (h40Info?.h40Formatted || "-"),
      picName: resolvedPersonName,
      picPhone: targetPhone || p.group?.ketuaGroup?.nomorTelepon,
      picEmail: targetEmail || p.group?.ketuaGroup?.email,
      jenisPembayaran: formJenis || "DP Pendaftaran",
      nominal: nominal || p.jumlah || 0,
      metode: formMetode || p.metode || "Transfer",
      bank: formBank || p.bankPengirim || "MANDIRI",
      nomorRekening: formRekening || p.nomorRekening || "-",
      catatan: formCatatan || p.catatan || "",
      totalBebanTambahan: totalBeban,
      totalPengurangan: totalDiskon,
      totalTagihanDisesuaikan: totalTagihanDisesuaikan,
    };
  }, [dueDate, formJenis, formMetode, formBank, formRekening, formCatatan, formHotelMekkah, formHotelMadinah, formAlamat, selectedAnggota, availableAnggota, orderItems, targetPhone, targetEmail]);

  const handleDownloadPdf = useCallback((paymentObj?: any) => {
    const p = paymentObj || sendInvoiceTarget || selectedPayment;
    if (!p) return;
    const invNum = p.invoiceId || invoiceNumber;
    const nom = p.jumlah || formNominal;
    const payload = getInvoicePdfPayload(p, invNum, nom);
    downloadInvoicePdf(payload);
    setSuccessMessage(`File PDF Invoice ${invNum} berhasil diunduh!`);
    setShowSuccess(true);
  }, [sendInvoiceTarget, selectedPayment, invoiceNumber, formNominal, getInvoicePdfPayload]);

  const handleSendWhatsApp = async () => {
    if (!sendInvoiceTarget) return;
    const invNum = sendInvoiceTarget.invoiceId || invoiceNumber;
    const nom = sendInvoiceTarget.jumlah || formNominal;
    const payload = getInvoicePdfPayload(sendInvoiceTarget, invNum, nom);

    // 1. If Web Share API with file attachment is supported (Mobile Chrome/Safari), trigger native share
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      const shared = await shareInvoicePdf(payload);
      if (shared) return;
    }

    // 2. Download PDF file as local backup
    downloadInvoicePdf(payload);

    // 3. Open WhatsApp Web directly targeted at Jamaah phone number with prefilled text & online PDF link
    const cleanPhone = (targetPhone || "").replace(/[^0-9]/g, "").replace(/^0/, "62");
    const msg = generateInvoiceMessage(sendInvoiceTarget, invNum, nom);

    const isMobile = typeof navigator !== "undefined" && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    const waUrl = cleanPhone
      ? isMobile
        ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`
        : `https://web.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(msg)}`
      : `https://web.whatsapp.com/send?text=${encodeURIComponent(msg)}`;

    window.open(waUrl, "_blank");

    setSuccessMessage(`WhatsApp Web berhasil dibuka langsung ke nomor ${targetPhone || "Jamaah"}! Teks pesan & link PDF resmi sudah otomatis terisi.`);
    setShowSuccess(true);
  };

  const handleSendEmail = () => {
    if (!sendInvoiceTarget) return;
    const invNum = sendInvoiceTarget.invoiceId || invoiceNumber;
    const nom = sendInvoiceTarget.jumlah || formNominal;
    const payload = getInvoicePdfPayload(sendInvoiceTarget, invNum, nom);

    // Download PDF for user to attach
    downloadInvoicePdf(payload);

    const subject = `Invoice Pembayaran Resmi VTU ABADI — ${invNum} (${sendInvoiceTarget.namaGroup || sendInvoiceTarget.kodeRegistrasi})`;
    const msg = generateInvoiceMessage(sendInvoiceTarget, invNum, nom);
    const mailtoUrl = `mailto:${targetEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(msg)}`;
    window.location.href = mailtoUrl;

    setSuccessMessage("File PDF Invoice telah diunduh untuk dilampirkan ke email!");
    setShowSuccess(true);
  };

  const handleCopyInvoiceText = () => {
    if (!sendInvoiceTarget) return;
    const msg = generateInvoiceMessage(
      sendInvoiceTarget,
      sendInvoiceTarget.invoiceId || invoiceNumber,
      sendInvoiceTarget.jumlah || formNominal
    );
    navigator.clipboard.writeText(msg);
    setCopiedInvoiceText(true);
    setTimeout(() => setCopiedInvoiceText(false), 2500);
  };

  const handleApproveFromForm = async () => {
    if (!selectedPayment) return;
    setSubmittingInvoice(true);
    try {
      const res = await fetch(`/api/pembayaran/${selectedPayment.id}/approve`, { method: "POST" });
      if (!res.ok) throw new Error("Gagal menyetujui");

      setSuccessMessage(`Invoice ${invoiceNumber} untuk ${selectedPayment.namaGroup || "Group"} (${formatCurrency(formNominal)}) berhasil diterbitkan!`);
      setShowSuccess(true);

      const updated = { ...selectedPayment, status: "verified", invoiceId: invoiceNumber, jumlah: formNominal };
      setQueue((prev) =>
        prev.map((p) =>
          p.id === selectedPayment.id ? updated : p
        )
      );
      setSelectedPayment(updated);
      setSendInvoiceTarget(updated);

      // Auto-generate & download official PDF invoice upon issuance
      const payload = getInvoicePdfPayload(updated, invoiceNumber, formNominal);
      downloadInvoicePdf(payload);
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

  const getMetodeBadge = (p: any) => {
    const m = (p.metode || "").toLowerCase();
    if (m === "cash" || m === "tunai") {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
          Tunai
        </span>
      );
    }
    if (m === "qris") {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
          QRIS
        </span>
      );
    }
    if (m === "virtual_account" || m === "va") {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
          VA
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-stone-500/10 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700">
        Transfer
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

    // Filter Tanggal
    if (datePreset !== "all") {
      const rawDate = p.tanggal || p.createdAt;
      if (rawDate) {
        const itemDate = new Date(rawDate);
        if (!isNaN(itemDate.getTime())) {
          const itemYMD = itemDate.toISOString().slice(0, 10);
          const now = new Date();
          const todayYMD = now.toISOString().slice(0, 10);

          if (datePreset === "today") {
            if (itemYMD !== todayYMD) return false;
          } else if (datePreset === "yesterday") {
            const yest = new Date(now);
            yest.setDate(yest.getDate() - 1);
            if (itemYMD !== yest.toISOString().slice(0, 10)) return false;
          } else if (datePreset === "this_week") {
            const sevenDaysAgo = new Date(now);
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
            const sevenDaysYMD = sevenDaysAgo.toISOString().slice(0, 10);
            if (itemYMD < sevenDaysYMD) return false;
          } else if (datePreset === "this_month") {
            const itemMonth = itemYMD.slice(0, 7);
            const currentMonth = todayYMD.slice(0, 7);
            if (itemMonth !== currentMonth) return false;
          } else if (datePreset === "custom") {
            if (startDate && itemYMD < startDate) return false;
            if (endDate && itemYMD > endDate) return false;
          }
        }
      }
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

  // Calculate group financial summaries with order adjustments
  const totalBebanTambahan = orderItems
    .filter((it) => it.tipe === "penambahan")
    .reduce((sum, it) => sum + (it.nominal || 0), 0);

  const totalPengurangan = orderItems
    .filter((it) => it.tipe === "pengurangan")
    .reduce((sum, it) => sum + (it.nominal || 0), 0);

  const groupTotalTagihanBase = selectedPayment?.group?.totalTagihan || selectedPayment?.jumlah || 0;
  const groupTotalTagihanDisesuaikan = Math.max(0, groupTotalTagihanBase + totalBebanTambahan - totalPengurangan);
  const groupTotalBayar = selectedPayment?.group?.totalPembayaran || 0;
  const groupSisaTagihan = Math.max(
    0,
    groupTotalTagihanDisesuaikan - (groupTotalBayar + (selectedPayment?.status === "verified" ? 0 : formNominal))
  );

  const paymentHistoryList =
    selectedPayment?.group?.pembayaran && selectedPayment.group.pembayaran.length > 0
      ? selectedPayment.group.pembayaran
      : selectedPayment
      ? [selectedPayment]
      : [];

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
          {/* Date Filter Dropdown & Custom Range */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <div className="relative">
              <Calendar className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <select
                value={datePreset}
                onChange={(e) => setDatePreset(e.target.value)}
                className="pl-8 pr-2.5 py-1.5 bg-background border rounded-lg text-xs font-medium focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="all">📅 Semua Tanggal</option>
                <option value="today">Hari Ini</option>
                <option value="yesterday">Kemarin</option>
                <option value="this_week">7 Hari Terakhir</option>
                <option value="this_month">Bulan Ini</option>
                <option value="custom">Rentang Custom...</option>
              </select>
            </div>

            {datePreset === "custom" && (
              <div className="flex items-center gap-1 bg-background border rounded-lg px-2 py-1">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="bg-transparent text-xs font-mono focus:outline-none"
                  title="Tanggal Mulai"
                />
                <span className="text-muted-foreground text-[10px]">s/d</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="bg-transparent text-xs font-mono focus:outline-none"
                  title="Tanggal Selesai"
                />
                {(startDate || endDate) && (
                  <button
                    type="button"
                    onClick={() => {
                      setStartDate("");
                      setEndDate("");
                    }}
                    className="p-0.5 text-muted-foreground hover:text-foreground"
                    title="Reset rentang tanggal"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            )}
          </div>

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
          <div className="relative flex-1 sm:w-44">
            <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari ID Reg / Group..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-background border rounded-lg text-xs font-medium placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Quick Reset All Filters Button */}
          {(datePreset !== "all" || statusFilter !== "all" || jenisFilter !== "all" || searchQuery) && (
            <button
              type="button"
              onClick={() => {
                setDatePreset("all");
                setStartDate("");
                setEndDate("");
                setStatusFilter("all");
                setJenisFilter("all");
                setSearchQuery("");
              }}
              className="px-2 py-1.5 text-xs text-amber-600 hover:text-amber-700 dark:text-amber-400 font-bold flex items-center gap-1 hover:bg-amber-500/10 rounded-lg transition-colors"
              title="Reset Semua Filter"
            >
              <X className="w-3.5 h-3.5" />
              Reset
            </button>
          )}

          {/* Tombol Hapus Semua Data Pembayaran Percobaan */}
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={() => setShowDeleteAllPaymentsModal(true)}
            disabled={queue.length === 0 || isDeletingPayment}
            className="h-8 px-2.5 text-xs font-bold gap-1.5 bg-red-600 hover:bg-red-700 text-white shadow-xs cursor-pointer ml-auto"
            title="Hapus seluruh antrian data pembayaran percobaan"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Hapus Data Percobaan ({queue.length})</span>
          </Button>
        </div>
      </div>

      {/* 2-CANVAS SPLIT LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* ========================================================= */}
        {/* CANVAS KIRI: TABEL PEMBAYARAN MASUK (NARROWER / COMPACT)  */}
        {/* ========================================================= */}
        <div className={selectedPayment ? "lg:col-span-5 xl:col-span-4 space-y-4" : "lg:col-span-12 space-y-4"}>
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
                        <th className="py-2.5 px-2.5 w-7 text-center">#</th>
                        <th className="py-2.5 px-2.5">ID Reg & Group</th>
                        <th className="py-2.5 px-2.5">Jenis</th>
                        <th className="py-2.5 px-2.5 text-right">Nominal</th>
                        {!selectedPayment && <th className="py-2.5 px-2.5 text-center">Metode</th>}
                        <th className="py-2.5 px-2 text-center w-9">Bukti</th>
                        {!selectedPayment && <th className="py-2.5 px-3 text-center">Status</th>}
                        {!selectedPayment && <th className="py-2.5 px-3 text-center">Aksi Invoice</th>}
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
                            <td className="px-2.5 py-2.5 text-center text-muted-foreground">{idx + 1}</td>
                            <td className="px-2.5 py-2.5">
                              <p className="font-bold text-foreground leading-tight">{p.namaGroup ?? p.groupId}</p>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="font-mono text-[10px] text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1 rounded font-bold">
                                  {p.kodeRegistrasi ?? "-"}
                                </span>
                                <span className="text-[10px] text-muted-foreground">
                                  {formatDate(p.tanggal)}
                                </span>
                              </div>
                            </td>
                            <td className="px-2.5 py-2.5">{getPaymentTypeBadge(p)}</td>
                            <td className="px-2.5 py-2.5 text-right font-extrabold text-foreground font-mono">
                              {formatCurrency(p.jumlah)}
                            </td>
                            {!selectedPayment && (
                              <td className="px-2.5 py-2.5 text-center">
                                {getMetodeBadge(p)}
                              </td>
                            )}
                            <td className="px-2 py-2.5 text-center" onClick={(e) => e.stopPropagation()}>
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
                            {!selectedPayment && (
                              <td className="px-3 py-3 text-center">
                                {p.status === "verified" ? (
                                  <Badge variant="success" className="text-[10px]">Verified</Badge>
                                ) : p.status === "rejected" ? (
                                  <Badge variant="destructive" className="text-[10px]">Ditolak</Badge>
                                ) : (
                                  <Badge variant="warning" className="text-[10px]">Pending</Badge>
                                )}
                              </td>
                            )}
                            {!selectedPayment && (
                              <td className="px-3 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                                <div className="flex items-center justify-center gap-1">
                                  {p.status === "verified" ? (
                                    <Button
                                      size="sm"
                                      className="h-7 text-xs font-bold gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                                      onClick={() => {
                                        handleSelectPayment(p);
                                        setSendInvoiceTarget(p);
                                      }}
                                      title="Kirim Invoice ke Jamaah"
                                    >
                                      <Send className="h-3.5 w-3.5" />
                                      Kirim Invoice
                                    </Button>
                                  ) : (
                                    <>
                                      <Button
                                        size="sm"
                                        variant={isSelected ? "default" : "outline"}
                                        className={`h-7 text-xs font-bold gap-1 ${
                                          isSelected
                                            ? "bg-amber-600 hover:bg-amber-700 text-white"
                                            : "hover:bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700"
                                        }`}
                                        onClick={() => handleSelectPayment(p)}
                                      >
                                        <FileText className="h-3.5 w-3.5" />
                                        Terbitkan
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
                                    </>
                                  )}

                                  {/* Tombol Hapus Satuan */}
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 w-7 p-0 text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 cursor-pointer ml-0.5"
                                    title="Hapus data pembayaran / percobaan ini"
                                    onClick={() => setDeletePaymentTarget(p)}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </td>
                            )}
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
        {/* CANVAS KANAN: FORM INVOICE GENERATOR / PREVIEW (WIDER)    */}
        {/* ========================================================= */}
        {selectedPayment ? (
          <div className="lg:col-span-7 xl:col-span-8 sticky top-4 space-y-4">
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
                      <p className="font-extrabold text-foreground text-sm">
                        {formatInvoicePersonName(
                          selectedPayment.namaGroup || selectedPayment.group?.namaGroup,
                          selectedPayment.group?.ketuaGroup?.namaLengkap || selectedPayment.ketuaGroup?.namaLengkap
                        )}
                      </p>
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
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-bold text-foreground">Jatuh Tempo</label>
                        {h40Info && (
                          <span
                            className={`text-[9.5px] font-bold px-1.5 py-0.5 rounded border ${
                              h40Info.isLate
                                ? "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300 border-red-300 dark:border-red-800 animate-pulse"
                                : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800"
                            }`}
                          >
                            {h40Info.isLate ? "⚠️ ≤ H-40 Mepet" : "Standar H-40"}
                          </span>
                        )}
                      </div>
                      <Input
                        type="date"
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                        className={`h-8 text-xs mt-1 font-mono ${
                          h40Info?.isLate ? "border-red-500 focus:ring-red-500 bg-red-50/40 dark:bg-red-950/20 font-bold" : ""
                        }`}
                      />
                    </div>
                  </div>

                  {/* Warning Alert if Registered at or less than H-40 */}
                  {h40Info?.isLate ? (
                    <div className="p-3 bg-red-50/95 dark:bg-red-950/40 border-2 border-red-400 dark:border-red-800 rounded-xl flex items-start gap-2.5 text-red-900 dark:text-red-200">
                      <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5 animate-pulse" />
                      <div className="text-[11px] space-y-1">
                        <p className="font-black text-red-800 dark:text-red-300">
                          ⚠️ PERINGATAN: PENDAFTARAN PADA RENTANG H-40 KEBERANGKATAN ({h40Info.daysToDeparture} HARI LAGI)
                        </p>
                        <p className="leading-relaxed text-red-700 dark:text-red-300">
                          Batas akhir standar pelunasan sistem adalah <strong>H-40 Keberangkatan ({h40Info.h40Formatted})</strong>. Karena pendaftaran dilakukan saat sisa waktu $\le$ 40 hari (atau melewati batas H-40), silakan <strong>sesuaikan dan ubah tanggal jatuh tempo pembayaran pelunasan secara manual</strong> pada kolom di atas!
                        </p>
                      </div>
                    </div>
                  ) : h40Info ? (
                    <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-lg flex items-center gap-2 text-emerald-800 dark:text-emerald-300 text-[11px]">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                      <span>
                        Tenggat batas akhir pelunasan otomatis diset ke <strong>H-40 Keberangkatan ({h40Info.h40Formatted})</strong>.
                      </span>
                    </div>
                  ) : null}

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

                {/* 2.5. Hotel Pesanan & Anggota Jamaah / Split Invoice */}
                <div className="p-3 bg-muted/40 rounded-xl border space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Building className="w-4 h-4 text-emerald-600" />
                      <span className="font-bold text-foreground text-xs">Hotel Pesanan &amp; Anggota (A/N)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10.5px] font-extrabold bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30">
                        🏷️ Klaster Pendaftaran: {selectedPayment.group?.keberangkatan?.packageType?.name || selectedPayment.group?.keberangkatan?.tipePaket || selectedPayment.packageType || "SILVER"}
                      </span>
                      <Badge variant="outline" className="text-[10px]">
                        {selectedAnggota.length} / {availableAnggota.length || 1} Jamaah
                      </Badge>
                    </div>
                  </div>

                  {/* Hotel Makkah & Madinah Inputs */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10.5px] font-bold text-foreground">Hotel Makkah</label>
                      <Input
                        type="text"
                        value={formHotelMekkah}
                        onChange={(e) => setFormHotelMekkah(e.target.value)}
                        placeholder="Contoh: GRAND AL MASSA"
                        className="h-8 text-xs font-semibold mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-[10.5px] font-bold text-foreground">Hotel Madinah</label>
                      <Input
                        type="text"
                        value={formHotelMadinah}
                        onChange={(e) => setFormHotelMadinah(e.target.value)}
                        placeholder="Contoh: DURRAT AL EIMAN"
                        className="h-8 text-xs font-semibold mt-1"
                      />
                    </div>
                  </div>

                  {/* Alamat Jamaah */}
                  <div>
                    <label className="text-[10.5px] font-bold text-foreground">Alamat Jamaah / Kota</label>
                    <Input
                      type="text"
                      value={formAlamat}
                      onChange={(e) => setFormAlamat(e.target.value)}
                      placeholder="Alamat lengkap jamaah..."
                      className="h-8 text-xs mt-1"
                    />
                  </div>

                  {/* Anggota Jamaah (A/N) Selection with Split Invoice Support */}
                  {availableAnggota.length > 0 && (
                    <div className="pt-2 border-t space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-[10.5px] font-bold text-foreground flex items-center gap-1">
                          <Users className="w-3.5 h-3.5 text-primary" />
                          Nama Anggota Jamaah (A/N) di Invoice:
                        </label>
                        <div className="flex gap-1.5">
                          <button
                            type="button"
                            onClick={() => setSelectedAnggota(availableAnggota)}
                            className="text-[10px] text-primary hover:underline font-bold cursor-pointer"
                          >
                            Pilih Semua
                          </button>
                          <span className="text-[10px] text-muted-foreground">•</span>
                          <button
                            type="button"
                            onClick={() => setSelectedAnggota([])}
                            className="text-[10px] text-muted-foreground hover:underline cursor-pointer"
                          >
                            Reset
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-1.5 bg-background p-2 rounded-lg border max-h-36 overflow-y-auto">
                        {availableAnggota.map((nama, idx) => {
                          const isChecked = selectedAnggota.includes(nama);
                          return (
                            <label
                              key={nama + idx}
                              className={`flex items-center gap-2 p-1.5 rounded text-xs cursor-pointer transition-colors ${
                                isChecked ? "bg-primary/5 font-semibold text-foreground" : "text-muted-foreground hover:bg-muted"
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedAnggota((prev) => [...prev, nama]);
                                  } else {
                                    setSelectedAnggota((prev) => prev.filter((n) => n !== nama));
                                  }
                                }}
                                className="rounded text-primary focus:ring-primary h-3.5 w-3.5"
                              />
                              <span>{idx + 1}. {nama}</span>
                            </label>
                          );
                        })}
                      </div>
                      <p className="text-[9.5px] text-muted-foreground">
                        💡 Centang nama anggota yang ditagihkan. Jika jamaah meminta invoice split, centang anggota terkait saja.
                      </p>
                    </div>
                  )}
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

                {/* 3.5. Penyesuaian Biaya & Tambahan Order (Layanan Ekstra / Potongan) */}
                <div className="p-3 bg-gradient-to-br from-amber-500/5 via-primary/5 to-emerald-500/5 rounded-xl border border-amber-500/20 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-lg">
                        <ShoppingBag className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                          Tambahan Order & Penyesuaian Biaya
                          {orderItems.length > 0 && (
                            <Badge variant="warning" className="text-[10px] px-1.5 py-0">
                              {orderItems.length} Item
                            </Badge>
                          )}
                        </h4>
                        <p className="text-[10px] text-muted-foreground">
                          Tambah beban (kereta cepat, upgrade kamar, seragam) atau potongan biaya.
                        </p>
                      </div>
                    </div>

                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs font-bold border-amber-500/40 text-amber-700 dark:text-amber-300 hover:bg-amber-500/10 gap-1"
                      onClick={() => {
                        const initPreset = ORDER_PRESETS[0] || {
                          category: "fast_train",
                          defaultName: "Tiket Kereta Cepat Haramain (Mekkah - Madinah)",
                          type: "penambahan" as const,
                          defaultNominal: 1250000,
                        };
                        setNewOrderCategory(initPreset.category);
                        setNewOrderName(initPreset.defaultName);
                        setNewOrderType(initPreset.type);
                        setNewOrderNominal(initPreset.defaultNominal);
                        setShowAddOrderModal(true);
                      }}
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      Tambah Order
                    </Button>
                  </div>

                  {/* Quick Preset Chips for 1-Click Adding */}
                  <div>
                    <p className="text-[10px] font-bold uppercase text-muted-foreground mb-1.5">Pilih Cepat Kategori Layanan:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {ORDER_PRESETS.map((preset) => (
                        <button
                          key={preset.category}
                          type="button"
                          onClick={() => {
                            const newItem: InvoiceOrderItem = {
                              id: `order-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
                              kategori: preset.category,
                              nama: preset.defaultName,
                              tipe: preset.type,
                              nominal: preset.defaultNominal,
                            };
                            setOrderItems((prev) => [...prev, newItem]);
                          }}
                          className="px-2 py-1 bg-background hover:bg-muted border rounded-lg text-[10.5px] font-medium text-foreground flex items-center gap-1 transition-colors shadow-2xs cursor-pointer"
                          title={`Klik untuk tambah ${preset.label}`}
                        >
                          <span>{preset.icon}</span>
                          <span>{preset.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Active Order Items List */}
                  {orderItems.length > 0 ? (
                    <div className="space-y-2 pt-1 border-t border-border/60">
                      {orderItems.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between gap-2 p-2 bg-background/90 rounded-lg border text-xs shadow-2xs"
                        >
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <span className={`px-1.5 py-0.5 rounded text-[9.5px] font-extrabold uppercase shrink-0 ${
                              item.tipe === "penambahan"
                                ? "bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800"
                                : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800"
                            }`}>
                              {item.tipe === "penambahan" ? "+ Beban" : "- Potongan"}
                            </span>
                            <input
                              type="text"
                              value={item.nama}
                              onChange={(e) => {
                                const val = e.target.value;
                                setOrderItems((prev) =>
                                  prev.map((it) => (it.id === item.id ? { ...it, nama: val } : it))
                                );
                              }}
                              className="bg-transparent border-b border-dashed border-border text-xs font-semibold text-foreground flex-1 min-w-0 focus:outline-none focus:border-primary"
                              placeholder="Nama layanan / beban"
                            />
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="text-[10px] text-muted-foreground font-mono">Rp</span>
                            <input
                              type="number"
                              value={item.nominal || ""}
                              onChange={(e) => {
                                const val = Number(e.target.value) || 0;
                                setOrderItems((prev) =>
                                  prev.map((it) => (it.id === item.id ? { ...it, nominal: val } : it))
                                );
                              }}
                              className="w-24 h-7 text-xs font-mono font-bold text-right bg-muted/40 border rounded px-1.5 focus:outline-none focus:ring-1 focus:ring-primary"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                setOrderItems((prev) => prev.filter((it) => it.id !== item.id));
                              }}
                              className="p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition-colors"
                              title="Hapus item order"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-2.5 rounded-lg border border-dashed text-center text-muted-foreground text-[11px]">
                      Belum ada beban tambahan atau potongan order. Klik chip preset di atas atau tombol Tambah Order untuk menambahkan.
                    </div>
                  )}
                </div>

                {/* 3.75. Tabel Rincian Tagihan & Potongan Group (Di Atas Riwayat Pembayaran) */}
                <div className="p-3 bg-stone-50 dark:bg-stone-900/60 rounded-xl border border-stone-200 dark:border-stone-800 space-y-2 text-xs">
                  <div className="flex items-center justify-between border-b pb-2">
                    <div className="flex items-center gap-1.5">
                      <div className="p-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-md">
                        <Receipt className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="font-bold text-foreground text-xs">Rincian Tagihan &amp; Potongan Group</h4>
                        <p className="text-[10px] text-muted-foreground">
                          Rincian komponen tagihan dasar paket, beban tambahan order, dan potongan diskon.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="overflow-x-auto rounded-lg border bg-background">
                    <table className="w-full text-left text-[11px]">
                      <thead>
                        <tr className="border-b bg-muted/60 text-muted-foreground font-bold uppercase tracking-wider text-[10px]">
                          <th className="py-2 px-2.5">Deskripsi Item Tagihan / Potongan</th>
                          <th className="py-2 px-2.5">Kategori</th>
                          <th className="py-2 px-2.5 text-center">Qty</th>
                          <th className="py-2 px-2.5 text-right">Harga / Pax</th>
                          <th className="py-2 px-2.5 text-right">Total Nominal</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y text-xs">
                        {/* Base Package Main Billing Item */}
                        <tr className="hover:bg-muted/30 transition-colors">
                          <td className="py-2 px-2.5 font-medium text-foreground">
                            {selectedPayment.group?.keberangkatan?.namaPaket || "Tagihan Paket Utama"}
                          </td>
                          <td className="py-2 px-2.5">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                              Tagihan Utama
                            </span>
                          </td>
                          <td className="py-2 px-2.5 text-center font-mono font-bold text-slate-700 dark:text-slate-300">
                            {selectedPayment.group?.jumlahAnggota || availableAnggota.length || 1} Pax
                          </td>
                          <td className="py-2 px-2.5 text-right font-mono tabular-nums text-stone-600 dark:text-stone-400">
                            {formatCurrency(selectedPayment.group?.keberangkatan?.hargaPaket || (groupTotalTagihanBase / Math.max(1, selectedPayment.group?.jumlahAnggota || 1)))}
                          </td>
                          <td className="py-2 px-2.5 text-right font-mono font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">
                            {formatCurrency(groupTotalTagihanBase)}
                          </td>
                        </tr>

                        {/* Dynamic Order Items (Tambahan / Potongan) */}
                        {orderItems.map((item) => {
                          const isPotongan = item.tipe === "pengurangan";
                          return (
                            <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                              <td className="py-2 px-2.5 font-medium text-foreground">
                                {item.nama}
                              </td>
                              <td className="py-2 px-2.5">
                                {isPotongan ? (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                                    - Potongan
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
                                    + Tambahan
                                  </span>
                                )}
                              </td>
                              <td className="py-2 px-2.5 text-center font-mono font-bold text-slate-700 dark:text-slate-300">
                                1 Item
                              </td>
                              <td className="py-2 px-2.5 text-right font-mono tabular-nums text-stone-600 dark:text-stone-400">
                                {formatCurrency(item.nominal)}
                              </td>
                              <td className={`py-2 px-2.5 text-right font-mono font-bold tabular-nums ${
                                isPotongan ? "text-amber-600 dark:text-amber-400" : "text-emerald-700 dark:text-emerald-400"
                              }`}>
                                {isPotongan ? `- ${formatCurrency(item.nominal)}` : formatCurrency(item.nominal)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr className="border-t-2 border-stone-200 dark:border-stone-800 bg-stone-50/80 dark:bg-stone-900/80 font-bold text-xs">
                          <td colSpan={4} className="py-2 px-2.5 text-right uppercase tracking-wider text-muted-foreground">
                            Total Tagihan Akhir (Net)
                          </td>
                          <td className="py-2 px-2.5 text-right font-mono text-sm text-emerald-700 dark:text-emerald-400">
                            {formatCurrency(groupTotalTagihanDisesuaikan)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>

                {/* 3.8. Riwayat Pembayaran (Di Atas Kalkulasi Tagihan Group) */}
                <div className="p-3 bg-muted/30 rounded-xl border border-emerald-500/30 dark:border-emerald-500/20 shadow-2xs space-y-2.5 text-xs">
                  <div className="flex items-center justify-between border-b pb-2">
                    <div className="flex items-center gap-1.5">
                      <div className="p-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-md">
                        <Receipt className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="font-bold text-foreground text-xs">Riwayat Pembayaran</h4>
                        <p className="text-[10px] text-muted-foreground">
                          Daftar riwayat transaksi pembayaran yang telah masuk untuk grup / jamaah ini.
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-[10.5px] font-mono font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800">
                      Total Masuk: {formatCurrency(groupTotalBayar || selectedPayment?.jumlah || 0)}
                    </Badge>
                  </div>

                  {/* Payment History Table */}
                  {paymentHistoryList.length > 0 ? (
                    <div className="overflow-x-auto rounded-lg border bg-background max-h-48 overflow-y-auto">
                      <table className="w-full text-left text-[11px]">
                        <thead>
                          <tr className="border-b bg-muted/60 text-muted-foreground font-bold uppercase tracking-wider text-[10px] sticky top-0 bg-muted/90 backdrop-blur-xs">
                            <th className="py-2 px-2.5 text-center w-8">#</th>
                            <th className="py-2 px-2.5">Tanggal</th>
                            <th className="py-2 px-2.5">Tahap / Jenis</th>
                            <th className="py-2 px-2.5">Metode &amp; Bank</th>
                            <th className="py-2 px-2.5 text-right">Nominal</th>
                            <th className="py-2 px-2.5 text-center">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y text-xs font-medium">
                          {paymentHistoryList.map((p: any, idx: number) => {
                            const isCurrent = p.id === selectedPayment.id;
                            return (
                              <tr
                                key={p.id || idx}
                                className={isCurrent ? "bg-amber-500/10 font-bold" : "hover:bg-muted/30"}
                              >
                                <td className="py-2 px-2.5 text-center text-muted-foreground font-mono">{idx + 1}</td>
                                <td className="py-2 px-2.5 font-semibold text-foreground whitespace-nowrap">
                                  {p.tanggal ? formatDate(p.tanggal) : "-"}
                                </td>
                                <td className="py-2 px-2.5 font-bold text-slate-800 dark:text-slate-200">
                                  {p.jenisPembayaran || p.tahap || "Pembayaran"}
                                </td>
                                <td className="py-2 px-2.5 text-muted-foreground whitespace-nowrap">
                                  <span className="font-semibold text-foreground uppercase">
                                    {p.bankPengirim ? `Transfer ${p.bankPengirim}` : p.metode || "Transfer"}
                                  </span>
                                  {p.noRekening ? <span className="font-mono text-[10px] block text-stone-500">({p.noRekening})</span> : null}
                                </td>
                                <td className="py-2 px-2.5 text-right font-extrabold font-mono text-emerald-700 dark:text-emerald-400 whitespace-nowrap">
                                  {formatCurrency(p.jumlah || 0)}
                                </td>
                                <td className="py-2 px-2.5 text-center whitespace-nowrap">
                                  {p.status === "verified" ? (
                                    <Badge variant="success" className="text-[9.5px] px-1.5 py-0">Verified</Badge>
                                  ) : p.status === "rejected" ? (
                                    <Badge variant="destructive" className="text-[9.5px] px-1.5 py-0">Ditolak</Badge>
                                  ) : (
                                    <Badge variant="warning" className="text-[9.5px] px-1.5 py-0">Pending</Badge>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="p-3 text-center text-muted-foreground text-[11px] border border-dashed rounded-lg bg-muted/20">
                      Belum ada riwayat pembayaran yang tercatat sebelumnya.
                    </div>
                  )}
                </div>

                {/* 4. Ringkasan Keuangan Group */}
                <div className="p-3 bg-muted/60 rounded-lg border space-y-1.5 text-[11px]">
                  <p className="font-bold text-foreground text-xs border-b pb-1">Kalkulasi Tagihan Group</p>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Biaya Paket Dasar:</span>
                    <span className="font-mono font-medium text-foreground">{formatCurrency(groupTotalTagihanBase)}</span>
                  </div>

                  {totalBebanTambahan > 0 && (
                    <div className="flex justify-between text-amber-700 dark:text-amber-300 font-medium">
                      <span>+ Tambahan Beban Order:</span>
                      <span className="font-mono font-bold">+ {formatCurrency(totalBebanTambahan)}</span>
                    </div>
                  )}

                  {totalPengurangan > 0 && (
                    <div className="flex justify-between text-emerald-700 dark:text-emerald-300 font-medium">
                      <span>- Pengurangan / Diskon:</span>
                      <span className="font-mono font-bold">- {formatCurrency(totalPengurangan)}</span>
                    </div>
                  )}

                  {orderItems.length > 0 && (
                    <div className="flex justify-between font-bold text-foreground border-t border-dashed pt-1">
                      <span>Total Tagihan Disesuaikan:</span>
                      <span className="font-mono font-bold">{formatCurrency(groupTotalTagihanDisesuaikan)}</span>
                    </div>
                  )}

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
                  {selectedPayment.status === "verified" ? (
                    <div className="space-y-2">
                      <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-900 dark:text-emerald-300 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                          <span className="text-xs font-semibold">Invoice telah diterbitkan & diverifikasi</span>
                        </div>
                        <Badge variant="success" className="text-[10px]">Terbit</Badge>
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        <Button
                          className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-9 text-xs gap-1.5 shadow-sm"
                          onClick={() => setSendInvoiceTarget(selectedPayment)}
                        >
                          <Send className="h-4 w-4" />
                          Kirim Invoice (WhatsApp / Email)
                        </Button>
                        <Button
                          variant="outline"
                          className="font-bold h-9 text-xs gap-1.5 border-emerald-600/30 text-emerald-700 hover:bg-emerald-50 dark:text-emerald-300"
                          onClick={() => {
                            const inv = selectedPayment.invoiceId || invoiceNumber;
                            const kode = selectedPayment.kodeRegistrasi || selectedPayment.groupId || "";
                            window.open(`/invoice/${encodeURIComponent(inv)}?kode=${encodeURIComponent(kode)}`, "_blank");
                          }}
                        >
                          <Eye className="h-4 w-4" />
                          Preview Invoice
                        </Button>
                        <Button
                          variant="outline"
                          className="font-bold h-9 text-xs gap-1.5 border-emerald-600/30 text-emerald-700 hover:bg-emerald-50 dark:text-emerald-300"
                          onClick={() => handleDownloadPdf(selectedPayment)}
                        >
                          <Download className="h-4 w-4" />
                          Unduh PDF
                        </Button>
                        <Button
                          variant="outline"
                          className="font-bold h-9 text-xs gap-1.5"
                          onClick={() => window.print()}
                        >
                          <Printer className="h-4 w-4" />
                          Cetak
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-2 flex-wrap">
                      <Button
                        className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-9 text-xs"
                        disabled={submittingInvoice}
                        onClick={handleApproveFromForm}
                      >
                        <CheckCircle2 className="h-4 w-4 mr-1.5" />
                        {submittingInvoice ? "Menerbitkan..." : "Approve & Terbitkan Invoice"}
                      </Button>
                      <Button
                        variant="outline"
                        className="font-bold h-9 text-xs gap-1.5 border-emerald-600/30 text-emerald-700 hover:bg-emerald-50 dark:text-emerald-300"
                        onClick={() => {
                          const inv = selectedPayment.invoiceId || invoiceNumber;
                          const kode = selectedPayment.kodeRegistrasi || selectedPayment.groupId || "";
                          window.open(`/invoice/${encodeURIComponent(inv)}?kode=${encodeURIComponent(kode)}`, "_blank");
                        }}
                      >
                        <Eye className="h-4 w-4" />
                        Preview Invoice
                      </Button>
                      <Button
                        variant="outline"
                        className="font-bold h-9 text-xs gap-1.5 border-emerald-600/30 text-emerald-700 hover:bg-emerald-50 dark:text-emerald-300"
                        onClick={() => handleDownloadPdf(selectedPayment)}
                      >
                        <Download className="h-4 w-4" />
                        Unduh PDF
                      </Button>
                      <Button
                        variant="outline"
                        className="font-bold h-9 text-xs gap-1.5"
                        onClick={() => window.print()}
                      >
                        <Printer className="h-4 w-4" />
                        Cetak
                      </Button>
                    </div>
                  )}

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

                  {/* Tombol Hapus Transaksi & Data Percobaan Ini */}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="w-full text-xs font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 h-8 gap-1.5 border border-dashed border-red-300 dark:border-red-800 cursor-pointer mt-1"
                    onClick={() => setDeletePaymentTarget(selectedPayment)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Hapus Data Transaksi / Percobaan Ini</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : null}
      </div>

      {/* ========================================================= */}
      {/* MODAL KIRIM INVOICE (WHATSAPP & EMAIL) */}
      {/* ========================================================= */}
      <Modal
        open={sendInvoiceTarget !== null}
        onClose={() => setSendInvoiceTarget(null)}
        title="Kirim Invoice Resmi ke Jamaah / Group"
        description={`Nomor Invoice: ${sendInvoiceTarget?.invoiceId || invoiceNumber} — ${sendInvoiceTarget?.namaGroup || "Group"}`}
        size="lg"
      >
        {sendInvoiceTarget && (
          <div className="space-y-4 pt-1">
            {/* Official PDF Document Card */}
            <div className="flex items-center justify-between p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-600 text-white rounded-lg shadow-xs">
                  <FileDown className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-emerald-950 dark:text-emerald-200">
                      Invoice-{(sendInvoiceTarget?.invoiceId || invoiceNumber).replace(/[^a-zA-Z0-9-_]/g, "")}.pdf
                    </span>
                    <Badge variant="success" className="text-[9px] px-1.5 py-0">Dokumen PDF Siap</Badge>
                  </div>
                  <p className="text-[10px] text-emerald-800 dark:text-emerald-400 mt-0.5">
                    Dokumen resmi kuitansi & invoice PT Vauza Tamma Abadi (Otomatis terlampir saat kirim)
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs font-bold border-emerald-600/40 text-emerald-700 hover:bg-emerald-100 dark:text-emerald-300 gap-1.5"
                onClick={() => handleDownloadPdf(sendInvoiceTarget)}
              >
                <Download className="h-3.5 w-3.5" />
                Unduh PDF
              </Button>
            </div>

            {/* Recipient Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-muted/40 rounded-xl text-xs">
              <div>
                <label className="text-[10px] font-bold uppercase text-muted-foreground">Nomor WhatsApp PIC / Jamaah</label>
                <Input
                  className="mt-1 h-8 text-xs font-mono"
                  placeholder="Contoh: 081234567890"
                  value={targetPhone}
                  onChange={(e) => setTargetPhone(e.target.value)}
                />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase text-muted-foreground">Email PIC / Jamaah</label>
                <Input
                  className="mt-1 h-8 text-xs font-mono"
                  placeholder="email@jamaah.com"
                  value={targetEmail}
                  onChange={(e) => setTargetEmail(e.target.value)}
                />
              </div>
            </div>

            {/* Message Preview Box */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-foreground">Teks Pesan WhatsApp yang Tergenerate</label>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-[11px] gap-1 px-2 font-medium"
                  onClick={handleCopyInvoiceText}
                >
                  {copiedInvoiceText ? (
                    <>
                      <Check className="h-3 w-3 text-emerald-600" />
                      <span className="text-emerald-600">Tersalin!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3" />
                      Salin Pesan
                    </>
                  )}
                </Button>
              </div>
              <textarea
                readOnly
                rows={9}
                value={generateInvoiceMessage(
                  sendInvoiceTarget,
                  sendInvoiceTarget.invoiceId || invoiceNumber,
                  sendInvoiceTarget.jumlah || formNominal
                )}
                className="w-full text-xs font-mono p-3 rounded-lg border bg-stone-900 text-stone-100 dark:bg-stone-950 leading-relaxed resize-none"
              />
            </div>

            {/* Quick Tip for Sending Actual PDF File */}
            <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-lg flex items-start gap-2 text-[11px] text-amber-950 dark:text-amber-200">
              <FileText className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-extrabold block">📎 CARA MENGIRIM FILE PDF ASLI DI WA WEB:</span>
                <span>
                  Saat klik tombol hijau di bawah, <strong>File PDF Invoice asli</strong> akan otomatis terunduh dan WA Web terbuka ke chat Jamaah. Tarik/geser file PDF yang terunduh di baris bawah browser ke ruang chat WA Web, lalu tekan <strong>Kirim (Enter)</strong>!
                </span>
              </div>
            </div>

            {/* Send Buttons */}
            <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t">
              <Button
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-9 text-xs gap-1.5 shadow-sm"
                onClick={handleSendWhatsApp}
              >
                <Send className="h-4 w-4" />
                Kirim via WhatsApp (Unduh & Buka Chat)
              </Button>
              <Button
                variant="outline"
                className="font-bold h-9 text-xs gap-1.5 border-emerald-500/30 text-emerald-700 hover:bg-emerald-50 dark:text-emerald-300"
                onClick={handleSendEmail}
              >
                <Mail className="h-4 w-4" />
                Kirim via Email
              </Button>
              <Button
                variant="outline"
                className="font-bold h-9 text-xs gap-1.5 border-emerald-500/30 text-emerald-700 hover:bg-emerald-50 dark:text-emerald-300"
                onClick={() => {
                  const inv = sendInvoiceTarget.invoiceId || invoiceNumber;
                  const kode = sendInvoiceTarget.kodeRegistrasi || sendInvoiceTarget.groupId || "";
                  window.open(`/invoice/${encodeURIComponent(inv)}?kode=${encodeURIComponent(kode)}`, "_blank");
                }}
              >
                <Eye className="h-4 w-4" />
                Preview Dokumen
              </Button>
              <Button
                variant="outline"
                className="font-bold h-9 text-xs gap-1.5"
                onClick={() => handleDownloadPdf(sendInvoiceTarget)}
              >
                <Download className="h-4 w-4" />
                Unduh PDF
              </Button>
            </div>
          </div>
        )}
      </Modal>

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
                Buka Gambar Asli <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
          </div>

          <div className="max-h-[60vh] overflow-auto flex items-center justify-center p-4 bg-muted/20 rounded-xl border">
            {previewImageUrl && (
              <img
                src={previewImageUrl}
                alt="Bukti Transfer"
                style={{ transform: `scale(${zoomLevel})`, transformOrigin: "center center" }}
                className="transition-transform duration-200 rounded-lg shadow-md max-w-full h-auto object-contain"
              />
            )}
          </div>
        </div>
      </Modal>

      {/* ========================================================= */}
      {/* MODAL TOLAK PEMBAYARAN */}
      {/* ========================================================= */}
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

      {/* ========================================================= */}
      {/* MODAL TAMBAH ORDER / PENYESUAIAN BIAYA CUSTOM */}
      {/* ========================================================= */}
      <Modal
        open={showAddOrderModal}
        onClose={() => setShowAddOrderModal(false)}
        title="Tambah Layanan Order / Penyesuaian Biaya"
        description="Tambahkan beban biaya ekstra jamaah atau potongan khusus ke dalam invoice."
        size="default"
      >
        <div className="space-y-3.5 pt-1">
          <div>
            <label className="text-[11px] font-bold text-foreground">Tipe Penyesuaian</label>
            <div className="grid grid-cols-2 gap-2 mt-1">
              <button
                type="button"
                onClick={() => {
                  setNewOrderType("penambahan");
                  if (newOrderCategory === "diskon") {
                    const fallback = ORDER_PRESETS[0] || {
                      category: "fast_train",
                      defaultName: "Tiket Kereta Cepat Haramain (Mekkah - Madinah)",
                      defaultNominal: 1250000,
                    };
                    setNewOrderCategory(fallback.category);
                    setNewOrderName(fallback.defaultName);
                    setNewOrderNominal(fallback.defaultNominal);
                  }
                }}
                className={`p-2 rounded-lg border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                  newOrderType === "penambahan"
                    ? "bg-amber-500/15 border-amber-500 text-amber-700 dark:text-amber-300 shadow-2xs"
                    : "bg-background text-muted-foreground hover:bg-muted"
                }`}
              >
                <span>➕ Tambahan Beban (+)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setNewOrderType("pengurangan");
                  const discPreset = ORDER_PRESETS.find((p) => p.type === "pengurangan") || {
                    category: "diskon",
                    defaultName: "Potongan Khusus / Promo Grup Umroh",
                    defaultNominal: 1000000,
                  };
                  setNewOrderCategory(discPreset.category);
                  setNewOrderName(discPreset.defaultName);
                  setNewOrderNominal(discPreset.defaultNominal);
                }}
                className={`p-2 rounded-lg border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                  newOrderType === "pengurangan"
                    ? "bg-emerald-500/15 border-emerald-500 text-emerald-700 dark:text-emerald-300 shadow-2xs"
                    : "bg-background text-muted-foreground hover:bg-muted"
                }`}
              >
                <span>➖ Pengurangan / Potongan (-)</span>
              </button>
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold text-foreground">Kategori Layanan</label>
            <select
              value={newOrderCategory}
              onChange={(e) => {
                const cat = e.target.value;
                setNewOrderCategory(cat);
                const found = ORDER_PRESETS.find(
                  (p) => p.category === cat || (cat === "jahit" && p.category === "jahit_seragam")
                );
                if (found) {
                  setNewOrderName(found.defaultName);
                  setNewOrderNominal(found.defaultNominal);
                  setNewOrderType(found.type);
                } else if (cat === "diskon") {
                  setNewOrderName("Potongan Khusus / Diskon Tagihan");
                  setNewOrderNominal(1000000);
                  setNewOrderType("pengurangan");
                } else {
                  setNewOrderName("Layanan Tambahan Kustom");
                  setNewOrderNominal(500000);
                  setNewOrderType("penambahan");
                }
              }}
              className="mt-1 w-full rounded-md border border-stone-300 dark:border-stone-700 bg-background px-3 py-1.5 text-xs focus:ring-1 focus:ring-amber-500"
            >
              <option value="fast_train">🚄 Kereta Cepat Haramain (Fast Train)</option>
              <option value="upgrade_kamar">🛏️ Upgrade Kamar (Double / Triple)</option>
              <option value="upgrade_hotel">🏨 Upgrade Hotel (Bintang 5 Ring 1)</option>
              <option value="perlengkapan">🎒 Tambah Perlengkapan & Koper</option>
              <option value="jahit_seragam">🧵 Ongkos Jahit Seragam Batik</option>
              <option value="kursi_roda">♿ Sewa Kursi Roda + Petugas</option>
              <option value="paspor">🛂 Penanganan & Biaya Paspor</option>
              <option value="city_tour">🚌 Tambahan Extra City Tour / Taif</option>
              <option value="diskon">🏷️ Diskon / Potongan Khusus</option>
              <option value="custom">✨ Layanan / Beban Kustom Lainnya</option>
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-foreground">Deskripsi / Nama Layanan</label>
              <span className="text-[9.5px] text-amber-600 dark:text-amber-400 font-semibold">Dapat diedit bebas</span>
            </div>
            <Input
              type="text"
              value={newOrderName}
              onChange={(e) => setNewOrderName(e.target.value)}
              placeholder="Contoh: Tambah Kereta Cepat Haramain Makkah-Madinah"
              className="mt-1 h-8 text-xs font-medium"
            />
            <p className="text-[10px] text-muted-foreground mt-1">
              💡 Sistem otomatis mengisi deskripsi default sesuai kategori yang dipilih. Anda dapat mengubah atau menambahkan detail sesuai kebutuhan.
            </p>
          </div>

          <div>
            <label className="text-[11px] font-bold text-foreground">Nominal (Rupiah)</label>
            <Input
              type="number"
              value={newOrderNominal || ""}
              onChange={(e) => setNewOrderNominal(Number(e.target.value) || 0)}
              placeholder="Contoh: 500000"
              className="mt-1 h-8 text-xs font-mono font-bold"
            />
          </div>

          <div className="flex gap-2 justify-end pt-3 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAddOrderModal(false)}
            >
              Batal
            </Button>
            <Button
              size="sm"
              disabled={!newOrderName.trim() || newOrderNominal <= 0}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
              onClick={() => {
                const newItem: InvoiceOrderItem = {
                  id: `order-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
                  kategori: newOrderCategory,
                  nama: newOrderName.trim(),
                  tipe: newOrderType,
                  nominal: newOrderNominal,
                };
                setOrderItems((prev) => [...prev, newItem]);
                setShowAddOrderModal(false);
              }}
            >
              Simpan Layanan
            </Button>
          </div>
        </div>
      </Modal>

      {/* ========================================================= */}
      {/* MODAL KONFIRMASI HAPUS PEMBAYARAN SATUAN */}
      {/* ========================================================= */}
      <Modal
        open={Boolean(deletePaymentTarget)}
        onClose={() => setDeletePaymentTarget(null)}
        title="Konfirmasi Hapus Data Pembayaran"
        size="default"
      >
        <div className="space-y-4 pt-1">
          <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <p className="font-bold text-red-900 dark:text-red-200">
                Hapus Transaksi Pembayaran: {deletePaymentTarget ? formatCurrency(deletePaymentTarget.jumlah) : "-"}
              </p>
              <p className="text-red-700 dark:text-red-300">
                Grup: <span className="font-bold">{deletePaymentTarget?.namaGroup ?? deletePaymentTarget?.groupId}</span> (ID Reg: {deletePaymentTarget?.kodeRegistrasi ?? "-"})
              </p>
            </div>
          </div>

          <label className="flex items-center gap-2 text-xs text-foreground font-medium p-2 bg-muted rounded-lg cursor-pointer">
            <input
              type="checkbox"
              checked={cascadeGroupDelete}
              onChange={(e) => setCascadeGroupDelete(e.target.checked)}
              className="rounded text-red-600 focus:ring-red-500"
            />
            <span>Hapus juga seluruh data registrasi percobaan & grup jamaah terkait</span>
          </label>

          <p className="text-xs text-muted-foreground">
            Apakah Anda yakin ingin menghapus transaksi pembayaran ini secara permanen?
          </p>

          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDeletePaymentTarget(null)}
              disabled={isDeletingPayment}
            >
              Batal
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleDeleteSinglePayment}
              disabled={isDeletingPayment}
              className="bg-red-600 hover:bg-red-700 font-bold gap-1.5"
            >
              {isDeletingPayment ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
              <span>{isDeletingPayment ? "Menghapus..." : "Hapus Pembayaran"}</span>
            </Button>
          </div>
        </div>
      </Modal>

      {/* ========================================================= */}
      {/* MODAL KONFIRMASI HAPUS SEMUA DATA PEMBAYARAN PERCOBAAN */}
      {/* ========================================================= */}
      <Modal
        open={showDeleteAllPaymentsModal}
        onClose={() => setShowDeleteAllPaymentsModal(false)}
        title="Konfirmasi Hapus Seluruh Data Pembayaran Percobaan"
        size="default"
      >
        <div className="space-y-4 pt-1">
          <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <p className="font-bold text-red-900 dark:text-red-200">
                PERINGATAN: Tindakan ini bersifat PERMANEN dan tidak dapat dibatalkan!
              </p>
              <p className="text-red-700 dark:text-red-300">
                Seluruh ({queue.length}) data pembayaran percobaan, alokasi pembayaran, dan kwitansi invoice terkait akan dihapus total dari database.
              </p>
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            Apakah Anda benar-benar yakin ingin membersihkan antrian transaksi pembayaran percobaan ini sekarang?
          </p>

          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowDeleteAllPaymentsModal(false)}
              disabled={isDeletingPayment}
            >
              Batal
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleDeleteAllPayments}
              disabled={isDeletingPayment}
              className="bg-red-600 hover:bg-red-700 font-bold gap-1.5"
            >
              {isDeletingPayment ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
              <span>{isDeletingPayment ? "Menghapus..." : "Ya, Hapus Seluruh Antrian"}</span>
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

  // WA Transfer Slip Drag & Drop / Paste state
  const [waTransferPreview, setWaTransferPreview] = useState<string | null>(null);
  const [waTransferFile, setWaTransferFile] = useState<File | null>(null);
  const [isDraggingWa, setIsDraggingWa] = useState(false);

  // Billing Breakdown Items state (Rincian Tagihan & Potongan)
  const [billingItems, setBillingItems] = useState<BillingItem[]>([]);
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [newBillingNama, setNewBillingNama] = useState("");
  const [newBillingKategori, setNewBillingKategori] = useState<"tambahan" | "potongan">("tambahan");
  const [newBillingNominal, setNewBillingNominal] = useState(0);
  const [newBillingQty, setNewBillingQty] = useState<number>(1);
  const [isCustomJenisMode, setIsCustomJenisMode] = useState<boolean>(false);

  // Master lists for Additional Charges and Discounts
  const [masterTambahanOptions, setMasterTambahanOptions] = useState<string[]>(getInitialTambahanOptions);
  const [masterPotonganOptions, setMasterPotonganOptions] = useState<string[]>(getInitialPotonganOptions);

  // Master Options Manager Modal State
  const [showManageJenisModal, setShowManageJenisModal] = useState(false);
  const [tempNewJenis, setTempNewJenis] = useState("");
  const [editingJenisIndex, setEditingJenisIndex] = useState<number | null>(null);
  const [editingJenisText, setEditingJenisText] = useState("");

  const saveTambahanOptions = (opts: string[]) => {
    setMasterTambahanOptions(opts);
    if (typeof window !== "undefined") {
      try { localStorage.setItem("vtu_master_tambahan_opts", JSON.stringify(opts)); } catch {}
    }
  };

  const savePotonganOptions = (opts: string[]) => {
    setMasterPotonganOptions(opts);
    if (typeof window !== "undefined") {
      try { localStorage.setItem("vtu_master_potongan_opts", JSON.stringify(opts)); } catch {}
    }
  };

  function handleAddNewMasterJenis() {
    if (!tempNewJenis.trim()) return;
    const name = tempNewJenis.trim();
    if (newBillingKategori === "tambahan") {
      if (!masterTambahanOptions.includes(name)) {
        saveTambahanOptions([...masterTambahanOptions, name]);
      }
      setNewBillingNama(name);
    } else {
      if (!masterPotonganOptions.includes(name)) {
        savePotonganOptions([...masterPotonganOptions, name]);
      }
      setNewBillingNama(name);
    }
    setTempNewJenis("");
  }

  function handleSaveEditMasterJenis(idx: number) {
    if (!editingJenisText.trim()) return;
    const name = editingJenisText.trim();
    if (newBillingKategori === "tambahan") {
      const updated = [...masterTambahanOptions];
      updated[idx] = name;
      saveTambahanOptions(updated);
      if (newBillingNama === masterTambahanOptions[idx]) setNewBillingNama(name);
    } else {
      const updated = [...masterPotonganOptions];
      updated[idx] = name;
      savePotonganOptions(updated);
      if (newBillingNama === masterPotonganOptions[idx]) setNewBillingNama(name);
    }
    setEditingJenisIndex(null);
    setEditingJenisText("");
  }

  function handleDeleteMasterJenis(optName: string) {
    if (newBillingKategori === "tambahan") {
      const updated = masterTambahanOptions.filter((o) => o !== optName);
      saveTambahanOptions(updated);
      if (newBillingNama === optName) setNewBillingNama(updated[0] || "");
    } else {
      const updated = masterPotonganOptions.filter((o) => o !== optName);
      savePotonganOptions(updated);
      if (newBillingNama === optName) setNewBillingNama(updated[0] || "");
    }
  }

  function handleResetMasterDefaults() {
    if (newBillingKategori === "tambahan") {
      saveTambahanOptions(DEFAULT_TAMBAHAN_OPTIONS);
      setNewBillingNama(DEFAULT_TAMBAHAN_OPTIONS[0] ?? "");
    } else {
      savePotonganOptions(DEFAULT_POTONGAN_OPTIONS);
      setNewBillingNama(DEFAULT_POTONGAN_OPTIONS[0] ?? "");
    }
  }

  const maxQtyLimit = useMemo(() => {
    return groupData?.jumlahAnggota || 1;
  }, [groupData?.jumlahAnggota]);

  useEffect(() => {
    if (newBillingKategori === "tambahan") {
      setNewBillingNama(masterTambahanOptions[0] || "");
    } else {
      setNewBillingNama(masterPotonganOptions[0] || "");
    }
    setIsCustomJenisMode(false);
  }, [newBillingKategori, masterTambahanOptions, masterPotonganOptions]);

  const totalTambahan = useMemo(() => {
    return billingItems
      .filter((i) => i.kategori === "tambahan")
      .reduce((sum, i) => sum + i.nominal * i.qty, 0);
  }, [billingItems]);

  const totalPotongan = useMemo(() => {
    return billingItems
      .filter((i) => i.kategori === "potongan")
      .reduce((sum, i) => sum + i.nominal * i.qty, 0);
  }, [billingItems]);

  const calculatedTotalTagihan = useMemo(() => {
    const base = groupData?.totalTagihan || 0;
    return base + totalTambahan - totalPotongan;
  }, [groupData?.totalTagihan, totalTambahan, totalPotongan]);

  const calculatedSisaPembayaran = useMemo(() => {
    const dibayar = groupData?.totalPembayaran || 0;
    return calculatedTotalTagihan - dibayar;
  }, [calculatedTotalTagihan, groupData?.totalPembayaran]);

  function handleAddBillingItem() {
    if (!newBillingNama.trim() || newBillingNominal <= 0) return;

    const trimmedName = newBillingNama.trim();

    if (newBillingKategori === "tambahan") {
      if (!masterTambahanOptions.includes(trimmedName)) {
        setMasterTambahanOptions((prev) => [...prev, trimmedName]);
      }
    } else {
      if (!masterPotonganOptions.includes(trimmedName)) {
        setMasterPotonganOptions((prev) => [...prev, trimmedName]);
      }
    }

    const newItem: BillingItem = {
      id: `bill-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      nama: trimmedName,
      kategori: newBillingKategori,
      nominal: newBillingNominal,
      qty: Math.min(Math.max(1, newBillingQty), maxQtyLimit),
    };

    setBillingItems((prev) => [...prev, newItem]);
    setNewBillingNominal(0);
    setNewBillingQty(1);
    setIsCustomJenisMode(false);
    setShowAddItemModal(false);
  }

  function handleRemoveBillingItem(id: string) {
    setBillingItems((prev) => prev.filter((i) => i.id !== id || i.isDefault));
  }

  function handleWaFileProcess(file: File) {
    setWaTransferFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      const res = e.target?.result as string;
      setWaTransferPreview(res);
    };
    reader.readAsDataURL(file);
  }

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
      setBillingItems([
        {
          id: "base-package",
          nama: `Tagihan Paket Utama (${summary.jumlahAnggota} Pax)`,
          kategori: "utama",
          nominal: summary.totalTagihan / Math.max(1, summary.jumlahAnggota),
          qty: summary.jumlahAnggota,
          isDefault: true,
        },
      ]);
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
        buktiUrl: waTransferPreview || undefined,
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
      setWaTransferPreview(null);
      setWaTransferFile(null);

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
                      <p className="text-xs text-muted-foreground">Total Tagihan (Net)</p>
                      <p className="font-semibold text-foreground">{formatCurrency(calculatedTotalTagihan)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Total Dibayar</p>
                      <p className="font-semibold text-success">{formatCurrency(groupData.totalPembayaran)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Sisa</p>
                      <p className="font-semibold text-destructive">{formatCurrency(calculatedSisaPembayaran)}</p>
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

              {/* Two-column: History & Billing Breakdown | Form */}
              <div className="grid gap-6 lg:grid-cols-2">
                {/* LEFT: Billing Breakdown Table ABOVE Payment History */}
                <div className="space-y-6">
                  {/* CARD 1: RINCIAN TAGIHAN & POTONGAN */}
                  <Card>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Receipt className="h-4 w-4 text-amber-500" />
                          Rincian Tagihan & Potongan Group
                        </CardTitle>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs font-bold border-amber-500/40 hover:bg-amber-500/10 text-amber-600 dark:text-amber-400"
                          onClick={() => setShowAddItemModal(true)}
                        >
                          <PlusCircle className="mr-1.5 h-3.5 w-3.5" />
                          Tambah Item
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="border-b text-left font-medium text-muted-foreground bg-stone-50 dark:bg-stone-900/50">
                              <th className="p-2">Deskripsi Item Tagihan / Potongan</th>
                              <th className="p-2">Kategori</th>
                              <th className="p-2 text-center">Qty</th>
                              <th className="p-2 text-right">Harga / Pax</th>
                              <th className="p-2 text-right">Total Nominal</th>
                              <th className="p-2 text-center w-10">Aksi</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            {billingItems.map((item) => {
                              const itemTotal = item.nominal * item.qty;
                              return (
                                <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                                  <td className="p-2 font-medium">
                                    <div>
                                      <p className="text-foreground">{item.nama}</p>
                                      {item.catatan && (
                                        <p className="text-[10px] text-muted-foreground">{item.catatan}</p>
                                      )}
                                    </div>
                                  </td>
                                  <td className="p-2">
                                    {item.kategori === "utama" && (
                                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                                        Tagihan Utama
                                      </span>
                                    )}
                                    {item.kategori === "tambahan" && (
                                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
                                        + Tambahan
                                      </span>
                                    )}
                                    {item.kategori === "potongan" && (
                                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                                        - Potongan
                                      </span>
                                    )}
                                  </td>
                                  <td className="p-2 text-center font-mono font-bold text-slate-700 dark:text-slate-300">
                                    {item.qty} Pax
                                  </td>
                                  <td className="p-2 text-right font-mono tabular-nums text-stone-600 dark:text-stone-400">
                                    {formatCurrency(item.nominal)}
                                  </td>
                                  <td className={`p-2 text-right font-mono font-bold tabular-nums ${
                                    item.kategori === "potongan" ? "text-amber-600 dark:text-amber-400" : "text-emerald-700 dark:text-emerald-400"
                                  }`}>
                                    {item.kategori === "potongan" ? `- ${formatCurrency(itemTotal)}` : formatCurrency(itemTotal)}
                                  </td>
                                  <td className="p-2 text-center">
                                    {!item.isDefault ? (
                                      <button
                                        type="button"
                                        onClick={() => handleRemoveBillingItem(item.id)}
                                        className="text-stone-400 hover:text-destructive transition-colors p-1 cursor-pointer"
                                        title="Hapus Item Ini"
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </button>
                                    ) : (
                                      <span className="text-[10px] text-muted-foreground font-mono">-</span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                          <tfoot>
                            <tr className="border-t-2 border-stone-200 dark:border-stone-800 bg-stone-50/80 dark:bg-stone-900/80 font-bold text-xs">
                              <td colSpan={4} className="p-2.5 text-right uppercase tracking-wider text-muted-foreground">
                                Total Tagihan Akhir (Net)
                              </td>
                              <td className="p-2.5 text-right font-mono text-sm text-emerald-700 dark:text-emerald-400">
                                {formatCurrency(calculatedTotalTagihan)}
                              </td>
                              <td></td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </CardContent>
                  </Card>

                  {/* CARD 2: RIWAYAT PEMBAYARAN GROUP */}
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm">
                          {activeSplit
                            ? `Riwayat Pembayaran — ${activeSplit.label}`
                            : "Riwayat Pembayaran Group"}
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
              </div>

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
                    {/* Drag & Drop Bukti Transfer WA (Sebelum Nominal Pembayaran) */}
                    <div>
                      <label className="text-xs font-bold text-foreground flex items-center gap-1.5 uppercase tracking-wider mb-1.5">
                        <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                        Drag & Drop Bukti Transfer WA (Opsional)
                      </label>
                      <div
                        onDragOver={(e) => {
                          e.preventDefault();
                          setIsDraggingWa(true);
                        }}
                        onDragLeave={() => setIsDraggingWa(false)}
                        onDrop={(e) => {
                          e.preventDefault();
                          setIsDraggingWa(false);
                          const file = e.dataTransfer.files?.[0];
                          if (file && file.type.startsWith("image/")) {
                            handleWaFileProcess(file);
                          }
                        }}
                        onPaste={(e) => {
                          const items = e.clipboardData?.items;
                          if (items) {
                            for (let i = 0; i < items.length; i++) {
                              const item = items[i];
                              if (item && item.type && item.type.startsWith("image/")) {
                                const file = item.getAsFile();
                                if (file) handleWaFileProcess(file);
                                break;
                              }
                            }
                          }
                        }}
                        className={`relative rounded-xl border-2 border-dashed p-3 text-center transition-all cursor-pointer select-none ${
                          isDraggingWa
                            ? "border-amber-500 bg-amber-500/20 shadow-md scale-[1.01]"
                            : waTransferPreview
                            ? "border-emerald-500 bg-emerald-500/10"
                            : "border-stone-300 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-900/40 hover:border-amber-500 hover:bg-amber-500/10"
                        }`}
                      >
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleWaFileProcess(file);
                          }}
                          className="hidden"
                          id="wa-file-input-group"
                        />

                        {waTransferPreview ? (
                          <div className="flex items-center gap-3 text-left">
                            <img
                              src={waTransferPreview}
                              alt="Bukti Transfer WA"
                              className="h-14 w-14 rounded-lg object-cover border border-emerald-400 shadow-xs shrink-0"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold text-emerald-800 dark:text-emerald-300 truncate">
                                ✓ Bukti Transfer WA Terlampir
                              </p>
                              <p className="text-[10px] text-muted-foreground truncate">
                                {waTransferFile?.name || "bukti_tf.png"} ({Math.round((waTransferFile?.size || 0) / 1024)} KB)
                              </p>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setWaTransferPreview(null);
                                  setWaTransferFile(null);
                                }}
                                className="mt-1 text-[10px] font-bold text-destructive hover:underline cursor-pointer"
                              >
                                Hapus / Ganti Bukti
                              </button>
                            </div>
                          </div>
                        ) : (
                          <label htmlFor="wa-file-input-group" className="cursor-pointer block space-y-1">
                            <div className="flex items-center justify-center gap-2 text-amber-600 dark:text-amber-400 font-bold text-xs">
                              <Upload className="h-4 w-4" />
                              <span>Seret / Paste Gambar Bukti TF dari WhatsApp</span>
                            </div>
                            <p className="text-[10.5px] text-muted-foreground">
                              Drop foto / screenshot slip transfer dari WA Desktop di sini, atau tekan <kbd className="px-1 py-0.5 bg-muted rounded border text-[9px] font-mono">Ctrl+V</kbd>
                            </p>
                          </label>
                        )}
                      </div>
                    </div>

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

      {/* Modal Tambah Item Tagihan / Potongan */}
      <Modal
        open={showAddItemModal}
        onClose={() => setShowAddItemModal(false)}
        title="Tambah Item Tagihan / Potongan"
        size="sm"
      >
        <div className="space-y-4 pt-1">
          {/* 1. Kategori Switcher */}
          <div>
            <label className="text-xs font-bold text-foreground block mb-1.5 uppercase tracking-wider">
              Kategori Item
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setNewBillingKategori("tambahan")}
                className={`p-2.5 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                  newBillingKategori === "tambahan"
                    ? "border-emerald-500 bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 shadow-xs"
                    : "border-stone-200 dark:border-stone-800 text-muted-foreground hover:bg-muted/50"
                }`}
              >
                + Tambahan Tagihan
              </button>
              <button
                type="button"
                onClick={() => setNewBillingKategori("potongan")}
                className={`p-2.5 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                  newBillingKategori === "potongan"
                    ? "border-amber-500 bg-amber-500/15 text-amber-800 dark:text-amber-300 shadow-xs"
                    : "border-stone-200 dark:border-stone-800 text-muted-foreground hover:bg-muted/50"
                }`}
              >
                - Potongan / Diskon
              </button>
            </div>
          </div>

          {/* 2. Searchable / Selectable Jenis Item */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-foreground">
                {newBillingKategori === "tambahan" ? "Jenis Tambahan Tagihan" : "Jenis Potongan / Diskon"}
              </label>
              <button
                type="button"
                onClick={() => setShowManageJenisModal(true)}
                className="p-1 rounded-md text-amber-600 dark:text-amber-400 hover:bg-amber-500/15 transition-colors cursor-pointer"
                title="⚙️ Kelola, Tambah, Edit, atau Hapus Daftar Opsi Jenis"
              >
                <Settings2 className="h-4 w-4" />
              </button>
            </div>

            {isCustomJenisMode ? (
              <div className="space-y-1.5">
                <div className="flex gap-2">
                  <Input
                    placeholder={
                      newBillingKategori === "tambahan"
                        ? "Ketik jenis tambahan baru..."
                        : "Ketik jenis potongan baru..."
                    }
                    value={newBillingNama}
                    onChange={(e) => setNewBillingNama(e.target.value)}
                    autoFocus
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="text-xs shrink-0"
                    onClick={() => {
                      setIsCustomJenisMode(false);
                      const opts = newBillingKategori === "tambahan" ? masterTambahanOptions : masterPotonganOptions;
                      if (opts[0]) setNewBillingNama(opts[0]);
                    }}
                  >
                    Batal
                  </Button>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  ✨ Jenis baru ini akan otomatis tersimpan sebagai opsi pilihan berikutnya.
                </p>
              </div>
            ) : (
              <select
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs ring-offset-background focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                value={newBillingNama}
                onChange={(e) => {
                  if (e.target.value === "__ADD_NEW__") {
                    setIsCustomJenisMode(true);
                    setNewBillingNama("");
                  } else {
                    setNewBillingNama(e.target.value);
                  }
                }}
              >
                {(newBillingKategori === "tambahan" ? masterTambahanOptions : masterPotonganOptions).map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
                <option value="__ADD_NEW__">➕ + Tambah Jenis Baru...</option>
              </select>
            )}
          </div>

          {/* 3. Nominal Input */}
          <div>
            <label className="text-xs font-bold text-foreground block mb-1">
              Nominal Per Unit / Pax (Rp)
            </label>
            <Input
              type="number"
              placeholder="Masukkan nominal"
              value={newBillingNominal || ""}
              onChange={(e) => setNewBillingNominal(Number(e.target.value))}
            />
          </div>

          {/* 4. Quantity Input with Max Limit */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-foreground">
                Quantity (Jumlah Pax)
              </label>
              <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">
                Maksimal: {maxQtyLimit} Jamaah
              </span>
            </div>
            <Input
              type="number"
              min={1}
              max={maxQtyLimit}
              placeholder="1"
              value={newBillingQty}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                if (isNaN(val) || val < 1) setNewBillingQty(1);
                else if (val > maxQtyLimit) setNewBillingQty(maxQtyLimit);
                else setNewBillingQty(val);
              }}
            />
            <p className="mt-1 text-[10px] text-muted-foreground">
              Dibatasi sesuai jumlah {maxQtyLimit} jamaah terdaftar di grup ini.
            </p>
          </div>

          {/* Subtotal Preview */}
          {newBillingNominal > 0 && (
            <div className="p-2.5 rounded-lg bg-stone-100 dark:bg-stone-900 border text-xs flex justify-between items-center">
              <span className="text-muted-foreground font-medium">Subtotal Tambahan/Potongan:</span>
              <span className="font-mono font-bold text-amber-600 dark:text-amber-400 text-sm">
                {formatCurrency(newBillingNominal * newBillingQty)}
              </span>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowAddItemModal(false)}
            >
              Batal
            </Button>
            <Button
              type="button"
              size="sm"
              className="font-bold bg-amber-500 hover:bg-amber-600 text-slate-950"
              onClick={handleAddBillingItem}
              disabled={!newBillingNama.trim() || newBillingNominal <= 0}
            >
              Simpan Item
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal Kelola Master Jenis Item (Edit / Hapus / Tambah Opsi) */}
      <Modal
        open={showManageJenisModal}
        onClose={() => setShowManageJenisModal(false)}
        title={`Kelola Master Opsi — ${newBillingKategori === "tambahan" ? "Tambahan Tagihan" : "Potongan / Diskon"}`}
        size="sm"
      >
        <div className="space-y-4 pt-1">
          <p className="text-xs text-muted-foreground">
            Ubah nama atau hapus opsi jenis {newBillingKategori === "tambahan" ? "tambahan tagihan" : "potongan"} yang kurang sesuai. Perubahan tersimpan secara otomatis.
          </p>

          {/* Input Tambah Jenis Langsung */}
          <div className="flex gap-2">
            <Input
              placeholder={newBillingKategori === "tambahan" ? "Tambah jenis tambahan baru..." : "Tambah jenis potongan baru..."}
              value={tempNewJenis}
              onChange={(e) => setTempNewJenis(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddNewMasterJenis()}
            />
            <Button
              type="button"
              size="sm"
              className="font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 shrink-0 gap-1"
              onClick={handleAddNewMasterJenis}
              disabled={!tempNewJenis.trim()}
            >
              <Plus className="h-3.5 w-3.5" />
              Tambah
            </Button>
          </div>

          {/* List of current options with Edit & Delete controls */}
          <div className="max-h-60 overflow-y-auto space-y-1.5 border rounded-lg p-2 bg-stone-50 dark:bg-stone-900/50">
            {(newBillingKategori === "tambahan" ? masterTambahanOptions : masterPotonganOptions).map((opt, idx) => (
              <div key={opt + idx} className="flex items-center justify-between gap-2 p-2 bg-background rounded-md border text-xs">
                {editingJenisIndex === idx ? (
                  <div className="flex-1 flex gap-1 items-center">
                    <Input
                      value={editingJenisText}
                      onChange={(e) => setEditingJenisText(e.target.value)}
                      className="h-7 text-xs"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => handleSaveEditMasterJenis(idx)}
                      className="p-1 text-emerald-600 hover:bg-emerald-500/10 rounded cursor-pointer"
                      title="Simpan Nama Jenis"
                    >
                      <Check className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingJenisIndex(null)}
                      className="p-1 text-stone-400 hover:bg-stone-500/10 rounded cursor-pointer"
                      title="Batal Edit"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <>
                    <span className="font-medium text-foreground truncate">{opt}</span>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingJenisIndex(idx);
                          setEditingJenisText(opt);
                        }}
                        className="p-1 text-stone-400 hover:text-amber-600 transition-colors cursor-pointer"
                        title="Edit Nama Jenis"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteMasterJenis(opt)}
                        className="p-1 text-stone-400 hover:text-destructive transition-colors cursor-pointer"
                        title="Hapus Jenis Ini"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>

          {/* Footer actions */}
          <div className="flex justify-between items-center pt-2 border-t text-xs">
            <button
              type="button"
              onClick={handleResetMasterDefaults}
              className="text-stone-500 hover:text-foreground text-[11px] underline cursor-pointer"
            >
              Reset ke Opsi Standar Sistem
            </button>
            <Button
              type="button"
              size="sm"
              onClick={() => setShowManageJenisModal(false)}
            >
              Selesai
            </Button>
          </div>
        </div>
      </Modal>

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

