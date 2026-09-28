"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  StatusBadge,
  Select,
  SearchableSelect,
  Table,
  StatCard,
  Badge,
} from "@/shared/components/ui";
import type { GroupPaymentSummary, Keberangkatan } from "@/shared/types";
import { formatCurrency, formatDate } from "@/shared/lib/utils";
import {
  CreditCard,
  Banknote,
  Search,
  Filter,
  X,
  Calendar,
  Layers,
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
  Clock,
  Table as TableIcon,
} from "lucide-react";

// ============================================================
// ENRICHED ROW TYPE
// ============================================================

interface EnrichedSummary extends GroupPaymentSummary {
  namaPaket: string;
  tanggalBerangkat: string;
}

interface PackageSummaryItem {
  paketId: string;
  namaPaket: string;
  tanggalBerangkat: string;
  monthLabel: string;
  totalGrup: number;
  grupBelumLunas: number;
  grupLunas: number;
  totalTagihan: number;
  totalDibayar: number;
  totalSisa: number;
  deadlineDate?: string;
  sisaHariDeadline?: number;
  reminderAwalDate?: string;
  sisaHariReminderAwal?: number;
}

// ============================================================
// STATUS FILTER OPTIONS
// ============================================================

const statusFilterOptions = [
  { value: "semua", label: "Semua Status Pembayaran" },
  { value: "draft", label: "Draft" },
  { value: "dp", label: "DP" },
  { value: "cicilan", label: "Cicilan" },
  { value: "hampir_lunas", label: "Hampir Lunas" },
  { value: "lunas", label: "Lunas" },
  { value: "overdue", label: "Overdue" },
];

// ============================================================
// CLIENT-SIDE IN-MEMORY CACHE FOR INSTANT 0MS NAVIGATION (SWR)
// ============================================================
let memoryCachedSummaries: GroupPaymentSummary[] | null = null;
let memoryCachedKbrList: Keberangkatan[] | null = null;

// ============================================================
// MAIN PAGE
// ============================================================

export default function PembayaranMonitoringPage() {
  const router = useRouter();

  // Data with In-Memory Stale-While-Revalidate (Instant 0ms frame-1 load)
  const [summaries, setSummaries] = useState<GroupPaymentSummary[]>(() => memoryCachedSummaries || []);
  const [kbrList, setKbrList] = useState<Keberangkatan[]>(() => memoryCachedKbrList || []);
  const [loading, setLoading] = useState(() => !memoryCachedSummaries || memoryCachedSummaries.length === 0);

  // Filters
  const [paketFilter, setPaketFilter] = useState("semua");
  const [monthFilter, setMonthFilter] = useState("semua");
  const [statusFilter, setStatusFilter] = useState("semua");

  // Global Deadline Days (Default H-40 sebelum tanggal keberangkatan)
  const [globalDeadlineDays, setGlobalDeadlineDays] = useState<number>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("vtu_global_deadline_days");
        if (saved) {
          const val = parseInt(saved, 10);
          if (!isNaN(val) && val > 0) return val;
        }
      } catch {}
    }
    return 40;
  });

  // Reminder Awal Days (Default H-45 sebelum tanggal keberangkatan / sesuai reminder tahap pertama)
  const [reminderAwalDays, setReminderAwalDays] = useState<number>(() => {
    if (typeof window !== "undefined") {
      try {
        const savedStages = localStorage.getItem("vtu_custom_reminder_stages_v2");
        if (savedStages) {
          const parsed = JSON.parse(savedStages);
          if (Array.isArray(parsed) && parsed.length > 0 && parsed[0]?.daysBefore) {
            return parsed[0].daysBefore;
          }
        }
      } catch {}
    }
    return 45;
  });

  useEffect(() => {
    let isMounted = true;

    async function load() {
      try {
        const [groupsRes, kbrRes, settingsRes] = await Promise.all([
          fetch("/api/groups"),
          fetch("/api/keberangkatan"),
          fetch("/api/admin/settings/reminder").catch(() => null),
        ]);

        if (!isMounted) return;

        if (groupsRes.ok) {
          const json = await groupsRes.json();
          const data = json.data ?? [];
          setSummaries(data);
          memoryCachedSummaries = data;
        }
        if (kbrRes.ok) {
          const json = await kbrRes.json();
          const data = json.data ?? [];
          setKbrList(data);
          memoryCachedKbrList = data;
        }
        if (settingsRes && settingsRes.ok) {
          const settingsJson = await settingsRes.json();
          if (settingsJson?.success && settingsJson?.data) {
            if (settingsJson.data.globalDeadlineDays) {
              setGlobalDeadlineDays(settingsJson.data.globalDeadlineDays);
              localStorage.setItem("vtu_global_deadline_days", String(settingsJson.data.globalDeadlineDays));
            }
            if (Array.isArray(settingsJson.data.stages) && settingsJson.data.stages.length > 0) {
              const firstStage = settingsJson.data.stages[0];
              if (firstStage?.daysBefore) {
                setReminderAwalDays(firstStage.daysBefore);
              }
            }
          }
        }
      } catch (err) {
        console.error("Failed to load payment data:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    load();

    return () => {
      isMounted = false;
    };
  }, []);

  // Enrich summaries with paket info
  const enriched: EnrichedSummary[] = useMemo(() => {
    return summaries.map((s: any) => {
      const groupKbr = kbrList.find((k: any) => {
        if (!k) return false;
        if (s.paketKeberangkatanId && k.id === s.paketKeberangkatanId) return true;
        if (Array.isArray(k.jamaahIds) && Array.isArray(s.anggota)) {
          return k.jamaahIds.some((jid: string) => s.anggota.some((a: any) => a.id === jid));
        }
        return false;
      });
      return {
        ...s,
        namaPaket: groupKbr?.namaPaket || groupKbr?.paketUmroh?.namaPaket || "-",
        tanggalBerangkat: groupKbr?.tanggalBerangkat ?? "",
      };
    });
  }, [summaries, kbrList]);

  // Paket filter options
  const paketOptions = useMemo(() => {
    const unique = new Map<string, string>();
    for (const k of kbrList) {
      unique.set(k.id, k.namaPaket || k.paketUmroh?.namaPaket || "-");
    }
    return [
      { value: "semua", label: "Semua Paket Keberangkatan" },
      ...Array.from(unique.entries()).map(([id, nama]) => ({ value: id, label: nama })),
    ];
  }, [kbrList]);

  // Month filter options (Extracted dynamically from departure dates)
  const monthOptions = useMemo(() => {
    const monthsMap = new Map<string, string>();
    for (const k of kbrList) {
      if (k.tanggalBerangkat) {
        const d = new Date(k.tanggalBerangkat);
        if (!isNaN(d.getTime())) {
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
          const label = d.toLocaleDateString("id-ID", { month: "long", year: "numeric" });
          monthsMap.set(key, label);
        }
      }
    }
    const sorted = Array.from(monthsMap.entries()).sort((a, b) => a[0].localeCompare(b[0]));
    return [
      { value: "semua", label: "Semua Bulan Keberangkatan" },
      ...sorted.map(([_, label]) => ({ value: label, label: `Bulan ${label}` })),
    ];
  }, [kbrList]);

  // Filtered individual group data
  const filteredGroups = useMemo(() => {
    return enriched.filter((s: any) => {
      // 1. Paket Filter
      if (paketFilter !== "semua") {
        const groupKbr = kbrList.find((k: any) => {
          if (!k) return false;
          if (s.paketKeberangkatanId && k.id === s.paketKeberangkatanId) return true;
          if (Array.isArray(k.jamaahIds) && Array.isArray(s.anggota)) {
            return k.jamaahIds.some((jid: string) => s.anggota.some((a: any) => a.id === jid));
          }
          return false;
        });
        if (groupKbr?.id !== paketFilter) return false;
      }

      // 2. Month Filter
      if (monthFilter !== "semua" && s.tanggalBerangkat) {
        const d = new Date(s.tanggalBerangkat);
        if (!isNaN(d.getTime())) {
          const mLabel = d.toLocaleDateString("id-ID", { month: "long", year: "numeric" });
          if (mLabel !== monthFilter) return false;
        }
      }

      // 3. Status Filter
      if (statusFilter !== "semua" && s.status !== statusFilter) return false;
      return true;
    });
  }, [enriched, paketFilter, monthFilter, statusFilter, kbrList]);

  // Aggregated Package Summaries List (For "Semua Paket" View)
  const packageSummaries: PackageSummaryItem[] = useMemo(() => {
    return kbrList
      .map((kbr) => {
        const pkgName = kbr.namaPaket || (kbr as any).paketUmroh?.namaPaket || "Paket Umroh";
        const rawDate = kbr.tanggalBerangkat ? new Date(kbr.tanggalBerangkat) : null;
        const monthLabel = rawDate && !isNaN(rawDate.getTime())
          ? rawDate.toLocaleDateString("id-ID", { month: "long", year: "numeric" })
          : "Lainnya";

        // Find groups belonging to this package
        const pkgGroups = enriched.filter((s: any) => {
          if (s.paketKeberangkatanId && s.paketKeberangkatanId === kbr.id) return true;
          if (Array.isArray(kbr.jamaahIds) && Array.isArray(s.anggota)) {
            return kbr.jamaahIds.some((jid: string) => s.anggota.some((a: any) => a.id === jid));
          }
          return false;
        });

        // Filter by status if statusFilter is set
        const activeGroups = pkgGroups.filter((g) => {
          if (statusFilter !== "semua" && g.status !== statusFilter) return false;
          return true;
        });

        const totalGrup = activeGroups.length;
        const grupBelumLunas = activeGroups.filter((g) => g.sisaPembayaran > 0).length;
        const grupLunas = activeGroups.filter((g) => g.sisaPembayaran <= 0).length;
        const totalTagihan = activeGroups.reduce((sum, g) => sum + g.totalTagihan, 0);
        const totalDibayar = activeGroups.reduce((sum, g) => sum + g.totalPembayaran, 0);
        const totalSisa = activeGroups.reduce((sum, g) => sum + g.sisaPembayaran, 0);

        let deadlineDate: string | undefined = undefined;
        let sisaHariDeadline: number | undefined = undefined;
        let reminderAwalDate: string | undefined = undefined;
        let sisaHariReminderAwal: number | undefined = undefined;

        if (kbr.tanggalBerangkat) {
          const dBerangkat = new Date(kbr.tanggalBerangkat);
          if (!isNaN(dBerangkat.getTime())) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            // 1. Official Deadline (H-40)
            const dDeadline = new Date(dBerangkat);
            dDeadline.setDate(dDeadline.getDate() - globalDeadlineDays);
            deadlineDate = dDeadline.toISOString();

            const dDeadlineZero = new Date(dDeadline);
            dDeadlineZero.setHours(0, 0, 0, 0);
            const diffMs = dDeadlineZero.getTime() - today.getTime();
            sisaHariDeadline = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

            // 2. Reminder Awal (H-45)
            const dReminder = new Date(dBerangkat);
            dReminder.setDate(dReminder.getDate() - reminderAwalDays);
            reminderAwalDate = dReminder.toISOString();

            const dReminderZero = new Date(dReminder);
            dReminderZero.setHours(0, 0, 0, 0);
            const diffReminderMs = dReminderZero.getTime() - today.getTime();
            sisaHariReminderAwal = Math.ceil(diffReminderMs / (1000 * 60 * 60 * 24));
          }
        }

        return {
          paketId: kbr.id,
          namaPaket: pkgName,
          tanggalBerangkat: kbr.tanggalBerangkat,
          monthLabel,
          totalGrup,
          grupBelumLunas,
          grupLunas,
          totalTagihan,
          totalDibayar,
          totalSisa,
          deadlineDate,
          sisaHariDeadline,
          reminderAwalDate,
          sisaHariReminderAwal,
        };
      })
      .filter((pkg) => {
        if (monthFilter !== "semua" && pkg.monthLabel !== monthFilter) return false;
        return pkg.totalGrup > 0;
      });
  }, [kbrList, enriched, statusFilter, monthFilter, globalDeadlineDays, reminderAwalDays]);

  // Overall Stats
  const stats = useMemo(
    () => ({
      totalTagihan: filteredGroups.reduce((sum, s) => sum + s.totalTagihan, 0),
      totalPembayaran: filteredGroups.reduce((sum, s) => sum + s.totalPembayaran, 0),
      totalOutstanding: filteredGroups.reduce((sum, s) => sum + s.sisaPembayaran, 0),
      totalGroup: filteredGroups.length,
    }),
    [filteredGroups]
  );

  // Active filter count
  const filterCount = [paketFilter !== "semua", monthFilter !== "semua", statusFilter !== "semua"].filter(Boolean).length;

  // Reset filters
  const handleResetFilters = useCallback(() => {
    setPaketFilter("semua");
    setMonthFilter("semua");
    setStatusFilter("semua");
  }, []);

  const selectedPackageObject = useMemo(() => {
    if (paketFilter === "semua") return null;
    return kbrList.find((k) => k.id === paketFilter) || null;
  }, [paketFilter, kbrList]);

  if (loading && summaries.length === 0) {
    return (
      <div className="space-y-6 animate-pulse">
        <div>
          <div className="h-7 w-64 bg-slate-200 dark:bg-slate-800 rounded-md" />
          <div className="h-4 w-96 bg-slate-100 dark:bg-slate-800/60 rounded-md mt-2" />
        </div>
        <div className="h-20 bg-slate-100 dark:bg-slate-800/40 rounded-xl border border-slate-200/60 dark:border-slate-800" />
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-slate-100 dark:bg-slate-800/40 rounded-xl border border-slate-200/60 dark:border-slate-800" />
          ))}
        </div>
        <div className="h-64 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center gap-2">
          <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">Memuat data monitoring pembayaran...</p>
          <p className="text-xs text-muted-foreground">Menyiapkan ringkasan jadwal paket dan pelunasan grup</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Monitoring Pembayaran</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Pantau status pembayaran per paket keberangkatan dan grup pendaftar. Gunakan filter paket, bulan keberangkatan, dan status pelunasan.
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <Card className="border-amber-500/20 shadow-xs">
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-wrap items-end gap-3">
            {/* Paket Filter */}
            <div className="w-72 sm:w-80 space-y-1">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
                Paket Umroh Keberangkatan
              </label>
              <SearchableSelect
                options={paketOptions}
                value={paketFilter}
                onChange={(val) => setPaketFilter(val || "semua")}
                placeholder="Pilih / Cari Paket Umroh..."
                size="sm"
              />
            </div>

            {/* Month Filter */}
            <div className="w-56 space-y-1">
              <Select
                label="Bulan Keberangkatan"
                options={monthOptions}
                value={monthFilter}
                onChange={(e) => setMonthFilter(e.target.value)}
              />
            </div>

            {/* Status Filter */}
            <div className="w-48 space-y-1">
              <Select
                label="Status Pembayaran"
                options={statusFilterOptions}
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              />
            </div>

            {/* Reset */}
            {filterCount > 0 && (
              <Button variant="ghost" size="sm" onClick={handleResetFilters} className="h-9 font-bold text-xs">
                <X className="mr-1 h-3.5 w-3.5" />
                Reset Filter
              </Button>
            )}
          </div>

          {/* Active filter indicator */}
          {filterCount > 0 && (
            <div className="flex items-center gap-2 mt-3 pt-3 border-t text-xs text-muted-foreground">
              <Filter className="h-3.5 w-3.5 text-amber-600" />
              <span>
                {paketFilter === "semua"
                  ? `${packageSummaries.length} paket keberangkatan (${filteredGroups.length} grup) ditampilkan`
                  : `${filteredGroups.length} grup pendaftar ditampilkan`}
                {monthFilter !== "semua" ? ` • Bulan ${monthFilter}` : ""}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <StatCard label="Total Tagihan" value={formatCurrency(stats.totalTagihan)} icon={CreditCard} variant="info" />
        <StatCard label="Total Dibayar" value={formatCurrency(stats.totalPembayaran)} icon={Banknote} variant="success" />
        <StatCard label="Total Outstanding" value={formatCurrency(stats.totalOutstanding)} icon={Search} variant="warning" />
        <StatCard
          label={paketFilter === "semua" ? "Total Paket / Grup" : "Jumlah Grup Pendaftar"}
          value={paketFilter === "semua" ? `${packageSummaries.length} Paket (${stats.totalGroup} Grup)` : stats.totalGroup}
          icon={Filter}
        />
      </div>

      {/* Dynamic Content View */}
      {paketFilter === "semua" ? (
        /* ========================================================================= */
        /* VIEW 1: SUMMARY OF PACKAGES (DAFTAR PAKET KEBERANGKATAN)                  */
        /* ========================================================================= */
        <Card className="border shadow-md">
          <CardHeader className="pb-3 border-b bg-muted/30 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
              <Layers className="h-4 w-4 text-amber-600" />
              Daftar Paket Keberangkatan &amp; Status Pelunasan Rombongan ({packageSummaries.length} Paket)
            </CardTitle>
            {monthFilter !== "semua" && (
              <Badge variant="outline" className="bg-amber-500/10 text-amber-700 dark:text-amber-300 font-bold border-amber-500/30">
                <Calendar className="w-3 h-3 mr-1" />
                Filter: Bulan {monthFilter}
              </Badge>
            )}
          </CardHeader>
          <CardContent className="p-0">
            {packageSummaries.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-sm space-y-2">
                <Filter className="h-8 w-8 mx-auto text-muted-foreground/60" />
                <p className="font-semibold">Tidak ada paket keberangkatan yang sesuai filter</p>
                <p className="text-xs">Coba ubah filter bulan atau status pembayaran di atas.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="border-b text-left font-bold text-muted-foreground uppercase tracking-wider bg-muted/40">
                      <th className="py-3 px-3 w-10">No</th>
                      <th className="py-3 px-3">Paket Keberangkatan &amp; Jadwal</th>
                      <th className="py-3 px-3 text-center">Grup Pendaftar</th>
                      <th className="py-3 px-3 text-center">Status Pelunasan Grup</th>
                      <th className="py-3 px-3 text-center">Reminder Awal</th>
                      <th className="py-3 px-3 text-center">Deadline Pelunasan</th>
                      <th className="py-3 px-3 text-center min-w-[200px]">Sisa Pembayaran</th>
                      <th className="py-3 px-3 text-center">Aksi Detail</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {packageSummaries.map((pkg, idx) => {
                      const percent = pkg.totalTagihan > 0
                        ? Math.min(100, Math.max(0, Math.round((pkg.totalDibayar / pkg.totalTagihan) * 100)))
                        : 100;

                      return (
                        <tr
                          key={pkg.paketId}
                          className="hover:bg-muted/40 transition-colors cursor-pointer"
                          onClick={() => setPaketFilter(pkg.paketId)}
                        >
                          <td className="py-3.5 px-4 font-mono text-muted-foreground">{idx + 1}</td>
                          <td className="py-3.5 px-4">
                            <p className="font-bold text-sm text-foreground hover:text-amber-600 transition-colors">
                              {pkg.namaPaket}
                            </p>
                            <p className="text-[11px] text-muted-foreground flex items-center gap-1.5 pt-0.5 font-medium">
                              <Calendar className="w-3 h-3 text-amber-500" />
                              <span>Berangkat: <strong>{formatDate(pkg.tanggalBerangkat)}</strong></span>
                            </p>
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <span className="inline-flex items-center px-2.5 py-1 rounded-md font-extrabold bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20 text-xs">
                              {pkg.totalGrup} Group Pendaftar
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5 flex-wrap">
                              {pkg.grupBelumLunas > 0 ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                                  <AlertCircle className="w-3 h-3 text-amber-600" />
                                  {pkg.grupBelumLunas} Grup Belum Lunas
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                  100% Lunas
                                </span>
                              )}
                              {pkg.grupLunas > 0 && pkg.grupBelumLunas > 0 && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600">
                                  ({pkg.grupLunas} Lunas)
                                </span>
                              )}
                            </div>
                          </td>
                          {/* Reminder Awal (H-45) */}
                          <td className="py-3.5 px-3 text-center">
                            {pkg.reminderAwalDate && pkg.sisaHariReminderAwal !== undefined ? (
                              <div className="flex flex-col items-center justify-center gap-1">
                                {pkg.totalSisa <= 0 ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                    <span>Lunas (Aman)</span>
                                  </span>
                                ) : pkg.sisaHariReminderAwal < 0 ? (
                                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-2xl text-[11px] font-bold bg-amber-500/15 text-amber-800 dark:text-amber-200 border border-amber-500/30">
                                    <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                    <span className="flex flex-col text-center leading-tight">
                                      <span className="font-bold">Lewat Jadwal</span>
                                      <span className="text-[10px] font-black text-amber-900 dark:text-amber-100 whitespace-nowrap">
                                        ({Math.abs(pkg.sisaHariReminderAwal)} Hari)
                                      </span>
                                    </span>
                                  </span>
                                ) : pkg.sisaHariReminderAwal === 0 ? (
                                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-2xl text-[11px] font-black bg-amber-500/25 text-amber-900 dark:text-amber-100 border border-amber-500/50 animate-pulse">
                                    <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                    <span className="flex flex-col text-center leading-tight">
                                      <span className="text-xs font-black">H-0</span>
                                      <span className="text-[10px] font-bold whitespace-nowrap">Hari Ini Reminder!</span>
                                    </span>
                                  </span>
                                ) : pkg.sisaHariReminderAwal <= 7 ? (
                                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-2xl text-[11px] font-black bg-amber-500/20 text-amber-800 dark:text-amber-200 border border-amber-500/40">
                                    <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                    <span className="flex flex-col text-center leading-tight">
                                      <span className="text-xs font-black tracking-wide">H-{pkg.sisaHariReminderAwal}</span>
                                      <span className="text-[10px] font-semibold whitespace-nowrap">Menuju Reminder</span>
                                    </span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-2xl text-[11px] font-bold bg-sky-500/15 text-sky-700 dark:text-sky-300 border border-sky-500/30">
                                    <Clock className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                                    <span className="flex flex-col text-center leading-tight">
                                      <span className="text-xs font-black tracking-wide">H-{pkg.sisaHariReminderAwal}</span>
                                      <span className="text-[10px] font-semibold whitespace-nowrap">Menuju Reminder</span>
                                    </span>
                                  </span>
                                )}
                                <span className="text-[10px] text-muted-foreground font-medium flex items-center gap-1 whitespace-nowrap pt-0.5">
                                  <Calendar className="w-2.5 h-2.5 text-amber-500 shrink-0" />
                                  <span>{formatDate(pkg.reminderAwalDate)} (H-{reminderAwalDays})</span>
                                </span>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">-</span>
                            )}
                          </td>
                          {/* Deadline Pelunasan (H-40) */}
                          <td className="py-3.5 px-3 text-center">
                            {pkg.deadlineDate && pkg.sisaHariDeadline !== undefined ? (
                              <div className="flex flex-col items-center justify-center gap-1">
                                {pkg.totalSisa <= 0 ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                    <span>Lunas (Aman)</span>
                                  </span>
                                ) : pkg.sisaHariDeadline < 0 ? (
                                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-2xl text-[11px] font-bold bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30">
                                    <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                                    <span className="flex flex-col text-center leading-tight">
                                      <span className="font-bold">Lewat Deadline</span>
                                      <span className="text-[10px] font-black text-rose-800 dark:text-rose-200 whitespace-nowrap">
                                        ({Math.abs(pkg.sisaHariDeadline)} Hari)
                                      </span>
                                    </span>
                                  </span>
                                ) : pkg.sisaHariDeadline === 0 ? (
                                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-2xl text-[11px] font-black bg-rose-500/20 text-rose-800 dark:text-rose-200 border border-rose-500/40 animate-pulse">
                                    <Clock className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                                    <span className="flex flex-col text-center leading-tight">
                                      <span className="text-xs font-black">H-0</span>
                                      <span className="text-[10px] font-bold whitespace-nowrap">Hari Ini Deadline!</span>
                                    </span>
                                  </span>
                                ) : pkg.sisaHariDeadline <= 7 ? (
                                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-2xl text-[11px] font-black bg-amber-500/20 text-amber-800 dark:text-amber-200 border border-amber-500/40">
                                    <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                    <span className="flex flex-col text-center leading-tight">
                                      <span className="text-xs font-black tracking-wide">H-{pkg.sisaHariDeadline}</span>
                                      <span className="text-[10px] font-semibold whitespace-nowrap">Menuju Deadline</span>
                                    </span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-2xl text-[11px] font-bold bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/30">
                                    <Clock className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                                    <span className="flex flex-col text-center leading-tight">
                                      <span className="text-xs font-black tracking-wide">H-{pkg.sisaHariDeadline}</span>
                                      <span className="text-[10px] font-semibold whitespace-nowrap">Menuju Deadline</span>
                                    </span>
                                  </span>
                                )}
                                <span className="text-[10px] text-muted-foreground font-medium flex items-center gap-1 whitespace-nowrap pt-0.5">
                                  <Calendar className="w-2.5 h-2.5 text-amber-500 shrink-0" />
                                  <span>{formatDate(pkg.deadlineDate)} (H-{globalDeadlineDays})</span>
                                </span>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">-</span>
                            )}
                          </td>
                          {/* Sisa Pembayaran & Indikator Pil Menjadi Satu */}
                          <td className="py-3.5 px-4 text-center min-w-[220px]">
                            {pkg.totalSisa <= 0 ? (
                              <div className="space-y-1.5 w-44 sm:w-52 mx-auto">
                                <div className="text-xs font-black text-emerald-600 dark:text-emerald-400 flex items-center justify-center gap-1.5">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>Lunas</span>
                                </div>
                                <div className="w-full h-2.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 overflow-hidden shadow-2xs">
                                  <div className="w-full h-full bg-emerald-500 rounded-full" />
                                </div>
                                <div className="text-[10px] text-emerald-700 dark:text-emerald-300 font-semibold text-center">
                                  Terpenuhi 100%
                                </div>
                              </div>
                            ) : (
                              <div className="space-y-1.5 w-44 sm:w-52 mx-auto">
                                <div className="flex items-center justify-between text-xs font-bold">
                                  <span className="text-muted-foreground font-semibold">Sisa:</span>
                                  <span className="text-destructive font-black tracking-tight">
                                    {formatCurrency(pkg.totalSisa)}
                                  </span>
                                </div>
                                <div className="relative w-full h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-300/80 dark:border-slate-700 overflow-hidden shadow-inner">
                                  <div
                                    className="h-full bg-gradient-to-r from-amber-500 to-emerald-500 rounded-full transition-all duration-300"
                                    style={{ width: `${percent}%` }}
                                  />
                                </div>
                                <div className="flex items-center justify-between text-[10px] text-muted-foreground font-semibold px-0.5">
                                  <span>Terbayar {percent}%</span>
                                  <span>Target: {formatCurrency(pkg.totalTagihan)}</span>
                                </div>
                              </div>
                            )}
                          </td>
                        <td className="py-3.5 px-4 text-center">
                          <Button
                            size="sm"
                            variant="outline"
                            title="Lihat Detail Grup"
                            aria-label="Lihat Detail Grup"
                            className="h-8 w-8 p-0 rounded-lg border-amber-500/40 text-amber-700 hover:bg-amber-500 hover:text-white dark:text-amber-300 dark:hover:bg-amber-600/80 shadow-2xs transition-colors mx-auto cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation();
                              setPaketFilter(pkg.paketId);
                            }}
                          >
                            <TableIcon className="w-4 h-4" />
                          </Button>
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
      ) : (
        /* ========================================================================= */
        /* VIEW 2: INDIVIDUAL GROUPS IN SELECTED PACKAGE                             */
        /* ========================================================================= */
        <Card className="border shadow-md">
          <CardHeader className="pb-3 border-b bg-muted/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs font-bold border-emerald-600/40 text-emerald-700 hover:bg-emerald-50 dark:text-emerald-300 gap-1"
                  onClick={() => setPaketFilter("semua")}
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Kembali ke Daftar Semua Paket
                </Button>
              </div>
              <CardTitle className="text-base font-bold text-foreground flex items-center gap-2 pt-1">
                <span>Daftar Group Pendaftar Paket:</span>
                <span className="text-amber-600 dark:text-amber-400">
                  {selectedPackageObject?.namaPaket || "Detail Paket"}
                </span>
              </CardTitle>
            </div>
            <Badge variant="outline" className="font-mono text-xs self-start sm:self-center">
              {filteredGroups.length} Group Terdaftar
            </Badge>
          </CardHeader>
          <CardContent className="pt-3">
            <Table<EnrichedSummary>
              keyField="groupId"
              columns={[
                {
                  key: "group",
                  header: "Group Pendaftar",
                  accessor: (r) => (
                    <div>
                      <p className="font-mono text-xs text-muted-foreground">{r.kodeRegistrasi}</p>
                      <p className="font-bold text-sm text-foreground">{r.namaGroup}</p>
                    </div>
                  ),
                },
                {
                  key: "paket",
                  header: "Paket Umroh",
                  accessor: (r) => <span className="text-xs font-medium">{r.namaPaket}</span>,
                },
                {
                  key: "total",
                  header: "Total Tagihan",
                  accessor: (r) => <span className="font-medium tabular-nums">{formatCurrency(r.totalTagihan)}</span>,
                  className: "text-right",
                  headerClassName: "text-right",
                },
                {
                  key: "dibayar",
                  header: "Total Dibayar",
                  accessor: (r) => (
                    <span className="font-medium tabular-nums text-success">{formatCurrency(r.totalPembayaran)}</span>
                  ),
                  className: "text-right",
                  headerClassName: "text-right",
                },
                {
                  key: "sisa",
                  header: "Sisa Pembayaran",
                  accessor: (r) => (
                    <span
                      className={`font-bold tabular-nums ${r.sisaPembayaran > 0 ? "text-destructive" : "text-emerald-600"}`}
                    >
                      {formatCurrency(r.sisaPembayaran)}
                    </span>
                  ),
                  className: "text-right",
                  headerClassName: "text-right",
                },
                {
                  key: "status",
                  header: "Status",
                  accessor: (r) => <StatusBadge status={r.status} />,
                },
              ]}
              data={filteredGroups}
              onRowClick={(row) => router.push(`/admin/pembayaran/${row.groupId}`)}
              emptyMessage="Tidak ada grup yang sesuai filter"
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

