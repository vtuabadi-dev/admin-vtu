"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Package,
  Users,
  TrendingUp,
  AlertTriangle,
  FileText,
  CheckCircle2,
  ArrowRight,
  Loader2,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/shared/components/ui/Card";
import { StatCard } from "@/shared/components/ui/StatCard";
import { Select } from "@/shared/components/ui/Select";
import { Badge } from "@/shared/components/ui/Badge";
import { Button } from "@/shared/components/ui/Button";
import {
  getKeberangkatanList,
  getJamaahList,
  getGroupList,
  getInvoiceList,
  getManifestList,
  getRoomingList,
  getPackageReadinessScore,
  getAutoWarnings,
} from "@/server/actions/api";
import type {
  Keberangkatan,
  Jamaah,
  RegistrationGroup,
  Invoice,
  Manifest,
  Rooming,
  PackageReadinessScore,
  OperationalAlert,
} from "@/shared/types";
import { cn } from "@/shared/lib/utils";
import { computeDocumentCompleteness } from "@/shared/lib/document-utils";
import Link from "next/link";

// ============================================================
// HELPERS
// ============================================================

function getScoreColor(score: number): string {
  if (score >= 80) return "text-success";
  if (score >= 50) return "text-warning";
  return "text-destructive";
}

function getScoreBg(score: number): string {
  if (score >= 80) return "bg-success";
  if (score >= 50) return "bg-warning";
  return "bg-destructive";
}

// ============================================================
// PAGE
// ============================================================

export default function OperationalAnalyticsPage() {
  const [keberangkatanList, setKeberangkatanList] = useState<Keberangkatan[]>([]);
  const [allJamaah, setAllJamaah] = useState<Jamaah[]>([]);
  const [allGroups, setAllGroups] = useState<RegistrationGroup[]>([]);
  const [allInvoices, setAllInvoices] = useState<Invoice[]>([]);
  const [allManifests, setAllManifests] = useState<Manifest[]>([]);
  const [allRoomings, setAllRoomings] = useState<Rooming[]>([]);
  const [scores, setScores] = useState<Record<string, PackageReadinessScore>>({});
  const [alerts, setAlerts] = useState<OperationalAlert[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedPackageId, setSelectedPackageId] = useState<string>("");

  // --- Load data ---
  useEffect(() => {
    async function load() {
      const [kbr, jamaah, groups, invoices, manifests, roomings] =
        await Promise.all([
          getKeberangkatanList(),
          getJamaahList(),
          getGroupList(),
          getInvoiceList(),
          getManifestList(),
          getRoomingList(),
        ]);
      setKeberangkatanList(kbr);
      setAllJamaah(jamaah);
      setAllGroups(groups);
      setAllInvoices(invoices);
      setAllManifests(manifests);
      setAllRoomings(roomings);

      // Load scores for all packages
      const scoreMap: Record<string, PackageReadinessScore> = {};
      await Promise.all(
        kbr.map(async (pkg: any) => {
          const score = await getPackageReadinessScore(pkg.id);
          if (score) scoreMap[pkg.id] = score;
        })
      );
      setScores(scoreMap);

      // Load all warnings / alerts
      const autoWarnings = await getAutoWarnings();
      setAlerts(autoWarnings);

      setLoading(false);
    }
    load();
  }, []);

  // ============================================================
  // FILTERED DATA
  // ============================================================

  const filteredPackages = useMemo(() => {
    if (!selectedPackageId) return keberangkatanList;
    return keberangkatanList.filter((k) => k.id === selectedPackageId);
  }, [selectedPackageId, keberangkatanList]);

  const filteredGroupIds = useMemo(() => {
    const pkgIdSet = new Set(filteredPackages.map((p) => p.id));
    return new Set(
      allGroups
        .filter((g) => pkgIdSet.has(g.paketKeberangkatanId))
        .map((g) => g.id)
    );
  }, [filteredPackages, allGroups]);

  const filteredJamaah = useMemo(
    () => allJamaah.filter((j) => filteredGroupIds.has(j.groupId)),
    [allJamaah, filteredGroupIds]
  );

  const filteredInvoices = useMemo(
    () => allInvoices.filter((inv) => filteredGroupIds.has(inv.groupId)),
    [allInvoices, filteredGroupIds]
  );

  const filteredAlerts = useMemo(
    () =>
      selectedPackageId
        ? alerts.filter((a) => a.link?.includes(selectedPackageId) || a.tipe === "warning" || a.tipe === "danger")
        : alerts,
    [selectedPackageId, alerts]
  );

  // ============================================================
  // COMPUTED ANALYTICS
  // ============================================================

  const stats = useMemo(() => {
    const totalPaket = filteredPackages.length;
    const totalJamaah = filteredJamaah.length;

    // Average readiness score
    let totalScore = 0;
    let scoreCount = 0;
    filteredPackages.forEach((pkg) => {
      const s = scores[pkg.id];
      if (s) {
        totalScore += s.overallScore;
        scoreCount++;
      }
    });
    const avgReadiness = scoreCount > 0 ? Math.round(totalScore / scoreCount) : 0;

    // Invoice stats
    const overdueCount = filteredInvoices.filter(
      (inv) => inv.status === "overdue"
    ).length;

    // Dokumen pending — jamaah with incomplete mandatory documents
    let dokumenPendingCount = 0;
    filteredJamaah.forEach((j) => {
      const { allMandatoryComplete } = computeDocumentCompleteness(j.dokumen);
      if (!allMandatoryComplete) dokumenPendingCount++;
    });

    // Completion rate = average score
    const completionRate = avgReadiness;

    return {
      totalPaket,
      totalJamaah,
      avgReadiness,
      overdueCount,
      dokumenPendingCount,
      completionRate,
    };
  }, [filteredPackages, filteredJamaah, filteredInvoices, scores]);

  const paymentStats = useMemo(() => {
    const total = filteredInvoices.length;
    const paid = filteredInvoices.filter((inv) => inv.status === "paid").length;
    const unpaid = filteredInvoices.filter((inv) => inv.status === "unpaid").length;
    const overdue = filteredInvoices.filter((inv) => inv.status === "overdue").length;
    const partial = filteredInvoices.filter((inv) => inv.status === "partial").length;
    const paidPct = total > 0 ? Math.round((paid / total) * 100) : 0;
    const unpaidPct = total > 0 ? Math.round((unpaid / total) * 100) : 0;
    const overduePct = total > 0 ? Math.round((overdue / total) * 100) : 0;

    return { total, paid, unpaid, overdue, partial, paidPct, unpaidPct, overduePct };
  }, [filteredInvoices]);

  // Per-package document stats
  const docStatsByPackage = useMemo(() => {
    const result: Record<
      string,
      {
        totalDokumen: number;
        completed: number;
        pending: number;
        rejected: number;
        completionPct: number;
      }
    > = {};

    filteredPackages.forEach((pkg) => {
      // Find all groups in this package
      const groupIds = new Set(
        allGroups
          .filter((g) => g.paketKeberangkatanId === pkg.id)
          .map((g) => g.id)
      );
      const pkgJamaah = allJamaah.filter((j) => groupIds.has(j.groupId));

      let totalDokumen = 0;
      let completed = 0;
      let pending = 0;
      let rejected = 0;

      pkgJamaah.forEach((j) => {
        j.dokumen.forEach((d) => {
          totalDokumen++;
          if (d.status === "lengkap" || d.status === "verified") {
            completed++;
          } else if (d.status === "rejected") {
            rejected++;
          } else {
            pending++;
          }
        });
      });

      result[pkg.id] = {
        totalDokumen,
        completed,
        pending,
        rejected,
        completionPct: totalDokumen > 0 ? Math.round((completed / totalDokumen) * 100) : 0,
      };
    });

    return result;
  }, [filteredPackages, allGroups, allJamaah]);

  // Per-package manifest & rooming stats
  const manifestRoomingStats = useMemo(() => {
    const result: Record<
      string,
      {
        manifestGenerated: boolean;
        manifestCount: number;
        draftCount: number;
        finalCount: number;
        submittedCount: number;
        roomingAssignedRooms: number;
        roomingTotalJamaah: number;
        roomingStatus: string;
      }
    > = {};

    filteredPackages.forEach((pkg) => {
      const pkgManifests = allManifests.filter(
        (m) => m.keberangkatanId === pkg.id
      );
      const pkgRoomings = allRoomings.filter(
        (r) => r.keberangkatanId === pkg.id
      );

      let assignedRooms = 0;
      pkgRoomings.forEach((r) => {
        r.kamar.forEach((k) => {
          assignedRooms += k.penghuni.length;
        });
      });

      const roomingStatus =
        pkgRoomings.length > 0
          ? pkgRoomings.some((r) => r.status === "final")
            ? "final"
            : "draft"
          : "none";

      const draftCount = pkgManifests.filter(
        (m) => m.status === "draft"
      ).length;
      const finalCount = pkgManifests.filter(
        (m) => m.status === "final"
      ).length;
      const submittedCount = pkgManifests.filter(
        (m) => m.status === "submitted"
      ).length;

      result[pkg.id] = {
        manifestGenerated: pkgManifests.length > 0,
        manifestCount: pkgManifests.length,
        draftCount,
        finalCount,
        submittedCount,
        roomingAssignedRooms: assignedRooms,
        roomingTotalJamaah: pkg.terisi,
        roomingStatus,
      };
    });

    return result;
  }, [filteredPackages, allManifests, allRoomings]);

  // ============================================================
  // LOADING STATE
  // ============================================================

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin mr-2 text-muted-foreground" />
        <p className="text-muted-foreground">Memuat data analitik...</p>
      </div>
    );
  }

  // ============================================================
  // EMPTY STATE
  // ============================================================

  const showEmptyState = selectedPackageId && !filteredPackages.length;

  return (
    <div className="p-6 space-y-6">
      {/* ======================== HEADER ======================== */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Analitik Operasional</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Ringkasan progres operasional seluruh paket
        </p>
      </div>

      {/* ======================== PACKAGE SELECTOR ======================== */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-end gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Pilih Paket Keberangkatan
              </label>
              <Select
                value={selectedPackageId}
                onChange={(e) => setSelectedPackageId(e.target.value)}
                className="w-72"
                placeholder="Semua Paket"
                options={keberangkatanList.map((k) => ({
                  value: k.id,
                  label: `${k.kode} — ${k.paketUmroh?.namaPaket}`,
                }))}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {showEmptyState ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground text-center py-8">
              Pilih paket untuk melihat analitik
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* ======================== SUMMARY STATS ======================== */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <StatCard
              label="Total Paket"
              value={stats.totalPaket}
              icon={Package}
              variant={stats.totalPaket > 0 ? "info" : "default"}
            />
            <StatCard
              label="Total Jamaah"
              value={stats.totalJamaah}
              icon={Users}
            />
            <StatCard
              label="Rata-rata Readiness"
              value={`${stats.avgReadiness}%`}
              icon={TrendingUp}
              variant={
                stats.avgReadiness >= 80
                  ? "success"
                  : stats.avgReadiness >= 50
                    ? "warning"
                    : "danger"
              }
            />
            <StatCard
              label="Invoice Overdue"
              value={stats.overdueCount}
              icon={AlertTriangle}
              variant={stats.overdueCount > 0 ? "danger" : "success"}
            />
            <StatCard
              label="Dokumen Pending"
              value={stats.dokumenPendingCount}
              icon={FileText}
              variant={stats.dokumenPendingCount > 0 ? "warning" : "success"}
            />
            <StatCard
              label="Completion Rate"
              value={`${stats.completionRate}%`}
              icon={CheckCircle2}
              variant={
                stats.completionRate >= 80
                  ? "success"
                  : stats.completionRate >= 50
                    ? "warning"
                    : "danger"
              }
            />
          </div>

          {/* ======================== READINESS SCORE SECTION ======================== */}
          <div>
            <h2 className="text-lg font-semibold mb-3">Skor Readiness Paket</h2>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {filteredPackages.map((pkg) => {
                const score = scores[pkg.id];
                if (!score) return null;

                return (
                  <Card key={pkg.id}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-base">
                            {pkg.paketUmroh?.namaPaket}
                          </CardTitle>
                          <CardDescription>{pkg.kode}</CardDescription>
                        </div>
                        <div
                          className={cn(
                            "flex items-center justify-center h-14 w-14 rounded-full text-xl font-bold",
                            getScoreColor(score.overallScore),
                            getScoreColor(score.overallScore).replace(
                              "text",
                              "bg"
                            ) + "/10"
                          )}
                        >
                          {score.overallScore}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {score.breakdown.map((item) => (
                        <div key={item.label} className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">
                              {item.label} ({item.weight}%)
                            </span>
                            <span
                              className={cn(
                                "font-semibold",
                                getScoreColor(item.score)
                              )}
                            >
                              {item.score}%
                            </span>
                          </div>
                          <div className="h-2 w-full rounded-full bg-muted">
                            <div
                              className={cn(
                                "h-full rounded-full transition-all",
                                getScoreBg(item.score)
                              )}
                              style={{
                                width: `${item.score}%`,
                                opacity: 0.8,
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                );
              })}
              {filteredPackages.length === 0 && (
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-sm text-muted-foreground text-center py-8">
                      Tidak ada data readiness
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          {/* ======================== PEMBAYARAN OVERVIEW ======================== */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Ringkasan Pembayaran</CardTitle>
              <CardDescription>
                Status invoice dari{" "}
                {selectedPackageId
                  ? `${filteredPackages.length} paket`
                  : "seluruh paket"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div className="rounded-lg border p-3 text-center">
                  <p className="text-2xl font-bold">{paymentStats.total}</p>
                  <p className="text-xs text-muted-foreground">Total Invoice</p>
                </div>
                <div className="rounded-lg border p-3 text-center bg-success/5">
                  <p className="text-2xl font-bold text-success">
                    {paymentStats.paid}
                  </p>
                  <p className="text-xs text-muted-foreground">Lunas</p>
                </div>
                <div className="rounded-lg border p-3 text-center bg-warning/5">
                  <p className="text-2xl font-bold text-warning">
                    {paymentStats.unpaid}
                  </p>
                  <p className="text-xs text-muted-foreground">Belum Bayar</p>
                </div>
                <div className="rounded-lg border p-3 text-center bg-destructive/5">
                  <p className="text-2xl font-bold text-destructive">
                    {paymentStats.overdue}
                  </p>
                  <p className="text-xs text-muted-foreground">Overdue</p>
                </div>
              </div>

              {/* Visual stacked bar */}
              {paymentStats.total > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-success" />
                      Lunas {paymentStats.paidPct}%
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-warning" />
                      Belum {paymentStats.unpaidPct}%
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-destructive" />
                      Overdue {paymentStats.overduePct}%
                    </span>
                  </div>
                  <div className="h-4 w-full rounded-full bg-muted flex overflow-hidden">
                    {paymentStats.paid > 0 && (
                      <div
                        className="h-full bg-success transition-all"
                        style={{
                          width: `${paymentStats.paidPct}%`,
                        }}
                      />
                    )}
                    {paymentStats.unpaid > 0 && (
                      <div
                        className="h-full bg-warning transition-all"
                        style={{
                          width: `${paymentStats.unpaidPct}%`,
                        }}
                      />
                    )}
                    {paymentStats.overdue > 0 && (
                      <div
                        className="h-full bg-destructive transition-all"
                        style={{
                          width: `${paymentStats.overduePct}%`,
                        }}
                      />
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* ======================== DOKUMEN COMPLETION ======================== */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Kelengkapan Dokumen</CardTitle>
              <CardDescription>
                Status dokumen per paket keberangkatan
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {filteredPackages.map((pkg) => {
                const docStat = docStatsByPackage[pkg.id];
                if (!docStat) return null;

                return (
                  <div key={pkg.id}>
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="text-sm font-medium">
                          {pkg.paketUmroh?.namaPaket}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {pkg.kode}
                        </p>
                      </div>
                      <Badge
                        variant={
                          docStat.completionPct >= 80
                            ? "success"
                            : docStat.completionPct >= 50
                              ? "warning"
                              : "destructive"
                        }
                      >
                        {docStat.completionPct}%
                      </Badge>
                    </div>
                    <div className="h-2 w-full rounded-full bg-muted mb-2">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all",
                          getScoreBg(docStat.completionPct)
                        )}
                        style={{
                          width: `${docStat.completionPct}%`,
                          opacity: 0.8,
                        }}
                      />
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>Total: {docStat.totalDokumen}</span>
                      <span className="text-success">
                        Approved: {docStat.completed}
                      </span>
                      <span className="text-warning">
                        Pending: {docStat.pending}
                      </span>
                      {docStat.rejected > 0 && (
                        <span className="text-destructive">
                          Rejected: {docStat.rejected}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
              {filteredPackages.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Tidak ada data dokumen
                </p>
              )}
            </CardContent>
          </Card>

          {/* ======================== MANIFEST & ROOMING ======================== */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Manifest & Rooming</CardTitle>
              <CardDescription>
                Status pembuatan manifest dan rooming per paket
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left font-medium text-muted-foreground py-2 pr-4">
                        Paket
                      </th>
                      <th className="text-left font-medium text-muted-foreground py-2 pr-4">
                        Manifest
                      </th>
                      <th className="text-left font-medium text-muted-foreground py-2 pr-4">
                        Status Manifest
                      </th>
                      <th className="text-left font-medium text-muted-foreground py-2">
                        Rooming
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPackages.map((pkg) => {
                      const mrStat = manifestRoomingStats[pkg.id];
                      if (!mrStat) return null;

                      return (
                        <tr key={pkg.id} className="border-b last:border-0">
                          <td className="py-3 pr-4">
                            <p className="font-medium">{pkg.paketUmroh?.namaPaket}</p>
                            <p className="text-xs text-muted-foreground">
                              {pkg.kode}
                            </p>
                          </td>
                          <td className="py-3 pr-4">
                            {mrStat.manifestGenerated ? (
                              <span className="text-success font-medium">
                                {mrStat.manifestCount} manifest
                              </span>
                            ) : (
                              <span className="text-warning font-medium">
                                Belum dibuat
                              </span>
                            )}
                          </td>
                          <td className="py-3 pr-4">
                            <div className="flex flex-wrap gap-1">
                              {mrStat.draftCount > 0 && (
                                <Badge variant="warning">
                                  {mrStat.draftCount} Draft
                                </Badge>
                              )}
                              {mrStat.finalCount > 0 && (
                                <Badge variant="success">
                                  {mrStat.finalCount} Final
                                </Badge>
                              )}
                              {mrStat.submittedCount > 0 && (
                                <Badge variant="info">
                                  {mrStat.submittedCount} Submitted
                                </Badge>
                              )}
                              {!mrStat.manifestGenerated && (
                                <span className="text-xs text-muted-foreground">
                                  -
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3">
                            {mrStat.roomingStatus !== "none" ? (
                              <div className="space-y-1">
                                <p className="font-medium">
                                  {mrStat.roomingAssignedRooms} /{" "}
                                  {mrStat.roomingTotalJamaah} kamar terisi
                                </p>
                                <Badge
                                  variant={
                                    mrStat.roomingStatus === "final"
                                      ? "success"
                                      : "warning"
                                  }
                                >
                                  {mrStat.roomingStatus === "final"
                                    ? "Final"
                                    : "Draft"}
                                </Badge>
                              </div>
                            ) : (
                              <span className="text-warning font-medium">
                                Belum dibuat
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                    {filteredPackages.length === 0 && (
                      <tr>
                        <td
                          colSpan={4}
                          className="text-center text-muted-foreground py-6"
                        >
                          Tidak ada data manifest & rooming
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* ======================== CRITICAL ALERTS ======================== */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                Peringatan & Alert Aktif
              </CardTitle>
              <CardDescription>
                {filteredAlerts.length} peringatan aktif
              </CardDescription>
            </CardHeader>
            <CardContent>
              {filteredAlerts.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Tidak ada peringatan aktif
                </p>
              ) : (
                <div className="space-y-2">
                  {filteredAlerts.map((alert) => (
                    <div
                      key={alert.id}
                      className={cn(
                        "flex items-start gap-3 rounded-lg border p-3 transition-colors",
                        alert.tipe === "danger" &&
                          "border-destructive/20 bg-destructive/5",
                        alert.tipe === "warning" &&
                          "border-warning/20 bg-warning/5",
                        alert.tipe === "info" &&
                          "border-info/20 bg-info/5"
                      )}
                    >
                      <div className="shrink-0 mt-0.5">
                        <Badge
                          variant={
                            alert.tipe === "danger"
                              ? "destructive"
                              : alert.tipe === "warning"
                                ? "warning"
                                : "info"
                          }
                          className="uppercase text-[10px]"
                        >
                          {alert.tipe === "danger"
                            ? "Bahaya"
                            : alert.tipe === "warning"
                              ? "Peringatan"
                              : "Info"}
                        </Badge>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{alert.pesan}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-muted-foreground">
                            {alert.jumlahTerdampak} terdampak
                          </span>
                          <span className="text-xs text-muted-foreground">
                            &middot; {alert.module}
                          </span>
                        </div>
                      </div>
                      {alert.link && (
                        <Link
                          href={alert.link}
                          className="shrink-0"
                        >
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs"
                          >
                            <ArrowRight className="h-3.5 w-3.5" />
                          </Button>
                        </Link>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
