"use client";

import { useState, useEffect, useMemo } from "react";
import { BarChart3, FileDown, Search, TrendingUp, Users, DollarSign, Plane, FileText, AlertTriangle, FileCheck, ClipboardList } from "lucide-react";
import { Card, CardContent } from "@/shared/components/ui/Card";
import { StatusBadge } from "@/shared/components/ui/Badge";
import { Tabs } from "@/shared/components/ui/Tabs";
import { Select } from "@/shared/components/ui/Select";
import { Table } from "@/shared/components/ui/Table";
import { PermissionGuard } from "@/shared/components/PermissionGuard";
import { formatCurrency, formatDate, formatDateShort } from "@/shared/lib/utils";
import { exportCsv } from "@/shared/lib/export-utils";
import type {
  Keberangkatan,
  Jamaah,
  RegistrationGroup,
  GroupPaymentSummary,
  Manifest,
  Invoice,
} from "@/shared/types";
import {
  getKeberangkatanList,
  getJamaahList,
  getGroupList,
  getAllPaymentSummaries,
  getManifestList,
  getInvoiceList,
  getDocumentCompletionMatrix,
} from "@/services/mock/handlers";

// ── Helpers ──
function getStatusLabel(s: string): string {
  const m: Record<string, string> = {
    lunas: "Lunas", dp: "DP", cicilan: "Cicilan", hampir_lunas: "Hampir Lunas",
    overdue: "Overdue", unpaid: "Belum Bayar", partial: "Sebagian", paid: "Lunas",
    draft: "Draft", active: "Aktif", completed: "Selesai", cancelled: "Batal",
    scheduled: "Terjadwal", preparing: "Persiapan", ready: "Siap", departed: "Berangkat",
  };
  return m[s] ?? s;
}

// ── Stat Card ──
function StatMini({ label, value, sub, icon: Icon, variant }: {
  label: string; value: string; sub?: string; icon: React.ElementType; variant?: "default" | "success" | "warning" | "danger";
}) {
  const colors = {
    default: "text-primary bg-primary/10",
    success: "text-success bg-success/10",
    warning: "text-warning bg-warning/10",
    danger: "text-destructive bg-destructive/10",
  };
  return (
    <div className="flex items-center gap-3 rounded-lg border p-3">
      <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${colors[variant ?? "default"]}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-lg font-bold">{value}</p>
        {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
      </div>
    </div>
  );
}

// ── Common Filters ──
function ReportFilters({
  packages,
  selectedPackage,
  setSelectedPackage,
  search,
  setSearch,
}: {
  packages: Keberangkatan[];
  selectedPackage: string;
  setSelectedPackage: (v: string) => void;
  search: string;
  setSearch: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-end gap-3">
      <Select
        label="Paket Keberangkatan"
        options={[
          { value: "all", label: "Semua Paket" },
          ...packages.map((p) => ({ value: p.id, label: `${p.kode} — ${p.namaPaket}` })),
        ]}
        value={selectedPackage}
        onChange={(e) => setSelectedPackage(e.target.value)}
      />
      <div className="flex-1 min-w-[200px]">
        <label className="text-sm font-medium leading-none">Cari</label>
        <div className="relative mt-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            className="flex h-9 w-full rounded-md border border-input bg-transparent pl-8 pr-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            placeholder="Cari nama, kode, nomor invoice..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}

// ============================================================
// REPORT TYPES
// ============================================================

// ── 1. LAPORAN KEUANGAN ──
function LaporanKeuangan({
  selectedPackage, search, groups, summaries,
}: {
  selectedPackage: string;
  search: string;
  groups: RegistrationGroup[];
  summaries: GroupPaymentSummary[];
}) {
  const filtered = useMemo(() => {
    let s = summaries;
    if (selectedPackage !== "all") {
      const groupIds = new Set(groups.filter((g) => g.paketKeberangkatanId === selectedPackage).map((g) => g.id));
      s = s.filter((sm) => groupIds.has(sm.groupId));
    }
    if (search) {
      const q = search.toLowerCase();
      s = s.filter((sm) =>
        sm.kodeRegistrasi.toLowerCase().includes(q) ||
        sm.namaGroup.toLowerCase().includes(q)
      );
    }
    return s;
  }, [summaries, groups, selectedPackage, search]);

  const totalTagihan = filtered.reduce((sum, s) => sum + s.totalTagihan, 0);
  const totalPembayaran = filtered.reduce((sum, s) => sum + s.totalPembayaran, 0);
  const totalSisa = filtered.reduce((sum, s) => sum + s.sisaPembayaran, 0);
  const overdueCount = filtered.filter((s) => s.status === "overdue").length;

  const handleExport = () => {
    const headers = ["Kode Registrasi", "Nama Group", "Total Tagihan", "Total Pembayaran", "Sisa", "Status", "Jumlah Anggota"];
    const rows = filtered.map((s) => [
      s.kodeRegistrasi, s.namaGroup, String(s.totalTagihan), String(s.totalPembayaran),
      String(s.sisaPembayaran), getStatusLabel(s.status), String(s.jumlahAnggota),
    ]);
    exportCsv(headers, rows, `laporan-keuangan-${new Date().toISOString().slice(0, 10)}`);
  };

  return (
    <div className="space-y-4">
      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatMini label="Total Tagihan" value={formatCurrency(totalTagihan)} icon={DollarSign} variant="default" />
        <StatMini label="Total Pembayaran" value={formatCurrency(totalPembayaran)} icon={TrendingUp} variant="success" />
        <StatMini label="Sisa Pembayaran" value={formatCurrency(totalSisa)} icon={DollarSign} variant="warning" />
        <StatMini label="Overdue" value={String(overdueCount)} sub="group" icon={TrendingUp} variant="danger" />
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{filtered.length} group ditemukan</p>
        <button
          onClick={handleExport}
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
        >
          <FileDown className="h-3.5 w-3.5" /> Ekspor CSV
        </button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table
            keyField="groupId"
            data={filtered}
            columns={[
              { key: "kode", header: "Kode Registrasi", accessor: (r) => <span className="font-mono text-xs">{r.kodeRegistrasi}</span> },
              { key: "nama", header: "Nama Group", accessor: (r) => <span className="font-medium">{r.namaGroup}</span> },
              { key: "tagihan", header: "Tagihan", accessor: (r) => formatCurrency(r.totalTagihan), className: "text-right" },
              { key: "bayar", header: "Pembayaran", accessor: (r) => <span className="text-success">{formatCurrency(r.totalPembayaran)}</span>, className: "text-right" },
              { key: "sisa", header: "Sisa", accessor: (r) => <span className={r.sisaPembayaran > 0 ? "text-warning font-medium" : "text-success"}>{formatCurrency(r.sisaPembayaran)}</span>, className: "text-right" },
              { key: "status", header: "Status", accessor: (r) => <StatusBadge status={r.status} /> },
              { key: "anggota", header: "Anggota", accessor: (r) => r.jumlahAnggota, className: "text-center" },
            ]}
          />
        </CardContent>
      </Card>
    </div>
  );
}

// ── 2. LAPORAN JAMAAH ──
function LaporanJamaah({
  selectedPackage, search, jamaahList, groups,
}: {
  selectedPackage: string;
  search: string;
  jamaahList: Jamaah[];
  groups: RegistrationGroup[];
}) {
  const [statusFilter, setStatusFilter] = useState("all");

  const filtered = useMemo(() => {
    let list = jamaahList;
    if (selectedPackage !== "all") {
      const groupIds = new Set(groups.filter((g) => g.paketKeberangkatanId === selectedPackage).map((g) => g.id));
      list = list.filter((j) => groupIds.has(j.groupId));
    }
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((j) =>
        j.namaLengkap.toLowerCase().includes(q) ||
        j.nomorPeserta.toLowerCase().includes(q) ||
        j.nik.includes(q)
      );
    }
    if (statusFilter !== "all") {
      list = list.filter((j) => j.status === statusFilter);
    }
    return list;
  }, [jamaahList, groups, selectedPackage, search, statusFilter]);

  const handleExport = () => {
    const headers = ["No. Peserta", "Nama Lengkap", "JK", "NIK", "Paspor", "Hotel Mekkah", "Hotel Madinah", "Group", "Status"];
    const rows = filtered.map((j) => {
      const g = groups.find((grp) => grp.id === j.groupId);
      return [j.nomorPeserta, j.namaLengkap, j.jenisKelamin, j.nik, j.nomorPaspor, j.hotelMekkah, j.hotelMadinah, g?.kodeRegistrasi ?? "-", getStatusLabel(j.status)];
    });
    exportCsv(headers, rows, `laporan-jamaah-${new Date().toISOString().slice(0, 10)}`);
  };

  const statusCounts = useMemo(() => {
    const c: Record<string, number> = {};
    filtered.forEach((j) => { c[j.status] = (c[j.status] ?? 0) + 1; });
    return c;
  }, [filtered]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatMini label="Total Jamaah" value={String(filtered.length)} icon={Users} variant="default" />
        <StatMini label="Siap Berangkat" value={String(statusCounts.ready ?? 0)} icon={Plane} variant="success" />
        <StatMini label="Dokumen Kurang" value={String(statusCounts.dokumen_upload ?? 0)} icon={FileText} variant="warning" />
        <StatMini label="Lunas" value={String(statusCounts.lunas ?? 0)} icon={TrendingUp} variant="success" />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Select
            options={[
              { value: "all", label: "Semua Status" },
              { value: "registered", label: "Terdaftar" },
              { value: "dokumen_upload", label: "Upload Dokumen" },
              { value: "dokumen_verified", label: "Dokumen Verified" },
              { value: "lunas", label: "Lunas" },
              { value: "ready", label: "Siap" },
              { value: "berangkat", label: "Berangkat" },
              { value: "batal", label: "Batal" },
            ]}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          />
          <p className="text-sm text-muted-foreground">{filtered.length} jamaah ditemukan</p>
        </div>
        <button
          onClick={handleExport}
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
        >
          <FileDown className="h-3.5 w-3.5" /> Ekspor CSV
        </button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table
            keyField="id"
            data={filtered.slice(0, 100)}
            columns={[
              { key: "peserta", header: "No. Peserta", accessor: (j) => <span className="font-mono text-xs">{j.nomorPeserta}</span> },
              { key: "nama", header: "Nama", accessor: (j) => <span className="font-medium">{j.namaLengkap}</span> },
              { key: "jk", header: "JK", accessor: (j) => j.jenisKelamin, className: "text-center" },
              { key: "paspor", header: "Paspor", accessor: (j) => <span className="font-mono text-xs">{j.nomorPaspor || "-"}</span> },
              { key: "hotel", header: "Hotel", accessor: (j) => <span className="text-xs">{j.hotelMekkah} / {j.hotelMadinah}</span> },
              { key: "group", header: "Group", accessor: (j) => {
                const g = groups.find((grp) => grp.id === j.groupId);
                return <span className="font-mono text-xs">{g?.kodeRegistrasi ?? "-"}</span>;
              }},
              { key: "status", header: "Status", accessor: (j) => <StatusBadge status={j.status} /> },
            ]}
          />
        </CardContent>
      </Card>

      {filtered.length > 100 && (
        <p className="text-xs text-muted-foreground text-center">
          Menampilkan 100 dari {filtered.length} data. Gunakan filter untuk mempersempit hasil.
        </p>
      )}
    </div>
  );
}

// ── 3. LAPORAN KEBERANGKATAN ──
function LaporanKeberangkatan({
  allPackages, selectedPackage, search,
}: {
  allPackages: Keberangkatan[];
  selectedPackage: string;
  search: string;
}) {
  const filtered = useMemo(() => {
    let pkgs = allPackages;
    if (selectedPackage !== "all") {
      pkgs = pkgs.filter((p) => p.id === selectedPackage);
    }
    if (search) {
      const q = search.toLowerCase();
      pkgs = pkgs.filter((p) => p.namaPaket.toLowerCase().includes(q) || p.kode.toLowerCase().includes(q));
    }
    return pkgs;
  }, [allPackages, selectedPackage, search]);

  const handleExport = () => {
    const headers = ["Kode", "Nama Paket", "Tanggal Berangkat", "Tanggal Pulang", "Maskapai", "Kuota", "Terisi", "% Terisi", "Status"];
    const rows = filtered.map((p) => [
      p.kode, p.namaPaket, p.tanggalBerangkat, p.tanggalPulang, p.maskapai,
      String(p.kuota), String(p.terisi), `${Math.round((p.terisi / p.kuota) * 100)}%`, getStatusLabel(p.status),
    ]);
    exportCsv(headers, rows, `laporan-keberangkatan-${new Date().toISOString().slice(0, 10)}`);
  };

  const totalKuota = filtered.reduce((s, p) => s + p.kuota, 0);
  const totalTerisi = filtered.reduce((s, p) => s + p.terisi, 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatMini label="Paket Aktif" value={String(filtered.length)} icon={Plane} variant="default" />
        <StatMini label="Total Kuota" value={String(totalKuota)} icon={Users} variant="default" />
        <StatMini label="Total Terisi" value={String(totalTerisi)} icon={TrendingUp} variant="success" />
        <StatMini label="Tingkat Isian" value={`${totalKuota > 0 ? Math.round((totalTerisi / totalKuota) * 100) : 0}%`} icon={BarChart3} variant="warning" />
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{filtered.length} paket ditemukan</p>
        <button
          onClick={handleExport}
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
        >
          <FileDown className="h-3.5 w-3.5" /> Ekspor CSV
        </button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table
            keyField="id"
            data={filtered}
            columns={[
              { key: "kode", header: "Kode", accessor: (p) => <span className="font-mono text-xs font-medium">{p.kode}</span> },
              { key: "nama", header: "Nama Paket", accessor: (p) => <span className="font-medium">{p.namaPaket}</span> },
              { key: "tanggal", header: "Tanggal", accessor: (p) => <span className="text-xs">{formatDate(p.tanggalBerangkat)} — {formatDate(p.tanggalPulang)}</span> },
              { key: "maskapai", header: "Maskapai", accessor: (p) => p.maskapai },
              { key: "kuota", header: "Kuota", accessor: (p) => (
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{p.terisi}/{p.kuota}</span>
                    <span className="text-xs text-muted-foreground">({Math.round((p.terisi / p.kuota) * 100)}%)</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${p.terisi / p.kuota >= 0.9 ? "bg-destructive" : p.terisi / p.kuota >= 0.5 ? "bg-warning" : "bg-success"}`}
                      style={{ width: `${Math.min(100, (p.terisi / p.kuota) * 100)}%` }}
                    />
                  </div>
                </div>
              )},
              { key: "status", header: "Status", accessor: (p) => <StatusBadge status={p.status} /> },
            ]}
          />
        </CardContent>
      </Card>
    </div>
  );
}

// ── 4. LAPORAN OVERDUE — Actionable payment chasing ──
function LaporanOverdue({
  selectedPackage, search, groups, invoices,
}: {
  selectedPackage: string;
  search: string;
  groups: RegistrationGroup[];
  invoices: Invoice[];
}) {
  const filtered = useMemo(() => {
    let overdueInvoices = invoices.filter((inv) => inv.status === "overdue");
    if (selectedPackage !== "all") {
      const groupIds = new Set(groups.filter((g) => g.paketKeberangkatanId === selectedPackage).map((g) => g.id));
      overdueInvoices = overdueInvoices.filter((inv) => groupIds.has(inv.groupId));
    }
    return overdueInvoices.map((inv) => {
      const group = groups.find((g) => g.id === inv.groupId);
      const daysOverdue = Math.floor((Date.now() - new Date(inv.jatuhTempo).getTime()) / 86400000);
      return { ...inv, group, daysOverdue };
    }).filter((item) => {
      if (!search) return true;
      const q = search.toLowerCase();
      return (item.group?.namaGroup ?? "").toLowerCase().includes(q) ||
        item.nomorInvoice.toLowerCase().includes(q);
    });
  }, [invoices, groups, selectedPackage, search]);

  const totalOverdue = filtered.reduce((sum, inv) => sum + inv.sisaTagihan, 0);
  const jamaahTerdampak = new Set(filtered.map((inv) => inv.groupId)).size;

  const handleExport = () => {
    const headers = ["No. Invoice", "Group", "Jumlah", "Sisa", "Jatuh Tempo", "Hari Overdue", "Status"];
    const rows = filtered.map((inv) => [
      inv.nomorInvoice, inv.group?.namaGroup ?? "-", String(inv.jumlah),
      String(inv.sisaTagihan), inv.jatuhTempo, String(inv.daysOverdue), "OVERDUE",
    ]);
    exportCsv(headers, rows, `laporan-overdue-${new Date().toISOString().slice(0, 10)}`);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <StatMini label="Invoice Overdue" value={String(filtered.length)} icon={AlertTriangle} variant="danger" />
        <StatMini label="Total Overdue" value={formatCurrency(totalOverdue)} icon={DollarSign} variant="danger" />
        <StatMini label="Group Terdampak" value={String(jamaahTerdampak)} icon={Users} variant="warning" />
      </div>
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{filtered.length} invoice overdue</p>
        <button onClick={handleExport} className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90">
          <FileDown className="h-3.5 w-3.5" /> Ekspor CSV
        </button>
      </div>
      <Card><CardContent className="p-0">
        <Table
          keyField="id"
          data={filtered}
          columns={[
            { key: "invoice", header: "No. Invoice", accessor: (inv) => <span className="font-mono text-xs">{inv.nomorInvoice}</span> },
            { key: "group", header: "Group", accessor: (inv) => <span className="font-medium text-sm">{inv.group?.namaGroup ?? "-"}</span> },
            { key: "jumlah", header: "Tagihan", accessor: (inv) => formatCurrency(inv.jumlah), className: "text-right" },
            { key: "sisa", header: "Sisa", accessor: (inv) => <span className="text-destructive font-medium">{formatCurrency(inv.sisaTagihan)}</span>, className: "text-right" },
            { key: "tempo", header: "Jatuh Tempo", accessor: (inv) => <span className="text-xs">{formatDateShort(inv.jatuhTempo)}</span> },
            { key: "hari", header: "Hari", accessor: (inv) => <span className="text-destructive font-bold">{inv.daysOverdue} hari</span>, className: "text-center" },
          ]}
        />
      </CardContent></Card>
    </div>
  );
}

// ── 5. LAPORAN DOKUMEN — Per-package document completion ──
function LaporanDokumen({
  selectedPackage, search, allPackages,
}: {
  selectedPackage: string;
  search: string;
  allPackages: Keberangkatan[];
}) {
  const [matrixData, setMatrixData] = useState<Awaited<ReturnType<typeof getDocumentCompletionMatrix>>>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const pkgId = selectedPackage !== "all" ? selectedPackage : undefined;
    async function load() {
      setLoading(true);
      const all: Awaited<ReturnType<typeof getDocumentCompletionMatrix>> = [];
      if (pkgId) {
        const data = await getDocumentCompletionMatrix(pkgId);
        all.push(...data);
      } else {
        for (const pkg of allPackages) {
          const data = await getDocumentCompletionMatrix(pkg.id);
          all.push(...data);
        }
      }
      setMatrixData(all);
      setLoading(false);
    }
    load();
  }, [selectedPackage, allPackages]);

  const filtered = useMemo(() => {
    if (!search) return matrixData;
    const q = search.toLowerCase();
    return matrixData.filter((r) => r.namaLengkap.toLowerCase().includes(q) || r.kodeRegistrasi.toLowerCase().includes(q));
  }, [matrixData, search]);

  const handleExport = () => {
    const headers = ["Nama", "Kode Registrasi", "Paspor", "Pas Foto", "Vaksin", "KTP", "KK", "Akta", "Completion %"];
    const rows = filtered.map((r) => [
      r.namaLengkap, r.kodeRegistrasi,
      r.dokumen.paspor?.status ?? "-", r.dokumen.pas_foto?.status ?? "-",
      r.dokumen.vaksin?.status ?? "-", r.dokumen.ktp?.status ?? "-",
      r.dokumen.kk?.status ?? "-", r.dokumen.akta?.status ?? "-",
      `${r.completionPercentage}%`,
    ]);
    exportCsv(headers, rows, `laporan-dokumen-${new Date().toISOString().slice(0, 10)}`);
  };

  const lengkap = filtered.filter((r) => r.allMandatoryComplete).length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <StatMini label="Total Jamaah" value={String(filtered.length)} icon={Users} variant="default" />
        <StatMini label="Dokumen Lengkap" value={String(lengkap)} icon={FileCheck} variant="success" />
        <StatMini label="Belum Lengkap" value={String(filtered.length - lengkap)} icon={AlertTriangle} variant="warning" />
      </div>
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{filtered.length} jamaah</p>
        <button onClick={handleExport} className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90">
          <FileDown className="h-3.5 w-3.5" /> Ekspor CSV
        </button>
      </div>
      {loading ? (
        <div className="py-12 text-center text-sm text-muted-foreground">Memuat data dokumen...</div>
      ) : (
        <Card><CardContent className="p-0">
          <Table
            keyField="jamaahId"
            data={filtered.slice(0, 100)}
            columns={[
              { key: "nama", header: "Nama Jamaah", accessor: (r) => <span className="font-medium text-sm">{r.namaLengkap}</span> },
              { key: "kode", header: "Kode", accessor: (r) => <span className="font-mono text-xs">{r.kodeRegistrasi}</span> },
              { key: "paspor", header: "Paspor", accessor: (r) => <DocCell status={r.dokumen.paspor?.status} />, className: "text-center" },
              { key: "pasfoto", header: "Pas Foto", accessor: (r) => <DocCell status={r.dokumen.pas_foto?.status} />, className: "text-center" },
              { key: "vaksin", header: "Vaksin", accessor: (r) => <DocCell status={r.dokumen.vaksin?.status} />, className: "text-center" },
              { key: "ktp", header: "KTP", accessor: (r) => <DocCell status={r.dokumen.ktp?.status} />, className: "text-center" },
              { key: "kk", header: "KK", accessor: (r) => <DocCell status={r.dokumen.kk?.status} />, className: "text-center" },
              { key: "akta", header: "Akta", accessor: (r) => <DocCell status={r.dokumen.akta?.status} />, className: "text-center" },
              { key: "pct", header: "%", accessor: (r) => <span className={`font-bold text-sm ${r.completionPercentage === 100 ? "text-success" : r.completionPercentage >= 67 ? "text-warning" : "text-destructive"}`}>{r.completionPercentage}%</span>, className: "text-center" },
            ]}
          />
        </CardContent></Card>
      )}
    </div>
  );
}

function DocCell({ status }: { status?: string }) {
  const m: Record<string, { bg: string; text: string; label: string }> = {
    verified: { bg: "bg-success/10", text: "text-success", label: "OK" },
    lengkap: { bg: "bg-success/10", text: "text-success", label: "OK" },
    pending: { bg: "bg-gray-100 dark:bg-gray-800", text: "text-gray-500", label: "-" },
    revisi: { bg: "bg-warning/10", text: "text-warning", label: "!" },
    rejected: { bg: "bg-destructive/10", text: "text-destructive", label: "✕" },
    processing: { bg: "bg-info/10", text: "text-info", label: "..." },
    kurang: { bg: "bg-warning/10", text: "text-warning", label: "!" },
  };
  const s = m[status ?? ""] ?? m.pending!;
  return <span className={`inline-flex items-center justify-center w-7 h-7 rounded text-xs font-bold ${s.bg} ${s.text}`}>{s.label}</span>;
}

// ── 6. LAPORAN MANIFEST — Operational manifest list ──
function LaporanManifest({
  selectedPackage, search, manifests, allPackages,
}: {
  selectedPackage: string;
  search: string;
  manifests: Manifest[];
  allPackages: Keberangkatan[];
}) {
  const filtered = useMemo(() => {
    let list = manifests;
    if (selectedPackage !== "all") {
      list = list.filter((m) => m.keberangkatanId === selectedPackage);
    }
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((m) => m.kode.toLowerCase().includes(q) || m.namaManifest.toLowerCase().includes(q));
    }
    return list;
  }, [manifests, selectedPackage, search]);

  const totalJamaah = filtered.reduce((sum, m) => sum + m.data.length, 0);
  const draftCount = filtered.filter((m) => m.status === "draft").length;

  const handleExport = () => {
    const headers = ["Kode Manifest", "Nama", "Paket", "Hotel Mekkah", "Hotel Madinah", "Jumlah Jamaah", "Status", "Dibuat"];
    const rows = filtered.map((m) => {
      const kbr = allPackages.find((k) => k.id === m.keberangkatanId);
      return [m.kode, m.namaManifest, kbr?.kode ?? "-", m.hotelMekkah ?? "-", m.hotelMadinah ?? "-", String(m.data.length), getStatusLabel(m.status), formatDateShort(m.createdAt)];
    });
    exportCsv(headers, rows, `laporan-manifest-${new Date().toISOString().slice(0, 10)}`);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <StatMini label="Total Manifest" value={String(filtered.length)} icon={ClipboardList} variant="default" />
        <StatMini label="Total Jamaah" value={String(totalJamaah)} icon={Users} variant="default" />
        <StatMini label="Draft" value={String(draftCount)} icon={FileText} variant="warning" />
      </div>
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{filtered.length} manifest</p>
        <button onClick={handleExport} className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90">
          <FileDown className="h-3.5 w-3.5" /> Ekspor CSV
        </button>
      </div>
      <Card><CardContent className="p-0">
        <Table
          keyField="id"
          data={filtered}
          columns={[
            { key: "kode", header: "Kode", accessor: (m) => <span className="font-mono text-xs font-medium">{m.kode}</span> },
            { key: "nama", header: "Nama Manifest", accessor: (m) => <span className="font-medium text-sm">{m.namaManifest}</span> },
            { key: "paket", header: "Paket", accessor: (m) => { const k = allPackages.find((p) => p.id === m.keberangkatanId); return <span className="text-xs">{k?.kode ?? "-"}</span>; }},
            { key: "hotel", header: "Hotel", accessor: (m) => <span className="text-xs">{m.hotelMekkah ?? "-"} / {m.hotelMadinah ?? "-"}</span> },
            { key: "jml", header: "Jamaah", accessor: (m) => m.data.length, className: "text-center" },
            { key: "status", header: "Status", accessor: (m) => <StatusBadge status={m.status} /> },
            { key: "tgl", header: "Dibuat", accessor: (m) => <span className="text-xs">{formatDateShort(m.createdAt)}</span> },
          ]}
        />
      </CardContent></Card>
    </div>
  );
}

// ============================================================
// MAIN REPORT PAGE
// ============================================================

export default function LaporanPage() {
  const [allPackages, setAllPackages] = useState<Keberangkatan[]>([]);
  const [jamaahList, setJamaahList] = useState<Jamaah[]>([]);
  const [groups, setGroups] = useState<RegistrationGroup[]>([]);
  const [summaries, setSummaries] = useState<GroupPaymentSummary[]>([]);
  const [manifests, setManifests] = useState<Manifest[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedPackage, setSelectedPackage] = useState("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    Promise.all([
      getKeberangkatanList(),
      getJamaahList(),
      getGroupList(),
      getAllPaymentSummaries(),
      getManifestList(),
      getInvoiceList(),
    ]).then(([pkgs, jmh, grps, sums, mans, invs]) => {
      setAllPackages(pkgs);
      setJamaahList(jmh);
      setGroups(grps);
      setSummaries(sums);
      setManifests(mans);
      setInvoices(invs);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div><h1 className="text-2xl font-bold tracking-tight">Laporan</h1></div>
        <div className="flex items-center justify-center py-20 text-sm text-muted-foreground">Memuat data...</div>
      </div>
    );
  }

  return (
    <PermissionGuard module="jamaah">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Laporan Operasional</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Laporan pembayaran, dokumen, manifest, jamaah, dan keberangkatan
          </p>
        </div>

        <ReportFilters
          packages={allPackages}
          selectedPackage={selectedPackage}
          setSelectedPackage={setSelectedPackage}
          search={search}
          setSearch={setSearch}
        />

        <Tabs
          tabs={[
            { value: "keuangan", label: "Pembayaran" },
            { value: "overdue", label: "Overdue" },
            { value: "dokumen", label: "Dokumen" },
            { value: "manifest", label: "Manifest" },
            { value: "jamaah", label: "Jamaah" },
            { value: "keberangkatan", label: "Paket" },
          ]}
        >
          {(activeTab) => {
            switch (activeTab) {
              case "keuangan":
                return <LaporanKeuangan selectedPackage={selectedPackage} search={search} groups={groups} summaries={summaries} />;
              case "overdue":
                return <LaporanOverdue selectedPackage={selectedPackage} search={search} groups={groups} invoices={invoices} />;
              case "dokumen":
                return <LaporanDokumen selectedPackage={selectedPackage} search={search} allPackages={allPackages} />;
              case "manifest":
                return <LaporanManifest selectedPackage={selectedPackage} search={search} manifests={manifests} allPackages={allPackages} />;
              case "jamaah":
                return <LaporanJamaah selectedPackage={selectedPackage} search={search} jamaahList={jamaahList} groups={groups} />;
              case "keberangkatan":
                return <LaporanKeberangkatan allPackages={allPackages} selectedPackage={selectedPackage} search={search} />;
              default:
                return null;
            }
          }}
        </Tabs>
      </div>
    </PermissionGuard>
  );
}
