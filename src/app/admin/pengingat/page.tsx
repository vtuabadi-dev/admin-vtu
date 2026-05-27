"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import {
  getReminderList,
  getJamaahList,
  getInvoiceList,
} from "@/services/mock/handlers";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Table,
  Button,
  Badge,
  Modal,
  Select,
  Input,
  Tabs,
} from "@/shared/components/ui";
import type { Reminder, Jamaah, Invoice } from "@/shared/types";
import { formatDate, formatCurrency } from "@/shared/lib/utils";
import {
  Bell,
  BellRing,
  Send,
  Eye,
  MessageCircle,
  MessageSquareText,
  Users,
} from "lucide-react";

// --- Status style config ---

const statusIconMap: Record<string, typeof Bell> = {
  sent: Bell,
  read: Eye,
  responded: MessageCircle,
};

const statusColorMap: Record<string, string> = {
  sent: "bg-info/10 text-info border-info/20",
  read: "bg-success/10 text-success border-success/20",
  responded: "bg-primary/10 text-primary border-primary/20",
};

// --- Reminder Template ---

const PAYMENT_TEMPLATE = `Yth. {nama_jamaah},

Kami mengingatkan bahwa tagihan {nomor_invoice} dengan jumlah {jumlah_tagihan} akan jatuh tempo pada {jatuh_tempo}. Mohon segera melakukan pembayaran untuk kelancaran proses keberangkatan Umroh.

Terima kasih,
Tim Operasional`;

const DOKUMEN_TEMPLATE = `Yth. {nama_jamaah},

Kami mengingatkan bahwa dokumen {jenis_dokumen} Anda belum dilengkapi. Mohon segera upload dokumen yang diperlukan melalui sistem untuk proses verifikasi.

Terima kasih,
Tim Operasional`;

// --- Helper ---

function getTemplate(tipe: "dokumen" | "pembayaran"): string {
  return tipe === "pembayaran" ? PAYMENT_TEMPLATE : DOKUMEN_TEMPLATE;
}

// --- Main Page ---

export default function PengingatPage() {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [jamaahList, setJamaahList] = useState<Jamaah[]>([]);
  const [invoiceList, setInvoiceList] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal state
  const [showKirimModal, setShowKirimModal] = useState(false);
  const [showMassalModal, setShowMassalModal] = useState(false);

  // Active tab
  const [activeTab, setActiveTab] = useState("pembayaran");

  // Batch selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    async function load() {
      const [rem, jam, inv] = await Promise.all([
        getReminderList(),
        getJamaahList(),
        getInvoiceList(),
      ]);
      setReminders(rem);
      setJamaahList(jam);
      setInvoiceList(inv);
      setLoading(false);
    }
    load();
  }, []);

  // Build jamaah map
  const jamaahMap = useMemo(
    () => new Map(jamaahList.map((j) => [j.id, j])),
    [jamaahList]
  );

  const invoiceMap = useMemo(
    () => new Map(invoiceList.map((inv) => [inv.id, inv])),
    [invoiceList]
  );

  // Filter reminders by active tab
  const filteredReminders = useMemo(
    () => reminders.filter((r) => r.tipe === activeTab),
    [reminders, activeTab]
  );

  // Toggle batch selection
  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  // Stats
  const stats = useMemo(() => {
    const tabReminders = reminders.filter((r) => r.tipe === activeTab);
    const sent = tabReminders.filter((r) => r.status === "sent").length;
    const read = tabReminders.filter((r) => r.status === "read").length;
    const responded = tabReminders.filter(
      (r) => r.status === "responded"
    ).length;
    return { total: tabReminders.length, sent, read, responded };
  }, [reminders, activeTab]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Memuat data pengingat...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Pengingat &amp; Reminder
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Kelola pengingat pembayaran dan dokumen untuk jamaah
          </p>
        </div>
        <div className="flex items-center gap-2">
          {selectedIds.size > 0 && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                alert(
                  `Pengingat batch akan dikirim ke ${selectedIds.size} jamaah terpilih`
                );
                setSelectedIds(new Set());
              }}
            >
              <Send className="mr-1.5 h-3.5 w-3.5" />
              Kirim ke {selectedIds.size} Terpilih
            </Button>
          )}
          <Button size="sm" onClick={() => setShowKirimModal(true)}>
            <Bell className="mr-1.5 h-3.5 w-3.5" />
            Kirim Pengingat Baru
          </Button>
          <Button size="sm" variant="outline" onClick={() => setShowMassalModal(true)}>
            <Users className="mr-1.5 h-3.5 w-3.5" />
            Kirim Massal Personal
          </Button>
        </div>
      </div>

      {/* Mini Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
                  Total
                </p>
                <p className="text-2xl font-bold mt-0.5">{stats.total}</p>
              </div>
              <BellRing className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
                  Terkirim
                </p>
                <p className="text-2xl font-bold mt-0.5 text-info">
                  {stats.sent}
                </p>
              </div>
              <Send className="h-5 w-5 text-info" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
                  Dibaca
                </p>
                <p className="text-2xl font-bold mt-0.5 text-success">
                  {stats.read}
                </p>
              </div>
              <Eye className="h-5 w-5 text-success" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
                  Direspon
                </p>
                <p className="text-2xl font-bold mt-0.5 text-primary">
                  {stats.responded}
                </p>
              </div>
              <MessageCircle className="h-5 w-5 text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs & Table */}
      <Card>
        <CardHeader className="pb-0">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              Riwayat Pengingat
            </CardTitle>
            {selectedIds.size > 0 && (
              <span className="text-xs text-muted-foreground">
                {selectedIds.size} dipilih
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <Tabs
            tabs={[
              {
                value: "pembayaran",
                label: "Pengingat Pembayaran",
                count: reminders.filter((r) => r.tipe === "pembayaran").length,
              },
              {
                value: "dokumen",
                label: "Pengingat Dokumen",
                count: reminders.filter((r) => r.tipe === "dokumen").length,
              },
            ]}
            defaultTab={activeTab}
            onTabChange={(v) => {
              setActiveTab(v);
              setSelectedIds(new Set());
            }}
          >
            {(tab) => (
              <Table<Reminder>
                keyField="id"
                columns={[
                  {
                    key: "checkbox",
                    header: "",
                    accessor: (r) => (
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-gray-300 accent-primary"
                        checked={selectedIds.has(r.id)}
                        onChange={() => toggleSelect(r.id)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    ),
                    className: "w-8",
                  },
                  {
                    key: "jamaah",
                    header: "Jamaah",
                    accessor: (r) => {
                      const j = r.jamaahId ? jamaahMap.get(r.jamaahId) : undefined;
                      return (
                        <span className="font-medium">
                          {j?.namaLengkap ?? "Unknown"}
                        </span>
                      );
                    },
                  },
                  {
                    key: "referensi",
                    header:
                      tab === "pembayaran" ? "Invoice" : "Dokumen",
                    accessor: (r) => {
                      if (tab === "pembayaran" && r.invoiceId) {
                        const inv = invoiceMap.get(r.invoiceId);
                        return (
                          <span className="font-mono text-xs">
                            {inv?.nomorInvoice ?? r.invoiceId}
                          </span>
                        );
                      }
                      return (
                        <span className="text-sm">
                          {tab === "dokumen" ? "Dokumen Jamaah" : "-"}
                        </span>
                      );
                    },
                  },
                  {
                    key: "pesan",
                    header: "Pesan",
                    accessor: (r) => (
                      <div className="max-w-xs truncate text-sm text-muted-foreground">
                        {r.pesan}
                      </div>
                    ),
                  },
                  {
                    key: "dikirim",
                    header: "Dikirim Pada",
                    accessor: (r) => (
                      <span className="tabular-nums text-sm whitespace-nowrap">
                        {formatDate(r.dikirimPada)}
                      </span>
                    ),
                  },
                  {
                    key: "status",
                    header: "Status",
                    accessor: (r) => {
                      const Icon = statusIconMap[r.status] ?? Bell;
                      return (
                        <Badge
                          variant="outline"
                          className={statusColorMap[r.status]}
                        >
                          <Icon className="mr-1 h-3 w-3" />
                          {r.status === "sent"
                            ? "Terkirim"
                            : r.status === "read"
                            ? "Dibaca"
                            : "Direspon"}
                        </Badge>
                      );
                    },
                  },
                ]}
                data={filteredReminders}
                onRowClick={(r) => toggleSelect(r.id)}
                emptyMessage={
                  tab === "pembayaran"
                    ? "Belum ada pengingat pembayaran"
                    : "Belum ada pengingat dokumen"
                }
              />
            )}
          </Tabs>
        </CardContent>
      </Card>

      {/* Kirim Pengingat Baru Modal */}
      <KirimPengingatModal
        open={showKirimModal}
        onClose={() => setShowKirimModal(false)}
        jamaahList={jamaahList}
        invoiceList={invoiceList}
        onSend={(data) => {
          alert(
            `Pengingat berhasil dikirim:\nJamaah: ${data.jamaahNama}\nTipe: ${data.tipe}\nPesan: ${data.pesan.substring(0, 50)}...`
          );
          setShowKirimModal(false);
        }}
      />

      {/* Kirim Massal Personal Modal */}
      <KirimMassalModal
        open={showMassalModal}
        onClose={() => setShowMassalModal(false)}
        jamaahList={jamaahList}
        onSend={(data) => {
          alert(
            `[MOCK] ${data.count} pengingat personal terkirim!\n\nTipe: ${data.tipe}\nTemplate dipersonalisasi per jamaah.\n\nPenerima: ${data.names.slice(0, 5).join(", ")}${data.names.length > 5 ? `\n... dan ${data.names.length - 5} lainnya` : ""}`
          );
          setShowMassalModal(false);
        }}
      />
    </div>
  );
}

// --- Kirim Massal Personal Modal ---

function KirimMassalModal({
  open,
  onClose,
  jamaahList,
  onSend,
}: {
  open: boolean;
  onClose: () => void;
  jamaahList: Jamaah[];
  onSend: (data: { count: number; names: string[]; tipe: string }) => void;
}) {
  const [tipe, setTipe] = useState<"dokumen" | "pembayaran">("pembayaran");
  const [pesan, setPesan] = useState(PAYMENT_TEMPLATE);
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    setPesan(getTemplate(tipe));
  }, [tipe]);

  // Filter jamaah by search
  const filteredJamaah = jamaahList
    .filter((j) => !search || j.namaLengkap.toLowerCase().includes(search.toLowerCase()) || j.nomorPeserta.toLowerCase().includes(search.toLowerCase()))
    .slice(0, 50); // Limit for performance

  const toggleJamaah = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === filteredJamaah.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredJamaah.map((j) => j.id)));
    }
  };

  const selectedJamaahList = jamaahList.filter((j) => selectedIds.has(j.id));
  const previewJamaah = selectedJamaahList[0];

  // Preview for first selected jamaah
  const previewPesan = previewJamaah
    ? pesan
        .replace(/{nama_jamaah}/g, previewJamaah.namaLengkap)
        .replace(/{nomor_invoice}/g, "[No Invoice]")
        .replace(/{jumlah_tagihan}/g, "[Jumlah]")
        .replace(/{jatuh_tempo}/g, "[Tgl Jatuh Tempo]")
        .replace(/{jenis_dokumen}/g, "paspor, KTP, KK")
    : pesan;

  const handleSubmit = () => {
    if (selectedIds.size === 0) return;
    onSend({
      count: selectedIds.size,
      names: selectedJamaahList.map((j) => j.namaLengkap),
      tipe,
    });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Kirim Pengingat Massal Personal"
      description={`Template dipersonalisasi dengan data masing-masing jamaah`}
      size="xl"
    >
      <div className="space-y-4">
        {/* Tipe */}
        <Select
          label="Tipe Pengingat"
          options={[
            { value: "pembayaran", label: "Pengingat Pembayaran" },
            { value: "dokumen", label: "Pengingat Dokumen" },
          ]}
          value={tipe}
          onChange={(e) => setTipe(e.target.value as "dokumen" | "pembayaran")}
        />

        {/* Template */}
        <div>
          <label className="text-sm font-medium">Template Pesan</label>
          <textarea
            className="mt-1.5 flex min-h-[120px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            value={pesan}
            onChange={(e) => setPesan(e.target.value)}
          />
          <p className="text-xs text-muted-foreground mt-1">
            Variabel: <code className="rounded bg-muted px-1">{"{nama_jamaah}"}</code>,{" "}
            <code className="rounded bg-muted px-1">{"{nomor_invoice}"}</code>,{" "}
            <code className="rounded bg-muted px-1">{"{jumlah_tagihan}"}</code>,{" "}
            <code className="rounded bg-muted px-1">{"{jatuh_tempo}"}</code>
            {tipe === "dokumen" && (
              <>, <code className="rounded bg-muted px-1">{"{jenis_dokumen}"}</code></>
            )}
          </p>
        </div>

        {/* Preview */}
        {selectedIds.size > 0 && (
          <div className="rounded-md border bg-muted/20 p-3">
            <p className="text-xs font-medium mb-1">Preview (Jamaah Pertama):</p>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{previewPesan}</p>
          </div>
        )}

        {/* Jamaah selector */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium">
              Pilih Jamaah ({selectedIds.size} terpilih)
            </label>
            <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={toggleAll}>
              {selectedIds.size === filteredJamaah.length ? "Clear" : "Pilih Semua"}
            </Button>
          </div>
          <Input
            placeholder="Cari jamaah..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="mb-2"
          />
          <div className="max-h-48 overflow-y-auto rounded-md border">
            {filteredJamaah.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Tidak ada jamaah</p>
            ) : (
              filteredJamaah.map((j) => (
                <label
                  key={j.id}
                  className="flex items-center gap-3 px-3 py-2 hover:bg-muted/50 cursor-pointer border-b last:border-b-0"
                >
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-input"
                    checked={selectedIds.has(j.id)}
                    onChange={() => toggleJamaah(j.id)}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{j.namaLengkap}</p>
                    <p className="text-[10px] text-muted-foreground">{j.nomorPeserta}</p>
                  </div>
                </label>
              ))
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-2 border-t">
          <p className="text-xs text-muted-foreground">
            Akan dikirim ke <strong>{selectedIds.size}</strong> jamaah dengan personalisasi data masing-masing
          </p>
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Batal
            </Button>
            <Button size="sm" disabled={selectedIds.size === 0} onClick={handleSubmit}>
              <Send className="mr-1.5 h-3.5 w-3.5" />
              Kirim ke {selectedIds.size} Jamaah
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

// --- Kirim Pengingat Modal ---

function KirimPengingatModal({
  open,
  onClose,
  jamaahList,
  invoiceList,
  onSend,
}: {
  open: boolean;
  onClose: () => void;
  jamaahList: Jamaah[];
  invoiceList: Invoice[];
  onSend: (data: {
    jamaahId: string;
    jamaahNama: string;
    tipe: "dokumen" | "pembayaran";
    invoiceId: string;
    pesan: string;
  }) => void;
}) {
  const [jamaahId, setJamaahId] = useState("");
  const [tipe, setTipe] = useState<"dokumen" | "pembayaran">("pembayaran");
  const [invoiceId, setInvoiceId] = useState("");
  const [pesan, setPesan] = useState(PAYMENT_TEMPLATE);
  const [showPreview, setShowPreview] = useState(false);

  // Find selected jamaah
  const selectedJamaah = jamaahList.find((j) => j.id === jamaahId);

  // Filter invoices for selected jamaah
  const jamaahInvoices = useMemo(
    () => invoiceList.filter((inv) => inv.jamaahId === jamaahId),
    [invoiceList, jamaahId]
  );

  // Reset form when tipe changes
  useEffect(() => {
    setPesan(getTemplate(tipe));
    if (tipe === "dokumen") {
      setInvoiceId("");
    }
  }, [tipe]);

  const invoiceMap = useMemo(
    () => new Map(invoiceList.map((inv) => [inv.id, inv])),
    [invoiceList]
  );

  // Build preview
  const previewPesan = useMemo(() => {
    const inv = invoiceMap.get(invoiceId);
    return pesan
      .replace(/{nama_jamaah}/g, selectedJamaah?.namaLengkap ?? "[Nama Jamaah]")
      .replace(/{nomor_invoice}/g, inv?.nomorInvoice ?? "[No Invoice]")
      .replace(
        /{jumlah_tagihan}/g,
        inv
          ? `Rp ${inv.jumlah.toLocaleString("id-ID")}`
          : "[Jumlah Tagihan]"
      )
      .replace(/{jatuh_tempo}/g, inv?.jatuhTempo ?? "[Tgl Jatuh Tempo]")
      .replace(/{jenis_dokumen}/g, "paspor, KTP, KK");
  }, [pesan, selectedJamaah, invoiceId, invoiceMap]);

  const jamaahOptions = jamaahList.map((j) => ({
    value: j.id,
    label: `${j.namaLengkap} (${j.nomorPeserta})`,
  }));

  const tipeOptions = [
    { value: "pembayaran", label: "Pengingat Pembayaran" },
    { value: "dokumen", label: "Pengingat Dokumen" },
  ];

  const invoiceOptions = jamaahInvoices.map((inv) => ({
    value: inv.id,
    label: `${inv.nomorInvoice} - ${formatCurrency(inv.jumlah)} (${inv.status})`,
  }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!jamaahId || !pesan) return;

    const j = jamaahList.find((jm) => jm.id === jamaahId);
    onSend({
      jamaahId,
      jamaahNama: j?.namaLengkap ?? "Unknown",
      tipe,
      invoiceId,
      pesan: previewPesan,
    });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Kirim Pengingat Baru"
      description="Buat dan kirim pengingat ke jamaah"
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
            setInvoiceId("");
          }}
          required
        />

        {/* Selected jamaah info */}
        {selectedJamaah && (
          <div className="rounded-md border bg-muted/20 p-2 text-xs text-muted-foreground flex items-center gap-2">
            <Users className="h-3.5 w-3.5" />
            {selectedJamaah.namaLengkap} &middot; {selectedJamaah.nomorPeserta}
            &middot; {selectedJamaah.nomorTelepon}
          </div>
        )}

        {/* Tipe */}
        <Select
          id="tipe"
          label="Tipe Pengingat"
          options={tipeOptions}
          value={tipe}
          onChange={(e) =>
            setTipe(e.target.value as "dokumen" | "pembayaran")
          }
        />

        {/* Invoice terkait (conditional) */}
        {tipe === "pembayaran" && (
          <Select
            id="invoice"
            label="Invoice Terkait (opsional)"
            options={invoiceOptions}
            placeholder="Pilih invoice..."
            value={invoiceId}
            onChange={(e) => setInvoiceId(e.target.value)}
          />
        )}

        {/* Pesan */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium leading-none">
              Pesan Template
            </label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 text-xs"
              onClick={() => setShowPreview(!showPreview)}
            >
              {showPreview ? "Edit" : "Preview"}
              <MessageSquareText className="ml-1 h-3 w-3" />
            </Button>
          </div>
          {showPreview ? (
            <div className="rounded-md border bg-muted/20 p-3 text-sm whitespace-pre-wrap min-h-[120px]">
              {previewPesan}
            </div>
          ) : (
            <textarea
              className="flex min-h-[120px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              value={pesan}
              onChange={(e) => setPesan(e.target.value)}
              required
            />
          )}
        </div>

        {/* Template variables help */}
        {!showPreview && (
          <div className="text-xs text-muted-foreground">
            Gunakan variable:{" "}
            <code className="rounded bg-muted px-1">{"{nama_jamaah}"}</code>,{" "}
            <code className="rounded bg-muted px-1">{"{nomor_invoice}"}</code>,{" "}
            <code className="rounded bg-muted px-1">
              {"{jumlah_tagihan}"}
            </code>
            ,{" "}
            <code className="rounded bg-muted px-1">{"{jatuh_tempo}"}</code>
            {tipe === "dokumen" && (
              <>
                ,{" "}
                <code className="rounded bg-muted px-1">
                  {"{jenis_dokumen}"}
                </code>
              </>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Batal
          </Button>
          <Button type="submit" size="sm">
            <Send className="mr-1.5 h-3.5 w-3.5" />
            Kirim Pengingat
          </Button>
        </div>
      </form>
    </Modal>
  );
}
