"use client";

import { useState } from "react";
import { Search, CheckCircle2, Circle, Clock, AlertTriangle, Users, CreditCard, Plane } from "lucide-react";

interface TrackResult {
  kodeRegistrasi: string;
  namaPerwakilan: string;
  statusLabel: string;
  paxCount: number;
  members: { namaLengkap: string; jenisKelamin: string }[];
  groupInfo?: { namaGroup: string; totalTagihan: number; totalPembayaran: number; sisaPembayaran: number; paket?: { namaPaket: string; tanggalBerangkat: string } };
  invoices: any[];
  payments: any[];
  progress: { step: string; label: string; done: boolean; current: boolean }[];
  createdAt: string;
}

export default function TrackPage() {
  const [kode, setKode] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TrackResult | null>(null);
  const [error, setError] = useState("");

  async function handleCheck() {
    if (!kode.trim()) return;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch(`/api/track?kode=${encodeURIComponent(kode.trim())}`);
      const json = await res.json();
      if (json.success) {
        setResult(json.data);
      } else {
        setError(json.message || "Kode tidak ditemukan");
      }
    } catch {
      setError("Gagal menghubungi server. Silakan coba lagi.");
    } finally {
      setLoading(false);
    }
  }

  const formatRp = (n: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 to-background">
      <div className="mx-auto max-w-2xl px-4 py-12">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
            <Search className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Cek Status Pendaftaran</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Masukkan kode registrasi yang diterima saat mendaftar
          </p>
        </div>

        {/* Input */}
        <div className="flex gap-2 mb-8">
          <input
            type="text"
            value={kode}
            onChange={(e) => setKode(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === "Enter" && handleCheck()}
            placeholder="Contoh: GRP-2026-00001"
            className="flex-1 rounded-lg border bg-background px-4 py-3 text-sm font-mono tracking-wider placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <button
            onClick={handleCheck}
            disabled={loading || !kode.trim()}
            className="rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {loading ? "Mencari..." : "Cek Status"}
          </button>
        </div>

        {error && (
          <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4 text-center text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Result */}
        {result && (
          <div className="space-y-4 animate-in fade-in">
            {/* Status header */}
            <div className="rounded-xl border bg-card p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-xs text-muted-foreground font-mono">{result.kodeRegistrasi}</p>
                  <p className="text-lg font-semibold">{result.namaPerwakilan}</p>
                </div>
                <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                  {result.statusLabel}
                </span>
              </div>

              {/* Progress steps */}
              <div className="space-y-1.5">
                {result.progress.map((step) => (
                  <div key={step.step} className="flex items-center gap-3">
                    {step.done ? (
                      <CheckCircle2 className="h-5 w-5 text-success shrink-0" />
                    ) : step.current ? (
                      <Clock className="h-5 w-5 text-primary shrink-0 animate-pulse" />
                    ) : (
                      <Circle className="h-5 w-5 text-muted-foreground/30 shrink-0" />
                    )}
                    <span className={`text-sm ${step.done ? "text-foreground" : step.current ? "text-primary font-medium" : "text-muted-foreground"}`}>
                      {step.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Members */}
            <div className="rounded-xl border bg-card p-6">
              <div className="flex items-center gap-2 mb-3">
                <Users className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold">Anggota ({result.paxCount} Pax)</h3>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {result.members.map((m, i) => (
                  <div key={i} className="rounded-md bg-muted/50 px-3 py-2 text-sm">
                    {m.namaLengkap}
                    <span className="ml-2 text-xs text-muted-foreground">{m.jenisKelamin === "L" ? "L" : "P"}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Package info */}
            {result.groupInfo?.paket && (
              <div className="rounded-xl border bg-card p-6">
                <div className="flex items-center gap-2 mb-3">
                  <Plane className="h-4 w-4 text-muted-foreground" />
                  <h3 className="text-sm font-semibold">Paket</h3>
                </div>
                <p className="text-sm font-medium">{result.groupInfo.paket.namaPaket}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Keberangkatan: {new Date(result.groupInfo.paket.tanggalBerangkat).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
                </p>
              </div>
            )}

            {/* Payment info */}
            {result.groupInfo && (
              <div className="rounded-xl border bg-card p-6">
                <div className="flex items-center gap-2 mb-3">
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                  <h3 className="text-sm font-semibold">Pembayaran</h3>
                </div>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="rounded-md bg-muted/50 p-3">
                    <p className="text-lg font-bold">{formatRp(result.groupInfo.totalTagihan)}</p>
                    <p className="text-[10px] text-muted-foreground">Total</p>
                  </div>
                  <div className="rounded-md bg-success/5 p-3">
                    <p className="text-lg font-bold text-success">{formatRp(result.groupInfo.totalPembayaran)}</p>
                    <p className="text-[10px] text-muted-foreground">Dibayar</p>
                  </div>
                  <div className="rounded-md bg-warning/5 p-3">
                    <p className="text-lg font-bold text-warning">{formatRp(result.groupInfo.sisaPembayaran)}</p>
                    <p className="text-[10px] text-muted-foreground">Sisa</p>
                  </div>
                </div>

                {/* Invoices */}
                {result.invoices.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {result.invoices.map((inv: any, i: number) => (
                      <div key={i} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                        <div>
                          <span className="font-medium">{inv.nomorInvoice}</span>
                          <span className="ml-2 text-xs text-muted-foreground uppercase">{inv.tipe}</span>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">{formatRp(inv.jumlah)}</p>
                          <p className={`text-xs ${inv.status === "paid" ? "text-success" : inv.status === "overdue" ? "text-destructive" : "text-warning"}`}>
                            {inv.status === "paid" ? "Lunas" : inv.status === "overdue" ? "Jatuh Tempo" : `Sisa ${formatRp(inv.sisa)}`}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Reminder */}
            {!result.groupInfo && (
              <div className="rounded-xl border border-warning/20 bg-warning/5 p-4 flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Pendaftaran masih dalam proses</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Pendaftaran Anda sedang ditinjau oleh admin. Anda akan menerima informasi akun jamaah setelah disetujui.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
