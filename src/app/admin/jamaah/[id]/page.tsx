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
  Send,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/components/ui/Card";
import { Button } from "@/shared/components/ui/Button";
import { StatusBadge } from "@/shared/components/ui/Badge";
import { getJamaahById, getJamaahReadiness, getJamaahProgress, getDerivedStatus } from "@/services/mock/handlers";
import type { Jamaah, JamaahReadinessResult, JamaahProgress } from "@/shared/types";
import { cn } from "@/shared/lib/utils";

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
    <div className="space-y-3">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">Progress Operasional</span>
        <span className="text-muted-foreground">{progress.percentComplete}%</span>
      </div>
      <div className="flex items-center gap-0.5">
        {progress.steps.map((step, idx) => (
          <div key={step.key} className="flex items-center flex-1 min-w-0">
            <div
              className={cn(
                "h-2 flex-1 rounded-full first:rounded-l-full last:rounded-r-full",
                step.status === "completed"
                  ? "bg-success"
                  : step.status === "current"
                    ? "bg-primary"
                    : "bg-muted"
              )}
              title={`${step.label}: ${step.status}`}
            />
            {idx < progress.steps.length - 1 && <div className="w-0.5" />}
          </div>
        ))}
      </div>
      <div className="flex justify-between text-[10px] text-muted-foreground">
        {progress.steps.map((step) => (
          <span
            key={step.key}
            className={cn(
              "text-center leading-tight max-w-[60px]",
              step.status === "current" && "text-foreground font-medium"
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
    READY: "text-success",
    WARNING: "text-warning",
    INCOMPLETE: "text-info",
    BLOCKED: "text-destructive",
  };

  const levelBg: Record<string, string> = {
    READY: "bg-success/10 border-success/30",
    WARNING: "bg-warning/10 border-warning/30",
    INCOMPLETE: "bg-info/10 border-info/30",
    BLOCKED: "bg-destructive/10 border-destructive/30",
  };

  const levelLabel: Record<string, string> = {
    READY: "Siap Berangkat",
    WARNING: "Perlu Perhatian",
    INCOMPLETE: "Belum Lengkap",
    BLOCKED: "Tertahan",
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
          Validasi Kesiapan
        </CardTitle>
        <CardDescription className="flex items-center gap-2 mt-1">
          <span
            className={cn(
              "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold border",
              levelBg[readiness.level],
              levelColor[readiness.level]
            )}
          >
            {levelLabel[readiness.level]}
          </span>
          <span className="text-xs text-muted-foreground">
            {readiness.score}% — {readiness.passed}/{readiness.total} terpenuhi
          </span>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-1.5">
        {readiness.checks.map((check) => {
          return (
            <div
              key={check.key}
              className="flex items-start gap-2.5 py-1.5 px-2 rounded-md hover:bg-muted/50 transition-colors"
            >
              <span className={CHECK_COLOR[check.status]}>
                <CheckIcon status={check.status} />
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{check.label}</p>
                {check.detail && (
                  <p className="text-xs text-muted-foreground mt-0.5">{check.detail}</p>
                )}
              </div>
              <span
                className={cn(
                  "text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded",
                  check.status === "passed"
                    ? "bg-success/10 text-success"
                    : check.status === "warning"
                      ? "bg-warning/10 text-warning"
                      : check.status === "failed"
                        ? "bg-destructive/10 text-destructive"
                        : "bg-muted text-muted-foreground"
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

function DocumentCompletenessCard({ jamaah }: { jamaah: Jamaah }) {
  const wajib = [
    { key: "paspor", label: "Paspor" },
    { key: "pas_foto", label: "Pas Foto" },
    { key: "vaksin", label: "Vaksin" },
    { key: "ktp", label: "KTP" },
  ];

  const completedCount = wajib.filter((w) =>
    jamaah.dokumen.some(
      (d) => d.jenis === w.key && (d.status === "lengkap" || d.status === "verified")
    )
  ).length;

  const pct = Math.round((completedCount / wajib.length) * 100);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
          Kelengkapan Dokumen
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-2xl font-bold">{pct}%</span>
          <span className="text-xs text-muted-foreground">
            {completedCount}/{wajib.length} dokumen wajib
          </span>
        </div>
        <div className="h-2 w-full rounded-full bg-muted">
          <div
            className={cn(
              "h-2 rounded-full transition-all",
              pct >= 100 ? "bg-success" : pct >= 50 ? "bg-warning" : "bg-destructive"
            )}
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="flex flex-wrap gap-1.5 pt-1">
          {wajib.map((w) => {
            const doc = jamaah.dokumen.find((d) => d.jenis === w.key);
            const ok = doc && (doc.status === "lengkap" || doc.status === "verified");
            return (
              <span
                key={w.key}
                className={cn(
                  "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium gap-1",
                  ok ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
                )}
              >
                {ok ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                {w.label}
              </span>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

export default function JamaahDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [jamaah, setJamaah] = useState<Jamaah | null>(null);
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
        setJamaah(null);
        setLoading(false);
        return;
      }
      setJamaah(j);
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
        <p className="text-muted-foreground">Memuat data jamaah...</p>
      </div>
    );
  }

  if (!jamaah) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <p className="text-muted-foreground">Jamaah tidak ditemukan</p>
        <Button variant="outline" size="sm" onClick={() => router.push("/admin/jamaah")}>
          Kembali ke Daftar
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.push("/admin/jamaah")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold">{jamaah.namaLengkap}</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-sm text-muted-foreground font-mono">{jamaah.nomorPeserta}</span>
              <span className="text-muted-foreground">·</span>
              <StatusBadge status={derivedStatus ?? jamaah.status} />
            </div>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      {progress && <ProgressBar progress={progress} />}

      {/* 3-column grid */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Left col: readiness */}
        <div className="lg:col-span-2 space-y-5">
          {readiness && <ReadinessCard readiness={readiness} />}
        </div>

        {/* Right col: docs + info */}
        <div className="space-y-5">
          <DocumentCompletenessCard jamaah={jamaah} />

          {/* Quick Info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                Informasi
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">NIK</span>
                <span className="font-mono">{jamaah.nik}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Paspor</span>
                <span className="font-mono">{jamaah.nomorPaspor || "-"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Berlaku s/d</span>
                <span>{jamaah.masaBerlakuPaspor || "-"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tgl Lahir</span>
                <span>
                  {jamaah.tempatLahir}, {jamaah.tanggalLahir}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Hotel</span>
                <span>
                  {jamaah.hotelMekkah} / {jamaah.hotelMadinah}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Group</span>
                <span className="font-mono text-xs">{jamaah.groupId}</span>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                Aksi Cepat
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start"
                onClick={() => router.push(`/admin/dokumen?search=${encodeURIComponent(jamaah.namaLengkap)}`)}
              >
                <FileCheck className="mr-2 h-4 w-4" />
                Review Dokumen
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start"
                onClick={() => router.push(`/admin/pembayaran/${jamaah.groupId}`)}
              >
                <CreditCard className="mr-2 h-4 w-4" />
                Lihat Pembayaran
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start"
                onClick={() => router.push(`/admin/pengingat?jamaahId=${jamaah.id}`)}
              >
                <Send className="mr-2 h-4 w-4" />
                Kirim Pengingat
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start"
                onClick={() => router.push("/admin/manifest")}
              >
                <FileText className="mr-2 h-4 w-4" />
                Lihat Manifest
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
