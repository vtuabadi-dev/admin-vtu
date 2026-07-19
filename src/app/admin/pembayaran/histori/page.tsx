"use client";

import { useEffect, useState, useMemo } from "react";
import { CreditCard, Search, Download, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/Card";
import { StatusBadge, Badge } from "@/shared/components/ui/Badge";
import { Table } from "@/shared/components/ui/Table";
import { Button } from "@/shared/components/ui/Button";
import { Input } from "@/shared/components/ui/Input";
import { getPembayaranList, getAllPaymentSummaries, getKeberangkatanList } from "@/server/actions/api";
import type { Pembayaran, GroupPaymentSummary, Keberangkatan } from "@/shared/types";
import { formatCurrency, formatDate } from "@/shared/lib/utils";

const metodeLabel: Record<string, string> = {
  transfer: "Transfer", cash: "Tunai", virtual_account: "VA", qris: "QRIS",
};

interface Row {
  id: string;
  tanggal: string;
  namaGroup: string;
  namaPaket: string;
  invoiceNumber: string;
  jumlah: number;
  metode: string;
  sumber: string;
  status: string;
  catatan?: string;
  alasanReject?: string;
}

export default function HistoriPembayaranPage() {
  const [payments, setPayments] = useState<Pembayaran[]>([]);
  const [summaries, setSummaries] = useState<GroupPaymentSummary[]>([]);
  const [kbrList, setKbrList] = useState<Keberangkatan[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    async function load() {
      const [p, s, k] = await Promise.all([
        getPembayaranList(), getAllPaymentSummaries(), getKeberangkatanList(),
      ]);
      setPayments(p);
      setSummaries(s);
      setKbrList(k);
      setLoading(false);
    }
    load();
  }, []);

  const summaryMap = useMemo(() => new Map(summaries.map((s) => [s.groupId, s])), [summaries]);

  const rows: Row[] = useMemo(() => {
    return payments
      .map((p) => {
        const summary = summaryMap.get(p.groupId);
        const kbr = kbrList.find((k) => k.jamaahIds.some((jid) => summary?.anggota.some((a) => a.id === jid)));
        return {
          id: p.id,
          tanggal: p.tanggal,
          namaGroup: summary?.namaGroup ?? "-",
          namaPaket: kbr?.paketUmroh?.namaPaket ?? "-",
          invoiceNumber: p.invoiceId ? `INV-${p.invoiceId.slice(-6)}` : "-",
          jumlah: p.jumlah,
          metode: p.metode,
          sumber: p.sumber ?? "admin",
          status: p.status,
          catatan: p.catatan,
          alasanReject: p.alasanReject,
        };
      })
      .sort((a, b) => b.tanggal.localeCompare(a.tanggal));
  }, [payments, summaryMap, kbrList]);

  const filtered = useMemo(() => {
    if (!searchQuery) return rows;
    const q = searchQuery.toLowerCase();
    return rows.filter((r) =>
      r.namaGroup.toLowerCase().includes(q) ||
      r.namaPaket.toLowerCase().includes(q) ||
      r.invoiceNumber.toLowerCase().includes(q)
    );
  }, [rows, searchQuery]);

  const stats = useMemo(() => ({
    totalPembayaran: rows.filter((r) => r.status === "verified").reduce((sum, r) => sum + r.jumlah, 0),
    totalTransaksi: rows.length,
    totalPending: rows.filter((r) => r.status === "pending").length,
  }), [rows]);

  function handleExport() {
    // Mock export — generate CSV-like alert
    const header = "Tanggal,Group,Paket,Invoice,Jumlah,Metode,Status";
    const csvRows = filtered.map((r) =>
      `${r.tanggal},"${r.namaGroup}","${r.namaPaket}",${r.invoiceNumber},${r.jumlah},${metodeLabel[r.metode] ?? r.metode},${r.status}`
    );
    const csv = [header, ...csvRows].join("\n");
    alert(`Export ${filtered.length} transaksi:\n\n${csv.slice(0, 500)}...`);
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-muted-foreground">Memuat data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Histori Pembayaran</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Audit trail seluruh transaksi pembayaran
          </p>
        </div>
        <Button variant="outline" onClick={handleExport} disabled={filtered.length === 0}>
          <Download className="mr-1.5 h-4 w-4" />
          Export Laporan
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-success">{formatCurrency(stats.totalPembayaran)}</p>
              <p className="text-xs text-muted-foreground">Total Terverifikasi</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-2xl font-bold">{stats.totalTransaksi}</p>
              <p className="text-xs text-muted-foreground">Total Transaksi</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-warning">{stats.totalPending}</p>
              <p className="text-xs text-muted-foreground">Pending</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Cari group, paket, atau invoice..."
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        {searchQuery && (
          <Button variant="ghost" size="sm" onClick={() => setSearchQuery("")}>
            <X className="mr-1 h-3.5 w-3.5" />
            Reset
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">
            <CreditCard className="mr-2 inline h-4 w-4" />
            Riwayat Transaksi{searchQuery ? ` — hasil: ${filtered.length}` : ""}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table
            keyField="id"
            columns={[
              { key: "tgl", header: "Tanggal", accessor: (r) => <span className="text-sm">{formatDate(r.tanggal)}</span> },
              { key: "group", header: "Group", accessor: (r) => <span className="font-medium">{r.namaGroup}</span> },
              { key: "paket", header: "Paket", accessor: (r) => <span className="text-sm">{r.namaPaket}</span> },
              { key: "invoice", header: "Invoice", accessor: (r) => <span className="font-mono text-xs">{r.invoiceNumber}</span> },
              { key: "jumlah", header: "Jumlah", accessor: (r) => <span className="font-medium tabular-nums">{formatCurrency(r.jumlah)}</span> },
              { key: "metode", header: "Metode", accessor: (r) => <Badge variant="outline" className="text-xs">{metodeLabel[r.metode] ?? r.metode}</Badge> },
              { key: "sumber", header: "Sumber", accessor: (r) => <Badge variant={r.sumber === "admin" ? "muted" : "info"} size="sm">{r.sumber === "admin" ? "Admin" : "Jamaah"}</Badge> },
              { key: "status", header: "Status", accessor: (r) => (
                <div className="flex flex-col items-start gap-0.5">
                  <StatusBadge status={r.status} />
                  {r.status === "rejected" && r.alasanReject && (
                    <span className="text-[10px] text-destructive truncate max-w-[120px]" title={r.alasanReject}>
                      {r.alasanReject}
                    </span>
                  )}
                </div>
              )},
            ]}
            data={filtered}
            emptyMessage={searchQuery ? "Tidak ada transaksi yang cocok" : "Belum ada transaksi pembayaran"}
          />
        </CardContent>
      </Card>
    </div>
  );
}
