"use client";

import { useEffect, useState } from "react";
import { getKeberangkatanList } from "@/server/actions/api";
import {
  Check,
  Upload,
  Search,
  CreditCard,
  Plane,
  AlertTriangle,
  FileWarning,
  Bell,
  ArrowRight,
  Calendar,
  Building,
} from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@/shared/components/ui/Card";
import { StatusBadge } from "@/shared/components/ui/Badge";
import { Button } from "@/shared/components/ui/Button";
import { formatCurrency, formatDate } from "@/shared/lib/utils";
import { LoadingSkeleton } from "@/shared/components/LoadingSkeleton";
import { ErrorState } from "@/shared/components/ErrorState";
import type { Jamaah, DokumenItem, Invoice, Reminder, Keberangkatan } from "@/shared/types";


// ============================================================
// Step indicator for dashboard
// ============================================================
const DASHBOARD_STEPS = [
  { label: "Terdaftar", icon: Check },
  { label: "Upload Dokumen", icon: Upload },
  { label: "Verifikasi Dokumen", icon: Search },
  { label: "Pelunasan", icon: CreditCard },
  { label: "Siap Berangkat", icon: Plane },
] as const;

function getCurrentStep(status: string): number {
  const map: Record<string, number> = {
    registered: 0,
    dokumen_upload: 1,
    dokumen_revisi: 1,
    dokumen_verified: 2,
    pembayaran_pending: 3,
    lunas: 4,
    ready: 4,
    berangkat: 4,
  };
  return map[status] ?? 0;
}

function DashboardStepIndicator({ currentStep }: { currentStep: number }) {
  return (
    <div className="flex items-center justify-between px-2">
      {DASHBOARD_STEPS.map((step, idx) => {
        const StepIcon = step.icon;
        const isCompleted = idx < currentStep;
        const isCurrent = idx === currentStep;

        return (
          <div key={step.label} className="flex flex-1 flex-col items-center last:flex-none">
            <div className="flex w-full items-center">
              <div
                className={`relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors ${
                  isCompleted
                    ? "bg-success text-white"
                    : isCurrent
                      ? "bg-primary text-white ring-4 ring-primary/20"
                      : "bg-muted text-muted-foreground"
                }`}
              >
                {isCompleted ? <Check className="h-4 w-4" /> : <StepIcon className="h-4 w-4" />}
              </div>
              {idx < DASHBOARD_STEPS.length - 1 && (
                <div
                  className={`mx-1 h-0.5 flex-1 ${
                    isCompleted ? "bg-success" : idx < currentStep ? "bg-success" : "bg-muted"
                  }`}
                />
              )}
            </div>
            <span
              className={`mt-1.5 text-[10px] font-medium leading-tight text-center ${
                isCurrent ? "text-primary" : isCompleted ? "text-success" : "text-muted-foreground"
              }`}
            >
              {step.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ============================================================
// Payment status helper
// ============================================================
function getPaymentStatus(invoices: Invoice[]): { label: string; status: string; totalTagihan: number; sisa: number } {
  if (invoices.length === 0) return { label: "Belum Ada Tagihan", status: "draft", totalTagihan: 0, sisa: 0 };
  const allPaid = invoices.every((inv) => inv.status === "paid");
  const total = invoices.reduce((sum, inv) => sum + inv.jumlah, 0);
  const remaining = invoices.reduce((sum, inv) => sum + inv.sisaTagihan, 0);

  if (allPaid) return { label: "Lunas", status: "lunas", totalTagihan: total, sisa: 0 };
  if (remaining === 0) return { label: "Lunas", status: "lunas", totalTagihan: total, sisa: 0 };

  const hasOverdue = invoices.some((inv) => inv.status === "overdue");
  if (hasOverdue) return { label: "Overdue", status: "overdue", totalTagihan: total, sisa: remaining };

  return { label: "Belum Lunas", status: "draft", totalTagihan: total, sisa: remaining };
}

// ============================================================
// Main Dashboard Page
// ============================================================
export default function JamaahDashboardPage() {
  const [jamaah, setJamaah] = useState<Jamaah | null>(null);
  const [dokumen, setDokumen] = useState<DokumenItem[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const reminders: Reminder[] = [];
  const [keberangkatan, setKeberangkatan] = useState<Keberangkatan | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [meRes, invRes, payRes, kbrs] = await Promise.all([
          fetch("/api/jamaah/me"),
          fetch("/api/jamaah/me/invoices"),
          fetch("/api/jamaah/me/payments"),
          getKeberangkatanList(),
        ]);

        if (meRes.ok) {
          const meJson = await meRes.json();
          const j = meJson.data as Jamaah;
          setJamaah(j);
          setDokumen((j as any).dokumen ?? []);

          // Find the jamaah's keberangkatan
          const kbr = kbrs.find((k: any) => k.jamaahIds?.includes(j.id)) ?? null;
          setKeberangkatan(kbr);
        }

        let invs: Invoice[] = [];
        if (invRes.ok) {
          const invJson = await invRes.json();
          invs = invJson.data ?? [];
        }

        let pays: any[] = [];
        if (payRes.ok) {
          const payJson = await payRes.json();
          pays = payJson.data ?? [];
        }

        const invsWithPays = invs.map((inv) => ({
          ...inv,
          pembayaran: pays.filter((p: any) => p.invoiceId === inv.id),
        }));
        setInvoices(invsWithPays);
      } catch (err) {
        console.error("Failed to load dashboard data:", err);
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

  const currentStep = getCurrentStep(jamaah.status);
  const paymentInfo = getPaymentStatus(invoices);
  const dokLengkap = dokumen.filter((d) => d.status === "lengkap" || d.status === "verified").length;
  const dokKurang = dokumen.filter((d) => d.status === "kurang" || d.status === "revisi" || d.status === "pending");
  const latestInvoice = invoices.length > 0
    ? invoices.reduce((latest, inv) => (new Date(inv.createdAt) > new Date(latest.createdAt) ? inv : latest), invoices[0]!)
    : null;

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Selamat Datang, {jamaah.namaLengkap}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          No. Peserta: {jamaah.nomorPeserta} &middot; {jamaah.kota}, {jamaah.provinsi}
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Status Jamaah */}
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Status Jamaah
              </p>
              <StatusBadge status={jamaah.status} />
            </div>
          </CardContent>
        </Card>

        {/* Dokumen */}
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Kelengkapan Dokumen
              </p>
              <p className="text-2xl font-bold tracking-tight">
                {dokLengkap}
                <span className="text-lg font-normal text-muted-foreground">/{dokumen.length} Lengkap</span>
              </p>
              {dokKurang.length > 0 && (
                <p className="text-xs text-warning">{dokKurang.length} dokumen perlu dilengkapi</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Pembayaran */}
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Status Pembayaran
              </p>
              <StatusBadge status={paymentInfo.status} />
              {paymentInfo.sisa > 0 && (
                <p className="text-xs text-muted-foreground">
                  Sisa: {formatCurrency(paymentInfo.sisa)}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Keberangkatan */}
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Keberangkatan
              </p>
              {keberangkatan ? (
                <div className="space-y-1">
                  <p className="text-sm font-semibold leading-tight">{keberangkatan.paketUmroh?.namaPaket || "-"}</p>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    <span>{formatDate(keberangkatan.tanggalBerangkat)}</span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Building className="h-3 w-3" />
                    <span>{keberangkatan.maskapaiId || "-"}</span>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Belum ada jadwal</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Progress Tracker */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Progress Keberangkatan</CardTitle>
        </CardHeader>
        <CardContent>
          <DashboardStepIndicator currentStep={currentStep} />
        </CardContent>
      </Card>

      {/* Alerts & Latest Invoice */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Dokumen Kurang Alert */}
        <Card variant="operational">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <FileWarning className="h-4 w-4 text-warning" />
              Dokumen Yang Kurang
            </CardTitle>
          </CardHeader>
          <CardContent>
            {dokKurang.length === 0 ? (
              <div className="flex items-center gap-2 text-sm text-success">
                <Check className="h-4 w-4" />
                <span>Semua dokumen lengkap!</span>
              </div>
            ) : (
              <ul className="space-y-2">
                {dokKurang.map((doc) => (
                  <li key={doc.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-3.5 w-3.5 text-warning" />
                      <span className="text-sm capitalize">
                        {doc.jenis.replace(/_/g, " ")}
                      </span>
                    </div>
                    <StatusBadge status={doc.status} />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
          {dokKurang.length > 0 && (
            <CardFooter>
              <Button
                size="sm"
                variant="outline"
                onClick={() => { window.location.href = "/jamaah/dokumen/upload"; }}
              >
                Upload Dokumen
                <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            </CardFooter>
          )}
        </Card>

        {/* Tagihan Terbaru */}
        <Card variant={latestInvoice && latestInvoice.status !== "paid" ? "operational" : "default"}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <CreditCard className="h-4 w-4" />
              Tagihan Terbaru
            </CardTitle>
          </CardHeader>
          <CardContent>
            {latestInvoice ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{latestInvoice.nomorInvoice}</p>
                    <p className="text-xs capitalize text-muted-foreground">
                      {latestInvoice.tipe === "dp"
                        ? "Down Payment"
                        : latestInvoice.tipe === "pelunasan"
                          ? "Pelunasan"
                          : latestInvoice.tipe === "cicilan"
                            ? "Cicilan"
                            : "Tambahan"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold">{formatCurrency(latestInvoice.jumlah)}</p>
                    <StatusBadge status={latestInvoice.status} />
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Jatuh tempo: {formatDate(latestInvoice.jatuhTempo)}</span>
                  {latestInvoice.sisaTagihan > 0 && (
                    <span className="font-medium text-foreground">
                      Sisa: {formatCurrency(latestInvoice.sisaTagihan)}
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Belum ada tagihan</p>
            )}
          </CardContent>
          {latestInvoice && latestInvoice.status !== "paid" && (
            <CardFooter>
              <Button
                size="sm"
                variant="default"
                onClick={() => { window.location.href = "/jamaah/tagihan"; }}
              >
                Bayar Sekarang
                <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            </CardFooter>
          )}
        </Card>
      </div>

      {/* Reminders */}
      {reminders.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Bell className="h-4 w-4" />
              Pengumuman & Pengingat
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {reminders.map((rem) => (
                <div
                  key={rem.id}
                  className="flex items-start gap-3 rounded-md border p-3"
                >
                  <div className="mt-0.5">
                    <Bell className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className="text-sm">{rem.pesan}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{formatDate(rem.dikirimPada)}</span>
                      <StatusBadge status={rem.status} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
