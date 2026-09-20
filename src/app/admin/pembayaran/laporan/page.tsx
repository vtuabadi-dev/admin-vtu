"use client";

import { useState, useEffect, useMemo } from "react";
import dynamic from "next/dynamic";
import {
  Search,
  CreditCard,
  Upload,
  CheckCircle,
  Columns3,
  FilePlus,
  ClipboardCheck,
  Receipt,
  X,
  Sparkles,
  Check,
  PlusCircle,
  Plus,
  Settings2,
  Edit3,
  Trash2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/Card";
import { Button } from "@/shared/components/ui/Button";
import { Input } from "@/shared/components/ui/Input";
import { CurrencyInput } from "@/shared/components/ui/CurrencyInput";
import { Select } from "@/shared/components/ui/Select";
import { Modal } from "@/shared/components/ui/Modal";
import { StatusBadge } from "@/shared/components/ui/Badge";
import { LoadingSkeleton } from "@/shared/components/LoadingSkeleton";
import {
  getGroupPaymentSummary,
  getGroupByKode,
  addPembayaran,
  fetchInvoiceSplitConfig,
  saveInvoiceSplitConfig,
} from "@/server/actions/api";
import type {
  GroupPaymentSummary,
  Pembayaran,
  MetodePembayaran,
  InvoiceSplitConfig,
} from "@/shared/types";
import { formatCurrency, formatDate } from "@/shared/lib/utils";

import {
  BillingItem,
  metodeOptions,
  DEFAULT_TAMBAHAN_OPTIONS,
  DEFAULT_POTONGAN_OPTIONS,
  isRoomUpgradeItem,
  detectRoomTypeFromName,
  getPackageUpgradePrice,
  getInitialTambahanOptions,
  getInitialPotonganOptions,
} from "./_components/shared-constants";

// Lazy-loaded components for fast initial bundle & load
const PaymentReviewTab = dynamic(
  () => import("./_components/PaymentReviewTab"),
  {
    loading: () => (
      <div className="space-y-4 p-4">
        <LoadingSkeleton variant="table" rows={6} />
      </div>
    ),
    ssr: false,
  }
);

const CreateInvoiceModal = dynamic(
  () => import("./_components/CreateInvoiceModal"),
  { ssr: false }
);

const SplitInvoiceModal = dynamic(
  () => import("./_components/SplitInvoiceModal"),
  { ssr: false }
);


﻿export default function LaporanPembayaranPage() {
  const [activeTab, setActiveTab] = useState<"laporan" | "review">("review");
  const [showCreateInvoiceModal, setShowCreateInvoiceModal] = useState(false);

  // Group lookup (Dikunci 4-5 digit seperti CreateInvoiceModal)
  const [selectedYear, setSelectedYear] = useState<string>("2026");
  const [seqInput, setSeqInput] = useState<string>("");
  const [kodeInput, setKodeInput] = useState<string>("");
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState("");

  const currentFullCode = useMemo(() => {
    if (!seqInput.trim()) return "";
    const clean = seqInput.trim();
    const padded = clean.length <= 4 ? clean.padStart(4, "0") : clean.padStart(5, "0");
    return `GRP-${selectedYear}-${padded}`;
  }, [selectedYear, seqInput]);

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
  const [newBillingAllocatedMembers, setNewBillingAllocatedMembers] = useState<string[]>([]);
  const [isCustomJenisMode, setIsCustomJenisMode] = useState<boolean>(false);



  // Master lists for Additional Charges and Discounts
  const [masterTambahanOptions, setMasterTambahanOptions] = useState<string[]>(getInitialTambahanOptions);
  const [masterPotonganOptions, setMasterPotonganOptions] = useState<string[]>(getInitialPotonganOptions);

  // Master Options Manager Modal State
  const [showManageJenisModal, setShowManageJenisModal] = useState(false);
  const [tempNewJenis, setTempNewJenis] = useState("");
  const [editingJenisIndex, setEditingJenisIndex] = useState<number | null>(null);
  const [editingJenisText, setEditingJenisText] = useState("");

  // Fetch persistent master billing options from Supabase on load
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

  async function handleAddNewMasterJenis() {
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

    // Persist to Supabase Database
    try {
      await fetch("/api/admin/pembayaran/billing-options", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kategori: newBillingKategori, nama: name }),
      });
    } catch (err) {
      console.warn("[BillingOptions] Save to Supabase error:", err);
    }
  }

  async function handleSaveEditMasterJenis(idx: number) {
    if (!editingJenisText.trim()) return;
    const name = editingJenisText.trim();
    const oldName = newBillingKategori === "tambahan" ? masterTambahanOptions[idx] : masterPotonganOptions[idx];

    if (newBillingKategori === "tambahan") {
      const updated = [...masterTambahanOptions];
      updated[idx] = name;
      saveTambahanOptions(updated);
      if (newBillingNama === oldName) setNewBillingNama(name);
    } else {
      const updated = [...masterPotonganOptions];
      updated[idx] = name;
      savePotonganOptions(updated);
      if (newBillingNama === oldName) setNewBillingNama(name);
    }
    setEditingJenisIndex(null);
    setEditingJenisText("");

    // Persist update to Supabase Database
    try {
      await fetch("/api/admin/pembayaran/billing-options", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ oldNama: oldName, newNama: name, kategori: newBillingKategori }),
      });
    } catch (err) {
      console.warn("[BillingOptions] Edit to Supabase error:", err);
    }
  }

  async function handleDeleteMasterJenis(optName: string) {
    if (newBillingKategori === "tambahan") {
      const updated = masterTambahanOptions.filter((o) => o !== optName);
      saveTambahanOptions(updated);
      if (newBillingNama === optName) setNewBillingNama(updated[0] || "");
    } else {
      const updated = masterPotonganOptions.filter((o) => o !== optName);
      savePotonganOptions(updated);
      if (newBillingNama === optName) setNewBillingNama(updated[0] || "");
    }

    // Persist delete to Supabase Database
    try {
      await fetch("/api/admin/pembayaran/billing-options", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nama: optName, kategori: newBillingKategori }),
      });
    } catch (err) {
      console.warn("[BillingOptions] Delete from Supabase error:", err);
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

  const maxQtyLimit = useMemo(() => {
    // Saat split aktif, limit qty = jumlah anggota di split tersebut
    if (activeSplit) return activeSplit.anggotaIds.length || 1;
    return groupData?.jumlahAnggota || 1;
  }, [groupData?.jumlahAnggota, activeSplit]);

  useEffect(() => {
    if (newBillingKategori === "tambahan") {
      setNewBillingNama(masterTambahanOptions[0] || "");
    } else {
      setNewBillingNama(masterPotonganOptions[0] || "");
    }
    setIsCustomJenisMode(false);
    setNewBillingAllocatedMembers([]);
  }, [newBillingKategori, masterTambahanOptions, masterPotonganOptions, showAddItemModal]);

  // Adjust billing items qty proporsional berdasarkan split yang aktif
  const adjustedBillingItems = useMemo(() => {
    if (!activeSplit || !groupData) return billingItems;
    const totalAnggota = groupData.jumlahAnggota || 1;
    const splitPax = activeSplit.anggotaIds.length || 1;
    return billingItems.map((item) => {
      const activeAllocated = item.allocatedJamaah
        ? item.allocatedJamaah.filter((n) => activeAnggota.some((a) => a.namaLengkap === n || a.id === n))
        : undefined;
      const adjQty = item.allocatedJamaah
        ? Math.max(1, activeAllocated?.length || 1)
        : Math.max(1, Math.round((item.qty / totalAnggota) * splitPax));
      return {
        ...item,
        qty: adjQty,
        allocatedJamaah: activeAllocated && activeAllocated.length > 0 ? activeAllocated : item.allocatedJamaah,
      };
    });
  }, [billingItems, activeSplit, groupData, activeAnggota]);

  const totalTambahan = useMemo(() => {
    return adjustedBillingItems
      .filter((i) => i.kategori === "tambahan")
      .reduce((sum, i) => sum + i.nominal * i.qty, 0);
  }, [adjustedBillingItems]);

  const totalPotongan = useMemo(() => {
    return adjustedBillingItems
      .filter((i) => i.kategori === "potongan")
      .reduce((sum, i) => sum + i.nominal * i.qty, 0);
  }, [adjustedBillingItems]);

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
    const isPotongan = newBillingKategori === "potongan";

    if (!isPotongan) {
      if (!masterTambahanOptions.includes(trimmedName)) {
        setMasterTambahanOptions((prev) => [...prev, trimmedName]);
      }
    } else {
      if (!masterPotonganOptions.includes(trimmedName)) {
        setMasterPotonganOptions((prev) => [...prev, trimmedName]);
      }
    }

    const isRoomUpgrade = !isPotongan && isRoomUpgradeItem(trimmedName);
    const allocated = isRoomUpgrade && newBillingAllocatedMembers.length > 0 ? newBillingAllocatedMembers : undefined;

    const newItem: BillingItem = {
      id: `bill-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      nama: trimmedName,
      kategori: newBillingKategori,
      nominal: newBillingNominal,
      qty: Math.min(Math.max(1, newBillingQty), maxQtyLimit),
      allocatedJamaah: allocated,
    };

    setBillingItems((prev) => [...prev, newItem]);
    setNewBillingNominal(0);
    setNewBillingQty(1);
    setNewBillingAllocatedMembers([]);
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

  async function handleCari(overrideCode?: string) {
    setError("");
    setGroupData(null);
    setSplitConfig(null);
    setActiveSplitId(null);

    const targetCode = overrideCode || currentFullCode || kodeInput;
    if (!targetCode.trim()) {
      setError("Masukkan nomor sekuensial group (contoh: 0004 atau 00081)");
      return;
    }

    setSearching(true);
    try {
      // 1. Try exact targetCode
      let group = await getGroupByKode(targetCode.trim().toUpperCase());

      // 2. If not found and targetCode was derived from sequence, try alternate padding (4 digits vs 5 digits)
      if (!group && seqInput.trim()) {
        const cleanSeq = seqInput.trim();
        const alt4 = `GRP-${selectedYear}-${cleanSeq.padStart(4, "0")}`;
        const alt5 = `GRP-${selectedYear}-${cleanSeq.padStart(5, "0")}`;
        if (targetCode.toUpperCase() !== alt4.toUpperCase()) {
          group = await getGroupByKode(alt4);
        }
        if (!group && targetCode.toUpperCase() !== alt5.toUpperCase()) {
          group = await getGroupByKode(alt5);
        }
      }

      if (!group) {
        setError(`Group dengan kode "${targetCode}" tidak ditemukan`);
        setSearching(false);
        return;
      }

      // Sync inputs with found group
      if (group.kodeRegistrasi) {
        setKodeInput(group.kodeRegistrasi);
        const parts = group.kodeRegistrasi.split("-");
        if (parts[1]) setSelectedYear(parts[1]);
        if (parts[2]) setSeqInput(parts[2]);
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

      const pkgName = summary.keberangkatan?.namaPaket || (summary as any).namaPaket || (summary as any).paketUmroh?.namaPaket;
      const billingItemName = pkgName
        ? `${pkgName} (${summary.jumlahAnggota} Pax)`
        : `Tagihan Paket (${summary.jumlahAnggota} Pax)`;

      setGroupData(summary);
      setBillingItems([
        {
          id: "base-package",
          nama: billingItemName,
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
          {/* Group lookup: SMART 4/5-DIGIT LOOKUP CONTROL (Sesuai Gambar 1) */}
          <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-2 relative shadow-xs">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                <Search className="h-4 w-4 text-amber-600" />
                1. Cari &amp; Pilih Group Registrasi Jamaah (Dikunci 4 Digit)
              </label>
              {currentFullCode && (
                <span className="font-mono text-[11px] font-extrabold bg-amber-200 text-amber-900 px-2 py-0.5 rounded">
                  Target: {currentFullCode}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {/* Visual GRP Prefix */}
              <span className="px-3 py-2 bg-[#cb6806] text-white font-mono font-bold rounded-lg shrink-0 text-sm">
                GRP-
              </span>

              {/* Year Select Dropdown */}
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="px-2.5 py-2 bg-background border border-slate-300 dark:border-slate-700 font-mono font-bold rounded-lg text-sm shrink-0 cursor-pointer"
              >
                <option value="2026">2026</option>
                <option value="2025">2025</option>
                <option value="2027">2027</option>
                <option value="2028">2028</option>
              </select>

              <span className="font-mono font-bold text-amber-800 dark:text-amber-200">-</span>

              {/* 4-Digit Sequence Input */}
              <div className="relative flex-1">
                <input
                  type="text"
                  maxLength={5}
                  placeholder="0004"
                  value={seqInput}
                  onChange={(e) => {
                    const raw = e.target.value;
                    if (raw.toUpperCase().includes("GRP-")) {
                      const m = raw.toUpperCase().match(/GRP-(\d{4})-(\d+)/);
                      if (m && m[1] && m[2]) {
                        setSelectedYear(m[1]);
                        setSeqInput(m[2]);
                        return;
                      }
                    }
                    const val = raw.replace(/\D/g, "").slice(0, 5);
                    setSeqInput(val);
                  }}
                  onBlur={() => {
                    if (seqInput.trim()) {
                      const clean = seqInput.trim();
                      const padded = clean.length <= 4 ? clean.padStart(4, "0") : clean.padStart(5, "0");
                      setSeqInput(padded);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleCari();
                    }
                  }}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 font-mono font-bold rounded-lg text-sm tracking-widest text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <Button
                type="button"
                onClick={() => handleCari()}
                disabled={searching || !seqInput.trim()}
                className="bg-[#e3a869] hover:bg-[#d69554] text-white font-bold px-5 py-2 rounded-lg shrink-0 shadow-xs cursor-pointer"
              >
                <Search className="mr-1.5 h-4 w-4" />
                {searching ? "Mencari..." : "Cari Group"}
              </Button>
            </div>

            {error && <p className="mt-1 text-xs text-destructive font-medium">{error}</p>}
          </div>

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
                          onClick={() => {
                            const defaultOpt = masterTambahanOptions[0] || "Upgrade Kamar Double";
                            setNewBillingNama(defaultOpt);
                            setNewBillingKategori("tambahan");
                            setNewBillingNominal(getPackageUpgradePrice(groupData, defaultOpt));
                            setNewBillingQty(1);
                            setNewBillingAllocatedMembers([]);
                            setIsCustomJenisMode(false);
                            setShowAddItemModal(true);
                          }}
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
                            {adjustedBillingItems.map((item) => {
                              const itemTotal = item.nominal * item.qty;
                              return (
                                <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                                  <td className="p-2 font-medium">
                                    <div>
                                      <p className="text-foreground">{item.nama}</p>
                                      {item.allocatedJamaah && item.allocatedJamaah.length > 0 && (
                                        <span className="inline-block text-[9.5px] font-semibold text-amber-700 dark:text-amber-300 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20 mt-0.5">
                                          ًں›ڈï¸ڈ Peruntukan: {item.allocatedJamaah.join(", ")}
                                        </span>
                                      )}
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
                            ? `Riwayat Pembayaran â€” ${activeSplit.label}`
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
                        ? `Form Pembayaran â€” ${activeSplit.label}`
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
                                âœ“ Bukti Transfer WA Terlampir
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
                      <label className="text-sm font-medium mb-1 block">Nominal Pembayaran</label>
                      <CurrencyInput
                        placeholder="Masukkan nominal"
                        value={nominal}
                        onChange={(val) => setNominal(val)}
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
                        <div className="max-h-36 overflow-y-auto space-y-1.5 rounded-md border p-2">
                          {activeAnggota.map((a) => (
                            <div key={a.id} className="flex items-center gap-2 text-sm">
                              <span className="flex-1 truncate">{a.namaLengkap}</span>
                              <CurrencyInput
                                placeholder="0"
                                value={alokasi[a.id] || 0}
                                onChange={(val) => {
                                  setAlokasi((prev) => ({
                                    ...prev,
                                    [a.id]: val,
                                  }));
                                }}
                                className="w-32 h-7 text-xs"
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
      {activeTab === "review" && <PaymentReviewTab />}

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
                onClick={() => {
                  setNewBillingKategori("tambahan");
                  const defaultOpt = masterTambahanOptions[0] || "";
                  setNewBillingNama(defaultOpt);
                  setNewBillingNominal(getPackageUpgradePrice(groupData, defaultOpt));
                }}
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
                onClick={() => {
                  setNewBillingKategori("potongan");
                  const defaultOpt = masterPotonganOptions[0] || "";
                  setNewBillingNama(defaultOpt);
                  setNewBillingNominal(0);
                }}
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
                title="âڑ™ï¸ڈ Kelola, Tambah, Edit, atau Hapus Daftar Opsi Jenis"
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
                    onChange={(e) => {
                      const val = e.target.value;
                      setNewBillingNama(val);
                      if (newBillingKategori === "tambahan" && isRoomUpgradeItem(val)) {
                        const price = getPackageUpgradePrice(groupData, val);
                        if (price > 0 && newBillingNominal === 0) {
                          setNewBillingNominal(price);
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
                      setIsCustomJenisMode(false);
                      const opts = newBillingKategori === "tambahan" ? masterTambahanOptions : masterPotonganOptions;
                      const optVal = opts[0] || "";
                      setNewBillingNama(optVal);
                      if (newBillingKategori === "tambahan") {
                        setNewBillingNominal(getPackageUpgradePrice(groupData, optVal));
                      } else {
                        setNewBillingNominal(0);
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
                value={newBillingNama}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === "__ADD_NEW__") {
                    setIsCustomJenisMode(true);
                    setNewBillingNama("");
                    setNewBillingNominal(0);
                  } else {
                    setNewBillingNama(val);
                    if (newBillingKategori === "tambahan") {
                      const price = getPackageUpgradePrice(groupData, val);
                      setNewBillingNominal(price);
                    }
                  }
                }}
              >
                {(newBillingKategori === "tambahan" ? masterTambahanOptions : masterPotonganOptions).map((opt) => (
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
              value={newBillingNominal || ""}
              onChange={(e) => setNewBillingNominal(Number(e.target.value))}
            />
          </div>

          {/* 4. Room Upgrade Allocation Section (Khusus Tambahan Upgrade Kamar) */}
          {newBillingKategori === "tambahan" && isRoomUpgradeItem(newBillingNama) && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                  ًں›ڈï¸ڈ Alokasikan Kamar ke Jamaah:
                </label>
                <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded">
                  {newBillingAllocatedMembers.length} Jamaah Terpilih
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground">
                Centang jamaah yang mendapatkan kamar {detectRoomTypeFromName(newBillingNama)}. (Quantity otomatis tersinkron).
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-36 overflow-y-auto bg-background p-2 rounded-md border">
                {(activeAnggota.length > 0 ? activeAnggota : (groupData?.anggota || [])).map((a, idx) => {
                  const nama = a.namaLengkap;
                  const isAllocated = newBillingAllocatedMembers.includes(nama);
                  return (
                    <label
                      key={a.id || nama + idx}
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
                            const updated = [...newBillingAllocatedMembers, nama];
                            setNewBillingAllocatedMembers(updated);
                            setNewBillingQty(Math.max(1, updated.length));
                          } else {
                            const updated = newBillingAllocatedMembers.filter((n) => n !== nama);
                            setNewBillingAllocatedMembers(updated);
                            setNewBillingQty(Math.max(1, updated.length));
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
        title={`Kelola Master Opsi â€” ${newBillingKategori === "tambahan" ? "Tambahan Tagihan" : "Potongan / Diskon"}`}
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

