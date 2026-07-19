"use client";

import { useEffect, useState, useMemo } from "react";
import { AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/Card";
import { StatCard } from "@/shared/components/ui/StatCard";
import { StatusBadge } from "@/shared/components/ui/Badge";
import { Table } from "@/shared/components/ui/Table";
import { getAllPaymentSummaries, getKeberangkatanList } from "@/server/actions/api";
import type { GroupPaymentSummary, Keberangkatan } from "@/shared/types";
import { formatCurrency } from "@/shared/lib/utils";

interface Row {
  id: string;
  kodeRegistrasi: string;
  namaGroup: string;
  namaPaket: string;
  totalTagihan: number;
  totalPembayaran: number;
  sisaPembayaran: number;
  status: string;
}

export default function TagihanBelumLunasPage() {
  const [summaries, setSummaries] = useState<GroupPaymentSummary[]>([]);
  const [kbrList, setKbrList] = useState<Keberangkatan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [s, k] = await Promise.all([getAllPaymentSummaries(), getKeberangkatanList()]);
      setSummaries(s);
      setKbrList(k);
      setLoading(false);
    }
    load();
  }, []);

  const unpaid = useMemo(() => {
    return summaries.filter((s) => s.sisaPembayaran > 0);
  }, [summaries]);

  const rows: Row[] = useMemo(() => {
    return unpaid.map((s) => {
      const kbr = kbrList.find((k) => k.jamaahIds.some((jid) => s.anggota.some((a) => a.id === jid)));
      return {
        id: s.groupId,
        kodeRegistrasi: s.kodeRegistrasi,
        namaGroup: s.namaGroup,
        namaPaket: kbr?.paketUmroh?.namaPaket ?? "-",
        totalTagihan: s.totalTagihan,
        totalPembayaran: s.totalPembayaran,
        sisaPembayaran: s.sisaPembayaran,
        status: s.status,
      };
    });
  }, [unpaid, kbrList]);

  const stats = useMemo(() => ({
    totalOutstanding: unpaid.reduce((sum, s) => sum + s.sisaPembayaran, 0),
    totalGroup: unpaid.length,
  }), [unpaid]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-muted-foreground">Memuat data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Tagihan Belum Lunas</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Daftar grup yang masih memiliki sisa tagihan
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard label="Jumlah Grup" value={stats.totalGroup} icon={AlertCircle} variant="warning" />
        <StatCard label="Total Outstanding" value={formatCurrency(stats.totalOutstanding)} icon={AlertCircle} variant="danger" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Daftar Tagihan Belum Lunas</CardTitle>
        </CardHeader>
        <CardContent>
          <Table
            keyField="id"
            columns={[
              { key: "kode", header: "Kode Registrasi", accessor: (r) => <span className="font-mono text-xs">{r.kodeRegistrasi}</span> },
              { key: "nama", header: "Nama Group", accessor: (r) => <span className="font-medium">{r.namaGroup}</span> },
              { key: "paket", header: "Paket", accessor: (r) => <span>{r.namaPaket}</span> },
              { key: "sisa", header: "Sisa", accessor: (r) => <span className="font-semibold text-destructive">{formatCurrency(r.sisaPembayaran)}</span> },
              { key: "status", header: "Status", accessor: (r) => <StatusBadge status={r.status} /> },
            ]}
            data={rows}
            emptyMessage="Semua grup sudah lunas"
          />
        </CardContent>
      </Card>
    </div>
  );
}
