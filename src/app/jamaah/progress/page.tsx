"use client";

import { useEffect, useState } from "react";
import {
  Check,
  Circle,
  Clock,
  Plane,
  Upload,
  Search,
  CreditCard,
  FileCheck,
  Calendar,
  Building,
  Hotel,
  MapPin,
  ShieldCheck,
  ArrowRight,
  CheckSquare,
} from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/shared/components/ui/Card";
import { StatusBadge } from "@/shared/components/ui/Badge";
import { Button } from "@/shared/components/ui/Button";
import { formatDate } from "@/shared/lib/utils";
import { LoadingSkeleton } from "@/shared/components/LoadingSkeleton";
import { ErrorState } from "@/shared/components/ErrorState";
import type {
  Jamaah,
  DokumenItem,
  Invoice,
  Keberangkatan,
} from "@/shared/types";

// ============================================================
// Progress step definitions
// ============================================================
interface ProgressStep {
  key: string;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

const PROGRESS_STEPS: ProgressStep[] = [
  {
    key: "pendaftaran",
    label: "Pendaftaran",
    description: "Pendaftaran dan pembuatan nomor peserta",
    icon: Check,
  },
  {
    key: "upload_dokumen",
    label: "Upload Dokumen",
    description: "Melengkapi dokumen persyaratan",
    icon: Upload,
  },
  {
    key: "verifikasi_dokumen",
    label: "Verifikasi Dokumen",
    description: "Verifikasi dan validasi dokumen oleh admin",
    icon: Search,
  },
  {
    key: "pembayaran",
    label: "Pembayaran",
    description: "Pembayaran DP dan cicilan",
    icon: CreditCard,
  },
  {
    key: "pelunasan",
    label: "Pelunasan",
    description: "Pelunasan biaya paket umroh/haji",
    icon: FileCheck,
  },
  {
    key: "siap_berangkat",
    label: "Siap Berangkat",
    description: "Semua persyaratan terpenuhi, siap berangkat",
    icon: Plane,
  },
];

// ============================================================
// Determine current step from jamaah status + invoice data
// ============================================================
function calculateCurrentStep(
  status: string,
  invoices: Invoice[],
  dokumen: DokumenItem[]
): number {
  // If any doc is rejected or needs revision, we're in upload/verification step
  const hasRevisiDokumen = dokumen.some(
    (d) => d.status === "revisi" || d.status === "rejected"
  );
  const allDocsComplete = dokumen.every(
    (d) => d.status === "lengkap" || d.status === "verified"
  );
  const allPaid = invoices.length > 0 && invoices.every((inv) => inv.status === "paid");
  const anyPaid = invoices.some((inv) => inv.status === "paid" || inv.status === "partial");

  switch (status) {
    case "registered":
      return 0;
    case "dokumen_upload":
    case "dokumen_revisi":
      return hasRevisiDokumen ? 2 : 1; // If revisi, show verification step current
    case "dokumen_verified":
      return allDocsComplete ? 3 : 2;
    case "pembayaran_pending":
      return anyPaid ? 4 : 3;
    case "lunas":
    case "ready":
    case "berangkat":
      return allPaid ? 5 : 4;
    default:
      return 0;
  }
}

// ============================================================
// Get status for individual step
// ============================================================
type StepStatusValue = "completed" | "current" | "pending";

function getStepStatus(
  stepIndex: number,
  currentStep: number
): StepStatusValue {
  if (stepIndex < currentStep) return "completed";
  if (stepIndex === currentStep) return "current";
  return "pending";
}

// ============================================================
// Timeline Component
// ============================================================
function ProgressTimeline({
  currentStep,
}: {
  currentStep: number;
}) {
  return (
    <div className="relative">
      {/* Vertical line */}
      <div className="absolute left-[19px] top-0 h-full w-0.5 bg-muted" />

      <div className="space-y-0">
        {PROGRESS_STEPS.map((step, idx) => {
          const status = getStepStatus(idx, currentStep);
          const StepIcon = step.icon;

          return (
            <div key={step.key} className="relative flex gap-4 pb-8 last:pb-0">
              {/* Circle */}
              <div className="relative z-10 flex shrink-0">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors ${
                    status === "completed"
                      ? "border-success bg-success text-white"
                      : status === "current"
                        ? "border-primary bg-primary text-white shadow-lg shadow-primary/20"
                        : "border-muted bg-card text-muted-foreground"
                  }`}
                >
                  {status === "completed" ? (
                    <Check className="h-5 w-5" />
                  ) : status === "current" ? (
                    <div className="relative">
                      <StepIcon className="h-5 w-5" />
                      <span className="absolute -right-1 -top-1 h-2.5 w-2.5 animate-ping rounded-full bg-primary" />
                    </div>
                  ) : (
                    <Circle className="h-5 w-5" />
                  )}
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 pt-1.5">
                <div className="flex items-center gap-2">
                  <h3
                    className={`text-sm font-semibold ${
                      status === "completed"
                        ? "text-success"
                        : status === "current"
                          ? "text-primary"
                          : "text-muted-foreground"
                    }`}
                  >
                    {step.label}
                  </h3>
                  {status === "completed" && (
                    <Check className="h-3.5 w-3.5 text-success" />
                  )}
                  {status === "current" && (
                    <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                      Sedang Berjalan
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {step.description}
                </p>

                {/* Detail per step */}
                {status === "completed" && step.key === "pendaftaran" && (
                  <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                    <CheckSquare className="h-3 w-3 text-success" />
                    <span>Pendaftaran selesai, nomor peserta telah diterbitkan</span>
                  </div>
                )}
                {status === "current" && step.key === "upload_dokumen" && (
                  <div className="mt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => { window.location.href = "/jamaah/dokumen/upload"; }}
                    >
                      Upload Dokumen
                      <ArrowRight className="ml-1 h-3 w-3" />
                    </Button>
                  </div>
                )}
                {status === "current" && step.key === "pembayaran" && (
                  <div className="mt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => { window.location.href = "/jamaah/tagihan"; }}
                    >
                      Lihat Tagihan
                      <ArrowRight className="ml-1 h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================
// Requirements checklist
// ============================================================
interface Requirement {
  label: string;
  terpenuhi: boolean;
}

function getRequirements(
  _jamaah: Jamaah,
  dokumen: DokumenItem[],
  invoices: Invoice[]
): Requirement[] {
  const allDocsComplete = dokumen.every(
    (d) => d.status === "lengkap" || d.status === "verified"
  );
  const allInvoicesPaid = invoices.every((inv) => inv.status === "paid");

  return [
    { label: "Pendaftaran & Nomor Peserta", terpenuhi: true },
    {
      label: "Upload KTP",
      terpenuhi: dokumen.some((d) => d.jenis === "ktp" && (d.status === "lengkap" || d.status === "verified")),
    },
    {
      label: "Upload Paspor",
      terpenuhi: dokumen.some((d) => d.jenis === "paspor" && (d.status === "lengkap" || d.status === "verified")),
    },
    {
      label: "Upload Kartu Keluarga",
      terpenuhi: dokumen.some((d) => d.jenis === "kk" && (d.status === "lengkap" || d.status === "verified")),
    },
    {
      label: "Upload Pas Foto",
      terpenuhi: dokumen.some((d) => d.jenis === "pas_foto" && (d.status === "lengkap" || d.status === "verified")),
    },
    {
      label: "Upload Sertifikat Vaksin",
      terpenuhi: dokumen.some((d) => d.jenis === "vaksin" && (d.status === "lengkap" || d.status === "verified")),
    },
    { label: "Verifikasi Dokumen", terpenuhi: allDocsComplete },
    { label: "Pembayaran DP", terpenuhi: invoices.some((inv) => inv.status === "paid" || inv.status === "partial") },
    { label: "Pelunasan Biaya", terpenuhi: allInvoicesPaid },
  ];
}

// ============================================================
// Progress Page
// ============================================================
export default function ProgressPage() {
  const [jamaah, setJamaah] = useState<Jamaah | null>(null);
  const [dokumen, setDokumen] = useState<DokumenItem[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [keberangkatan, setKeberangkatan] = useState<Keberangkatan | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [meRes, invRes, docRes] = await Promise.all([
          fetch("/api/jamaah/me"),
          fetch("/api/jamaah/me/invoices"),
          fetch("/api/jamaah/me/documents"),
        ]);

        if (meRes.ok) {
          const json = await meRes.json();
          setJamaah(json.data ?? null);
          if (json.data) {
            // Try to get departure info
            try {
              const kbrRes = await fetch("/api/jamaah/me/departure");
              if (kbrRes.ok) { const kj = await kbrRes.json(); setKeberangkatan(kj.data ?? null); }
            } catch { /* non-critical */ }
          }
        }
        if (invRes.ok) { const json = await invRes.json(); setInvoices(json.data ?? []); }
        if (docRes.ok) { const json = await docRes.json(); setDokumen(json.data ?? []); }
      } catch (err) {
        console.error("Failed to load progress data:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return <LoadingSkeleton variant="page" />;
  }

  if (!jamaah) {
    return (
      <ErrorState
        message="Data jamaah tidak ditemukan. Silakan coba muat ulang halaman."
        onRetry={() => window.location.reload()}
      />
    );
  }

  const currentStep = calculateCurrentStep(jamaah.status, invoices, dokumen);
  const requirements = getRequirements(jamaah, dokumen, invoices);
  const completedReqs = requirements.filter((r) => r.terpenuhi).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Progress Keberangkatan
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Pantau tahapan persiapan keberangkatan umroh/haji Anda
        </p>
      </div>

      {/* Status info bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Status Jamaah:</span>
              <StatusBadge status={jamaah.status} />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Progress:</span>
              <span className="text-sm font-medium">
                {currentStep} dari {PROGRESS_STEPS.length} tahap
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main grid: Timeline + Side Panel */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Timeline — Left 2 columns */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Tahapan Keberangkatan</CardTitle>
            </CardHeader>
            <CardContent>
              <ProgressTimeline currentStep={currentStep} />
            </CardContent>
          </Card>
        </div>

        {/* Side Panel — Right 1 column */}
        <div className="space-y-4">
          {/* Keberangkatan Details */}
          {keberangkatan && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Plane className="h-4 w-4" />
                  Detail Keberangkatan
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Paket</p>
                      <p className="text-sm font-medium">{keberangkatan.namaPaket}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Calendar className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Tanggal Keberangkatan</p>
                      <p className="text-sm">{formatDate(keberangkatan.tanggalBerangkat)}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Calendar className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Tanggal Pulang</p>
                      <p className="text-sm">{formatDate(keberangkatan.tanggalPulang)}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Building className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Maskapai</p>
                      <p className="text-sm">{keberangkatan.maskapai} ({keberangkatan.nomorPenerbangan})</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Hotel className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Hotel Mekkah</p>
                      <p className="text-sm">{keberangkatan.hotelMekkah}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Hotel className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Hotel Madinah</p>
                      <p className="text-sm">{keberangkatan.hotelMadinah}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Checklist */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <ShieldCheck className="h-4 w-4" />
                Checklist Persyaratan
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-3 flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Progress</span>
                <span className="font-medium">
                  {completedReqs}/{requirements.length}
                </span>
              </div>
              <div className="mb-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-success transition-all"
                  style={{ width: `${(completedReqs / requirements.length) * 100}%` }}
                />
              </div>
              <ul className="space-y-2">
                {requirements.map((req) => (
                  <li key={req.label} className="flex items-start gap-2">
                    <div
                      className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full ${
                        req.terpenuhi
                          ? "bg-success text-white"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {req.terpenuhi ? (
                        <Check className="h-2.5 w-2.5" />
                      ) : (
                        <Clock className="h-2.5 w-2.5" />
                      )}
                    </div>
                    <span
                      className={`text-xs ${
                        req.terpenuhi ? "text-foreground" : "text-muted-foreground"
                      }`}
                    >
                      {req.label}
                    </span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
