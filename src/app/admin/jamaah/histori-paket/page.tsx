"use client";

import { useEffect, useState, useMemo } from "react";
import {
  History,
  Search,
  Calendar,
  Filter,
  UserPlus,
  UserMinus,
  ArrowLeftRight,
  Plane,
  Clock,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  AlertCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/Card";
import { Button } from "@/shared/components/ui/Button";
import { Input } from "@/shared/components/ui/Input";
import { Badge } from "@/shared/components/ui/Badge";
import { formatDate } from "@/shared/lib/utils";
import type { PackageHistoryItem } from "@/app/api/admin/jamaah/histori-paket/route";

export default function HistoriPaketPage() {
  const [items, setItems] = useState<PackageHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter States
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [actionType, setActionType] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [expandedPackageIds, setExpandedPackageIds] = useState<Record<string, boolean>>({});

  const fetchHistory = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);
      if (actionType !== "ALL") params.set("actionType", actionType);
      if (searchQuery) params.set("search", searchQuery);

      const res = await fetch(`/api/admin/jamaah/histori-paket?${params.toString()}`);
      const json = await res.json();

      if (!json.success) {
        throw new Error(json.message);
      }

      setItems(json.data);

      // Expand all cards by default
      const initialExpanded: Record<string, boolean> = {};
      json.data.forEach((item: PackageHistoryItem) => {
        initialExpanded[item.paketId] = true;
      });
      setExpandedPackageIds(initialExpanded);
    } catch (err: any) {
      setError(err.message || "Gagal memuat histori paket jamaah.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [startDate, endDate, actionType]);

  const handleResetFilters = () => {
    setStartDate("");
    setEndDate("");
    setActionType("ALL");
    setSearchQuery("");
  };

  // Quick Date Preset Handlers
  const handleDatePreset = (preset: "today" | "7days" | "30days" | "thisMonth" | "all") => {
    const now = new Date();
    const todayParts = now.toISOString().split("T");
    const todayStr = todayParts[0] || "";

    if (preset === "today") {
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (preset === "7days") {
      const past7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const past7Parts = past7.toISOString().split("T");
      setStartDate(past7Parts[0] || "");
      setEndDate(todayStr);
    } else if (preset === "30days") {
      const past30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const past30Parts = past30.toISOString().split("T");
      setStartDate(past30Parts[0] || "");
      setEndDate(todayStr);
    } else if (preset === "thisMonth") {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      const firstDayParts = firstDay.toISOString().split("T");
      setStartDate(firstDayParts[0] || "");
      setEndDate(todayStr);
    } else if (preset === "all") {
      setStartDate("");
      setEndDate("");
    }
  };

  const toggleExpand = (paketId: string) => {
    setExpandedPackageIds((prev) => ({
      ...prev,
      [paketId]: !prev[paketId],
    }));
  };

  // Aggregate KPI Totals
  const totalMasukBaru = useMemo(
    () => items.reduce((sum, item) => sum + item.summary.masukBaru, 0),
    [items]
  );
  const totalCancel = useMemo(
    () => items.reduce((sum, item) => sum + item.summary.cancel, 0),
    [items]
  );
  const totalPindahPaket = useMemo(
    () => items.reduce((sum, item) => sum + item.summary.pindahPaket, 0),
    [items]
  );

  return (
    <div className="space-y-6">
      {/* Top Title Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <History className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
            Histori Paket &amp; Pergerakan Jamaah
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Daftar paket yang memiliki riwayat pergerakan jamaah (Masuk Baru, Pembatalan/Cancel, Pindah Paket). Paket tanpa aktivitas transaksi tidak ditampilkan.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchHistory} disabled={loading} className="shrink-0 gap-1.5">
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <Card variant="operational" className="border-l-4 border-l-emerald-600">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-semibold">Paket Ber-Aksi</p>
              <p className="text-2xl font-bold text-foreground mt-0.5">{items.length}</p>
            </div>
            <div className="h-10 w-10 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
              <Plane className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card variant="operational" className="border-l-4 border-l-teal-500">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-semibold">Jamaah Baru Masuk</p>
              <p className="text-2xl font-bold text-teal-600 dark:text-teal-400 mt-0.5">+{totalMasukBaru}</p>
            </div>
            <div className="h-10 w-10 rounded-lg bg-teal-500/10 text-teal-600 flex items-center justify-center">
              <UserPlus className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card variant="operational" className="border-l-4 border-l-rose-500">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-semibold">Pembatalan (Cancel)</p>
              <p className="text-2xl font-bold text-rose-600 dark:text-rose-400 mt-0.5">-{totalCancel}</p>
            </div>
            <div className="h-10 w-10 rounded-lg bg-rose-500/10 text-rose-600 flex items-center justify-center">
              <UserMinus className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card variant="operational" className="border-l-4 border-l-amber-500">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-semibold">Perpindahan Paket</p>
              <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-0.5">{totalPindahPaket}</p>
            </div>
            <div className="h-10 w-10 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center">
              <ArrowLeftRight className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Control Panel */}
      <Card variant="operational">
        <CardHeader className="p-4 border-b">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <Filter className="h-4 w-4 text-emerald-600" />
            Filter Periode &amp; Jenis Pergerakan
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {/* Search Input */}
            <div className="space-y-1.5 md:col-span-2 lg:col-span-1">
              <label className="text-xs font-semibold text-muted-foreground">Cari Paket / Jamaah</label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Nama Paket / Kode / Nama Jamaah..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && fetchHistory()}
                  className="pl-9 h-9 text-xs"
                />
              </div>
            </div>

            {/* Date Range Filters */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Dari Tanggal (Start Date)</label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Sampai Tanggal (End Date)</label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            {/* Action Type Filter */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Jenis Aksi (Event Type)</label>
              <select
                value={actionType}
                onChange={(e) => setActionType(e.target.value)}
                className="w-full h-9 px-3 text-xs bg-background border rounded-md focus:outline-none focus:ring-1 focus:ring-primary font-semibold"
              >
                <option value="ALL">Semua Jenis Aksi (All Actions)</option>
                <option value="MASUK_BARU">🟢 Masuk Jamaah Baru (Entry)</option>
                <option value="CANCEL">🔴 Pembatalan (Cancel / Refund)</option>
                <option value="PINDAH_PAKET">🟡 Pindah Paket (Transfer)</option>
              </select>
            </div>
          </div>

          {/* Quick Date Presets */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t text-xs">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-muted-foreground font-semibold mr-1">Preset Tanggal:</span>
              <button
                type="button"
                onClick={() => handleDatePreset("today")}
                className="px-2.5 py-1 rounded bg-muted hover:bg-muted/80 text-[11px] font-medium transition-colors cursor-pointer"
              >
                Hari Ini
              </button>
              <button
                type="button"
                onClick={() => handleDatePreset("7days")}
                className="px-2.5 py-1 rounded bg-muted hover:bg-muted/80 text-[11px] font-medium transition-colors cursor-pointer"
              >
                7 Hari Terakhir
              </button>
              <button
                type="button"
                onClick={() => handleDatePreset("30days")}
                className="px-2.5 py-1 rounded bg-muted hover:bg-muted/80 text-[11px] font-medium transition-colors cursor-pointer"
              >
                30 Hari Terakhir
              </button>
              <button
                type="button"
                onClick={() => handleDatePreset("thisMonth")}
                className="px-2.5 py-1 rounded bg-muted hover:bg-muted/80 text-[11px] font-medium transition-colors cursor-pointer"
              >
                Bulan Ini
              </button>
              <button
                type="button"
                onClick={() => handleDatePreset("all")}
                className="px-2.5 py-1 rounded bg-muted hover:bg-muted/80 text-[11px] font-medium transition-colors cursor-pointer"
              >
                Semua Tanggal
              </button>
            </div>

            {(startDate || endDate || actionType !== "ALL" || searchQuery) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetFilters}
                className="h-7 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50"
              >
                Reset Filter
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Package History List Section */}
      {loading ? (
        <div className="p-12 text-center space-y-3 bg-card border rounded-xl shadow-2xs">
          <RefreshCw className="h-8 w-8 animate-spin text-emerald-600 mx-auto" />
          <p className="text-sm font-semibold text-muted-foreground">Memuat data histori paket &amp; pergerakan jamaah...</p>
        </div>
      ) : error ? (
        <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-center gap-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      ) : items.length === 0 ? (
        <Card variant="operational" className="p-12 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto text-muted-foreground">
            <History className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold">Tidak Ada Riwayat Paket Ditemukan</h3>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              Tidak ada paket yang memiliki aktivitas transaksi pergerakan jamaah pada periode/filter yang dipilih. Paket tanpa aksi tidak akan ditampilkan.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={handleResetFilters} className="mx-auto">
            Reset Filter Pencarian
          </Button>
        </Card>
      ) : (
        <div className="space-y-4">
          {items.map((item) => {
            const isExpanded = expandedPackageIds[item.paketId] ?? true;

            return (
              <Card key={item.paketId} variant="operational" className="overflow-hidden border">
                {/* Package Card Header */}
                <div
                  onClick={() => toggleExpand(item.paketId)}
                  className="p-4 bg-muted/40 hover:bg-muted/70 cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-3 border-b transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-mono text-[11px] font-bold border border-emerald-500/30">
                        {item.kodeKeberangkatan}
                      </span>
                      <h3 className="text-base font-bold text-foreground hover:text-primary transition-colors">
                        {item.namaPaket}
                      </h3>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                        Berangkat: <strong className="text-foreground">{formatDate(item.tanggalBerangkat)}</strong>
                      </span>
                      {item.maskapaiName && (
                        <span>
                          Maskapai: <strong className="text-foreground">{item.maskapaiName}</strong>
                        </span>
                      )}
                      <span>
                        Jamaah Aktif: <strong className="text-emerald-600">{item.totalJamaahAktif} Pax</strong>
                      </span>
                    </div>
                  </div>

                  {/* Summary Badges & Toggle Button */}
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="flex items-center gap-1.5">
                      {item.summary.masukBaru > 0 && (
                        <Badge variant="success" className="text-[10px] font-bold">
                          +{item.summary.masukBaru} Masuk Baru
                        </Badge>
                      )}
                      {item.summary.cancel > 0 && (
                        <Badge variant="destructive" className="text-[10px] font-bold">
                          -{item.summary.cancel} Cancel
                        </Badge>
                      )}
                      {item.summary.pindahPaket > 0 && (
                        <Badge variant="warning" className="text-[10px] font-bold">
                          {item.summary.pindahPaket} Pindah Paket
                        </Badge>
                      )}
                    </div>

                    <button
                      type="button"
                      className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                    >
                      {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {/* Package Events Timeline / Action Table */}
                {isExpanded && (
                  <div className="divide-y text-xs">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead className="bg-muted/20 text-[11px] text-muted-foreground uppercase border-b">
                          <tr>
                            <th className="px-4 py-2.5">Waktu Aksi</th>
                            <th className="px-4 py-2.5">Jenis Aksi Pergerakan</th>
                            <th className="px-4 py-2.5">Nama Jamaah</th>
                            <th className="px-4 py-2.5">Catatan / Detail Operasional</th>
                            <th className="px-4 py-2.5 text-right">Petugas Executed</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {item.actions.map((act) => (
                            <tr key={act.id} className="hover:bg-muted/20 transition-colors">
                              <td className="px-4 py-3 whitespace-nowrap text-muted-foreground font-mono text-[11px]">
                                <div className="flex items-center gap-1">
                                  <Clock className="w-3 h-3 text-muted-foreground" />
                                  <span>{formatDate(act.timestamp)}</span>
                                </div>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                {act.actionType === "MASUK_BARU" && (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-teal-500/10 text-teal-700 dark:text-teal-300 border border-teal-500/30">
                                    <UserPlus className="w-3 h-3" />
                                    Masuk Jamaah Baru
                                  </span>
                                )}
                                {act.actionType === "CANCEL" && (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/30">
                                    <UserMinus className="w-3 h-3" />
                                    Keluar (Pembatalan / Cancel)
                                  </span>
                                )}
                                {act.actionType === "PINDAH_PAKET_KELUAR" && (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                                    <ArrowLeftRight className="w-3 h-3" />
                                    Keluar (Pindah Paket)
                                  </span>
                                )}
                                {act.actionType === "PINDAH_PAKET_MASUK" && (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/30">
                                    <ArrowLeftRight className="w-3 h-3" />
                                    Masuk (Pindah Paket)
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-3 font-bold text-foreground">
                                <div>
                                  <p>{act.namaJamaah}</p>
                                  {act.nomorPeserta && (
                                    <p className="text-[10px] font-mono text-muted-foreground font-normal">
                                      {act.nomorPeserta}
                                    </p>
                                  )}
                                </div>
                              </td>
                              <td className="px-4 py-3 text-muted-foreground leading-relaxed">
                                {act.keterangan}
                              </td>
                              <td className="px-4 py-3 text-right font-semibold text-foreground whitespace-nowrap">
                                {act.actorName}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
