"use client";

import { useState, useEffect } from "react";
import { Search, CreditCard, Upload, CheckCircle, Columns3 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/Card";
import { Button } from "@/shared/components/ui/Button";
import { Input } from "@/shared/components/ui/Input";
import { Select } from "@/shared/components/ui/Select";
import { StatusBadge } from "@/shared/components/ui/Badge";
import { Modal } from "@/shared/components/ui/Modal";
import {
  getGroupPaymentSummary,
  getGroupByKode,
  addPembayaran,
  fetchInvoiceSplitConfig,
  saveInvoiceSplitConfig,
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

  // Auto-assign members round-robin when split count changes
  useEffect(() => {
    const newAssignments: Record<string, number> = {};
    anggota.forEach((a, i) => {
      newAssignments[a.id] = i % splitCount;
    });
    setAssignments(newAssignments);
  }, [splitCount, anggota]);

  function handleSubmit() {
    const splits: InvoiceSplitItem[] = Array.from({ length: splitCount }, (_, i) => {
      const label = String.fromCharCode(65 + i); // A, B, C, ...
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
                            // Cycle to next invoice
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
// MAIN PAGE
// ============================================================

export default function LaporanPembayaranPage() {
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
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Laporan Pembayaran</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Pusat input pembayaran — masukkan kode registrasi group untuk memulai
        </p>
      </div>

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
            <Button onClick={handleCari} disabled={searching}>
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

          {/* Split Invoice Tabs (only when split exists) */}
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
                  className="w-full"
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
        title="Pembayaran Berhasil"
        size="sm"
      >
        <div className="space-y-3 text-center">
          <CheckCircle className="mx-auto h-10 w-10 text-success" />
          <div>
            <p className="font-medium">Pembayaran dicatat</p>
            <p className="text-sm text-muted-foreground">
              Invoice <span className="font-mono">{successData?.invoiceNumber}</span> telah dibuat
            </p>
            <p className="text-lg font-bold mt-1">
              {successData ? formatCurrency(successData.amount) : ""}
            </p>
          </div>
          <Button className="w-full" onClick={() => setShowSuccess(false)}>
            Tutup
          </Button>
        </div>
      </Modal>
    </div>
  );
}
