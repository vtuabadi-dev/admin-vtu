"use client";

import { useEffect, useState, useMemo } from "react";
import { Receipt } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/Card";
import { StatCard } from "@/shared/components/ui/StatCard";
import { StatusBadge, Badge } from "@/shared/components/ui/Badge";
import { Table } from "@/shared/components/ui/Table";
import { getInvoiceList, getGroupList, getKeberangkatanList, getPembayaranList } from "@/services/mock/handlers";
import type { Invoice, RegistrationGroup, Keberangkatan, Pembayaran } from "@/shared/types";
import { formatCurrency, formatDate } from "@/shared/lib/utils";

const tipeLabel: Record<string, string> = { dp: "DP", cicilan: "Cicilan", pelunasan: "Pelunasan", tambahan: "Tambahan" };

interface Row {
  id: string;
  nomorInvoice: string;
  namaGroup: string;
  namaPaket: string;
  tipe: string;
  jumlah: number;
  dibayar: number;
  sisa: number;
  status: string;
  jatuhTempo: string;
}

export default function InvoiceRekapPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [groups, setGroups] = useState<RegistrationGroup[]>([]);
  const [kbrList, setKbrList] = useState<Keberangkatan[]>([]);
  const [payments, setPayments] = useState<Pembayaran[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [inv, grp, kbr, pay] = await Promise.all([
        getInvoiceList(), getGroupList(), getKeberangkatanList(), getPembayaranList(),
      ]);
      setInvoices(inv);
      setGroups(grp);
      setKbrList(kbr);
      setPayments(pay);
      setLoading(false);
    }
    load();
  }, []);

  const groupMap = useMemo(() => new Map(groups.map((g) => [g.id, g])), [groups]);

  const rows: Row[] = useMemo(() => {
    return invoices.map((inv) => {
      const group = groupMap.get(inv.groupId);
      const kbr = kbrList.find((k) => k.jamaahIds.some((jid) => group?.anggotaIds.includes(jid)));
      const paid = payments.filter((p) => p.invoiceId === inv.id && p.status === "verified").reduce((sum, p) => sum + p.jumlah, 0);
      return {
        id: inv.id,
        nomorInvoice: inv.nomorInvoice,
        namaGroup: group?.namaGroup ?? "-",
        namaPaket: kbr?.namaPaket ?? "-",
        tipe: inv.tipe,
        jumlah: inv.jumlah,
        dibayar: paid,
        sisa: inv.jumlah - paid,
        status: inv.status,
        jatuhTempo: inv.jatuhTempo,
      };
    });
  }, [invoices, groupMap, kbrList, payments]);

  const stats = useMemo(() => ({
    totalInvoice: rows.reduce((sum, r) => sum + r.jumlah, 0),
    totalOutstanding: rows.filter((r) => r.status !== "paid").reduce((sum, r) => sum + r.sisa, 0),
    totalOverdue: rows.filter((r) => r.status === "overdue").length,
  }), [rows]);

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
        <h1 className="text-2xl font-bold tracking-tight">Rekapan Invoice</h1>
        <p className="text-sm text-muted-foreground mt-1">Ringkasan seluruh invoice dari semua grup</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Total Invoice" value={formatCurrency(stats.totalInvoice)} icon={Receipt} variant="info" />
        <StatCard label="Total Outstanding" value={formatCurrency(stats.totalOutstanding)} icon={Receipt} variant="warning" />
        <StatCard label="Overdue" value={stats.totalOverdue} icon={Receipt} variant="danger" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Daftar Invoice</CardTitle>
        </CardHeader>
        <CardContent>
          <Table
            keyField="id"
            columns={[
              { key: "nomor", header: "No. Invoice", accessor: (r) => <span className="font-mono text-xs">{r.nomorInvoice}</span> },
              { key: "group", header: "Group", accessor: (r) => <span className="font-medium">{r.namaGroup}</span> },
              { key: "paket", header: "Paket", accessor: (r) => <span className="text-sm">{r.namaPaket}</span> },
              { key: "tipe", header: "Tipe", accessor: (r) => <Badge variant="outline" className="text-xs">{tipeLabel[r.tipe] ?? r.tipe}</Badge> },
              { key: "jumlah", header: "Jumlah", accessor: (r) => <span className="tabular-nums">{formatCurrency(r.jumlah)}</span> },
              { key: "sisa", header: "Sisa", accessor: (r) => <span className={r.sisa > 0 ? "text-destructive font-medium" : ""}>{formatCurrency(r.sisa)}</span> },
              { key: "status", header: "Status", accessor: (r) => <StatusBadge status={r.status} /> },
              { key: "tempo", header: "Jatuh Tempo", accessor: (r) => <span className="text-sm">{formatDate(r.jatuhTempo)}</span> },
            ]}
            data={rows}
          />
        </CardContent>
      </Card>
    </div>
  );
}
