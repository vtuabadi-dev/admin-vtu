"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Search,
  CheckCircle,
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
  Building,
  Users,
} from "lucide-react";
import { getInvoicePdfBase64 } from "@/shared/lib/invoice-pdf";
import { resolveHotelForKlaster } from "@/shared/lib/hotel-utils";
import { resolveDocumentImageUrl, sortGroupMembers } from "@/shared/lib/document-utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/Card";
import { Button } from "@/shared/components/ui/Button";
import { Input } from "@/shared/components/ui/Input";
import { CurrencyInput } from "@/shared/components/ui/CurrencyInput";
import { Select } from "@/shared/components/ui/Select";
import { Modal } from "@/shared/components/ui/Modal";
import { Badge } from "@/shared/components/ui/Badge";
import { EmptyState } from "@/shared/components/EmptyState";
import { LoadingSkeleton } from "@/shared/components/LoadingSkeleton";
import { formatCurrency, formatDate, formatInvoicePersonName, getManifestAlamat, getWhatsAppUrl } from "@/shared/lib/utils";
import {
  ALASAN_REJECT,
  ROOM_TYPE_OPTIONS,
  DEFAULT_TAMBAHAN_OPTIONS,
  DEFAULT_POTONGAN_OPTIONS,
  getRoomTypeBadgeStyle,
  isRoomUpgradeItem,
  detectRoomTypeFromName,
  getPackageUpgradePrice,
  resolveKlasterName,
  getInitialTambahanOptions,
  getInitialPotonganOptions,
  getInitialReviewQueue,
  setCachedReviewQueue,
  cachedReviewQueue,
  type InvoiceOrderItem,
} from "./shared-constants";

// Lazy-load invoice-pdf (34KB) — only fetched when user actually clicks print/download
async function downloadInvoicePdf(payload: any, filename?: string) {
  const { downloadInvoicePdf: download } = await import("@/shared/lib/invoice-pdf");
  download(payload, filename);
}

export default
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
  const [memberRoomTypes, setMemberRoomTypes] = useState<Record<string, string>>({});
  const [submittingInvoice, setSubmittingInvoice] = useState(false);

  // Order Items / Adjustments (Beban Tambahan & Pengurangan Biaya)
  const [orderItems, setOrderItems] = useState<InvoiceOrderItem[]>([]);
  const [showAddOrderModal, setShowAddOrderModal] = useState(false);
  const [newOrderName, setNewOrderName] = useState("");
  const [newOrderType, setNewOrderType] = useState<"penambahan" | "pengurangan">("penambahan");
  const [newOrderNominal, setNewOrderNominal] = useState<number>(0);
  const [newOrderQty, setNewOrderQty] = useState<number>(1);
  const [newOrderAllocatedMembers, setNewOrderAllocatedMembers] = useState<string[]>([]);
  const [isOrderCustomJenisMode, setIsOrderCustomJenisMode] = useState<boolean>(false);

  // Re-allocate modal state (Ubah alokasi kamar dari tabel)
  const [showReallocateModal, setShowReallocateModal] = useState(false);
  const [reallocatingItem, setReallocatingItem] = useState<InvoiceOrderItem | null>(null);
  const [tempReallocatedMembers, setTempReallocatedMembers] = useState<string[]>([]);

  // Master lists for Additional Charges and Discounts
  const [masterTambahanOptions, setMasterTambahanOptions] = useState<string[]>(getInitialTambahanOptions);
  const [masterPotonganOptions, setMasterPotonganOptions] = useState<string[]>(getInitialPotonganOptions);
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

  async function handleAddNewMasterJenisOrder() {
    if (!tempNewJenis.trim()) return;
    const name = tempNewJenis.trim();
    if (newOrderType === "penambahan") {
      if (!masterTambahanOptions.includes(name)) {
        saveTambahanOptions([...masterTambahanOptions, name]);
      }
      setNewOrderName(name);
    } else {
      if (!masterPotonganOptions.includes(name)) {
        savePotonganOptions([...masterPotonganOptions, name]);
      }
      setNewOrderName(name);
    }
    setTempNewJenis("");

    try {
      await fetch("/api/admin/pembayaran/billing-options", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kategori: newOrderType === "penambahan" ? "tambahan" : "potongan", nama: name }),
      });
    } catch (err) {
      console.warn("[BillingOptions] Save error:", err);
    }
  }

  async function handleSaveEditMasterJenisOrder(idx: number) {
    if (!editingJenisText.trim()) return;
    const name = editingJenisText.trim();
    const isTambahan = newOrderType === "penambahan";
    const oldName = isTambahan ? masterTambahanOptions[idx] : masterPotonganOptions[idx];

    if (isTambahan) {
      const updated = [...masterTambahanOptions];
      updated[idx] = name;
      saveTambahanOptions(updated);
      if (newOrderName === oldName) setNewOrderName(name);
    } else {
      const updated = [...masterPotonganOptions];
      updated[idx] = name;
      savePotonganOptions(updated);
      if (newOrderName === oldName) setNewOrderName(name);
    }
    setEditingJenisIndex(null);
    setEditingJenisText("");

    try {
      await fetch("/api/admin/pembayaran/billing-options", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ oldNama: oldName, newNama: name, kategori: isTambahan ? "tambahan" : "potongan" }),
      });
    } catch (err) {
      console.warn("[BillingOptions] Edit error:", err);
    }
  }

  async function handleDeleteMasterJenisOrder(optName: string) {
    const isTambahan = newOrderType === "penambahan";
    if (isTambahan) {
      const updated = masterTambahanOptions.filter((o) => o !== optName);
      saveTambahanOptions(updated);
      if (newOrderName === optName) setNewOrderName(updated[0] || "");
    } else {
      const updated = masterPotonganOptions.filter((o) => o !== optName);
      savePotonganOptions(updated);
      if (newOrderName === optName) setNewOrderName(updated[0] || "");
    }

    try {
      await fetch("/api/admin/pembayaran/billing-options", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nama: optName, kategori: isTambahan ? "tambahan" : "potongan" }),
      });
    } catch (err) {
      console.warn("[BillingOptions] Delete error:", err);
    }
  }

  function handleResetMasterDefaultsOrder() {
    if (newOrderType === "penambahan") {
      saveTambahanOptions(DEFAULT_TAMBAHAN_OPTIONS);
      setNewOrderName(DEFAULT_TAMBAHAN_OPTIONS[0] ?? "");
    } else {
      savePotonganOptions(DEFAULT_POTONGAN_OPTIONS);
      setNewOrderName(DEFAULT_POTONGAN_OPTIONS[0] ?? "");
    }
  }

  useEffect(() => {
    fetch("/api/admin/pembayaran/billing-options")
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data) {
          if (Array.isArray(json.data.tambahan) && json.data.tambahan.length > 0) {
            setMasterTambahanOptions(json.data.tambahan);
            try { localStorage.setItem("vtu_master_tambahan_opts", JSON.stringify(json.data.tambahan)); } catch {}
          }
          if (Array.isArray(json.data.potongan) && json.data.potongan.length > 0) {
            setMasterPotonganOptions(json.data.potongan);
            try { localStorage.setItem("vtu_master_potongan_opts", JSON.stringify(json.data.potongan)); } catch {}
          }
        }
      })
      .catch((err) => console.warn("[BillingOptions] Fetch error:", err));
  }, []);

  // Reject State
  const [rejectTarget, setRejectTarget] = useState<any | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectNotes, setRejectNotes] = useState("");

  // Send Invoice Modal States
  const [sendInvoiceTarget, setSendInvoiceTarget] = useState<any | null>(null);
  const [targetPhone, setTargetPhone] = useState("");
  const [targetEmail, setTargetEmail] = useState("");
  const [copiedInvoiceText, setCopiedInvoiceText] = useState(false);
  const [isUploadingToDrive, setIsUploadingToDrive] = useState(false);
  const [driveUploadError, setDriveUploadError] = useState<string | null>(null);

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
        setCachedReviewQueue(data);
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

  const maxOrderQtyLimit = useMemo(() => {
    return (
      availableAnggota.length ||
      selectedPayment?.group?.jumlahAnggota ||
      selectedPayment?.group?.anggota?.length ||
      1
    );
  }, [availableAnggota.length, selectedPayment]);

  useEffect(() => {
    if (showAddOrderModal) {
      if (newOrderType === "penambahan") {
        const defaultName = masterTambahanOptions[0] || "";
        setNewOrderName(defaultName);
      } else {
        setNewOrderName(masterPotonganOptions[0] || "");
      }
      setIsOrderCustomJenisMode(false);
      setNewOrderAllocatedMembers([]);
    }
  }, [newOrderType, showAddOrderModal, masterTambahanOptions, masterPotonganOptions]);

  // When a payment row is clicked to create/view invoice
  const handleSelectPayment = (payment: any) => {
    setSelectedPayment(payment);
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

    // Hotel Information from Package resolved specifically for Jamaah/Group Cluster Choice
    const targetKlaster = resolveKlasterName(payment);
    const kbr = payment.group?.keberangkatan;
    const resolvedMekkah = resolveHotelForKlaster(kbr?.hotelMekkah, targetKlaster) || kbr?.hotelMekkah || "GRAND AL MASSA";
    const resolvedMadinah = resolveHotelForKlaster(kbr?.hotelMadinah, targetKlaster) || kbr?.hotelMadinah || "DURRAT AL EIMAN";
    setFormHotelMekkah(resolvedMekkah);
    setFormHotelMadinah(resolvedMadinah);

    // Alamat (Single Source of Truth from Manifest / Jamaah / KTP / Group)
    const alamat = getManifestAlamat(payment.group || payment);
    setFormAlamat(alamat);

    // Anggota List & Split Support + Room Types Initialization
    const memberNames: string[] = [];
    const initialRoomTypes: Record<string, string> = {};
    const defaultGroupRoom = detectRoomTypeFromName(payment.group?.roomUpgrade || payment.roomUpgrade || "Quad");

    if (payment.group?.anggota && payment.group.anggota.length > 0) {
      const sorted = sortGroupMembers(payment.group.anggota);
      sorted.forEach((m: any) => {
        if (m.namaLengkap) {
          memberNames.push(m.namaLengkap);
          const mRoom = m.tipeKamar || m.roomType || defaultGroupRoom;
          initialRoomTypes[m.namaLengkap] = detectRoomTypeFromName(mRoom);
        }
      });
    } else if (payment.namaGroup) {
      memberNames.push(payment.namaGroup);
      initialRoomTypes[payment.namaGroup] = defaultGroupRoom;
    }
    setAvailableAnggota(memberNames);
    setSelectedAnggota(memberNames);
    setMemberRoomTypes(initialRoomTypes);
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

  const [customWaInvoiceTemplate, setCustomWaInvoiceTemplate] = useState<string>("");

  useEffect(() => {
    async function loadWaTemplate() {
      try {
        const res = await fetch("/api/admin/settings/general");
        const json = await res.json();
        if (json.success && json.data?.waInvoiceTemplate) {
          setCustomWaInvoiceTemplate(json.data.waInvoiceTemplate);
        }
      } catch (err) {}
    }
    loadWaTemplate();
  }, []);

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

    // Adjust order items qty proporsional berdasarkan jumlah anggota terpilih (split invoice)
    const totalAnggotaWa = availableAnggota.length || p.group?.jumlahAnggota || p.group?.anggota?.length || 1;
    const splitPaxWa = selectedAnggota.length > 0 ? selectedAnggota.length : totalAnggotaWa;
    const adjustedOrderItemsWa = orderItems.map((it) => {
      const origQty = it.qty || 1;
      const activeAllocated = it.allocatedJamaah
        ? it.allocatedJamaah.filter((n) => selectedAnggota.length === 0 || selectedAnggota.includes(n))
        : undefined;
      const adjQty = it.allocatedJamaah
        ? Math.max(1, activeAllocated?.length || 1)
        : Math.max(1, Math.round((origQty / totalAnggotaWa) * splitPaxWa));
      const satuan = it.hargaSatuan || (it.nominal / origQty);
      return {
        ...it,
        qty: adjQty,
        nominal: satuan * adjQty,
        hargaSatuan: satuan,
        allocatedJamaah: activeAllocated && activeAllocated.length > 0 ? activeAllocated : it.allocatedJamaah,
      };
    });

    const totalBeban = adjustedOrderItemsWa
      .filter((it) => it.tipe === "penambahan")
      .reduce((sum, it) => sum + (it.nominal || 0), 0);
    const totalDiskon = adjustedOrderItemsWa
      .filter((it) => it.tipe === "pengurangan")
      .reduce((sum, it) => sum + (it.nominal || 0), 0);
    const tagihanBase = p.group?.totalTagihan || p.jumlah || nominal || 0;
    const tagihanDisesuaikan = Math.max(0, tagihanBase + totalBeban - totalDiskon);

    const orderLines = adjustedOrderItemsWa.length > 0 ? [
      ``,
      `ًں“‹ *Rincian Tambahan Layanan / Penyesuaian:*`,
      ...adjustedOrderItemsWa.map((item) => {
        const allocText = item.allocatedJamaah && item.allocatedJamaah.length > 0 ? ` (Peruntukan: ${item.allocatedJamaah.join(", ")})` : "";
        return `â€¢ [${item.tipe === "penambahan" ? "+" : "-"}] ${item.nama}${allocText} (${item.qty}x @ Rp ${(item.hargaSatuan || (item.nominal / (item.qty || 1))).toLocaleString("id-ID")}): Rp ${item.nominal.toLocaleString("id-ID")}`;
      }),
      `*Total Tagihan Disesuaikan:* Rp ${tagihanDisesuaikan.toLocaleString("id-ID")}`,
    ] : [];

    // Resolve Google Drive Direct File Download Link (Forces direct file download - No Drive UI / Folder View access)
    let downloadPdfUrl = "";
    const driveFileId = p.driveFileId || p.googleDriveFileId || p.invoiceDriveId || p.group?.invoiceDriveFileId;

    if (driveFileId) {
      downloadPdfUrl = `https://drive.google.com/uc?export=download&id=${driveFileId}`;
    } else if (p.driveUrl && typeof p.driveUrl === "string" && p.driveUrl.includes("drive.google.com")) {
      const match = p.driveUrl.match(/\/d\/([a-zA-Z0-9_-]+)/) || p.driveUrl.match(/id=([a-zA-Z0-9_-]+)/);
      if (match && match[1]) {
        downloadPdfUrl = `https://drive.google.com/uc?export=download&id=${match[1]}`;
      } else {
        downloadPdfUrl = p.driveUrl.replace(/\/view.*$/, "/uc?export=download").replace(/\/edit.*$/, "/uc?export=download");
      }
    } else {
      const baseUrl = typeof window !== "undefined" && window.location.origin
        ? window.location.origin
        : "https://vtuabadi.com";
      downloadPdfUrl = `${baseUrl}/invoice/${encodeURIComponent(invNum)}?kode=${encodeURIComponent(kodeReg)}&download=true`;
    }

    const rincianTambahanStr = orderLines.length > 0 ? orderLines.join("\n") : "";

    if (customWaInvoiceTemplate && customWaInvoiceTemplate.trim().length > 0) {
      return customWaInvoiceTemplate
        .replace(/\{NAMA_GROUP\}/g, groupName)
        .replace(/\{KODE_REG\}/g, kodeReg)
        .replace(/\{NO_INVOICE\}/g, invNum)
        .replace(/\{NAMA_PAKET\}/g, paketName)
        .replace(/\{JENIS_PEMBAYARAN\}/g, formJenis || "DP Pendaftaran")
        .replace(/\{NOMINAL\}/g, nominal.toLocaleString("id-ID"))
        .replace(/\{RINCIAN_TAMBAHAN\}/g, rincianTambahanStr)
        .replace(/\{TANGGAL\}/g, tgl)
        .replace(/\{BANK\}/g, bank)
        .replace(/\{LINK_PDF_INVOICE\}/g, downloadPdfUrl);
    }

    return [
      `*INVOICE PEMBAYARAN RESMI â€” VTU ABADI TRAVEL*`,
      `--------------------------------------------------`,
      `Assalamu'alaikum Warahmatullahi Wabarakatuh.`,
      ``,
      `Yth. *${groupName}* (Kode Reg: *${kodeReg}*)`,
      `Alhamdulillah, pembayaran Anda telah berhasil kami verifikasi dengan rincian sebagai berikut:`,
      ``,
      `ًں“„ *No. Invoice:* ${invNum}`,
      `ًں“¦ *Paket Umroh:* ${paketName}`,
      `ًں’³ *Jenis Pembayaran:* ${formJenis || "DP Pendaftaran"}`,
      `ًں’° *Nominal Terverifikasi:* Rp ${nominal.toLocaleString("id-ID")}`,
      ...orderLines,
      `ًں“… *Tanggal Transaksi:* ${tgl}`,
      `ًںڈ¦ *Metode / Bank:* ${bank}`,
      `âœ… *Status:* LUNAS / TERVERIFIKASI`,
      ``,
      `ًں“¥ *Unduh Dokumen PDF Resmi Secara Online (Direct Download):*`,
      `ًں‘‰ ${downloadPdfUrl}`,
      ``,
      `Dokumen kuitansi & invoice ini merupakan bukti pembayaran resmi yang diterbitkan oleh PT Vauza Tamma Abadi (VTU ABADI Travel).`,
      `Semoga Allah SWT senantiasa memberikan kelancaran dan kemudahan dalam persiapan ibadah ke Baitullah.`,
      ``,
      `Wassalamu'alaikum Warahmatullahi Wabarakatuh.`,
      `*Finance & Operational Team â€” VTU ABADI Travel*`,
      `ًںŒگ https://vtuabadi.com`,
    ].join("\n");
  }, [formJenis, formBank, orderItems, customWaInvoiceTemplate, selectedAnggota, availableAnggota]);

  const getInvoicePdfPayload = useCallback((p: any, invNum: string, nominal: number) => {
    const rawTgl = p.tanggal ? new Date(p.tanggal) : new Date();
    const formattedTgl = !isNaN(rawTgl.getTime())
      ? rawTgl.toLocaleDateString("id-ID", { day: "2-digit", month: "2-digit", year: "numeric" })
      : new Date().toLocaleDateString("id-ID", { day: "2-digit", month: "2-digit", year: "numeric" });

    // Adjust order items qty proporsional berdasarkan jumlah anggota terpilih (split invoice)
    const membersToInclude = selectedAnggota.length > 0 ? selectedAnggota : (availableAnggota.length > 0 ? availableAnggota : [p.namaGroup || "Jamaah"]);
    const totalAnggotaPdf = availableAnggota.length || p.group?.jumlahAnggota || p.group?.anggota?.length || 1;
    const splitPaxPdf = membersToInclude.length || totalAnggotaPdf;

    const adjustedOrderItemsPdf = orderItems.map((it) => {
      const origQty = it.qty || 1;
      const activeAllocated = it.allocatedJamaah
        ? it.allocatedJamaah.filter((n) => membersToInclude.includes(n))
        : undefined;
      const adjQty = it.allocatedJamaah
        ? Math.max(1, activeAllocated?.length || 1)
        : Math.max(1, Math.round((origQty / totalAnggotaPdf) * splitPaxPdf));
      const satuan = it.hargaSatuan || (it.nominal / origQty);
      return {
        ...it,
        qty: adjQty,
        nominal: satuan * adjQty,
        hargaSatuan: satuan,
        allocatedJamaah: activeAllocated && activeAllocated.length > 0 ? activeAllocated : it.allocatedJamaah,
      };
    });

    const totalBeban = adjustedOrderItemsPdf
      .filter((it) => it.tipe === "penambahan")
      .reduce((sum, it) => sum + (it.nominal || 0), 0);
    const totalDiskon = adjustedOrderItemsPdf
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
      jumlahPax: splitPaxPdf,
      hargaSatuanPaket: p.group?.keberangkatan?.hargaPaket || 37400000,
      tanggalBerangkat: p.group?.keberangkatan?.tanggalBerangkat
        ? new Date(p.group.keberangkatan.tanggalBerangkat).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })
        : undefined,
      hotelMekkah: formHotelMekkah || p.group?.keberangkatan?.hotelMekkah || "GRAND AL MASSA",
      hotelMadinah: formHotelMadinah || p.group?.keberangkatan?.hotelMadinah || "DURRAT AL EIMAN",
      anggota: membersToInclude,
      orderItems: adjustedOrderItemsPdf,
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

  // Synchronize official PDF invoice to centralized Google Drive folder (1KWIURZBbS0lGvazUkSNpMGmo54DM6kDl)
  const syncInvoiceToGoogleDrive = useCallback(async (target: any) => {
    if (!target) return null;
    const existingId = target.invoiceDriveId || target.driveFileId;
    if (existingId) return existingId;

    const invNum = target.invoiceId || invoiceNumber;
    if (!invNum) return null;
    const nom = target.jumlah || formNominal;
    const payload = getInvoicePdfPayload(target, invNum, nom);
    const pdfBase64 = getInvoicePdfBase64(payload);

    setIsUploadingToDrive(true);
    setDriveUploadError(null);
    try {
      const res = await fetch("/api/invoices/upload-drive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentId: target.id,
          invoiceNumber: invNum,
          kodeRegistrasi: target.kodeRegistrasi || target.group?.kodeRegistrasi || payload.kodeRegistrasi,
          namaGroup: target.namaGroup || target.group?.namaGroup || payload.namaGroup,
          pdfBase64,
        }),
      });
      const data = await res.json();
      if (data.success && data.fileId) {
        setSendInvoiceTarget((prev: any) =>
          prev && prev.id === target.id
            ? { ...prev, invoiceDriveId: data.fileId, driveFileId: data.fileId }
            : prev
        );
        setQueue((prev) =>
          prev.map((it) => (it.id === target.id ? { ...it, invoiceDriveId: data.fileId } : it))
        );
        if (selectedPayment?.id === target.id) {
          setSelectedPayment((prev: any) => (prev ? { ...prev, invoiceDriveId: data.fileId } : null));
        }
        return data.fileId;
      } else {
        console.warn("[syncInvoiceToGoogleDrive] Upload response notice:", data.message);
        setDriveUploadError(data.message);
        return null;
      }
    } catch (err: any) {
      console.error("[syncInvoiceToGoogleDrive] Error:", err);
      setDriveUploadError(err?.message || "Gagal mengunggah ke Google Drive");
      return null;
    } finally {
      setIsUploadingToDrive(false);
    }
  }, [invoiceNumber, formNominal, getInvoicePdfPayload, selectedPayment]);

  useEffect(() => {
    if (sendInvoiceTarget && !sendInvoiceTarget.invoiceDriveId && !sendInvoiceTarget.driveFileId) {
      syncInvoiceToGoogleDrive(sendInvoiceTarget);
    }
  }, [sendInvoiceTarget, syncInvoiceToGoogleDrive]);

  const handleDownloadPdf = useCallback((paymentObj?: any) => {
    const p = paymentObj || sendInvoiceTarget || selectedPayment;
    if (!p) return;
    const invNum = p.invoiceId || invoiceNumber;
    const nom = p.jumlah || formNominal;
    const payload = getInvoicePdfPayload(p, invNum, nom);

    const regId = (p.kodeRegistrasi || p.group?.kodeRegistrasi || payload.kodeRegistrasi || "REG").replace(/[/\\?%*:|"<>]/g, "").trim();
    const grpName = (p.namaGroup || p.group?.namaGroup || payload.namaGroup || "Jamaah").replace(/[/\\?%*:|"<>]/g, "").trim();
    const customFilename = `${regId} - ${grpName}.pdf`;

    downloadInvoicePdf(payload, customFilename);
    setSuccessMessage(`File PDF Invoice (${customFilename}) berhasil diunduh!`);
    setShowSuccess(true);
  }, [sendInvoiceTarget, selectedPayment, invoiceNumber, formNominal, getInvoicePdfPayload]);

  const handleSendWhatsApp = async () => {
    if (!sendInvoiceTarget) return;
    const invNum = sendInvoiceTarget.invoiceId || invoiceNumber;
    const nom = sendInvoiceTarget.jumlah || formNominal;
    const payload = getInvoicePdfPayload(sendInvoiceTarget, invNum, nom);

    // 1. Template nama file: [ID Reg] - [Nama Perwakilan Jamaah / Ketua Group Pendaftar].pdf
    const regId = (sendInvoiceTarget.kodeRegistrasi || sendInvoiceTarget.group?.kodeRegistrasi || payload.kodeRegistrasi || "REG").replace(/[/\\?%*:|"<>]/g, "").trim();
    const grpName = (sendInvoiceTarget.namaGroup || sendInvoiceTarget.group?.namaGroup || payload.namaGroup || "Jamaah").replace(/[/\\?%*:|"<>]/g, "").trim();
    const customFilename = `${regId} - ${grpName}.pdf`;

    // 2. Fungsi 1: Otomatis download file PDF invoice fisik
    downloadInvoicePdf(payload, customFilename);

    // 3. Pastikan upload ke Google Drive selesai sebelum membuka link WA jika belum ada
    let currentTarget = sendInvoiceTarget;
    if (!currentTarget.invoiceDriveId && !currentTarget.driveFileId) {
      const uploadedId = await syncInvoiceToGoogleDrive(currentTarget);
      if (uploadedId) {
        currentTarget = { ...currentTarget, invoiceDriveId: uploadedId, driveFileId: uploadedId };
      }
    }

    // 4. Fungsi 2: Otomatis hyperlink langsung ke nomor WA Web tujuan + prefilled text
    const rawPhone = targetPhone || currentTarget.telepon || currentTarget.group?.ketuaGroup?.nomorTelepon || "";
    const cleanPhone = rawPhone.replace(/[^0-9]/g, "").replace(/^0/, "62");
    const msg = generateInvoiceMessage(currentTarget, invNum, nom);

    const waUrl = getWhatsAppUrl(cleanPhone, msg);

    // Buka tab WhatsApp Web secara langsung
    window.open(waUrl, "_blank");

    setSuccessMessage(`File (${customFilename}) otomatis terunduh & WhatsApp Web dibuka langsung ke nomor ${cleanPhone || "Jamaah"}!`);
    setShowSuccess(true);
  };

  const handleSendEmail = () => {
    if (!sendInvoiceTarget) return;
    const invNum = sendInvoiceTarget.invoiceId || invoiceNumber;
    const nom = sendInvoiceTarget.jumlah || formNominal;
    const payload = getInvoicePdfPayload(sendInvoiceTarget, invNum, nom);

    // Download PDF for user to attach
    downloadInvoicePdf(payload);

    const subject = `Invoice Pembayaran Resmi VTU ABADI â€” ${invNum} (${sendInvoiceTarget.namaGroup || sendInvoiceTarget.kodeRegistrasi})`;
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

      // Otomatis sinkronkan invoice ke Google Drive terpusat
      syncInvoiceToGoogleDrive(updated);
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
      const alasan = rejectNotes ? `${rejectReason} â€” ${rejectNotes}` : rejectReason;
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

  // Calculate group financial summaries with order adjustments â€” qty adjusted for split
  const displayTotalAnggota = availableAnggota.length || selectedPayment?.group?.jumlahAnggota || 1;
  const displaySplitPax = selectedAnggota.length > 0 ? selectedAnggota.length : displayTotalAnggota;

  const adjustedOrderItemsDisplay = orderItems.map((it) => {
    const origQty = it.qty || 1;
    const activeAllocated = it.allocatedJamaah
      ? it.allocatedJamaah.filter((n) => selectedAnggota.length === 0 || selectedAnggota.includes(n))
      : undefined;
    const adjQty = it.allocatedJamaah
      ? Math.max(1, activeAllocated?.length || 1)
      : Math.max(1, Math.round((origQty / displayTotalAnggota) * displaySplitPax));
    const satuan = it.hargaSatuan || (it.nominal / origQty);
    return {
      ...it,
      qty: adjQty,
      nominal: satuan * adjQty,
      hargaSatuan: satuan,
      allocatedJamaah: activeAllocated && activeAllocated.length > 0 ? activeAllocated : it.allocatedJamaah,
    };
  });

  const totalBebanTambahan = adjustedOrderItemsDisplay
    .filter((it) => it.tipe === "penambahan")
    .reduce((sum, it) => sum + (it.nominal || 0), 0);

  const totalPengurangan = adjustedOrderItemsDisplay
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
                <option value="all">ًں“… Semua Tanggal</option>
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
                                    setPreviewImageUrl(resolveDocumentImageUrl(p.buktiUrl));
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
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-[11px] font-bold text-foreground">Nominal Invoice / Pembayaran (Rp)</label>
                      <span className="text-[10px] text-amber-600 font-extrabold">{formatCurrency(formNominal)}</span>
                    </div>
                    <CurrencyInput
                      value={formNominal}
                      onChange={(val) => setFormNominal(val)}
                      className="h-9 font-mono font-bold text-sm text-foreground"
                      placeholder="0"
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
                            {h40Info.isLate ? "âڑ ï¸ڈ â‰¤ H-40 Mepet" : "Standar H-40"}
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
                          âڑ ï¸ڈ PERINGATAN: PENDAFTARAN PADA RENTANG H-40 KEBERANGKATAN ({h40Info.daysToDeparture} HARI LAGI)
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
                        ًںڈ·ï¸ڈ Klaster Pendaftaran: {resolveKlasterName(selectedPayment)}
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
                          <span className="text-[10px] text-muted-foreground">â€¢</span>
                          <button
                            type="button"
                            onClick={() => setSelectedAnggota([])}
                            className="text-[10px] text-muted-foreground hover:underline cursor-pointer"
                          >
                            Reset
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-1.5 bg-background p-2 rounded-lg border max-h-48 overflow-y-auto">
                        {availableAnggota.map((nama, idx) => {
                          const isChecked = selectedAnggota.includes(nama);
                          const currentRoom = memberRoomTypes[nama] || "Quad";
                          const badgeStyle = getRoomTypeBadgeStyle(currentRoom);

                          return (
                            <div
                              key={nama + idx}
                              className={`flex items-center justify-between gap-2 p-1.5 rounded text-xs transition-colors ${
                                isChecked ? "bg-primary/5 font-semibold text-foreground" : "text-muted-foreground hover:bg-muted"
                              }`}
                            >
                              <label className="flex items-center gap-2 cursor-pointer flex-1 min-w-0">
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
                                  className="rounded text-primary focus:ring-primary h-3.5 w-3.5 shrink-0"
                                />
                                <span className="truncate">{idx + 1}. {nama}</span>
                              </label>

                              {/* Interactive Room Type Badge & Selector */}
                              <div className="flex items-center gap-1.5 shrink-0">
                                <select
                                  value={currentRoom}
                                  onChange={(e) => {
                                    const newRoom = e.target.value;
                                    setMemberRoomTypes((prev) => ({ ...prev, [nama]: newRoom }));
                                  }}
                                  className={`text-[10px] font-bold px-2 py-0.5 rounded-md border cursor-pointer bg-background transition-all hover:scale-102 ${badgeStyle}`}
                                  title={`Tipe Kamar: ${currentRoom} (Klik untuk ubah)`}
                                >
                                  {ROOM_TYPE_OPTIONS.map((opt) => (
                                    <option key={opt.value} value={opt.value}>
                                      ًں›ڈï¸ڈ {opt.label}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <p className="text-[9.5px] text-muted-foreground">
                        ًں’، Centang nama anggota yang ditagihkan. Anda juga dapat menentukan tipe kamar per-jamaah (Quad, Double, Triple, Mix, dll).
                      </p>
                    </div>
                  )}
                </div>

                {/* 3. Bukti Slip Thumbnail Preview di dalam Form */}
                {selectedPayment.buktiUrl && (
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
                        setPreviewImageUrl(resolveDocumentImageUrl(selectedPayment.buktiUrl));
                        setZoomLevel(1);
                      }}
                    >
                      Buka Slip
                    </Button>
                  </div>
                )}

                {/* 3.75. Tabel Rincian Tagihan & Potongan Group (Di Atas Riwayat Pembayaran) */}
                <div className="p-3 bg-stone-50 dark:bg-stone-900/60 rounded-xl border border-stone-200 dark:border-stone-800 space-y-2 text-xs">
                  <div className="flex items-center justify-between border-b pb-2">
                    <div className="flex items-center gap-1.5">
                      <div className="p-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-md">
                        <Receipt className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="font-bold text-foreground text-xs flex items-center gap-1.5">
                          Rincian Tagihan &amp; Potongan Group
                          {orderItems.length > 0 && (
                            <Badge variant="warning" className="text-[10px] px-1.5 py-0">
                              +{orderItems.length} Item Tambahan
                            </Badge>
                          )}
                        </h4>
                        <p className="text-[10px] text-muted-foreground">
                          Rincian komponen tagihan dasar paket, beban tambahan order, dan potongan diskon.
                        </p>
                      </div>
                    </div>

                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs font-bold border-amber-500/40 hover:bg-amber-500/10 text-amber-600 dark:text-amber-400 gap-1.5"
                      onClick={() => {
                        const defaultOpt = masterTambahanOptions[0] || "Upgrade Kamar Double";
                        setNewOrderName(defaultOpt);
                        setNewOrderType("penambahan");
                        setNewOrderNominal(getPackageUpgradePrice(selectedPayment, defaultOpt));
                        setNewOrderQty(1);
                        setNewOrderAllocatedMembers([]);
                        setIsOrderCustomJenisMode(false);
                        setShowAddOrderModal(true);
                      }}
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      Tambah Item
                    </Button>
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
                          <th className="py-2 px-2.5 text-center w-10">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y text-xs">
                        {/* Base Package Main Billing Item */}
                        <tr className="hover:bg-muted/30 transition-colors">
                          <td className="py-2 px-2.5 font-medium text-foreground">
                            {selectedPayment.group?.keberangkatan?.namaPaket || selectedPayment.namaPaket || selectedPayment.group?.namaPaket || "Paket Umroh"}
                          </td>
                          <td className="py-2 px-2.5">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                              Tagihan Utama
                            </span>
                          </td>
                          <td className="py-2 px-2.5 text-center font-mono font-bold text-slate-700 dark:text-slate-300">
                            {displaySplitPax} Pax
                          </td>
                          <td className="py-2 px-2.5 text-right font-mono tabular-nums text-stone-600 dark:text-stone-400">
                            {formatCurrency(selectedPayment.group?.keberangkatan?.hargaPaket || (groupTotalTagihanBase / Math.max(1, displayTotalAnggota)))}
                          </td>
                          <td className="py-2 px-2.5 text-right font-mono font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">
                            {formatCurrency((selectedPayment.group?.keberangkatan?.hargaPaket || (groupTotalTagihanBase / Math.max(1, displayTotalAnggota))) * displaySplitPax)}
                          </td>
                          <td className="py-2 px-2.5 text-center">
                            <span className="text-stone-300 dark:text-stone-700 select-none">â€”</span>
                          </td>
                        </tr>

                        {/* Dynamic Order Items (Tambahan / Potongan) */}
                        {adjustedOrderItemsDisplay.map((item) => {
                          const isPotongan = item.tipe === "pengurangan";
                          return (
                            <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                              <td className="py-2 px-2.5 font-medium text-foreground">
                                <div>
                                  <p>{item.nama}</p>
                                  {item.allocatedJamaah && item.allocatedJamaah.length > 0 ? (
                                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                      <span className="text-[9.5px] font-semibold text-amber-700 dark:text-amber-300 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                                        ًں›ڈï¸ڈ Peruntukan: {item.allocatedJamaah.join(", ")}
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setReallocatingItem(item);
                                          setTempReallocatedMembers(item.allocatedJamaah || []);
                                          setShowReallocateModal(true);
                                        }}
                                        className="text-[9.5px] text-primary hover:underline font-bold cursor-pointer"
                                      >
                                        Ubah
                                      </button>
                                    </div>
                                  ) : isRoomUpgradeItem(item.nama) ? (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setReallocatingItem(item);
                                        setTempReallocatedMembers([]);
                                        setShowReallocateModal(true);
                                      }}
                                      className="text-[9.5px] text-amber-600 dark:text-amber-400 hover:underline font-bold cursor-pointer block mt-0.5"
                                    >
                                      + Atur Alokasi Jamaah
                                    </button>
                                  ) : null}
                                </div>
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
                                {item.qty} Pax
                              </td>
                              <td className="py-2 px-2.5 text-right font-mono tabular-nums text-stone-600 dark:text-stone-400">
                                {formatCurrency(item.hargaSatuan || (item.nominal / (item.qty || 1)))}
                              </td>
                              <td className={`py-2 px-2.5 text-right font-mono font-bold tabular-nums ${
                                isPotongan ? "text-amber-600 dark:text-amber-400" : "text-emerald-700 dark:text-emerald-400"
                              }`}>
                                {isPotongan ? `- ${formatCurrency(item.nominal)}` : formatCurrency(item.nominal)}
                              </td>
                              <td className="py-2 px-2.5 text-center">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-6 w-6 p-0 text-destructive hover:bg-destructive/10"
                                  onClick={() => {
                                    if (item.allocatedJamaah && item.allocatedJamaah.length > 0) {
                                      const defaultGroupRoom = detectRoomTypeFromName(selectedPayment?.group?.roomUpgrade || selectedPayment?.roomUpgrade || "Quad");
                                      setMemberRoomTypes((prev) => {
                                        const updated = { ...prev };
                                        item.allocatedJamaah?.forEach((n) => {
                                          updated[n] = defaultGroupRoom;
                                        });
                                        return updated;
                                      });
                                    }
                                    setOrderItems((prev) => prev.filter((i) => i.id !== item.id));
                                  }}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
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
                          <td colSpan={2} className="py-2 px-2.5 text-right font-mono text-sm text-emerald-700 dark:text-emerald-400">
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
        description={`Nomor Invoice: ${sendInvoiceTarget?.invoiceId || invoiceNumber} â€” ${sendInvoiceTarget?.namaGroup || "Group"}`}
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
                    {isUploadingToDrive ? (
                      <Badge variant="outline" className="text-[9px] px-1.5 py-0 text-blue-600 border-blue-400 animate-pulse gap-1">
                        <Loader2 className="h-2.5 w-2.5 animate-spin" />
                        Sync Google Drive...
                      </Badge>
                    ) : sendInvoiceTarget?.invoiceDriveId || sendInvoiceTarget?.driveFileId ? (
                      <Badge variant="outline" className="text-[9px] px-1.5 py-0 text-emerald-700 border-emerald-500 bg-emerald-100/60 dark:bg-emerald-950/40 gap-1 font-semibold">
                        <Check className="h-2.5 w-2.5" />
                        Google Drive Ready
                      </Badge>
                    ) : driveUploadError ? (
                      <Badge variant="outline" className="text-[9px] px-1.5 py-0 text-amber-600 border-amber-400">
                        GDrive: Web Fallback
                      </Badge>
                    ) : null}
                  </div>
                  <p className="text-[10px] text-emerald-800 dark:text-emerald-400 mt-0.5">
                    {sendInvoiceTarget?.invoiceDriveId || sendInvoiceTarget?.driveFileId
                      ? "Dokumen resmi tersimpan aman di Google Drive Perusahaan (Direct Download aktif di link WA)"
                      : "Dokumen resmi kuitansi & invoice PT Vauza Tamma Abadi (Otomatis terlampir saat kirim)"}
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
                <span className="font-extrabold block">ًں“ژ CARA MENGIRIM FILE PDF ASLI DI WA WEB:</span>
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
                href={resolveDocumentImageUrl(previewImageUrl)}
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
                src={resolveDocumentImageUrl(previewImageUrl)}
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

      {/* Modal Tambah Item (Tab 1) */}
      <Modal
        open={showAddOrderModal}
        onClose={() => setShowAddOrderModal(false)}
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
                onClick={() => {
                  setNewOrderType("penambahan");
                  const defaultOpt = masterTambahanOptions[0] || "";
                  setNewOrderName(defaultOpt);
                  setNewOrderNominal(getPackageUpgradePrice(selectedPayment, defaultOpt));
                }}
                className={`p-2.5 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                  newOrderType === "penambahan"
                    ? "border-emerald-500 bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 shadow-xs"
                    : "border-stone-200 dark:border-stone-800 text-muted-foreground hover:bg-muted/50"
                }`}
              >
                + Tambahan Tagihan
              </button>
              <button
                type="button"
                onClick={() => {
                  setNewOrderType("pengurangan");
                  const defaultOpt = masterPotonganOptions[0] || "";
                  setNewOrderName(defaultOpt);
                  setNewOrderNominal(0);
                }}
                className={`p-2.5 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                  newOrderType === "pengurangan"
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
                {newOrderType === "penambahan" ? "Jenis Tambahan Tagihan" : "Jenis Potongan / Diskon"}
              </label>
              <button
                type="button"
                onClick={() => setShowManageJenisModal(true)}
                className="p-1 rounded-md text-amber-600 dark:text-amber-400 hover:bg-amber-500/15 transition-colors cursor-pointer"
                title="âڑ™ï¸ڈ Kelola, Tambah, Edit, atau Hapus Daftar Opsi Jenis"
              >
                <Settings2 className="h-4 w-4" />
              </button>
            </div>

            {isOrderCustomJenisMode ? (
              <div className="space-y-1.5">
                <div className="flex gap-2">
                  <Input
                    placeholder={
                      newOrderType === "penambahan"
                        ? "Ketik jenis tambahan baru..."
                        : "Ketik jenis potongan baru..."
                    }
                    value={newOrderName}
                    onChange={(e) => {
                      const val = e.target.value;
                      setNewOrderName(val);
                      if (newOrderType === "penambahan" && isRoomUpgradeItem(val)) {
                        const price = getPackageUpgradePrice(selectedPayment, val);
                        if (price > 0 && newOrderNominal === 0) {
                          setNewOrderNominal(price);
                        }
                      }
                    }}
                    autoFocus
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="text-xs shrink-0"
                    onClick={() => {
                      setIsOrderCustomJenisMode(false);
                      const opts = newOrderType === "penambahan" ? masterTambahanOptions : masterPotonganOptions;
                      const optVal = opts[0] || "";
                      setNewOrderName(optVal);
                      if (newOrderType === "penambahan") {
                        setNewOrderNominal(getPackageUpgradePrice(selectedPayment, optVal));
                      } else {
                        setNewOrderNominal(0);
                      }
                    }}
                  >
                    Batal
                  </Button>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  âœ¨ Jenis baru ini akan otomatis tersimpan sebagai opsi pilihan berikutnya.
                </p>
              </div>
            ) : (
              <select
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs ring-offset-background focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                value={newOrderName}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === "__ADD_NEW__") {
                    setIsOrderCustomJenisMode(true);
                    setNewOrderName("");
                    setNewOrderNominal(0);
                  } else {
                    setNewOrderName(val);
                    if (newOrderType === "penambahan") {
                      const price = getPackageUpgradePrice(selectedPayment, val);
                      setNewOrderNominal(price);
                    }
                  }
                }}
              >
                {(newOrderType === "penambahan" ? masterTambahanOptions : masterPotonganOptions).map((opt: string) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
                <option value="__ADD_NEW__">â‍• + Tambah Jenis Baru...</option>
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
              value={newOrderNominal || ""}
              onChange={(e) => setNewOrderNominal(Number(e.target.value))}
            />
          </div>

          {/* 4. Room Upgrade Allocation Section (Khusus Tambahan Upgrade Kamar) */}
          {newOrderType === "penambahan" && isRoomUpgradeItem(newOrderName) && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                  ًں›ڈï¸ڈ Alokasikan Kamar ke Jamaah:
                </label>
                <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded">
                  {newOrderAllocatedMembers.length} Jamaah Terpilih
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground">
                Centang jamaah dari invoice ini yang mendapatkan kamar {detectRoomTypeFromName(newOrderName)}. (Quantity otomatis tersinkron).
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-36 overflow-y-auto bg-background p-2 rounded-md border">
                {(selectedAnggota.length > 0 ? selectedAnggota : availableAnggota).map((nama, idx) => {
                  const isAllocated = newOrderAllocatedMembers.includes(nama);
                  return (
                    <label
                      key={nama + idx}
                      className={`flex items-center gap-2 p-1.5 rounded text-xs cursor-pointer transition-colors ${
                        isAllocated
                          ? "bg-amber-500/15 font-bold text-amber-900 dark:text-amber-200 border border-amber-500/30"
                          : "text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isAllocated}
                        onChange={(e) => {
                          if (e.target.checked) {
                            const updated = [...newOrderAllocatedMembers, nama];
                            setNewOrderAllocatedMembers(updated);
                            setNewOrderQty(Math.max(1, updated.length));
                          } else {
                            const updated = newOrderAllocatedMembers.filter((n) => n !== nama);
                            setNewOrderAllocatedMembers(updated);
                            setNewOrderQty(Math.max(1, updated.length));
                          }
                        }}
                        className="rounded text-amber-600 focus:ring-amber-500 h-3.5 w-3.5 shrink-0"
                      />
                      <span className="truncate">{nama}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {/* 5. Quantity Input with Max Limit */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-foreground">
                Quantity (Jumlah Pax)
              </label>
              <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">
                Maksimal: {maxOrderQtyLimit} Jamaah
              </span>
            </div>
            <Input
              type="number"
              min={1}
              max={maxOrderQtyLimit}
              placeholder="1"
              value={newOrderQty}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                if (isNaN(val) || val < 1) setNewOrderQty(1);
                else if (val > maxOrderQtyLimit) setNewOrderQty(maxOrderQtyLimit);
                else setNewOrderQty(val);
              }}
            />
            <p className="mt-1 text-[10px] text-muted-foreground">
              Dibatasi sesuai jumlah {maxOrderQtyLimit} jamaah terdaftar di grup ini.
            </p>
          </div>

          {/* Subtotal Preview */}
          {newOrderNominal > 0 && (
            <div className="p-2.5 rounded-lg bg-stone-100 dark:bg-stone-900 border text-xs flex justify-between items-center">
              <span className="text-muted-foreground font-medium">Subtotal Tambahan/Potongan:</span>
              <span className="font-mono font-bold text-amber-600 dark:text-amber-400 text-sm">
                {formatCurrency(newOrderNominal * newOrderQty)}
              </span>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowAddOrderModal(false)}
            >
              Batal
            </Button>
            <Button
              type="button"
              size="sm"
              className="font-bold bg-amber-500 hover:bg-amber-600 text-slate-950"
              onClick={() => {
                if (!newOrderName.trim() || newOrderNominal <= 0) return;
                const trimmedName = newOrderName.trim();
                const isPotongan = newOrderType === "pengurangan";

                if (!isPotongan) {
                  if (!masterTambahanOptions.includes(trimmedName)) {
                    saveTambahanOptions([...masterTambahanOptions, trimmedName]);
                  }
                } else {
                  if (!masterPotonganOptions.includes(trimmedName)) {
                    savePotonganOptions([...masterPotonganOptions, trimmedName]);
                  }
                }

                const qty = Math.min(Math.max(1, newOrderQty), maxOrderQtyLimit);
                const totalNominal = newOrderNominal * qty;
                const isRoomUpgrade = !isPotongan && isRoomUpgradeItem(trimmedName);
                const allocated = isRoomUpgrade && newOrderAllocatedMembers.length > 0 ? newOrderAllocatedMembers : undefined;

                setOrderItems((prev) => [
                  ...prev,
                  {
                    id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
                    nama: trimmedName,
                    nominal: totalNominal,
                    qty: qty,
                    hargaSatuan: newOrderNominal,
                    tipe: newOrderType,
                    kategori: isPotongan ? "potongan" : "tambahan",
                    allocatedJamaah: allocated,
                  },
                ]);

                // Otomatis update tipe kamar jamaah jika ini adalah upgrade kamar
                if (isRoomUpgrade && allocated && allocated.length > 0) {
                  const detectedRoom = detectRoomTypeFromName(trimmedName);
                  setMemberRoomTypes((prev) => {
                    const updated = { ...prev };
                    allocated.forEach((n) => {
                      updated[n] = detectedRoom;
                    });
                    return updated;
                  });
                }

                setNewOrderNominal(0);
                setNewOrderQty(1);
                setNewOrderAllocatedMembers([]);
                setIsOrderCustomJenisMode(false);
                setShowAddOrderModal(false);
              }}
              disabled={!newOrderName.trim() || newOrderNominal <= 0}
            >
              Simpan Item
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal Re-alokasi Upgrade Kamar ke Jamaah (Tab 1) */}
      <Modal
        open={showReallocateModal}
        onClose={() => {
          setShowReallocateModal(false);
          setReallocatingItem(null);
        }}
        title={`Atur Alokasi Jamaah â€” ${reallocatingItem?.nama || "Upgrade Kamar"}`}
        size="sm"
      >
        <div className="space-y-3 pt-1">
          <p className="text-xs text-muted-foreground">
            Pilih nama jamaah dari invoice ini yang mendapatkan peruntukan kamar <strong>{reallocatingItem ? detectRoomTypeFromName(reallocatingItem.nama) : ""}</strong>:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-48 overflow-y-auto bg-background p-2.5 rounded-lg border">
            {(selectedAnggota.length > 0 ? selectedAnggota : availableAnggota).map((nama, idx) => {
              const isChecked = tempReallocatedMembers.includes(nama);
              return (
                <label
                  key={nama + idx}
                  className={`flex items-center gap-2 p-1.5 rounded text-xs cursor-pointer transition-colors ${
                    isChecked
                      ? "bg-amber-500/15 font-bold text-amber-900 dark:text-amber-200 border border-amber-500/30"
                      : "text-muted-foreground hover:bg-muted"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setTempReallocatedMembers((prev) => [...prev, nama]);
                      } else {
                        setTempReallocatedMembers((prev) => prev.filter((n) => n !== nama));
                      }
                    }}
                    className="rounded text-amber-600 focus:ring-amber-500 h-3.5 w-3.5 shrink-0"
                  />
                  <span className="truncate">{nama}</span>
                </label>
              );
            })}
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setShowReallocateModal(false);
                setReallocatingItem(null);
              }}
            >
              Batal
            </Button>
            <Button
              type="button"
              size="sm"
              className="font-bold bg-amber-500 hover:bg-amber-600 text-slate-950"
              onClick={() => {
                if (!reallocatingItem) return;
                const newAlloc = tempReallocatedMembers;
                const newQty = Math.max(1, newAlloc.length);
                const targetRoom = detectRoomTypeFromName(reallocatingItem.nama);
                const defaultGroupRoom = detectRoomTypeFromName(selectedPayment?.group?.roomUpgrade || selectedPayment?.roomUpgrade || "Quad");

                setOrderItems((prev) =>
                  prev.map((it) =>
                    it.id === reallocatingItem.id
                      ? {
                          ...it,
                          allocatedJamaah: newAlloc.length > 0 ? newAlloc : undefined,
                          qty: newAlloc.length > 0 ? newQty : (it.qty || 1),
                          nominal: (it.hargaSatuan || (it.nominal / (it.qty || 1))) * (newAlloc.length > 0 ? newQty : (it.qty || 1)),
                        }
                      : it
                  )
                );

                // Update member room types
                setMemberRoomTypes((prev) => {
                  const updated = { ...prev };
                  // Reset previous allocated members
                  reallocatingItem.allocatedJamaah?.forEach((n) => {
                    updated[n] = defaultGroupRoom;
                  });
                  // Set new allocated members
                  newAlloc.forEach((n) => {
                    updated[n] = targetRoom;
                  });
                  return updated;
                });

                setShowReallocateModal(false);
                setReallocatingItem(null);
              }}
            >
              Simpan Alokasi ({tempReallocatedMembers.length} Jamaah)
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal Kelola Master Jenis Item (Edit / Hapus / Tambah Opsi) */}
      <Modal
        open={showManageJenisModal}
        onClose={() => setShowManageJenisModal(false)}
        title={`Kelola Master Opsi â€” ${newOrderType === "penambahan" ? "Tambahan Tagihan" : "Potongan / Diskon"}`}
        size="sm"
      >
        <div className="space-y-4 pt-1">
          <p className="text-xs text-muted-foreground">
            Ubah nama atau hapus opsi jenis {newOrderType === "penambahan" ? "tambahan tagihan" : "potongan"} yang kurang sesuai. Perubahan tersimpan secara otomatis.
          </p>

          <div className="flex gap-2">
            <Input
              placeholder={newOrderType === "penambahan" ? "Tambah opsi tambahan..." : "Tambah opsi potongan..."}
              value={tempNewJenis}
              onChange={(e) => setTempNewJenis(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddNewMasterJenisOrder()}
            />
            <Button
              type="button"
              size="sm"
              onClick={handleAddNewMasterJenisOrder}
              disabled={!tempNewJenis.trim()}
              className="bg-amber-600 hover:bg-amber-700 text-white shrink-0"
            >
              <Plus className="h-4 w-4 mr-1" /> Tambah
            </Button>
          </div>

          <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
            {(newOrderType === "penambahan" ? masterTambahanOptions : masterPotonganOptions).map((opt: string, idx: number) => (
              <div
                key={`${opt}-${idx}`}
                className="flex items-center justify-between p-2 rounded-lg bg-stone-100 dark:bg-stone-900 border text-xs"
              >
                {editingJenisIndex === idx ? (
                  <div className="flex items-center gap-1.5 w-full">
                    <Input
                      value={editingJenisText}
                      onChange={(e) => setEditingJenisText(e.target.value)}
                      className="h-7 text-xs"
                      autoFocus
                    />
                    <Button
                      type="button"
                      size="sm"
                      className="h-7 px-2 text-[11px]"
                      onClick={() => handleSaveEditMasterJenisOrder(idx)}
                    >
                      Simpan
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-[11px]"
                      onClick={() => setEditingJenisIndex(null)}
                    >
                      Batal
                    </Button>
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
                        onClick={() => handleDeleteMasterJenisOrder(opt)}
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

          <div className="flex justify-between items-center pt-2 border-t text-xs">
            <button
              type="button"
              onClick={handleResetMasterDefaultsOrder}
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
