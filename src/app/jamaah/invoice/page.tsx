"use client";

import { useEffect, useState } from "react";
import {
  getInvoiceByJamaah,
  getPembayaranByJamaah,
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
} from "@/shared/components/ui";
import { formatCurrency, formatDate, cn } from "@/shared/lib/utils";
import {
  ChevronDown,
  ChevronUp,
  Receipt,
  Banknote,
  FileText,
  CircleDollarSign,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { LoadingSkeleton } from "@/shared/components/LoadingSkeleton";
import { EmptyState } from "@/shared/components/EmptyState";
import type { Invoice, Pembayaran } from "@/shared/types";

const JAMAHA_ID = "jmh-001";

// ============================================================
// Invoice card with expandable detail
// ============================================================
function InvoiceCard({
  invoice,
  pembayaranList,
  defaultOpen,
}: {
  invoice: Invoice;
  pembayaranList: Pembayaran[];
  defaultOpen?: boolean;
}) {
  const [expanded, setExpanded] = useState(defaultOpen ?? false);

  const tipeLabel: Record<string, string> = {
    dp: "Down Payment",
    cicilan: "Cicilan",
    pelunasan: "Pelunasan",
    tambahan: "Tambahan",
  };

  const isOverdue = invoice.status === "overdue";
  const isUnpaid = invoice.status === "unpaid";

  return (
    <Card
      className={`transition-shadow hover:shadow-md ${
        isOverdue ? "border-destructive/40" : ""
      } ${isUnpaid ? "border-warning/40" : ""}`}
    >
      <CardContent className="pt-6">
        {/* Header row */}
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                invoice.status === "paid"
                  ? "bg-success/10"
                  : invoice.status === "overdue"
                    ? "bg-destructive/10"
                    : "bg-muted"
              }`}
            >
              <Receipt
                className={`h-5 w-5 ${
                  invoice.status === "paid"
                    ? "text-success"
                    : invoice.status === "overdue"
                      ? "text-destructive"
                      : "text-muted-foreground"
                }`}
              />
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
            <p className="text-lg font-bold">{formatCurrency(invoice.jumlah)}</p>
            {invoice.sisaTagihan > 0 && (
              <p className="text-xs text-destructive">
                Sisa: {formatCurrency(invoice.sisaTagihan)}
              </p>
            )}
          </div>
        </div>

        {/* Meta info */}
        <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground">
          <span>
            Jatuh tempo: <strong>{formatDate(invoice.jatuhTempo)}</strong>
          </span>
          <span>
            Dibuat: {formatDate(invoice.createdAt)}
          </span>
          <span>
            {invoice.items.length} item
          </span>
        </div>

        {/* Expand toggle */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-3 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {expanded ? (
            <>
              <ChevronUp className="h-3.5 w-3.5" />
              Sembunyikan Detail
            </>
          ) : (
            <>
              <ChevronDown className="h-3.5 w-3.5" />
              Lihat Detail
            </>
          )}
        </button>

        {/* Expanded detail */}
        {expanded && (
          <div className="mt-4 space-y-4 border-t pt-4">
            {/* Item breakdown */}
            <div>
              <h4 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <FileText className="h-3.5 w-3.5" />
                Rincian Biaya
              </h4>
              <div className="relative w-full overflow-auto">
                <table className="w-full caption-bottom text-xs dense-table">
                  <thead>
                    <tr className="border-b">
                      <th className="h-7 px-1.5 text-left font-medium text-muted-foreground">Kategori</th>
                      <th className="h-7 px-1.5 text-center font-medium text-muted-foreground w-10">Qty</th>
                      <th className="h-7 px-1.5 text-right font-medium text-muted-foreground">Harga</th>
                      <th className="h-7 px-1.5 text-right font-medium text-muted-foreground">Total</th>
                      <th className="h-7 px-1.5 text-center font-medium text-muted-foreground w-16">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoice.items.map((item) => {
                      const isCancelled = item.status === "cancelled";
                      return (
                        <tr key={item.id} className={cn("border-b", isCancelled && "bg-muted/30 text-muted-foreground")}>
                          <td className="px-1.5 py-1.5">
                            <span className={cn("font-medium", isCancelled && "line-through")}>{item.kategori}</span>
                            <p className="text-[10px] text-muted-foreground">{item.deskripsi}</p>
                          </td>
                          <td className="px-1.5 py-1.5 text-center tabular-nums">{item.qty}</td>
                          <td className="px-1.5 py-1.5 text-right tabular-nums">{formatCurrency(item.hargaSatuan)}</td>
                          <td className={cn("px-1.5 py-1.5 text-right font-medium tabular-nums", isCancelled && "line-through")}>{formatCurrency(item.qty * item.hargaSatuan)}</td>
                          <td className="px-1.5 py-1.5 text-center">
                            {isCancelled ? (
                              <Badge variant="destructive" size="sm">Batal</Badge>
                            ) : (
                              <Badge variant="success" size="sm">Aktif</Badge>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2">
                      <td colSpan={3} className="px-1.5 py-1.5 text-right font-semibold">Total (Item Aktif):</td>
                      <td className="px-1.5 py-1.5 text-right font-bold tabular-nums">{formatCurrency(invoice.jumlah)}</td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
              {invoice.items.some((it) => it.status === "cancelled") && (
                <div className="mt-2 rounded-md bg-muted/50 p-2">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                    Item Dibatalkan
                  </p>
                  {invoice.items.filter((it) => it.status === "cancelled").map((item) => (
                    <div key={item.id} className="flex items-center justify-between text-[11px] text-muted-foreground">
                      <span className="line-through">{item.kategori}</span>
                      <span>{item.cancelledAt ? formatDate(item.cancelledAt) : "-"}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Payment history */}
            {pembayaranList.length > 0 && (
              <div>
                <h4 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <Banknote className="h-3.5 w-3.5" />
                  Riwayat Pembayaran
                </h4>
                <div className="space-y-2">
                  {pembayaranList.map((byr) => (
                    <div
                      key={byr.id}
                      className={cn(
                        "flex items-center justify-between rounded-md border p-2.5",
                        byr.status === "rejected" && "border-destructive/40 bg-destructive/5"
                      )}
                    >
                      <div className="flex items-start gap-2">
                        <div
                          className={`mt-0.5 ${
                            byr.status === "verified"
                              ? "text-success"
                              : byr.status === "rejected"
                                ? "text-destructive"
                                : "text-warning"
                          }`}
                        >
                          {byr.status === "verified" ? (
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          ) : (
                            <AlertCircle className="h-3.5 w-3.5" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className="text-xs font-medium capitalize">
                              {byr.metode}
                            </p>
                            {/* Sumber badge */}
                            <Badge variant={byr.sumber === "admin" ? "muted" : "info"} size="sm">
                              {byr.sumber === "admin" ? "Admin" : "Jamaah"}
                            </Badge>
                            <Badge
                              variant={
                                byr.status === "verified"
                                  ? "success"
                                  : byr.status === "rejected"
                                    ? "destructive"
                                    : "warning"
                              }
                              size="sm"
                            >
                              {byr.status === "verified"
                                ? "Terverifikasi"
                                : byr.status === "rejected"
                                  ? "Ditolak"
                                  : "Pending Review"}
                            </Badge>
                          </div>
                          <p className="text-[11px] text-muted-foreground">
                            {formatDate(byr.tanggal)}
                            {byr.verifiedBy && ` oleh ${byr.verifiedBy}`}
                          </p>
                          {byr.bankPengirim && (
                            <p className="text-[11px] text-muted-foreground">
                              Bank: {byr.bankPengirim}
                            </p>
                          )}
                          {byr.catatan && (
                            <p className="text-[11px] text-muted-foreground mt-0.5">
                              {byr.catatan}
                            </p>
                          )}
                          {/* Rejected reason */}
                          {byr.status === "rejected" && byr.alasanReject && (
                            <div className="mt-1 rounded bg-destructive/10 px-2 py-1">
                              <p className="text-[10px] font-medium text-destructive">
                                Alasan ditolak: {byr.alasanReject}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                      <p className="text-sm font-semibold shrink-0 ml-3">
                        {formatCurrency(byr.jumlah)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {pembayaranList.length === 0 && invoice.sisaTagihan > 0 && (
              <div className="rounded-md bg-warning/10 p-3 text-center">
                <p className="text-xs text-warning-foreground">
                  Belum ada pembayaran untuk invoice ini
                </p>
              </div>
            )}
          </div>
        )}
      </CardContent>

      {isUnpaid && (
        <CardFooter>
          <Button
            size="sm"
            variant="default"
            onClick={() => { window.location.href = "/jamaah/tagihan"; }}
          >
            <CircleDollarSign className="mr-1 h-3.5 w-3.5" />
            Bayar Sekarang
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}

// ============================================================
// Invoice Page
// ============================================================
export default function InvoicePage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [pembayaranList, setPembayaranList] = useState<Pembayaran[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [invs, pays] = await Promise.all([
          getInvoiceByJamaah(JAMAHA_ID),
          getPembayaranByJamaah(JAMAHA_ID),
        ]);
        setInvoices(invs);
        setPembayaranList(pays);
      } catch (err) {
        console.error("Failed to load invoices:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const totalTagihan = invoices.reduce((sum, inv) => sum + inv.jumlah, 0);
  const totalSisa = invoices.reduce((sum, inv) => sum + inv.sisaTagihan, 0);
  const totalDibayar = totalTagihan - totalSisa;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <div className="h-7 w-64 animate-pulse rounded-md bg-muted" />
          <div className="h-4 w-96 animate-pulse rounded-md bg-muted" />
        </div>
        <LoadingSkeleton variant="card" rows={3} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Invoice & Pembayaran
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Riwayat invoice dan pembayaran paket umroh/haji Anda
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
            <p className="text-xs font-medium uppercase tracking-wider text-success">
              Total Dibayar
            </p>
            <p className="mt-1 text-2xl font-bold text-success">
              {formatCurrency(totalDibayar)}
            </p>
          </CardContent>
        </Card>
        <Card className={totalSisa > 0 ? "border-destructive/40" : ""}>
          <CardContent className="pt-6">
            <p className={`text-xs font-medium uppercase tracking-wider ${totalSisa > 0 ? "text-destructive" : "text-success"}`}>
              Sisa Tagihan
            </p>
            <p className={`mt-1 text-2xl font-bold ${totalSisa > 0 ? "text-destructive" : "text-success"}`}>
              {formatCurrency(totalSisa)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* If there's remaining balance, highlight it */}
      {totalSisa > 0 && (
        <Card variant="operational">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CircleDollarSign className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm font-semibold">Sisa yang harus dibayar</p>
                  <p className="text-xs text-muted-foreground">
                    Silakan segera melakukan pembayaran sebelum jatuh tempo
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xl font-bold text-destructive">
                  {formatCurrency(totalSisa)}
                </p>
                <Button
                  size="sm"
                  variant="default"
                  onClick={() => { window.location.href = "/jamaah/tagihan"; }}
                >
                  Bayar Sekarang
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Invoice list */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Daftar Invoice</h2>
        {invoices.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title="Belum ada invoice"
            description="Invoice dan riwayat pembayaran akan muncul di sini setelah tagihan dibuat."
          />
        ) : (
          invoices.map((inv) => (
            <InvoiceCard
              key={inv.id}
              invoice={inv}
              pembayaranList={pembayaranList.filter((p) => p.invoiceId === inv.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}
