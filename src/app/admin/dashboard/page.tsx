"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/Card";
import { StatCard } from "@/shared/components/ui/StatCard";
import { StatusBadge } from "@/shared/components/ui/Badge";
import { Button } from "@/shared/components/ui/Button";
import { Table } from "@/shared/components/ui/Table";
import { Select } from "@/shared/components/ui/Select";
import { OperationalAlertPanel } from "@/shared/components/OperationalAlertPanel";
import { OperationalWarnings } from "@/shared/components/OperationalWarnings";
import {
  Users,
  UserCheck,
  Plane,
  CreditCard,
  FileCheck,
  AlertTriangle,
  BarChart3,
  Layers,
  ChevronDown,
  ChevronUp,
  Package,
} from "lucide-react";
import type {
  DashboardStats,
  OperationalAlert,
  Keberangkatan,
  PackageReadinessScore,
  PackageIntelligence,
} from "@/shared/types";
import { cn, formatCurrency } from "@/shared/lib/utils";
import { getScoreVariant } from "@/shared/lib/readiness-score";
import Link from "next/link";

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [alerts, setAlerts] = useState<OperationalAlert[]>([]);
  const [kbrList, setKbrList] = useState<Keberangkatan[]>([]);
  const [scores, setScores] = useState<Record<string, PackageReadinessScore>>({});
  const [intelMap, setIntelMap] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [mobileAlertsOpen, setMobileAlertsOpen] = useState(false);
  const [pendingReviewCount, setPendingReviewCount] = useState(0);
  const [pendingDocReviewCount, setPendingDocReviewCount] = useState(0);
  const [overdueAmount, setOverdueAmount] = useState(0);

  // ── Package filter ──────────────────────────────────────────────
  const [selectedPackageId, setSelectedPackageId] = useState<string>("all");
  const [packageIntel, setPackageIntel] = useState<PackageIntelligence | null>(null);
  const [packageAlerts, setPackageAlerts] = useState<OperationalAlert[]>([]);
  const [loadingPackage, setLoadingPackage] = useState(false);

  // ── Load global data ────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      try {
        const [statsRes, alertsRes, kbrRes, payReviewRes, docReviewRes, invRes] = await Promise.all([
          fetch("/api/dashboard/stats"),
          fetch("/api/dashboard/alerts"),
          fetch("/api/keberangkatan"),
          fetch("/api/pembayaran/review"),
          fetch("/api/dokumen/review"),
          fetch("/api/invoices"),
        ]);

        if (statsRes.ok) { const j = await statsRes.json(); setStats(j.data ?? j); }
        if (alertsRes.ok) { const j = await alertsRes.json(); setAlerts(j.data ?? []); }
        if (kbrRes.ok) { const j = await kbrRes.json(); setKbrList(j.data ?? []); }
        if (payReviewRes.ok) { const j = await payReviewRes.json(); setPendingReviewCount((j.data ?? []).length); }
        if (docReviewRes.ok) { const j = await docReviewRes.json(); setPendingDocReviewCount((j.data ?? []).length); }
        if (invRes.ok) {
          const j = await invRes.json();
          const invoices = j.data ?? [];
          const overdue = invoices
            .filter((inv: any) => inv.status === "overdue")
            .reduce((sum: number, inv: any) => sum + (inv.sisaTagihan ?? 0), 0);
          setOverdueAmount(overdue);
        }
      } catch (err) {
        console.error("Failed to load dashboard:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // ── Load per-package readiness after kbrList loads ──────────────
  useEffect(() => {
    if (kbrList.length === 0) return;
    async function loadScores() {
      const scoreMap: Record<string, PackageReadinessScore> = {};
      const intelAcc: Record<string, any> = {};
      await Promise.all(
        kbrList.map(async (pkg) => {
          try {
            const [scoreRes, intelRes] = await Promise.all([
              fetch(`/api/keberangkatan/${pkg.id}/readiness-score`),
              fetch(`/api/keberangkatan/${pkg.id}/intelligence`),
            ]);
            if (scoreRes.ok) {
              const j = await scoreRes.json();
              if (j.data) scoreMap[pkg.id] = j.data;
            }
            if (intelRes.ok) {
              const j = await intelRes.json();
              if (j.data) intelAcc[pkg.id] = j.data;
            }
          } catch { /* per-package load can fail gracefully */ }
        })
      );
      setScores(scoreMap);
      setIntelMap(intelAcc);
    }
    loadScores();
  }, [kbrList]);

  // ── Load package-specific data when filter changes ──────────────
  const loadPackageData = useCallback(async (kbrId: string) => {
    setLoadingPackage(true);
    try {
      const [intelRes] = await Promise.all([
        fetch(`/api/keberangkatan/${kbrId}/intelligence`),
      ]);
      if (intelRes.ok) {
        const j = await intelRes.json();
        setPackageIntel(j.data ?? null);
      }
      setPackageAlerts([]);
    } catch {
      setPackageAlerts([]);
    } finally {
      setLoadingPackage(false);
    }
  }, []);

  useEffect(() => {
    if (selectedPackageId !== "all") {
      loadPackageData(selectedPackageId);
    } else {
      setPackageIntel(null);
      setPackageAlerts([]);
    }
  }, [selectedPackageId, loadPackageData]);

  // ── Derive contextual data ──────────────────────────────────────
  const isFiltered = selectedPackageId !== "all";

  const displayAlerts = isFiltered
    ? packageAlerts
    : alerts;

  const selectedKbr = (() => {
    if (!isFiltered) return null;
    console.log("[DEBUG FIND kbrList]", typeof kbrList, Array.isArray(kbrList), kbrList);
    if (!Array.isArray(kbrList)) return null;
    return kbrList.find((k) => k.id === selectedPackageId) ?? null;
  })();

  const filteredKbrList = isFiltered
    ? (selectedKbr ? [selectedKbr] : [])
    : kbrList;

  // Contextual stats
  const displayStats = isFiltered && packageIntel
    ? {
        totalJamaah: packageIntel.totalJamaah,
        totalGroup: 0, // filled below from keberangkatan data
        totalBerangkat: 0,
        dokumenLengkap: packageIntel.totalJamaah - packageIntel.dokumenPending,
        dokumenKurang: packageIntel.dokumenPending,
        pembayaranLunas: packageIntel.totalJamaah - packageIntel.unpaidCount,
        pembayaranPending: packageIntel.unpaidCount,
        pembayaranOverdue: 0,
        keberangkatanMendatang: 1,
      }
    : stats;

  // ── Loading ─────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Memuat data operasional...</p>
      </div>
    );
  }

  // Guard: if stats failed to load, show fallback with retry
  if (!stats) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <AlertTriangle className="h-8 w-8 text-muted-foreground/30" />
        <p className="text-sm text-muted-foreground">Gagal memuat data dashboard.</p>
        <Button size="sm" variant="outline" onClick={() => window.location.reload()}>
          Muat Ulang
        </Button>
      </div>
    );
  }

  const pkgOptions = [
    { value: "all", label: "Semua Paket" },
    ...kbrList.map((k) => ({ value: k.id, label: k.namaPaket })),
  ];

  const criticalCount = displayAlerts.filter((a) => a.tipe === "danger").length;
  const warningCount = displayAlerts.filter((a) => a.tipe === "warning").length;
  const infoCount = displayAlerts.filter((a) => a.tipe === "info").length;

  return (
    <div className="space-y-6">
        {/* Operational warnings */}
        <OperationalWarnings />

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard Operasional</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Ringkasan operasional keberangkatan umroh
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select
            options={pkgOptions}
            value={selectedPackageId}
            onChange={(e) => setSelectedPackageId(e.target.value)}
            className="w-[220px]"
          />
          <Link href="/admin/command-center">
            <Button size="sm" variant="outline" className="shrink-0">
              Command Center
            </Button>
          </Link>
        </div>
      </div>

      {/* ── DESKTOP 2-COLUMN LAYOUT ──────────────────────────── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
        {/* ── LEFT: Main content ─────────────────────────────── */}
        <div className="space-y-6 min-w-0">
          {/* Stat Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label={isFiltered ? "Jamaah Paket" : "Total Jamaah"}
              value={loadingPackage ? "-" : displayStats?.totalJamaah ?? 0}
              icon={Users}
              trend={
                !isFiltered
                  ? { value: "3 bulan ini", positive: true }
                  : selectedKbr
                    ? { value: `${selectedKbr.terisi}/${selectedKbr.kuota} terisi`, positive: true }
                    : undefined
              }
            />
            <StatCard
              label="Group Aktif"
              value={loadingPackage ? "-" : displayStats?.totalGroup ?? (isFiltered ? "-" : stats?.totalGroup ?? 0)}
              icon={UserCheck}
            />
            <StatCard
              label="Keberangkatan"
              value={isFiltered ? 1 : stats.keberangkatanMendatang}
              icon={Plane}
              variant="info"
            />
            <StatCard
              label="Dokumen Lengkap"
              value={
                loadingPackage
                  ? "-"
                  : isFiltered && displayStats
                    ? `${displayStats.dokumenLengkap}/${displayStats.totalJamaah}`
                    : `${stats.dokumenLengkap}/${stats.totalJamaah}`
              }
              icon={FileCheck}
              variant={
                displayStats && displayStats.dokumenKurang > 0 ? "warning" : "success"
              }
            />
          </div>

          {/* Status + Quick Actions Row */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {/* Pembayaran */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                  Status Pembayaran
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loadingPackage ? (
                  <div className="space-y-3">
                    <div className="h-5 animate-pulse rounded bg-muted" />
                    <div className="h-5 animate-pulse rounded bg-muted" />
                    <div className="h-5 animate-pulse rounded bg-muted" />
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-success" />
                        Lunas
                      </span>
                      <span className="font-semibold">
                        {displayStats?.pembayaranLunas ?? "-"}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-warning" />
                        Pending
                      </span>
                      <span className="font-semibold">
                        {displayStats?.pembayaranPending ?? "-"}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-destructive" />
                        Overdue
                      </span>
                      <span className="font-semibold text-destructive">
                        {displayStats?.pembayaranOverdue ?? "0"}
                      </span>
                    </div>
                    {overdueAmount > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full bg-destructive" />
                          Nominal Overdue
                        </span>
                        <span className="font-semibold text-destructive">
                          {formatCurrency(overdueAmount)}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm">
                      <span className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-info" />
                        Menunggu Review
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{pendingReviewCount}</span>
                        {pendingReviewCount > 0 && (
                          <Link href="/admin/pembayaran/review" className="text-[10px] text-primary hover:underline">
                            Review
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Dokumen */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                  Status Dokumen
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loadingPackage ? (
                  <div className="space-y-3">
                    <div className="h-5 animate-pulse rounded bg-muted" />
                    <div className="h-5 animate-pulse rounded bg-muted" />
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-success" />
                        Lengkap
                      </span>
                      <span className="font-semibold">
                        {displayStats?.dokumenLengkap ?? "-"}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-warning" />
                        Kurang / Revisi
                      </span>
                      <span className="font-semibold">
                        {displayStats?.dokumenKurang ?? "-"}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-info" />
                        Menunggu Review
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{pendingDocReviewCount}</span>
                        {pendingDocReviewCount > 0 && (
                          <Link href="/admin/dokumen?tab=review" className="text-[10px] text-primary hover:underline">
                            Review
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Package Intelligence (when filtered) / Quick Actions (when all) */}
            {isFiltered ? (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                    Status Paket
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loadingPackage || !packageIntel ? (
                    <div className="space-y-3">
                      <div className="h-5 animate-pulse rounded bg-muted" />
                      <div className="h-5 animate-pulse rounded bg-muted" />
                      <div className="h-5 animate-pulse rounded bg-muted" />
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full bg-destructive" />
                          Manifest Blm Final
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{packageIntel.manifestIncomplete}</span>
                          {packageIntel.manifestIncomplete > 0 && (
                            <Link href="/admin/manifest" className="text-[10px] text-primary hover:underline">
                              Kelola
                            </Link>
                          )}
                        </div>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full bg-warning" />
                          Rooming Blm Final
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{packageIntel.roomingIncomplete}</span>
                          {packageIntel.roomingIncomplete > 0 && (
                            <Link href="/admin/rooming" className="text-[10px] text-primary hover:underline">
                              Kelola
                            </Link>
                          )}
                        </div>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full bg-info" />
                          Dokumen Pending
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{packageIntel.dokumenPending}</span>
                          {packageIntel.dokumenPending > 0 && (
                            <Link href="/admin/dokumen?tab=rekap" className="text-[10px] text-primary hover:underline">
                              Kelola
                            </Link>
                          )}
                        </div>
                      </div>
                      {packageIntel.unpaidCount > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full bg-destructive" />
                            Pembayaran Belum Lunas
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">{packageIntel.unpaidCount}</span>
                            <Link href="/admin/pembayaran" className="text-[10px] text-primary hover:underline">
                              Kelola
                            </Link>
                          </div>
                        </div>
                      )}
                      <div className="text-[10px] text-muted-foreground pt-1 border-t">
                        Skor Kesiapan: <span className="font-semibold">{packageIntel.warningCount > 0 ? "Perlu Perhatian" : "Baik"}</span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                    Aksi Cepat
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-1.5">
                  <Link href="/admin/manifest">
                    <Button variant="outline" size="sm" className="w-full justify-start text-sm h-8">
                      <FileCheck className="mr-2 h-3.5 w-3.5" />
                      Generate Manifest
                    </Button>
                  </Link>
                  <Link href="/admin/rooming">
                    <Button variant="outline" size="sm" className="w-full justify-start text-sm h-8">
                      <Plane className="mr-2 h-3.5 w-3.5" />
                      Atur Rooming
                    </Button>
                  </Link>
                  <Link href="/admin/pembayaran">
                    <Button variant="outline" size="sm" className="w-full justify-start text-sm h-8">
                      <CreditCard className="mr-2 h-3.5 w-3.5" />
                      Monitoring Pembayaran
                    </Button>
                  </Link>
                  <Link href="/admin/pengingat">
                    <Button variant="outline" size="sm" className="w-full justify-start text-sm h-8">
                      <AlertTriangle className="mr-2 h-3.5 w-3.5" />
                      Kirim Pengingat
                    </Button>
                  </Link>
                  <Link href="/admin/bulk-operations">
                    <Button variant="outline" size="sm" className="w-full justify-start text-sm h-8">
                      <Layers className="mr-2 h-3.5 w-3.5" />
                      Bulk Operations
                    </Button>
                  </Link>
                  <Link href="/admin/command-center">
                    <Button variant="outline" size="sm" className="w-full justify-start text-sm h-8">
                      <BarChart3 className="mr-2 h-3.5 w-3.5" />
                      Command Center
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            )}
          </div>

          {/* ── PACKAGE CONTEXT BANNER ────────────────────────── */}
          {isFiltered && selectedKbr && (
            <div className="flex items-center gap-3 rounded-xl border bg-card px-5 py-3 shadow-sm">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                <Package className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold">{selectedKbr.namaPaket}</p>
                <p className="text-xs text-muted-foreground">
                  {selectedKbr.kode} &middot;{" "}
                  {new Date(selectedKbr.tanggalBerangkat).toLocaleDateString("id-ID", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}{" "}
                  &middot; {selectedKbr.maskapai} ({selectedKbr.nomorPenerbangan})
                </p>
              </div>
              <StatusBadge status={selectedKbr.status} />
            </div>
          )}

          {/* Keberangkatan Table */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                {isFiltered ? "Detail Keberangkatan" : "Keberangkatan Mendatang"}
              </CardTitle>
              {!isFiltered && (
                <Link href="/admin/keberangkatan">
                  <Button variant="ghost" size="sm" className="text-xs">
                    Lihat Semua
                  </Button>
                </Link>
              )}
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table
                  keyField="id"
                  columns={[
                    {
                      key: "kode",
                      header: "Kode",
                      accessor: (r) => (
                        <span className="font-medium">{r.kode}</span>
                      ),
                    },
                    {
                      key: "paket",
                      header: "Nama Paket",
                      accessor: (r) => r.namaPaket,
                    },
                    {
                      key: "tanggal",
                      header: "Tgl Berangkat",
                      accessor: (r) =>
                        new Date(r.tanggalBerangkat).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        }),
                    },
                    {
                      key: "kuota",
                      header: "Terisi",
                      accessor: (r) => (
                        <span className="font-medium">
                          {r.terisi}/{r.kuota}
                        </span>
                      ),
                    },
                    {
                      key: "skor",
                      header: "Skor",
                      accessor: (r) => {
                        const score = scores[r.id];
                        if (!score) return <span className="text-xs text-muted-foreground">-</span>;
                        const variant = getScoreVariant(score.overallScore);
                        return (
                          <span
                            className={cn(
                              "inline-flex items-center justify-center h-7 w-7 rounded-full text-xs font-bold",
                              variant === "success"
                                ? "bg-success/10 text-success"
                                : variant === "warning"
                                  ? "bg-warning/10 text-warning"
                                  : "bg-destructive/10 text-destructive"
                            )}
                          >
                            {score.overallScore}
                          </span>
                        );
                      },
                    },
                    {
                      key: "intel",
                      header: "Status Intel",
                      accessor: (r) => {
                        const intel = intelMap[r.id];
                        if (!intel) return <span className="text-xs text-muted-foreground">-</span>;
                        const issues = (intel.warningCount ?? 0) + (intel.manifestIncomplete ?? 0) + (intel.roomingIncomplete ?? 0);
                        return (
                          <span className={cn(
                            "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold",
                            issues > 0 ? "bg-warning/10 text-warning" : "bg-success/10 text-success"
                          )}>
                            {issues > 0 ? `${issues} isu` : "OK"}
                          </span>
                        );
                      },
                    },
                    {
                      key: "status",
                      header: "Status",
                      accessor: (r) => <StatusBadge status={r.status} />,
                    },
                  ]}
                  data={filteredKbrList.map((k) => ({
                    id: k.id,
                    kode: k.kode,
                    namaPaket: k.namaPaket,
                    tanggalBerangkat: k.tanggalBerangkat,
                    kuota: k.kuota,
                    terisi: k.terisi,
                    status: k.status,
                  }))}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ── RIGHT: Alert panel (DESKTOP — sticky) ───────────── */}
        <div className="hidden lg:block">
          <div className="sticky top-20 max-h-[calc(100vh-6rem)]">
            <OperationalAlertPanel
              alerts={displayAlerts}
              className="max-h-[calc(100vh-6rem)]"
            />
          </div>
        </div>

        {/* ── TABLET/MOBILE: Collapsible alert section ────────── */}
        <div className="lg:hidden">
          <button
            onClick={() => setMobileAlertsOpen(!mobileAlertsOpen)}
            className="flex w-full items-center justify-between rounded-xl border bg-card px-4 py-3 shadow-sm hover:bg-muted/30 transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="h-4 w-4 text-warning" />
              <span className="text-sm font-semibold">Alert Operasional</span>
              <div className="flex gap-2 text-[11px]">
                {criticalCount > 0 && (
                  <span className="text-destructive font-semibold">{criticalCount} Kritis</span>
                )}
                {warningCount > 0 && (
                  <span className="text-warning font-semibold">{warningCount} Peringatan</span>
                )}
                <span className="text-info font-semibold">{infoCount} Info</span>
              </div>
            </div>
            {mobileAlertsOpen ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </button>

          {mobileAlertsOpen && (
            <div className="mt-3 max-h-[500px]">
              <OperationalAlertPanel
                alerts={displayAlerts}
                className="max-h-[500px]"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
