"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import {
  getInvoiceList,
  getPembayaranList,
  getJamaahList,
  getGroupList,
} from "@/server/actions/api";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Table,
  Button,
  StatusBadge,
  Badge,
  Modal,
  Select,
  Input,
} from "@/shared/components/ui";
import { StatCard } from "@/shared/components/ui/StatCard";
import type {
  Invoice,
  Pembayaran,
  Jamaah,
  RegistrationGroup,
  StatusInvoice,
  TipeInvoice,
} from "@/shared/types";
import { formatCurrency, formatDateShort } from "@/shared/lib/utils";
import {
  FileText,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Plus,
  Trash2,
  Banknote,
  CalendarDays,
  Building2,
  Users,
  Receipt,
  NotebookPen,
} from "lucide-react";

// --- Helper ---

function sumVerifiedPayments(pembayaran: Pembayaran[]): number {
  return pembayaran
    .filter((p) => p.status === "verified")
    .reduce((sum, p) => sum + p.jumlah, 0);
}

const tipeInvoiceLabels: Record<TipeInvoice, string> = {
  dp: "DP",
  cicilan: "Cicilan",
  pelunasan: "Pelunasan",
  tambahan: "Tambahan",
};

// --- Invoice Row Type ---

interface InvoiceRow {
  id: string;
  nomorInvoice: string;
  jamaahId?: string;
  jamaahName: string;
  groupName: string;
  tipe: TipeInvoice;
  jumlah: number;
  sudahDibayar: number;
  sisa: number;
  status: StatusInvoice;
  jatuhTempo: string;
}

// --- Catat Pembayaran Sub-modal ---

function CatatPembayaranModal({
  open,
  onClose,
  invoice,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  invoice: Invoice | null;
  onSave: (data: {
    jumlah: number;
    metode: string;
    tanggal: string;
    catatan: string;
  }) => void;
}) {
  const [jumlah, setJumlah] = useState("");
  const [metode, setMetode] = useState("transfer");
  const [tanggal, setTanggal] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [catatan, setCatatan] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!jumlah || !tanggal) return;
    onSave({
      jumlah: Number(jumlah),
      metode,
      tanggal,
      catatan,
    });
    // Reset form
    setJumlah("");
    setMetode("transfer");
    setTanggal(new Date().toISOString().split("T")[0]);
    setCatatan("");
  };

  if (!invoice) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Catat Pembayaran"
      description={`Invoice: ${invoice.nomorInvoice}`}
      size="sm"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="rounded-lg border bg-muted/30 p-3 text-sm space-y-1">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Jumlah Tagihan</span>
            <span className="font-medium">
              {formatCurrency(invoice.jumlah)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Sisa Tagihan</span>
            <span className="font-medium text-destructive">
              {formatCurrency(invoice.sisaTagihan)}
            </span>
          </div>
        </div>

        <Input
          id="jumlah-bayar"
          label="Jumlah Pembayaran"
          type="number"
          placeholder="Masukkan nominal"
          value={jumlah}
          onChange={(e) => setJumlah(e.target.value)}
          required
        />

        <div className="space-y-1">
          <label className="text-sm font-medium leading-none">Metode</label>
          <select
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            value={metode}
            onChange={(e) => setMetode(e.target.value)}
          >
            <option value="transfer">Transfer Bank</option>
            <option value="cash">Tunai</option>
            <option value="kartu">Kartu Kredit/Debit</option>
            <option value="giro">Giro</option>
          </select>
        </div>

        <Input
          id="tgl-bayar"
          label="Tanggal Pembayaran"
          type="date"
          value={tanggal}
          onChange={(e) => setTanggal(e.target.value)}
          required
        />

        <div className="space-y-1">
          <label className="text-sm font-medium leading-none">Catatan</label>
          <textarea
            className="flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            placeholder="Opsional: catatan pembayaran"
            value={catatan}
            onChange={(e) => setCatatan(e.target.value)}
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Batal
          </Button>
          <Button type="submit" size="sm">
            <Banknote className="mr-1.5 h-3.5 w-3.5" />
            Catat Pembayaran
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// --- Invoice Detail Modal ---

function InvoiceDetailModal({
  open,
  onClose,
  invoice,
  pembayaranList,
  jamaahMap,
  groupMap,
  onCatatPembayaran,
}: {
  open: boolean;
  onClose: () => void;
  invoice: Invoice | null;
  pembayaranList: Pembayaran[];
  jamaahMap: Map<string, Jamaah>;
  groupMap: Map<string, RegistrationGroup>;
  onCatatPembayaran: () => void;
}) {
  const [showCatatModal, setShowCatatModal] = useState(false);

  if (!invoice) return null;

  const jamaah = invoice.jamaahId ? jamaahMap.get(invoice.jamaahId) : undefined;
  const group = groupMap.get(invoice.groupId);
  const invoicePayments = pembayaranList.filter(
    (p) => p.invoiceId === invoice.id
  );
  const totalPaid = sumVerifiedPayments(invoicePayments);
  const sisa = invoice.jumlah - totalPaid;

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title={`Detail Invoice - ${invoice.nomorInvoice}`}
        size="lg"
      >
        <div className="space-y-5">
          {/* Header Info */}
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-lg font-bold">{invoice.nomorInvoice}</p>
              <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5" />
                {jamaah?.namaLengkap ?? "-"}
                <span className="mx-1">&middot;</span>
                <Building2 className="h-3.5 w-3.5" />
                {group?.namaGroup ?? "-"}
              </p>
            </div>
            <StatusBadge status={invoice.status} />
          </div>

          {/* Quick Info Grid */}
          <div className="grid grid-cols-4 gap-4 rounded-lg border bg-muted/30 p-4 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Tipe</p>
              <Badge variant="outline" className="mt-0.5 capitalize">
                {tipeInvoiceLabels[invoice.tipe]}
              </Badge>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total</p>
              <p className="font-semibold mt-0.5">
                {formatCurrency(invoice.jumlah)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Sudah Dibayar</p>
              <p className="font-semibold text-success mt-0.5">
                {formatCurrency(totalPaid)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Sisa</p>
              <p
                className={`font-semibold mt-0.5 ${
                  sisa > 0 ? "text-destructive" : "text-success"
                }`}
              >
                {formatCurrency(sisa)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Jatuh Tempo</p>
              <p className="font-medium mt-0.5 flex items-center gap-1">
                <CalendarDays className="h-3 w-3 text-muted-foreground" />
                {formatDateShort(invoice.jatuhTempo)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Dibuat</p>
              <p className="font-medium mt-0.5">
                {formatDateShort(invoice.createdAt)}
              </p>
            </div>
          </div>

          {/* Items Breakdown */}
          <div>
            <h4 className="text-sm font-semibold mb-2">Rincian Item</h4>
            <div className="rounded-lg border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium text-xs text-muted-foreground">
                      Deskripsi
                    </th>
                    <th className="text-right px-3 py-2 font-medium text-xs text-muted-foreground w-40">
                      Jumlah
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.items.map((item) => (
                    <tr key={item.id} className="border-t">
                      <td className="px-3 py-2">{item.deskripsi}</td>
                      <td className="px-3 py-2 text-right font-medium tabular-nums">
                        {formatCurrency(item.jumlah)}
                      </td>
                    </tr>
                  ))}
                  <tr className="border-t bg-muted/20 font-semibold">
                    <td className="px-3 py-2">Total</td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {formatCurrency(invoice.jumlah)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Payment History */}
          <div>
            <h4 className="text-sm font-semibold mb-2">
              Riwayat Pembayaran ({invoicePayments.length})
            </h4>
            {invoicePayments.length === 0 ? (
              <p className="text-sm text-muted-foreground py-3 text-center">
                Belum ada pembayaran
              </p>
            ) : (
              <div className="space-y-2">
                {invoicePayments.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`mt-0.5 rounded-full p-1 ${
                          p.status === "verified"
                            ? "bg-success/10 text-success"
                            : p.status === "rejected"
                            ? "bg-destructive/10 text-destructive"
                            : "bg-warning/10 text-warning"
                        }`}
                      >
                        <Banknote className="h-3.5 w-3.5" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">
                          {formatCurrency(p.jumlah)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDateShort(p.tanggal)} &middot; {p.metode}
                          {p.catatan && ` &middot; ${p.catatan}`}
                          {p.verifiedBy && ` &middot; Verifikasi: ${p.verifiedBy}`}
                        </p>
                      </div>
                    </div>
                    <StatusBadge status={p.status} />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                alert(
                  `Print preview untuk ${invoice.nomorInvoice}`
                );
              }}
            >
              <Receipt className="mr-1.5 h-3.5 w-3.5" />
              Cetak Invoice
            </Button>
            <Button size="sm" onClick={() => setShowCatatModal(true)}>
              <NotebookPen className="mr-1.5 h-3.5 w-3.5" />
              Catat Pembayaran
            </Button>
          </div>
        </div>
      </Modal>

      {/* Catat Pembayaran Sub-modal */}
      <CatatPembayaranModal
        open={showCatatModal}
        onClose={() => setShowCatatModal(false)}
        invoice={invoice}
        onSave={(data) => {
          alert(
            `Pembayaran dicatat:\nJumlah: ${formatCurrency(data.jumlah)}\nMetode: ${data.metode}\nTanggal: ${data.tanggal}\nCatatan: ${data.catatan}`
          );
          setShowCatatModal(false);
          onCatatPembayaran();
        }}
      />
    </>
  );
}

// --- Buat Invoice Modal ---

function BuatInvoiceModal({
  open,
  onClose,
  jamaahList,
  groupMap,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  jamaahList: Jamaah[];
  groupMap: Map<string, RegistrationGroup>;
  onSave: (data: {
    jamaahId: string;
    tipe: TipeInvoice;
    jumlah: number;
    jatuhTempo: string;
    items: { deskripsi: string; jumlah: number }[];
  }) => void;
}) {
  const [jamaahId, setJamaahId] = useState("");
  const [tipe, setTipe] = useState<TipeInvoice>("dp");
  const [jumlah, setJumlah] = useState("");
  const [jatuhTempo, setJatuhTempo] = useState("");
  const [items, setItems] = useState<
    { deskripsi: string; jumlah: string }[]
  >([{ deskripsi: "", jumlah: "" }]);

  const jamaahOptions = jamaahList.map((j) => ({
    value: j.id,
    label: `${j.namaLengkap} (${j.nomorPeserta})`,
  }));

  const handleAddItem = () => {
    setItems([...items, { deskripsi: "", jumlah: "" }]);
  };

  const handleRemoveItem = (idx: number) => {
    if (items.length === 1) return;
    setItems(items.filter((_, i) => i !== idx));
  };

  const handleItemChange = (
    idx: number,
    field: "deskripsi" | "jumlah",
    value: string
  ) => {
    const updated = items.map((item, i) =>
      i === idx ? { ...item, [field]: value } : item
    );
    setItems(updated);
  };

  const itemsTotal = items.reduce(
    (sum, item) => sum + (Number(item.jumlah) || 0),
    0
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!jamaahId || !jumlah || !jatuhTempo) return;

    const parsedItems = items
      .filter((item) => item.deskripsi && item.jumlah)
      .map((item) => ({
        deskripsi: item.deskripsi,
        jumlah: Number(item.jumlah),
      }));

    onSave({
      jamaahId,
      tipe,
      jumlah: Number(jumlah),
      jatuhTempo,
      items:
        parsedItems.length > 0
          ? parsedItems
          : [{ deskripsi: `Tagihan ${tipeLabels[tipe]}`, jumlah: Number(jumlah) }],
    });

    // Reset
    setJamaahId("");
    setTipe("dp");
    setJumlah("");
    setJatuhTempo("");
    setItems([{ deskripsi: "", jumlah: "" }]);
  };

  const tipeOptions = [
    { value: "dp", label: "DP (Down Payment)" },
    { value: "cicilan", label: "Cicilan" },
    { value: "pelunasan", label: "Pelunasan" },
    { value: "tambahan", label: "Tambahan" },
  ];

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Buat Invoice Baru"
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Select Jamaah */}
        <Select
          id="jamaah"
          label="Jamaah"
          options={jamaahOptions}
          placeholder="Pilih jamaah..."
          value={jamaahId}
          onChange={(e) => {
            setJamaahId(e.target.value);
            const j = jamaahList.find((jm) => jm.id === e.target.value);
            if (j) {
              const group = groupMap.get(j.groupId);
              if (group) {
                // Optional: auto-fill group info
              }
            }
          }}
          required
        />

        {/* Selected jamaah info */}
        {jamaahId && (
          <div className="rounded-md border bg-muted/20 p-2 text-xs text-muted-foreground">
            <p>
              Group: {groupMap.get(jamaahList.find((j) => j.id === jamaahId)?.groupId ?? "")?.namaGroup ?? "-"}
            </p>
          </div>
        )}

        {/* Tipe */}
        <Select
          id="tipe"
          label="Tipe Invoice"
          options={tipeOptions}
          value={tipe}
          onChange={(e) => setTipe(e.target.value as TipeInvoice)}
        />

        {/* Jumlah */}
        <Input
          id="jumlah"
          label="Jumlah Tagihan"
          type="number"
          placeholder="Masukkan nominal"
          value={jumlah}
          onChange={(e) => setJumlah(e.target.value)}
          required
        />

        {/* Jatuh Tempo */}
        <Input
          id="jatuh-tempo"
          label="Jatuh Tempo"
          type="date"
          value={jatuhTempo}
          onChange={(e) => setJatuhTempo(e.target.value)}
          required
        />

        {/* Dynamic Items */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium leading-none">
              Item Tagihan
            </label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={handleAddItem}
            >
              <Plus className="mr-1 h-3 w-3" />
              Tambah Item
            </Button>
          </div>
          <div className="space-y-2">
            {items.map((item, idx) => (
              <div key={idx} className="flex items-start gap-2">
                <div className="flex-1">
                  <input
                    type="text"
                    placeholder="Deskripsi item"
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    value={item.deskripsi}
                    onChange={(e) =>
                      handleItemChange(idx, "deskripsi", e.target.value)
                    }
                  />
                </div>
                <div className="w-36">
                  <input
                    type="number"
                    placeholder="Jumlah"
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    value={item.jumlah}
                    onChange={(e) =>
                      handleItemChange(idx, "jumlah", e.target.value)
                    }
                  />
                </div>
                <button
                  type="button"
                  className="mt-1.5 rounded p-1 text-muted-foreground hover:text-destructive transition-colors disabled:opacity-30"
                  onClick={() => handleRemoveItem(idx)}
                  disabled={items.length === 1}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Total item: {formatCurrency(itemsTotal)}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Batal
          </Button>
          <Button type="submit" size="sm">
            <FileText className="mr-1.5 h-3.5 w-3.5" />
            Buat Invoice
          </Button>
        </div>
      </form>
    </Modal>
  );
}

const tipeLabels: Record<TipeInvoice, string> = {
  dp: "DP",
  cicilan: "Cicilan",
  pelunasan: "Pelunasan",
  tambahan: "Tambahan",
};

// --- Main Page ---

export default function InvoicePage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [pembayaranList, setPembayaranList] = useState<Pembayaran[]>([]);
  const [jamaahList, setJamaahList] = useState<Jamaah[]>([]);
  const [groupList, setGroupList] = useState<RegistrationGroup[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [showBuatModal, setShowBuatModal] = useState(false);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(
    null
  );
  const [showDetailModal, setShowDetailModal] = useState(false);

  useEffect(() => {
    async function load() {
      const [inv, pay, jam, grp] = await Promise.all([
        getInvoiceList(),
        getPembayaranList(),
        getJamaahList(),
        getGroupList(),
      ]);
      setInvoices(inv);
      setPembayaranList(pay);
      setJamaahList(jam);
      setGroupList(grp);
      setLoading(false);
    }
    load();
  }, []);

  const jamaahMap = useMemo(
    () => new Map(jamaahList.map((j) => [j.id, j])),
    [jamaahList]
  );
  const groupMap = useMemo(
    () => new Map(groupList.map((g) => [g.id, g])),
    [groupList]
  );

  // Enrich invoices with payment data
  const invoiceRows: InvoiceRow[] = useMemo(
    () =>
      invoices.map((inv) => {
        const invPayments = pembayaranList.filter(
          (p) => p.invoiceId === inv.id
        );
        const sudahDibayar = sumVerifiedPayments(invPayments);
        const jamaah = inv.jamaahId ? jamaahMap.get(inv.jamaahId) : undefined;
        const group = groupMap.get(inv.groupId);
        return {
          id: inv.id,
          nomorInvoice: inv.nomorInvoice,
          jamaahId: inv.jamaahId,
          jamaahName: jamaah?.namaLengkap ?? "Unknown",
          groupName: group?.namaGroup ?? "Unknown",
          tipe: inv.tipe,
          jumlah: inv.jumlah,
          sudahDibayar,
          sisa: inv.jumlah - sudahDibayar,
          status: inv.status,
          jatuhTempo: inv.jatuhTempo,
        };
      }),
    [invoices, pembayaranList, jamaahMap, groupMap]
  );

  // Stats
  const stats = useMemo(() => {
    const total = invoiceRows.length;
    const paid = invoiceRows.filter((r) => r.status === "paid").length;
    const unpaid = invoiceRows.filter(
      (r) => r.status === "unpaid" || r.status === "partial"
    ).length;
    const overdue = invoiceRows.filter((r) => r.status === "overdue").length;
    return { total, paid, unpaid, overdue };
  }, [invoiceRows]);

  const selectedInvoice = useMemo(
    () => invoices.find((inv) => inv.id === selectedInvoiceId) ?? null,
    [selectedInvoiceId, invoices]
  );

  const handleRowClick = (row: InvoiceRow) => {
    setSelectedInvoiceId(row.id);
    setShowDetailModal(true);
  };

  const handleBuatInvoice = useCallback(
    (data: {
      jamaahId: string;
      tipe: TipeInvoice;
      jumlah: number;
      jatuhTempo: string;
      items: { deskripsi: string; jumlah: number }[];
    }) => {
      const j = jamaahList.find((jm) => jm.id === data.jamaahId);
      const g = groupMap.get(j?.groupId ?? "");
      alert(
        `Invoice baru berhasil dibuat:\nJamaah: ${j?.namaLengkap ?? data.jamaahId}\nGroup: ${g?.namaGroup ?? "-"}\nTipe: ${tipeLabels[data.tipe]}\nJumlah: ${formatCurrency(data.jumlah)}\nJatuh Tempo: ${data.jatuhTempo}\nItems: ${data.items.length} item`
      );
      setShowBuatModal(false);
    },
    [jamaahList, groupMap]
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Memuat data invoice...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Invoice</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Kelola tagihan dan pembayaran jamaah
          </p>
        </div>
        <Button size="sm" onClick={() => setShowBuatModal(true)}>
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          Buat Invoice
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Invoice"
          value={stats.total}
          icon={FileText}
        />
        <StatCard
          label="Lunas"
          value={stats.paid}
          icon={CheckCircle2}
          variant="success"
        />
        <StatCard
          label="Belum Lunas"
          value={stats.unpaid}
          icon={Clock}
          variant="warning"
        />
        <StatCard
          label="Overdue"
          value={stats.overdue}
          icon={AlertTriangle}
          variant="danger"
        />
      </div>

      {/* Invoice Table */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              Daftar Invoice
            </CardTitle>
            <span className="text-xs text-muted-foreground">
              {invoiceRows.length} total
            </span>
          </div>
        </CardHeader>
        <CardContent>
          <Table<InvoiceRow>
            keyField="id"
            columns={[
              {
                key: "nomor",
                header: "No. Invoice",
                accessor: (r) => (
                  <span className="font-mono text-xs font-medium">
                    {r.nomorInvoice}
                  </span>
                ),
              },
              {
                key: "jamaah",
                header: "Jamaah",
                accessor: (r) => (
                  <span className="font-medium">{r.jamaahName}</span>
                ),
              },
              {
                key: "group",
                header: "Group",
                accessor: (r) => (
                  <span className="text-muted-foreground">{r.groupName}</span>
                ),
              },
              {
                key: "tipe",
                header: "Tipe",
                accessor: (r) => (
                  <Badge variant="outline" className="capitalize text-xs">
                    {tipeLabels[r.tipe]}
                  </Badge>
                ),
              },
              {
                key: "jumlah",
                header: "Jumlah",
                accessor: (r) => (
                  <span className="font-medium tabular-nums">
                    {formatCurrency(r.jumlah)}
                  </span>
                ),
                className: "text-right",
                headerClassName: "text-right",
              },
              {
                key: "sisa",
                header: "Sisa",
                accessor: (r) => (
                  <span
                    className={`font-medium tabular-nums ${
                      r.sisa > 0 ? "text-destructive" : "text-muted-foreground"
                    }`}
                  >
                    {formatCurrency(r.sisa)}
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
              {
                key: "jatuh_tempo",
                header: "Jatuh Tempo",
                accessor: (r) => (
                  <span className="tabular-nums text-sm">
                    {formatDateShort(r.jatuhTempo)}
                  </span>
                ),
              },
              {
                key: "aksi",
                header: "Aksi",
                accessor: (r) => (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedInvoiceId(r.id);
                      setShowDetailModal(true);
                    }}
                  >
                    Detail
                  </Button>
                ),
              },
            ]}
            data={invoiceRows}
            onRowClick={handleRowClick}
          />
        </CardContent>
      </Card>

      {/* Buat Invoice Modal */}
      <BuatInvoiceModal
        open={showBuatModal}
        onClose={() => setShowBuatModal(false)}
        jamaahList={jamaahList}
        groupMap={groupMap}
        onSave={handleBuatInvoice}
      />

      {/* Invoice Detail Modal */}
      <InvoiceDetailModal
        open={showDetailModal}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedInvoiceId(null);
        }}
        invoice={selectedInvoice}
        pembayaranList={pembayaranList}
        jamaahMap={jamaahMap}
        groupMap={groupMap}
        onCatatPembayaran={() => {
          // Refresh data after recording payment
          // In a real app this would call the API
        }}
      />
    </div>
  );
}
