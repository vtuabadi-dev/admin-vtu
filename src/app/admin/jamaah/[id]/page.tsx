"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  FileCheck,
  CheckCircle2,
  Circle,
  AlertCircle,
  XCircle,
  FileText,
  CreditCard,
  Package,
  Calendar,
  Plane,
  Building2,
  Bed,
  Receipt,
  Eye,
  ExternalLink,
  DollarSign,
  ShieldCheck,
  User,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/components/ui/Card";
import { Button } from "@/shared/components/ui/Button";
import { StatusBadge } from "@/shared/components/ui/Badge";
import { getJamaahById, getJamaahReadiness, getJamaahProgress, getDerivedStatus } from "@/server/actions/api";
import type { Jamaah, JamaahReadinessResult, JamaahProgress, DokumenItem } from "@/shared/types";
import { cn } from "@/shared/lib/utils";

function formatRupiah(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function CheckIcon({ status }: { status: string }) {
  const cls = "h-4 w-4 mt-px shrink-0";
  switch (status) {
    case "passed":
      return <CheckCircle2 className={cls} />;
    case "warning":
      return <AlertCircle className={cls} />;
    case "failed":
      return <XCircle className={cls} />;
    default:
      return <Circle className={cls} />;
  }
}

const CHECK_COLOR: Record<string, string> = {
  passed: "text-success",
  warning: "text-warning",
  failed: "text-destructive",
  skipped: "text-muted-foreground",
};

function ProgressBar({ progress }: { progress: JamaahProgress }) {
  return (
    <div className="space-y-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
      <div className="flex items-center justify-between text-sm">
        <span className="font-semibold text-slate-800">Progress Operasional Jamaah</span>
        <span className="text-emerald-600 font-bold">{progress.percentComplete}%</span>
      </div>
      <div className="flex items-center gap-0.5">
        {progress.steps.map((step, idx) => (
          <div key={step.key} className="flex items-center flex-1 min-w-0">
            <div
              className={cn(
                "h-2.5 flex-1 rounded-full first:rounded-l-full last:rounded-r-full transition-all",
                step.status === "completed"
                  ? "bg-emerald-500"
                  : step.status === "current"
                    ? "bg-amber-500 animate-pulse"
                    : "bg-slate-200"
              )}
              title={`${step.label}: ${step.status}`}
            />
            {idx < progress.steps.length - 1 && <div className="w-0.5" />}
          </div>
        ))}
      </div>
      <div className="flex justify-between text-[10px] text-slate-500 font-medium">
        {progress.steps.map((step) => (
          <span
            key={step.key}
            className={cn(
              "text-center leading-tight max-w-[60px]",
              step.status === "current" && "text-slate-900 font-bold underline"
            )}
          >
            {step.label}
          </span>
        ))}
      </div>
    </div>
  );
}

function ReadinessCard({ readiness }: { readiness: JamaahReadinessResult }) {
  const levelColor: Record<string, string> = {
    READY: "text-emerald-700",
    WARNING: "text-amber-700",
    INCOMPLETE: "text-blue-700",
    BLOCKED: "text-red-700",
  };

  const levelBg: Record<string, string> = {
    READY: "bg-emerald-50 border-emerald-300",
    WARNING: "bg-amber-50 border-amber-300",
    INCOMPLETE: "bg-blue-50 border-blue-300",
    BLOCKED: "bg-red-50 border-red-300",
  };

  const levelLabel: Record<string, string> = {
    READY: "Siap Berangkat",
    WARNING: "Perlu Perhatian",
    INCOMPLETE: "Belum Lengkap",
    BLOCKED: "Tertahan",
  };

  return (
    <Card className="border border-slate-200 shadow-sm">
      <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50 rounded-t-xl">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            Validasi Kesiapan Operasional
          </CardTitle>
          <span
            className={cn(
              "inline-flex items-center rounded-full px-3 py-1 text-xs font-bold border shadow-xs",
              levelBg[readiness.level],
              levelColor[readiness.level]
            )}
          >
            {levelLabel[readiness.level]} ({readiness.score}%)
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-1.5 pt-3">
        {readiness.checks.map((check) => {
          return (
            <div
              key={check.key}
              className="flex items-start gap-2.5 py-1.5 px-2.5 rounded-lg hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-200"
            >
              <span className={CHECK_COLOR[check.status]}>
                <CheckIcon status={check.status} />
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-slate-800">{check.label}</p>
                {check.detail && (
                  <p className="text-[11px] text-slate-500 mt-0.5">{check.detail}</p>
                )}
              </div>
              <span
                className={cn(
                  "text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border",
                  check.status === "passed"
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : check.status === "warning"
                      ? "bg-amber-50 text-amber-700 border-amber-200"
                      : check.status === "failed"
                        ? "bg-red-50 text-red-700 border-red-200"
                        : "bg-slate-100 text-slate-600 border-slate-200"
                )}
              >
                {check.status === "passed"
                  ? "OK"
                  : check.status === "warning"
                    ? "WARN"
                    : check.status === "failed"
                      ? "FAIL"
                      : "N/A"}
              </span>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

export default function JamaahDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [jamaahFull, setJamaahFull] = useState<any | null>(null);
  const [readiness, setReadiness] = useState<JamaahReadinessResult | null>(null);
  const [progress, setProgress] = useState<JamaahProgress | null>(null);
  const [derivedStatus, setDerivedStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    async function load() {
      setLoading(true);
      const j = await getJamaahById(id);
      if (!j) {
        setJamaahFull(null);
        setLoading(false);
        return;
      }
      setJamaahFull(j);
      const [r, p, ds] = await Promise.all([
        getJamaahReadiness(id),
        getJamaahProgress(id),
        getDerivedStatus(id),
      ]);
      setReadiness(r ?? null);
      setProgress(p ?? null);
      setDerivedStatus(ds ?? null);
      setLoading(false);
    }
    load();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mr-3" />
        <p className="text-slate-600 font-medium">Memuat data lengkap jamaah...</p>
      </div>
    );
  }

  if (!jamaahFull) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 bg-white rounded-xl border border-slate-200 shadow-sm">
        <AlertCircle className="h-10 w-10 text-amber-500" />
        <p className="text-slate-700 font-semibold">Data Jamaah tidak ditemukan</p>
        <Button variant="outline" size="sm" onClick={() => router.push("/admin/jamaah")}>
          Kembali ke Daftar Jamaah
        </Button>
      </div>
    );
  }

  const jamaah: Jamaah = jamaahFull;
  const paket = jamaahFull.paket;
  const invoices: any[] = jamaahFull.invoices || [];
  const pembayarans: any[] = jamaahFull.pembayarans || [];
  const dokumenList: DokumenItem[] = jamaahFull.dokumen || [];

  // Calculate billing summary
  const totalTagihan = invoices.reduce((acc, inv) => acc + (inv.totalAmount || inv.nominal || 0), 0) || 30000000;
  const totalDibayar = pembayarans.reduce((acc, p) => acc + (p.jumlah || p.nominal || 0), 0) || (invoices.some((i) => i.status === "paid") ? totalTagihan : invoices.some((i) => i.status === "partial") ? 5000000 : 0);
  const sisaTagihan = Math.max(0, totalTagihan - totalDibayar);
  const statusPembayaran = sisaTagihan === 0 && totalTagihan > 0 ? "LUNAS" : totalDibayar > 0 ? "CICILAN" : "DRAFT";

  // List of required document specs
  const DOKUMEN_SPECS = [
    { jenis: "paspor", title: "Paspor RI", desc: "Masa berlaku min. 7 bulan sebelum berangkat" },
    { jenis: "pas_foto", title: "Pas Foto 4x6", desc: "Background putih, tampak wajah 80%" },
    { jenis: "ktp", title: "KTP Elektronik", desc: "Nomor NIK valid & sesuai KK" },
    { jenis: "kk", title: "Kartu Keluarga", desc: "Identitas keluarga pendukung" },
    { jenis: "vaksin", title: "Buku / Sertifikat Vaksin", desc: "Vaksin Meningitis & Covid-19" },
    { jenis: "akta", title: "Akta Kelahiran / Buku Nikah", desc: "Dokumen mahram jika diperlukan" },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full border border-slate-200 hover:bg-slate-100" onClick={() => router.push("/admin/jamaah")}>
            <ArrowLeft className="h-5 w-5 text-slate-700" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-900">{jamaah.namaLengkap}</h1>
              <span className="text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200">
                {jamaah.jenisKelamin === "L" ? "Laki-Laki" : "Perempuan"}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2.5 text-xs text-slate-500 mt-1">
              <span className="font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-800 font-semibold">{jamaah.nomorPeserta}</span>
              <span>•</span>
              <span>NIK: <span className="font-mono text-slate-800">{jamaah.nik}</span></span>
              <span>•</span>
              <StatusBadge status={derivedStatus ?? jamaah.status} />
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="text-xs font-semibold"
            onClick={() => router.push(`/admin/dokumen?search=${encodeURIComponent(jamaah.namaLengkap)}`)}
          >
            <FileCheck className="mr-1.5 h-4 w-4 text-emerald-600" />
            Review Dokumen
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-xs font-semibold"
            onClick={() => router.push(`/admin/pembayaran/registrasi-baru`)}
          >
            <CreditCard className="mr-1.5 h-4 w-4 text-blue-600" />
            Kelola Pembayaran
          </Button>
        </div>
      </div>

      {/* Progress Bar */}
      {progress && <ProgressBar progress={progress} />}

      {/* Main Grid Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Columns: Package + Payments + Documents Detail */}
        <div className="lg:col-span-2 space-y-6">

          {/* 1. INFORMASI PAKET UMROH YANG DIPILIH */}
          <Card className="border border-slate-200 shadow-sm overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-emerald-800 to-emerald-950 text-white p-4 sm:p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-emerald-700/50 rounded-lg">
                    <Package className="h-5 w-5 text-emerald-300" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-bold text-white">Paket Umroh Yang Dipilih</CardTitle>
                    <CardDescription className="text-xs text-emerald-200 mt-0.5">Rincian keberangkatan, akomodasi, dan kamar</CardDescription>
                  </div>
                </div>
                <span className="text-xs font-bold bg-amber-400 text-slate-900 px-3 py-1 rounded-full uppercase tracking-wider shadow-xs">
                  {paket?.namaPaket || paket?.paketUmroh?.namaPaket || "Umroh Reguler Premium"}
                </span>
              </div>
            </CardHeader>
            <CardContent className="p-5 space-y-4 bg-white">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                
                <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <Calendar className="h-5 w-5 text-emerald-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase">Jadwal Keberangkatan</p>
                    <p className="font-bold text-slate-800 mt-0.5">
                      {paket?.tanggalBerangkat ? new Date(paket.tanggalBerangkat).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }) : "Jadwal Menyesuaikan (Bulan Depan)"}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">s/d {paket?.tanggalPulang ? new Date(paket.tanggalPulang).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }) : "12 Hari PP"}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <Plane className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase">Penerbangan / Maskapai</p>
                    <p className="font-bold text-slate-800 mt-0.5">{paket?.maskapai || "Saudia Airlines (Direct Flight)"}</p>
                    <p className="text-xs text-slate-500 mt-0.5">Landing: Madinah / Jeddah</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <Building2 className="h-5 w-5 text-purple-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase">Hotel Akomodasi</p>
                    <p className="font-bold text-slate-800 mt-0.5">Mekkah: {paket?.hotelMekkah || jamaah.hotelMekkah || "Hotel Setaraf Bintang 5"}</p>
                    <p className="text-xs text-slate-600 mt-0.5">Madinah: {paket?.hotelMadinah || jamaah.hotelMadinah || "Hotel Setaraf Bintang 4"}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <Bed className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase">Tipe Kamar / Upgrade</p>
                    <p className="font-bold text-slate-800 uppercase mt-0.5">
                      QUAD (4 Orang / Kamar)
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">Harga Dasar: {formatRupiah(paket?.hargaStartingFrom || paket?.hargaPaket || 30000000)}</p>
                  </div>
                </div>

              </div>
            </CardContent>
          </Card>

          {/* 2. RIWAYAT PEMBAYARAN & INVOICE */}
          <Card className="border border-slate-200 shadow-sm overflow-hidden">
            <CardHeader className="border-b border-slate-100 bg-slate-50/70 p-4 sm:p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Receipt className="h-5 w-5 text-blue-700" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-bold text-slate-900">Riwayat Pembayaran & Invoice</CardTitle>
                    <CardDescription className="text-xs text-slate-500 mt-0.5">Status tagihan, Down Payment (DP), dan pelunasan</CardDescription>
                  </div>
                </div>
                <span className={cn(
                  "px-3 py-1 rounded-full text-xs font-extrabold tracking-wider border",
                  statusPembayaran === "LUNAS" ? "bg-emerald-100 text-emerald-800 border-emerald-300" :
                  statusPembayaran === "CICILAN" ? "bg-blue-100 text-blue-800 border-blue-300" : "bg-amber-100 text-amber-800 border-amber-300"
                )}>
                  {statusPembayaran}
                </span>
              </div>
            </CardHeader>

            <CardContent className="p-5 space-y-5">
              {/* Financial summary bar */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-xl bg-slate-900 text-white">
                <div className="space-y-0.5">
                  <p className="text-[11px] font-medium text-slate-400 uppercase">Total Tagihan</p>
                  <p className="text-lg font-bold text-white">{formatRupiah(totalTagihan)}</p>
                </div>
                <div className="space-y-0.5 border-t sm:border-t-0 sm:border-l border-slate-800 pt-2 sm:pt-0 sm:pl-4">
                  <p className="text-[11px] font-medium text-slate-400 uppercase">Telah Dibayar</p>
                  <p className="text-lg font-bold text-emerald-400">{formatRupiah(totalDibayar)}</p>
                </div>
                <div className="space-y-0.5 border-t sm:border-t-0 sm:border-l border-slate-800 pt-2 sm:pt-0 sm:pl-4">
                  <p className="text-[11px] font-medium text-slate-400 uppercase">Sisa Tagihan</p>
                  <p className="text-lg font-bold text-amber-400">{formatRupiah(sisaTagihan)}</p>
                </div>
              </div>

              {/* Transactions / Invoices Table */}
              <div className="space-y-2">
                <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">Daftar Transaksi & Upload Bukti Transfer</p>
                
                {pembayarans.length === 0 && invoices.length === 0 ? (
                  <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-start gap-2.5">
                    <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold">Bukti Transfer DP Belum Diunggah</p>
                      <p className="text-slate-600 mt-0.5">Jamaah mendaftar via portal online. Bukti DP dapat diunggah jamaah di Step 8 atau diisi manual oleh admin pada menu Pembayaran.</p>
                    </div>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden text-xs">
                    {invoices.map((inv: any, idx: number) => (
                      <div key={inv.id || idx} className="p-3.5 bg-white flex items-center justify-between gap-3 hover:bg-slate-50">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-slate-100 rounded-lg">
                            <DollarSign className="h-4 w-4 text-slate-700" />
                          </div>
                          <div>
                            <p className="font-bold text-slate-800">{inv.nomorInvoice || `Invoice #${idx + 1}`}</p>
                            <p className="text-[11px] text-slate-500">{inv.keterangan || "Pembayaran DP Registrasi Umroh"}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-slate-900">{formatRupiah(inv.totalAmount || inv.nominal || 0)}</p>
                          <span className={cn(
                            "inline-block text-[10px] font-bold px-2 py-0.5 rounded uppercase mt-0.5",
                            inv.status === "paid" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                          )}>
                            {inv.status || "VERIFIED"}
                          </span>
                        </div>
                      </div>
                    ))}

                    {pembayarans.map((p: any, idx: number) => (
                      <div key={p.id || idx} className="p-3.5 bg-white flex items-center justify-between gap-3 hover:bg-slate-50">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-emerald-50 rounded-lg border border-emerald-200">
                            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                          </div>
                          <div>
                            <p className="font-bold text-slate-800">Transfer Masuk (DP)</p>
                            <p className="text-[11px] text-slate-500">{p.tanggalBayar ? new Date(p.tanggalBayar).toLocaleDateString("id-ID") : "Tanggal Verifikasi Admin"}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-emerald-700">{formatRupiah(p.jumlah || p.nominal || 5000000)}</p>
                          {p.buktiUrl && (
                            <a href={p.buktiUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[11px] text-blue-600 font-semibold hover:underline mt-0.5">
                              <Eye className="h-3 w-3" /> Lihat Bukti TF
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* 3. INFORMASI & RINCIAN DOKUMEN YANG SUDAH TERKUMPUL */}
          <Card className="border border-slate-200 shadow-sm overflow-hidden">
            <CardHeader className="border-b border-slate-100 bg-slate-50/70 p-4 sm:p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-emerald-100 rounded-lg">
                    <FileCheck className="h-5 w-5 text-emerald-700" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-bold text-slate-900">Rincian Dokumen Terkumpul</CardTitle>
                    <CardDescription className="text-xs text-slate-500 mt-0.5">Status verifikasi fisik & file berkas jamaah</CardDescription>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs font-semibold"
                  onClick={() => router.push(`/admin/dokumen?search=${encodeURIComponent(jamaah.namaLengkap)}`)}
                >
                  <ExternalLink className="mr-1.5 h-3.5 w-3.5" /> Buka Vault Dokumen
                </Button>
              </div>
            </CardHeader>

            <CardContent className="p-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {DOKUMEN_SPECS.map((spec) => {
                  const doc = dokumenList.find((d) => d.jenis === spec.jenis);
                  const isUploaded = !!doc;
                  const isVerified = doc && (doc.status === "lengkap" || doc.status === "verified");

                  return (
                    <div
                      key={spec.jenis}
                      className={cn(
                        "p-3.5 rounded-xl border transition-all flex flex-col justify-between space-y-3",
                        isVerified
                          ? "bg-emerald-50/50 border-emerald-200"
                          : isUploaded
                            ? "bg-amber-50/50 border-amber-200"
                            : "bg-slate-50 border-slate-200"
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-1.5">
                            {isVerified ? (
                              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                            ) : isUploaded ? (
                              <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
                            ) : (
                              <XCircle className="h-4 w-4 text-slate-400 shrink-0" />
                            )}
                            <p className="font-bold text-sm text-slate-900">{spec.title}</p>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5">{spec.desc}</p>
                        </div>

                        <span
                          className={cn(
                            "text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border shrink-0",
                            isVerified
                              ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                              : isUploaded
                                ? "bg-amber-100 text-amber-800 border-amber-300"
                                : "bg-slate-200 text-slate-600 border-slate-300"
                          )}
                        >
                          {isVerified ? "TERVERIFIKASI" : isUploaded ? "MENUNGGU REVIEW" : "BELUM UPLOAD"}
                        </span>
                      </div>

                      {doc && (
                        <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-xs">
                          <span className="text-slate-500 text-[11px] truncate max-w-[150px]">
                            {doc.fileUrl ? doc.fileUrl.split("/").pop() : "File Terunggah"}
                          </span>
                          {doc.fileUrl && (
                            <a
                              href={doc.fileUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-bold hover:underline"
                            >
                              <Eye className="h-3 w-3" /> Preview
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

        </div>

        {/* Right 1 Column: Readiness + Personal Info + Actions */}
        <div className="space-y-6">
          
          {/* Validation Readiness Card */}
          {readiness && <ReadinessCard readiness={readiness} />}

          {/* Personal Info Card */}
          <Card className="border border-slate-200 shadow-sm">
            <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50 rounded-t-xl">
              <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <User className="h-4 w-4 text-slate-600" />
                Informasi Biodata Jamaah
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5 text-xs pt-3">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">NIK</span>
                <span className="font-mono font-semibold text-slate-800">{jamaah.nik}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Nomor Paspor</span>
                <span className="font-mono font-bold text-emerald-700">{jamaah.nomorPaspor || "-"}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Masa Berlaku Paspor</span>
                <span className="font-medium text-slate-800">{jamaah.masaBerlakuPaspor || "-"}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Tempat, Tgl Lahir</span>
                <span className="font-medium text-slate-800">
                  {jamaah.tempatLahir || "-"}, {jamaah.tanggalLahir || "-"}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Nomor Telepon</span>
                <span className="font-mono text-slate-800">{jamaah.nomorTelepon || "-"}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Email</span>
                <span className="text-slate-800 truncate max-w-[160px]">{jamaah.email || "-"}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Group Registrasi</span>
                <span className="font-mono font-semibold text-slate-800">{jamaah.groupId || "-"}</span>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions Card */}
          <Card className="border border-slate-200 shadow-sm">
            <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50 rounded-t-xl">
              <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Aksi Pengelolaan
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 pt-3">
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start text-xs font-semibold text-slate-700"
                onClick={() => router.push(`/admin/dokumen?search=${encodeURIComponent(jamaah.namaLengkap)}`)}
              >
                <FileCheck className="mr-2 h-4 w-4 text-emerald-600" />
                Review & Verifikasi Dokumen
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start text-xs font-semibold text-slate-700"
                onClick={() => router.push(`/admin/pembayaran/registrasi-baru`)}
              >
                <CreditCard className="mr-2 h-4 w-4 text-blue-600" />
                Verifikasi Pembayaran & Invoice
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start text-xs font-semibold text-slate-700"
                onClick={() => router.push(`/admin/manifest`)}
              >
                <FileText className="mr-2 h-4 w-4 text-purple-600" />
                Lihat di Manifest Keberangkatan
              </Button>
            </CardContent>
          </Card>

        </div>

      </div>
    </div>
  );
}
