"use client";

import { useEffect, useState, useCallback } from "react";
import {
  getInvoiceByJamaah,
  submitJamaahPayment,
} from "@/services/mock/handlers";
import {
  Card,
  CardContent,
  CardFooter,
} from "@/shared/components/ui/Card";
import {
  Badge,
  StatusBadge,
  Button,
  Tabs,
  Modal,
  Select,
  Input,
} from "@/shared/components/ui";
import { formatCurrency, formatDate } from "@/shared/lib/utils";
import {
  CircleDollarSign,
  Receipt,
  AlertTriangle,
  CheckCircle2,
  CalendarClock,
  Clock,
  Upload,
  Building2,
} from "lucide-react";
import { LoadingSkeleton } from "@/shared/components/LoadingSkeleton";
import { EmptyState } from "@/shared/components/EmptyState";
import type { Invoice } from "@/shared/types";

const JAMAHA_ID = "jmh-001";

// ============================================================
// Bayar Modal
// ============================================================
const BANK_OPTIONS = [
  { value: "BSI", label: "BSI (Bank Syariah Indonesia)" },
  { value: "BCA", label: "BCA" },
  { value: "Mandiri", label: "Mandiri" },
  { value: "BNI", label: "BNI" },
  { value: "BRI", label: "BRI" },
  { value: "CIMB Niaga", label: "CIMB Niaga" },
  { value: "Muamalat", label: "Bank Muamalat" },
  { value: "Lainnya", label: "Lainnya" },
];

function BayarModal({
  invoice,
  open,
  onClose,
}: {
  invoice: Invoice | null;
  open: boolean;
  onClose: () => void;
}) {
  const [nominal, setNominal] = useState("");
  const [bankPengirim, setBankPengirim] = useState("");
  const [buktiFile, setBuktiFile] = useState<string>("");
  const [catatan, setCatatan] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      setNominal("");
      setBankPengirim("");
      setBuktiFile("");
      setCatatan("");
      setSubmitting(false);
      setSubmitted(false);
    }
  }, [open]);

  if (!invoice) return null;

  const handleConfirm = async () => {
    if (!nominal || !bankPengirim) return;
    setSubmitting(true);
    try {
      await submitJamaahPayment({
        groupId: invoice.groupId,
        invoiceId: invoice.id,
        jumlah: parseFloat(nominal),
        bankPengirim,
        buktiUrl: buktiFile || undefined,
        catatan: catatan || undefined,
      });
      setSubmitted(true);
    } catch {
      window.alert("Gagal mengajukan pembayaran. Silakan coba lagi.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setBuktiFile(file.name);
    }
  };

  const nominalValue = parseFloat(nominal);
  const isValid = !isNaN(nominalValue) && nominalValue > 0 && bankPengirim !== "";

  if (submitted) {
    return (
      <Modal open={open} onClose={onClose} title="Pembayaran Diajukan" size="sm">
        <div className="space-y-4 text-center">
          <CheckCircle2 className="h-10 w-10 text-success mx-auto" />
          <div>
            <p className="text-sm font-semibold">Pembayaran Berhasil Diajukan</p>
            <p className="text-xs text-muted-foreground mt-1">
              Pembayaran sebesar <strong>{formatCurrency(nominalValue)}</strong> untuk{" "}
              <strong>{invoice.nomorInvoice}</strong> telah dicatat.
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Status: <Badge variant="warning" size="sm">Menunggu Verifikasi Admin</Badge>
            </p>
          </div>
          <Button size="sm" onClick={onClose} className="w-full">
            Tutup
          </Button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Konfirmasi Pembayaran"
      description={invoice.nomorInvoice}
      size="sm"
    >
      <div className="space-y-4">
        {/* Invoice summary */}
        <div className="rounded-md bg-muted p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Tagihan</span>
            <span className="font-medium">{formatCurrency(invoice.jumlah)}</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Sisa yang harus dibayar</span>
            <span className="text-lg font-bold text-destructive">
              {formatCurrency(invoice.sisaTagihan)}
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
            <span>Jatuh tempo</span>
            <span>{formatDate(invoice.jatuhTempo)}</span>
          </div>
        </div>

        {/* Form fields */}
        <Input
          label="Nominal Transfer"
          type="number"
          placeholder="Rp ..."
          value={nominal}
          onChange={(e) => setNominal(e.target.value)}
          id="modal-nominal"
        />

        <Select
          label="Bank Pengirim"
          options={BANK_OPTIONS}
          value={bankPengirim}
          onChange={(e) => setBankPengirim(e.target.value)}
          placeholder="Pilih bank pengirim..."
          id="modal-bank"
        />

        <div>
          <label className="text-sm font-medium">Upload Bukti Transfer</label>
          <div className="mt-1.5">
            <label className="flex items-center gap-2 rounded-md border border-input px-3 py-2 text-sm cursor-pointer hover:bg-muted/50 transition-colors">
              <Upload className="h-4 w-4 text-muted-foreground" />
              <span className={buktiFile ? "text-foreground text-xs" : "text-muted-foreground text-xs"}>
                {buktiFile || "Pilih file (JPG/PNG/PDF)"}
              </span>
              <input
                type="file"
                accept=".jpg,.jpeg,.png,.pdf"
                className="hidden"
                onChange={handleFileChange}
              />
            </label>
          </div>
        </div>

        <Input
          label="Catatan"
          placeholder="Opsional: catatan untuk admin"
          value={catatan}
          onChange={(e) => setCatatan(e.target.value)}
          id="modal-catatan"
        />

        <div className="rounded-md bg-warning/10 border border-warning/20 p-2.5">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" />
            <p className="text-[11px] text-warning-foreground">
              Pembayaran yang diajukan akan masuk ke antrian verifikasi admin.
              Status pembayaran akan berubah setelah admin menyetujui bukti transfer.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Button className="w-full" onClick={handleConfirm} disabled={!isValid || submitting}>
            <Building2 className="mr-1 h-4 w-4" />
            {submitting ? "Mengajukan..." : "Ajukan Pembayaran"}
          </Button>
          <Button variant="outline" className="w-full" onClick={onClose} disabled={submitting}>
            Batal
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ============================================================
// Single Tagihan Card
// ============================================================
function TagihanCard({
  invoice,
  onBayar,
}: {
  invoice: Invoice;
  onBayar: (inv: Invoice) => void;
}) {
  const isOverdue = invoice.status === "overdue";
  const isPaid = invoice.status === "paid";

  const tipeLabel: Record<string, string> = {
    dp: "Down Payment",
    cicilan: "Cicilan",
    pelunasan: "Pelunasan",
    tambahan: "Tambahan",
  };

  return (
    <Card
      className={`transition-all hover:shadow-md ${
        isOverdue
          ? "border-destructive bg-destructive/5"
          : isPaid
            ? "border-success/30"
            : invoice.status === "partial"
              ? "border-warning/30"
              : ""
      }`}
    >
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                isPaid
                  ? "bg-success/10"
                  : isOverdue
                    ? "bg-destructive/10"
                    : "bg-muted"
              }`}
            >
              {isPaid ? (
                <CheckCircle2 className="h-5 w-5 text-success" />
              ) : isOverdue ? (
                <AlertTriangle className="h-5 w-5 text-destructive" />
              ) : (
                <Receipt className="h-5 w-5 text-muted-foreground" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="font-semibold text-sm">{invoice.nomorInvoice}</p>
                <StatusBadge status={invoice.status} />
              </div>
              <p className="text-xs text-muted-foreground">
                {tipeLabel[invoice.tipe] ?? invoice.tipe}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className={`text-xl font-bold ${isOverdue ? "text-destructive" : ""}`}>
              {formatCurrency(invoice.jumlah)}
            </p>
            {invoice.sisaTagihan > 0 && !isPaid && (
              <p className="text-xs text-destructive">
                Sisa: {formatCurrency(invoice.sisaTagihan)}
              </p>
            )}
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <CalendarClock className="h-3 w-3" />
            Jatuh tempo: {formatDate(invoice.jatuhTempo)}
          </span>
          {invoice.items.length > 0 && (
            <span>{invoice.items.length} item</span>
          )}
        </div>

        {/* Overdue warning */}
        {isOverdue && (
          <div className="mt-3 flex items-center gap-1.5 rounded-md bg-destructive/10 p-2">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-destructive" />
            <p className="text-xs text-destructive">
              Tagihan ini sudah melewati jatuh tempo. Segera lakukan pembayaran untuk menghindari denda.
            </p>
          </div>
        )}

        {/* Partial payment info */}
        {invoice.status === "partial" && (
          <div className="mt-3 flex items-center gap-1.5 rounded-md bg-warning/10 p-2">
            <Clock className="h-3.5 w-3.5 shrink-0 text-warning" />
            <p className="text-xs text-warning-foreground">
              Pembayaran sebagian telah diterima. Sisa: {formatCurrency(invoice.sisaTagihan)}
            </p>
          </div>
        )}
      </CardContent>

      {!isPaid && (
        <CardFooter>
          <div className="flex w-full items-center justify-between">
            <span className="text-sm font-medium">
              {invoice.sisaTagihan > 0
                ? `Sisa: ${formatCurrency(invoice.sisaTagihan)}`
                : "Belum dibayar"}
            </span>
            <Button
              size="sm"
              variant={isOverdue ? "destructive" : "default"}
              onClick={() => onBayar(invoice)}
            >
              <CircleDollarSign className="mr-1 h-3.5 w-3.5" />
              Bayar Sekarang
            </Button>
          </div>
        </CardFooter>
      )}
    </Card>
  );
}

// ============================================================
// Filter logic
// ============================================================
function filterInvoices(
  invoices: Invoice[],
  filter: string
): Invoice[] {
  switch (filter) {
    case "unpaid":
      return invoices.filter((inv) => inv.status !== "paid" && inv.status !== "cancelled");
    case "lunas":
      return invoices.filter((inv) => inv.status === "paid");
    default:
      return invoices;
  }
}

// ============================================================
// Tagihan Page
// ============================================================
export default function TagihanPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [showBayarModal, setShowBayarModal] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const invs = await getInvoiceByJamaah(JAMAHA_ID);
        setInvoices(invs);
      } catch (err) {
        console.error("Failed to load tagihan:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleBayar = useCallback((inv: Invoice) => {
    setSelectedInvoice(inv);
    setShowBayarModal(true);
  }, []);

  // Calculate counts per status
  const countBelumBayar = invoices.filter((inv) => inv.status !== "paid" && inv.status !== "cancelled").length;
  const countLunas = invoices.filter((inv) => inv.status === "paid").length;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <div className="h-7 w-48 animate-pulse rounded-md bg-muted" />
          <div className="h-4 w-80 animate-pulse rounded-md bg-muted" />
        </div>
        <LoadingSkeleton variant="card" rows={3} />
      </div>
    );
  }

  const totalTagihan = invoices.reduce((sum, inv) => sum + inv.jumlah, 0);
  const totalSisa = invoices.reduce((sum, inv) => sum + inv.sisaTagihan, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Tagihan Saya</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Kelola dan lakukan pembayaran tagihan paket umroh/haji Anda
        </p>
      </div>

      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Total Tagihan
            </p>
            <p className="mt-1 text-2xl font-bold">{formatCurrency(totalTagihan)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Jumlah Invoice
            </p>
            <p className="mt-1 text-2xl font-bold">{invoices.length}</p>
            <p className="text-xs text-muted-foreground">
              {countLunas} lunas, {countBelumBayar} belum
            </p>
          </CardContent>
        </Card>
        <Card className={totalSisa > 0 ? "border-destructive/40" : "border-success/40"}>
          <CardContent className="pt-6">
            <p className={`text-xs font-medium uppercase tracking-wider ${totalSisa > 0 ? "text-destructive" : "text-success"}`}>
              {totalSisa > 0 ? "Sisa Tagihan" : "Lunas"}
            </p>
            <p className={`mt-1 text-2xl font-bold ${totalSisa > 0 ? "text-destructive" : "text-success"}`}>
              {totalSisa > 0 ? formatCurrency(totalSisa) : "Rp 0"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Info reminder if unpaid */}
      {totalSisa > 0 && (
        <div className="rounded-md bg-warning/10 border border-warning/20 p-3">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
            <p className="text-sm text-warning-foreground">
              Anda memiliki tagihan yang belum dibayar sebesar <strong>{formatCurrency(totalSisa)}</strong>.
              Silakan segera melakukan pembayaran sebelum jatuh tempo.
            </p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <Tabs
        tabs={[
          { value: "semua", label: "Semua", count: invoices.length },
          { value: "unpaid", label: "Belum Dibayar", count: countBelumBayar },
          { value: "lunas", label: "Lunas", count: countLunas },
        ]}
        defaultTab="semua"
      >
        {(activeTab) => {
          const filtered = filterInvoices(invoices, activeTab);

          if (filtered.length === 0) {
            return (
              <EmptyState
                icon={Receipt}
                title={
                  activeTab === "semua"
                    ? "Belum ada tagihan"
                    : activeTab === "unpaid"
                      ? "Semua tagihan sudah lunas!"
                      : "Belum ada tagihan yang lunas"
                }
                description={
                  activeTab === "semua"
                    ? "Tagihan akan muncul di sini setelah dibuat oleh admin."
                    : activeTab === "unpaid"
                      ? "Tidak ada tagihan yang perlu dibayar saat ini."
                      : "Belum ada tagihan dengan status lunas."
                }
              />
            );
          }

          return (
            <div className="space-y-3">
              {filtered.map((inv) => (
                <TagihanCard
                  key={inv.id}
                  invoice={inv}
                  onBayar={handleBayar}
                />
              ))}
            </div>
          );
        }}
      </Tabs>

      {/* Bayar Modal */}
      <BayarModal
        invoice={selectedInvoice}
        open={showBayarModal}
        onClose={() => {
          setShowBayarModal(false);
          setSelectedInvoice(null);
        }}
      />
    </div>
  );
}
