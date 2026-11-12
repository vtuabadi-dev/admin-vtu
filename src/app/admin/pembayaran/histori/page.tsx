"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { CreditCard, Search, Download, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/Card";
import { StatusBadge, Badge } from "@/shared/components/ui/Badge";
import { Table } from "@/shared/components/ui/Table";
import { Button } from "@/shared/components/ui/Button";
import { Input } from "@/shared/components/ui/Input";
import { InvoiceLogActionBadge, InvoiceLogMetaDetails } from "@/shared/components/ui/InvoiceLogBadges";
import { useRealtimeListener } from "@/shared/providers/RealtimeProvider";
import { getPembayaranList, getAllPaymentSummaries, getKeberangkatanList } from "@/server/actions/api";
import type { Pembayaran, GroupPaymentSummary, Keberangkatan, InvoiceAuditLogEntry } from "@/shared/types";
import { formatCurrency, formatDate } from "@/shared/lib/utils";

const metodeLabel: Record<string, string> = {
  transfer: "Transfer", cash: "Tunai", virtual_account: "VA", qris: "QRIS",
};

interface Row {
  id: string;
  recordType: "payment" | "invoice_log";
  isLogOnly: boolean;
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
  rawLog?: InvoiceAuditLogEntry;
}

export default function HistoriPembayaranPage() {
  const [payments, setPayments] = useState<Pembayaran[]>([]);
  const [summaries, setSummaries] = useState<GroupPaymentSummary[]>([]);
  const [kbrList, setKbrList] = useState<Keberangkatan[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "payment" | "invoice_log">("all");

  const loadData = useCallback(async () => {
    const [p, s, k] = await Promise.all([
      getPembayaranList(), getAllPaymentSummaries(), getKeberangkatanList(),
    ]);
    setPayments(p);
    setSummaries(s);
    setKbrList(k);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useRealtimeListener(["pembayaran", "invoices", "registration_groups", "audit_entries"], () => {
    loadData();
  });

  const summaryMap = useMemo(() => new Map(summaries.map((s) => [s.groupId, s])), [summaries]);

  const rows: Row[] = useMemo(() => {
    const paymentRows: Row[] = payments.map((p) => {
      const summary = summaryMap.get(p.groupId);
      const kbr = kbrList.find((k) => k.jamaahIds.some((jid) => summary?.anggota.some((a) => a.id === jid)));
      return {
        id: p.id,
        recordType: "payment",
        isLogOnly: false,
        tanggal: p.tanggal,
        namaGroup: summary?.namaGroup ?? "-",
        namaPaket: kbr?.paketUmroh?.namaPaket ?? summary?.keberangkatan?.namaPaket ?? "-",
        invoiceNumber: p.invoiceId ? p.invoiceId : "-",
        jumlah: p.jumlah,
        metode: p.metode,
        sumber: p.sumber ?? "admin",
        status: p.status,
        catatan: p.catatan,
        alasanReject: p.alasanReject,
      };
    });

    const logRows: Row[] = [];
    const seenLogIds = new Set<string>();
    for (const s of summaries) {
      const kbr = kbrList.find((k) => k.jamaahIds.some((jid) => s.anggota.some((a) => a.id === jid)));
      for (const log of s.invoiceLogs || []) {
        if (seenLogIds.has(log.id)) continue;
        seenLogIds.add(log.id);
        logRows.push({
          id: `invlog-${log.id}`,
          recordType: "invoice_log",
          isLogOnly: true,
          tanggal: log.timestamp,
          namaGroup: log.namaGroup || s.namaGroup || "-",
          namaPaket: log.namaPaket || kbr?.paketUmroh?.namaPaket || s.keberangkatan?.namaPaket || "-",
          invoiceNumber: log.nomorInvoice || log.invoiceId || "-",
          jumlah: 0,
          metode: "Log Invoice",
          sumber: log.actorName || "Admin",
          status: "logged",
          catatan: log.summary,
          rawLog: log,
        });
      }
    }

    return [...paymentRows, ...logRows].sort(
      (a, b) => (new Date(b.tanggal).getTime() || 0) - (new Date(a.tanggal).getTime() || 0)
    );
  }, [payments, summaries, summaryMap, kbrList]);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (typeFilter === "payment" && r.isLogOnly) return false;
      if (typeFilter === "invoice_log" && !r.isLogOnly) return false;
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        r.namaGroup.toLowerCase().includes(q) ||
        r.namaPaket.toLowerCase().includes(q) ||
        r.invoiceNumber.toLowerCase().includes(q) ||
        (r.catatan || "").toLowerCase().includes(q)
      );
    });
  }, [rows, searchQuery, typeFilter]);

  const stats = useMemo(() => ({
    totalPembayaran: rows.filter((r) => !r.isLogOnly && r.status === "verified").reduce((sum, r) => sum + r.jumlah, 0),
    totalTransaksi: rows.filter((r) => !r.isLogOnly).length,
    totalInvoiceLogs: rows.filter((r) => r.isLogOnly).length,
    totalPending: rows.filter((r) => !r.isLogOnly && r.status === "pending").length,
  }), [rows]);

  function handleExport() {
    const header = "Tanggal,Jenis,Group,Paket,Invoice,Kas Masuk,Metode,Status,Keterangan";
    const csvRows = filtered.map((r) =>
      `${r.tanggal},"${r.isLogOnly ? "Log Invoice" : "Pembayaran"}","${r.namaGroup}","${r.namaPaket}",${r.invoiceNumber},${r.jumlah},${metodeLabel[r.metode] ?? r.metode},${r.status},"${(r.catatan || "").replace(/"/g, '""')}"`
    );
    const csv = [header, ...csvRows].join("\n");
    alert(`Export ${filtered.length} entri histori:\n\n${csv.slice(0, 500)}...`);
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
          <h1 className="text-2xl font-bold tracking-tight">Histori Pembayaran &amp; Log Invoice</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Audit trail transaksi pembayaran masuk serta log penerbitan &amp; pembaruan invoice lintas modul
          </p>
        </div>
        <Button variant="outline" onClick={handleExport} disabled={filtered.length === 0}>
          <Download className="mr-1.5 h-4 w-4" />
          Export Laporan
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
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
              <p className="text-xs text-muted-foreground">Transaksi Pembayaran</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{stats.totalInvoiceLogs}</p>
              <p className="text-xs text-muted-foreground">Log Pembaruan Invoice</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-warning">{stats.totalPending}</p>
              <p className="text-xs text-muted-foreground">Pending Verifikasi</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Segmen & Search */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 bg-muted/50 p-1 rounded-lg border">
          {[
            { id: "all", label: `Semua (${rows.length})` },
            { id: "payment", label: `Pembayaran Masuk (${stats.totalTransaksi})` },
            { id: "invoice_log", label: `Log Pembaruan Invoice (${stats.totalInvoiceLogs})` },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setTypeFilter(tab.id as any)}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
                typeFilter === tab.id
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 flex-1 max-w-sm">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Cari group, paket, invoice, atau aktivitas..."
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
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">
            <CreditCard className="mr-2 inline h-4 w-4" />
            Riwayat Transaksi &amp; Log Invoice{searchQuery ? ` — hasil: ${filtered.length}` : ""}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table
            keyField="id"
            columns={[
              { key: "tgl", header: "Tanggal", accessor: (r) => <span className="text-sm whitespace-nowrap">{formatDate(r.tanggal)}</span> },
              { key: "group", header: "Group & Paket", accessor: (r) => (
                <div>
                  <span className="font-medium block">{r.namaGroup}</span>
                  <span className="text-xs text-muted-foreground">{r.namaPaket}</span>
                </div>
              )},
              { key: "detail", header: "Invoice & Aktivitas", accessor: (r) => (
                <div className="space-y-1 max-w-md">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-mono text-xs font-semibold">{r.invoiceNumber}</span>
                    {r.isLogOnly && r.rawLog && <InvoiceLogActionBadge log={r.rawLog} compact />}
                  </div>
                  {r.isLogOnly && r.rawLog ? (
                    <InvoiceLogMetaDetails log={r.rawLog} maxDiffs={2} />
                  ) : r.catatan ? (
                    <p className="text-xs text-muted-foreground">{r.catatan}</p>
                  ) : null}
                </div>
              )},
              { key: "jumlah", header: "Kas Masuk", accessor: (r) => (
                r.isLogOnly ? (
                  <span className="text-xs font-mono text-muted-foreground">Rp 0</span>
                ) : (
                  <span className="font-medium tabular-nums">{formatCurrency(r.jumlah)}</span>
                )
              )},
              { key: "metode", header: "Metode", accessor: (r) => (
                <Badge variant="outline" className="text-xs">
                  {r.isLogOnly ? "Audit Log" : (metodeLabel[r.metode] ?? r.metode)}
                </Badge>
              )},
              { key: "sumber", header: "Sumber / Aktor", accessor: (r) => (
                <Badge variant={r.isLogOnly || r.sumber === "admin" ? "muted" : "info"} size="sm">
                  {r.isLogOnly ? r.sumber : (r.sumber === "admin" ? "Admin" : "Jamaah")}
                </Badge>
              )},
              { key: "status", header: "Status", accessor: (r) => (
                <div className="flex flex-col items-start gap-0.5">
                  {r.isLogOnly ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                      Tercatat
                    </span>
                  ) : (
                    <StatusBadge status={r.status} />
                  )}
                  {r.status === "rejected" && r.alasanReject && (
                    <span className="text-[10px] text-destructive truncate max-w-[120px]" title={r.alasanReject}>
                      {r.alasanReject}
                    </span>
                  )}
                </div>
              )},
            ]}
            data={filtered}
            emptyMessage={searchQuery ? "Tidak ada transaksi atau log yang cocok" : "Belum ada transaksi pembayaran maupun log invoice"}
          />
        </CardContent>
      </Card>
    </div>
  );
}
