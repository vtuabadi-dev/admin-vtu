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
  Sparkles,
  ExternalLink,
  ArrowLeft,
  Plus,
  Trash2,
  Layers,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/Card";
import { Button } from "@/shared/components/ui/Button";
import { Badge } from "@/shared/components/ui/Badge";
import { Input } from "@/shared/components/ui/Input";
import { Modal } from "@/shared/components/ui/Modal";
import { getAllPaymentSummaries, getKeberangkatanList } from "@/server/actions/api";
import type { GroupPaymentSummary, Keberangkatan } from "@/shared/types";
import { formatDate } from "@/shared/lib/utils";

export interface ReminderStage {
  id: string;
  title: string;
  daysBefore: number;
  template: string;
}

interface PackageDeadline {
  no: number;
  paketId: string;
  namaPaket: string;
  tanggalBerangkat: string;
  unpaidGroups: GroupPaymentSummary[];
  jumlahJamaahBelumLunas: number;
  stageDeadlines: Array<{
    stage: ReminderStage;
    deadlineDate: string;
    sisaHari: number;
    isDue: boolean;
  }>;
}

const DEFAULT_STAGES: ReminderStage[] = [
  {
    id: "stage-1",
    title: "Reminder #1 (Pengingat Awal H-50)",
    daysBefore: 50,
    template: `Assalamu'alaikum Wr. Wb.

Yth. Bapak/Ibu {NAMA_GROUP} ({NAMA_JAMAAH})

Kami menginfokan bahwa pendaftaran paket {NAMA_PAKET} (Keberangkatan: {TANGGAL_BERANGKAT}) telah memasuki periode pengingat H-50.

Batas akhir pelunasan resmi jatuh pada tanggal {DEADLINE_DATE} (tersisa {SISA_HARI_DEADLINE} hari lagi). Saat ini sisa tagihan rombongan Anda sebesar Rp{SISA_TAGIHAN}.

Mohon dapat dipersiapkan pelunasannya sebelum tanggal deadline tersebut. Terima kasih.

*VTU Travel Operational*`,
  },
  {
    id: "stage-2",
    title: "Reminder #2 (Pengingat Kedua H-45)",
    daysBefore: 45,
    template: `Assalamu'alaikum Wr. Wb.

Yth. Bapak/Ibu {NAMA_GROUP} ({NAMA_JAMAAH})

Pengingat kedua untuk pendaftaran paket {NAMA_PAKET} (Keberangkatan: {TANGGAL_BERANGKAT}).

Batas akhir pelunasan resmi jatuh pada tanggal {DEADLINE_DATE} (tinggal {SISA_HARI_DEADLINE} hari lagi ke deadline H-{DEADLINE_DAYS}). Saat ini masih terdapat sisa tagihan sebesar Rp{SISA_TAGIHAN}.

Mohon segera melakukan konfirmasi dan pelunasan. Terima kasih.

*VTU Travel Operational*`,
  },
  {
    id: "stage-3",
    title: "Reminder #3 (Peringatan Batas Akhir H-40)",
    daysBefore: 40,
    template: `Assalamu'alaikum Wr. Wb.

Yth. Bapak/Ibu {NAMA_GROUP} ({NAMA_JAMAAH})

PERINGATAN DEADLINE: Hari ini adalah batas akhir pelunasan resmi tanggal {DEADLINE_DATE} (H-{DEADLINE_DAYS} sebelum keberangkatan).

Sisa tagihan rombongan sebesar Rp{SISA_TAGIHAN} WAJIB dilunasi sekarang untuk pemrosesan visa dan perlengkapan jamaah.

Terima kasih atas perhatian dan kerja samanya.

*VTU Travel Operational*`,
  },
];

function hitungDeadlineDate(
  tanggalBerangkat: string,
  daysBeforeReminder: number,
  globalDeadlineDays: number = 40
): {
  officialDeadlineDate: string;
  reminderTriggerDate: string;
  sisaHariKeOfficialDeadline: number;
  sisaHariCurrent: number;
} {
  if (!tanggalBerangkat) return { officialDeadlineDate: "-", reminderTriggerDate: "-", sisaHariKeOfficialDeadline: 0, sisaHariCurrent: 999 };
  const berangkat = new Date(tanggalBerangkat);
  if (isNaN(berangkat.getTime())) return { officialDeadlineDate: "-", reminderTriggerDate: "-", sisaHariKeOfficialDeadline: 0, sisaHariCurrent: 999 };

  // Official Deadline Date = Tanggal Berangkat - globalDeadlineDays (default H-40)
  const officialDeadline = new Date(berangkat);
  officialDeadline.setDate(officialDeadline.getDate() - globalDeadlineDays);

  // Reminder Trigger Date = Tanggal Berangkat - daysBeforeReminder (misal H-50)
  const reminderTrigger = new Date(berangkat);
  reminderTrigger.setDate(reminderTrigger.getDate() - daysBeforeReminder);

  // Sisa hari dari tahap reminder ke official deadline (misal H-50 ke H-40 = 10 hari lagi)
  const sisaHariKeOfficialDeadline = Math.max(0, daysBeforeReminder - globalDeadlineDays);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  officialDeadline.setHours(0, 0, 0, 0);

  const diffTime = officialDeadline.getTime() - today.getTime();
  const sisaHariCurrent = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return {
    officialDeadlineDate: officialDeadline.toISOString().split("T")[0]!,
    reminderTriggerDate: reminderTrigger.toISOString().split("T")[0]!,
    sisaHariKeOfficialDeadline,
    sisaHariCurrent,
  };
}

function renderMessage(
  template: string,
  g: GroupPaymentSummary,
  pkgName: string,
  tglBerangkat: string,
  daysBeforeReminder: number,
  globalDeadlineDays: number = 40
) {
  const mainJamaah = g.anggota && g.anggota.length > 0 && g.anggota[0] ? g.anggota[0].namaLengkap : g.namaGroup;
  const calc = hitungDeadlineDate(tglBerangkat, daysBeforeReminder, globalDeadlineDays);

  return template
    .replace(/\{NAMA_GROUP\}/g, g.namaGroup)
    .replace(/\{NAMA_JAMAAH\}/g, mainJamaah)
    .replace(/\{NAMA_PAKET\}/g, pkgName)
    .replace(/\{TANGGAL_BERANGKAT\}/g, formatDate(tglBerangkat))
    .replace(/\{DEADLINE_DATE\}/g, formatDate(calc.officialDeadlineDate))
    .replace(/\{SISA_HARI_DEADLINE\}/g, String(calc.sisaHariKeOfficialDeadline))
    .replace(/\{DEADLINE_DAYS\}/g, String(globalDeadlineDays))
    .replace(/\{TARGET_HARI_REMINDER\}/g, String(daysBeforeReminder))
    .replace(/\{SISA_TAGIHAN\}/g, g.sisaPembayaran.toLocaleString("id-ID"));
}

export default function JadwalReminderPage() {
  const [summaries, setSummaries] = useState<GroupPaymentSummary[]>([]);
  const [kbrList, setKbrList] = useState<Keberangkatan[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState<string | null>(null);

  // View mode state: "dashboard" (Monitoring) or "settings" (Halaman Pengaturan Custom Multi-Reminder)
  const [viewMode, setViewMode] = useState<"dashboard" | "settings">("dashboard");

  // Dynamic Multiple Custom Reminder Stages
  const [reminderStages, setReminderStages] = useState<ReminderStage[]>(DEFAULT_STAGES);

  // Global Official Payment Deadline Target (Default: H-40)
  const [globalDeadlineDays, setGlobalDeadlineDays] = useState<number>(40);

  // Draft / Send Modal State (For Sending Messages)
  const [activePackageModal, setActivePackageModal] = useState<PackageDeadline | null>(null);
  const [selectedModalStageId, setSelectedModalStageId] = useState<string>("");
  const [copiedGroupIdx, setCopiedGroupIdx] = useState<number | null>(null);

  // Load reminder stages configuration and global deadline days from localStorage
  useEffect(() => {
    try {
      const savedStages = localStorage.getItem("vtu_custom_reminder_stages_v2");
      if (savedStages) {
        const parsed = JSON.parse(savedStages);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setReminderStages(parsed);
        }
      }
      const savedGlobalDeadline = localStorage.getItem("vtu_global_deadline_days");
      if (savedGlobalDeadline) {
        const parsed = parseInt(savedGlobalDeadline, 10);
        if (!isNaN(parsed) && parsed > 0) setGlobalDeadlineDays(parsed);
      }
    } catch (e) {
      console.error("Failed to load reminder stages from localStorage", e);
    }
  }, []);

  // Fetch Payment Summaries & Keberangkatan List
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [s, k] = await Promise.all([getAllPaymentSummaries(), getKeberangkatanList()]);
        setSummaries(s);
        setKbrList(k);
      } catch (err) {
        console.error("Error loading reminder data:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Save Reminder Stages to localStorage
  const handleSaveStagesConfig = () => {
    try {
      // Sort stages descending by daysBefore (e.g. H-50, H-45, H-40)
      const sorted = [...reminderStages].sort((a, b) => b.daysBefore - a.daysBefore);
      setReminderStages(sorted);
      localStorage.setItem("vtu_custom_reminder_stages_v2", JSON.stringify(sorted));
      localStorage.setItem("vtu_global_deadline_days", String(globalDeadlineDays));
      alert(`✅ Konfigurasi deadline resmi (H-${globalDeadlineDays}) & ${sorted.length} tahapan reminder berhasil disimpan!`);
      setViewMode("dashboard");
    } catch (e) {
      alert("⚠️ Gagal menyimpan konfigurasi reminder.");
    }
  };

  // Add new reminder stage
  const handleAddReminderStage = () => {
    const minDays = reminderStages.length > 0 ? Math.min(...reminderStages.map((s) => s.daysBefore)) : 40;
    const newDays = Math.max(5, minDays - 5);
    const newStage: ReminderStage = {
      id: `stage-${Date.now()}`,
      title: `Reminder #${reminderStages.length + 1} (H-${newDays})`,
      daysBefore: newDays,
      template: `Assalamu'alaikum Wr. Wb.

Yth. Bapak/Ibu {NAMA_GROUP} ({NAMA_JAMAAH})

Pemberitahuan penagihan untuk {NAMA_PAKET} (Keberangkatan: {TANGGAL_BERANGKAT}). Batas akhir pelunasan pada {DEADLINE_DATE} (H-{DEADLINE_DAYS}).

Sisa tagihan: Rp{SISA_TAGIHAN}.

Mohon segera diselesaikan. Terima kasih.

*VTU Travel Operational*`,
    };
    setReminderStages((prev) => [...prev, newStage]);
  };

  // Remove reminder stage
  const handleRemoveReminderStage = (id: string) => {
    if (reminderStages.length <= 1) {
      alert("⚠️ Pengaturan minimal harus memiliki 1 tahapan pengingat (reminder).");
      return;
    }
    setReminderStages((prev) => prev.filter((s) => s.id !== id));
  };

  // Update specific reminder stage
  const handleUpdateStage = (id: string, field: keyof ReminderStage, val: any) => {
    setReminderStages((prev) =>
      prev.map((stg) => (stg.id === id ? { ...stg, [field]: val } : stg))
    );
  };

  // Compute package deadlines using configured dynamic stages
  const packageDeadlines = useMemo((): PackageDeadline[] => {
    return kbrList
      .map((kbr, idx) => {
        const unpaidGroups = summaries.filter((s) => {
          const groupKbr = kbr.jamaahIds.some((jid) => s.anggota.some((a) => a.id === jid));
          return groupKbr && s.sisaPembayaran > 0;
        });

        const jumlahJamaahBelumLunas = unpaidGroups.reduce((sum, g) => sum + g.jumlahAnggota, 0);

        const stageDeadlines = reminderStages.map((stg) => {
          const { officialDeadlineDate, sisaHariCurrent } = hitungDeadlineDate(kbr.tanggalBerangkat, stg.daysBefore, globalDeadlineDays);
          return {
            stage: stg,
            deadlineDate: officialDeadlineDate,
            sisaHari: sisaHariCurrent,
            isDue: sisaHariCurrent <= 0,
          };
        });

        return {
          no: idx + 1,
          paketId: kbr.id,
          namaPaket: kbr.namaPaket || kbr.paketUmroh?.namaPaket || "-",
          tanggalBerangkat: kbr.tanggalBerangkat,
          unpaidGroups,
          jumlahJamaahBelumLunas,
          stageDeadlines,
        };
      })
      .filter((d) => d.jumlahJamaahBelumLunas > 0)
      .sort((a, b) => {
        const minSisaA = Math.min(...a.stageDeadlines.map((s) => s.sisaHari));
        const minSisaB = Math.min(...b.stageDeadlines.map((s) => s.sisaHari));
        return minSisaA - minSisaB;
      });
  }, [kbrList, summaries, reminderStages]);

  // Handle Batch Send Simulation
  function handleKirimSemuaBatch(pkg: PackageDeadline, stage: ReminderStage) {
    setSending(pkg.paketId);
    const messages = pkg.unpaidGroups.map((g) =>
      renderMessage(stage.template, g, pkg.namaPaket, pkg.tanggalBerangkat, stage.daysBefore, globalDeadlineDays)
    );

    setTimeout(() => {
      alert(
        `✅ Simulasi Terkirim! (${messages.length} pesan ${stage.title} terkirim via WhatsApp API Gateway):\n\n${messages
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
        <p className="text-muted-foreground font-semibold">Memuat data reminder &amp; jadwal penagihan...</p>
      </div>
    );
  }

  // =========================================================================
  // VIEW MODE 2: SETTINGS PAGE (PAGE REPLACEMENT — NO FLOATING MODAL)
  // =========================================================================
  if (viewMode === "settings") {
    return (
      <div className="space-y-6">
        {/* TOP BACK NAVIGATION BUTTON (TOMBOL KEMBALI DI ATAS JUDUL) */}
        <div>
          <Button
            variant="outline"
            onClick={() => setViewMode("dashboard")}
            className="flex items-center gap-2 border-emerald-500/40 text-emerald-950 dark:text-emerald-300 hover:bg-emerald-50 font-extrabold shadow-xs"
          >
            <ArrowLeft className="h-4 w-4 text-emerald-600" />
            Kembali ke Monitoring Deadline Pelunasan
          </Button>
        </div>

        {/* HEADER TITLE */}
        <div className="border-b pb-4">
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2.5">
            <Settings className="h-6 w-6 text-amber-500" />
            Pengaturan Multi-Reminder &amp; Custom Template Penagihan
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Atur berapa kali pengingat (Reminder H-Berapa) dikirimkan secara kustom, serta sesuaikan format isi pesan WhatsApp/SMS untuk setiap tahapan pengingat.
          </p>
        </div>

        {/* GLOBAL DEADLINE CONFIGURATION CARD */}
        <Card className="border-amber-500/40 bg-gradient-to-r from-amber-500/10 via-background to-transparent shadow-md">
          <CardContent className="pt-6 space-y-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-amber-500 text-slate-950 rounded-xl font-bold">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-foreground flex items-center gap-2">
                  ⚙️ Konfigurasi Target Batas Akhir Pelunasan Resmi (Global Deadline Target)
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Tentukan tanggal batas akhir pelunasan resmi jamaah (default: <strong className="text-amber-600 dark:text-amber-400">H-40 sebelum berangkat</strong>). Variabel <code className="bg-amber-500/15 text-amber-700 dark:text-amber-300 px-1.5 py-0.5 rounded font-mono text-[11px] font-bold">{"{DEADLINE_DATE}"}</code> akan mengacu pada tanggal ini.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2 max-w-md">
              <div className="flex-1">
                <label className="text-xs font-bold text-foreground block mb-1">
                  Batas Akhir Pelunasan Resmi Utamaku:
                </label>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-sm text-amber-600 dark:text-amber-400">H -</span>
                  <Input
                    type="number"
                    min={1}
                    max={90}
                    value={globalDeadlineDays}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      if (!isNaN(val) && val > 0) setGlobalDeadlineDays(val);
                    }}
                    className="w-24 font-extrabold text-center h-10 text-sm"
                  />
                  <span className="text-xs text-muted-foreground font-semibold">Hari Sebelum Berangkat</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* STAGES OVERVIEW HEADER */}
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-extrabold text-amber-950 dark:text-amber-200 flex items-center gap-2">
              <Layers className="h-4 w-4 text-amber-500" />
              Jumlah Tahapan Pengingat Terpasang: {reminderStages.length} Reminder
            </h3>
            <p className="text-xs text-amber-900/80 dark:text-amber-200/80 mt-0.5">
              Anda dapat menambah atau mengurangi tahapan pengingat (misal H-50, H-45, H-40) dengan template pesan unik di setiap tahap.
            </p>
          </div>
          <Button
            onClick={handleAddReminderStage}
            className="bg-amber-600 hover:bg-amber-700 text-white font-extrabold flex items-center gap-1.5 shrink-0 shadow-md"
          >
            <Plus className="h-4 w-4" />
            + Tambah Tahap Reminder Baru
          </Button>
        </div>

        {/* STAGES LIST (CARDS) */}
        <div className="space-y-6">
          {reminderStages.map((stage, idx) => {
            const sampleBerangkatDate = "2026-08-02";

            return (
              <Card key={stage.id} variant="operational" className="border-2 border-amber-500/30 shadow-md">
                <CardHeader className="bg-amber-500/10 border-b p-4 flex flex-row items-center justify-between">
                  <CardTitle className="text-sm font-extrabold text-amber-950 dark:text-amber-200 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-amber-500 text-slate-950 font-black text-xs flex items-center justify-center">
                      {idx + 1}
                    </span>
                    Pengingat Tahap #{idx + 1}: {stage.title || `H-${stage.daysBefore}`}
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveReminderStage(stage.id)}
                    className="text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-bold gap-1"
                  >
                    <Trash2 className="h-4 w-4" />
                    Hapus Reminder Ini
                  </Button>
                </CardHeader>

                <CardContent className="p-5 space-y-5">
                  {/* STAGE CONFIG INPUTS */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-xl bg-muted/40 border">
                    <div>
                      <label className="block text-xs font-bold text-foreground mb-1.5">
                        Target Hari Pengingat (H-Berapa Sebelum Keberangkatan)
                      </label>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-extrabold text-amber-600">H -</span>
                        <Input
                          type="number"
                          min={1}
                          max={180}
                          value={stage.daysBefore}
                          onChange={(e) =>
                            handleUpdateStage(stage.id, "daysBefore", parseInt(e.target.value, 10) || 30)
                          }
                          className="w-28 font-extrabold text-center h-10 text-sm"
                        />
                        <span className="text-xs text-muted-foreground font-semibold">Hari Sebelum Berangkat</span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-foreground mb-1.5">
                        Judul / Label Tahap Pengingat
                      </label>
                      <Input
                        type="text"
                        value={stage.title}
                        onChange={(e) => handleUpdateStage(stage.id, "title", e.target.value)}
                        placeholder="Contoh: Reminder #1 (Pengingat Awal H-50)"
                        className="h-10 text-xs font-bold"
                      />
                    </div>
                  </div>

                  {/* STAGE TEMPLATE EDITOR */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                        <MessageSquare className="h-4 w-4 text-amber-500" />
                        Custom Format Pesan WhatsApp / SMS (Tahap H-{stage.daysBefore})
                      </label>
                    </div>

                    {/* Variable Tag Chips */}
                    <div className="p-3 bg-muted/60 border rounded-xl space-y-2">
                      <p className="text-[11px] font-bold text-foreground flex items-center gap-1">
                        <Sparkles className="h-3.5 w-3.5 text-amber-500" /> Sisipkan Variabel Dinamis:
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {[
                          { tag: "{NAMA_GROUP}", label: "Nama Rombongan" },
                          { tag: "{NAMA_JAMAAH}", label: "Nama Utama Jamaah" },
                          { tag: "{NAMA_PAKET}", label: "Nama Paket Umroh" },
                          { tag: "{TANGGAL_BERANGKAT}", label: "Tgl Berangkat" },
                          { tag: "{DEADLINE_DATE}", label: `Tgl Batas Pelunasan Resmi (H-${globalDeadlineDays})` },
                          { tag: "{SISA_HARI_DEADLINE}", label: "Sisa Hari ke Deadline Pelunasan" },
                          { tag: "{DEADLINE_DAYS}", label: `Batas Pelunasan Resmi (H-${globalDeadlineDays})` },
                          { tag: "{TARGET_HARI_REMINDER}", label: `Target Hari Pengingat (H-${stage.daysBefore})` },
                          { tag: "{SISA_TAGIHAN}", label: "Sisa Tagihan (Rp)" },
                        ].map(({ tag, label }) => (
                          <button
                            key={tag}
                            type="button"
                            onClick={() =>
                              handleUpdateStage(stage.id, "template", `${stage.template} ${tag}`)
                            }
                            className="text-[11px] font-mono bg-background hover:bg-amber-500 hover:text-white text-foreground px-2.5 py-1 rounded-md border shadow-xs transition-colors cursor-pointer"
                            title={`Klik untuk menyisipkan ${label}`}
                          >
                            {tag}
                          </button>
                        ))}
                      </div>
                    </div>

                    <textarea
                      rows={7}
                      value={stage.template}
                      onChange={(e) => handleUpdateStage(stage.id, "template", e.target.value)}
                      className="w-full rounded-xl border border-stone-300 dark:border-stone-700 bg-background p-3.5 text-xs font-mono focus:ring-2 focus:ring-amber-500/50 leading-relaxed shadow-inner"
                      placeholder="Tuliskan template pesan kustom untuk tahap pengingat ini..."
                    />
                  </div>

                  {/* LIVE PREVIEW BOX FOR THIS STAGE */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
                      Pratinjau Hasil Pesan Tahap H-{stage.daysBefore} (Live Sample Preview):
                    </label>
                    <div className="p-4 bg-slate-950 text-slate-100 rounded-xl border border-slate-800 text-xs font-mono whitespace-pre-wrap leading-relaxed shadow-md">
                      {renderMessage(
                        stage.template,
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
                        "PAKET UMROH 9H JKT (SV)",
                        sampleBerangkatDate,
                        stage.daysBefore,
                        globalDeadlineDays
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* BOTTOM SAVE ACTIONS */}
        <div className="flex items-center justify-between pt-4 border-t sticky bottom-0 bg-background p-4 shadow-xl rounded-2xl border">
          <Button variant="outline" onClick={() => setViewMode("dashboard")} className="font-bold">
            ← Batal &amp; Kembali
          </Button>
          <Button
            onClick={handleSaveStagesConfig}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm px-6 shadow-md"
          >
            💾 Simpan Semua Konfigurasi Reminder ({reminderStages.length} Tahap)
          </Button>
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW MODE 1: MONITORING DEADLINE DASHBOARD
  // =========================================================================
  return (
    <div className="space-y-6">
      {/* HEADER BAR */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Clock className="h-6 w-6 text-amber-500" />
            Jadwal &amp; Konfigurasi Multi-Reminder Penagihan
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Monitoring deadline pelunasan per paket (Tahapan Aktif:{" "}
            <strong className="text-amber-600 dark:text-amber-400 font-bold">
              {reminderStages.map((s) => `H-${s.daysBefore}`).join(", ")}
            </strong>
            ) dan kirim pesan penagihan kustom via WhatsApp.
          </p>
        </div>

        <Button
          onClick={() => setViewMode("settings")}
          className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white font-extrabold shadow-md shrink-0"
        >
          <Settings className="h-4 w-4" />
          Pengaturan Deadline &amp; Custom Template ({reminderStages.length} Reminder)
        </Button>
      </div>

      {/* DYNAMIC STAGES OVERVIEW CHIPS */}
      <div className="p-4 rounded-2xl bg-muted/40 border flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-amber-500" /> Tahapan Reminder Kustom:
          </span>
          {reminderStages.map((stg, i) => (
            <Badge key={stg.id} variant="outline" className="bg-background border-amber-500/40 text-amber-900 dark:text-amber-300 font-bold text-xs">
              {i + 1}. {stg.title}
            </Badge>
          ))}
        </div>
        <Button variant="ghost" size="sm" onClick={() => setViewMode("settings")} className="text-xs text-amber-600 font-bold hover:underline">
          Edit Tahapan &amp; Pesan →
        </Button>
      </div>

      {/* DEADLINE MONITORING CARD */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            Daftar Paket Memerlukan Penagihan Reminder
          </CardTitle>
          <Badge variant="outline" className="font-mono text-xs">
            {packageDeadlines.length} Paket Perlu Tindakan
          </Badge>
        </CardHeader>
        <CardContent>
          {packageDeadlines.length === 0 ? (
            <div className="flex h-36 flex-col items-center justify-center text-muted-foreground text-sm space-y-2 border border-dashed rounded-xl bg-muted/20">
              <Check className="h-8 w-8 text-emerald-500" />
              <p className="font-medium text-foreground">Semua paket sudah lunas!</p>
              <p className="text-xs">Tidak ada tunggakan pembayaran jamaah pada seluruh tahapan reminder.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b text-left text-xs font-bold text-muted-foreground uppercase tracking-wider bg-muted/40">
                    <th className="py-3 px-3 w-10">No</th>
                    <th className="py-3 px-3">Nama Paket</th>
                    <th className="py-3 px-3">Jamaah Belum Lunas</th>
                    <th className="py-3 px-3">Status Tahapan Deadline (H-X)</th>
                    <th className="py-3 px-3 text-right">Aksi Penagihan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {packageDeadlines.map((d) => (
                    <tr key={d.paketId} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3.5 px-3 text-muted-foreground font-mono">{d.no}</td>
                      <td className="py-3.5 px-3">
                        <p className="font-bold text-foreground">{d.namaPaket}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-2 pt-0.5">
                          <span>
                            Berangkat: <strong className="text-foreground">{formatDate(d.tanggalBerangkat)}</strong>
                          </span>
                        </p>
                      </td>
                      <td className="py-3.5 px-3">
                        <span className="font-extrabold text-red-600 dark:text-red-400">
                          {d.jumlahJamaahBelumLunas} Pax
                        </span>
                        <span className="text-xs text-muted-foreground ml-1.5 font-medium">
                          ({d.unpaidGroups.length} rombongan)
                        </span>
                      </td>
                      <td className="py-3.5 px-3">
                        <div className="flex flex-wrap gap-1.5">
                          {d.stageDeadlines.map(({ stage, sisaHari }) => (
                            <Badge
                              key={stage.id}
                              variant={sisaHari <= 0 ? "destructive" : sisaHari <= 7 ? "warning" : "outline"}
                              className="text-[10px] font-bold"
                            >
                              H-{stage.daysBefore}: {sisaHari <= 0 ? `Lewat (${Math.abs(sisaHari)} hari)` : `${sisaHari} hari lagi`}
                            </Badge>
                          ))}
                        </div>
                      </td>
                      <td className="py-3.5 px-3 text-right">
                        <Button
                          size="sm"
                          onClick={() => {
                            setActivePackageModal(d);
                            if (reminderStages.length > 0 && reminderStages[0]) {
                              setSelectedModalStageId(reminderStages[0].id);
                            }
                          }}
                          className="bg-amber-600 hover:bg-amber-700 text-white font-bold shadow-xs flex items-center gap-1.5 ml-auto text-xs"
                        >
                          <Send className="h-3.5 w-3.5" />
                          Kirim Reminder ({d.unpaidGroups.length} Rombongan)
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

      {/* MODAL DETAIL & DRAFT REMINDER PER PAKET */}
      <Modal
        open={!!activePackageModal}
        onClose={() => setActivePackageModal(null)}
        title={`Penagihan Reminder — ${activePackageModal?.namaPaket}`}
        description={`Terdapat ${activePackageModal?.unpaidGroups.length} rombongan (${activePackageModal?.jumlahJamaahBelumLunas} pax) belum lunas.`}
        size="xl"
      >
        {activePackageModal && (() => {
          const selectedStage =
            reminderStages.find((s) => s.id === selectedModalStageId) || reminderStages[0] || DEFAULT_STAGES[0]!;
          const calc = hitungDeadlineDate(activePackageModal.tanggalBerangkat, selectedStage.daysBefore, globalDeadlineDays);

          return (
            <div className="space-y-4 pt-2">
              {/* SELECT REMINDER STAGE TO SEND */}
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-2">
                <label className="text-xs font-extrabold text-amber-950 dark:text-amber-200 block">
                  Pilih Tahapan Reminder Yang Akan Dikirim:
                </label>
                <div className="flex flex-wrap gap-2">
                  {reminderStages.map((stg) => (
                    <button
                      key={stg.id}
                      type="button"
                      onClick={() => setSelectedModalStageId(stg.id)}
                      className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition-all cursor-pointer ${
                        selectedStage.id === stg.id
                          ? "bg-amber-600 text-white border-amber-600 shadow-sm"
                          : "bg-background text-foreground border-muted hover:border-amber-500"
                      }`}
                    >
                      {stg.title} (H-{stg.daysBefore})
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-muted/40 p-3 rounded-xl border text-xs">
                <div>
                  <span>Tanggal Berangkat: <strong>{formatDate(activePackageModal.tanggalBerangkat)}</strong></span>
                  <span className="mx-2">•</span>
                  <span>Batas Pelunasan Resmi (H-{globalDeadlineDays}): <strong className="text-amber-600 font-bold">{formatDate(calc.officialDeadlineDate)}</strong></span>
                  <span className="mx-2">•</span>
                  <span>Pengingat: <strong>Tahap H-{selectedStage.daysBefore} ({calc.sisaHariKeOfficialDeadline} Hari Lagi ke Deadline Resmi)</strong></span>
                </div>
                <Button
                  size="sm"
                  onClick={() => handleKirimSemuaBatch(activePackageModal, selectedStage)}
                  disabled={sending === activePackageModal.paketId}
                  className="bg-amber-600 hover:bg-amber-700 text-white font-bold shadow-xs text-xs"
                >
                  <Send className="mr-1.5 h-3.5 w-3.5" />
                  {sending === activePackageModal.paketId ? "Mengirim..." : `Kirim Batch (${selectedStage.title})`}
                </Button>
              </div>

              {/* LIST OF UNPAID GROUPS */}
              <div className="space-y-3 max-h-[55vh] overflow-y-auto pr-1">
                {activePackageModal.unpaidGroups.map((g, idx) => {
                  const messageText = renderMessage(
                    selectedStage.template,
                    g,
                    activePackageModal.namaPaket,
                    activePackageModal.tanggalBerangkat,
                    selectedStage.daysBefore,
                    globalDeadlineDays
                  );
                  const firstPhone =
                    g.anggota && g.anggota.length > 0
                      ? (g.anggota[0] as any).noHp || (g.anggota[0] as any).telepon || ""
                      : "";
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
                      <div className="p-3 bg-slate-950 text-slate-100 rounded-lg text-xs font-mono whitespace-pre-wrap leading-relaxed relative group">
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
          );
        })()}
      </Modal>
    </div>
  );
}
