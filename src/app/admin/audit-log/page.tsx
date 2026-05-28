"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import {
  ShieldAlert,
  Download,
  Filter,
  ChevronDown,
  ChevronRight,
  Search,
  X,
  FileSpreadsheet,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/Card";
import { Button } from "@/shared/components/ui/Button";
import { Input } from "@/shared/components/ui/Input";
import { Select } from "@/shared/components/ui/Select";
import { PermissionGuard } from "@/shared/components/PermissionGuard";
import { exportCsv } from "@/shared/lib/export-utils";
import type { AuditEntry } from "@/shared/types";
import { cn } from "@/shared/lib/utils";

const MODULE_OPTIONS = [
  { value: "all", label: "Semua Module" },
  { value: "dokumen", label: "Dokumen" },
  { value: "pembayaran", label: "Pembayaran" },
  { value: "manifest", label: "Manifest" },
  { value: "rooming", label: "Rooming" },
  { value: "keberangkatan", label: "Keberangkatan" },
  { value: "jamaah", label: "Jamaah" },
  { value: "sistem", label: "Sistem" },
];

const roleLabelMap: Record<string, string> = {
  super_admin: "Super Admin",
  admin_operasional: "Admin Operasional",
  admin_pembayaran: "Admin Pembayaran",
  admin_manifest: "Admin Manifest",
  admin_dokumen: "Admin Dokumen",
  tour_leader: "Tour Leader",
  jamaah: "Jamaah",
};

export default function AuditLogPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [moduleFilter, setModuleFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (moduleFilter && moduleFilter !== "all") params.set("module", moduleFilter);
        const res = await fetch(`/api/audit?${params.toString()}`);
        if (res.ok) {
          const json = await res.json();
          setEntries(json.data ?? []);
        }
      } catch {
        setEntries([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [moduleFilter]);

  const filteredEntries = useMemo(() => {
    let result = entries;

    if (moduleFilter && moduleFilter !== "all") {
      result = result.filter((e) => e.module === moduleFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (e) =>
          e.userName.toLowerCase().includes(q) ||
          e.action.toLowerCase().includes(q) ||
          e.detail.toLowerCase().includes(q) ||
          e.module.toLowerCase().includes(q)
      );
    }

    if (dateFrom) {
      result = result.filter((e) => e.timestamp >= dateFrom);
    }
    if (dateTo) {
      result = result.filter((e) => e.timestamp <= dateTo + "T23:59:59");
    }

    return result;
  }, [entries, moduleFilter, searchQuery, dateFrom, dateTo]);

  const toggleExpand = useCallback((id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleExportCSV = useCallback(() => {
    const headers = ["Timestamp", "User", "Role", "Module", "Action", "Detail", "Before", "After"];
    const rows = filteredEntries.map((e) => [
      e.timestamp,
      e.userName,
      roleLabelMap[e.role] ?? e.role,
      e.module,
      e.action,
      e.detail,
      e.before ?? "",
      e.after ?? "",
    ]);
    exportCsv(headers, rows, `audit-log-${new Date().toISOString().slice(0, 10)}`);
  }, [filteredEntries]);

  const handleClearFilters = useCallback(() => {
    setModuleFilter("all");
    setSearchQuery("");
    setDateFrom("");
    setDateTo("");
  }, []);

  const hasActiveFilters = moduleFilter !== "all" || searchQuery || dateFrom || dateTo;

  return (
    <PermissionGuard module="audit">
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Audit Trail</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Catatan aktivitas dan perubahan data operasional
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={handleExportCSV}>
          <Download className="mr-1.5 h-4 w-4" />
          Export CSV
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Filter:</span>
            </div>
            <Select
              value={moduleFilter}
              onChange={(e) => setModuleFilter(e.target.value)}
              className="w-40"
              options={MODULE_OPTIONS}
            />
            <div className="relative w-56">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari user, aksi..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground">Dari:</span>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-36"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground">Sampai:</span>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-36"
              />
            </div>
            {hasActiveFilters && (
              <Button size="sm" variant="ghost" onClick={handleClearFilters}>
                <X className="mr-1 h-3.5 w-3.5" />
                Clear
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Audit Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            <ShieldAlert className="inline h-4 w-4 mr-1.5" />
            {filteredEntries.length} Entri Audit
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <p className="text-muted-foreground">Memuat audit trail...</p>
            </div>
          ) : filteredEntries.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 gap-2">
              <FileSpreadsheet className="h-8 w-8 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">
                {hasActiveFilters
                  ? "Tidak ada entri yang cocok dengan filter"
                  : "Belum ada entri audit"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full caption-bottom text-sm">
                <thead className="[&_tr]:border-b">
                  <tr className="border-b">
                    <th className="h-10 w-8 px-2 text-left align-middle font-medium text-muted-foreground" />
                    <th className="h-10 px-3 text-left align-middle font-medium text-muted-foreground">
                      Timestamp
                    </th>
                    <th className="h-10 px-3 text-left align-middle font-medium text-muted-foreground">
                      User
                    </th>
                    <th className="h-10 px-3 text-left align-middle font-medium text-muted-foreground">
                      Role
                    </th>
                    <th className="h-10 px-3 text-left align-middle font-medium text-muted-foreground">
                      Module
                    </th>
                    <th className="h-10 px-3 text-left align-middle font-medium text-muted-foreground">
                      Aksi
                    </th>
                    <th className="h-10 px-3 text-left align-middle font-medium text-muted-foreground">
                      Detail
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEntries.map((entry) => {
                    const isExpanded = expandedRows.has(entry.id);
                    const hasChanges = entry.before || entry.after;
                    return (
                      <>
                        <tr
                          key={entry.id}
                          className={cn(
                            "border-b transition-colors",
                            hasChanges && "cursor-pointer hover:bg-muted/50"
                          )}
                          onClick={() => hasChanges && toggleExpand(entry.id)}
                        >
                          <td className="p-3 align-middle w-8">
                            {hasChanges &&
                              (isExpanded ? (
                                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                              ) : (
                                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                              ))}
                          </td>
                          <td className="p-3 align-middle text-xs text-muted-foreground whitespace-nowrap">
                            {entry.timestamp}
                          </td>
                          <td className="p-3 align-middle text-xs font-medium">
                            {entry.userName}
                          </td>
                          <td className="p-3 align-middle text-xs text-muted-foreground">
                            {roleLabelMap[entry.role] ?? entry.role}
                          </td>
                          <td className="p-3 align-middle">
                            <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
                              {entry.module}
                            </span>
                          </td>
                          <td className="p-3 align-middle text-xs">{entry.action}</td>
                          <td className="p-3 align-middle text-xs max-w-xs truncate">
                            {entry.detail}
                          </td>
                        </tr>
                        {isExpanded && hasChanges && (
                          <tr key={`${entry.id}-expanded`} className="bg-muted/30">
                            <td colSpan={7} className="p-3">
                              <div className="grid grid-cols-2 gap-3 text-xs pl-8">
                                {entry.before && (
                                  <div>
                                    <span className="font-semibold text-destructive">
                                      Sebelum:
                                    </span>
                                    <pre className="mt-1 whitespace-pre-wrap text-muted-foreground bg-muted/50 p-2 rounded text-xs max-h-24 overflow-y-auto">
                                      {entry.before}
                                    </pre>
                                  </div>
                                )}
                                {entry.after && (
                                  <div>
                                    <span className="font-semibold text-success">
                                      Sesudah:
                                    </span>
                                    <pre className="mt-1 whitespace-pre-wrap text-muted-foreground bg-muted/50 p-2 rounded text-xs max-h-24 overflow-y-auto">
                                      {entry.after}
                                    </pre>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
    </PermissionGuard>
  );
}
