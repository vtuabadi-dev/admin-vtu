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
  Table,
  StatCard,
} from "@/shared/components/ui";
import type { GroupPaymentSummary, Keberangkatan } from "@/shared/types";
import { formatCurrency } from "@/shared/lib/utils";
import { CreditCard, Banknote, Search, Filter, X } from "lucide-react";

// ============================================================
// ENRICHED ROW TYPE
// ============================================================

interface EnrichedSummary extends GroupPaymentSummary {
  namaPaket: string;
  tanggalBerangkat: string;
}

// ============================================================
// STATUS FILTER OPTIONS
// ============================================================

const statusFilterOptions = [
  { value: "semua", label: "Semua Status" },
  { value: "draft", label: "Draft" },
  { value: "dp", label: "DP" },
  { value: "cicilan", label: "Cicilan" },
  { value: "hampir_lunas", label: "Hampir Lunas" },
  { value: "lunas", label: "Lunas" },
  { value: "overdue", label: "Overdue" },
];

// ============================================================
// MAIN PAGE
// ============================================================

export default function PembayaranMonitoringPage() {
  const router = useRouter();

  // Data
  const [summaries, setSummaries] = useState<GroupPaymentSummary[]>([]);
  const [kbrList, setKbrList] = useState<Keberangkatan[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [paketFilter, setPaketFilter] = useState("semua");
  const [statusFilter, setStatusFilter] = useState("semua");

  useEffect(() => {
    async function load() {
      try {
        const [groupsRes, kbrRes] = await Promise.all([
          fetch("/api/groups"),
          fetch("/api/keberangkatan"),
        ]);
        if (groupsRes.ok) {
          const json = await groupsRes.json();
          setSummaries(json.data ?? []);
        }
        if (kbrRes.ok) {
          const json = await kbrRes.json();
          setKbrList(json.data ?? []);
        }
      } catch (err) {
        console.error("Failed to load payment data:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // Enrich summaries with paket info
  const enriched: EnrichedSummary[] = useMemo(() => {
    return summaries.map((s) => {
      const groupKbr = kbrList.find((k) =>
        k.jamaahIds.some((jid) => s.anggota.some((a) => a.id === jid))
      );
      return {
        ...s,
        namaPaket: groupKbr?.namaPaket ?? "-",
        tanggalBerangkat: groupKbr?.tanggalBerangkat ?? "",
      };
    });
  }, [summaries, kbrList]);

  // Paket filter options
  const paketOptions = useMemo(() => {
    const unique = new Map<string, string>();
    for (const k of kbrList) unique.set(k.id, k.namaPaket);
    return [
      { value: "semua", label: "Semua Paket" },
      ...Array.from(unique.entries()).map(([id, nama]) => ({ value: id, label: nama })),
    ];
  }, [kbrList]);

  // Filtered data
  const filtered = useMemo(() => {
    return enriched.filter((s) => {
      if (paketFilter !== "semua") {
        const groupKbr = kbrList.find((k) =>
          k.jamaahIds.some((jid) => s.anggota.some((a) => a.id === jid))
        );
        if (groupKbr?.id !== paketFilter) return false;
      }
      if (statusFilter !== "semua" && s.status !== statusFilter) return false;
      return true;
    });
  }, [enriched, paketFilter, statusFilter, kbrList]);

  // Stats
  const stats = useMemo(
    () => ({
      totalTagihan: filtered.reduce((sum, s) => sum + s.totalTagihan, 0),
      totalPembayaran: filtered.reduce((sum, s) => sum + s.totalPembayaran, 0),
      totalOutstanding: filtered.reduce((sum, s) => sum + s.sisaPembayaran, 0),
      totalGroup: filtered.length,
    }),
    [filtered]
  );

  // Active filter count
  const filterCount = [paketFilter !== "semua", statusFilter !== "semua"].filter(Boolean).length;

  // Reset filters
  const handleResetFilters = useCallback(() => {
    setPaketFilter("semua");
    setStatusFilter("semua");
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Memuat data pembayaran...</p>
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
            Pantau status pembayaran seluruh grup. Gunakan filter paket dan status untuk quick monitoring.
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-wrap items-end gap-3">
            {/* Paket Filter */}
            <div className="w-52">
              <Select
                label="Paket Umroh"
                options={paketOptions}
                value={paketFilter}
                onChange={(e) => setPaketFilter(e.target.value)}
              />
            </div>

            {/* Status Filter */}
            <div className="w-44">
              <Select
                label="Status Pembayaran"
                options={statusFilterOptions}
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              />
            </div>

            {/* Reset */}
            {filterCount > 0 && (
              <Button variant="ghost" size="sm" onClick={handleResetFilters} className="h-9">
                <X className="mr-1 h-3.5 w-3.5" />
                Reset Filter
              </Button>
            )}
          </div>

          {/* Active filter indicator */}
          {filterCount > 0 && (
            <div className="flex items-center gap-2 mt-3 pt-3 border-t text-xs text-muted-foreground">
              <Filter className="h-3 w-3" />
              <span>
                {filtered.length} grup ditampilkan dari {enriched.length}
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
        <StatCard label="Jumlah Grup" value={stats.totalGroup} icon={Filter} />
      </div>

      {/* Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            Daftar Grup ({filtered.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table<EnrichedSummary>
            keyField="groupId"
            columns={[
              {
                key: "group",
                header: "Group",
                accessor: (r) => (
                  <div>
                    <p className="font-mono text-xs text-muted-foreground">{r.kodeRegistrasi}</p>
                    <p className="font-medium text-sm">{r.namaGroup}</p>
                  </div>
                ),
              },
              {
                key: "paket",
                header: "Paket",
                accessor: (r) => <span className="text-sm">{r.namaPaket}</span>,
              },
              {
                key: "total",
                header: "Total",
                accessor: (r) => <span className="font-medium tabular-nums">{formatCurrency(r.totalTagihan)}</span>,
                className: "text-right",
                headerClassName: "text-right",
              },
              {
                key: "dibayar",
                header: "Dibayar",
                accessor: (r) => (
                  <span className="font-medium tabular-nums text-success">{formatCurrency(r.totalPembayaran)}</span>
                ),
                className: "text-right",
                headerClassName: "text-right",
              },
              {
                key: "sisa",
                header: "Sisa",
                accessor: (r) => (
                  <span
                    className={`font-semibold tabular-nums ${r.sisaPembayaran > 0 ? "text-destructive" : "text-muted-foreground"}`}
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
            data={filtered}
            onRowClick={(row) => router.push(`/admin/pembayaran/${row.groupId}`)}
            emptyMessage="Tidak ada grup yang sesuai filter"
          />
        </CardContent>
      </Card>
    </div>
  );
}
