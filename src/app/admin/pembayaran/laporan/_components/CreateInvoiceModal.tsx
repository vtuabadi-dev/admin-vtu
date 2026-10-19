"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Search,
  CreditCard,
  RefreshCw,
  UserPlus,
  XCircle,
  ArrowDownLeft,
  AlertTriangle,
  Package,
  Layers,
  Receipt,
  Clock,
} from "lucide-react";
import { cn, formatDateShort, formatCurrency } from "@/shared/lib/utils";
import { Button } from "@/shared/components/ui/Button";
import { Input } from "@/shared/components/ui/Input";
import { CurrencyInput } from "@/shared/components/ui/CurrencyInput";
import { Modal } from "@/shared/components/ui/Modal";
import {
  getGroupByKode,
  getGroupList,
  getKeberangkatanList,
  createInvoice,
  addJamaahToGroup,
} from "@/server/actions/api";
import {
  resolvePackageClusterDetails,
  getPackageUpgradePrice,
  detectRoomTypeFromName,
  isBaseRoomType,
} from "./shared-constants";
import { broadcastMutation } from "@/shared/lib/realtime-bus";

export default function CreateInvoiceModal({
  open,
  onClose,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: (invNumber: string, amount: number) => void;
}) {
  const [kategori, setKategori] = useState<
    "PEMBAYARAN" | "PINDAH_PAKET" | "TAMBAH_JAMAAH" | "PEMBATALAN" | "REFUND_MURNI"
  >("PEMBAYARAN");

  // Sub-options
  const [scopePembatalan, setScopePembatalan] = useState<"SEBAGIAN" | "SELURUH">("SEBAGIAN");
  const [refundStatus, setRefundStatus] = useState<"NON_REFUND" | "WITH_REFUND">("NON_REFUND");
  const [refundType, setRefundType] = useState<"KELEBIHAN_BAYAR" | "DEPOSIT">("KELEBIHAN_BAYAR");
  const [tambahPaxCount, setTambahPaxCount] = useState<number>(1);
  const [tambahJamaahList, setTambahJamaahList] = useState<
    Array<{ nama: string; gender: "L" | "P"; hubungan: string }>
  >([{ nama: "", gender: "L", hubungan: "" }]);

  function handlePaxCountChange(count: number) {
    const cleanCount = Math.max(1, Math.min(30, count));
    setTambahPaxCount(cleanCount);
    setTambahJamaahList((prev) => {
      const next = [...prev];
      if (cleanCount > next.length) {
        for (let i = next.length; i < cleanCount; i++) {
          next.push({ nama: "", gender: "L", hubungan: "" });
        }
      } else {
        return next.slice(0, cleanCount);
      }
      return next;
    });
  }

  function updateJamaahItem(index: number, field: "nama" | "gender" | "hubungan", val: string) {
    setTambahJamaahList((prev) => {
      const next = [...prev];
      if (next[index]) {
        next[index] = { ...next[index], [field]: val };
      }
      return next;
    });
  }

  // Group search states
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [seqInput, setSeqInput] = useState("");
  const [lookupError, setLookupError] = useState("");
  const [groupInfo, setGroupInfo] = useState<any>(null);
  const [h40Warning, setH40Warning] = useState<{ isLate: boolean; days: number; h40Formatted: string } | null>(null);

  // Suggestions state
  const [availableGroups, setAvailableGroups] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searching, setSearching] = useState(false);

  // Pindah Paket specific states
  const [keberangkatanList, setKeberangkatanList] = useState<any[]>([]);
  const [targetPaketId, setTargetPaketId] = useState<string>("");
  const [selectedClusterIndex, setSelectedClusterIndex] = useState<number>(0);
  const [pricingOption, setPricingOption] = useState<"HARGA_LAMA" | "HARGA_BARU">("HARGA_BARU");
  const [hotelUpgradeEnabled, setHotelUpgradeEnabled] = useState(false);
  const [hotelUpgradeName, setHotelUpgradeName] = useState("");
  const [hotelUpgradeNominal, setHotelUpgradeNominal] = useState<number>(0);

  const [nominal, setNominal] = useState<number>(0);
  const [jatuhTempo, setJatuhTempo] = useState("");
  const [catatan, setCatatan] = useState("");
  const [loading, setLoading] = useState(false);
  const [previewBuktiUrl, setPreviewBuktiUrl] = useState<string | null>(null);

  // Load active groups and departure packages
  useEffect(() => {
    if (open) {
      getGroupList().then((list) => setAvailableGroups(list || [])).catch(() => {});
      getKeberangkatanList().then((list) => setKeberangkatanList(list || [])).catch(() => {});
    }
  }, [open]);

  // Compute full group code
  const currentFullCode = useMemo(() => {
    if (!seqInput.trim()) return "";
    const cleanSeq = seqInput.trim().slice(0, 4).padStart(4, "0");
    return `GRP-${selectedYear}-${cleanSeq}`;
  }, [selectedYear, seqInput]);

  async function performGroupSearch(codeToSearch: string) {
    setLookupError("");
    setGroupInfo(null);
    setH40Warning(null);
    setTargetPaketId("");
    setShowSuggestions(false);
    if (!codeToSearch.trim()) {
      setLookupError("Masukkan 4 digit nomor sekuensial group");
      return;
    }
    setSearching(true);
    try {
      const group = await getGroupByKode(codeToSearch.trim().toUpperCase());
      if (!group) {
        setLookupError(`Group dengan ID ${codeToSearch} tidak ditemukan`);
        return;
      }
      selectGroupData(group);
    } catch {
      setLookupError("Gagal mencari data group");
    } finally {
      setSearching(false);
    }
  }

  async function selectGroupData(group: any) {
    setLookupError("");
    setShowSuggestions(false);
    setTargetPaketId("");

    // Auto extract year & 4-digit sequence into inputs
    if (group.kodeRegistrasi) {
      const parts = group.kodeRegistrasi.split("-");
      if (parts[1]) setSelectedYear(parts[1]);
      if (parts[2]) setSeqInput(parts[2].slice(0, 4));
    }

    let activeGroup = group;
    // Always fetch full details including invoices & payments if not present
    if (!group.invoices || !group.pembayaran) {
      try {
        const full = await getGroupByKode(group.kodeRegistrasi);
        if (full) {
          activeGroup = full;
        }
      } catch (err) {
        console.warn("Could not fetch full group details:", err);
      }
    }

    setGroupInfo(activeGroup);

    // Calculate financials
    const basePax = activeGroup.jumlahAnggota || activeGroup.anggotaIds?.length || 1;
    const basePrice =
      activeGroup.keberangkatan?.hargaPaket ||
      activeGroup.paketKeberangkatan?.hargaPaket ||
      0;
    const totalTagihan =
      activeGroup.totalTagihan > 0 ? activeGroup.totalTagihan : basePax * basePrice;
    const verifiedSum = (activeGroup.pembayaran || [])
      .filter((p: any) => p.status === "verified")
      .reduce((acc: number, p: any) => acc + (p.jumlah || 0), 0) || (activeGroup.totalPembayaran ?? 0);
    const sisa = Math.max(0, totalTagihan - verifiedSum);

    if (kategori === "PEMBAYARAN") {
      setNominal(sisa > 0 ? sisa : activeGroup.sisaPembayaran || 0);
    }

    // Calculate H-40 for group's package departure
    const tglBerangkatRaw =
      (activeGroup as any)?.paketKeberangkatan?.tanggalBerangkat ||
      (activeGroup as any)?.keberangkatan?.tanggalBerangkat;
    if (tglBerangkatRaw) {
      const tglBerangkat = new Date(tglBerangkatRaw);
      const h40 = new Date(tglBerangkat);
      h40.setDate(h40.getDate() - 40);

      const now = new Date();
      const diffMs = tglBerangkat.getTime() - now.getTime();
      const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const isLate = days <= 40 || now.getTime() >= h40.getTime();
      const h40Formatted = h40.toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });

      setH40Warning({ isLate, days, h40Formatted });

      if (isLate) {
        const fallback = new Date();
        fallback.setDate(fallback.getDate() + 3);
        setJatuhTempo(fallback.toISOString().slice(0, 10));
      } else {
        setJatuhTempo(h40.toISOString().slice(0, 10));
      }
    }
  }

  // Matching suggestions
  const matchingSuggestions = useMemo(() => {
    if (!seqInput.trim()) return availableGroups.slice(0, 6);
    const q = seqInput.toLowerCase();
    return availableGroups.filter(
      (g) =>
        g.kodeRegistrasi?.toLowerCase().includes(q) ||
        g.namaGroup?.toLowerCase().includes(q) ||
        g.ketuaGroup?.namaLengkap?.toLowerCase().includes(q)
    ).slice(0, 6);
  }, [availableGroups, seqInput]);

  // Current package belonging to selected group
  const currentPackage = useMemo(() => {
    if (!groupInfo) return null;
    return (
      groupInfo.keberangkatan ||
      groupInfo.paketKeberangkatan ||
      keberangkatanList.find((k) => k.id === groupInfo.paketKeberangkatanId) ||
      null
    );
  }, [groupInfo, keberangkatanList]);

  // Target destination package
  const targetPackage = useMemo(() => {
    if (!targetPaketId) return null;
    return keberangkatanList.find((k) => k.id === targetPaketId) || null;
  }, [targetPaketId, keberangkatanList]);

  // Extract clusters / variants from target package (e.g. SILVER/GOLD or Reguler/Varian 2)
  const targetClusters = useMemo(() => {
    if (!targetPackage) return [];
    const opts = (targetPackage as any).hotelOptions;
    if (!opts) return [];
    let parsed = opts;
    if (typeof opts === "string") {
      try {
        parsed = JSON.parse(opts);
      } catch {
        return [];
      }
    }
    if (!Array.isArray(parsed)) return [];
    return parsed.map((item: any, idx: number) => ({
      id: idx,
      clusterName: item.clusterName || item.variantName || item.namaCluster || `Klaster ${idx + 1}`,
      hargaBase: Number(item.hargaBase || item.harga || targetPackage.hargaPaket || 0),
      hotelMekkah: item.hotelMekkah || "",
      hotelMadinah: item.hotelMadinah || "",
      isVarian2: Boolean(item.isVarian2),
      isPromo: Boolean(item.isPromo),
    }));
  }, [targetPackage]);

  const activeTargetCluster = useMemo(() => {
    if (!targetClusters || targetClusters.length === 0) return null;
    return targetClusters[selectedClusterIndex] || targetClusters[0] || null;
  }, [targetClusters, selectedClusterIndex]);

  // Pindah Paket calculations
  const paxCount = groupInfo?.jumlahAnggota || groupInfo?.anggotaIds?.length || 1;
  const oldPrice = currentPackage?.hargaPaket || (groupInfo?.totalTagihan ? Math.round(groupInfo.totalTagihan / paxCount) : 0);
  
  // Dynamic price based on selected cluster / variant specification
  const newPrice = useMemo(() => {
    if (!targetPackage) return 0;
    if (pricingOption === "HARGA_BARU") {
      if (activeTargetCluster && typeof activeTargetCluster.hargaBase === "number" && activeTargetCluster.hargaBase > 0) {
        return activeTargetCluster.hargaBase;
      }
      return targetPackage.hargaPaket || 0;
    }
    return oldPrice;
  }, [targetPackage, pricingOption, activeTargetCluster, oldPrice]);

  const diffPerPax = newPrice - oldPrice;
  const totalDiff = diffPerPax * paxCount;

  // Auto-set nominal for Pindah Paket based on pricing option
  useEffect(() => {
    if (kategori === "PINDAH_PAKET") {
      if (pricingOption === "HARGA_BARU" && totalDiff > 0) {
        setNominal(totalDiff);
      } else {
        setNominal(0);
      }
    }
  }, [kategori, pricingOption, totalDiff]);

  // Comprehensive financial summary for selected group
  const financialSummary = useMemo(() => {
    if (!groupInfo) return null;

    const basePax = groupInfo.jumlahAnggota || groupInfo.anggotaIds?.length || 1;
    const clusterDetails = resolvePackageClusterDetails(groupInfo);
    const basePrice =
      clusterDetails.hargaBase > 0
        ? clusterDetails.hargaBase
        : (groupInfo.keberangkatan?.hargaPaket ||
          groupInfo.paketKeberangkatan?.hargaPaket ||
          (currentPackage?.hargaPaket ?? 0));

    // Room upgrade calculation
    const roomUpgradeType = groupInfo.roomUpgrade || groupInfo.registrationRequests?.[0]?.roomUpgrade;
    let roomUpgradeNominal = 0;
    let roomUpgradeName = "";
    if (roomUpgradeType && !isBaseRoomType(roomUpgradeType)) {
      const normRoom = detectRoomTypeFromName(roomUpgradeType);
      const unitUpgrade = getPackageUpgradePrice(groupInfo, normRoom);
      if (unitUpgrade > 0) {
        roomUpgradeName = `Upgrade Kamar ${normRoom}`;
        roomUpgradeNominal = unitUpgrade;
      }
    }

    const computedTotalTagihan =
      typeof groupInfo.totalTagihan === "number" && groupInfo.totalTagihan > 0
        ? groupInfo.totalTagihan
        : basePax * basePrice + (roomUpgradeNominal * basePax);

    const verifiedPayments = (groupInfo.pembayaran || []).filter(
      (p: any) => p.status === "verified"
    );
    const pendingPayments = (groupInfo.pembayaran || []).filter(
      (p: any) => p.status === "pending"
    );

    const totalTerbayar =
      verifiedPayments.length > 0
        ? verifiedPayments.reduce((sum: number, p: any) => sum + (p.jumlah || 0), 0)
        : (groupInfo.totalPembayaran ?? 0);

    const pendingTotal = pendingPayments.reduce(
      (sum: number, p: any) => sum + (p.jumlah || 0),
      0
    );

    const sisaTagihan = Math.max(0, computedTotalTagihan - totalTerbayar);
    const percentPaid =
      computedTotalTagihan > 0
        ? Math.min(100, Math.round((totalTerbayar / computedTotalTagihan) * 100))
        : 0;

    return {
      basePax,
      basePrice,
      clusterName: clusterDetails.isCustomCluster ? clusterDetails.clusterName : undefined,
      roomUpgradeName,
      roomUpgradeNominal,
      totalTagihan: computedTotalTagihan,
      totalTerbayar,
      pendingTotal,
      sisaTagihan,
      percentPaid,
      verifiedPayments,
      pendingPayments,
      allPayments: (groupInfo.pembayaran || []) as any[],
      invoices: (groupInfo.invoices || []) as any[],
    };
  }, [groupInfo, currentPackage]);

  function handleReset() {
    setSeqInput("");
    setNominal(0);
    setJatuhTempo("");
    setCatatan("");
    setGroupInfo(null);
    setH40Warning(null);
    setTargetPaketId("");
    setSelectedClusterIndex(0);
    setPricingOption("HARGA_BARU");
    setHotelUpgradeEnabled(false);
    setHotelUpgradeName("");
    setHotelUpgradeNominal(0);
    setKategori("PEMBAYARAN");
    setTambahPaxCount(1);
    setTambahJamaahList([{ nama: "", gender: "L", hubungan: "" }]);
    setPreviewBuktiUrl(null);
  }

  async function handleSubmit() {
    if (!groupInfo) return;

    if (kategori === "PINDAH_PAKET") {
      if (!targetPaketId) {
        alert("Pilih paket tujuan baru terlebih dahulu");
        return;
      }
      if (targetPaketId === currentPackage?.id) {
        alert("Paket tujuan tidak boleh sama dengan paket saat ini");
        return;
      }
      if (pricingOption === "HARGA_BARU" && totalDiff < 0) {
        alert("Penyesuaian tagihan untuk perpindahan ke paket dengan harga lebih murah saat ini ditahan sementara menunggu ketetapan SOP akuntansi Product Owner.");
        return;
      }
      setLoading(true);
      try {
        // 1. Unified atomic transfer via API
        const resMove = await fetch(`/api/groups/${groupInfo.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            paketKeberangkatanId: targetPaketId,
            pricingOption,
            totalDiff: pricingOption === "HARGA_BARU" ? totalDiff : 0,
            hotelUpgradeName: hotelUpgradeEnabled && hotelUpgradeName ? hotelUpgradeName : undefined,
            hotelUpgradeNominal: hotelUpgradeEnabled && hotelUpgradeNominal > 0 ? hotelUpgradeNominal : undefined,
          }),
        });
        const moveJson = await resMove.json();
        if (!resMove.ok || !moveJson.success) {
          throw new Error(moveJson.message || "Gagal memproses pemindahan paket");
        }

        const resultInvNumber =
          moveJson.data?.invoice?.nomorInvoice ||
          `PINDAH-${groupInfo.kodeRegistrasi || groupInfo.id.slice(-6).toUpperCase()}`;
        const finalAmount = moveJson.data?.totalAdditionalBill || 0;

        onSuccess(resultInvNumber, finalAmount);
        broadcastMutation("registration_groups", "UPDATE", { id: groupInfo.id });
        broadcastMutation("keberangkatan", "UPDATE");
        broadcastMutation("invoices", "INSERT");
        broadcastMutation("pembayaran", "INSERT", { groupId: groupInfo.id });
        handleReset();
      } catch (e: any) {
        console.error("Failed to move package:", e);
        alert(e.message || "Gagal memproses pemindahan paket.");
      } finally {
        setLoading(false);
      }
      return;
    }

    if (kategori === "TAMBAH_JAMAAH") {
      const hasEmptyName = tambahJamaahList.some((j) => !j.nama.trim());
      if (hasEmptyName) {
        alert("Mohon isi nama lengkap untuk seluruh jamaah tambahan");
        return;
      }
      setLoading(true);
      try {
        const res = await addJamaahToGroup({
          groupId: groupInfo.id,
          jamaahList: tambahJamaahList.map((j) => ({
            namaLengkap: j.nama.trim(),
            jenisKelamin: j.gender,
            hubungan: j.hubungan.trim(),
          })),
        });

        if (!res.success) {
          throw new Error(res.message || "Gagal menambahkan jamaah ke grup");
        }

        onSuccess(res.invoiceNumber || `INV-PAX-${groupInfo.kodeRegistrasi}`, res.amount || 0);
        broadcastMutation("registration_groups", "UPDATE", { id: groupInfo.id });
        broadcastMutation("jamaah", "INSERT", { groupId: groupInfo.id });
        broadcastMutation("keberangkatan", "UPDATE");
        broadcastMutation("invoices", "INSERT");
        broadcastMutation("pembayaran", "INSERT", { groupId: groupInfo.id });
        handleReset();
      } catch (e: any) {
        console.error("Failed to add jamaah:", e);
        alert(e.message || "Gagal menambahkan jamaah ke grup.");
      } finally {
        setLoading(false);
      }
      return;
    }

    if (nominal <= 0) return;
    setLoading(true);

    let finalCatatan = catatan.trim();
    if (!finalCatatan) {
      if (kategori === "PEMBAYARAN") finalCatatan = `Invoice pembayaran untuk group ${groupInfo.kodeRegistrasi}`;
      else if (kategori === "PEMBATALAN") finalCatatan = `Biaya pembatalan (${scopePembatalan === "SEBAGIAN" ? "Sebagian Jamaah" : "Seluruh Grup"} - ${refundStatus === "NON_REFUND" ? "Non-Refund / Biaya Hangus" : "Dengan Refund"}) untuk group ${groupInfo.kodeRegistrasi}`;
      else if (kategori === "REFUND_MURNI") finalCatatan = `Pengembalian dana (${refundType === "KELEBIHAN_BAYAR" ? "Kelebihan Bayar" : "Pengembalian Deposit"}) untuk group ${groupInfo.kodeRegistrasi}`;
    }

    try {
      const res = await createInvoice({
        groupId: groupInfo.id,
        kategori,
        subKategori:
          kategori === "PEMBATALAN"
            ? `${scopePembatalan.toLowerCase()}_${refundStatus.toLowerCase()}`
            : kategori === "REFUND_MURNI"
              ? refundType.toLowerCase()
              : kategori.toLowerCase(),
        scopePembatalan,
        refundStatus,
        nominal,
        jatuhTempo: jatuhTempo || undefined,
        catatan: finalCatatan,
      });

      onSuccess(res.nomorInvoice || res.id, nominal);
      broadcastMutation("invoices", "INSERT", { id: res.id, groupId: groupInfo.id });
      broadcastMutation("pembayaran", "UPDATE", { groupId: groupInfo.id });
      broadcastMutation("registration_groups", "UPDATE", { id: groupInfo.id });
      handleReset();
    } catch (e) {
      console.error("Failed to create invoice:", e);
      alert("Gagal menerbitkan invoice.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Penerbitan Invoice & Pengelolaan Transaksi Keuangan" size="3xl" className="max-w-6xl">
      <div className="space-y-4 pt-1 text-xs">

        {/* CATEGORY SELECTOR */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            PILIH KATEGORI / TUJUAN INVOICE
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
            <button
              type="button"
              onClick={() => setKategori("PEMBAYARAN")}
              className={cn(
                "p-2 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-1 font-bold",
                kategori === "PEMBAYARAN"
                  ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                  : "bg-stone-50 dark:bg-stone-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100"
              )}
            >
              <CreditCard className="h-4 w-4" />
              <span>Pembayaran</span>
            </button>

            <button
              type="button"
              onClick={() => setKategori("PINDAH_PAKET")}
              className={cn(
                "p-2 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-1 font-bold",
                kategori === "PINDAH_PAKET"
                  ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                  : "bg-stone-50 dark:bg-stone-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100"
              )}
            >
              <RefreshCw className="h-4 w-4" />
              <span>Pindah Paket</span>
            </button>

            <button
              type="button"
              onClick={() => setKategori("TAMBAH_JAMAAH")}
              className={cn(
                "p-2 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-1 font-bold",
                kategori === "TAMBAH_JAMAAH"
                  ? "bg-purple-600 text-white border-purple-600 shadow-sm"
                  : "bg-stone-50 dark:bg-stone-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100"
              )}
            >
              <UserPlus className="h-4 w-4" />
              <span>Tambah Jamaah</span>
            </button>

            <button
              type="button"
              onClick={() => setKategori("PEMBATALAN")}
              className={cn(
                "p-2 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-1 font-bold",
                kategori === "PEMBATALAN"
                  ? "bg-red-600 text-white border-red-600 shadow-sm"
                  : "bg-stone-50 dark:bg-stone-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100"
              )}
            >
              <XCircle className="h-4 w-4" />
              <span>Pembatalan</span>
            </button>

            <button
              type="button"
              onClick={() => setKategori("REFUND_MURNI")}
              className={cn(
                "p-2 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-1 font-bold",
                kategori === "REFUND_MURNI"
                  ? "bg-amber-600 text-white border-amber-600 shadow-sm"
                  : "bg-stone-50 dark:bg-stone-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100"
              )}
            >
              <ArrowDownLeft className="h-4 w-4" />
              <span>Refund Murni</span>
            </button>
          </div>
        </div>

        {/* 1. SMART GROUP LOOKUP CONTROL */}
        <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-2 relative">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-wider text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
              <Search className="h-3.5 w-3.5 text-amber-600" />
              1. Cari & Pilih Group Registrasi Jamaah (Dikunci 4 Digit)
            </label>
            {currentFullCode && (
              <span className="font-mono text-[11px] font-extrabold bg-amber-200 text-amber-900 px-2 py-0.5 rounded">
                Target: {currentFullCode}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            {/* Visual GRP Prefix */}
            <span className="px-3 py-2 bg-amber-600 text-white font-mono font-bold rounded-lg shrink-0">
              GRP-
            </span>

            {/* Year Select Dropdown */}
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="px-2.5 py-2 bg-background border border-slate-300 dark:border-slate-700 font-mono font-bold rounded-lg text-sm shrink-0"
            >
              <option value="2026">2026</option>
              <option value="2025">2025</option>
              <option value="2027">2027</option>
            </select>

            <span className="font-mono font-bold text-amber-800 dark:text-amber-200">-</span>

            {/* 4-Digit Sequence Input */}
            <div className="relative flex-1">
              <input
                type="text"
                maxLength={4}
                placeholder="0004"
                value={seqInput}
                onFocus={() => setShowSuggestions(true)}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, "").slice(0, 4);
                  setSeqInput(val);
                }}
                onBlur={() => {
                  if (seqInput.trim()) {
                    const padded = seqInput.trim().slice(0, 4).padStart(4, "0");
                    setSeqInput(padded);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && currentFullCode) {
                    performGroupSearch(currentFullCode);
                  }
                }}
                className="w-full px-3 py-2 bg-background border border-slate-300 dark:border-slate-700 font-mono font-bold rounded-lg text-sm tracking-widest focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <Button
              type="button"
              onClick={() => currentFullCode && performGroupSearch(currentFullCode)}
              disabled={searching || !seqInput.trim()}
              size="sm"
              className="bg-amber-600 hover:bg-amber-700 text-white font-bold shrink-0"
            >
              {searching ? "Mencari..." : "Cari Group"}
            </Button>
          </div>

          {/* Quick Live Search Dropdown Suggestions */}
          {showSuggestions && matchingSuggestions.length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-stone-950 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-50 overflow-hidden divide-y divide-slate-100 dark:divide-slate-800 max-h-56 overflow-y-auto">
              <div className="p-1.5 bg-slate-50 dark:bg-stone-900 text-[10px] font-bold text-slate-500 uppercase flex justify-between">
                <span>Rekomendasi Group Pendaftaran Aktif</span>
                <span>Klik untuk pilih</span>
              </div>
              {matchingSuggestions.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => selectGroupData(g)}
                  className="w-full p-2.5 text-left hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors flex items-center justify-between gap-2"
                >
                  <div>
                    <p className="font-bold text-slate-900 dark:text-slate-100 text-xs">
                      {g.namaGroup} <span className="font-mono text-amber-700 dark:text-amber-400">({g.kodeRegistrasi})</span>
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Ketua: {g.ketuaGroup?.namaLengkap || g.kontakNama || "Rombongan"} &middot; {g.jumlahAnggota || 1} Pax
                    </p>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                    PILIH
                  </span>
                </button>
              ))}
            </div>
          )}

          {lookupError && <p className="text-xs text-destructive font-medium">{lookupError}</p>}

          {groupInfo && kategori !== "PEMBAYARAN" && (
            <div className="p-2.5 bg-background border border-amber-400/40 rounded-lg text-xs space-y-1">
              <p className="font-bold text-foreground">
                Group: {groupInfo.namaGroup} <span className="font-mono text-amber-600">({groupInfo.kodeRegistrasi})</span>
              </p>
              <p className="text-muted-foreground">
                Ketua / Kontak: {groupInfo.ketuaGroup?.namaLengkap || groupInfo.kontakNama || "-"} ({groupInfo.kontakHp || groupInfo.noTelp || "-"})
              </p>
            </div>
          )}
        </div>

        {/* 2. DYNAMIC CATEGORY FORMS */}
        <div className="space-y-3 pt-1">

          {/* DYNAMIC FORM FOR PEMBAYARAN */}
          {kategori === "PEMBAYARAN" && !groupInfo && (
            <div className="p-8 text-center border border-dashed rounded-xl border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-stone-900/30 space-y-2">
              <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
                <CreditCard className="h-6 w-6" />
              </div>
              <h3 className="font-bold text-sm text-foreground">Pilih Group Registrasi Jamaah</h3>
              <p className="text-xs text-muted-foreground max-w-md mx-auto">
                Gunakan kolom pencarian 4 digit di atas atau klik salah satu rekomendasi grup pendaftaran aktif untuk memuat data sisa tagihan, rincian biaya paket, riwayat pembayaran, serta formulir pembayaran baru.
              </p>
            </div>
          )}

          {kategori === "PEMBAYARAN" && groupInfo && financialSummary && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              {/* KOLOM KIRI: STATUS SISA TAGIHAN, RINCIAN BIAYA & RIWAYAT PEMBAYARAN */}
              <div className="lg:col-span-7 space-y-3.5">
                {/* 1. KARTU IDENTITAS ROMBONGAN & RINGKASAN FINANSIAL */}
                <div className="p-3.5 bg-background border border-emerald-500/30 rounded-xl space-y-3 shadow-2xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-extrabold text-sm text-foreground">
                          {groupInfo.namaGroup}
                        </h3>
                        <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                          {groupInfo.kodeRegistrasi}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Ketua: <strong>{groupInfo.ketuaGroup?.namaLengkap || groupInfo.kontakNama || "Rombongan"}</strong> ({groupInfo.kontakHp || groupInfo.noTelp || "-"}) &middot; {financialSummary.basePax} Pax
                      </p>
                    </div>
                    <div className="text-left sm:text-right">
                      <span className="text-[11px] font-bold text-blue-700 dark:text-blue-300 block">
                        {currentPackage?.namaPaket || groupInfo.keberangkatan?.namaPaket || "Paket Umroh"}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {currentPackage?.tanggalBerangkat ? `Berangkat: ${formatDateShort(currentPackage.tanggalBerangkat)}` : ""}
                      </span>
                    </div>
                  </div>

                  {/* 3 KPI Financial Cards */}
                  <div className="grid grid-cols-3 gap-2">
                    {/* Total Tagihan */}
                    <div className="p-2.5 rounded-lg border bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                        Total Tagihan
                      </span>
                      <span className="text-xs sm:text-sm font-extrabold text-foreground block mt-0.5">
                        Rp {financialSummary.totalTagihan.toLocaleString("id-ID")}
                      </span>
                      <span className="text-[9.5px] text-muted-foreground block mt-0.5">
                        {financialSummary.basePax} Pax × Rp {financialSummary.basePrice.toLocaleString("id-ID")}
                      </span>
                    </div>

                    {/* Terbayar */}
                    <div className="p-2.5 rounded-lg border bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/60">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 block">
                          Terbayar
                        </span>
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-200 text-emerald-900 dark:bg-emerald-900 dark:text-emerald-100">
                          {financialSummary.percentPaid}%
                        </span>
                      </div>
                      <span className="text-xs sm:text-sm font-extrabold text-emerald-700 dark:text-emerald-300 block mt-0.5">
                        Rp {financialSummary.totalTerbayar.toLocaleString("id-ID")}
                      </span>
                      {financialSummary.pendingTotal > 0 ? (
                        <span className="text-[9px] text-amber-600 dark:text-amber-400 font-semibold block mt-0.5">
                          +{formatCurrency(financialSummary.pendingTotal)} pending
                        </span>
                      ) : (
                        <span className="text-[9.5px] text-emerald-700/80 dark:text-emerald-400/80 block mt-0.5">
                          {financialSummary.verifiedPayments.length} Pembayaran verified
                        </span>
                      )}
                    </div>

                    {/* Sisa Tagihan (Mencolok!) */}
                    <div className={cn(
                      "p-2.5 rounded-lg border",
                      financialSummary.sisaTagihan <= 0
                        ? "bg-emerald-100/70 dark:bg-emerald-950/40 border-emerald-400"
                        : "bg-rose-50 dark:bg-rose-950/30 border-rose-300 dark:border-rose-800"
                    )}>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-rose-900 dark:text-rose-200 block">
                          Sisa Tagihan
                        </span>
                        <span className={cn(
                          "text-[9px] font-extrabold px-1.5 py-0.2 rounded-full",
                          financialSummary.sisaTagihan <= 0
                            ? "bg-emerald-200 text-emerald-900"
                            : "bg-rose-200 text-rose-900"
                        )}>
                          {financialSummary.sisaTagihan <= 0 ? "LUNAS" : "BELUM LUNAS"}
                        </span>
                      </div>
                      <span className={cn(
                        "text-xs sm:text-sm font-extrabold block mt-0.5",
                        financialSummary.sisaTagihan <= 0 ? "text-emerald-800 dark:text-emerald-300" : "text-rose-700 dark:text-rose-300"
                      )}>
                        Rp {financialSummary.sisaTagihan.toLocaleString("id-ID")}
                      </span>
                      <span className="text-[9.5px] text-muted-foreground block mt-0.5">
                        Outstanding Balance
                      </span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground font-semibold">
                      <span>Progress Pelunasan Rombongan</span>
                      <span>{financialSummary.percentPaid}% Selesai</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 transition-all duration-500 rounded-full"
                        style={{ width: `${Math.min(100, Math.max(0, financialSummary.percentPaid))}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* 2. RINCIAN TAGIHAN & INVOICES SEBELUMNYA */}
                <div className="p-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <Receipt className="h-4 w-4 text-emerald-600" />
                      Rincian Tagihan & Invoice Terbit ({financialSummary.invoices.length})
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      Komponen & Daftar Invoice Resmi
                    </span>
                  </div>

                  {/* Komponen Tarif */}
                  <div className="p-2.5 bg-background border border-slate-200 dark:border-slate-800 rounded-lg text-xs space-y-1.5">
                    <div className="flex justify-between items-center text-slate-700 dark:text-slate-300">
                      <span>
                        Tarif Dasar Paket{financialSummary.clusterName ? ` (Klaster ${financialSummary.clusterName})` : ""} ({financialSummary.basePax} Pax × {formatCurrency(financialSummary.basePrice)}):
                      </span>
                      <span className="font-bold text-foreground">{formatCurrency(financialSummary.basePax * financialSummary.basePrice)}</span>
                    </div>
                    {financialSummary.roomUpgradeNominal > 0 && (
                      <div className="flex justify-between items-center text-slate-700 dark:text-slate-300 pt-1 border-t border-dashed">
                        <span>
                          {financialSummary.roomUpgradeName} ({financialSummary.basePax} Pax × {formatCurrency(financialSummary.roomUpgradeNominal)}):
                        </span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">
                          +{formatCurrency(financialSummary.basePax * financialSummary.roomUpgradeNominal)}
                        </span>
                      </div>
                    )}
                    {groupInfo.hotelUpgrade && !financialSummary.clusterName && (
                      <div className="flex justify-between items-center text-slate-700 dark:text-slate-300 pt-1 border-t border-dashed">
                        <span>Upgrade Hotel:</span>
                        <span className="font-bold text-foreground">{groupInfo.hotelUpgrade}</span>
                      </div>
                    )}
                  </div>

                  {/* Daftar Invoices Terbit */}
                  {financialSummary.invoices.length > 0 ? (
                    <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                      {financialSummary.invoices.map((inv: any) => (
                        <div
                          key={inv.id}
                          className="p-2.5 bg-background border border-slate-200 dark:border-slate-800 rounded-lg flex items-center justify-between gap-2 text-xs"
                        >
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-slate-900 dark:text-slate-100">{inv.nomorInvoice}</span>
                              <span className="text-[9.5px] uppercase font-bold px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                                {inv.tipe || "INVOICE"}
                              </span>
                              <span className={cn(
                                "text-[9px] font-bold px-1.5 py-0.2 rounded uppercase",
                                inv.status === "paid" ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300" :
                                inv.status === "partial" ? "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300" :
                                inv.status === "overdue" ? "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300" :
                                "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                              )}>
                                {inv.status}
                              </span>
                            </div>
                            <p className="text-[10px] text-muted-foreground">
                              Jatuh Tempo: {formatDateShort(inv.jatuhTempo)}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-extrabold text-foreground">{formatCurrency(inv.jumlah)}</p>
                            <p className="text-[10px] text-muted-foreground">
                              Sisa: {formatCurrency(inv.sisaTagihan)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] text-muted-foreground italic text-center py-2 bg-background rounded-lg border border-dashed">
                      Belum ada invoice yang pernah diterbitkan untuk grup ini.
                    </p>
                  )}
                </div>

                {/* 3. RIWAYAT PEMBAYARAN JAMAAH */}
                <div className="p-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <Clock className="h-4 w-4 text-emerald-600" />
                      Riwayat Pembayaran Jamaah ({financialSummary.allPayments.length})
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      Log Transaksi Masuk
                    </span>
                  </div>

                  {financialSummary.allPayments.length > 0 ? (
                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                      {financialSummary.allPayments.map((p: any) => (
                        <div
                          key={p.id}
                          className="p-2.5 bg-background border border-slate-200 dark:border-slate-800 rounded-lg flex items-center justify-between gap-3 text-xs"
                        >
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900 dark:text-slate-100">
                                {p.tanggal ? formatDateShort(p.tanggal) : "-"}
                              </span>
                              <span className="text-[9.5px] uppercase font-bold px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                                {p.metode || "TRANSFER"}
                              </span>
                              <span className={cn(
                                "text-[9px] font-bold px-1.5 py-0.2 rounded",
                                p.status === "verified" ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300" :
                                p.status === "rejected" ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300" :
                                "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                              )}>
                                {p.status === "verified" ? "Verified" : p.status === "rejected" ? "Ditolak" : "Pending Review"}
                              </span>
                            </div>
                            <p className="text-[10.5px] text-muted-foreground">
                              {p.catatan || (p.bankPengirim ? `${p.bankPengirim} (${p.nomorRekening || "-"})` : "Pembayaran")}
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="font-extrabold text-foreground">{formatCurrency(p.jumlah)}</p>
                            {p.buktiUrl && (
                              <button
                                type="button"
                                onClick={() => setPreviewBuktiUrl(p.buktiUrl)}
                                className="text-[10px] text-emerald-600 hover:text-emerald-700 underline font-semibold cursor-pointer block"
                              >
                                Lihat Bukti
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] text-muted-foreground italic text-center py-2.5 bg-background rounded-lg border border-dashed">
                      Belum ada riwayat pembayaran yang tercatat untuk grup ini.
                    </p>
                  )}
                </div>

              </div>

              {/* KOLOM KANAN: FORM PEMBAYARAN BARU YANG AKAN DIBAYARKAN */}
              <div className="lg:col-span-5 p-4 bg-gradient-to-br from-emerald-500/5 via-background to-teal-500/5 border border-emerald-500/30 rounded-xl space-y-3.5 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="border-b border-emerald-500/20 pb-2">
                    <h4 className="font-extrabold text-sm text-foreground flex items-center gap-1.5">
                      <CreditCard className="h-4 w-4 text-emerald-600" />
                      Kolom Pembayaran Baru
                    </h4>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Tentukan nominal tagihan atau pembayaran yang akan dibayarkan oleh rombongan ini.
                    </p>
                  </div>

                  {/* 1. NOMINAL DENGAN QUICK SHORTCUTS */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-foreground block">
                      Nominal Pembayaran Baru (Rp) <span className="text-red-500">*</span>
                    </label>

                    {/* Quick Shortcuts */}
                    <div className="flex flex-wrap gap-1">
                      {financialSummary.sisaTagihan > 0 && (
                        <button
                          type="button"
                          onClick={() => setNominal(financialSummary.sisaTagihan)}
                          className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 hover:bg-emerald-200 text-emerald-800 dark:bg-emerald-950 dark:hover:bg-emerald-900 dark:text-emerald-300 transition-colors cursor-pointer"
                        >
                          Bayar Sisa: {formatCurrency(financialSummary.sisaTagihan)}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setNominal(5000000 * financialSummary.basePax)}
                        className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                      >
                        DP: {formatCurrency(5000000 * financialSummary.basePax)}
                      </button>
                      {financialSummary.sisaTagihan > 10000000 && (
                        <button
                          type="button"
                          onClick={() => setNominal(Math.round(financialSummary.sisaTagihan / 2))}
                          className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 hover:bg-blue-200 text-blue-800 dark:bg-blue-950 dark:hover:bg-blue-900 dark:text-blue-300 transition-colors cursor-pointer"
                        >
                          50% Sisa: {formatCurrency(Math.round(financialSummary.sisaTagihan / 2))}
                        </button>
                      )}
                    </div>

                    <CurrencyInput
                      placeholder="Masukkan nominal angka"
                      value={nominal}
                      onChange={(val) => setNominal(val)}
                      className="font-mono font-extrabold text-base border-emerald-400 focus:ring-emerald-500"
                    />

                    {/* Simulation Sisa Tagihan */}
                    <div className="p-2 rounded-lg bg-emerald-100/40 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-[11px] flex items-center justify-between">
                      <span className="text-muted-foreground">Sisa setelah pembayaran ini:</span>
                      <span className="font-bold text-foreground">
                        {formatCurrency(Math.max(0, financialSummary.sisaTagihan - nominal))}
                      </span>
                    </div>
                  </div>

                  {/* 2. TANGGAL JATUH TEMPO */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-foreground">
                        Tanggal Jatuh Tempo
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
                      className={`text-xs ${h40Warning?.isLate ? "border-red-500 font-bold bg-red-50/30" : ""}`}
                    />
                  </div>

                  {/* 3. CATATAN / RINCIAN TAGIHAN */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-foreground">
                      Catatan / Rincian Tagihan Invoice
                    </label>
                    <div className="flex flex-wrap gap-1">
                      {["DP Pembayaran Pendaftaran", "Cicilan Tahap 1", "Cicilan Tahap 2", "Pelunasan Sisa Biaya"].map((tpl) => (
                        <button
                          key={tpl}
                          type="button"
                          onClick={() => setCatatan(tpl)}
                          className="text-[9.5px] font-semibold px-1.5 py-0.5 rounded border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                        >
                          {tpl}
                        </button>
                      ))}
                    </div>
                    <Input
                      placeholder="Contoh: Cicilan tahap 1 atau pelunasan"
                      value={catatan}
                      onChange={(e) => setCatatan(e.target.value)}
                      className="text-xs"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <Button
                    onClick={handleSubmit}
                    disabled={loading || !groupInfo || nominal <= 0}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 text-xs shadow-md"
                  >
                    {loading ? "Menerbitkan..." : `Terbitkan Invoice (${formatCurrency(nominal)})`}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* DYNAMIC FORM FOR PINDAH PAKET */}
          {kategori === "PINDAH_PAKET" && (
            <div className="space-y-3">
              {/* A. TAMPILAN PAKET TERKINI */}
              {groupInfo && (
                <div className="p-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Package className="h-3.5 w-3.5 text-blue-600" />
                      Paket Terkini (Saat Ini)
                    </span>
                    <span className="text-[11px] font-mono font-bold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 px-2 py-0.5 rounded">
                      {currentPackage?.kode || groupInfo.paketKeberangkatanId || "TBA"}
                    </span>
                  </div>
                  <p className="font-bold text-slate-900 dark:text-slate-100 text-xs">
                    {currentPackage?.namaPaket || "Memuat informasi paket..."}
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] text-muted-foreground pt-1.5 border-t border-slate-200 dark:border-slate-800">
                    <div>
                      <span className="block opacity-75">Tgl Berangkat:</span>
                      <strong className="text-foreground">
                        {currentPackage?.tanggalBerangkat ? formatDateShort(currentPackage.tanggalBerangkat) : "-"}
                      </strong>
                    </div>
                    <div>
                      <span className="block opacity-75">Harga Paket:</span>
                      <strong className="text-foreground">Rp {(oldPrice || 0).toLocaleString("id-ID")} / pax</strong>
                    </div>
                    <div>
                      <span className="block opacity-75">Jumlah Rombongan:</span>
                      <strong className="text-foreground">{paxCount} Pax</strong>
                    </div>
                  </div>
                </div>
              )}

              {/* B. KOLOM GANTI KE PAKET APA */}
              {groupInfo && (
                <div className="p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl space-y-2">
                  <label className="text-[11px] font-bold text-blue-900 dark:text-blue-200 uppercase flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <RefreshCw className="h-3.5 w-3.5 text-blue-600" />
                      Ganti Ke Paket Apa (Pilih Paket Tujuan)
                    </span>
                  </label>
                  <select
                    value={targetPaketId}
                    onChange={(e) => {
                      setTargetPaketId(e.target.value);
                      setSelectedClusterIndex(0);
                    }}
                    className="w-full px-3 py-2 bg-background border border-blue-300 dark:border-blue-700 font-bold rounded-lg text-xs focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">-- Pilih Paket Keberangkatan Tujuan --</option>
                    {keberangkatanList
                      .filter((k) => k.id !== currentPackage?.id)
                      .map((k) => (
                        <option key={k.id} value={k.id}>
                          {k.namaPaket}
                        </option>
                      ))}
                  </select>

                  {targetPackage && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] text-blue-950 dark:text-blue-200 pt-1.5 border-t border-blue-200 dark:border-blue-800/60">
                      <div>
                        <span className="block opacity-75">Tgl Berangkat Baru:</span>
                        <strong>{targetPackage.tanggalBerangkat ? formatDateShort(targetPackage.tanggalBerangkat) : "-"}</strong>
                      </div>
                      <div>
                        <span className="block opacity-75">Tarif Resmi Paket:</span>
                        <strong>
                          Rp {((pricingOption === "HARGA_BARU" && activeTargetCluster?.hargaBase) ? activeTargetCluster.hargaBase : (targetPackage.hargaPaket || 0)).toLocaleString("id-ID")} / pax
                        </strong>
                      </div>
                      <div>
                        <span className="block opacity-75">Sisa Seat Paket:</span>
                        <strong>{Math.max(0, (targetPackage.maxSeat || targetPackage.kuota || 45) - (targetPackage.terisi || 0))} Seat Tersedia</strong>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* C. TOGGLE PILIHAN HARGA PAKET BARU / HARGA PAKET LAMA */}
              {groupInfo && targetPackage && (
                <div className="p-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2">
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase">
                    Pilihan Penyesuaian Tarif Biaya
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {/* Opsi 1: Harga Paket Lama */}
                    <div
                      onClick={() => setPricingOption("HARGA_LAMA")}
                      className={cn(
                        "p-2.5 rounded-lg border cursor-pointer transition-all space-y-1",
                        pricingOption === "HARGA_LAMA"
                          ? "bg-blue-50/80 dark:bg-blue-950/40 border-blue-500 shadow-2xs"
                          : "bg-background border-border hover:bg-muted/40"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-foreground flex items-center gap-1.5">
                          <input
                            type="radio"
                            name="pricingOption"
                            checked={pricingOption === "HARGA_LAMA"}
                            onChange={() => setPricingOption("HARGA_LAMA")}
                            className="h-3.5 w-3.5 text-blue-600"
                          />
                          Gunakan Harga Paket Lama
                        </span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          Biaya Rp 0
                        </span>
                      </div>
                      <p className="text-[10.5px] text-muted-foreground pl-5">
                        Mempertahankan harga paket pendaftaran awal (Rp {(oldPrice || 0).toLocaleString("id-ID")}/pax). Tidak ada tagihan selisih.
                      </p>
                    </div>

                    {/* Opsi 2: Harga Paket Baru */}
                    <div
                      onClick={() => setPricingOption("HARGA_BARU")}
                      className={cn(
                        "p-2.5 rounded-lg border cursor-pointer transition-all space-y-1",
                        pricingOption === "HARGA_BARU"
                          ? "bg-blue-50/80 dark:bg-blue-950/40 border-blue-500 shadow-2xs"
                          : "bg-background border-border hover:bg-muted/40"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-foreground flex items-center gap-1.5">
                          <input
                            type="radio"
                            name="pricingOption"
                            checked={pricingOption === "HARGA_BARU"}
                            onChange={() => setPricingOption("HARGA_BARU")}
                            className="h-3.5 w-3.5 text-blue-600"
                          />
                          Gunakan Harga Paket Baru
                        </span>
                        <span className={cn(
                          "text-[10px] font-bold px-1.5 py-0.5 rounded",
                          totalDiff > 0
                            ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                            : totalDiff < 0
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                            : "bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                        )}>
                          {totalDiff > 0 ? `+Rp ${totalDiff.toLocaleString("id-ID")}` : totalDiff < 0 ? `-Rp ${Math.abs(totalDiff).toLocaleString("id-ID")}` : "Rp 0"}
                        </span>
                      </div>
                      <p className="text-[10.5px] text-muted-foreground pl-5">
                        Menyesuaikan dengan tarif resmi paket baru {activeTargetCluster ? `(${activeTargetCluster.clusterName} - Rp ${(newPrice || 0).toLocaleString("id-ID")}/pax)` : `(Rp ${(newPrice || 0).toLocaleString("id-ID")}/pax)`}.
                      </p>
                    </div>
                  </div>

                  {/* Dynamic Cluster / Variant Spec Selection when target package has clusters */}
                  {pricingOption === "HARGA_BARU" && targetClusters.length > 0 && (
                    <div className="p-3 bg-gradient-to-r from-blue-50/90 to-sky-50/70 dark:from-blue-950/40 dark:to-sky-950/30 border border-blue-200 dark:border-blue-800 rounded-xl space-y-2 mt-2">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-bold text-blue-950 dark:text-blue-200 uppercase flex items-center gap-1.5">
                          <Layers className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                          Pilih Klaster & Varian Spek Paket Baru
                        </label>
                        <span className="text-[10px] bg-blue-100 dark:bg-blue-900/80 text-blue-800 dark:text-blue-300 font-semibold px-2 py-0.5 rounded-full">
                          {targetClusters.length} Pilihan Spek
                        </span>
                      </div>
                      <p className="text-[10.5px] text-muted-foreground">
                        Paket ini memiliki variasi klaster/spek. Pilih klaster yang sesuai untuk menentukan tarif resmi terbaru:
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                        {targetClusters.map((cluster: any, idx: number) => {
                          const isSelected = selectedClusterIndex === idx;
                          return (
                            <div
                              key={idx}
                              onClick={() => setSelectedClusterIndex(idx)}
                              className={cn(
                                "p-2.5 rounded-lg border cursor-pointer transition-all text-left flex flex-col justify-between space-y-1.5 relative",
                                isSelected
                                  ? "bg-white dark:bg-slate-900 border-blue-600 dark:border-blue-500 shadow-sm ring-2 ring-blue-500/20"
                                  : "bg-white/70 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 hover:bg-white dark:hover:bg-slate-900"
                              )}
                            >
                              <div className="flex items-start justify-between gap-1.5">
                                <div className="font-bold text-xs text-foreground flex items-center gap-1.5">
                                  <input
                                    type="radio"
                                    name="selectedCluster"
                                    checked={isSelected}
                                    onChange={() => setSelectedClusterIndex(idx)}
                                    className="h-3.5 w-3.5 text-blue-600"
                                  />
                                  <span>{cluster.clusterName}</span>
                                </div>
                                {cluster.isVarian2 ? (
                                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 whitespace-nowrap">
                                    Varian Spek
                                  </span>
                                ) : cluster.isPromo ? (
                                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 whitespace-nowrap">
                                    Promo
                                  </span>
                                ) : null}
                              </div>

                              {(cluster.hotelMekkah || cluster.hotelMadinah) && (
                                <div className="text-[10.5px] text-muted-foreground pl-5 space-y-0.5">
                                  {cluster.hotelMekkah && (
                                    <div>Mekkah: <span className="text-foreground font-medium">{cluster.hotelMekkah}</span></div>
                                  )}
                                  {cluster.hotelMadinah && (
                                    <div>Madinah: <span className="text-foreground font-medium">{cluster.hotelMadinah}</span></div>
                                  )}
                                </div>
                              )}

                              <div className="pt-1.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] pl-5">
                                <span className="text-muted-foreground text-[10px]">Tarif Resmi:</span>
                                <strong className="text-blue-700 dark:text-blue-400 font-bold">
                                  Rp {cluster.hargaBase.toLocaleString("id-ID")} / pax
                                </strong>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Summary Calculation Box */}
                  <div className="p-2.5 bg-background border rounded-lg text-xs space-y-1 mt-1">
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span>Kalkulasi Selisih Biaya ({paxCount} Pax):</span>
                      <span className="font-bold text-foreground">
                        {pricingOption === "HARGA_LAMA"
                          ? "Rp 0 (Memakai Harga Lama)"
                          : `Rp ${totalDiff.toLocaleString("id-ID")} (${diffPerPax >= 0 ? "+" : ""}${diffPerPax.toLocaleString("id-ID")}/pax)`}
                      </span>
                    </div>
                    {pricingOption === "HARGA_BARU" && totalDiff > 0 && (
                      <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                        ℹ️ Invoice penambahan biaya sebesar <strong>Rp {totalDiff.toLocaleString("id-ID")}</strong> akan otomatis diterbitkan.
                      </p>
                    )}
                    {pricingOption === "HARGA_BARU" && totalDiff < 0 && (
                      <div className="p-2 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-lg text-amber-900 dark:text-amber-200 text-[11px] space-y-1">
                        <div className="font-bold flex items-center gap-1 text-amber-700 dark:text-amber-300">
                          <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                          <span>Skenario Paket Lebih Murah Ditahan Sementara</span>
                        </div>
                        <p className="text-[10.5px] leading-relaxed">
                          Sesuai ketetapan Product Owner, penyesuaian kewajiban untuk paket tujuan lebih murah (-Rp {Math.abs(totalDiff).toLocaleString("id-ID")}) ditahan sementara menunggu penetapan SOP akuntansi. Silakan gunakan <strong>HARGA_LAMA</strong>.
                        </p>
                      </div>
                    )}
                    {pricingOption === "HARGA_LAMA" && (
                      <p className="text-[11px] text-blue-600 dark:text-blue-400 font-medium">
                        ℹ️ Rombongan dipindahkan ke paket baru tanpa ada penambahan tagihan invoice selisih paket.
                      </p>
                    )}
                    {hotelUpgradeEnabled && hotelUpgradeNominal > 0 && (
                      <p className="text-[11px] text-purple-700 dark:text-purple-300 font-medium">
                        🏨 Tambahan Upgrade Hotel: <strong>+Rp {hotelUpgradeNominal.toLocaleString("id-ID")}</strong> ({hotelUpgradeName || "Pilihan Admin"}).
                      </p>
                    )}
                  </div>

                  {/* D. UPGRADE HOTEL BERBAYAR (EKSPLISIT SESUAI DIRECTIVE 2.B) */}
                  <div className="p-3 bg-slate-100/80 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2 mt-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={hotelUpgradeEnabled}
                          onChange={(e) => {
                            setHotelUpgradeEnabled(e.target.checked);
                            if (!e.target.checked) {
                              setHotelUpgradeName("");
                              setHotelUpgradeNominal(0);
                            } else if (!hotelUpgradeName) {
                              setHotelUpgradeName(targetPackage.hotelMekkah ? `Makkah: ${targetPackage.hotelMekkah}` : "Pilihan Admin");
                            }
                          }}
                          className="h-3.5 w-3.5 text-blue-600 rounded"
                        />
                        <span>Tambahkan Item Upgrade Hotel Berbayar</span>
                      </label>
                      <span className="text-[10px] bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-1.5 py-0.5 rounded font-mono">
                        Manual Admin
                      </span>
                    </div>

                    {hotelUpgradeEnabled && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                        <div>
                          <label className="text-[10.5px] font-medium text-muted-foreground block mb-1">
                            Pilih Hotel Tujuan
                          </label>
                          <select
                            value={hotelUpgradeName}
                            onChange={(e) => setHotelUpgradeName(e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-background border rounded-lg text-xs font-semibold focus:ring-1 focus:ring-blue-500"
                          >
                            <option value="">-- Pilih Hotel Tujuan --</option>
                            {targetPackage.hotelMekkah && (
                              <option value={`Makkah: ${targetPackage.hotelMekkah}`}>
                                Makkah: {targetPackage.hotelMekkah}
                              </option>
                            )}
                            {targetPackage.hotelMadinah && (
                              <option value={`Madinah: ${targetPackage.hotelMadinah}`}>
                                Madinah: {targetPackage.hotelMadinah}
                              </option>
                            )}
                            {targetClusters.map((c: any, i: number) => (
                              <option key={i} value={`${c.clusterName} (${c.hotelMekkah || "Makkah"})`}>
                                {c.clusterName} ({c.hotelMekkah || "Makkah"})
                              </option>
                            ))}
                            <option value="Hotel Bintang 5 Eksklusif">Hotel Bintang 5 Eksklusif</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-[10.5px] font-medium text-muted-foreground block mb-1">
                            Nominal Upgrade Total (Rp)
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="100000"
                            placeholder="Contoh: 4000000"
                            value={hotelUpgradeNominal || ""}
                            onChange={(e) => setHotelUpgradeNominal(Math.max(0, parseInt(e.target.value, 10) || 0))}
                            className="w-full px-2.5 py-1.5 bg-background border rounded-lg text-xs font-bold text-foreground focus:ring-1 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* DYNAMIC FORM FOR PEMBATALAN */}
          {kategori === "PEMBATALAN" && (
            <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl space-y-3">
              <div className="flex items-center gap-1.5 text-red-800 dark:text-red-300 font-bold">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <span>Rincian Opsi Pembatalan (Cancel)</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase">Scope Pembatalan</label>
                  <div className="flex gap-2 mt-1">
                    <Button
                      type="button"
                      size="sm"
                      variant={scopePembatalan === "SEBAGIAN" ? "default" : "outline"}
                      onClick={() => setScopePembatalan("SEBAGIAN")}
                      className={cn("flex-1 text-xs font-bold", scopePembatalan === "SEBAGIAN" && "bg-red-600 hover:bg-red-700")}
                    >
                      Sebagian Jamaah
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={scopePembatalan === "SELURUH" ? "default" : "outline"}
                      onClick={() => setScopePembatalan("SELURUH")}
                      className={cn("flex-1 text-xs font-bold", scopePembatalan === "SELURUH" && "bg-red-700 hover:bg-red-800")}
                    >
                      Seluruh Grup
                    </Button>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase">Kebijakan Refund</label>
                  <div className="flex gap-2 mt-1">
                    <Button
                      type="button"
                      size="sm"
                      variant={refundStatus === "NON_REFUND" ? "default" : "outline"}
                      onClick={() => setRefundStatus("NON_REFUND")}
                      className={cn("flex-1 text-xs font-bold", refundStatus === "NON_REFUND" && "bg-slate-800 text-white")}
                    >
                      Non-Refund (Hangus)
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={refundStatus === "WITH_REFUND" ? "default" : "outline"}
                      onClick={() => setRefundStatus("WITH_REFUND")}
                      className={cn("flex-1 text-xs font-bold", refundStatus === "WITH_REFUND" && "bg-emerald-600 hover:bg-emerald-700")}
                    >
                      Dengan Refund
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* DYNAMIC FORM FOR REFUND MURNI */}
          {kategori === "REFUND_MURNI" && (
            <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl space-y-2">
              <label className="text-[11px] font-bold text-amber-900 dark:text-amber-200 uppercase">
                Jenis Pengembalian Dana (Refund Murni Non-Cancel)
              </label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={refundType === "KELEBIHAN_BAYAR" ? "default" : "outline"}
                  onClick={() => setRefundType("KELEBIHAN_BAYAR")}
                  className={cn("flex-1 text-xs font-bold", refundType === "KELEBIHAN_BAYAR" && "bg-amber-600 hover:bg-amber-700")}
                >
                  Kelebihan Bayar
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={refundType === "DEPOSIT" ? "default" : "outline"}
                  onClick={() => setRefundType("DEPOSIT")}
                  className={cn("flex-1 text-xs font-bold", refundType === "DEPOSIT" && "bg-blue-600 hover:bg-blue-700")}
                >
                  Pengembalian Deposit
                </Button>
              </div>
            </div>
          )}

          {/* DYNAMIC FORM FOR TAMBAH JAMAAH */}
          {kategori === "TAMBAH_JAMAAH" && (
            <div className="p-3.5 bg-gradient-to-r from-purple-50/90 to-fuchsia-50/70 dark:from-purple-950/40 dark:to-fuchsia-950/30 border border-purple-200 dark:border-purple-800 rounded-xl space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-purple-200/60 dark:border-purple-800/60 pb-2.5">
                <div>
                  <label className="text-[11px] font-bold text-purple-950 dark:text-purple-200 uppercase flex items-center gap-1.5">
                    <UserPlus className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
                    Jumlah Tambahan Jamaah (Pax)
                  </label>
                  <p className="text-[10.5px] text-muted-foreground mt-0.5">
                    Tentukan jumlah jamaah tambahan yang akan digabungkan ke grup ini.
                  </p>
                </div>
                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={() => handlePaxCountChange(tambahPaxCount - 1)}
                    disabled={tambahPaxCount <= 1}
                    className="h-8 w-8 rounded-lg border border-purple-300 dark:border-purple-700 bg-white dark:bg-purple-900/50 hover:bg-purple-100 flex items-center justify-center font-bold text-sm disabled:opacity-40"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min={1}
                    max={30}
                    value={tambahPaxCount}
                    onChange={(e) => handlePaxCountChange(parseInt(e.target.value, 10) || 1)}
                    className="w-14 h-8 px-2 border border-purple-300 dark:border-purple-700 rounded-lg text-xs text-center font-bold bg-white dark:bg-slate-900"
                  />
                  <button
                    type="button"
                    onClick={() => handlePaxCountChange(tambahPaxCount + 1)}
                    disabled={tambahPaxCount >= 30}
                    className="h-8 w-8 rounded-lg border border-purple-300 dark:border-purple-700 bg-white dark:bg-purple-900/50 hover:bg-purple-100 flex items-center justify-center font-bold text-sm disabled:opacity-40"
                  >
                    +
                  </button>
                  <span className="font-bold text-xs text-purple-900 dark:text-purple-300 pl-1">
                    Pax
                  </span>
                </div>
              </div>

              {/* Dynamic list of additional jamaah cards */}
              <div className="space-y-2.5 max-h-[320px] overflow-y-auto pr-1">
                {tambahJamaahList.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-white dark:bg-slate-900 border border-purple-200/90 dark:border-purple-800/70 rounded-xl space-y-2 shadow-2xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-purple-950 dark:text-purple-200 flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-full bg-purple-100 dark:bg-purple-900/80 text-purple-700 dark:text-purple-300 text-[11px] font-extrabold flex items-center justify-center">
                          {idx + 1}
                        </span>
                        Jamaah Tambahan #{idx + 1}
                      </span>
                      <span className="text-[10px] bg-purple-100/80 dark:bg-purple-900/60 text-purple-800 dark:text-purple-300 font-semibold px-2 py-0.5 rounded-full">
                        Pax {idx + 1}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 pt-1 items-end">
                      {/* Kolom Nama */}
                      <div className="sm:col-span-5 space-y-1">
                        <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                          Nama Lengkap <span className="text-red-500">*</span>
                        </label>
                        <Input
                          placeholder="Masukkan nama jamaah..."
                          value={item.nama}
                          onChange={(e) => updateJamaahItem(idx, "nama", e.target.value)}
                          className="text-xs h-9"
                        />
                      </div>

                      {/* Kolom Gender */}
                      <div className="sm:col-span-3 space-y-1">
                        <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                          Gender
                        </label>
                        <select
                          value={item.gender}
                          onChange={(e) => updateJamaahItem(idx, "gender", e.target.value as "L" | "P")}
                          className="w-full h-9 px-2.5 bg-background border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-purple-500"
                        >
                          <option value="L">Laki-laki (L)</option>
                          <option value="P">Perempuan (P)</option>
                        </select>
                      </div>

                      {/* Kolom Hubungan dengan PIC */}
                      <div className="sm:col-span-4 space-y-1">
                        <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                          Hubungan dengan PIC
                        </label>
                        <input
                          type="text"
                          list={`hubungan-list-${idx}`}
                          placeholder="Contoh: Istri / Anak / dll"
                          value={item.hubungan}
                          onChange={(e) => updateJamaahItem(idx, "hubungan", e.target.value)}
                          className="w-full h-9 px-2.5 bg-background border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-medium focus:ring-2 focus:ring-purple-500"
                        />
                        <datalist id={`hubungan-list-${idx}`}>
                          <option value="Istri" />
                          <option value="Suami" />
                          <option value="Anak" />
                          <option value="Orang Tua" />
                          <option value="Ayah" />
                          <option value="Ibu" />
                          <option value="Saudara Kandung" />
                          <option value="Kakak" />
                          <option value="Adik" />
                          <option value="Mertua" />
                          <option value="Menantu" />
                          <option value="Kerabat" />
                          <option value="Teman" />
                        </datalist>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Information Note */}
              <div className="p-2.5 bg-purple-100/60 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800 rounded-lg text-xs space-y-1">
                <div className="flex items-center justify-between font-bold text-purple-950 dark:text-purple-200">
                  <span>Estimasi Biaya Paket ({tambahPaxCount} Pax):</span>
                  <span>
                    Rp {(tambahPaxCount * (currentPackage?.hargaPaket || groupInfo?.keberangkatan?.hargaPaket || groupInfo?.paketKeberangkatan?.hargaPaket || (groupInfo?.totalTagihan ? Math.round(groupInfo.totalTagihan / Math.max(1, groupInfo.jumlahAnggota || 1)) : 0))).toLocaleString("id-ID")}
                  </span>
                </div>
                <p className="text-[10.5px] text-muted-foreground">
                  ℹ️ Tanggal jatuh tempo otomatis mengikuti grup pendaftaran ({jatuhTempo ? formatDateShort(jatuhTempo) : "Standar H-40"}). Invoice penambahan jamaah akan masuk ke antrean untuk ditinjau ulang sebelum diterbitkan.
                </p>
              </div>
            </div>
          )}

          {/* 3. NOMINAL TRANSACTION (Hanya untuk PEMBATALAN & REFUND_MURNI) */}
          {kategori !== "PEMBAYARAN" && kategori !== "PINDAH_PAKET" && kategori !== "TAMBAH_JAMAAH" && (
            <>
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-foreground">
                  2. Nominal {kategori === "PEMBATALAN" ? "Biaya Pembatalan / Refund" : kategori === "REFUND_MURNI" ? "Pengembalian Dana" : "Tagihan Invoice"} (Rp)
                </label>
                <CurrencyInput
                  placeholder="Masukkan nominal angka"
                  value={nominal}
                  onChange={(val) => setNominal(val)}
                  className="mt-1 font-bold text-base"
                />
              </div>

              {/* 4. JATUH TEMPO (Disembunyikan saat PINDAH_PAKET & TAMBAH_JAMAAH) */}
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
              </div>

              {/* 5. CATATAN (Disembunyikan saat PINDAH_PAKET & TAMBAH_JAMAAH) */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-foreground">
                  4. Catatan / Rincian Tagihan Invoice
                </label>
                <Input
                  placeholder="Contoh: Catatan rincian tagihan atau penjelasan tambahan"
                  value={catatan}
                  onChange={(e) => setCatatan(e.target.value)}
                  className="mt-1 text-sm"
                />
              </div>
            </>
          )}
        </div>

        {/* FOOTER ACTIONS */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t sticky bottom-0 bg-background/95 backdrop-blur-xs z-20 mt-2 pb-1">
          {kategori === "PEMBAYARAN" && groupInfo && financialSummary ? (
            <div className="text-xs text-muted-foreground hidden sm:flex items-center gap-3">
              <span>
                Sisa Tagihan: <strong className="text-foreground">{formatCurrency(financialSummary.sisaTagihan)}</strong>
              </span>
              {nominal > 0 && (
                <span className="flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                  &rarr; Sisa Baru: {formatCurrency(Math.max(0, financialSummary.sisaTagihan - nominal))}
                </span>
              )}
            </div>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <Button variant="outline" onClick={onClose} disabled={loading}>
              Batal
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={
                loading ||
                !groupInfo ||
                (kategori === "PINDAH_PAKET"
                  ? !targetPaketId ||
                    targetPaketId === currentPackage?.id ||
                    (pricingOption === "HARGA_BARU" && totalDiff < 0)
                  : kategori === "TAMBAH_JAMAAH"
                    ? tambahJamaahList.some((j) => !j.nama.trim())
                    : nominal <= 0)
              }
              className={cn(
                "font-bold text-white",
                kategori === "PEMBATALAN"
                  ? "bg-red-600 hover:bg-red-700"
                  : kategori === "REFUND_MURNI"
                    ? "bg-amber-600 hover:bg-amber-700"
                    : kategori === "PINDAH_PAKET"
                      ? "bg-blue-600 hover:bg-blue-700"
                      : kategori === "TAMBAH_JAMAAH"
                        ? "bg-purple-600 hover:bg-purple-700"
                        : "bg-emerald-600 hover:bg-emerald-700"
              )}
            >
              {loading
                ? "Memproses..."
                : kategori === "PINDAH_PAKET"
                  ? (pricingOption === "HARGA_BARU" && totalDiff > 0
                      ? "Pindahkan Paket & Terbitkan Invoice Selisih"
                      : "Pindahkan Paket")
                  : kategori === "TAMBAH_JAMAAH"
                    ? `Tambah ${tambahPaxCount} Jamaah ke Grup`
                    : kategori === "PEMBATALAN"
                      ? "Terbitkan Credit Note Pembatalan"
                      : kategori === "REFUND_MURNI"
                        ? "Terbitkan Bukti Refund"
                        : `Terbitkan Invoice (${formatCurrency(nominal)})`}
            </Button>
          </div>
        </div>
      </div>

      {/* LIGHTBOX PREVIEW BUKTI TRANSFER */}
      {previewBuktiUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setPreviewBuktiUrl(null)}
        >
          <div
            className="relative max-w-2xl w-full bg-background rounded-xl p-4 space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-sm text-foreground">Bukti Transfer Pembayaran</h4>
              <button
                type="button"
                onClick={() => setPreviewBuktiUrl(null)}
                className="text-muted-foreground hover:text-foreground font-bold text-sm px-2 py-1 cursor-pointer"
              >
                ✕ Tutup
              </button>
            </div>
            <div className="max-h-[70vh] overflow-auto flex items-center justify-center bg-black/5 rounded-lg">
              <img
                src={previewBuktiUrl}
                alt="Bukti Transfer"
                className="max-h-[65vh] object-contain rounded"
              />
            </div>
            <div className="flex justify-end gap-2">
              <a
                href={previewBuktiUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-bold text-emerald-600 hover:underline flex items-center gap-1"
              >
                Buka Tab Baru ↗
              </a>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
