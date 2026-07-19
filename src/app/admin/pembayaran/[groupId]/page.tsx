"use client";

import { useEffect, useState, useMemo, useCallback, Fragment } from "react";
import { useRouter } from "next/navigation";
import {
  getGroupPaymentSummary,
  addPembayaran,
  cancelInvoiceItem,
  getKeberangkatanList,
} from "@/server/actions/api";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Badge,
  StatusBadge,
  Input,
  Select,
  Table,
  Modal,
  Tabs,
} from "@/shared/components/ui";
import type {
  GroupPaymentSummary,
  Keberangkatan,
  AlokasiPembayaran,
  Jamaah,
  MetodePembayaran,
} from "@/shared/types";
import { formatCurrency, formatDate, cn } from "@/shared/lib/utils";
import { deriveGroupPaymentStatus } from "@/shared/lib/payment-utils";
import { CreditCard, Send, Plus, ArrowLeft, ChevronDown, ChevronUp, XCircle, Receipt, FileText } from "lucide-react";
import { RequirePermission } from "@/shared/components/RequirePermission";

// ============================================================
// CONSTANTS
// ============================================================

const metodeOptions: { value: MetodePembayaran; label: string }[] = [
  { value: "transfer", label: "Transfer Bank" },
  { value: "cash", label: "Tunai" },
  { value: "virtual_account", label: "Virtual Account" },
  { value: "qris", label: "QRIS" },
];

const tipeInvoiceVariant: Record<string, "info" | "warning" | "success" | "default"> = {
  dp: "info", cicilan: "warning", pelunasan: "success", tambahan: "default",
};

const tipeInvoiceLabel: Record<string, string> = {
  dp: "DP", cicilan: "Cicilan", pelunasan: "Pelunasan", tambahan: "Tambahan",
};

const paymentTabs = [
  { value: "histori", label: "Histori Pembayaran" },
  { value: "invoice", label: "Invoice" },
  { value: "anggota", label: "Anggota" },
];

function getMetodeLabel(metode: string): string {
  const map: Record<string, string> = { transfer: "Transfer", cash: "Tunai", virtual_account: "VA", qris: "QRIS" };
  return map[metode] ?? metode;
}

function getDokumenStatus(jamaah: Jamaah): string {
  const wajib = jamaah.dokumen.filter((d) => d.wajib);
  const semuaLengkap = wajib.every((d) => d.status === "lengkap" || d.status === "verified");
  return semuaLengkap ? "lengkap" : "kurang";
}

interface AlokasiFormItem {
  jamaahId: string;
  namaJamaah: string;
  jumlah: string;
  checked: boolean;
}

// ============================================================
// PAGE
// ============================================================

export default function GroupPaymentDetailPage({ params }: { params: { groupId: string } }) {
  const router = useRouter();
  const groupId = params.groupId;

  const [summary, setSummary] = useState<GroupPaymentSummary | null>(null);
  const [kbrList, setKbrList] = useState<Keberangkatan[]>([]);
  const [loading, setLoading] = useState(true);

  // Tab + expand
  const [expandedPaymentId, setExpandedPaymentId] = useState<string | null>(null);

  // Form
  const [nominal, setNominal] = useState("");
  const [metode, setMetode] = useState<MetodePembayaran>("transfer");
  const [catatan, setCatatan] = useState("");
  const [alokasiForm, setAlokasiForm] = useState<AlokasiFormItem[]>([]);
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  // Cancel item modal
  const [cancelTarget, setCancelTarget] = useState<{ invoiceId: string; itemId: string; itemKategori: string } | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelling, setCancelling] = useState(false);

  // Expanded invoices
  const [expandedInvoiceId, setExpandedInvoiceId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const [s, k] = await Promise.all([getGroupPaymentSummary(groupId), getKeberangkatanList()]);
      if (cancelled) return;
      if (s) {
        setSummary(s);
        setAlokasiForm(
          s.anggota.map((a: any) => ({ jamaahId: a.id, namaJamaah: a.namaLengkap, jumlah: "", checked: true }))
        );
      }
      setKbrList(k);
      setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, [groupId]);

  // Derived
  const selectedPaket = useMemo(() => {
    if (!summary) return null;
    return kbrList.find((k) => k.jamaahIds.some((jid) => summary.anggota.some((a) => a.id === jid))) ?? null;
  }, [summary, kbrList]);

  const nominalValue = parseFloat(nominal);
  const isNominalValid = !isNaN(nominalValue) && nominalValue > 0;
  const totalAlokasi = alokasiForm.filter((a) => a.checked).reduce((sum, a) => sum + (parseFloat(a.jumlah) || 0), 0);
  const isAlokasiValid = isNominalValid && totalAlokasi === nominalValue;
  const canSubmit = isNominalValid && isAlokasiValid && !submitting;

  // Handlers
  const handleKirimPengingat = useCallback(() => {
    if (!summary || !selectedPaket) return;
    alert(
      `Yth. ${summary.namaGroup}, tagihan sebesar ${formatCurrency(summary.sisaPembayaran)} untuk paket ${selectedPaket.paketUmroh?.namaPaket || "-"}. Mohon segera diselesaikan.`
    );
  }, [summary, selectedPaket]);

  const handleBagiRata = useCallback(() => {
    if (!isNominalValid) { setFormError("Isi nominal terlebih dahulu"); return; }
    const checkedCount = alokasiForm.filter((a) => a.checked).length;
    if (checkedCount === 0) { setFormError("Pilih minimal satu anggota"); return; }
    setFormError("");
    const perOrang = Math.floor(nominalValue / checkedCount);
    setAlokasiForm((prev) => {
      const checked = prev.filter((a) => a.checked);
      const lastId = checked[checked.length - 1]?.jamaahId;
      let sisa = nominalValue;
      return prev.map((a) => {
        if (!a.checked) return { ...a, jumlah: "0" };
        if (a.jamaahId === lastId) return { ...a, jumlah: String(sisa) };
        sisa -= perOrang;
        return { ...a, jumlah: String(perOrang) };
      });
    });
  }, [isNominalValid, nominalValue, alokasiForm]);

  const handleCancelItem = useCallback(async () => {
    if (!cancelTarget || !summary) return;
    setCancelling(true);
    try {
      await cancelInvoiceItem(
        cancelTarget.invoiceId, cancelTarget.itemId, cancelReason || "Tidak ada alasan", "Admin"
      );
      const refreshed = await getGroupPaymentSummary(groupId);
      if (refreshed) setSummary(refreshed);
      setCancelTarget(null);
      setCancelReason("");
      setSuccessMessage(`Item "${cancelTarget.itemKategori}" berhasil dibatalkan`);
      setShowSuccess(true);
    } catch {
      setFormError("Gagal membatalkan item");
    } finally {
      setCancelling(false);
    }
  }, [cancelTarget, cancelReason, summary, groupId]);

  const handleSubmit = useCallback(async () => {
    if (!canSubmit || !summary) return;
    const alokasiPayload: AlokasiPembayaran[] = alokasiForm
      .filter((a) => a.checked && parseFloat(a.jumlah) > 0)
      .map((a) => ({ jamaahId: a.jamaahId, namaJamaah: a.namaJamaah, jumlah: parseFloat(a.jumlah) }));
    const total = alokasiPayload.reduce((s, a) => s + a.jumlah, 0);
    if (total !== nominalValue) {
      setFormError(`Total alokasi (${formatCurrency(total)}) harus sama dengan nominal (${formatCurrency(nominalValue)})`);
      return;
    }
    setSubmitting(true);
    setFormError("");
    try {
      const newPembayaran = await addPembayaran({
        groupId, jumlah: nominalValue, metode, tanggal: new Date().toISOString(),
        sumber: "admin", catatan: catatan || undefined, alokasi: alokasiPayload,
      });
      setSummary((prev) => {
        if (!prev) return prev;
        const newTotalPembayaran = prev.totalPembayaran + nominalValue;
        const newSisa = prev.totalTagihan - newTotalPembayaran;
        const hasOverdue = prev.invoices.some((inv) => inv.status === "overdue");
        return {
          ...prev,
          pembayaran: [...prev.pembayaran, newPembayaran],
          totalPembayaran: newTotalPembayaran,
          sisaPembayaran: newSisa,
          status: deriveGroupPaymentStatus(prev.totalTagihan, newTotalPembayaran, newSisa, hasOverdue),
        };
      });
      setSuccessMessage(`Pembayaran ${formatCurrency(nominalValue)} berhasil dicatat untuk ${summary.namaGroup}`);
      setShowSuccess(true);
      setNominal(""); setMetode("transfer"); setCatatan("");
      setAlokasiForm((prev) => prev.map((a) => ({ ...a, jumlah: "", checked: true })));
    } catch {
      setFormError("Gagal menyimpan pembayaran");
    } finally {
      setSubmitting(false);
    }
  }, [canSubmit, summary, groupId, nominalValue, metode, catatan, alokasiForm]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Memuat detail grup...</p>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <p className="text-muted-foreground">Data grup tidak ditemukan.</p>
        <Button variant="outline" size="sm" onClick={() => router.push("/admin/pembayaran")}>
          <ArrowLeft className="mr-1 h-4 w-4" /> Kembali ke Monitoring
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Button variant="ghost" size="sm" onClick={() => router.push("/admin/pembayaran")}>
        <ArrowLeft className="mr-1 h-4 w-4" /> Kembali ke Monitoring
      </Button>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* LEFT PANEL */}
        <div className="flex-1 space-y-6 min-w-0">
          {/* Group Info Card */}
          <Card variant="operational">
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-lg font-bold">{summary.kodeRegistrasi}</h2>
                  <p className="text-sm text-muted-foreground">{summary.namaGroup}</p>
                </div>
                <Button size="sm" variant="outline" onClick={handleKirimPengingat}>
                  <Send className="mr-1.5 h-3.5 w-3.5" /> Kirim Pengingat
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Paket</p>
                  <p className="font-medium">{selectedPaket?.paketUmroh?.namaPaket ?? "-"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Anggota</p>
                  <p className="font-medium">{summary.jumlahAnggota} orang</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t">
                <div>
                  <p className="text-xs text-muted-foreground">Total Tagihan</p>
                  <p className="text-base font-bold">{formatCurrency(summary.totalTagihan)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total Dibayar</p>
                  <p className="text-base font-bold text-success">{formatCurrency(summary.totalPembayaran)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Sisa</p>
                  <div className="flex items-center gap-2">
                    <p className={cn("text-base font-bold", summary.sisaPembayaran > 0 ? "text-destructive" : "text-success")}>
                      {formatCurrency(summary.sisaPembayaran)}
                    </p>
                    <StatusBadge status={summary.status} />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tabs */}
          <Tabs tabs={paymentTabs} defaultTab="histori">
            {(activeTab) => (
              <>
                {activeTab === "histori" && (
                  <Card>
                    <CardContent className="p-0">
                      {summary.pembayaran.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-8 text-center">Belum ada histori pembayaran</p>
                      ) : (
                        <div className="relative w-full overflow-auto">
                          <table className="w-full caption-bottom text-sm dense-table">
                            <thead>
                              <tr className="border-b">
                                <th className="h-10 w-10 px-3 text-left font-medium text-muted-foreground">#</th>
                                <th className="h-10 px-3 text-left font-medium text-muted-foreground">Tanggal</th>
                                <th className="h-10 px-3 text-right font-medium text-muted-foreground">Jumlah</th>
                                <th className="h-10 px-3 text-left font-medium text-muted-foreground">Metode</th>
                                <th className="h-10 px-3 text-center font-medium text-muted-foreground">Alokasi</th>
                                <th className="h-10 px-3 text-left font-medium text-muted-foreground">Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {summary.pembayaran.map((p, idx) => (
                                <Fragment key={p.id}>
                                  <tr
                                    className="border-b hover:bg-muted/50 cursor-pointer"
                                    onClick={() => setExpandedPaymentId(expandedPaymentId === p.id ? null : p.id)}
                                  >
                                    <td className="p-3 text-xs text-muted-foreground">{idx + 1}</td>
                                    <td className="p-3">{formatDate(p.tanggal)}</td>
                                    <td className="p-3 text-right font-medium tabular-nums">{formatCurrency(p.jumlah)}</td>
                                    <td className="p-3"><Badge variant="outline">{getMetodeLabel(p.metode)}</Badge></td>
                                    <td className="p-3 text-center text-xs text-muted-foreground">{p.alokasi.length} org</td>
                                    <td className="p-3"><StatusBadge status={p.status} /></td>
                                  </tr>
                                  {expandedPaymentId === p.id && (
                                    <tr className="bg-muted/20">
                                      <td colSpan={6} className="p-0">
                                        <div className="px-12 py-3 space-y-1 border-t">
                                          <p className="text-xs font-medium text-muted-foreground mb-1.5">Rincian Alokasi:</p>
                                          {p.alokasi.map((a) => (
                                            <div key={a.jamaahId} className="flex items-center justify-between text-sm">
                                              <span className="text-muted-foreground">{a.namaJamaah}</span>
                                              <span className="font-medium tabular-nums">{formatCurrency(a.jumlah)}</span>
                                            </div>
                                          ))}
                                          {p.catatan && (
                                            <p className="text-xs text-muted-foreground pt-1.5 border-t mt-1.5">Catatan: {p.catatan}</p>
                                          )}
                                        </div>
                                      </td>
                                    </tr>
                                  )}
                                </Fragment>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {activeTab === "invoice" && (
                  <div className="space-y-3">
                    {summary.invoices.length === 0 ? (
                      <Card><CardContent><p className="text-sm text-muted-foreground py-8 text-center">Belum ada invoice</p></CardContent></Card>
                    ) : (
                      summary.invoices.map((inv) => {
                        const isExpanded = expandedInvoiceId === inv.id;
                        const activeItems = inv.items.filter((it) => it.status === "active");
                        const cancelledItems = inv.items.filter((it) => it.status === "cancelled");
                        const totalActive = activeItems.reduce((s, it) => s + it.qty * it.hargaSatuan, 0);
                        return (
                          <Card key={inv.id} variant={inv.status === "overdue" ? "operational" : "default"} className={inv.status === "overdue" ? "border-destructive/40" : ""}>
                            <CardContent className="p-4">
                              {/* Header */}
                              <div className="flex items-start justify-between cursor-pointer" onClick={() => setExpandedInvoiceId(isExpanded ? null : inv.id)}>
                                <div className="flex items-center gap-3">
                                  <Receipt className={cn("h-4 w-4", inv.status === "overdue" ? "text-destructive" : "text-muted-foreground")} />
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <span className="font-mono text-xs font-semibold">{inv.nomorInvoice}</span>
                                      <Badge variant={tipeInvoiceVariant[inv.tipe] ?? "default"}>{tipeInvoiceLabel[inv.tipe] ?? inv.tipe}</Badge>
                                      <StatusBadge status={inv.status} />
                                    </div>
                                    <p className="text-[10px] text-muted-foreground mt-0.5">
                                      Jatuh tempo: {formatDate(inv.jatuhTempo)} &middot; {inv.items.length} item ({activeItems.length} aktif, {cancelledItems.length} dibatalkan)
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-3">
                                  <div className="text-right">
                                    <p className="text-sm font-bold tabular-nums">{formatCurrency(inv.jumlah)}</p>
                                    {inv.sisaTagihan > 0 && (
                                      <p className="text-xs text-destructive tabular-nums">Sisa: {formatCurrency(inv.sisaTagihan)}</p>
                                    )}
                                  </div>
                                  {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                                </div>
                              </div>

                              {/* Expanded itemized items */}
                              {isExpanded && (
                                <div className="mt-4 space-y-3 border-t pt-4">
                                  <div>
                                    <h4 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                      <FileText className="h-3.5 w-3.5" /> Rincian Item Tagihan
                                    </h4>
                                    <div className="relative w-full overflow-auto">
                                      <table className="w-full caption-bottom text-sm dense-table">
                                        <thead>
                                          <tr className="border-b">
                                            <th className="h-8 px-2 text-left text-[11px] font-medium text-muted-foreground">Kategori</th>
                                            <th className="h-8 px-2 text-center text-[11px] font-medium text-muted-foreground w-16">Qty</th>
                                            <th className="h-8 px-2 text-right text-[11px] font-medium text-muted-foreground">Harga Satuan</th>
                                            <th className="h-8 px-2 text-right text-[11px] font-medium text-muted-foreground">Total</th>
                                            <th className="h-8 px-2 text-center text-[11px] font-medium text-muted-foreground w-20">Status</th>
                                            <th className="h-8 px-2 text-center text-[11px] font-medium text-muted-foreground w-16">Aksi</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {inv.items.map((item) => {
                                            const isCancelled = item.status === "cancelled";
                                            return (
                                              <tr key={item.id} className={cn("border-b", isCancelled && "bg-muted/30 text-muted-foreground")}>
                                                <td className="px-2 py-2">
                                                  <p className={cn("text-xs font-medium", isCancelled && "line-through")}>{item.kategori}</p>
                                                  <p className="text-[10px] text-muted-foreground">{item.deskripsi}</p>
                                                </td>
                                                <td className="px-2 py-2 text-center text-xs tabular-nums">{item.qty}</td>
                                                <td className="px-2 py-2 text-right text-xs tabular-nums">{formatCurrency(item.hargaSatuan)}</td>
                                                <td className={cn("px-2 py-2 text-right text-xs font-medium tabular-nums", isCancelled && "line-through")}>{formatCurrency(item.qty * item.hargaSatuan)}</td>
                                                <td className="px-2 py-2 text-center">
                                                  {isCancelled ? (
                                                    <Badge variant="destructive" size="sm">Dibatalkan</Badge>
                                                  ) : (
                                                    <Badge variant="success" size="sm">Aktif</Badge>
                                                  )}
                                                </td>
                                                <td className="px-2 py-2 text-center">
                                                  {!isCancelled && (
                                                    <RequirePermission module="pembayaran" action="canEdit">
                                                      <button
                                                        onClick={(e) => { e.stopPropagation(); setCancelTarget({ invoiceId: inv.id, itemId: item.id, itemKategori: item.kategori }); }}
                                                        className="text-destructive hover:bg-destructive/10 rounded p-0.5 transition-colors"
                                                        title="Batalkan item"
                                                      >
                                                        <XCircle className="h-3.5 w-3.5" />
                                                      </button>
                                                    </RequirePermission>
                                                  )}
                                                </td>
                                              </tr>
                                            );
                                          })}
                                        </tbody>
                                        <tfoot>
                                          <tr className="border-t-2">
                                            <td colSpan={3} className="px-2 py-2 text-xs font-semibold text-right">Total (Item Aktif):</td>
                                            <td className="px-2 py-2 text-right text-xs font-bold tabular-nums">{formatCurrency(totalActive)}</td>
                                            <td colSpan={2}></td>
                                          </tr>
                                        </tfoot>
                                      </table>
                                    </div>
                                  </div>

                                  {/* Cancelled items list */}
                                  {cancelledItems.length > 0 && (
                                    <div className="rounded-md bg-muted/50 p-3">
                                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                                        Item Dibatalkan ({cancelledItems.length})
                                      </p>
                                      <div className="space-y-1">
                                        {cancelledItems.map((item) => (
                                          <div key={item.id} className="flex items-center justify-between text-xs text-muted-foreground">
                                            <span className="line-through">{item.kategori} — {item.deskripsi}</span>
                                            <span>{item.cancelledAt ? formatDate(item.cancelledAt) : "-"}</span>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  <p className="text-[10px] text-muted-foreground italic">
                                    Total dihitung otomatis: Grand Total = Qty x Harga Satuan (item aktif)
                                  </p>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        );
                      })
                    )}
                  </div>
                )}

                {activeTab === "anggota" && (
                  <Card>
                    <CardContent>
                      <Table<Jamaah>
                        keyField="id"
                        columns={[
                          { key: "regId", header: "Reg ID", accessor: (r) => <span className="font-mono text-xs">{r.registrationId}</span> },
                          { key: "nama", header: "Nama", accessor: (r) => <span className="font-medium">{r.namaLengkap}</span> },
                          { key: "telepon", header: "Telepon", accessor: (r) => <span className="text-xs text-muted-foreground">{r.nomorTelepon}</span> },
                          { key: "status", header: "Status", accessor: (r) => <StatusBadge status={r.status} /> },
                          { key: "dokumen", header: "Dokumen", accessor: (r) => <StatusBadge status={getDokumenStatus(r)} /> },
                        ]}
                        data={summary.anggota}
                        emptyMessage="Belum ada anggota"
                      />
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </Tabs>
        </div>

        {/* RIGHT PANEL: Payment Form */}
        <div className="w-full lg:w-96 shrink-0">
          <div className="lg:sticky lg:top-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium uppercase tracking-wider">
                  <span className="flex items-center gap-2"><Plus className="h-4 w-4" /> Tambah Pembayaran</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input id="f-nominal" label="Nominal" type="number" placeholder="Rp ..." value={nominal} onChange={(e) => { setNominal(e.target.value); setFormError(""); }} />
                <Select id="f-metode" label="Metode" options={metodeOptions} value={metode} onChange={(e) => setMetode(e.target.value as MetodePembayaran)} />
                <Input id="f-catatan" label="Catatan" placeholder="Opsional" value={catatan} onChange={(e) => setCatatan(e.target.value)} />

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium">Alokasi</p>
                    <Button size="sm" variant="outline" className="h-6 text-[10px] px-2" onClick={handleBagiRata} type="button">Bagi Rata</Button>
                  </div>
                  <div className="space-y-1.5 max-h-64 overflow-y-auto">
                    {alokasiForm.map((item) => (
                      <div key={item.jamaahId} className="flex items-center gap-2">
                        <input type="checkbox" checked={item.checked} onChange={(e) => setAlokasiForm((prev) => prev.map((a) => a.jamaahId === item.jamaahId ? { ...a, checked: e.target.checked } : a))} className="h-4 w-4 shrink-0 rounded" />
                        <span className="text-xs flex-1 truncate">{item.namaJamaah}</span>
                        <input type="number" value={item.jumlah} onChange={(e) => setAlokasiForm((prev) => prev.map((a) => a.jamaahId === item.jamaahId ? { ...a, jumlah: e.target.value } : a))} placeholder="Rp" disabled={!item.checked} className="h-7 w-28 rounded-md border border-input bg-transparent px-2 text-xs text-right tabular-nums disabled:opacity-40 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
                      </div>
                    ))}
                  </div>
                  {alokasiForm.some((a) => a.checked) && (
                    <div className="flex items-center justify-between text-xs pt-2 mt-2 border-t">
                      <span className="text-muted-foreground">Total alokasi:</span>
                      <span className={cn("font-medium tabular-nums", isAlokasiValid ? "text-success" : "text-destructive")}>{formatCurrency(totalAlokasi)}</span>
                    </div>
                  )}
                </div>

                {formError && <p className="text-xs text-destructive">{formError}</p>}

                <RequirePermission module="pembayaran" action="canEdit">
                  <Button className="w-full" size="sm" onClick={handleSubmit} disabled={!canSubmit}>
                    <CreditCard className="mr-1.5 h-4 w-4" /> {submitting ? "Menyimpan..." : "Catat Pembayaran"}
                  </Button>
                </RequirePermission>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Cancel Item Modal */}
      <Modal
        open={cancelTarget !== null}
        onClose={() => { setCancelTarget(null); setCancelReason(""); }}
        title="Batalkan Item Invoice"
        description={`Item: ${cancelTarget?.itemKategori ?? ""}`}
        size="sm"
      >
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Alasan Pembatalan</label>
            <select
              className="mt-1.5 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
            >
              <option value="">Pilih alasan...</option>
              <option value="Kesalahan input">Kesalahan input</option>
              <option value="Perubahan paket">Perubahan paket</option>
              <option value="Permintaan jamaah">Permintaan jamaah</option>
              <option value="Diskon khusus">Diskon khusus</option>
              <option value="Lainnya">Lainnya</option>
            </select>
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" size="sm" onClick={() => { setCancelTarget(null); setCancelReason(""); }}>
              Batal
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={!cancelReason || cancelling}
              onClick={() => handleCancelItem()}
            >
              {cancelling ? "Membatalkan..." : "Konfirmasi Pembatalan"}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={showSuccess} onClose={() => setShowSuccess(false)} title="Berhasil" size="sm">
        <p className="text-sm">{successMessage}</p>
        <div className="flex justify-end mt-4"><Button size="sm" onClick={() => setShowSuccess(false)}>Tutup</Button></div>
      </Modal>
    </div>
  );
}
