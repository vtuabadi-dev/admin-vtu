"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Calendar,
  Clock,
  ShieldAlert,
  Activity,
  Package,
  Users,
  ArrowRight,
  BarChart3,
  Search,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/Card";
import { Button } from "@/shared/components/ui/Button";
import { StatusBadge } from "@/shared/components/ui/Badge";
import {
  getKeberangkatanList,
  getAutoDeadlines,
  getActivityFeed,
  getAutoWarnings,
  getPackageReadinessScore,
  getJamaahList,
  getGroupList,
  getManifestList,
  getInvoiceList,
} from "@/services/mock/handlers";
import type {
  Keberangkatan,
  AutoDeadline,
  ActivityEvent,
  OperationalAlert,
  PackageReadinessScore,
  Jamaah,
  RegistrationGroup,
  Manifest,
  Invoice,
  GlobalSearchResult,
} from "@/shared/types";
import { cn } from "@/shared/lib/utils";
import { getDeadlineStatus } from "@/shared/lib/deadline-utils";
import { getScoreVariant } from "@/shared/lib/readiness-score";
import { globalSearch, getResultTypeLabel } from "@/shared/lib/search-utils";

interface PackageWithScore {
  kbr: Keberangkatan;
  score: PackageReadinessScore | null;
  deadlines: AutoDeadline[];
}

export default function CommandCenterPage() {
  const router = useRouter();
  const [packages, setPackages] = useState<PackageWithScore[]>([]);
  const [warnings, setWarnings] = useState<OperationalAlert[]>([]);
  const [activities, setActivities] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [deadlineFilter, setDeadlineFilter] = useState<"7" | "14" | "30">("14");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<GlobalSearchResult[]>([]);
  const [searchVisible, setSearchVisible] = useState(false);
  const [searchData, setSearchData] = useState<{
    jamaah: Jamaah[];
    groups: RegistrationGroup[];
    keberangkatan: Keberangkatan[];
    manifests: Manifest[];
    invoices: Invoice[];
  } | null>(null);

  useEffect(() => {
    async function load() {
      const [kbrList, wrn, act, allJamaah, allGroups, allManifests, allInvoices] = await Promise.all([
        getKeberangkatanList(),
        getAutoWarnings(),
        getActivityFeed(),
        getJamaahList(),
        getGroupList(),
        getManifestList(),
        getInvoiceList(),
      ]);

      setSearchData({
        jamaah: allJamaah,
        groups: allGroups,
        keberangkatan: kbrList,
        manifests: allManifests,
        invoices: allInvoices,
      });

      const pkgWithScores: PackageWithScore[] = await Promise.all(
        kbrList.map(async (kbr) => {
          const [score, deadlines] = await Promise.all([
            getPackageReadinessScore(kbr.id),
            getAutoDeadlines(kbr.id),
          ]);
          return { kbr, score: score ?? null, deadlines: deadlines ?? [] };
        })
      );

      setPackages(pkgWithScores);
      setWarnings(wrn);
      setActivities(act.slice(0, 20));
      setLoading(false);
    }
    load();
  }, []);

  // Global search handler
  const handleSearch = (value: string) => {
    setSearchQuery(value);
    if (!searchData || value.trim().length < 2) {
      setSearchResults([]);
      setSearchVisible(false);
      return;
    }
    const results = globalSearch(value, searchData);
    setSearchResults(results);
    setSearchVisible(results.length > 0);
  };

  const overdueCount = useMemo(() => {
    let count = 0;
    packages.forEach((p) => {
      p.deadlines.forEach((d) => {
        if (getDeadlineStatus(d) === "overdue") count++;
      });
    });
    return count;
  }, [packages]);

  const warningCount = useMemo(() => {
    let count = 0;
    packages.forEach((p) => {
      p.deadlines.forEach((d) => {
        if (getDeadlineStatus(d) === "warning") count++;
      });
    });
    return count + warnings.length;
  }, [packages, warnings]);

  const upcomingDeadlines = useMemo(() => {
    const now = new Date();
    const days = parseInt(deadlineFilter);
    const cutoff = new Date(now);
    cutoff.setDate(cutoff.getDate() + days);

    const all: { pkgName: string; deadline: AutoDeadline; kbrId: string }[] = [];
    packages.forEach((p) => {
      p.deadlines.forEach((d) => {
        const dd = new Date(d.deadlineDate);
        if (dd >= now && dd <= cutoff) {
          all.push({ pkgName: p.kbr.namaPaket, deadline: d, kbrId: p.kbr.id });
        }
      });
    });
    all.sort(
      (a, b) =>
        new Date(a.deadline.deadlineDate).getTime() - new Date(b.deadline.deadlineDate).getTime()
    );
    return all;
  }, [packages, deadlineFilter]);

  const criticalPackages = useMemo(() => {
    return packages.filter((p) => p.score && p.score.overallScore < 50).slice(0, 5);
  }, [packages]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Memuat Command Center...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Command Center</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Pusat kendali operasional keberangkatan umroh
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => router.push("/admin/bulk-operations")}
          >
            <Users className="mr-1.5 h-4 w-4" />
            Bulk Operations
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => router.push("/admin/audit-log")}
          >
            <ShieldAlert className="mr-1.5 h-4 w-4" />
            Audit Log
          </Button>
        </div>
      </div>

      {/* Global Search */}
      <div className="relative">
        <div className="flex items-center gap-2 rounded-lg border bg-card p-3">
          <Search className="h-5 w-5 text-muted-foreground shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Cari jamaah, paket, group, manifest, invoice..."
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          {searchQuery && (
            <button
              onClick={() => handleSearch("")}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Clear
            </button>
          )}
        </div>
        {searchVisible && searchResults.length > 0 && (
          <div className="absolute z-50 mt-1 w-full rounded-lg border bg-card shadow-lg max-h-80 overflow-y-auto">
            {searchResults.map((r, i) => (
              <button
                key={`${r.type}-${r.id}-${i}`}
                className="flex items-start gap-3 w-full px-4 py-3 text-left hover:bg-muted/50 border-b last:border-0 transition-colors"
                onClick={() => {
                  router.push(r.link);
                  setSearchVisible(false);
                  setSearchQuery("");
                }}
              >
                <span className="inline-flex items-center rounded bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground mt-0.5 shrink-0">
                  {getResultTypeLabel(r.type)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{r.title}</p>
                  <p className="text-xs text-muted-foreground truncate">{r.subtitle}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Critical Alert Bar */}
      {warnings.filter((w) => w.tipe === "danger").length > 0 && (
        <div
          className={cn(
            "flex items-center gap-3 rounded-lg border p-4",
            "border-destructive/20 bg-destructive/5"
          )}
        >
          <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-destructive">
              Critical Alerts — {warnings.filter((w) => w.tipe === "danger").length} masalah serius
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Segera lakukan tindakan untuk menghindari kegagalan keberangkatan
            </p>
          </div>
          <ArrowRight className="h-4 w-4 text-destructive shrink-0" />
        </div>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/10">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Overdue</p>
                <p className="text-2xl font-bold text-destructive">{overdueCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning/10">
                <Clock className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Perlu Perhatian</p>
                <p className="text-2xl font-bold text-warning">{warningCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10">
                <Package className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Paket Siap</p>
                <p className="text-2xl font-bold text-success">
                  {packages.filter((p) => p.score && p.score.overallScore >= 80).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-info/10">
                <Activity className="h-5 w-5 text-info" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Aktivitas Hari Ini</p>
                <p className="text-2xl font-bold text-info">{activities.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Deadline Calendar */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                <Calendar className="inline h-4 w-4 mr-1.5" />
                Deadline Calendar
              </CardTitle>
              <div className="flex gap-1">
                {(["7", "14", "30"] as const).map((d) => (
                  <Button
                    key={d}
                    size="sm"
                    variant={deadlineFilter === d ? "default" : "outline"}
                    className="text-xs h-7 px-2"
                    onClick={() => setDeadlineFilter(d)}
                  >
                    {d}h
                  </Button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {upcomingDeadlines.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                Tidak ada deadline dalam {deadlineFilter} hari ke depan
              </p>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {upcomingDeadlines.map(({ pkgName, deadline, kbrId }) => {
                  const status = getDeadlineStatus(deadline);
                  const daysLeft = Math.ceil(
                    (new Date(deadline.deadlineDate).getTime() - Date.now()) /
                      (1000 * 60 * 60 * 24)
                  );
                  return (
                    <button
                      key={deadline.id}
                      className="w-full flex items-center gap-3 p-3 rounded-md border hover:bg-muted/50 text-left transition-colors"
                      onClick={() => router.push(`/admin/keberangkatan/${kbrId}`)}
                    >
                      <div
                        className={cn(
                          "h-2.5 w-2.5 rounded-full shrink-0",
                          status === "overdue"
                            ? "bg-destructive"
                            : status === "warning"
                              ? "bg-warning"
                              : "bg-success"
                        )}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{deadline.label}</p>
                        <p className="text-xs text-muted-foreground truncate">{pkgName}</p>
                      </div>
                      <span
                        className={cn(
                          "text-xs font-semibold shrink-0",
                          status === "overdue"
                            ? "text-destructive"
                            : status === "warning"
                              ? "text-warning"
                              : "text-muted-foreground"
                        )}
                      >
                        {status === "overdue" ? "Jatuh Tempo" : `${daysLeft}h lagi`}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Critical Packages */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              <ShieldAlert className="inline h-4 w-4 mr-1.5" />
              Paket Perlu Tindakan
            </CardTitle>
          </CardHeader>
          <CardContent>
            {criticalPackages.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                Semua paket dalam kondisi baik
              </p>
            ) : (
              <div className="space-y-3">
                {criticalPackages.map(({ kbr, score }) => {
                  const variant = score ? getScoreVariant(score.overallScore) : "destructive";
                  return (
                    <button
                      key={kbr.id}
                      className="w-full flex items-center gap-3 p-3 rounded-md border hover:bg-muted/50 text-left transition-colors"
                      onClick={() => router.push(`/admin/keberangkatan/${kbr.id}`)}
                    >
                      <div
                        className={cn(
                          "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-lg font-bold",
                          variant === "destructive"
                            ? "bg-destructive/10 text-destructive"
                            : variant === "warning"
                              ? "bg-warning/10 text-warning"
                              : "bg-success/10 text-success"
                        )}
                      >
                        {score?.overallScore ?? "?"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{kbr.namaPaket}</p>
                        <p className="text-xs text-muted-foreground">
                          {kbr.terisi}/{kbr.kuota} · {kbr.tanggalBerangkat}
                        </p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    </button>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Package Readiness Overview */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            <BarChart3 className="inline h-4 w-4 mr-1.5" />
            Skor Kesiapan Paket
          </CardTitle>
        </CardHeader>
        <CardContent>
          {packages.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              Tidak ada paket keberangkatan
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full caption-bottom text-sm">
                <thead className="[&_tr]:border-b">
                  <tr className="border-b">
                    <th className="h-10 px-3 text-left align-middle font-medium text-muted-foreground">
                      Paket
                    </th>
                    <th className="h-10 px-3 text-center align-middle font-medium text-muted-foreground">
                      Overall
                    </th>
                    <th className="h-10 px-3 text-center align-middle font-medium text-muted-foreground">
                      Bayar
                    </th>
                    <th className="h-10 px-3 text-center align-middle font-medium text-muted-foreground">
                      Dokumen
                    </th>
                    <th className="h-10 px-3 text-center align-middle font-medium text-muted-foreground">
                      Manifest
                    </th>
                    <th className="h-10 px-3 text-center align-middle font-medium text-muted-foreground">
                      Rooming
                    </th>
                    <th className="h-10 px-3 text-center align-middle font-medium text-muted-foreground">
                      Ops
                    </th>
                    <th className="h-10 px-3 text-center align-middle font-medium text-muted-foreground">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {packages.map(({ kbr, score }) => {
                    const variant = score ? getScoreVariant(score.overallScore) : "destructive";
                    return (
                      <tr
                        key={kbr.id}
                        className="border-b cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => router.push(`/admin/keberangkatan/${kbr.id}`)}
                      >
                        <td className="p-3 align-middle">
                          <p className="text-sm font-medium">{kbr.namaPaket}</p>
                          <p className="text-xs text-muted-foreground">{kbr.kode}</p>
                        </td>
                        <td className="p-3 align-middle text-center">
                          <span
                            className={cn(
                              "inline-flex items-center justify-center h-8 w-8 rounded-full text-xs font-bold",
                              variant === "success"
                                ? "bg-success/10 text-success"
                                : variant === "warning"
                                  ? "bg-warning/10 text-warning"
                                  : "bg-destructive/10 text-destructive"
                            )}
                          >
                            {score?.overallScore ?? "?"}
                          </span>
                        </td>
                        <td className="p-3 align-middle text-center text-xs">
                          {score?.paymentScore ?? "-"}
                        </td>
                        <td className="p-3 align-middle text-center text-xs">
                          {score?.documentScore ?? "-"}
                        </td>
                        <td className="p-3 align-middle text-center text-xs">
                          {score?.manifestScore ?? "-"}
                        </td>
                        <td className="p-3 align-middle text-center text-xs">
                          {score?.roomingScore ?? "-"}
                        </td>
                        <td className="p-3 align-middle text-center text-xs">
                          {score?.operationalScore ?? "-"}
                        </td>
                        <td className="p-3 align-middle text-center">
                          <StatusBadge status={kbr.status} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Activity Feed */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            <Activity className="inline h-4 w-4 mr-1.5" />
            Aktivitas Terbaru
          </CardTitle>
        </CardHeader>
        <CardContent>
          {activities.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              Tidak ada aktivitas terbaru
            </p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {activities.map((act) => (
                <div
                  key={act.id}
                  className="flex items-start gap-3 p-2.5 rounded-md border hover:bg-muted/50 transition-colors"
                >
                  <div
                    className={cn(
                      "h-2 w-2 rounded-full mt-2 shrink-0",
                      act.type === "error" || act.type === "warning"
                        ? "bg-destructive"
                        : act.type === "success"
                          ? "bg-success"
                          : "bg-info"
                    )}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">{act.message}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-muted-foreground">
                        {act.timestamp}
                      </span>
                      <span className="text-xs text-muted-foreground">·</span>
                      <span className="text-xs font-medium bg-muted px-1.5 py-px rounded">
                        {act.module}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
