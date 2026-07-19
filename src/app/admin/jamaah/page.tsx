"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, Users, FileText, AlertCircle, Plus } from "lucide-react";
import { Card, CardContent } from "@/shared/components/ui/Card";
import { StatCard } from "@/shared/components/ui/StatCard";
import { StatusBadge } from "@/shared/components/ui/Badge";
import { Button } from "@/shared/components/ui/Button";
import { Input } from "@/shared/components/ui/Input";
import { Table } from "@/shared/components/ui/Table";
import { Tabs } from "@/shared/components/ui/Tabs";
import { ErrorState } from "@/shared/components/ui/ErrorState";
import {
  getJamaahList,
  getInvoiceList,
  getGroupList,
} from "@/server/actions/api";
import type { Jamaah, Invoice, RegistrationGroup } from "@/shared/types";

export default function JamaahListPage() {
  const router = useRouter();
  const [jamaahList, setJamaahList] = useState<Jamaah[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [groups, setGroups] = useState<RegistrationGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("semua");

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [j, inv, g] = await Promise.all([
        getJamaahList(),
        getInvoiceList(),
        getGroupList(),
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
    load();
  }, [load]);

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

  const counts = useMemo(
    () => ({
      semua: jamaahList.length,
      dokumen_lengkap: jamaahList.filter(
        (j) => getStatusDokumen(j) === "lengkap"
      ).length,
      dokumen_kurang: jamaahList.filter(
        (j) => getStatusDokumen(j) !== "lengkap"
      ).length,
      lunas: jamaahList.filter(
        (j) => getStatusPembayaran(j.id) === "lunas"
      ).length,
      draft: jamaahList.filter(
        (j) => getStatusPembayaran(j.id) === "draft"
      ).length,
    }),
    [jamaahList, getStatusPembayaran]
  );

  const filteredList = useMemo(() => {
    let list = jamaahList;

    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (j) =>
          j.namaLengkap.toLowerCase().includes(q) ||
          j.nomorPeserta.toLowerCase().includes(q) ||
          j.nomorPaspor.toLowerCase().includes(q)
      );
    }

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

    return list;
  }, [jamaahList, search, activeTab, getStatusPembayaran]);

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

      {/* Search bar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Cari nama, nomor peserta, atau paspor..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
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
                    key: "nomorPeserta",
                    header: "No. Peserta",
                    accessor: (row: any) => row.nomorPeserta,
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
                onRowClick={(row: any) =>
                  router.push(`/admin/jamaah/${row.id}`)
                }
                emptyMessage="Tidak ada jamaah ditemukan"
              />
            </CardContent>
          </Card>
        )}
      </Tabs>
    </div>
  );
}
