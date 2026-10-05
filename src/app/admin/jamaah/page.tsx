"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, Users, FileText, AlertCircle, Plus } from "lucide-react";
import { Card, CardContent } from "@/shared/components/ui/Card";
import { StatCard } from "@/shared/components/ui/StatCard";
import { StatusBadge } from "@/shared/components/ui/Badge";
import { Button } from "@/shared/components/ui/Button";
import { Table } from "@/shared/components/ui/Table";
import { Tabs } from "@/shared/components/ui/Tabs";
import { ErrorState } from "@/shared/components/ui/ErrorState";
import {
  getJamaahList,
  getInvoiceList,
  getGroupList,
} from "@/server/actions/api";
import type { Jamaah, Invoice, RegistrationGroup } from "@/shared/types";
import { useOperationalStore } from "@/stores/operational-store";
import { useRealtimeListener } from "@/shared/providers/RealtimeProvider";

export default function JamaahListPage() {
  const router = useRouter();
  const storeJamaah = useOperationalStore((s) => s.jamaahList);
  const storeGroups = useOperationalStore((s) => s.groupList);
  const storeInvoices = useOperationalStore((s) => s.invoices);

  const [jamaahList, setJamaahList] = useState<Jamaah[]>(storeJamaah || []);
  const [invoices, setInvoices] = useState<Invoice[]>(storeInvoices || []);
  const [groups, setGroups] = useState<RegistrationGroup[]>(storeGroups || []);
  const [loading, setLoading] = useState(!storeJamaah || storeJamaah.length === 0);
  const [error, setError] = useState<Error | null>(null);
  const [activeTab, setActiveTab] = useState("semua");

  // --- Smart 4-Digit GRP Lookup State (Sesuai Gambar 2) ---
  const [searchYear, setSearchYear] = useState("2026");
  const [searchSeq, setSearchSeq] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");

  const currentFullCode = useMemo(() => {
    if (!searchSeq.trim()) return "";
    const clean = searchSeq.trim();
    const padded = clean.length <= 4 ? clean.padStart(4, "0") : clean.padStart(5, "0");
    return `GRP-${searchYear}-${padded}`;
  }, [searchYear, searchSeq]);

  const load = useCallback(async (showLoading = false) => {
    try {
      if (showLoading) setLoading(true);
      setError(null);
      const [j, inv, g] = await Promise.all([
        getJamaahList().catch(() => []),
        getInvoiceList().catch(() => []),
        getGroupList().catch(() => []),
      ]);
      setJamaahList(j);
      setInvoices(inv);
      setGroups(g);
    } catch (err: any) {
      setError(err instanceof Error ? err : new Error("Database Connection Error"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // If store already pre-fetched data during SplashScreen login, use it instantly
    if (storeJamaah && storeJamaah.length > 0) {
      setJamaahList(storeJamaah);
      setGroups(storeGroups);
      setInvoices(storeInvoices);
      setLoading(false);
      // Background silent re-sync
      load(false);
    } else {
      load(true);
    }
  }, [storeJamaah, storeGroups, storeInvoices, load]);

  // Realtime synchronization: auto-reload jamaah, groups, and invoice data
  useRealtimeListener(["jamaah", "registration_groups", "invoices"], () => {
    load(false);
  });

  // --- Helper: derive aggregate statuses ---

  const groupMap = useMemo(() => {
    const map = new Map<string, string>();
    groups.forEach((g) => map.set(g.id, g.namaGroup));
    return map;
  }, [groups]);

  function getStatusDokumen(j: Jamaah): string {
    const docs = j.dokumen;
    if (docs.length === 0) return "kurang";
    if (docs.every((d) => d.status === "lengkap" || d.status === "verified"))
      return "lengkap";
    if (docs.some((d) => d.status === "kurang")) return "kurang";
    if (docs.some((d) => d.status === "revisi")) return "revisi";
    if (docs.some((d) => d.status === "pending")) return "pending";
    return "kurang";
  }

  const getStatusPembayaran = useCallback(
    (jamaahId: string): string => {
      const inv = invoices.filter((i) => i.jamaahId === jamaahId);
      if (inv.length === 0) return "draft";
      if (inv.some((i) => i.status === "overdue")) return "overdue";
      if (inv.every((i) => i.status === "paid")) return "lunas";
      if (inv.some((i) => i.status === "partial")) return "cicilan";
      return "draft";
    },
    [invoices]
  );

  const stats = useMemo(() => {
    const total = jamaahList.length;
    const dokumenLengkap = jamaahList.filter(
      (j) => getStatusDokumen(j) === "lengkap"
    ).length;
    const dokumenKurang = total - dokumenLengkap;
    return { total, dokumenLengkap, dokumenKurang };
  }, [jamaahList]);

  // Sync URL search query on mount if present
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const s = params.get("search");
      if (s && s.toUpperCase().includes("GRP-")) {
        const m = s.toUpperCase().match(/GRP-(\d{4})-(\d+)/);
        if (m && m[1] && m[2]) {
          setSearchYear(m[1]);
          setSearchSeq(m[2]);
          setAppliedSearch(`GRP-${m[1]}-${m[2].padStart(4, "0")}`);
        }
      }
    }
  }, []);

  function handleCariGroup() {
    if (!searchSeq.trim()) {
      setAppliedSearch("");
      return;
    }
    const clean = searchSeq.trim();
    const padded = clean.length <= 4 ? clean.padStart(4, "0") : clean.padStart(5, "0");
    setAppliedSearch(`GRP-${searchYear}-${padded}`);
  }

  function handleResetSearch() {
    setSearchSeq("");
    setAppliedSearch("");
  }

  const baseListForCounts = useMemo(() => {
    if (!appliedSearch) return jamaahList;
    const q = appliedSearch.toUpperCase();
    const parts = q.split("-");
    let altCode = "";
    if (parts.length >= 3 && parts[1] && parts[2]) {
      const yr = parts[1];
      const rawSeq = parts[2].replace(/\D/g, "");
      const pad4 = `GRP-${yr}-${rawSeq.padStart(4, "0")}`;
      const pad5 = `GRP-${yr}-${rawSeq.padStart(5, "0")}`;
      altCode = q === pad4 ? pad5 : pad4;
    }

    return jamaahList.filter((j) => {
      const regId = (j.registrationId || "").toUpperCase();
      const g = groups.find((grp) => grp.id === j.groupId);
      const groupKode = (g?.kodeRegistrasi || "").toUpperCase();
      const pesId = (j.nomorPeserta || "").toUpperCase();

      return (
        regId.includes(q) ||
        (altCode && regId.includes(altCode)) ||
        groupKode.includes(q) ||
        (altCode && groupKode.includes(altCode)) ||
        pesId.includes(q) ||
        (altCode && pesId.includes(altCode))
      );
    });
  }, [jamaahList, appliedSearch, groups]);

  const counts = useMemo(
    () => ({
      semua: baseListForCounts.length,
      dokumen_lengkap: baseListForCounts.filter(
        (j) => getStatusDokumen(j) === "lengkap"
      ).length,
      dokumen_kurang: baseListForCounts.filter(
        (j) => getStatusDokumen(j) !== "lengkap"
      ).length,
      lunas: baseListForCounts.filter(
        (j) => getStatusPembayaran(j.id) === "lunas"
      ).length,
      draft: baseListForCounts.filter(
        (j) => getStatusPembayaran(j.id) === "draft"
      ).length,
    }),
    [baseListForCounts, getStatusPembayaran]
  );

  const filteredList = useMemo(() => {
    let list = baseListForCounts;

    switch (activeTab) {
      case "dokumen_lengkap":
        list = list.filter((j) => getStatusDokumen(j) === "lengkap");
        break;
      case "dokumen_kurang":
        list = list.filter((j) => getStatusDokumen(j) !== "lengkap");
        break;
      case "lunas":
        list = list.filter((j) => getStatusPembayaran(j.id) === "lunas");
        break;
      case "draft":
        list = list.filter((j) => getStatusPembayaran(j.id) === "draft");
        break;
    }

    return [...list].sort((a, b) => {
      const gA = groups.find((g) => g.id === a.groupId);
      const gB = groups.find((g) => g.id === b.groupId);

      const timeA = gA ? new Date(gA.updatedAt || gA.createdAt || 0).getTime() : new Date(a.createdAt).getTime();
      const timeB = gB ? new Date(gB.updatedAt || gB.createdAt || 0).getTime() : new Date(b.createdAt).getTime();

      if (timeA !== timeB) return timeA - timeB;

      const numA = parseInt((a.nomorPeserta || a.registrationId || "0").replace(/\D/g, ""), 10) || 0;
      const numB = parseInt((b.nomorPeserta || b.registrationId || "0").replace(/\D/g, ""), 10) || 0;
      if (numA !== numB) return numA - numB;

      const regA = a.registrationId || "";
      const regB = b.registrationId || "";
      if (regA !== regB) return regA.localeCompare(regB);

      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });
  }, [baseListForCounts, groups, activeTab, getStatusPembayaran]);

  // --- Loading state ---

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Memuat data jamaah...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-64 items-center justify-center">
        <ErrorState onRetry={load} message={error.message} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Data Jamaah</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Kelola data dan status jamaah umroh
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Tambah Jamaah
        </Button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Total Jamaah" value={stats.total} icon={Users} />
        <StatCard
          label="Dokumen Lengkap"
          value={stats.dokumenLengkap}
          icon={FileText}
          variant="success"
        />
        <StatCard
          label="Dokumen Kurang / Revisi"
          value={stats.dokumenKurang}
          icon={AlertCircle}
          variant={stats.dokumenKurang > 0 ? "warning" : "success"}
        />
      </div>

      {/* Group lookup: SMART 4/5-DIGIT LOOKUP CONTROL (Sesuai Gambar 2) */}
      <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-2 relative shadow-xs">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold uppercase tracking-wider text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
            <Search className="h-4 w-4 text-amber-600" />
            1. Cari &amp; Pilih Group Registrasi Jamaah (Dikunci 4 Digit)
          </label>
          <div className="flex items-center gap-2">
            {appliedSearch && (
              <span className="font-mono text-[11px] font-extrabold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 px-2 py-0.5 rounded border border-emerald-300">
                Filter Aktif: {appliedSearch}
              </span>
            )}
            {currentFullCode && !appliedSearch && (
              <span className="font-mono text-[11px] font-extrabold bg-amber-200 text-amber-900 px-2 py-0.5 rounded">
                Target: {currentFullCode}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Visual GRP Prefix */}
          <span className="px-3 py-2 bg-[#cb6806] text-white font-mono font-bold rounded-lg shrink-0 text-sm shadow-xs">
            GRP-
          </span>

          {/* Year Select Dropdown */}
          <select
            value={searchYear}
            onChange={(e) => setSearchYear(e.target.value)}
            className="px-2.5 py-2 bg-background border border-slate-300 dark:border-slate-700 font-mono font-bold rounded-lg text-sm shrink-0 cursor-pointer shadow-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
          >
            <option value="2026">2026</option>
            <option value="2025">2025</option>
            <option value="2027">2027</option>
            <option value="2028">2028</option>
          </select>

          <span className="font-mono font-bold text-amber-800 dark:text-amber-200">-</span>

          {/* 4-Digit Sequence Input */}
          <div className="relative flex-1">
            <input
              type="text"
              maxLength={7}
              placeholder="0004"
              value={searchSeq}
              onChange={(e) => {
                const raw = e.target.value;
                if (raw.toUpperCase().includes("GRP-")) {
                  const m = raw.toUpperCase().match(/GRP-(\d{4})-(\d+)/);
                  if (m && m[1] && m[2]) {
                    setSearchYear(m[1]);
                    setSearchSeq(m[2]);
                    return;
                  }
                }
                const val = raw.replace(/\D/g, "").slice(0, 7);
                setSearchSeq(val);
              }}
              onBlur={() => {
                if (searchSeq.trim()) {
                  const clean = searchSeq.trim();
                  const padded = clean.length <= 4 ? clean.padStart(4, "0") : clean.padStart(5, "0");
                  setSearchSeq(padded);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleCariGroup();
                }
              }}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 font-mono font-bold rounded-lg text-sm tracking-widest text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-amber-500 focus:outline-none shadow-xs"
            />
          </div>

          <Button
            type="button"
            onClick={handleCariGroup}
            disabled={!searchSeq.trim() && !appliedSearch}
            className="bg-[#e3a869] hover:bg-[#d69554] text-white font-bold px-5 py-2 rounded-lg shrink-0 shadow-xs cursor-pointer"
          >
            <Search className="mr-1.5 h-4 w-4" />
            Cari Group
          </Button>

          {appliedSearch && (
            <Button
              type="button"
              variant="outline"
              onClick={handleResetSearch}
              className="px-3 py-2 text-xs font-semibold shrink-0 cursor-pointer"
            >
              Reset
            </Button>
          )}
        </div>
      </div>

      {/* Filter tabs + table */}
      <Tabs
        tabs={[
          { value: "semua", label: "Semua", count: counts.semua },
          {
            value: "dokumen_lengkap",
            label: "Dokumen Lengkap",
            count: counts.dokumen_lengkap,
          },
          {
            value: "dokumen_kurang",
            label: "Dokumen Kurang",
            count: counts.dokumen_kurang,
          },
          { value: "lunas", label: "Lunas", count: counts.lunas },
          {
            value: "draft",
            label: "Draft",
            count: counts.draft,
          },
        ]}
        onTabChange={setActiveTab}
      >
        {() => (
          <Card>
            <CardContent className="p-0">
              <Table
                keyField="id"
                columns={[
                  {
                    key: "nama",
                    header: "Nama",
                    accessor: (row: any) => (
                      <span className="font-medium">{row.namaLengkap}</span>
                    ),
                  },
                  {
                    key: "registrationId",
                    header: "ID Registrasi",
                    accessor: (row: any) => (
                      <span className="font-mono text-xs font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        {row.registrationId || row.nomorPeserta}
                      </span>
                    ),
                  },
                  {
                    key: "nomorPeserta",
                    header: "No. Peserta",
                    accessor: (row: any) => (
                      <span className="font-mono text-xs text-slate-600">{row.nomorPeserta}</span>
                    ),
                  },
                  {
                    key: "paspor",
                    header: "Paspor",
                    accessor: (row: any) => row.nomorPaspor,
                  },
                  {
                    key: "group",
                    header: "Group",
                    accessor: (row: any) =>
                      groupMap.get(row.groupId) ?? row.groupId,
                  },
                  {
                    key: "statusDokumen",
                    header: "Status Dokumen",
                    accessor: (row: any) => (
                      <StatusBadge status={getStatusDokumen(row)} />
                    ),
                  },
                  {
                    key: "statusPembayaran",
                    header: "Status Pembayaran",
                    accessor: (row: any) => (
                      <StatusBadge status={getStatusPembayaran(row.id)} />
                    ),
                  },
                  {
                    key: "aksi",
                    header: "",
                    accessor: (row: any) => (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/admin/jamaah/${row.id}`);
                        }}
                      >
                        Detail
                      </Button>
                    ),
                    className: "text-right",
                  },
                ]}
                data={filteredList as any}
                emptyMessage="Tidak ada jamaah ditemukan"
              />
            </CardContent>
          </Card>
        )}
      </Tabs>
    </div>
  );
}
