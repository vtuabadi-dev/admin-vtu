"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Search,
  CreditCard,
  Upload,
  CheckCircle,
  Columns3,
  FilePlus,
  ClipboardCheck,
  Eye,
  XCircle,
  CheckCircle2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/Card";
import { Button } from "@/shared/components/ui/Button";
import { Input } from "@/shared/components/ui/Input";
import { Select } from "@/shared/components/ui/Select";
import { StatusBadge, Badge } from "@/shared/components/ui/Badge";
import { Modal } from "@/shared/components/ui/Modal";
import { EmptyState } from "@/shared/components/EmptyState";
import { LoadingSkeleton } from "@/shared/components/LoadingSkeleton";
import {
  getGroupPaymentSummary,
  getGroupByKode,
  addPembayaran,
  fetchInvoiceSplitConfig,
  saveInvoiceSplitConfig,
  createInvoice,
} from "@/server/actions/api";
import type {
  GroupPaymentSummary,
  Pembayaran,
  MetodePembayaran,
  InvoiceSplitConfig,
  InvoiceSplitItem,
} from "@/shared/types";
import { formatCurrency, formatDate } from "@/shared/lib/utils";

const metodeOptions = [
  { value: "transfer", label: "Transfer" },
  { value: "cash", label: "Tunai" },
  { value: "virtual_account", label: "Virtual Account" },
  { value: "qris", label: "QRIS" },
];

const ALASAN_REJECT = [
  { value: "Nominal tidak sesuai", label: "Nominal tidak sesuai" },
  { value: "Transfer tidak ditemukan", label: "Transfer tidak ditemukan" },
  { value: "Bukti transfer blur", label: "Bukti transfer blur" },
  { value: "Rekening tidak dikenal", label: "Rekening tidak dikenal" },
  { value: "Lainnya", label: "Lainnya" },
];

// ============================================================
// CREATE INVOICE MODAL
// ============================================================

function CreateInvoiceModal({
  open,
  onClose,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: (invNumber: string, amount: number) => void;
}) {
  const [kodeGroup, setKodeGroup] = useState("");
  const [nominal, setNominal] = useState<number>(0);
  const [jatuhTempo, setJatuhTempo] = useState("");
  const [catatan, setCatatan] = useState("");
  const [loading, setLoading] = useState(false);
  const [groupInfo, setGroupInfo] = useState<any>(null);
  const [lookupError, setLookupError] = useState("");

  async function handleSearchGroup() {
    setLookupError("");
    setGroupInfo(null);
    if (!kodeGroup.trim()) {
      setLookupError("Masukkan kode registrasi group");
      return;
    }
    try {
      const group = await getGroupByKode(kodeGroup.trim().toUpperCase());
      if (!group) {
        setLookupError("Group tidak ditemukan");
        return;
      }
      setGroupInfo(group);
      if (group.sisaPembayaran) {
        setNominal(group.sisaPembayaran);
      }
    } catch {
      setLookupError("Gagal mencari data group");
    }
  }

  async function handleSubmit() {
    if (!groupInfo || nominal <= 0) return;
    setLoading(true);
    try {
      const res = await createInvoice({
        groupId: groupInfo.id,
        nominal,
        jatuhTempo: jatuhTempo || undefined,
        catatan: catatan || `Invoice penerbitan untuk group ${groupInfo.kodeRegistrasi}`,
      });

      onSuccess(res.nomorInvoice || res.id, nominal);
      setKodeGroup("");
      setNominal(0);
      setJatuhTempo("");
      setCatatan("");
      setGroupInfo(null);
    } catch (e) {
      console.error("Failed to create invoice:", e);
      alert("Gagal menerbitkan invoice baru.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Buat Invoice Tagihan Baru" size="lg">
      <div className="space-y-4 pt-2">
        <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-amber-900 dark:text-amber-200">
            1. Cari & Pilih Group Registrasi Jamaah
          </label>
          <div className="flex gap-2">
            <Input
              placeholder="Contoh: GRP-2026-00081"
              value={kodeGroup}
              onChange={(e) => setKodeGroup(e.target.value)}
              className="font-mono text-sm"
            />
            <Button onClick={handleSearchGroup} size="sm" className="bg-amber-600 hover:bg-amber-700 text-white font-bold shrink-0">
              <Search className="h-3.5 w-3.5 mr-1" /> Cari Group
            </Button>
          </div>
          {lookupError && <p className="text-xs text-destructive font-medium">{lookupError}</p>}
          {groupInfo && (
            <div className="p-2.5 bg-background border rounded-lg text-xs space-y-1">
              <p className="font-bold text-foreground">Group: {groupInfo.namaGroup} ({groupInfo.kodeRegistrasi})</p>
              <p className="text-muted-foreground">Ketua / Kontak: {groupInfo.kontakNama || "-"} ({groupInfo.kontakHp || "-"})</p>
            </div>
          )}
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-foreground">
              2. Nominal Tagihan Invoice (Rp)
            </label>
            <Input
              type="number"
              placeholder="Masukkan nominal tagihan"
              value={nominal || ""}
              onChange={(e) => setNominal(Number(e.target.value))}
              className="mt-1 font-bold text-base"
            />
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-foreground">
              3. Tanggal Jatuh Tempo (Batas Akhir Pelunasan)
            </label>
            <Input
              type="date"
              value={jatuhTempo}
              onChange={(e) => setJatuhTempo(e.target.value)}
              className="mt-1 text-sm"
            />
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-foreground">
              4. Catatan / Rincian Tagihan
            </label>
            <Input
              placeholder="Contoh: Tagihan DP / Pelunasan Tambahan Perlengkapan"
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
              className="mt-1 text-sm"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t">
          <Button variant="outline" onClick={onClose}>
            Batal
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!groupInfo || nominal <= 0 || loading}
            className="bg-amber-600 hover:bg-amber-700 text-white font-bold"
          >
            {loading ? "Menerbitkan..." : "Terbitkan Invoice"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ============================================================
// SPLIT INVOICE MODAL
// ============================================================

function SplitInvoiceModal({
  open,
  onClose,
  groupData,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  groupData: GroupPaymentSummary;
  onSubmit: (config: InvoiceSplitConfig) => void;
}) {
  const anggota = groupData.anggota;
  const [splitCount, setSplitCount] = useState(2);
  const [assignments, setAssignments] = useState<Record<string, number>>({});

  useEffect(() => {
    const newAssignments: Record<string, number> = {};
    anggota.forEach((a, i) => {
      newAssignments[a.id] = i % splitCount;
    });
    setAssignments(newAssignments);
  }, [splitCount, anggota]);

  function handleSubmit() {
    const splits: InvoiceSplitItem[] = Array.from({ length: splitCount }, (_, i) => {
      const label = String.fromCharCode(65 + i);
      const anggotaIds = anggota.filter((a) => assignments[a.id] === i).map((a) => a.id);
      return {
        id: `${groupData.groupId}-split-${label}`,
        label: `Invoice ${label}`,
        anggotaIds,
      };
    }).filter((s) => s.anggotaIds.length > 0);

    const config: InvoiceSplitConfig = {
      groupId: groupData.groupId,
      createdAt: new Date().toISOString(),
      splits,
    };
    onSubmit(config);
  }

  return (
    <Modal open={open} onClose={onClose} title="Pecah Invoice" size="lg">
      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium">Pecah menjadi berapa invoice?</label>
          <Select
            options={[
              { value: "2", label: "2 Invoice" },
              { value: "3", label: "3 Invoice" },
              { value: "4", label: "4 Invoice" },
            ]}
            value={String(splitCount)}
            onChange={(e) => setSplitCount(Number(e.target.value))}
          />
        </div>

        <div>
          <p className="text-sm font-medium mb-2">Pilih anggota per invoice:</p>
          <div className="space-y-3">
            {Array.from({ length: splitCount }, (_, i) => {
              const label = String.fromCharCode(65 + i);
              const members = anggota.filter((a) => assignments[a.id] === i);
              return (
                <div key={i} className="rounded-md border p-3">
                  <p className="text-xs font-semibold mb-1.5">Invoice {label}</p>
                  <div className="flex flex-wrap gap-1">
                    {members.length === 0 ? (
                      <span className="text-xs text-muted-foreground italic">Belum ada anggota</span>
                    ) : (
                      members.map((a) => (
                        <span
                          key={a.id}
                          className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs cursor-pointer hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => {
                            const nextSplit = (assignments[a.id]! + 1) % splitCount;
                            setAssignments((prev) => ({ ...prev, [a.id]: nextSplit }));
                          }}
                          title="Klik untuk pindahkan ke invoice lain"
                        >
                          {a.namaLengkap}
                        </span>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <p className="mt-1 text-[10px] text-muted-foreground">
            Klik nama anggota untuk memindahkan ke invoice lain
          </p>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Batal</Button>
          <Button onClick={handleSubmit}>Simpan Split</Button>
        </div>
      </div>
    </Modal>
  );
}

// ============================================================
// PENINJAUAN PEMBAYARAN VIEW
// ============================================================

function PaymentReviewTabContent() {
  const [queue, setQueue] = useState<Pembayaran[]>([]);
  const [loading, setLoading] = useState(true);
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
    return <LoadingSkeleton variant="table" />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold">Verifikasi & Peninjauan Slip Pembayaran</h2>
          <p className="text-xs text-muted-foreground">Tinjau dan konfirmasi bukti transfer yang diajukan oleh jamaah/rombongan.</p>
        </div>
        {queue.length > 0 && (
          <Badge variant="warning" className="text-xs font-bold">
            {queue.length} Menunggu Verifikasi
          </Badge>
        )}
      </div>

      {queue.length === 0 ? (
        <EmptyState
          icon={ClipboardCheck}
          title="Tidak ada pembayaran yang perlu ditinjau"
          description="Semua pembayaran jamaah telah diverifikasi. Bukti transfer baru akan muncul di sini secara otomatis saat diajukan."
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="relative w-full overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40 text-left text-xs font-bold text-muted-foreground uppercase">
                    <th className="py-3 px-3 w-10">#</th>
                    <th className="py-3 px-3">Group / Registrasi</th>
                    <th className="py-3 px-3">Invoice</th>
                    <th className="py-3 px-3 text-right">Nominal</th>
                    <th className="py-3 px-3">Bank Pengirim</th>
                    <th className="py-3 px-3">Bukti Transfer</th>
                    <th className="py-3 px-3">Tanggal Upload</th>
                    <th className="py-3 px-3 text-center">Status</th>
                    <th className="py-3 px-3 text-center">Aksi Verifikasi</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {queue.map((p, idx) => (
                    <tr key={p.id} className="hover:bg-muted/30">
                      <td className="px-3 py-3 text-xs text-muted-foreground">{idx + 1}</td>
                      <td className="px-3 py-3">
                        <p className="text-xs font-bold text-foreground">{(p as any).namaGroup ?? p.groupId}</p>
                        <p className="text-[10px] text-muted-foreground font-mono">{(p as any).kodeRegistrasi ?? "-"}</p>
                      </td>
                      <td className="px-3 py-3">
                        <span className="font-mono text-xs text-muted-foreground">{p.invoiceId ?? "-"}</span>
                      </td>
                      <td className="px-3 py-3 text-right font-extrabold text-foreground">
                        {formatCurrency(p.jumlah)}
                      </td>
                      <td className="px-3 py-3">
                        <Badge variant="outline" className="text-xs font-medium">{p.bankPengirim ?? "-"}</Badge>
                      </td>
                      <td className="px-3 py-3">
                        {p.buktiUrl ? (
                          <a href={p.buktiUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-amber-600 hover:underline font-bold">
                            <Eye className="h-3.5 w-3.5" /> Lihat Slip
                          </a>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-xs text-muted-foreground">{formatDate(p.tanggal)}</td>
                      <td className="px-3 py-3 text-center">
                        <Badge variant="warning" className="text-[10px]">Pending</Badge>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center justify-center gap-1.5">
                          <Button
                            size="sm"
                            className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                            disabled={processingId === p.id}
                            onClick={() => handleApprove(p)}
                          >
                            <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                            {processingId === p.id ? "..." : "Approve"}
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            className="h-7 text-xs font-bold"
                            disabled={processingId === p.id}
                            onClick={() => {
                              setRejectTarget(p);
                              setRejectReason("");
                              setRejectNotes("");
                            }}
                          >
                            <XCircle className="mr-1 h-3.5 w-3.5" />
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

      {/* Reject Modal */}
      <Modal
        open={rejectTarget !== null}
        onClose={() => { setRejectTarget(null); setRejectReason(""); setRejectNotes(""); }}
        title="Tolak Pembayaran"
        description={`Nominal: ${rejectTarget ? formatCurrency(rejectTarget.jumlah) : "-"}`}
        size="sm"
      >
        <div className="space-y-4 pt-1">
          <Select
            label="Alasan Penolakan"
            options={ALASAN_REJECT}
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Pilih alasan..."
          />
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-foreground">Catatan Tambahan</label>
            <textarea
              className="mt-1 w-full rounded-md border border-stone-300 dark:border-stone-700 bg-background px-3 py-2 text-xs focus:ring-1 focus:ring-amber-500 min-h-[60px]"
              placeholder="Opsional: detail penolakan..."
              value={rejectNotes}
              onChange={(e) => setRejectNotes(e.target.value)}
            />
          </div>
          <div className="flex gap-2 justify-end pt-2">
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
              className="font-bold"
            >
              {processingId === rejectTarget?.id ? "Memproses..." : "Konfirmasi Penolakan"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Success Toast / Modal */}
      <Modal open={showSuccess} onClose={() => setShowSuccess(false)} title="Berhasil" size="sm">
        <p className="text-sm font-medium">{successMessage}</p>
        <div className="flex justify-end mt-4">
          <Button size="sm" onClick={() => setShowSuccess(false)}>Tutup</Button>
        </div>
      </Modal>
    </div>
  );
}

// ============================================================
// MAIN PAGE
// ============================================================

export default function LaporanPembayaranPage() {
  const [activeTab, setActiveTab] = useState<"laporan" | "review">("review");
  const [showCreateInvoiceModal, setShowCreateInvoiceModal] = useState(false);

  // Group lookup
  const [kodeInput, setKodeInput] = useState("");
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState("");

  // Group data
  const [groupData, setGroupData] = useState<GroupPaymentSummary | null>(null);

  // Split config
  const [splitConfig, setSplitConfig] = useState<InvoiceSplitConfig | null>(null);
  const [activeSplitId, setActiveSplitId] = useState<string | null>(null);

  // Split modal
  const [showSplitModal, setShowSplitModal] = useState(false);

  // Form
  const [nominal, setNominal] = useState(0);
  const [metode, setMetode] = useState<MetodePembayaran>("transfer");
  const [catatan, setCatatan] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Alokasi
  const [alokasi, setAlokasi] = useState<Record<string, number>>({});

  // Success modal
  const [showSuccess, setShowSuccess] = useState(false);
  const [successData, setSuccessData] = useState<{ invoiceNumber: string; amount: number } | null>(null);

  // Active split item
  const activeSplit = splitConfig?.splits.find((s) => s.id === activeSplitId) ?? null;
  // Anggota filtered by active split
  const activeAnggota = activeSplit
    ? groupData?.anggota.filter((a) => activeSplit.anggotaIds.includes(a.id)) ?? []
    : groupData?.anggota ?? [];
  // Pembayaran filtered by active split (if split exists)
  const activePembayaran = activeSplit
    ? groupData?.pembayaran.filter((p) =>
        p.alokasi.some((alok) => activeSplit.anggotaIds.includes(alok.jamaahId))
      ) ?? []
    : groupData?.pembayaran ?? [];

  async function handleCari() {
    setError("");
    setGroupData(null);
    setSplitConfig(null);
    setActiveSplitId(null);

    if (!kodeInput.trim()) {
      setError("Masukkan kode registrasi group");
      return;
    }

    setSearching(true);
    try {
      const group = await getGroupByKode(kodeInput.trim().toUpperCase());
      if (!group) {
        setError("Group tidak ditemukan");
        setSearching(false);
        return;
      }

      const [summary, split] = await Promise.all([
        getGroupPaymentSummary(group.id),
        fetchInvoiceSplitConfig(group.id),
      ]);

      if (!summary) {
        setError("Data pembayaran group tidak ditemukan");
        setSearching(false);
        return;
      }

      setGroupData(summary);
      if (split) {
        setSplitConfig(split);
        setActiveSplitId(split.splits[0]?.id ?? null);
      }
      setAlokasi({});
    } catch {
      setError("Gagal mengambil data group");
    } finally {
      setSearching(false);
    }
  }

  function handleBagiRata() {
    if (nominal <= 0) return;
    const anggota = activeAnggota;
    if (anggota.length === 0) return;
    const perOrang = Math.floor(nominal / anggota.length);
    const remainder = nominal - perOrang * anggota.length;
    const newAlokasi: Record<string, number> = {};
    anggota.forEach((a, i) => {
      newAlokasi[a.id] = perOrang + (i === 0 ? remainder : 0);
    });
    setAlokasi(newAlokasi);
  }

  const totalAlokasi = Object.values(alokasi).reduce((sum, v) => sum + v, 0);
  const alokasiValid = nominal > 0 && totalAlokasi === nominal;

  async function handleSubmit() {
    if (!groupData || nominal <= 0 || !alokasiValid) return;

    setSubmitting(true);
    try {
      const newPayment: Omit<Pembayaran, "id" | "status" | "verifiedBy" | "reviewedBy" | "reviewedAt"> = {
        groupId: groupData.groupId,
        invoiceId: activeSplitId ?? undefined,
        jumlah: nominal,
        metode,
        sumber: "admin",
        tanggal: new Date().toISOString().split("T")[0]!,
        catatan: catatan || undefined,
        alokasi: Object.entries(alokasi).map(([jamaahId, jumlah]) => ({
          jamaahId,
          namaJamaah: groupData.anggota.find((a) => a.id === jamaahId)?.namaLengkap ?? jamaahId,
          jumlah,
        })),
      };

      await addPembayaran(newPayment);

      const invoiceNumber = `INV-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${String(Math.floor(Math.random() * 9000) + 1000)}`;

      setSuccessData({ invoiceNumber, amount: nominal });
      setShowSuccess(true);

      // Reset form
      setNominal(0);
      setCatatan("");
      setAlokasi({});

      // Refresh
      const summary = await getGroupPaymentSummary(groupData.groupId);
      setGroupData(summary ?? null);
    } catch {
      // silently fail
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSplitSubmit(config: InvoiceSplitConfig) {
    await saveInvoiceSplitConfig(groupData?.groupId ?? "", config);
    setSplitConfig(config);
    setActiveSplitId(config.splits[0]?.id ?? null);
    setShowSplitModal(false);
  }

  return (
    <div className="space-y-6">
      {/* PAGE HEADER & TOP ACTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Manajemen Invoice & Pembayaran</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Pusat penerbitan invoice, input pembayaran manual, serta verifikasi peninjauan slip transfer.
          </p>
        </div>

        <Button
          onClick={() => setShowCreateInvoiceModal(true)}
          className="bg-amber-600 hover:bg-amber-700 text-white font-bold flex items-center gap-2 shadow-xs shrink-0"
        >
          <FilePlus className="h-4 w-4" />
          Create Invoice (Buat Baru)
        </Button>
      </div>

      {/* TOP NAVIGATION TABS */}
      <div className="flex items-center gap-2 border-b border-border pb-1">
        <button
          onClick={() => setActiveTab("review")}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-bold border-b-2 transition-all ${
            activeTab === "review"
              ? "border-amber-500 text-amber-600 dark:text-amber-400 bg-amber-500/10 rounded-t-lg"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <ClipboardCheck className="h-4 w-4" />
          Peninjauan Pembayaran (Slip Verification)
        </button>

        <button
          onClick={() => setActiveTab("laporan")}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-bold border-b-2 transition-all ${
            activeTab === "laporan"
              ? "border-amber-500 text-amber-600 dark:text-amber-400 bg-amber-500/10 rounded-t-lg"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <CreditCard className="h-4 w-4" />
          Daftar & Input Pembayaran Group
        </button>
      </div>

      {/* TAB 1: DAFTAR & INPUT PEMBAYARAN */}
      {activeTab === "laporan" && (
        <div className="space-y-6">
          {/* Group lookup */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-end gap-3">
                <div className="flex-1 max-w-md">
                  <Input
                    label="Kode Registrasi Group"
                    placeholder="Contoh: GRP-2026-00081"
                    value={kodeInput}
                    onChange={(e) => setKodeInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleCari()}
                  />
                </div>
                <Button onClick={handleCari} disabled={searching} className="font-bold">
                  <Search className="mr-1.5 h-4 w-4" />
                  {searching ? "Mencari..." : "Cari Group"}
                </Button>
              </div>
              {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
            </CardContent>
          </Card>

          {groupData && (
            <>
              {/* Group info */}
              <Card>
                <CardContent className="pt-6">
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
                    <div>
                      <p className="text-xs text-muted-foreground">Kode</p>
                      <p className="font-mono font-medium">{groupData.kodeRegistrasi}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Nama Group</p>
                      <p className="font-medium">{groupData.namaGroup}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Total Tagihan</p>
                      <p className="font-semibold">{formatCurrency(groupData.totalTagihan)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Total Dibayar</p>
                      <p className="font-semibold text-success">{formatCurrency(groupData.totalPembayaran)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Sisa</p>
                      <p className="font-semibold text-destructive">{formatCurrency(groupData.sisaPembayaran)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Split Invoice Tabs */}
              {splitConfig && (
                <div className="flex items-center gap-2">
                  {splitConfig.splits.map((s) => (
                    <Button
                      key={s.id}
                      size="sm"
                      variant={activeSplitId === s.id ? "default" : "outline"}
                      onClick={() => {
                        setActiveSplitId(s.id);
                        setAlokasi({});
                        setNominal(0);
                      }}
                    >
                      {s.label} ({s.anggotaIds.length} org)
                    </Button>
                  ))}
                </div>
              )}

              {/* Two-column: History | Form */}
              <div className="grid gap-6 lg:grid-cols-2">
                {/* LEFT: Payment History */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm">
                        {activeSplit
                          ? `Histori ${activeSplit.label}`
                          : "Histori Pembayaran Group"}
                      </CardTitle>
                      {!splitConfig && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          onClick={() => setShowSplitModal(true)}
                        >
                          <Columns3 className="mr-1 h-3 w-3" />
                          Pecah Invoice
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    {activePembayaran.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-8 text-center">
                        Belum ada pembayaran untuk {activeSplit ? activeSplit.label : "group ini"}
                      </p>
                    ) : (
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b text-left text-xs font-medium text-muted-foreground">
                            <th className="pb-2">Tanggal</th>
                            <th className="pb-2">Invoice</th>
                            <th className="pb-2 text-right">Nominal</th>
                            <th className="pb-2">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {activePembayaran.map((p) => (
                            <tr key={p.id}>
                              <td className="py-2 text-xs">{formatDate(p.tanggal)}</td>
                              <td className="py-2">
                                <span className="font-mono text-xs text-muted-foreground">
                                  {p.invoiceId ? `INV-${p.invoiceId.slice(-6)}` : "-"}
                                </span>
                              </td>
                              <td className="py-2 text-right font-medium tabular-nums">
                                {formatCurrency(p.jumlah)}
                              </td>
                              <td className="py-2">
                                <StatusBadge status={p.status} />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </CardContent>
                </Card>

                {/* RIGHT: Payment Form */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-sm">
                      <CreditCard className="h-4 w-4" />
                      {activeSplit
                        ? `Form Pembayaran — ${activeSplit.label}`
                        : "Form Pembayaran Baru"}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="text-sm font-medium">Nominal Pembayaran</label>
                      <Input
                        type="number"
                        placeholder="Masukkan nominal"
                        value={nominal || ""}
                        onChange={(e) => setNominal(Number(e.target.value))}
                      />
                    </div>

                    <Select
                      label="Metode Pembayaran"
                      options={metodeOptions}
                      value={metode}
                      onChange={(e) => setMetode(e.target.value as MetodePembayaran)}
                    />

                    <div>
                      <label className="text-sm font-medium">Catatan</label>
                      <Input
                        placeholder="Opsional"
                        value={catatan}
                        onChange={(e) => setCatatan(e.target.value)}
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium">Upload Bukti (Opsional)</label>
                      <div className="mt-1 flex items-center justify-center rounded-md border border-dashed p-4 text-xs text-muted-foreground hover:bg-muted/30 cursor-pointer">
                        <Upload className="mr-1.5 h-3.5 w-3.5" />
                        Klik untuk upload bukti pembayaran (mock)
                      </div>
                    </div>

                    {activeAnggota.length > 0 && (
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-sm font-medium">Alokasi Pembayaran</label>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 text-xs"
                            onClick={handleBagiRata}
                            disabled={nominal <= 0}
                          >
                            Bagi Rata
                          </Button>
                        </div>
                        <div className="max-h-32 overflow-y-auto space-y-1 rounded-md border p-2">
                          {activeAnggota.map((a) => (
                            <div key={a.id} className="flex items-center gap-2 text-sm">
                              <span className="flex-1 truncate">{a.namaLengkap}</span>
                              <input
                                type="number"
                                className="w-24 rounded border px-2 py-0.5 text-xs text-right"
                                placeholder="0"
                                value={alokasi[a.id] || ""}
                                onChange={(e) => {
                                  setAlokasi((prev) => ({
                                    ...prev,
                                    [a.id]: Number(e.target.value),
                                  }));
                                }}
                              />
                            </div>
                          ))}
                        </div>
                        {totalAlokasi > 0 && (
                          <p className={`mt-1 text-xs ${alokasiValid ? "text-success" : "text-destructive"}`}>
                            Total alokasi: {formatCurrency(totalAlokasi)}
                            {!alokasiValid && ` (harus = ${formatCurrency(nominal)})`}
                          </p>
                        )}
                      </div>
                    )}

                    <Button
                      className="w-full font-bold"
                      onClick={handleSubmit}
                      disabled={nominal <= 0 || !alokasiValid || submitting}
                    >
                      {submitting ? "Menyimpan..." : "Submit Pembayaran"}
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </div>
      )}

      {/* TAB 2: PENINJAUAN PEMBAYARAN */}
      {activeTab === "review" && <PaymentReviewTabContent />}

      {/* Create Invoice Modal */}
      <CreateInvoiceModal
        open={showCreateInvoiceModal}
        onClose={() => setShowCreateInvoiceModal(false)}
        onSuccess={(invNumber, amount) => {
          setShowCreateInvoiceModal(false);
          setSuccessData({ invoiceNumber: invNumber, amount });
          setShowSuccess(true);
        }}
      />

      {/* Split Invoice Modal */}
      {groupData && (
        <SplitInvoiceModal
          open={showSplitModal}
          onClose={() => setShowSplitModal(false)}
          groupData={groupData}
          onSubmit={handleSplitSubmit}
        />
      )}

      {/* Success Modal */}
      <Modal
        open={showSuccess}
        onClose={() => setShowSuccess(false)}
        title="Operasi Berhasil"
        size="sm"
      >
        <div className="space-y-3 text-center">
          <CheckCircle className="mx-auto h-10 w-10 text-success" />
          <div>
            <p className="font-medium">Transaksi / Invoice dicatat</p>
            <p className="text-sm text-muted-foreground">
              Nomor Invoice: <span className="font-mono font-bold text-foreground">{successData?.invoiceNumber}</span>
            </p>
            <p className="text-lg font-bold mt-1 text-amber-500">
              {successData ? formatCurrency(successData.amount) : ""}
            </p>
          </div>
          <Button className="w-full font-bold" onClick={() => setShowSuccess(false)}>
            Tutup
          </Button>
        </div>
      </Modal>
    </div>
  );
}

