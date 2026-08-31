"use client";

import React, { useState, useEffect, useMemo, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Printer,
  Copy,
  Check,
  Building2,
  ScrollText,
  User,
  Sparkles,
  FileSignature,
  Share2,
  QrCode,
  Download,
  Search,
  Sliders,
  History,
  Trash2,
  Eye,
  CheckCircle2,
  ExternalLink,
  Plus,
  Plane,
  Layers,
  ArrowRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/Card";
import { Button } from "@/shared/components/ui/Button";
import { Input } from "@/shared/components/ui/Input";
import { Select } from "@/shared/components/ui/Select";
import { Badge } from "@/shared/components/ui/Badge";
import { Modal } from "@/shared/components/ui/Modal";
import { formatDate, formatDateShort, cn } from "@/shared/lib/utils";
import { useOperationalStore } from "@/stores/operational-store";
import { KOP_SURAT_BASE64 } from "@/server/assets/kop-surat";
import {
  DEFAULT_SURAT_TEMPLATES,
  loadSavedSuratTemplates,
  loadGeneratedSuratLogs,
  saveGeneratedSuratLog,
  deleteGeneratedSuratLog,
  resolveAutocratFieldValues,
  renderAutocratMergedText,
  getTodayDateInfo,
} from "@/shared/lib/surat-autocrat-engine";
import type {
  SuratTemplate,
  GeneratedSuratLog,
} from "@/shared/types/surat";

function GenerateSuratPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // URL query params
  const initialTemplateParam = searchParams.get("template") || searchParams.get("type") || "";
  const initialTabParam = searchParams.get("tab") || "generator";

  // Main UI Tabs: "generator" | "history"
  const [activeMainTab, setActiveMainTab] = useState<"generator" | "history">(
    initialTabParam === "history" ? "history" : "generator"
  );

  // Operational store
  const storeKbrList = useOperationalStore((s) => s.keberangkatanList);
  const storeJamaah = useOperationalStore((s) => s.jamaahList);
  const setStoreJamaah = useOperationalStore((s) => s.setJamaahList);
  const setStoreKbrList = useOperationalStore((s) => s.setKeberangkatanList);

  // Local state
  const [templates, setTemplates] = useState<SuratTemplate[]>(DEFAULT_SURAT_TEMPLATES);
  const [selectedTemplateSlug, setSelectedTemplateSlug] = useState<string>("rekom-paspor");
  const [selectedPackageId, setSelectedPackageId] = useState<string>("");
  const [selectedJamaahId, setSelectedJamaahId] = useState<string>("");

  // Dynamic Form Data (for placeholders)
  const [manualFormData, setManualFormData] = useState<Record<string, string>>({});
  const [nomorUrutSurat, setNomorUrutSurat] = useState<string>("001");
  const [customPerihal, setCustomPerihal] = useState<string>("");
  const [customTujuan, setCustomTujuan] = useState<string>("");
  const [customKotaTujuan, setCustomKotaTujuan] = useState<string>("");
  const [customLampiran, setCustomLampiran] = useState<string>("");
  const [customShowBarcode, setCustomShowBarcode] = useState<boolean | null>(null);

  // History state
  const [historyLogs, setHistoryLogs] = useState<GeneratedSuratLog[]>([]);
  const [historySearch, setHistorySearch] = useState<string>("");
  const [historyFilterTemplate, setHistoryFilterTemplate] = useState<string>("all");

  // UI helpers
  const [copiedText, setCopiedText] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [previewModalLog, setPreviewModalLog] = useState<GeneratedSuratLog | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Load Templates & History
  useEffect(() => {
    async function loadAll() {
      // 1. Templates
      try {
        const res = await fetch("/api/master/surat-templates");
        if (res.ok) {
          const json = await res.json();
          if (json.data && Array.isArray(json.data) && json.data.length > 0) {
            setTemplates(json.data);
          } else {
            setTemplates(loadSavedSuratTemplates());
          }
        } else {
          setTemplates(loadSavedSuratTemplates());
        }
      } catch {
        setTemplates(loadSavedSuratTemplates());
      }

      // 2. History logs
      try {
        const hRes = await fetch("/api/surat/generated");
        if (hRes.ok) {
          const hJson = await hRes.json();
          if (hJson.data && Array.isArray(hJson.data)) {
            setHistoryLogs(hJson.data);
          } else {
            setHistoryLogs(loadGeneratedSuratLogs());
          }
        } else {
          setHistoryLogs(loadGeneratedSuratLogs());
        }
      } catch {
        setHistoryLogs(loadGeneratedSuratLogs());
      }

      // 3. Operational store data
      if (storeKbrList.length === 0 || !storeJamaah || storeJamaah.length === 0) {
        try {
          const [kbrRes, jamRes] = await Promise.all([
            fetch("/api/keberangkatan"),
            fetch("/api/jamaah?groupId=&limit=200"),
          ]);
          if (kbrRes.ok) {
            const kJson = await kbrRes.json();
            setStoreKbrList(kJson.data ?? []);
          }
          if (jamRes.ok) {
            const jJson = await jamRes.json();
            setStoreJamaah(jJson.data ?? []);
          }
        } catch (err) {
          console.error("Failed to load initial data for surat:", err);
        }
      }
    }
    loadAll();
  }, [storeKbrList.length, storeJamaah, setStoreKbrList, setStoreJamaah]);

  // Sync template from URL param
  useEffect(() => {
    if (initialTemplateParam) {
      const found = templates.find(
        (t) => t.slug === initialTemplateParam || t.slug.includes(initialTemplateParam) || t.id === initialTemplateParam
      );
      if (found) {
        setSelectedTemplateSlug(found.slug);
      }
    }
  }, [initialTemplateParam, templates]);

  // Active Selected Template Object
  const activeTemplate: SuratTemplate = useMemo(() => {
    return (
      templates.find((t) => t.slug === selectedTemplateSlug) ||
      templates[0] ||
      DEFAULT_SURAT_TEMPLATES[0]
    ) as SuratTemplate;
  }, [templates, selectedTemplateSlug]);

  // Active Selected Keberangkatan Object
  const activeKeberangkatan = useMemo(() => {
    if (!selectedPackageId) return storeKbrList[0] || null;
    return storeKbrList.find((k: any) => k.id === selectedPackageId) || storeKbrList[0] || null;
  }, [storeKbrList, selectedPackageId]);

  // Filtered Jamaah for selected package
  const availableJamaahList = useMemo(() => {
    if (!storeJamaah || storeJamaah.length === 0) return [];
    if (!selectedPackageId) return storeJamaah;
    return storeJamaah.filter((j: any) => {
      if (j.group?.keberangkatanId === selectedPackageId) return true;
      if (j.keberangkatanId === selectedPackageId) return true;
      if (j.packageId === selectedPackageId) return true;
      return true; // fallback allow selection
    });
  }, [storeJamaah, selectedPackageId]);

  // Active Selected Jamaah Object
  const activeJamaah = useMemo(() => {
    if (!selectedJamaahId) return availableJamaahList[0] || null;
    return availableJamaahList.find((j: any) => j.id === selectedJamaahId) || availableJamaahList[0] || null;
  }, [availableJamaahList, selectedJamaahId]);

  // Reset form when template changes
  useEffect(() => {
    if (activeTemplate) {
      setCustomPerihal(activeTemplate.perihalDefault || "");
      setCustomTujuan(activeTemplate.tujuanDefault || "");
      setCustomKotaTujuan(activeTemplate.kotaTujuanDefault || "");
      setCustomLampiran(activeTemplate.lampiranDefault || "");
      setCustomShowBarcode(null);

      // Populate default manual values
      const initialManual: Record<string, string> = {};
      activeTemplate.placeholders.forEach((p) => {
        if (p.sourceType === "manual" && p.defaultValue) {
          initialManual[p.key] = p.defaultValue;
        }
      });
      setManualFormData(initialManual);
    }
  }, [activeTemplate]);

  // Computed Nomored Letter String
  const todayInfo = useMemo(() => getTodayDateInfo(), []);
  const computedNomorSurat = useMemo(() => {
    if (!activeTemplate) return `SR-PASPOR/${nomorUrutSurat}/VTU/${todayInfo.romanMonth}/${todayInfo.year}`;
    if (activeTemplate.formatNomor && activeTemplate.formatNomor.trim()) {
      return activeTemplate.formatNomor
        .replace(/\[NOMOR\]/gi, nomorUrutSurat)
        .replace(/\[BULAN\]/gi, todayInfo.romanMonth)
        .replace(/\[TAHUN\]/gi, String(todayInfo.year))
        .replace(/\[HARI\]/gi, String(new Date().getDate()).padStart(2, "0"));
    }
    const prefix = activeTemplate?.kodeNomorDefault || "SR-PASPOR";
    return `${prefix}/${nomorUrutSurat}/VTU/${todayInfo.romanMonth}/${todayInfo.year}`;
  }, [activeTemplate, nomorUrutSurat, todayInfo]);

  // Effective QR Code visibility
  const effectiveShowBarcode =
    customShowBarcode !== null
      ? customShowBarcode
      : (activeTemplate?.penandatangan?.showBarcode ?? true);

  // Autocrat Merged Field Values
  const resolvedFieldValues = useMemo(() => {
    if (!activeTemplate) return {};
    return resolveAutocratFieldValues(
      activeTemplate,
      activeJamaah,
      activeKeberangkatan,
      manualFormData
    );
  }, [activeTemplate, activeJamaah, activeKeberangkatan, manualFormData]);

  // Rendered Body Text
  const renderedLetterBody = useMemo(() => {
    if (!activeTemplate) return "";
    return renderAutocratMergedText(activeTemplate.templateContent, resolvedFieldValues);
  }, [activeTemplate, resolvedFieldValues]);

  // Rendered Tujuan & Perihal
  const renderedPerihal = useMemo(() => {
    return renderAutocratMergedText(customPerihal || activeTemplate?.perihalDefault || "", resolvedFieldValues);
  }, [customPerihal, activeTemplate, resolvedFieldValues]);

  const renderedTujuan = useMemo(() => {
    return renderAutocratMergedText(customTujuan || activeTemplate?.tujuanDefault || "", resolvedFieldValues);
  }, [customTujuan, activeTemplate, resolvedFieldValues]);

  const renderedKotaTujuan = useMemo(() => {
    return renderAutocratMergedText(customKotaTujuan || activeTemplate?.kotaTujuanDefault || "", resolvedFieldValues);
  }, [customKotaTujuan, activeTemplate, resolvedFieldValues]);

  // Verification URL for QR Code
  const verificationUrl = useMemo(() => {
    const baseUrl = typeof window !== "undefined" ? window.location.origin : "https://vtuabadi.com";
    const regId = activeJamaah?.registrationId || activeJamaah?.id || "";
    const jamNama = encodeURIComponent(activeJamaah?.namaLengkap || "");
    const pkgNama = encodeURIComponent(activeKeberangkatan?.namaPaket || "");
    return `${baseUrl}/track/surat?no=${encodeURIComponent(computedNomorSurat)}&reg=${regId}&nama=${jamNama}&paket=${pkgNama}`;
  }, [computedNomorSurat, activeJamaah, activeKeberangkatan]);

  // ────────────────────────────────────────────────────────────
  // ACTIONS: SAVE TO LOG, PRINT, DOWNLOAD, SHARE WHATSAPP
  // ────────────────────────────────────────────────────────────

  const handleSaveToHistory = useCallback(() => {
    if (!activeTemplate) return;

    const logItem: GeneratedSuratLog = {
      id: `srt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      nomorSurat: computedNomorSurat,
      templateId: activeTemplate.id,
      templateSlug: activeTemplate.slug,
      templateName: activeTemplate.nama,
      kategori: activeTemplate.kategori,
      jamaahId: activeJamaah?.id,
      jamaahNama: (activeJamaah?.namaLengkap || "Jamaah").toUpperCase(),
      jamaahPaspor: activeJamaah?.nomorPaspor || "-",
      jamaahNik: activeJamaah?.nik || "-",
      packageId: activeKeberangkatan?.id,
      packageKode: activeKeberangkatan?.kode,
      packageName: activeKeberangkatan?.namaPaket || "Paket Umroh",
      departureDate: activeKeberangkatan?.tanggalBerangkat,
      returnDate: activeKeberangkatan?.tanggalPulang,
      perihal: renderedPerihal,
      generatedDate: new Date().toISOString(),
      createdBy: "Admin Operasional",
      fieldsData: { ...resolvedFieldValues },
      renderedText: renderedLetterBody,
      status: "aktif",
      verificationUrl,
    };

    const updated = saveGeneratedSuratLog(logItem);
    setHistoryLogs(updated);

    fetch("/api/surat/generated", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(logItem),
    }).catch(() => {});

    return logItem;
  }, [
    activeTemplate,
    computedNomorSurat,
    activeJamaah,
    activeKeberangkatan,
    renderedPerihal,
    resolvedFieldValues,
    renderedLetterBody,
    verificationUrl,
  ]);

  // Action: Print A4
  const handlePrint = () => {
    if (!activeTemplate) return;
    handleSaveToHistory();
    window.print();
  };

  // Action: Copy Text
  const handleCopy = () => {
    if (!activeTemplate) return;
    const fullText = `
NOMOR   : ${computedNomorSurat}
LAMP    : ${customLampiran || "-"}
PERIHAL : ${renderedPerihal}

${renderedTujuan}
${renderedKotaTujuan}

${renderedLetterBody}

Sidoarjo, ${todayInfo.masehi}
PT. VAUZA TRIKARSA UTAMA

${activeTemplate.penandatangan.nama}
${activeTemplate.penandatangan.jabatan}
    `.trim();

    navigator.clipboard.writeText(fullText);
    setCopiedText(true);
    showToast("Teks surat berhasil disalin ke clipboard!");
    setTimeout(() => setCopiedText(false), 2000);
  };

  // Action: Share WhatsApp
  const handleShareWhatsApp = () => {
    if (!activeTemplate) return;
    handleSaveToHistory();
    const phone = activeJamaah?.nomorTelepon || "";
    const cleanPhone = phone.replace(/[^0-9]/g, "").replace(/^0/, "62");
    const msg = `*PT. VAUZA TRIKARSA UTAMA (VTU ABADI)*
_Penyelenggara Ibadah Umroh Kemenag RI No. U.400/2021_

Yth. Bapak/Ibu *${activeJamaah?.namaLengkap || "Jamaah"}*,

Berikut adalah informasi penerbitan *${activeTemplate.nama}*:
📄 *Nomor Surat*: ${computedNomorSurat}
📌 *Perihal*: ${renderedPerihal}
✈️ *Paket*: ${activeKeberangkatan?.namaPaket || "-"}

🔗 *Verifikasi Keabsahan Surat Digital*:
${verificationUrl}

Surat fisik resmi dapat diambil di kantor atau diunduh melalui portal jamaah. Terima kasih.`.trim();

    const waUrl = cleanPhone
      ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`
      : `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(waUrl, "_blank");
  };

  // Action: Download HTML / Text File
  const handleDownloadDoc = () => {
    if (!activeTemplate) return;
    handleSaveToHistory();
    const blob = new Blob(
      [
        `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${computedNomorSurat} - ${activeTemplate.nama}</title>
  <style>
    body { font-family: 'Times New Roman', serif; margin: 40px; line-height: 1.6; color: #111; }
    .header { border-bottom: 2px solid #000; padding-bottom: 12px; margin-bottom: 20px; display: flex; align-items: center; }
    .meta { display: flex; justify-content: space-between; margin-bottom: 20px; font-family: sans-serif; font-size: 13px; }
    .content { white-space: pre-line; text-align: justify; font-size: 14px; }
    .footer { margin-top: 40px; display: flex; justify-content: space-between; align-items: flex-end; font-family: sans-serif; }
  </style>
</head>
<body>
  <div class="header">
    <div style="font-family: sans-serif;">
      <h2 style="margin: 0; font-size: 18px;">PT. VAUZA TRIKARSA UTAMA</h2>
      <p style="margin: 2px 0; font-size: 11px; color: #555;">Penyelenggara Perjalanan Ibadah Umroh (PPIU) Kemenag RI No. U.400 Tahun 2021</p>
      <p style="margin: 0; font-size: 10px; color: #777;">Ruko Gateway Blok C-12, Waru, Sidoarjo &bull; Telp: (031) 854-4455</p>
    </div>
  </div>
  <div class="meta">
    <div>
      <p><strong>Nomor</strong> : ${computedNomorSurat}</p>
      <p><strong>Lamp</strong>  : ${customLampiran || "-"}</p>
      <p><strong>Perihal</strong>: <strong>${renderedPerihal}</strong></p>
    </div>
    <div style="text-align: right;">
      <p>Sidoarjo, ${todayInfo.masehi}</p>
    </div>
  </div>
  <p style="font-family: sans-serif; font-size: 13px;">${renderedTujuan}<br>${renderedKotaTujuan}</p>
  <div class="content">${renderedLetterBody}</div>
  <div class="footer">
    <div style="font-size: 10px; border: 1px solid #ccc; padding: 6px 10px; border-radius: 6px;">
      <strong>VERIFIKASI KEABSAHAN SISTEM:</strong><br>${verificationUrl}
    </div>
    <div style="text-align: center; min-width: 200px;">
      <p style="margin: 0; font-weight: bold;">PT. VAUZA TRIKARSA UTAMA</p>
      <div style="height: 60px;"></div>
      <p style="margin: 0; font-weight: bold; text-decoration: underline;">${activeTemplate.penandatangan.nama}</p>
      <p style="margin: 0; font-size: 12px; color: #555;">${activeTemplate.penandatangan.jabatan}</p>
    </div>
  </div>
</body>
</html>`,
      ],
      { type: "text/html" }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    let fileName = `${computedNomorSurat.replace(/[/\\?%*:|"<>]/g, "-")}_${activeTemplate.nama}.html`;
    if (activeTemplate.formatNamaFile && activeTemplate.formatNamaFile.trim()) {
      const mergedName = renderAutocratMergedText(activeTemplate.formatNamaFile, resolvedFieldValues)
        .replace(/[/\\?%*:|"<>]/g, "_")
        .trim();
      if (mergedName) fileName = `${mergedName}.html`;
    }
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
    showToast("File dokumen surat berhasil diunduh!");
  };

  // Delete History Item
  const handleDeleteHistory = (id: string) => {
    if (!window.confirm("Hapus riwayat surat ini?")) return;
    const updated = deleteGeneratedSuratLog(id);
    setHistoryLogs(updated);
    fetch(`/api/surat/generated?id=${id}`, { method: "DELETE" }).catch(() => {});
    showToast("Riwayat surat berhasil dihapus");
  };

  // Filtered History
  const filteredHistory = useMemo(() => {
    return historyLogs.filter((log) => {
      const matchSearch =
        log.nomorSurat.toLowerCase().includes(historySearch.toLowerCase()) ||
        log.jamaahNama.toLowerCase().includes(historySearch.toLowerCase()) ||
        (log.jamaahPaspor && log.jamaahPaspor.toLowerCase().includes(historySearch.toLowerCase())) ||
        log.packageName.toLowerCase().includes(historySearch.toLowerCase()) ||
        log.perihal.toLowerCase().includes(historySearch.toLowerCase());
      const matchTemplate =
        historyFilterTemplate === "all" ||
        log.templateSlug === historyFilterTemplate ||
        log.templateId === historyFilterTemplate;
      return matchSearch && matchTemplate;
    });
  }, [historyLogs, historySearch, historyFilterTemplate]);

  return (
    <div className="space-y-6 pb-24">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <div className="flex items-center gap-2.5 bg-emerald-900/90 border border-emerald-500 text-white text-xs font-semibold px-4 py-3 rounded-xl shadow-2xl backdrop-blur-md">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            <span>{toastMessage}</span>
          </div>
        </div>
      )}

      {/* ── HEADER ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <ScrollText className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                Generate Surat Operasional & Rekomendasi
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                Pembuatan surat otomatis dengan <strong>Autocrat Merge Engine</strong>, auto-fill data manifest, cetak A4, dan riwayat terintegrasi.
              </p>
            </div>
          </div>
        </div>

        {/* Top Actions & Master Surat Link */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="text-xs"
            onClick={() => router.push("/admin/master/surat")}
          >
            <Sliders className="mr-1.5 h-3.5 w-3.5 text-primary" />
            Konfigurasi Master Template Surat
          </Button>
        </div>
      </div>

      {/* ── MAIN TAB NAVIGATION (GENERATOR vs RIWAYAT) ── */}
      <div className="flex items-center justify-between border-b pb-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveMainTab("generator")}
            className={cn(
              "px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2",
              activeMainTab === "generator"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-muted"
            )}
          >
            <Sparkles className="h-4 w-4" />
            Generator Surat (Autocrat Engine)
          </button>

          <button
            onClick={() => setActiveMainTab("history")}
            className={cn(
              "px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2",
              activeMainTab === "history"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-muted"
            )}
          >
            <History className="h-4 w-4" />
            Dashboard & Riwayat Surat Tergenerate
            <Badge variant="secondary" size="sm" className="ml-1 text-[10px]">
              {historyLogs.length}
            </Badge>
          </button>
        </div>

        <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground">
          <span>Format: A4 Letterhead</span>
          <span>&bull;</span>
          <span>PPIU No. U.400/2021</span>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════ */}
      {/* TAB 1: GENERATOR SURAT (AUTOCRAT ENGINE) */}
      {/* ══════════════════════════════════════════════════════════ */}
      {activeMainTab === "generator" && (
        <div className="space-y-6">
          {/* Template Selector Pills */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5 text-primary" />
                Pilih Template Surat:
              </label>
              <button
                onClick={() => router.push("/admin/master/surat")}
                className="text-[11px] font-semibold text-primary hover:underline flex items-center gap-1"
              >
                + Kelola / Tambah Template di Master Surat
                <ArrowRight className="h-3 w-3" />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
              {templates.map((tpl) => {
                const isSelected = tpl.slug === activeTemplate?.slug;
                return (
                  <button
                    key={tpl.id}
                    onClick={() => setSelectedTemplateSlug(tpl.slug)}
                    className={cn(
                      "p-3 rounded-xl border text-left transition-all relative flex flex-col justify-between",
                      isSelected
                        ? "bg-primary/10 border-primary text-primary shadow-sm ring-1 ring-primary"
                        : "bg-card hover:bg-muted/60 border-stone-200 dark:border-stone-800 text-foreground"
                    )}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" size="sm" className="text-[9px] font-mono">
                          {tpl.kodeNomorDefault}
                        </Badge>
                        {isSelected && <Check className="h-3.5 w-3.5 text-primary" />}
                      </div>
                      <p className="text-xs font-bold line-clamp-1 mt-1">{tpl.nama}</p>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-2 line-clamp-1">
                      {tpl.placeholders.length} Tag Placeholder
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* TWO COLUMN WORKSPACE: CONFIG & MANIFEST AUTO-FILL (LEFT) + A4 PREVIEW (RIGHT) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* ── LEFT COLUMN (5 COLS): CONTROLS & DYNAMIC AUTOCRAT FORM ── */}
            <div className="lg:col-span-5 space-y-4">
              {/* Card 1: Data Source Selector (Manifest & Jamaah) */}
              <Card className="border-stone-200 dark:border-stone-800">
                <CardHeader className="pb-3 border-b border-stone-200 dark:border-stone-800">
                  <CardTitle className="text-xs font-bold flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-foreground">
                      <Plane className="h-4 w-4 text-primary" />
                      1. Pilih Paket & Jamaah dari Manifest
                    </span>
                    <Badge variant="success" size="sm" className="text-[10px]">
                      Auto-Fill Active
                    </Badge>
                  </CardTitle>
                </CardHeader>

                <CardContent className="pt-4 space-y-3.5">
                  {/* Select Keberangkatan */}
                  <div>
                    <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                      Paket Keberangkatan
                    </label>
                    <Select
                      value={selectedPackageId}
                      onChange={(e) => setSelectedPackageId(e.target.value)}
                      options={[
                        { value: "", label: "-- Pilih Paket Keberangkatan --" },
                        ...storeKbrList.map((k: any) => ({
                          value: k.id,
                          label: `${k.kode || k.kodePaket || "KBR"} — ${k.namaPaket || k.name} (${formatDateShort(k.tanggalBerangkat || k.departureDate)})`,
                        })),
                      ]}
                      className="text-xs mt-1"
                    />
                  </div>

                  {/* Select Jamaah */}
                  <div>
                    <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                      <span>Pilih Jamaah Penerima Surat</span>
                      <span className="text-[11px] text-muted-foreground">
                        {availableJamaahList.length} Jamaah Tersedia
                      </span>
                    </label>
                    <Select
                      value={selectedJamaahId}
                      onChange={(e) => setSelectedJamaahId(e.target.value)}
                      options={[
                        { value: "", label: "-- Pilih Jamaah dari Manifest --" },
                        ...availableJamaahList.map((j: any) => ({
                          value: j.id,
                          label: `${(j.namaLengkap || j.name || "").toUpperCase()} (Paspor: ${j.nomorPaspor || j.passportNumber || "-"}) — NIK: ${j.nik || "-"}`,
                        })),
                      ]}
                      className="text-xs mt-1"
                    />
                  </div>

                  {/* Summary of Active Jamaah Manifest Data */}
                  {activeJamaah && (
                    <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs space-y-1.5">
                      <div className="flex items-center justify-between font-bold text-emerald-900 dark:text-emerald-300">
                        <span className="flex items-center gap-1.5">
                          <User className="h-3.5 w-3.5" />
                          {activeJamaah.namaLengkap}
                        </span>
                        <span className="font-mono text-[10px]">{activeJamaah.registrationId || "Terdaftar"}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[11px] text-emerald-800 dark:text-emerald-400">
                        <div>NIK: <strong>{activeJamaah.nik || "-"}</strong></div>
                        <div>Paspor: <strong>{activeJamaah.nomorPaspor || "-"}</strong></div>
                        <div>Lahir: <strong>{activeJamaah.tempatLahir || "-"}, {activeJamaah.tanggalLahir ? formatDateShort(activeJamaah.tanggalLahir) : "-"}</strong></div>
                        <div>Paket: <strong>{activeKeberangkatan?.namaPaket || "-"}</strong></div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Card 2: Header & Nomor Surat Configuration */}
              <Card className="border-stone-200 dark:border-stone-800">
                <CardHeader className="pb-3 border-b border-stone-200 dark:border-stone-800">
                  <CardTitle className="text-xs font-bold flex items-center gap-1.5">
                    <FileSignature className="h-4 w-4 text-primary" />
                    2. Nomor Surat & Tujuan
                  </CardTitle>
                </CardHeader>

                <CardContent className="pt-4 space-y-3">
                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-1">
                      <label className="text-xs font-semibold">No. Urut</label>
                      <Input
                        value={nomorUrutSurat}
                        onChange={(e) => setNomorUrutSurat(e.target.value)}
                        placeholder="001"
                        className="text-xs mt-1 font-mono text-center"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="text-xs font-semibold">Nomor Surat Final</label>
                      <Input
                        value={computedNomorSurat}
                        readOnly
                        className="text-xs mt-1 font-mono bg-muted font-bold text-primary"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold">Perihal Surat</label>
                    <Input
                      value={customPerihal}
                      onChange={(e) => setCustomPerihal(e.target.value)}
                      className="text-xs mt-1"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs font-semibold">Tujuan (Kepada)</label>
                      <Input
                        value={customTujuan}
                        onChange={(e) => setCustomTujuan(e.target.value)}
                        className="text-xs mt-1"
                        placeholder="Yth. Kepala Kantor..."
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold">Kota Tujuan</label>
                      <Input
                        value={customKotaTujuan}
                        onChange={(e) => setCustomKotaTujuan(e.target.value)}
                        className="text-xs mt-1"
                        placeholder="Di Tempat"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Card 3: Dynamic Autocrat Placeholders Form */}
              <Card className="border-stone-200 dark:border-stone-800">
                <CardHeader className="pb-3 border-b border-stone-200 dark:border-stone-800">
                  <CardTitle className="text-xs font-bold flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Sparkles className="h-4 w-4 text-primary" />
                      3. Kolom Isian Data Surat (Autocrat Tags)
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {activeTemplate.placeholders.length} Tag Terkonfigurasi
                    </span>
                  </CardTitle>
                </CardHeader>

                <CardContent className="pt-4 space-y-3 max-h-[45vh] overflow-y-auto pr-1">
                  {activeTemplate.placeholders.map((p) => {
                    const isManifest = p.sourceType === "manifest";
                    const resolvedVal = resolvedFieldValues[p.key] || "";

                    return (
                      <div key={p.key} className="space-y-1">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
                            <span className="font-mono text-[10px] text-muted-foreground">&#123;{p.key}&#125;</span>
                            <span>{p.label}</span>
                          </label>

                          {isManifest ? (
                            <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded flex items-center gap-1">
                              <CheckCircle2 className="h-3 w-3" />
                              Otomatis Manifest
                            </span>
                          ) : (
                            <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded">
                              Input Form
                            </span>
                          )}
                        </div>

                        {p.inputType === "textarea" ? (
                          <textarea
                            rows={3}
                            value={resolvedVal}
                            onChange={(e) =>
                              setManualFormData({ ...manualFormData, [p.key]: e.target.value })
                            }
                            className="w-full p-2 text-xs rounded-lg border bg-background focus:ring-1 focus:ring-primary focus:outline-none"
                            placeholder={p.placeholderHint || `Masukkan ${p.label}...`}
                          />
                        ) : p.inputType === "select" && p.options ? (
                          <Select
                            value={resolvedVal}
                            onChange={(e) =>
                              setManualFormData({ ...manualFormData, [p.key]: e.target.value })
                            }
                            options={p.options.map((opt) => ({ value: opt, label: opt }))}
                            className="text-xs"
                          />
                        ) : (
                          <Input
                            type={p.inputType === "date" ? "date" : p.inputType === "number" ? "number" : "text"}
                            value={resolvedVal}
                            onChange={(e) =>
                              setManualFormData({ ...manualFormData, [p.key]: e.target.value })
                            }
                            placeholder={p.placeholderHint || `Masukkan ${p.label}...`}
                            className={cn(
                              "text-xs h-8",
                              isManifest && "bg-muted/40 font-medium text-foreground"
                            )}
                          />
                        )}
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </div>

            {/* ── RIGHT COLUMN (7 COLS): LIVE A4 WYSIWYG PREVIEW & ACTIONS ── */}
            <div className="lg:col-span-7 space-y-4">
              {/* Action Toolbar */}
              <Card className="border-stone-200 dark:border-stone-800 bg-card shadow-sm sticky top-4 z-10">
                <CardContent className="py-3 px-4 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <Button
                      size="sm"
                      className="text-xs bg-primary text-primary-foreground font-bold shadow-sm"
                      onClick={handlePrint}
                    >
                      <Printer className="mr-1.5 h-3.5 w-3.5" />
                      Cetak Surat (A4)
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      onClick={handleDownloadDoc}
                    >
                      <Download className="mr-1.5 h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                      Download Dokumen
                    </Button>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {/* Live QR Code Toggle Button */}
                    <button
                      type="button"
                      onClick={() => setCustomShowBarcode(!effectiveShowBarcode)}
                      className={cn(
                        "inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer",
                        effectiveShowBarcode
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20"
                          : "bg-stone-100 dark:bg-stone-800 text-stone-500 border-stone-300 dark:border-stone-700 hover:bg-stone-200"
                      )}
                      title={
                        effectiveShowBarcode
                          ? "QR Code Verifikasi Aktif pada surat ini. Klik untuk mematikan."
                          : "QR Code Verifikasi Dimatikan. Klik untuk mengaktifkan."
                      }
                    >
                      <QrCode className="h-3.5 w-3.5" />
                      <span>QR Code: {effectiveShowBarcode ? "Aktif [✓]" : "Nonaktif [✕]"}</span>
                    </button>

                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10"
                      onClick={handleShareWhatsApp}
                    >
                      <Share2 className="mr-1.5 h-3.5 w-3.5" />
                      Kirim WhatsApp
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs"
                      onClick={handleCopy}
                    >
                      {copiedText ? (
                        <>
                          <Check className="mr-1.5 h-3.5 w-3.5 text-emerald-500" />
                          Tersalin
                        </>
                      ) : (
                        <>
                          <Copy className="mr-1.5 h-3.5 w-3.5" />
                          Salin Teks
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* ── REALISTIC A4 LETTER SHEET PREVIEW ── */}
              <div className="bg-white text-stone-950 p-8 sm:p-12 rounded-2xl shadow-xl border border-stone-300 font-serif text-[13px] leading-relaxed max-w-2xl mx-auto space-y-6 print:m-0 print:p-0 print:border-none print:shadow-none">
                {/* Official Letterhead */}
                {activeTemplate.kopSuratType === "ppiu_vtu" && (
                  <div className="border-b-[3px] border-double border-stone-900 pb-3 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <img
                        src={KOP_SURAT_BASE64}
                        alt="Logo Resmi PT Vauza Trikarsa Utama"
                        className="h-20 w-auto object-contain"
                      />
                      <div>
                        <h2 className="text-lg font-black tracking-tight text-stone-950 font-sans">
                          PT. VAUZA TRIKARSA UTAMA
                        </h2>
                        <p className="text-[11px] font-bold text-stone-700 font-sans">
                          Penyelenggara Perjalanan Ibadah Umroh (PPIU) Kemenag RI No. U.400 Tahun 2021
                        </p>
                        <p className="text-[10px] text-stone-600 font-sans mt-0.5">
                          Kantor Pusat: Ruko Gateway Blok C-12, Waru, Sidoarjo &bull; Telp: (031) 854-4455 &bull; Email: operasional@vtuabadi.com
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Surat Meta (Nomor, Lamp, Hal, Tanggal) */}
                <div className="flex items-start justify-between text-xs font-sans">
                  <div className="space-y-0.5">
                    <p>
                      <strong>Nomor</strong>&nbsp;&nbsp;&nbsp;: {computedNomorSurat}
                    </p>
                    <p>
                      <strong>Lamp</strong>&nbsp;&nbsp;&nbsp;&nbsp;: {customLampiran || "-"}
                    </p>
                    <p>
                      <strong>Perihal</strong>&nbsp;: <strong>{renderedPerihal}</strong>
                    </p>
                  </div>
                  <div className="text-right">
                    <p>Sidoarjo, {todayInfo.masehi}</p>
                    <p className="text-[10px] text-stone-500">{todayInfo.hijriyah}</p>
                  </div>
                </div>

                {/* Destination */}
                <div className="text-xs font-sans space-y-0.5 pt-1">
                  <p className="font-semibold">{renderedTujuan}</p>
                  <p>{renderedKotaTujuan}</p>
                </div>

                {/* Body Content */}
                <div className="whitespace-pre-line text-xs font-sans pt-2 leading-relaxed text-justify">
                  {renderedLetterBody}
                </div>

                {/* Signature & QR Code Verification */}
                <div className="pt-8 flex items-end justify-between font-sans text-xs">
                  {/* QR Code Barcode Verification */}
                  {effectiveShowBarcode && (
                    <div className="p-2.5 border border-stone-300 rounded-xl flex items-center gap-2.5 bg-stone-50 max-w-[240px]">
                      <QrCode className="h-12 w-12 text-stone-900 shrink-0" />
                      <div className="text-[9px] text-stone-700 leading-tight">
                        <p className="font-bold text-stone-950">VERIFIKASI KEABSAHAN</p>
                        <p className="mt-0.5 text-stone-500">Scan QR Code untuk verifikasi resmi di portal sistem VTU</p>
                      </div>
                    </div>
                  )}

                  {/* Signature Block */}
                  <div className="text-center min-w-[220px] ml-auto space-y-1">
                    <p className="font-bold">PT. VAUZA TRIKARSA UTAMA</p>
                    <div className="h-20 flex items-center justify-center relative">
                      {activeTemplate.penandatangan.showStempel && (
                        <div className="absolute inset-0 flex items-center justify-center opacity-70 pointer-events-none">
                          <div className="w-20 h-20 rounded-full border-2 border-dashed border-red-600 flex items-center justify-center text-[10px] font-black text-red-600 rotate-[-12deg]">
                            STEMPEL RESMI
                          </div>
                        </div>
                      )}
                      <span className="italic text-stone-400 text-[10px]">(Tanda Tangan Digital & Stempel)</span>
                    </div>
                    <p className="font-bold underline uppercase">{activeTemplate.penandatangan.nama}</p>
                    <p className="text-[11px] text-stone-600 font-medium">{activeTemplate.penandatangan.jabatan}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════ */}
      {/* TAB 2: DASHBOARD & RIWAYAT SURAT TERGENERATE */}
      {/* ══════════════════════════════════════════════════════════ */}
      {activeMainTab === "history" && (
        <div className="space-y-6">
          {/* Summary Metric Cards */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Card className="p-4 border-stone-200 dark:border-stone-800">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Total Surat Diterbitkan</p>
                  <p className="text-2xl font-extrabold mt-1 text-foreground">{historyLogs.length}</p>
                </div>
                <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                  <ScrollText className="h-5 w-5" />
                </div>
              </div>
            </Card>

            <Card className="p-4 border-stone-200 dark:border-stone-800">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Surat Rekom Paspor</p>
                  <p className="text-2xl font-extrabold mt-1 text-blue-600 dark:text-blue-400">
                    {historyLogs.filter((l) => l.templateSlug.includes("rekom")).length}
                  </p>
                </div>
                <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  <FileSignature className="h-5 w-5" />
                </div>
              </div>
            </Card>

            <Card className="p-4 border-stone-200 dark:border-stone-800">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Surat Cuti / Izin</p>
                  <p className="text-2xl font-extrabold mt-1 text-emerald-600 dark:text-emerald-400">
                    {historyLogs.filter((l) => l.templateSlug.includes("cuti")).length}
                  </p>
                </div>
                <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <Building2 className="h-5 w-5" />
                </div>
              </div>
            </Card>

            <Card className="p-4 border-stone-200 dark:border-stone-800">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Template Aktif</p>
                  <p className="text-2xl font-extrabold mt-1 text-purple-600 dark:text-purple-400">
                    {templates.length} Template
                  </p>
                </div>
                <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
                  <Layers className="h-5 w-5" />
                </div>
              </div>
            </Card>
          </div>

          {/* Search & Filter Bar */}
          <Card className="border-stone-200 dark:border-stone-800">
            <CardContent className="pt-4 pb-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Cari nomor surat, nama jamaah, paspor, atau paket..."
                    className="pl-9 text-xs"
                    value={historySearch}
                    onChange={(e) => setHistorySearch(e.target.value)}
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Select
                    value={historyFilterTemplate}
                    onChange={(e) => setHistoryFilterTemplate(e.target.value)}
                    options={[
                      { value: "all", label: "Semua Template Surat" },
                      ...templates.map((t) => ({ value: t.slug, label: t.nama })),
                    ]}
                    className="text-xs h-8 w-56"
                  />
                  <Button
                    size="sm"
                    className="text-xs bg-primary text-primary-foreground"
                    onClick={() => setActiveMainTab("generator")}
                  >
                    <Plus className="mr-1.5 h-3.5 w-3.5" />
                    Generate Surat Baru
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Data Table */}
          <Card className="border-stone-200 dark:border-stone-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted/50 text-muted-foreground uppercase font-bold text-[10px] border-b">
                  <tr>
                    <th className="py-3 px-4">Nomor Surat</th>
                    <th className="py-3 px-4">Template / Jenis</th>
                    <th className="py-3 px-4">Nama Jamaah</th>
                    <th className="py-3 px-4">Paket Umroh</th>
                    <th className="py-3 px-4">Tanggal Terbit</th>
                    <th className="py-3 px-4">Pembuat</th>
                    <th className="py-3 px-4 text-right">Aksi Dokumen</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200 dark:divide-stone-800">
                  {filteredHistory.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-muted-foreground">
                        Belum ada riwayat generate surat. Klik &ldquo;Generate Surat Baru&rdquo; untuk memulai.
                      </td>
                    </tr>
                  ) : (
                    filteredHistory.map((log) => (
                      <tr key={log.id} className="hover:bg-muted/30 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-primary">
                          {log.nomorSurat}
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-semibold text-foreground">{log.templateName}</span>
                          <p className="text-[10px] text-muted-foreground line-clamp-1">{log.perihal}</p>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-bold text-foreground">{log.jamaahNama}</div>
                          <div className="text-[10px] text-muted-foreground">
                            Paspor: {log.jamaahPaspor || "-"}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-medium text-foreground">{log.packageName}</span>
                        </td>
                        <td className="py-3 px-4 text-muted-foreground">
                          {formatDate(log.generatedDate)}
                        </td>
                        <td className="py-3 px-4 text-muted-foreground">
                          {log.createdBy}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 px-2 text-xs"
                              title="Lihat Detail Surat"
                              onClick={() => setPreviewModalLog(log)}
                            >
                              <Eye className="h-3 w-3 mr-1" />
                              Preview
                            </Button>

                            <Button
                              variant="secondary"
                              size="sm"
                              className="h-7 px-2 text-xs"
                              title="Download Ulang"
                              onClick={() => {
                                const blob = new Blob([log.renderedText || ""], { type: "text/plain" });
                                const url = URL.createObjectURL(blob);
                                const a = document.createElement("a");
                                a.href = url;
                                a.download = `${log.nomorSurat.replace(/[/\\?%*:|"<>]/g, "-")}.txt`;
                                a.click();
                                URL.revokeObjectURL(url);
                                showToast("Dokumen berhasil diunduh ulang!");
                              }}
                            >
                              <Download className="h-3 w-3" />
                            </Button>

                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10"
                              title="Hapus Riwayat"
                              onClick={() => handleDeleteHistory(log.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* ── MODAL PREVIEW DETAIL RIWAYAT SURAT ── */}
      {previewModalLog && (
        <Modal
          open={!!previewModalLog}
          onClose={() => setPreviewModalLog(null)}
          title={`Detail Surat: ${previewModalLog.nomorSurat}`}
          size="lg"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2 text-xs p-3 rounded-xl bg-muted/40 border">
              <div>Nomor Surat: <strong>{previewModalLog.nomorSurat}</strong></div>
              <div>Template: <strong>{previewModalLog.templateName}</strong></div>
              <div>Nama Jamaah: <strong>{previewModalLog.jamaahNama}</strong></div>
              <div>Paket: <strong>{previewModalLog.packageName}</strong></div>
            </div>

            <div className="p-4 rounded-xl bg-white text-stone-900 border font-sans text-xs whitespace-pre-line leading-relaxed max-h-[50vh] overflow-y-auto">
              {previewModalLog.renderedText}
            </div>

            <div className="flex items-center justify-between border-t pt-3">
              <Button
                variant="ghost"
                size="sm"
                className="text-xs"
                onClick={() => setPreviewModalLog(null)}
              >
                Tutup
              </Button>

              <div className="flex items-center gap-2">
                {previewModalLog.verificationUrl && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    onClick={() => window.open(previewModalLog.verificationUrl, "_blank")}
                  >
                    <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                    Cek Halaman Verifikasi
                  </Button>
                )}

                <Button
                  size="sm"
                  className="text-xs bg-primary text-primary-foreground"
                  onClick={() => {
                    const printWin = window.open("", "_blank");
                    if (printWin) {
                      printWin.document.write(`
                        <html>
                          <head><title>${previewModalLog.nomorSurat}</title></head>
                          <body style="font-family: sans-serif; padding: 40px; white-space: pre-line; line-height: 1.6;">
                            ${previewModalLog.renderedText}
                          </body>
                        </html>
                      `);
                      printWin.document.close();
                      printWin.print();
                    }
                  }}
                >
                  <Printer className="mr-1.5 h-3.5 w-3.5" />
                  Cetak Dokumen
                </Button>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

export default function GenerateSuratPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="flex flex-col items-center gap-3">
            <ScrollText className="h-8 w-8 text-primary animate-pulse" />
            <p className="text-xs text-muted-foreground">Memuat modul surat operasional...</p>
          </div>
        </div>
      }
    >
      <GenerateSuratPageContent />
    </Suspense>
  );
}
