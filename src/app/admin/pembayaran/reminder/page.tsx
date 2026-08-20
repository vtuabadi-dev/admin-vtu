"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Clock,
  Send,
  AlertTriangle,
  Settings,
  MessageSquare,
  Copy,
  Check,
  CalendarDays,
  Sparkles,
  ExternalLink,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/Card";
import { Button } from "@/shared/components/ui/Button";
import { Badge } from "@/shared/components/ui/Badge";
import { Input } from "@/shared/components/ui/Input";
import { Modal } from "@/shared/components/ui/Modal";
import { getAllPaymentSummaries, getKeberangkatanList } from "@/server/actions/api";
import type { GroupPaymentSummary, Keberangkatan } from "@/shared/types";
import { formatDate } from "@/shared/lib/utils";

interface PackageDeadline {
  no: number;
  paketId: string;
  namaPaket: string;
  tanggalBerangkat: string;
  deadline: string;
  sisaHari: number;
  jumlahJamaahBelumLunas: number;
  unpaidGroups: GroupPaymentSummary[];
}

const DEFAULT_TEMPLATE = `Assalamu'alaikum Wr. Wb.

Yth. Bapak/Ibu {NAMA_GROUP} ({NAMA_JAMAAH})

Kami mengingatkan bahwa pelunasan untuk {NAMA_PAKET} (Keberangkatan: {TANGGAL_BERANGKAT}) memiliki batas akhir pelunasan pada {DEADLINE_DATE} (H-{DEADLINE_DAYS} sebelum keberangkatan).

Saat ini masih terdapat sisa tagihan sebesar Rp{SISA_TAGIHAN}.

Mohon untuk dapat segera diselesaikan sebelum batas waktu tersebut. Terima kasih.

*VTU Travel Operational*`;

function hitungDeadline(tanggalBerangkat: string, daysBefore: number = 40): { deadline: string; sisaHari: number } {
  if (!tanggalBerangkat) {
    return { deadline: "-", sisaHari: 999 };
  }
  const berangkat = new Date(tanggalBerangkat);
  if (isNaN(berangkat.getTime())) {
    return { deadline: "-", sisaHari: 999 };
  }

  const deadline = new Date(berangkat);
  deadline.setDate(deadline.getDate() - daysBefore);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  deadline.setHours(0, 0, 0, 0);

  const diffTime = deadline.getTime() - today.getTime();
  const sisaHari = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return {
    deadline: deadline.toISOString().split("T")[0]!,
    sisaHari,
  };
}

export default function JadwalReminderPage() {
  const [summaries, setSummaries] = useState<GroupPaymentSummary[]>([]);
  const [kbrList, setKbrList] = useState<Keberangkatan[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState<string | null>(null);

  // Configuration State (Deadline H-X & Template)
  const [deadlineDays, setDeadlineDays] = useState<number>(40);
  const [reminderTemplate, setReminderTemplate] = useState<string>(DEFAULT_TEMPLATE);
  const [configModalOpen, setConfigModalOpen] = useState<boolean>(false);

  // Temporary config inputs in modal
  const [tempDays, setTempDays] = useState<number>(40);
  const [tempTemplate, setTempTemplate] = useState<string>(DEFAULT_TEMPLATE);

  // Draft / Send Modal State
  const [activePackageModal, setActivePackageModal] = useState<PackageDeadline | null>(null);
  const [copiedGroupIdx, setCopiedGroupIdx] = useState<number | null>(null);

  // Load configuration from localStorage
  useEffect(() => {
    try {
      const savedDays = localStorage.getItem("vtu_reminder_deadline_days");
      if (savedDays) {
        const parsed = parseInt(savedDays, 10);
        if (!isNaN(parsed) && parsed > 0) {
          setDeadlineDays(parsed);
          setTempDays(parsed);
        }
      }
      const savedTemplate = localStorage.getItem("vtu_reminder_wa_template");
      if (savedTemplate) {
        setReminderTemplate(savedTemplate);
        setTempTemplate(savedTemplate);
      }
    } catch (e) {
      console.error("Failed to load reminder config from localStorage", e);
    }
  }, []);

  useEffect(() => {
    async function load() {
      const [s, k] = await Promise.all([getAllPaymentSummaries(), getKeberangkatanList()]);
      setSummaries(s);
      setKbrList(k);
      setLoading(false);
    }
    load();
  }, []);

  // Compute package deadlines using configured H-X days
  const deadlines = useMemo((): PackageDeadline[] => {
    return kbrList
      .map((kbr, idx) => {
        const { deadline, sisaHari } = hitungDeadline(kbr.tanggalBerangkat, deadlineDays);

        const unpaidGroups = summaries.filter((s) => {
          const groupKbr = kbr.jamaahIds.some((jid) => s.anggota.some((a) => a.id === jid));
          return groupKbr && s.sisaPembayaran > 0;
        });

        const jumlahJamaahBelumLunas = unpaidGroups.reduce((sum, g) => sum + g.jumlahAnggota, 0);

        return {
          no: idx + 1,
          paketId: kbr.id,
          namaPaket: kbr.namaPaket || kbr.paketUmroh?.namaPaket || "-",
          tanggalBerangkat: kbr.tanggalBerangkat,
          deadline,
          sisaHari,
          jumlahJamaahBelumLunas,
          unpaidGroups,
        };
      })
      .filter((d) => d.jumlahJamaahBelumLunas > 0)
      .sort((a, b) => a.sisaHari - b.sisaHari);
  }, [kbrList, summaries, deadlineDays]);

  // Helper to render template message with dynamic tags
  function renderMessage(template: string, g: GroupPaymentSummary, pkg: PackageDeadline) {
    const mainJamaah = g.anggota && g.anggota.length > 0 && g.anggota[0] ? g.anggota[0].namaLengkap : g.namaGroup;
    return template
      .replace(/\{NAMA_GROUP\}/g, g.namaGroup)
      .replace(/\{NAMA_JAMAAH\}/g, mainJamaah)
      .replace(/\{NAMA_PAKET\}/g, pkg.namaPaket)
      .replace(/\{TANGGAL_BERANGKAT\}/g, formatDate(pkg.tanggalBerangkat))
      .replace(/\{DEADLINE_DATE\}/g, formatDate(pkg.deadline))
      .replace(/\{DEADLINE_DAYS\}/g, String(deadlineDays))
      .replace(/\{SISA_TAGIHAN\}/g, g.sisaPembayaran.toLocaleString("id-ID"));
  }

  // Save Config to LocalStorage & State
  function handleSaveConfig() {
    setDeadlineDays(tempDays);
    setReminderTemplate(tempTemplate);
    try {
      localStorage.setItem("vtu_reminder_deadline_days", String(tempDays));
      localStorage.setItem("vtu_reminder_wa_template", tempTemplate);
    } catch (e) {
      console.error("Failed to save config to localStorage", e);
    }
    setConfigModalOpen(false);
  }

  // Insert placeholder tag into template editor
  function insertPlaceholderTag(tag: string) {
    setTempTemplate((prev) => `${prev} ${tag}`);
  }

  // Handle Send Batch Simulation
  function handleKirimSemuaBatch(pkg: PackageDeadline) {
    setSending(pkg.paketId);
    const messages = pkg.unpaidGroups.map((g) => renderMessage(reminderTemplate, g, pkg));

    setTimeout(() => {
      alert(
        `✅ Simulasi Terkirim! (${messages.length} pesan reminder terkirim via WhatsApp API Gateway):\n\n${messages
          .slice(0, 2)
          .join("\n\n-------------------\n\n")}${messages.length > 2 ? `\n\n...dan ${messages.length - 2} grup lainnya.` : ""}`
      );
      setSending(null);
      setActivePackageModal(null);
    }, 400);
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-muted-foreground">Memuat data reminder...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* HEADER BAR */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Clock className="h-6 w-6 text-amber-500" />
            Jadwal & Konfigurasi Reminder Penagihan
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Monitoring deadline pelunasan per paket (Standar Aktif:{" "}
            <strong className="text-amber-600 dark:text-amber-400 font-bold">
              H-{deadlineDays} sebelum keberangkatan
            </strong>
            ) dan pengaturan template pesan penagihan.
          </p>
        </div>

        <Button
          variant="outline"
          onClick={() => {
            setTempDays(deadlineDays);
            setTempTemplate(reminderTemplate);
            setConfigModalOpen(true);
          }}
          className="flex items-center gap-2 border-amber-500/40 text-amber-900 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/40 font-bold shadow-xs shrink-0"
        >
          <Settings className="h-4 w-4 text-amber-500" />
          Pengaturan Deadline & Template
        </Button>
      </div>

      {/* DEADLINE MONITORING CARD */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            Daftar Paket Mendekati Deadline Pelunasan (H-{deadlineDays})
          </CardTitle>
          <Badge variant="outline" className="font-mono text-xs">
            {deadlines.length} Paket Perlu Tindakan
          </Badge>
        </CardHeader>
        <CardContent>
          {deadlines.length === 0 ? (
            <div className="flex h-36 flex-col items-center justify-center text-muted-foreground text-sm space-y-2 border border-dashed rounded-xl bg-muted/20">
              <Check className="h-8 w-8 text-emerald-500" />
              <p className="font-medium text-foreground">Semua paket sudah lunas!</p>
              <p className="text-xs">Tidak ada tunggakan pembayaran yang melewati batas H-{deadlineDays}.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b text-left text-xs font-bold text-muted-foreground uppercase tracking-wider bg-muted/40">
                    <th className="py-3 px-3 w-10">No</th>
                    <th className="py-3 px-3">Nama Paket</th>
                    <th className="py-3 px-3">Jumlah Jamaah Belum Lunas</th>
                    <th className="py-3 px-3">Sisa Hari (H-{deadlineDays})</th>
                    <th className="py-3 px-3 text-right">Aksi Penagihan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {deadlines.map((d) => (
                    <tr key={d.paketId} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3.5 px-3 text-muted-foreground font-mono">{d.no}</td>
                      <td className="py-3.5 px-3">
                        <p className="font-bold text-foreground">{d.namaPaket}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-2 pt-0.5">
                          <span>
                            Deadline (H-{deadlineDays}):{" "}
                            <strong className="text-foreground">{formatDate(d.deadline)}</strong>
                          </span>
                          <span>•</span>
                          <span>
                            Berangkat: <strong className="text-foreground">{formatDate(d.tanggalBerangkat)}</strong>
                          </span>
                        </p>
                      </td>
                      <td className="py-3.5 px-3">
                        <span className="font-extrabold text-red-600 dark:text-red-400">
                          {d.jumlahJamaahBelumLunas} orang
                        </span>
                        <span className="text-xs text-muted-foreground ml-1.5 font-medium">
                          ({d.unpaidGroups.length} rombongan)
                        </span>
                      </td>
                      <td className="py-3.5 px-3">
                        {d.sisaHari <= 0 ? (
                          <Badge variant="destructive" className="text-xs font-bold">
                            <AlertTriangle className="mr-1 h-3 w-3" />
                            Melewati Deadline ({Math.abs(d.sisaHari)} hari)
                          </Badge>
                        ) : d.sisaHari <= 7 ? (
                          <Badge variant="warning" className="text-xs font-bold bg-amber-500 text-white">
                            <Clock className="mr-1 h-3 w-3" />
                            H-{d.sisaHari} Hari Lagi
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs font-medium border-emerald-500/50 text-emerald-600 dark:text-emerald-400">
                            H-{d.sisaHari} Hari Lagi
                          </Badge>
                        )}
                      </td>
                      <td className="py-3.5 px-3 text-right">
                        <Button
                          size="sm"
                          onClick={() => setActivePackageModal(d)}
                          className="bg-amber-600 hover:bg-amber-700 text-white font-bold shadow-xs flex items-center gap-1.5 ml-auto"
                        >
                          <Send className="h-3.5 w-3.5" />
                          Detail & Kirim Reminder ({d.unpaidGroups.length})
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* MODAL CONFIGURATION (Deadline Days & WA Message Template) */}
      <Modal
        open={configModalOpen}
        onClose={() => setConfigModalOpen(false)}
        title="Pengaturan Reminder & Template Penagihan"
        description="Konfigurasi target batas deadline (H-Berapa) dan format kata-kata reminder penagihan WhatsApp."
        size="lg"
      >
        <div className="space-y-5 pt-2">
          {/* SECTION 1: DEADLINE H-X */}
          <div className="space-y-2 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl">
            <label className="text-xs font-bold uppercase tracking-wider text-amber-900 dark:text-amber-200 flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-amber-500" />
              1. Target Batas Akhir Penagihan (H-Berapa Sebelum Keberangkatan)
            </label>
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold">H -</span>
              <Input
                type="number"
                min={1}
                max={120}
                value={tempDays}
                onChange={(e) => setTempDays(parseInt(e.target.value, 10) || 40)}
                className="w-24 font-bold text-center h-9 text-sm"
              />
              <span className="text-xs text-muted-foreground">Hari sebelum tanggal keberangkatan paket.</span>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <span className="text-[11px] text-stone-500 font-medium">Pilihan Cepat:</span>
              {[30, 40, 45, 60].map((days) => (
                <button
                  key={days}
                  type="button"
                  onClick={() => setTempDays(days)}
                  className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border transition-all ${
                    tempDays === days
                      ? "bg-amber-600 text-white border-amber-600 shadow-xs"
                      : "bg-background border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:border-amber-500"
                  }`}
                >
                  H-{days}
                </button>
              ))}
            </div>
          </div>

          {/* SECTION 2: TEMPLATE EDITOR & TAG CHIPS */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-amber-500" />
                2. Template Pesan Penagihan (WhatsApp / SMS)
              </label>
              <button
                type="button"
                onClick={() => setTempTemplate(DEFAULT_TEMPLATE)}
                className="text-[11px] text-amber-600 dark:text-amber-400 hover:underline font-semibold"
              >
                Reset Ke Template Standar
              </button>
            </div>

            {/* Variable Tag Chips */}
            <div className="p-2.5 bg-muted/50 border rounded-xl space-y-1.5">
              <p className="text-[11px] font-bold text-stone-600 dark:text-stone-300 flex items-center gap-1">
                <Sparkles className="h-3 w-3 text-amber-500" /> Klik Tag Variabel di bawah untuk menyisipkan ke
                template:
              </p>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { tag: "{NAMA_GROUP}", label: "Nama Rombongan" },
                  { tag: "{NAMA_JAMAAH}", label: "Nama Utama Jamaah" },
                  { tag: "{NAMA_PAKET}", label: "Nama Paket Umroh" },
                  { tag: "{TANGGAL_BERANGKAT}", label: "Tgl Berangkat" },
                  { tag: "{DEADLINE_DATE}", label: "Tgl Batas Deadline" },
                  { tag: "{DEADLINE_DAYS}", label: "Hitungan H-X" },
                  { tag: "{SISA_TAGIHAN}", label: "Sisa Tagihan (Rp)" },
                ].map(({ tag, label }) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => insertPlaceholderTag(tag)}
                    className="text-[11px] font-mono bg-stone-200 dark:bg-stone-800 hover:bg-amber-500 hover:text-white text-stone-800 dark:text-stone-200 px-2 py-0.5 rounded border border-stone-300 dark:border-stone-700 transition-colors"
                    title={`Klik untuk sisipkan ${label}`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            <textarea
              rows={8}
              value={tempTemplate}
              onChange={(e) => setTempTemplate(e.target.value)}
              className="w-full rounded-xl border border-stone-300 dark:border-stone-700 bg-background p-3 text-xs font-mono focus:ring-2 focus:ring-amber-500/50 leading-relaxed shadow-inner"
              placeholder="Tuliskan template pesan penagihan di sini..."
            />
          </div>

          {/* SECTION 3: LIVE PREVIEW */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
              Pratinjau Hasil Pesan (Live Sample Preview):
            </label>
            <div className="p-3.5 bg-stone-900 text-stone-100 rounded-xl border border-stone-800 text-xs font-mono whitespace-pre-wrap leading-relaxed shadow-sm">
              {renderMessage(
                tempTemplate,
                {
                  groupId: "sample-1",
                  kodeRegistrasi: "REG-001",
                  namaGroup: "ROMBONGAN H. AHMAD",
                  jumlahAnggota: 4,
                  totalTagihan: 140000000,
                  totalPembayaran: 100000000,
                  sisaPembayaran: 40000000,
                  status: "sebagian" as any,
                  anggota: [{ id: "j1", namaLengkap: "H. AHMAD SYAH" } as any],
                  pembayaran: [],
                  invoices: [],
                },
                {
                  no: 1,
                  paketId: "sample-pkg",
                  namaPaket: "PAKET UMROH 9H JKT (SV)",
                  tanggalBerangkat: "2026-08-02",
                  deadline: "2026-06-23",
                  sisaHari: tempDays,
                  jumlahJamaahBelumLunas: 4,
                  unpaidGroups: [],
                }
              )}
            </div>
          </div>

          {/* FOOTER ACTIONS */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t">
            <Button variant="outline" onClick={() => setConfigModalOpen(false)}>
              Batal
            </Button>
            <Button onClick={handleSaveConfig} className="bg-amber-600 hover:bg-amber-700 text-white font-bold">
              Simpan Konfigurasi Reminder
            </Button>
          </div>
        </div>
      </Modal>

      {/* MODAL DETAIL & DRAFT REMINDER PER PAKET */}
      <Modal
        open={!!activePackageModal}
        onClose={() => setActivePackageModal(null)}
        title={`Daftar Penagihan — ${activePackageModal?.namaPaket}`}
        description={`Terdapat ${activePackageModal?.unpaidGroups.length} rombongan (${activePackageModal?.jumlahJamaahBelumLunas} jamaah) belum lunas.`}
        size="xl"
      >
        {activePackageModal && (
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between bg-amber-500/10 border border-amber-500/30 p-3 rounded-xl">
              <div className="text-xs text-amber-900 dark:text-amber-200">
                <span>Tanggal Keberangkatan: <strong>{formatDate(activePackageModal.tanggalBerangkat)}</strong></span>
                <span className="mx-2">•</span>
                <span>Batas Deadline (H-{deadlineDays}): <strong>{formatDate(activePackageModal.deadline)}</strong></span>
              </div>
              <Button
                size="sm"
                onClick={() => handleKirimSemuaBatch(activePackageModal)}
                disabled={sending === activePackageModal.paketId}
                className="bg-amber-600 hover:bg-amber-700 text-white font-bold shadow-xs text-xs"
              >
                <Send className="mr-1.5 h-3.5 w-3.5" />
                {sending === activePackageModal.paketId ? "Mengirim..." : "Kirim Semua Reminder (Batch)"}
              </Button>
            </div>

            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
              {activePackageModal.unpaidGroups.map((g, idx) => {
                const messageText = renderMessage(reminderTemplate, g, activePackageModal);
                const firstPhone = g.anggota && g.anggota.length > 0 ? (g.anggota[0] as any).noHp || (g.anggota[0] as any).telepon || "" : "";
                const cleanPhone = firstPhone.replace(/[^0-9]/g, "").replace(/^0/, "62");
                const waUrl = cleanPhone
                  ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(messageText)}`
                  : `https://api.whatsapp.com/send?text=${encodeURIComponent(messageText)}`;

                return (
                  <div
                    key={g.groupId || idx}
                    className="p-4 border rounded-xl bg-card space-y-3 shadow-xs hover:border-amber-500/40 transition-colors"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-2">
                      <div>
                        <h4 className="font-bold text-sm text-foreground flex items-center gap-2">
                          <span>{g.namaGroup}</span>
                          <span className="text-xs text-muted-foreground font-medium">({g.jumlahAnggota} Pax)</span>
                        </h4>
                        <p className="text-xs text-muted-foreground">
                          Anggota Utama: {g.anggota && g.anggota.length > 0 && g.anggota[0] ? g.anggota[0].namaLengkap : "-"}
                          {cleanPhone && ` • WA: ${firstPhone}`}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-muted-foreground uppercase font-semibold">Sisa Tagihan:</span>
                        <p className="text-sm font-extrabold text-red-600 dark:text-red-400">
                          Rp{g.sisaPembayaran.toLocaleString("id-ID")}
                        </p>
                      </div>
                    </div>

                    {/* MESSAGE PREVIEW BOX */}
                    <div className="p-3 bg-stone-900 text-stone-100 rounded-lg text-xs font-mono whitespace-pre-wrap leading-relaxed relative group">
                      {messageText}
                    </div>

                    {/* ACTION BUTTONS */}
                    <div className="flex items-center justify-end gap-2 pt-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          navigator.clipboard.writeText(messageText);
                          setCopiedGroupIdx(idx);
                          setTimeout(() => setCopiedGroupIdx(null), 2000);
                        }}
                        className="text-xs h-8"
                      >
                        {copiedGroupIdx === idx ? (
                          <>
                            <Check className="h-3.5 w-3.5 text-emerald-500 mr-1" /> Tersalin!
                          </>
                        ) : (
                          <>
                            <Copy className="h-3.5 w-3.5 mr-1" /> Salin Pesan
                          </>
                        )}
                      </Button>

                      <a href={waUrl} target="_blank" rel="noopener noreferrer">
                        <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8 font-bold">
                          <ExternalLink className="h-3.5 w-3.5 mr-1" />
                          Kirim via WhatsApp Direct
                        </Button>
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
