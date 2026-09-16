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
} from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/components/ui/Button";
import { Input } from "@/shared/components/ui/Input";
import { CurrencyInput } from "@/shared/components/ui/CurrencyInput";
import { Modal } from "@/shared/components/ui/Modal";
import {
  getGroupByKode,
  getGroupList,
  createInvoice,
} from "@/server/actions/api";

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
  const [pindahPaketDetail, setPindahPaketDetail] = useState("");
  const [tambahPaxCount, setTambahPaxCount] = useState<number>(1);

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

  const [nominal, setNominal] = useState<number>(0);
  const [jatuhTempo, setJatuhTempo] = useState("");
  const [catatan, setCatatan] = useState("");
  const [loading, setLoading] = useState(false);

  // Load active groups for live search suggestions
  useEffect(() => {
    if (open) {
      getGroupList().then((list) => setAvailableGroups(list || [])).catch(() => {});
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

  function selectGroupData(group: any) {
    setGroupInfo(group);
    setLookupError("");
    setShowSuggestions(false);

    // Auto extract year & 4-digit sequence into inputs
    if (group.kodeRegistrasi) {
      const parts = group.kodeRegistrasi.split("-");
      if (parts[1]) setSelectedYear(parts[1]);
      if (parts[2]) setSeqInput(parts[2].slice(0, 4));
    }

    if (group.sisaPembayaran && kategori === "PEMBAYARAN") {
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

  async function handleSubmit() {
    if (!groupInfo || nominal <= 0) return;
    setLoading(true);

    let finalCatatan = catatan.trim();
    if (!finalCatatan) {
      if (kategori === "PEMBAYARAN") finalCatatan = `Invoice pembayaran untuk group ${groupInfo.kodeRegistrasi}`;
      else if (kategori === "PINDAH_PAKET") finalCatatan = `Invoice penyesuaian pindah paket (${pindahPaketDetail || "Perubahan Jadwal/Paket"}) untuk ${groupInfo.kodeRegistrasi}`;
      else if (kategori === "TAMBAH_JAMAAH") finalCatatan = `Invoice penambahan ${tambahPaxCount} pax jamaah untuk group ${groupInfo.kodeRegistrasi}`;
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
      setSeqInput("");
      setNominal(0);
      setJatuhTempo("");
      setCatatan("");
      setGroupInfo(null);
      setH40Warning(null);
      setKategori("PEMBAYARAN");
    } catch (e) {
      console.error("Failed to create invoice:", e);
      alert("Gagal menerbitkan invoice.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Penerbitan Invoice & Pengelolaan Transaksi Keuangan" size="lg">
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

          {groupInfo && (
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

          {/* DYNAMIC FORM FOR PINDAH PAKET */}
          {kategori === "PINDAH_PAKET" && (
            <div className="p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl space-y-2">
              <label className="text-[11px] font-bold text-blue-900 dark:text-blue-200 uppercase">
                Keterangan Pindah Paket / Selisih Biaya
              </label>
              <Input
                placeholder="Contoh: Pindah dari Paket Reguler ke Paket VIP Double (+ Selisih Rp 5.000.000)"
                value={pindahPaketDetail}
                onChange={(e) => setPindahPaketDetail(e.target.value)}
                className="text-xs"
              />
            </div>
          )}

          {/* DYNAMIC FORM FOR TAMBAH JAMAAH */}
          {kategori === "TAMBAH_JAMAAH" && (
            <div className="p-3 bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-purple-900 dark:text-purple-200 uppercase">
                  Jumlah Tambahan Jamaah (Pax)
                </label>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs">{tambahPaxCount} Pax</span>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={tambahPaxCount}
                    onChange={(e) => setTambahPaxCount(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className="w-16 px-2 py-1 border rounded text-xs text-center font-bold"
                  />
                </div>
              </div>
            </div>
          )}

          {/* 3. NOMINAL TRANSACTION */}
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

          {/* 4. JATUH TEMPO */}
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
                  {h40Warning.isLate ? "âڑ ï¸ڈ â‰¤ H-40 Mepet" : "Standar H-40"}
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

          {/* 5. CATATAN */}
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
        </div>

        {/* FOOTER ACTIONS */}
        <div className="flex justify-end gap-2 pt-3 border-t">
          <Button variant="outline" onClick={onClose}>
            Batal
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!groupInfo || nominal <= 0 || loading}
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
              ? "Menerbitkan..."
              : kategori === "PEMBATALAN"
                ? "Terbitkan Credit Note Pembatalan"
                : kategori === "REFUND_MURNI"
                  ? "Terbitkan Bukti Refund"
                  : "Terbitkan Invoice"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

