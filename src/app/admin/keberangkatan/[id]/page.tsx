"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  AlertTriangle,
  FileText,
  Building2,
  Users,
  CreditCard,
  Send,
  CheckCircle2,
  ChevronRight,
  ShieldCheck,
  XCircle,
  Lock,
  FileCheck,
  Mail,
  X,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/Card";
import { Button } from "@/shared/components/ui/Button";
import { StatusBadge } from "@/shared/components/ui/Badge";
import { StatCard } from "@/shared/components/ui/StatCard";
import { Tabs } from "@/shared/components/ui/Tabs";
import { Select } from "@/shared/components/ui/Select";
import { Modal } from "@/shared/components/ui/Modal";
import { RequirePermission } from "@/shared/components/RequirePermission";
import {
  getKeberangkatanById,
  getPackageIntelligence,
  getAutoWarnings,
  getOperationalTimeline,
  getFinalizationResult,
  getPackageReadinessScore,
  getJamaahList,
  getGroupList,
} from "@/server/actions/api";
import type {
  Keberangkatan,
  PackageIntelligence,
  OperationalAlert,
  OperationalMilestone,
  FinalizationResult,
  PackageReadinessScore,
  Jamaah,
} from "@/shared/types";
import { cn } from "@/shared/lib/utils";
import { getMilestoneVariant } from "@/shared/lib/timeline-utils";
import { getScoreVariant, getReadinessLevel, getReadinessLevelColor, getReadinessLabel } from "@/shared/lib/readiness-score";
import { computePackageLockState } from "@/shared/lib/package-lock";
import { computeDocumentCompleteness, getMissingDocLabels } from "@/shared/lib/document-utils";

// ============================================================
// DOCUMENT TAB HELPERS
// ============================================================

type DocFilter = "semua" | "belum_lengkap" | "paspor_missing" | "vaksin_missing" | "ktp_missing";

interface JamaahDocRow {
  jamaah: Jamaah;
  pasporDone: boolean;
  vaksinDone: boolean;
  ktpDone: boolean;
  pasFotoDone: boolean;
  completeness: number;
  missingLabels: string[];
}

function buildDocRows(jamaahList: Jamaah[]): JamaahDocRow[] {
  return jamaahList.map((j) => {
    const { percentage } = computeDocumentCompleteness(j.dokumen);
    const completedSet = new Set(
      j.dokumen
        .filter((d) => d.status === "lengkap" || d.status === "verified")
        .map((d) => d.jenis)
    );
    return {
      jamaah: j,
      pasporDone: completedSet.has("paspor"),
      vaksinDone: completedSet.has("vaksin"),
      ktpDone: completedSet.has("ktp"),
      pasFotoDone: completedSet.has("pas_foto"),
      completeness: percentage,
      missingLabels: getMissingDocLabels(j.dokumen),
    };
  });
}

function generateReminderText(jamaah: Jamaah, missingLabels: string[], paketName: string): string {
  const daftar = missingLabels.map((l) => `* ${l}`).join("\n");
  return `Assalamu'alaikum Bapak/Ibu ${jamaah.namaLengkap},\n\nDokumen berikut masih belum lengkap untuk paket ${paketName}:\n\n${daftar}\n\nMohon segera melengkapi dokumen tersebut.`;
}

// ============================================================
// MAIN PAGE
// ============================================================

export default function KeberangkatanDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [kbr, setKbr] = useState<Keberangkatan | null>(null);
  const [intel, setIntel] = useState<PackageIntelligence | null>(null);
  const [warnings, setWarnings] = useState<OperationalAlert[]>([]);
  const [timeline, setTimeline] = useState<OperationalMilestone[]>([]);
  const [finalization, setFinalization] = useState<FinalizationResult | null>(null);
  const [readinessScore, setReadinessScore] = useState<PackageReadinessScore | null>(null);
  const [loading, setLoading] = useState(true);

  // Dokumen tab state
  const [docRows, setDocRows] = useState<JamaahDocRow[]>([]);
  const [docFilter, setDocFilter] = useState<DocFilter>("semua");
  const [reminderTarget, setReminderTarget] = useState<JamaahDocRow | null>(null);

  useEffect(() => {
    if (!id) return;
    async function load() {
      setLoading(true);
      const [k, int, wrn, tl, fin, score, allJamaah, allGroups] = await Promise.all([
        getKeberangkatanById(id),
        getPackageIntelligence(id),
        getAutoWarnings(id),
        getOperationalTimeline(id),
        getFinalizationResult(id),
        getPackageReadinessScore(id),
        getJamaahList(),
        getGroupList(),
      ]);
      setKbr(k ?? null);
      setIntel(int ?? null);
      setWarnings(wrn);
      setTimeline(tl ?? []);
      setFinalization(fin ?? null);
      setReadinessScore(score ?? null);

      // Build doc rows from jamaah in this package
      const pkgGroupIds = new Set(
        allGroups.filter((g: any) => g.paketKeberangkatanId === id).map((g: any) => g.id)
      );
      const pkgJamaah = allJamaah.filter((j: any) => pkgGroupIds.has(j.groupId));
      setDocRows(buildDocRows(pkgJamaah));
      setLoading(false);
    }
    load();
  }, [id]);

  const filteredDocRows = useMemo(() => {
    switch (docFilter) {
      case "belum_lengkap":
        return docRows.filter((r) => r.completeness < 100);
      case "paspor_missing":
        return docRows.filter((r) => !r.pasporDone);
      case "vaksin_missing":
        return docRows.filter((r) => !r.vaksinDone);
      case "ktp_missing":
        return docRows.filter((r) => !r.ktpDone);
      default:
        return docRows;
    }
  }, [docRows, docFilter]);

  const docSummary = useMemo(() => {
    const total = docRows.length;
    const lengkap = docRows.filter((r) => r.completeness === 100).length;
    const pending = total - lengkap;
    const pasporMissing = docRows.filter((r) => !r.pasporDone).length;
    const vaksinMissing = docRows.filter((r) => !r.vaksinDone).length;
    const ktpMissing = docRows.filter((r) => !r.ktpDone).length;
    const pasFotoMissing = docRows.filter((r) => !r.pasFotoDone).length;
    return { total, lengkap, pending, pasporMissing, vaksinMissing, ktpMissing, pasFotoMissing };
  }, [docRows]);

  const docFilterOptions = [
    { value: "semua", label: `Semua (${docSummary.total})` },
    { value: "belum_lengkap", label: `Dokumen Belum Lengkap (${docSummary.pending})` },
    { value: "paspor_missing", label: `Paspor Missing (${docSummary.pasporMissing})` },
    { value: "vaksin_missing", label: `Vaksin Missing (${docSummary.vaksinMissing})` },
    { value: "ktp_missing", label: `KTP Missing (${docSummary.ktpMissing})` },
  ];

  const handleKirimReminder = useCallback((row: JamaahDocRow) => {
    setReminderTarget(row);
  }, []);

  const lockState = useMemo(() => (kbr ? computePackageLockState(kbr) : null), [kbr]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Memuat detail paket...</p>
      </div>
    );
  }

  if (!kbr) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <p className="text-muted-foreground">Paket tidak ditemukan</p>
        <Button variant="outline" size="sm" onClick={() => router.push("/admin/keberangkatan")}>
          Kembali
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.push("/admin/keberangkatan")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold">{kbr.paketUmroh?.namaPaket || "-"}</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-sm text-muted-foreground font-mono">{kbr.kode}</span>
              <span className="text-muted-foreground">·</span>
              <StatusBadge status={kbr.status} />
              {lockState && lockState.status !== "unlocked" && (
                <>
                  <span className="text-muted-foreground">·</span>
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold",
                      lockState.status === "finalized"
                        ? "bg-destructive/10 text-destructive"
                        : "bg-warning/10 text-warning"
                    )}
                  >
                    <Lock className="h-3 w-3" />
                    {lockState.status === "finalized" ? "FINAL" : "TERKUNCI"}
                  </span>
                </>
              )}
              <span className="text-muted-foreground">·</span>
              <span className="text-sm text-muted-foreground">
                {kbr.tanggalBerangkat} → {kbr.tanggalPulang}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Readiness Score Banner */}
      {readinessScore && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <Card className="lg:col-span-1">
            <CardContent className="pt-6 text-center">
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">
                Skor Kesiapan
              </p>
              <div
                className={cn(
                  "inline-flex items-center justify-center h-16 w-16 rounded-full text-2xl font-bold",
                  getScoreVariant(readinessScore.overallScore) === "success"
                    ? "bg-success/10 text-success"
                    : getScoreVariant(readinessScore.overallScore) === "warning"
                      ? "bg-warning/10 text-warning"
                      : "bg-destructive/10 text-destructive"
                )}
              >
                {readinessScore.overallScore}
              </div>
              <div
                className={cn(
                  "inline-block mt-2 text-xs font-medium px-2 py-0.5 rounded-full",
                  getReadinessLevelColor(getReadinessLevel(readinessScore))
                )}
              >
                {getReadinessLabel(getReadinessLevel(readinessScore))}
              </div>
              <p className="text-xs text-muted-foreground mt-1">/ 100</p>
            </CardContent>
          </Card>
          {readinessScore.breakdown.map((item) => (
            <Card key={item.label}>
              <CardContent className="pt-6 text-center">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                  {item.label}
                </p>
                <p
                  className={cn(
                    "text-xl font-bold",
                    getScoreVariant(item.score) === "success"
                      ? "text-success"
                      : getScoreVariant(item.score) === "warning"
                        ? "text-warning"
                        : "text-destructive"
                  )}
                >
                  {item.score}
                </p>
                <p className="text-[10px] text-muted-foreground">bobot {item.weight}%</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-2">
        <RequirePermission module="manifest" action="canEdit">
          <Button
            size="sm"
            disabled={lockState?.status === "locked" || lockState?.status === "finalized"}
            onClick={() => router.push("/admin/manifest")}
          >
            <FileText className="mr-1.5 h-4 w-4" />
            Generate Manifest
          </Button>
        </RequirePermission>
        <RequirePermission module="rooming" action="canEdit">
          <Button
            size="sm"
            variant="outline"
            disabled={lockState?.status === "locked" || lockState?.status === "finalized"}
            onClick={() => router.push("/admin/rooming")}
          >
            <Building2 className="mr-1.5 h-4 w-4" />
            Generate Rooming
          </Button>
        </RequirePermission>
        <Button size="sm" variant="outline" onClick={() => router.push(`/admin/export-center`)}>
          <FileText className="mr-1.5 h-4 w-4" />
          Export
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={lockState?.status === "locked" || lockState?.status === "finalized"}
          onClick={() => router.push("/admin/pengingat")}
        >
          <Send className="mr-1.5 h-4 w-4" />
          Kirim Reminder
        </Button>
      </div>

      {/* TABS */}
      <Tabs tabs={[
        { value: "operasional", label: "Operasional" },
        { value: "dokumen", label: "Dokumen", count: docSummary.pending },
      ]}>
        {(activeTab) => (
          <>
            {activeTab === "operasional" && (
              <>
                {/* Operational Intelligence */}
                {intel && (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-6">
                    <StatCard
                      label="Total Jamaah"
                      value={intel.totalJamaah}
                      icon={Users}
                      trend={{ value: `${kbr.terisi}/${kbr.maxSeat || 0} kuota`, positive: intel.totalJamaah > 0 }}
                    />
                    <StatCard
                      label="Belum Lunas"
                      value={intel.unpaidCount}
                      icon={CreditCard}
                      variant={intel.unpaidCount > 0 ? "warning" : "default"}
                      trend={intel.unpaidCount > 0 ? { value: "perlu tindakan", positive: false } : undefined}
                    />
                    <StatCard
                      label="Dokumen Pending"
                      value={intel.dokumenPending}
                      icon={AlertTriangle}
                      variant={intel.dokumenPending > 0 ? "warning" : "default"}
                    />
                    <StatCard
                      label="Rooming Incomplete"
                      value={intel.roomingIncomplete}
                      icon={Building2}
                      variant={intel.roomingIncomplete > 0 ? "warning" : "default"}
                    />
                    <StatCard
                      label="Manifest Incomplete"
                      value={intel.manifestIncomplete}
                      icon={FileText}
                      variant={intel.manifestIncomplete > 0 ? "warning" : "default"}
                    />
                    <StatCard
                      label="Warning"
                      value={intel.warningCount}
                      icon={AlertTriangle}
                      variant={intel.warningCount > 0 ? "danger" : "default"}
                    />
                  </div>
                )}

                {/* Finalization Check */}
                {finalization && (
                  <Card>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                          <ShieldCheck className="inline h-4 w-4 mr-1.5" />
                          Finalisasi Paket
                        </CardTitle>
                        <RequirePermission module="keberangkatan" action="canEdit">
                          <Button
                            size="sm"
                            disabled={
                              !finalization.canFinalize ||
                              lockState?.status === "locked" ||
                              lockState?.status === "finalized"
                            }
                            title={
                              lockState?.status === "finalized"
                                ? "Paket sudah difinalisasi"
                                : lockState?.status === "locked"
                                  ? "Paket terkunci — hubungi super admin"
                                  : finalization.canFinalize
                                    ? "Finalkan paket ini"
                                    : "Selesaikan semua checklist blocking terlebih dahulu"
                            }
                          >
                            <Lock className="mr-1.5 h-3.5 w-3.5" />
                            Finalkan Paket
                          </Button>
                        </RequirePermission>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                        {finalization.checks.map((check) => (
                          <div
                            key={check.key}
                            className={cn(
                              "flex items-start gap-2.5 p-3 rounded-md border text-sm",
                              check.passed
                                ? "border-success/20 bg-success/5"
                                : check.blocking
                                  ? "border-destructive/20 bg-destructive/5"
                                  : "border-warning/20 bg-warning/5"
                            )}
                          >
                            {check.passed ? (
                              <CheckCircle2 className="h-4 w-4 text-success shrink-0 mt-px" />
                            ) : check.blocking ? (
                              <XCircle className="h-4 w-4 text-destructive shrink-0 mt-px" />
                            ) : (
                              <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-px" />
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium">{check.label}</p>
                              {check.detail && (
                                <p className="text-xs text-muted-foreground mt-0.5">{check.detail}</p>
                              )}
                              {check.blocking && !check.passed && (
                                <span className="inline-flex items-center rounded-full bg-destructive/10 px-1.5 py-0.5 text-[9px] font-semibold text-destructive mt-1">
                                  BLOCKING
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                      {finalization.canFinalize && (
                        <div className="flex items-center gap-2 mt-4 p-3 rounded-md bg-success/5 border border-success/20">
                          <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                          <p className="text-sm text-success font-medium">
                            Semua checklist terpenuhi — paket siap difinalisasi
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                  {/* Warnings */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                        Peringatan Operasional
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {warnings.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-4 text-center">
                          Tidak ada peringatan untuk paket ini
                        </p>
                      ) : (
                        warnings.map((w) => (
                          <a
                            key={w.id}
                            href={w.link}
                            className={cn(
                              "flex items-start gap-3 p-3 rounded-md border transition-colors hover:bg-muted/50",
                              w.tipe === "danger"
                                ? "border-destructive/30 bg-destructive/5"
                                : w.tipe === "warning"
                                  ? "border-warning/30 bg-warning/5"
                                  : "border-info/30 bg-info/5"
                            )}
                          >
                            <AlertTriangle
                              className={cn(
                                "h-4 w-4 mt-px shrink-0",
                                w.tipe === "danger"
                                  ? "text-destructive"
                                  : w.tipe === "warning"
                                    ? "text-warning"
                                    : "text-info"
                              )}
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium">{w.pesan}</p>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {w.jumlahTerdampak} jamaah terdampak · {w.module}
                              </p>
                            </div>
                            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                          </a>
                        ))
                      )}
                    </CardContent>
                  </Card>

                  {/* Timeline */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                        Timeline Operasional
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {timeline.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-4 text-center">
                          Tidak ada data timeline
                        </p>
                      ) : (
                        <div className="relative pl-6 space-y-0">
                          {timeline.map((m, idx) => {
                            const variant = getMilestoneVariant(m);
                            const isLast = idx === timeline.length - 1;
                            return (
                              <div key={m.key} className="relative pb-5 last:pb-0">
                                {!isLast && (
                                  <div className="absolute left-[-1.15rem] top-3 bottom-0 w-px bg-border" />
                                )}
                                <div
                                  className={cn(
                                    "absolute left-[-1.45rem] top-1.5 h-3 w-3 rounded-full border-2",
                                    variant === "success"
                                      ? "border-success bg-success/20"
                                      : variant === "destructive"
                                        ? "border-destructive bg-destructive/20"
                                        : variant === "warning"
                                          ? "border-warning bg-warning/20"
                                          : "border-muted-foreground bg-muted"
                                  )}
                                />
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium">{m.label}</span>
                                    {m.urgent && !m.passed && (
                                      <span className="inline-flex items-center rounded-full bg-destructive/10 px-1.5 py-0.5 text-[9px] font-bold text-destructive">
                                        URGENT
                                      </span>
                                    )}
                                    {m.passed && (
                                      <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                                    )}
                                  </div>
                                  <p className="text-xs text-muted-foreground mt-0.5">
                                    {m.tanggal}
                                    {m.type === "deadline" && " — Deadline"}
                                    {m.type === "reminder" && " — Reminder"}
                                    {m.type === "event" && " — Event"}
                                  </p>
                                  {m.description && (
                                    <p className="text-xs text-muted-foreground/70 mt-0.5">
                                      {m.description}
                                    </p>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Hotel Combinations */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                      Kombinasi Hotel
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {!kbr.hotelMekkahId && !kbr.hotelMadinahId ? (
                      <p className="text-sm text-muted-foreground py-2 text-center">Belum ada konfigurasi hotel</p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                          <span
                            className="inline-flex items-center rounded-full bg-muted px-3 py-1.5 text-sm font-medium"
                          >
                            <Building2 className="mr-1.5 h-3.5 w-3.5 text-muted-foreground" />
                            {kbr.hotelMekkahId || "-"} — {kbr.hotelMadinahId || "-"}
                          </span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            )}

            {activeTab === "dokumen" && (
              <>
                {/* Quick Summary */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                  <Card>
                    <CardContent className="pt-4 text-center">
                      <p className="text-2xl font-bold">{docSummary.total}</p>
                      <p className="text-xs text-muted-foreground">Total Jamaah</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4 text-center">
                      <p className="text-2xl font-bold text-success">{docSummary.lengkap}</p>
                      <p className="text-xs text-muted-foreground">Dokumen Lengkap</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4 text-center">
                      <p className={cn("text-2xl font-bold", docSummary.pending > 0 ? "text-destructive" : "text-success")}>
                        {docSummary.pending}
                      </p>
                      <p className="text-xs text-muted-foreground">Dokumen Pending</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4 text-center">
                      <p className={cn("text-2xl font-bold", docSummary.pasporMissing > 0 ? "text-destructive" : "text-success")}>
                        {docSummary.pasporMissing}
                      </p>
                      <p className="text-xs text-muted-foreground">Paspor Missing</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4 text-center">
                      <p className={cn("text-2xl font-bold", docSummary.vaksinMissing > 0 ? "text-destructive" : "text-success")}>
                        {docSummary.vaksinMissing}
                      </p>
                      <p className="text-xs text-muted-foreground">Vaksin Missing</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4 text-center">
                      <p className={cn("text-2xl font-bold", docSummary.ktpMissing > 0 ? "text-destructive" : "text-success")}>
                        {docSummary.ktpMissing}
                      </p>
                      <p className="text-xs text-muted-foreground">KTP Missing</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Filter */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Filter:</span>
                  <Select
                    value={docFilter}
                    onChange={(e) => setDocFilter(e.target.value as DocFilter)}
                    className="w-56"
                    options={docFilterOptions}
                  />
                </div>

                {/* Document Table */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                      <FileCheck className="inline h-4 w-4 mr-1.5" />
                      Status Dokumen per Jamaah
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {filteredDocRows.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-4 text-center">
                        {docFilter !== "semua"
                          ? "Tidak ada jamaah dengan filter ini"
                          : "Belum ada data jamaah"}
                      </p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full caption-bottom text-sm">
                          <thead>
                            <tr className="border-b">
                              <th className="h-10 px-3 text-left align-middle font-medium text-muted-foreground">
                                Jamaah
                              </th>
                              <th className="h-10 px-3 text-center align-middle font-medium text-muted-foreground">
                                Paspor
                              </th>
                              <th className="h-10 px-3 text-center align-middle font-medium text-muted-foreground">
                                Vaksin
                              </th>
                              <th className="h-10 px-3 text-center align-middle font-medium text-muted-foreground">
                                KTP
                              </th>
                              <th className="h-10 px-3 text-center align-middle font-medium text-muted-foreground">
                                Pas Foto
                              </th>
                              <th className="h-10 px-3 text-center align-middle font-medium text-muted-foreground">
                                %
                              </th>
                              <th className="h-10 px-3 text-center align-middle font-medium text-muted-foreground">
                                Aksi
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredDocRows.map((row) => (
                              <tr key={row.jamaah.id} className="border-b hover:bg-muted/50 transition-colors">
                                <td className="p-3 align-middle">
                                  <p className="text-sm font-medium">{row.jamaah.namaLengkap}</p>
                                  <p className="text-xs text-muted-foreground">{row.jamaah.nomorPeserta}</p>
                                </td>
                                <td className="p-3 align-middle text-center">
                                  {row.pasporDone ? (
                                    <span className="inline-flex items-center gap-1 text-xs font-medium text-success">
                                      <CheckCircle2 className="h-3.5 w-3.5" /> Done
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 text-xs font-medium text-destructive">
                                      <XCircle className="h-3.5 w-3.5" /> Not Yet
                                    </span>
                                  )}
                                </td>
                                <td className="p-3 align-middle text-center">
                                  {row.vaksinDone ? (
                                    <span className="inline-flex items-center gap-1 text-xs font-medium text-success">
                                      <CheckCircle2 className="h-3.5 w-3.5" /> Done
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 text-xs font-medium text-destructive">
                                      <XCircle className="h-3.5 w-3.5" /> Not Yet
                                    </span>
                                  )}
                                </td>
                                <td className="p-3 align-middle text-center">
                                  {row.ktpDone ? (
                                    <span className="inline-flex items-center gap-1 text-xs font-medium text-success">
                                      <CheckCircle2 className="h-3.5 w-3.5" /> Done
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 text-xs font-medium text-destructive">
                                      <XCircle className="h-3.5 w-3.5" /> Not Yet
                                    </span>
                                  )}
                                </td>
                                <td className="p-3 align-middle text-center">
                                  {row.pasFotoDone ? (
                                    <span className="inline-flex items-center gap-1 text-xs font-medium text-success">
                                      <CheckCircle2 className="h-3.5 w-3.5" /> Done
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 text-xs font-medium text-destructive">
                                      <XCircle className="h-3.5 w-3.5" /> Not Yet
                                    </span>
                                  )}
                                </td>
                                <td className="p-3 align-middle text-center">
                                  <span
                                    className={cn(
                                      "inline-flex items-center justify-center h-7 w-9 rounded-full text-xs font-bold",
                                      row.completeness === 100
                                        ? "bg-success/10 text-success"
                                        : row.completeness >= 50
                                          ? "bg-warning/10 text-warning"
                                          : "bg-destructive/10 text-destructive"
                                    )}
                                  >
                                    {row.completeness}
                                  </span>
                                </td>
                                <td className="p-3 align-middle text-center">
                                  {row.completeness < 100 && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-7 text-xs"
                                      onClick={() => handleKirimReminder(row)}
                                    >
                                      <Send className="mr-1 h-3 w-3" />
                                      Kirim Reminder
                                    </Button>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Reminder Modal */}
                <Modal
                  open={!!reminderTarget}
                  onClose={() => setReminderTarget(null)}
                  title="Kirim Reminder Dokumen"
                  size="default"
                >
                  {reminderTarget && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 p-3 rounded-md bg-info/5 border border-info/20">
                        <Mail className="h-4 w-4 text-info shrink-0" />
                        <div>
                          <p className="text-sm font-medium">{reminderTarget.jamaah.namaLengkap}</p>
                          <p className="text-xs text-muted-foreground">
                            {reminderTarget.jamaah.nomorPeserta} · {reminderTarget.missingLabels.length} dokumen belum lengkap
                          </p>
                        </div>
                      </div>

                      <div className="rounded-lg border p-4 bg-muted/30">
                        <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase">
                          Preview Reminder
                        </p>
                        <pre className="text-sm whitespace-pre-wrap font-sans text-foreground leading-relaxed">
                          {generateReminderText(
                            reminderTarget.jamaah,
                            reminderTarget.missingLabels,
                            kbr.paketUmroh?.namaPaket || "-"
                          )}
                        </pre>
                      </div>

                      <div className="flex gap-2 justify-end">
                        <Button variant="outline" onClick={() => setReminderTarget(null)}>
                          <X className="mr-1.5 h-4 w-4" />
                          Batal
                        </Button>
                        <Button onClick={() => setReminderTarget(null)}>
                          <Send className="mr-1.5 h-4 w-4" />
                          Kirim Reminder
                        </Button>
                      </div>
                    </div>
                  )}
                </Modal>
              </>
            )}
          </>
        )}
      </Tabs>
    </div>
  );
}
