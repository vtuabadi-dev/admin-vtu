"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Card,
  CardContent,
} from "@/shared/components/ui/Card";
import {
  Badge,
  Button,
  Modal,
  Select,
} from "@/shared/components/ui";
import { formatCurrency, formatDate } from "@/shared/lib/utils";
import {
  ClipboardCheck,
  XCircle,
  CheckCircle2,
  Eye,
  AlertTriangle,
} from "lucide-react";
import { LoadingSkeleton } from "@/shared/components/LoadingSkeleton";
import { EmptyState } from "@/shared/components/EmptyState";
import type { Pembayaran } from "@/shared/types";

// ============================================================
// REVIEW PAGE
// ============================================================

const ALASAN_REJECT: { value: string; label: string }[] = [
  { value: "Nominal tidak sesuai", label: "Nominal tidak sesuai" },
  { value: "Transfer tidak ditemukan", label: "Transfer tidak ditemukan" },
  { value: "Bukti transfer blur", label: "Bukti transfer blur" },
  { value: "Rekening tidak dikenal", label: "Rekening tidak dikenal" },
  { value: "Lainnya", label: "Lainnya" },
];

export default function PaymentReviewPage() {
  const [queue, setQueue] = useState<Pembayaran[]>([]);
  const [loading, setLoading] = useState(true);

  // Action state
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<Pembayaran | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectNotes, setRejectNotes] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const res = await fetch("/api/pembayaran/review");
      if (res.ok) {
        const json = await res.json();
        setQueue(json.data ?? []);
      }
    } catch (err) {
      console.error("Failed to load review queue:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleApprove = useCallback(async (payment: Pembayaran) => {
    setProcessingId(payment.id);
    try {
      const res = await fetch(`/api/pembayaran/${payment.id}/approve`, { method: "POST" });
      if (!res.ok) throw new Error("Gagal menyetujui");
      setQueue((prev) => prev.filter((p) => p.id !== payment.id));
      setSuccessMessage(`Pembayaran ${formatCurrency(payment.jumlah)} telah disetujui`);
      setShowSuccess(true);
    } catch {
      window.alert("Gagal menyetujui pembayaran");
    } finally {
      setProcessingId(null);
    }
  }, []);

  const handleReject = useCallback(async () => {
    if (!rejectTarget || !rejectReason) return;
    setProcessingId(rejectTarget.id);
    try {
      const alasan = rejectNotes ? `${rejectReason} — ${rejectNotes}` : rejectReason;
      const res = await fetch(`/api/pembayaran/${rejectTarget.id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alasanReject: alasan }),
      });
      if (!res.ok) throw new Error("Gagal menolak");
      setQueue((prev) => prev.filter((p) => p.id !== rejectTarget.id));
      setSuccessMessage(`Pembayaran ${formatCurrency(rejectTarget.jumlah)} telah ditolak`);
      setShowSuccess(true);
      setRejectTarget(null);
      setRejectReason("");
      setRejectNotes("");
    } catch {
      window.alert("Gagal menolak pembayaran");
    } finally {
      setProcessingId(null);
    }
  }, [rejectTarget, rejectReason, rejectNotes]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <div className="h-7 w-64 animate-pulse rounded-md bg-muted" />
          <div className="h-4 w-96 animate-pulse rounded-md bg-muted" />
        </div>
        <LoadingSkeleton variant="table" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Peninjauan Pembayaran
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Verifikasi pembayaran yang diajukan jamaah melalui portal
          </p>
        </div>
        {queue.length > 0 && (
          <Badge variant="warning" size="lg">
            {queue.length} Menunggu
          </Badge>
        )}
      </div>

      {/* Review Table */}
      {queue.length === 0 ? (
        <EmptyState
          icon={ClipboardCheck}
          title="Tidak ada pembayaran yang perlu ditinjau"
          description="Semua pembayaran jamaah telah diverifikasi. Item baru akan muncul saat jamaah mengajukan pembayaran."
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="relative w-full overflow-x-auto">
              <table className="w-full caption-bottom text-sm dense-table">
                <thead>
                  <tr className="border-b">
                    <th className="h-10 w-10 px-3 text-left font-medium text-muted-foreground">#</th>
                    <th className="h-10 px-3 text-left font-medium text-muted-foreground">Group</th>
                    <th className="h-10 px-3 text-left font-medium text-muted-foreground">Invoice</th>
                    <th className="h-10 px-3 text-right font-medium text-muted-foreground">Nominal</th>
                    <th className="h-10 px-3 text-left font-medium text-muted-foreground">Bank</th>
                    <th className="h-10 px-3 text-left font-medium text-muted-foreground">Bukti TF</th>
                    <th className="h-10 px-3 text-left font-medium text-muted-foreground">Tanggal</th>
                    <th className="h-10 px-3 text-center font-medium text-muted-foreground">Status</th>
                    <th className="h-10 px-3 text-center font-medium text-muted-foreground">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {queue.map((p, idx) => (
                    <tr key={p.id} className="border-b hover:bg-muted/50">
                      <td className="px-3 py-3 text-xs text-muted-foreground">{idx + 1}</td>
                      <td className="px-3 py-3">
                        <p className="text-xs font-medium">{(p as any).namaGroup ?? p.groupId}</p>
                        <p className="text-[10px] text-muted-foreground font-mono">{(p as any).kodeRegistrasi ?? "-"}</p>
                      </td>
                      <td className="px-3 py-3">
                        <span className="font-mono text-xs">{p.invoiceId ?? "-"}</span>
                      </td>
                      <td className="px-3 py-3 text-right">
                        <span className="text-sm font-bold tabular-nums">{formatCurrency(p.jumlah)}</span>
                      </td>
                      <td className="px-3 py-3">
                        <Badge variant="outline" size="sm">{p.bankPengirim ?? "-"}</Badge>
                      </td>
                      <td className="px-3 py-3">
                        {p.buktiUrl ? (
                          <span className="inline-flex items-center gap-1 text-xs text-primary">
                            <Eye className="h-3 w-3" /> Lihat
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-xs">{formatDate(p.tanggal)}</td>
                      <td className="px-3 py-3 text-center">
                        <Badge variant="warning" size="sm">Pending</Badge>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center justify-center gap-1.5">
                          <Button
                            size="sm"
                            variant="default"
                            className="h-7 text-[10px]"
                            disabled={processingId === p.id}
                            onClick={() => handleApprove(p)}
                          >
                            <CheckCircle2 className="mr-1 h-3 w-3" />
                            {processingId === p.id ? "..." : "Approve"}
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            className="h-7 text-[10px]"
                            disabled={processingId === p.id}
                            onClick={() => {
                              setRejectTarget(p);
                              setRejectReason("");
                              setRejectNotes("");
                            }}
                          >
                            <XCircle className="mr-1 h-3 w-3" />
                            Reject
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Info about OCR (future-ready) */}
      <Card variant="operational">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold">OCR Verifikasi — Future Ready</p>
              <p className="text-xs text-muted-foreground mt-1">
                Sistem OCR akan otomatis membaca nominal, bank, dan tanggal dari bukti transfer
                untuk mempercepat verifikasi admin. Data OCR akan ditampilkan di samping bukti
                transfer saat fitur ini aktif.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reject Modal */}
      <Modal
        open={rejectTarget !== null}
        onClose={() => { setRejectTarget(null); setRejectReason(""); setRejectNotes(""); }}
        title="Tolak Pembayaran"
        description={`Nominal: ${rejectTarget ? formatCurrency(rejectTarget.jumlah) : "-"}`}
        size="sm"
      >
        <div className="space-y-4">
          <Select
            label="Alasan Penolakan"
            options={ALASAN_REJECT}
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Pilih alasan..."
          />
          <div>
            <label className="text-sm font-medium">Catatan Tambahan</label>
            <textarea
              className="mt-1.5 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring min-h-[60px]"
              placeholder="Opsional: detail penolakan..."
              value={rejectNotes}
              onChange={(e) => setRejectNotes(e.target.value)}
            />
          </div>
          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => { setRejectTarget(null); setRejectReason(""); setRejectNotes(""); }}
            >
              Batal
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={!rejectReason || processingId === rejectTarget?.id}
              onClick={handleReject}
            >
              {processingId === rejectTarget?.id ? "Memproses..." : "Konfirmasi Penolakan"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Success Modal */}
      <Modal open={showSuccess} onClose={() => setShowSuccess(false)} title="Berhasil" size="sm">
        <p className="text-sm">{successMessage}</p>
        <div className="flex justify-end mt-4">
          <Button size="sm" onClick={() => setShowSuccess(false)}>Tutup</Button>
        </div>
      </Modal>
    </div>
  );
}
