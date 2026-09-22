"use client";

import React, { useState, useEffect, useMemo, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Printer,
  Check,
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
  FileText,
  RefreshCw,
  FileDown,
  Info,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/Card";
import { Button } from "@/shared/components/ui/Button";
import { Input } from "@/shared/components/ui/Input";
import { Select } from "@/shared/components/ui/Select";
import { Badge } from "@/shared/components/ui/Badge";
import { Modal } from "@/shared/components/ui/Modal";
import { formatDate, formatDateShort, cn, getWhatsAppUrl, toTitleCase } from "@/shared/lib/utils";
import { useOperationalStore } from "@/stores/operational-store";
import {
  DEFAULT_SURAT_TEMPLATES,
  loadSavedSuratTemplates,
  loadGeneratedSuratLogs,
  saveGeneratedSuratLog,
  deleteGeneratedSuratLog,
  resolveAutocratFieldValues,
  renderAutocratMergedText,
  getTodayDateInfo,
  isSystemAutoPlaceholder,
  extractPlaceholdersFromText,
} from "@/shared/lib/surat-autocrat-engine";
import { downloadOfficialLetterPdf } from "@/shared/lib/surat-pdf";
import { downloadMergedDocx } from "@/shared/lib/docx-mail-merge";
import { downloadDocxAsPdf, convertDocxToA4Html } from "@/shared/lib/docx-to-pdf";
import { KantorImigrasiCombobox } from "@/shared/components/ui/KantorImigrasiCombobox";
import { SearchableSelect } from "@/shared/components/ui/SearchableSelect";
import { getKotaFromKanimName } from "@/shared/lib/kantor-imigrasi";
import type {
  SuratTemplate,
  GeneratedSuratLog,
} from "@/shared/types/surat";
import OfficialLetterPreview from "./_components/OfficialLetterPreview";

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
  const [selectedDocIndex, setSelectedDocIndex] = useState<number>(0);

  // Reset selected document index when template changes
  useEffect(() => {
    setSelectedDocIndex(0);
  }, [selectedTemplateSlug]);

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
        const localLogs = loadGeneratedSuratLogs();
        const hRes = await fetch("/api/surat/generated");
        if (hRes.ok) {
          const hJson = await hRes.json();
          if (hJson.data && Array.isArray(hJson.data) && hJson.data.length > 0) {
            const serverIds = new Set(hJson.data.map((l: any) => l.id));
            const merged = [...hJson.data, ...localLogs.filter((l) => !serverIds.has(l.id))];
            setHistoryLogs(merged);
          } else if (localLogs.length > 0) {
            setHistoryLogs(localLogs);
          } else {
            setHistoryLogs([]);
          }
        } else if (localLogs.length > 0) {
          setHistoryLogs(localLogs);
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
    const activePkg = storeKbrList.find((k: any) => k.id === selectedPackageId);
    const pkgJamaahIds = new Set<string>(activePkg?.jamaahIds || []);

    const filtered = storeJamaah.filter((j: any) => {
      if (pkgJamaahIds.has(j.id)) return true;
      if (j.group?.keberangkatanId === selectedPackageId) return true;
      if (j.group?.paketKeberangkatanId === selectedPackageId) return true;
      if (j.keberangkatanId === selectedPackageId) return true;
      if (j.packageId === selectedPackageId) return true;
      return false;
    });
    return filtered.length > 0 ? filtered : storeJamaah;
  }, [storeJamaah, selectedPackageId, storeKbrList]);

  // Memoized Searchable Options for Paket Keberangkatan
  const packageOptions = useMemo(() => {
    return storeKbrList.map((k: any) => {
      const kode = k.kode || k.kodePaket || "KBR";
      const nama = k.namaPaket || k.name || "Paket Keberangkatan";
      const tgl = k.tanggalBerangkat || k.departureDate ? formatDateShort(k.tanggalBerangkat || k.departureDate) : "-";
      const count = k.jamaahIds?.length || k.totalJamaah || k.jamaahCount || 0;
      return {
        value: k.id,
        label: `${kode} — ${nama}`,
        sublabel: `Berangkat: ${tgl} • ${count > 0 ? `${count} Jamaah` : "Jadwal Aktif"}`,
      };
    });
  }, [storeKbrList]);

  // Memoized Searchable Options for Jamaah Penerima Surat
  const jamaahOptions = useMemo(() => {
    return availableJamaahList.map((j: any) => {
      const nama = (j.namaLengkap || j.name || "").toUpperCase();
      const paspor = j.nomorPaspor || j.passportNumber || "-";
      const nik = j.nik || "-";
      const birth = j.tempatLahir
        ? `${j.tempatLahir}${j.tanggalLahir ? `, ${formatDateShort(j.tanggalLahir)}` : ""}`
        : j.tanggalLahir
        ? formatDateShort(j.tanggalLahir)
        : "-";
      return {
        value: j.id,
        label: nama,
        sublabel: `Paspor: ${paspor} • NIK: ${nik} • Lahir: ${birth}`,
      };
    });
  }, [availableJamaahList]);

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

  const computedNomorSurat2 = useMemo(() => {
    const nextNum = String(parseInt(nomorUrutSurat || "1", 10) + 1).padStart(3, "0");
    if (!activeTemplate) return `SR-PASPOR/${nextNum}/VTU/${todayInfo.romanMonth}/${todayInfo.year}`;
    if (activeTemplate.formatNomor && activeTemplate.formatNomor.trim()) {
      return activeTemplate.formatNomor
        .replace(/\[NOMOR\]/gi, nextNum)
        .replace(/\[BULAN\]/gi, todayInfo.romanMonth)
        .replace(/\[TAHUN\]/gi, String(todayInfo.year))
        .replace(/\[HARI\]/gi, String(new Date().getDate()).padStart(2, "0"));
    }
    const prefix = activeTemplate?.kodeNomorDefault || "SR-PASPOR";
    return `${prefix}/${nextNum}/VTU/${todayInfo.romanMonth}/${todayInfo.year}`;
  }, [activeTemplate, nomorUrutSurat, todayInfo]);

  // Effective QR Code visibility
  const effectiveShowBarcode =
    customShowBarcode !== null
      ? customShowBarcode
      : (activeTemplate?.penandatangan?.showBarcode ?? true);

  // Active attached document file (if uploaded template exists)
  const activeAttachedFile = useMemo(() => {
    const files = activeTemplate?.attachedFiles || [];
    return files[selectedDocIndex] || files[0] || null;
  }, [activeTemplate, selectedDocIndex]);

  // Prioritize uploaded document text (attachedFiles) over hardcoded templateContent
  const rawTemplateText = useMemo(() => {
    if (!activeTemplate) return "";
    if (activeAttachedFile?.content && activeAttachedFile.content.trim().length > 0) {
      return activeAttachedFile.content;
    }
    const firstWithContent = activeTemplate.attachedFiles?.find(
      (f) => f.content && f.content.trim().length > 0
    );
    if (firstWithContent?.content && firstWithContent.content.trim().length > 0) {
      return firstWithContent.content;
    }
    return activeTemplate.templateContent || "";
  }, [activeTemplate, activeAttachedFile]);

  // Detect if the template contains its own document headers (Nomor, Kepada/Yth, etc.)
  const isFullDocumentTemplate = useMemo(() => {
    const lower = rawTemplateText.toLowerCase();
    const hasNomor =
      lower.includes("no:") ||
      lower.includes("no :") ||
      lower.includes("nomor:") ||
      lower.includes("nomor :");
    const hasTujuan =
      lower.includes("kepada") ||
      lower.includes("yth.") ||
      lower.includes("yth ");
    return hasNomor && hasTujuan;
  }, [rawTemplateText]);

  // Effective Placeholders list combining template.placeholders with placeholders extracted from template text
  const effectivePlaceholders = useMemo(() => {
    const map = new Map<string, any>();
    const normalize = (s: string) =>
      s.toLowerCase().trim().replace(/[\u2018\u2019\u201A\u201B']/g, "'").replace(/[\s_\-\.]/g, "");

    (activeTemplate?.placeholders || []).forEach((p) => {
      if (!isSystemAutoPlaceholder(p.key)) {
        map.set(normalize(p.key), p);
      }
    });

    if (rawTemplateText) {
      const extracted = extractPlaceholdersFromText(rawTemplateText);
      extracted.forEach((k) => {
        const clean = normalize(k);
        if (!map.has(clean) && !isSystemAutoPlaceholder(k)) {
          map.set(clean, {
            key: k,
            label: k,
            sourceType: "manifest",
            inputType: "text",
          });
        }
      });
    }

    return Array.from(map.values());
  }, [activeTemplate, rawTemplateText]);

  // Autocrat Merged Field Values
  const resolvedFieldValues = useMemo(() => {
    if (!activeTemplate) return {};
    return resolveAutocratFieldValues(
      activeTemplate,
      activeJamaah,
      activeKeberangkatan,
      manualFormData,
      {
        nomorSurat: computedNomorSurat,
        nomorSurat2: computedNomorSurat2,
        tanggalSurat: todayInfo.masehi,
        tanggalHijriyah: todayInfo.hijriyah,
      }
    );
  }, [activeTemplate, activeJamaah, activeKeberangkatan, manualFormData, computedNomorSurat, computedNomorSurat2, todayInfo]);

  // Rendered Body Text with clean formatting and Word artifact removal
  const renderedLetterBody = useMemo(() => {
    if (!rawTemplateText) return "";
    let cleanText = rawTemplateText;
    // Strip Word drawing coordinates artifacts (e.g. "1461770 -267335 0 0")
    cleanText = cleanText.replace(/^[ \t]*-?\d{3,}[ \t]+-?\d{3,}[ \t]+-?\d+[ \t]+-?\d+[ \t]*$/gm, "");
    cleanText = cleanText.replace(/\n{3,}/g, "\n\n");
    return renderAutocratMergedText(cleanText, resolvedFieldValues);
  }, [rawTemplateText, resolvedFieldValues]);

  // Rendered Tujuan & Perihal
  const renderedPerihal = useMemo(() => {
    return renderAutocratMergedText(customPerihal || activeTemplate?.perihalDefault || "", resolvedFieldValues);
  }, [customPerihal, activeTemplate, resolvedFieldValues]);

  const renderedTujuan = useMemo(() => {
    if (customTujuan && customTujuan.trim()) {
      return renderAutocratMergedText(customTujuan, resolvedFieldValues);
    }
    const kanim =
      resolvedFieldValues["Kanim"] ||
      resolvedFieldValues["kanim"] ||
      resolvedFieldValues["kantor_imigrasi"];
    if (kanim && kanim.trim() && (!activeTemplate?.tujuanDefault || activeTemplate.tujuanDefault.toLowerCase().includes("imigrasi"))) {
      return `Yth. Kepala ${kanim}`;
    }
    return renderAutocratMergedText(activeTemplate?.tujuanDefault || "", resolvedFieldValues);
  }, [customTujuan, activeTemplate, resolvedFieldValues]);

  const renderedKotaTujuan = useMemo(() => {
    if (customKotaTujuan && customKotaTujuan.trim()) {
      return renderAutocratMergedText(customKotaTujuan, resolvedFieldValues);
    }
    const kota =
      resolvedFieldValues["Kota Kanim"] ||
      resolvedFieldValues["kota_kanim"] ||
      resolvedFieldValues["kota"];
    if (kota && kota.trim() && (!activeTemplate?.kotaTujuanDefault || activeTemplate.kotaTujuanDefault.toLowerCase().includes("tempat"))) {
      return kota;
    }
    return renderAutocratMergedText(activeTemplate?.kotaTujuanDefault || "", resolvedFieldValues);
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

    const effectiveNama =
      resolvedFieldValues["Nama Jama'ah"] ||
      resolvedFieldValues["nama_lengkap"] ||
      resolvedFieldValues["nama_jamaah"] ||
      resolvedFieldValues["Nama"] ||
      activeJamaah?.namaLengkap ||
      "Jamaah";

    const logItem: GeneratedSuratLog = {
      id: `srt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      nomorSurat: computedNomorSurat,
      templateId: activeTemplate.id,
      templateSlug: activeTemplate.slug,
      templateName: activeTemplate.nama,
      kategori: activeTemplate.kategori,
      jamaahId: activeJamaah?.id,
      jamaahNama: toTitleCase(effectiveNama),
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
      templateFileBase64:
        activeAttachedFile?.templateFileBase64 ||
        activeTemplate.templateFileBase64 ||
        undefined,
      status: "aktif",
      verificationUrl,
    };

    const updated = saveGeneratedSuratLog(logItem);
    setHistoryLogs(updated);

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

  // Action: Share WhatsApp
  const handleShareWhatsApp = () => {
    if (!activeTemplate) return;
    handleSaveToHistory();
    const phone = activeJamaah?.nomorTelepon || "";
    const cleanPhone = phone.replace(/[^0-9]/g, "").replace(/^0/, "62");
    const effectiveNama =
      resolvedFieldValues["Nama Jama'ah"] ||
      resolvedFieldValues["nama_lengkap"] ||
      resolvedFieldValues["nama_jamaah"] ||
      resolvedFieldValues["Nama"] ||
      activeJamaah?.namaLengkap ||
      "Jamaah";

    const msg = `*PT. VAUZA TAMMA ABADI (VTU ABADI)*
_Penyelenggara Ibadah Umroh Kemenag RI No. U.400/2021 / No. 805/2019_

Yth. Bapak/Ibu *${toTitleCase(effectiveNama)}*,

Berikut adalah informasi penerbitan *${activeTemplate.nama}*:
📄 *Nomor Surat*: ${computedNomorSurat}
📌 *Perihal*: ${renderedPerihal}
✈️ *Paket*: ${activeKeberangkatan?.namaPaket || "-"}

🔗 *Verifikasi Keabsahan Surat Digital*:
${verificationUrl}

Surat fisik resmi dapat diambil di kantor atau diunduh melalui portal jamaah. Terima kasih.`.trim();

    const waUrl = getWhatsAppUrl(cleanPhone, msg);
    window.open(waUrl, "_blank");
  };

  // State & Handler: Generate Surat and Navigate to Riwayat
  const [isGenerating, setIsGenerating] = useState(false);
  const handleGenerateSurat = async () => {
    if (!activeTemplate) return;
    setIsGenerating(true);

    try {
      const logItem = handleSaveToHistory();
      if (!logItem) {
        showToast("Gagal memproses pembuatan surat");
        return;
      }

      // Sync to database
      try {
        const res = await fetch("/api/surat/generated", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(logItem),
        });
        if (res.ok) {
          const resJson = await res.json();
          if (resJson.data) {
            setHistoryLogs((prev) => [resJson.data, ...prev.filter((p) => p.id !== resJson.data.id)]);
          }
        }
      } catch (err) {
        console.warn("Gagal sinkronisasi surat ke database:", err);
      }

      // Berkas tersimpan ke Riwayat tanpa auto-download popup, siap diunduh di tab Riwayat
      const hasMultipleVariants = (activeTemplate.attachedFiles?.length || 0) > 1;
      if (hasMultipleVariants) {
        showToast(`Surat "${logItem.nomorSurat}" berhasil dibuat! Kedua model template (Dengan TTD & Tanpa TTD) siap diunduh di tab Riwayat.`);
      } else {
        showToast(`Surat "${logItem.nomorSurat}" berhasil dibuat! Siap diunduh di tab Riwayat.`);
      }

      // Switch to history tab immediately
      setActiveMainTab("history");
      router.push("/admin/surat?tab=history");
    } catch (err) {
      console.error("Error generating surat:", err);
      showToast("Terjadi kesalahan saat membuat surat");
    } finally {
      setIsGenerating(false);
    }
  };

  // Delete History Group (purges all logs matching this group or nomorSurat)
  const handleDeleteGroup = (logs: GeneratedSuratLog[], nomorSurat: string) => {
    if (!window.confirm(`Hapus seluruh riwayat untuk surat ${nomorSurat}?`)) return;
    const idsToDelete = new Set(logs.map((l) => l.id));
    
    // Update local storage for all items
    logs.forEach((l) => deleteGeneratedSuratLog(l.id));
    setHistoryLogs((prev) => prev.filter((l) => !idsToDelete.has(l.id) && l.nomorSurat !== nomorSurat));

    // Purge from Supabase by nomorSurat and id
    const encodedNomor = encodeURIComponent(nomorSurat);
    const primaryId = logs[0]?.id || "";
    fetch(`/api/surat/generated?id=${primaryId}&nomorSurat=${encodedNomor}`, { method: "DELETE" }).catch(() => {});
    showToast("Riwayat surat berhasil dihapus");
  };

  // Refresh History from server
  const [historyRefreshing, setHistoryRefreshing] = useState(false);
  const handleRefreshHistory = async () => {
    setHistoryRefreshing(true);
    try {
      const localLogs = loadGeneratedSuratLogs();
      const hRes = await fetch("/api/surat/generated");
      if (hRes.ok) {
        const hJson = await hRes.json();
        if (hJson.data && Array.isArray(hJson.data) && hJson.data.length > 0) {
          const serverIds = new Set(hJson.data.map((l: any) => l.id));
          const merged = [...hJson.data, ...localLogs.filter((l) => !serverIds.has(l.id))];
          setHistoryLogs(merged);
        } else if (localLogs.length > 0) {
          setHistoryLogs(localLogs);
        } else {
          setHistoryLogs([]);
        }
      } else if (localLogs.length > 0) {
        setHistoryLogs(localLogs);
      }
      showToast("Data riwayat berhasil diperbarui!");
    } catch {
      setHistoryLogs(loadGeneratedSuratLogs());
    } finally {
      setHistoryRefreshing(false);
    }
  };

  // Re-download PDF from history log with file variant support (TTD vs non-TTD) using the uploaded template file!
  const handleHistoryRedownloadPdf = async (log: GeneratedSuratLog, fileIndex: number = 0) => {
    const tpl = templates.find((t) => t.id === log.templateId || t.slug === log.templateSlug) || activeTemplate;
    const cleanNomor = log.nomorSurat.replace(/[/\\?%*:|"<>]/g, "-");
    const attached = tpl?.attachedFiles || [];
    const hasMultiple = attached.length > 1;
    const isTtd = fileIndex === 0 && hasMultiple;
    const suffix = isTtd ? "TTD_" : "";
    const fileName = `${cleanNomor}_${suffix}${log.jamaahNama.replace(/\s+/g, "_")}.pdf`;

    const binary =
      attached[fileIndex]?.templateFileBase64 ||
      (fileIndex === 0
        ? log.templateFileBase64 || tpl?.templateFileBase64
        : attached[1]?.templateFileBase64 || log.templateFileBase64 || tpl?.templateFileBase64);

    if (binary && log.fieldsData) {
      try {
        const label = isTtd ? "Dengan TTD & Stempel" : "Tanpa TTD (Cap Basah)";
        showToast(`Sedang membuat PDF (${label}) dari template asli...`);
        await downloadDocxAsPdf(binary, log.fieldsData, fileName);
        showToast(`PDF (${label}) berhasil diunduh sesuai template asli!`);
        return;
      } catch (err) {
        console.warn("Gagal render PDF dari docx template, fallback ke PDF builder:", err);
      }
    }

    if (!tpl || !log.renderedText) {
      showToast("Data surat tidak tersedia untuk re-download PDF.");
      return;
    }

    await downloadOfficialLetterPdf(
      {
        template: tpl,
        rawText: log.renderedText,
        computedNomorSurat: log.nomorSurat,
        renderedPerihal: log.perihal,
        renderedTujuan: tpl.tujuanDefault || "",
        renderedKotaTujuan: tpl.kotaTujuanDefault || "",
        todayInfo,
        effectiveShowBarcode: tpl.penandatangan?.showBarcode ?? true,
        verificationUrl: log.verificationUrl || "",
      },
      fileName
    );
    showToast("PDF surat berhasil diunduh!");
  };

  // Re-download Word from history log with file variant support (TTD vs non-TTD)
  const handleHistoryRedownloadWord = async (log: GeneratedSuratLog, fileIndex: number = 0) => {
    const tpl = templates.find((t) => t.id === log.templateId || t.slug === log.templateSlug) || activeTemplate;
    const cleanNomor = log.nomorSurat.replace(/[/\\?%*:|"<>]/g, "-");
    const attached = tpl?.attachedFiles || [];
    const hasMultiple = attached.length > 1;
    const isTtd = fileIndex === 0 && hasMultiple;
    const suffix = isTtd ? "TTD_" : "";
    const fileName = `${cleanNomor}_${suffix}${log.jamaahNama.replace(/\s+/g, "_")}.docx`;

    const binary =
      attached[fileIndex]?.templateFileBase64 ||
      (fileIndex === 0
        ? log.templateFileBase64 || tpl?.templateFileBase64
        : attached[1]?.templateFileBase64 || log.templateFileBase64 || tpl?.templateFileBase64);

    if (binary && log.fieldsData) {
      try {
        await downloadMergedDocx(binary, log.fieldsData, fileName);
        const label = isTtd ? "Dengan TTD & Stempel" : "Tanpa TTD (Cap Basah)";
        showToast(`Dokumen Word (.docx - ${label}) berhasil diunduh dari template asli!`);
        return;
      } catch (err) {
        console.warn("Gagal download docx merge, fallback:", err);
      }
    }

    if (!log.renderedText) {
      showToast("Data surat tidak tersedia untuk download.");
      return;
    }

    const blob = new Blob([log.renderedText], { type: "application/msword" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName.replace(/\.docx$/i, ".doc");
    a.click();
    URL.revokeObjectURL(url);
    showToast("Dokumen Word berhasil diunduh!");
  };

  // Print from history log with full Word A4 letterhead & watermark support
  const handleHistoryPrint = async (log: GeneratedSuratLog, fileIndex: number = 0) => {
    const tpl = templates.find((t) => t.id === log.templateId || t.slug === log.templateSlug) || activeTemplate;
    const attached = tpl?.attachedFiles || [];
    const binary =
      attached[fileIndex]?.templateFileBase64 ||
      (fileIndex === 0
        ? log.templateFileBase64 || tpl?.templateFileBase64
        : attached[1]?.templateFileBase64 || log.templateFileBase64 || tpl?.templateFileBase64);

    if (binary && log.fieldsData) {
      try {
        const { mergeDocxPlaceholders } = await import("@/shared/lib/docx-mail-merge");
        const mergedBlob = await mergeDocxPlaceholders(binary, log.fieldsData);
        const a4Html = await convertDocxToA4Html(mergedBlob);
        const printWin = window.open("", "_blank");
        if (printWin) {
          printWin.document.write(`
            <!DOCTYPE html>
            <html>
              <head>
                <title>${log.nomorSurat} - Cetak Surat Resmi</title>
                <style>
                  @page { size: A4 portrait; margin: 0; }
                  body { margin: 0; padding: 0; background: #fff; }
                  .docx-pages-container { background: #fff !important; }
                  .docx-a4-page { margin: 0 !important; page-break-after: always; break-after: page; }
                  @media print {
                    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                  }
                </style>
              </head>
              <body>
                ${a4Html}
                <script>
                  window.onload = function() {
                    setTimeout(function() {
                      window.print();
                    }, 500);
                  };
                </script>
              </body>
            </html>
          `);
          printWin.document.close();
          return;
        }
      } catch (err) {
        console.warn("Gagal cetak DOCX A4 HTML:", err);
      }
    }

    const printWin = window.open("", "_blank");
    if (printWin) {
      printWin.document.write(`
        <html>
          <head><title>${log.nomorSurat}</title></head>
          <body style="font-family: sans-serif; padding: 40px; white-space: pre-line; line-height: 1.6;">
            ${log.renderedText || ""}
          </body>
        </html>
      `);
      printWin.document.close();
      printWin.print();
    }
  };

  // Generate document variant items for history table
  const getDocumentVariants = (
    log: GeneratedSuratLog
  ): { name: string; label: string; fileIndex: number; isTtd: boolean }[] => {
    const namaClean = log.jamaahNama.replace(/\s+/g, "_");
    const tpl = templates.find((t) => t.id === log.templateId || t.slug === log.templateSlug);
    const basePrefix = tpl?.slug?.includes("rekom")
      ? "Surat_Rekom"
      : tpl?.slug?.includes("cuti-pekerja")
      ? "Surat_Cuti"
      : tpl?.slug?.includes("cuti-sekolah")
      ? "Surat_Cuti"
      : tpl?.slug?.includes("tugas")
      ? "SK"
      : tpl?.slug?.includes("klaim")
      ? "Surat_Klaim"
      : tpl?.slug?.includes("keterangan")
      ? "Surat_Keterangan"
      : "Surat";

    const attached = tpl?.attachedFiles || [];
    if (attached.length > 1) {
      return [
        {
          name: `${basePrefix}_TTD_${namaClean}`,
          label: "Dengan TTD & Stempel",
          fileIndex: 0,
          isTtd: true,
        },
        {
          name: `${basePrefix}_${namaClean}`,
          label: "Tanpa TTD (Cap Basah)",
          fileIndex: 1,
          isTtd: false,
        },
      ];
    }

    return [
      {
        name: `${basePrefix}_${namaClean}`,
        label: "Template Standar",
        fileIndex: 0,
        isTtd: false,
      },
    ];
  };

  // Short template name for display
  const getShortTemplateName = (log: GeneratedSuratLog): string => {
    const tpl = templates.find((t) => t.id === log.templateId || t.slug === log.templateSlug);
    if (tpl?.slug?.includes("rekom")) return "Surat Rekom";
    if (tpl?.slug?.includes("cuti-pekerja")) return "Surat Cuti Pekerja";
    if (tpl?.slug?.includes("cuti-sekolah")) return "Surat Izin Sekolah";
    if (tpl?.slug?.includes("tugas")) return "Surat Tugas";
    if (tpl?.slug?.includes("klaim")) return "Surat Klaim Asuransi";
    if (tpl?.slug?.includes("keterangan")) return "Surat Keterangan";
    return tpl?.nama || log.templateName || "Surat";
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

  // Grouped history: group by date + jenis surat (for screenshot-like layout)
  const groupedHistory = useMemo(() => {
    const groups: Array<{
      date: string;
      jenis: string;
      nomorSurat: string;
      logs: GeneratedSuratLog[];
    }> = [];

    // Sort by generatedDate descending
    const sorted = [...filteredHistory].sort(
      (a, b) => new Date(b.generatedDate).getTime() - new Date(a.generatedDate).getTime()
    );

    sorted.forEach((log) => {
      const dateStr = formatDate(log.generatedDate);
      const jenis = getShortTemplateName(log);
      // Find existing group with same date + same nomor surat
      const existing = groups.find(
        (g) => g.date === dateStr && g.nomorSurat === log.nomorSurat
      );
      if (existing) {
        existing.logs.push(log);
      } else {
        groups.push({
          date: dateStr,
          jenis,
          nomorSurat: log.nomorSurat,
          logs: [log],
        });
      }
    });

    return groups;
  }, [filteredHistory, templates]);

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
              {/* Template Variant Selector (e.g. Dengan TTD vs Tanpa TTD) */}
              {activeTemplate.attachedFiles && activeTemplate.attachedFiles.length > 1 && (
                <Card className="border-blue-200 dark:border-blue-900/40 bg-blue-50/50 dark:bg-blue-950/20">
                  <CardContent className="p-3.5 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-blue-950 dark:text-blue-200 flex items-center gap-1.5">
                        <FileSignature className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                        Pilih Varian Template Surat:
                      </label>
                      <Badge variant="info" size="sm" className="text-[10px] bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200 border-blue-200">
                        {activeTemplate.attachedFiles.length} Varian Terupload
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      {activeTemplate.attachedFiles.map((doc, idx) => {
                        const isTtd = idx === 0 || doc.fileName?.toLowerCase().includes("ttd");
                        const isSelected = selectedDocIndex === idx;
                        return (
                          <button
                            key={doc.index || idx}
                            type="button"
                            onClick={() => setSelectedDocIndex(idx)}
                            className={cn(
                              "p-2.5 rounded-lg border text-left transition-all cursor-pointer flex flex-col justify-between",
                              isSelected
                                ? "bg-white dark:bg-slate-800 border-blue-600 dark:border-blue-500 shadow-xs ring-1 ring-blue-600 text-foreground"
                                : "bg-white/60 dark:bg-slate-800/40 border-stone-200 dark:border-stone-700 text-muted-foreground hover:bg-white"
                            )}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-foreground">
                                {isTtd ? "✓ Dengan TTD & Stempel" : "✍️ Tanpa TTD (Cap Basah)"}
                              </span>
                              {isSelected && <Check className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />}
                            </div>
                            <span className="text-[10px] text-muted-foreground truncate mt-1">
                              {doc.fileName || `Template Varian ${idx + 1}`}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}

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
                  {/* Select Keberangkatan (Searchable Combobox) */}
                  <div>
                    <label className="text-xs font-semibold text-foreground flex items-center justify-between mb-1">
                      <span className="flex items-center gap-1.5">
                        <Plane className="h-3.5 w-3.5 text-primary" />
                        Paket Keberangkatan
                      </span>
                      <span className="text-[11px] text-muted-foreground font-normal">
                        {storeKbrList.length} Paket Terdaftar
                      </span>
                    </label>
                    <SearchableSelect
                      value={selectedPackageId}
                      onChange={(val) => {
                        setSelectedPackageId(val);
                        setSelectedJamaahId("");
                      }}
                      placeholder="Cari atau pilih paket keberangkatan..."
                      searchPlaceholder="Ketik nama paket, kode, tanggal..."
                      options={packageOptions}
                      size="sm"
                    />
                  </div>

                  {/* Select Jamaah (Searchable Combobox) */}
                  <div>
                    <label className="text-xs font-semibold text-foreground flex items-center justify-between mb-1">
                      <span className="flex items-center gap-1.5">
                        <User className="h-3.5 w-3.5 text-primary" />
                        Pilih Jamaah Penerima Surat
                      </span>
                      <span className="text-[11px] text-muted-foreground font-normal">
                        {availableJamaahList.length} Jamaah Tersedia
                      </span>
                    </label>
                    <SearchableSelect
                      value={selectedJamaahId}
                      onChange={(val) => {
                        setSelectedJamaahId(val);
                        if (val && !selectedPackageId) {
                          const jam = storeJamaah.find((j: any) => j.id === val) as any;
                          if (jam) {
                            const jamPkgId =
                              jam.group?.keberangkatanId ||
                              jam.group?.paketKeberangkatanId ||
                              jam.keberangkatanId ||
                              jam.packageId;
                            if (jamPkgId) {
                              setSelectedPackageId(jamPkgId);
                            }
                          }
                        }
                      }}
                      placeholder={
                        availableJamaahList.length === 0
                          ? "Belum ada jamaah pada paket ini"
                          : "Cari nama jamaah, NIK, nomor paspor, kota lahir..."
                      }
                      searchPlaceholder="Ketik nama jamaah, paspor, NIK..."
                      options={jamaahOptions}
                      disabled={availableJamaahList.length === 0}
                      size="sm"
                    />
                  </div>

                  {/* Summary of Active Jamaah Manifest Data */}
                  {activeJamaah && (
                    <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs space-y-1.5">
                      <div className="flex items-center justify-between font-bold text-emerald-900 dark:text-emerald-300">
                        <span className="flex items-center gap-1.5">
                          <User className="h-3.5 w-3.5" />
                          {toTitleCase(activeJamaah.namaLengkap)}
                        </span>
                        <span className="font-mono text-[10px]">{activeJamaah.registrationId || "Terdaftar"}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[11px] text-emerald-800 dark:text-emerald-400">
                        <div>NIK: <strong>{activeJamaah.nik || "-"}</strong></div>
                        <div>Paspor: <strong>{activeJamaah.nomorPaspor || "-"}</strong></div>
                        <div>Lahir: <strong>{toTitleCase(activeJamaah.tempatLahir || "-")}, {activeJamaah.tanggalLahir ? formatDateShort(activeJamaah.tanggalLahir) : "-"}</strong></div>
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
                    2. Nomor Surat
                  </CardTitle>
                </CardHeader>

                <CardContent className="pt-4 space-y-3">
                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-1">
                      <label className="text-xs font-semibold text-stone-700 dark:text-stone-300">No. Urut</label>
                      <Input
                        value={nomorUrutSurat}
                        onChange={(e) => setNomorUrutSurat(e.target.value)}
                        placeholder="001"
                        className="text-xs mt-1 font-mono text-center font-bold"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="text-xs font-semibold text-stone-700 dark:text-stone-300">Nomor Surat Final</label>
                      <Input
                        value={computedNomorSurat}
                        readOnly
                        className="text-xs mt-1 font-mono bg-muted/60 font-bold text-primary"
                      />
                    </div>
                  </div>

                  {(activeTemplate?.kebutuhanNomorPerSurat ?? 1) > 1 && (
                    <div>
                      <label className="text-xs font-semibold text-stone-700 dark:text-stone-300">Nomor Surat Dokumen 2</label>
                      <Input
                        value={computedNomorSurat2}
                        readOnly
                        className="text-xs mt-1 font-mono bg-muted/60 font-bold text-primary"
                      />
                    </div>
                  )}
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
                      {effectivePlaceholders.length} Tag Terkonfigurasi
                    </span>
                  </CardTitle>
                </CardHeader>

                <CardContent className="p-3.5 space-y-2.5 max-h-[58vh] overflow-y-auto pr-2">
                  {effectivePlaceholders.length === 0 ? (
                    <div className="text-center py-6 text-xs text-muted-foreground">
                      Semua data surat telah otomatis terisi dari manifest.
                    </div>
                  ) : (
                    effectivePlaceholders.map((p, pIdx) => {
                      const isManifest = p.sourceType === "manifest";
                      const cleanKey = (p.key || "").toLowerCase().replace(/[\s_\-\.]/g, "");
                      const cleanLabel = (p.label || "").toLowerCase().replace(/[\s_\-\.]/g, "");
                      const isKotaKanimField =
                        cleanKey.includes("kotakanim") ||
                        cleanKey.includes("kotaimigrasi") ||
                        cleanKey.includes("kotakantor") ||
                        cleanLabel.includes("kotakanim") ||
                        cleanLabel.includes("kotaimigrasi") ||
                        (cleanKey.includes("kota") && !cleanKey.includes("lahir") && !cleanKey.includes("paket"));

                      const isKanimSelector =
                        (p.inputType === "kantor_imigrasi" ||
                          cleanKey === "kanim" ||
                          cleanKey === "kantorimigrasi" ||
                          (cleanKey.includes("imigrasi") && !cleanKey.includes("kota"))) &&
                        !isKotaKanimField;

                      const isEndorsementActive = (
                        manualFormData["Hal"] ||
                        manualFormData["hal"] ||
                        manualFormData["perihal"] ||
                        manualFormData["Perihal"] ||
                        (resolvedFieldValues as Record<string, string>)["Hal"] ||
                        (resolvedFieldValues as Record<string, string>)["hal"] ||
                        customPerihal ||
                        activeTemplate?.perihalDefault ||
                        ""
                      )
                        .toLowerCase()
                        .includes("endorse");

                      const isNamaJamaahField =
                        cleanKey.includes("namajamaah") ||
                        cleanKey.includes("namalengkap") ||
                        cleanKey === "nama" ||
                        cleanLabel.includes("nama jama") ||
                        cleanLabel.includes("nama lengkap");

                      // Clean and validate options if select
                      const validOptions = (Array.isArray(p.options) ? p.options : [])
                        .map((opt: string) => String(opt).trim())
                        .filter(Boolean);
                      const isSearchableSelect = p.inputType === "select" && validOptions.length > 4;

                      // Live value resolution: user edits take absolute precedence with case/whitespace-insensitive fallback
                      const normKey = (p.key || "").toLowerCase().replace(/[\u2018\u2019\u201A\u201B']/g, "'").replace(/[\s_\-\.]/g, "");
                      const normLabel = (p.label || "").toLowerCase().replace(/[\u2018\u2019\u201A\u201B']/g, "'").replace(/[\s_\-\.]/g, "");

                      let manualVal = manualFormData[p.key];
                      if (manualVal === undefined) {
                        for (const [mk, mv] of Object.entries(manualFormData)) {
                          const cleanMk = mk.toLowerCase().replace(/[\u2018\u2019\u201A\u201B']/g, "'").replace(/[\s_\-\.]/g, "");
                          if ((cleanMk === normKey || cleanMk === normLabel) && mv !== undefined) {
                            manualVal = mv;
                            break;
                          }
                        }
                      }

                      let resolvedVal = (resolvedFieldValues as Record<string, string>)[p.key];
                      if (resolvedVal === undefined) {
                        for (const [rk, rv] of Object.entries(resolvedFieldValues as Record<string, string>)) {
                          const cleanRk = rk.toLowerCase().replace(/[\u2018\u2019\u201A\u201B']/g, "'").replace(/[\s_\-\.]/g, "");
                          if (cleanRk === normKey || cleanRk === normLabel) {
                            resolvedVal = rv;
                            break;
                          }
                        }
                      }

                      // Additional fallback for Alamat / Alamat Lengkap
                      if ((resolvedVal === undefined || resolvedVal === "") && (normKey.includes("alamat") || normLabel.includes("alamat"))) {
                        resolvedVal =
                          (resolvedFieldValues as Record<string, string>)["Alamat"] ||
                          (resolvedFieldValues as Record<string, string>)["alamat"] ||
                          (resolvedFieldValues as Record<string, string>)["Alamat Lengkap"] ||
                          (resolvedFieldValues as Record<string, string>)["alamat_lengkap"] ||
                          (activeJamaah as any)?.alamatLengkap ||
                          activeJamaah?.alamat ||
                          "";
                      }

                      resolvedVal = resolvedVal ?? "";
                      const rawDisplay = manualVal !== undefined ? manualVal : resolvedVal;
                      const displayValue = rawDisplay === "-" ? "" : rawDisplay;

                      return (
                        <div
                          key={p.key}
                          style={{ zIndex: 40 - pIdx }}
                          className={cn(
                            "p-2.5 rounded-xl border border-stone-200/80 dark:border-stone-800/80 bg-card/60 shadow-2xs space-y-1.5 transition-all hover:border-primary/40 relative",
                            (isKanimSelector || isSearchableSelect) && "z-30",
                            isEndorsementActive && isNamaJamaahField && "border-amber-400/60 dark:border-amber-500/40 bg-amber-50/30 dark:bg-amber-950/10"
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                              <span className="font-mono text-[10px] text-muted-foreground">&#123;{p.key}&#125;</span>
                              <span>{p.label || p.key}</span>
                            </label>

                            {isEndorsementActive && isNamaJamaahField ? (
                              <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-300 bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded flex items-center gap-1 shadow-2xs">
                                <Sparkles className="h-3 w-3 text-amber-500" />
                                + Nama Ayah (Endorsement)
                              </span>
                            ) : manualVal !== undefined && manualVal !== resolvedVal ? (
                              <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded flex items-center gap-1">
                                Diedit Manual
                              </span>
                            ) : isManifest ? (
                              <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded flex items-center gap-1">
                                <CheckCircle2 className="h-3 w-3" />
                                Otomatis Manifest
                              </span>
                            ) : isKotaKanimField ? (
                              <span
                                className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded flex items-center gap-1"
                                title="Kota ini otomatis terisi saat memilih Kantor Imigrasi"
                              >
                                <Sparkles className="h-3 w-3" />
                                Auto VLOOKUP Kanim
                              </span>
                            ) : isSearchableSelect ? (
                              <span className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded flex items-center gap-1">
                                <Search className="h-2.5 w-2.5" />
                                Searchable ({validOptions.length} Opsi)
                              </span>
                            ) : (
                              <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded">
                                Input Form
                              </span>
                            )}
                          </div>

                          {isKanimSelector ? (
                            <KantorImigrasiCombobox
                              value={displayValue}
                              onChange={(kanimNama, kanimKota) => {
                                const nextData: Record<string, string> = { ...manualFormData, [p.key]: kanimNama };
                                const effectiveKota = toTitleCase(kanimKota || getKotaFromKanimName(kanimNama));

                                if (effectiveKota) {
                                  effectivePlaceholders.forEach((pl) => {
                                    if (pl.key === p.key) return;
                                    const k = pl.key.toLowerCase().replace(/[\s_\-\.]/g, "");
                                    const lbl = (pl.label || "").toLowerCase().replace(/[\s_\-\.]/g, "");
                                    if (
                                      k.includes("kotakanim") ||
                                      k.includes("kotaimigrasi") ||
                                      k.includes("kotakantor") ||
                                      k.includes("kotatujuan") ||
                                      lbl.includes("kotakanim") ||
                                      lbl.includes("kotaimigrasi") ||
                                      lbl.includes("kotakantor") ||
                                      (k.includes("kota") && !k.includes("lahir") && !k.includes("paket"))
                                    ) {
                                      nextData[pl.key] = effectiveKota;
                                    }
                                  });
                                  setCustomKotaTujuan(effectiveKota);
                                }
                                setManualFormData(nextData);
                              }}
                              placeholder={p.placeholderHint || "Cari atau ketik Kantor Imigrasi / Layanan Paspor..."}
                            />
                          ) : p.inputType === "textarea" ? (
                            <textarea
                              rows={3}
                              value={displayValue}
                              onChange={(e) =>
                                setManualFormData((prev) => ({ ...prev, [p.key]: e.target.value }))
                              }
                              className="w-full p-2.5 text-xs rounded-lg border bg-background text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none"
                              placeholder={p.placeholderHint || `Masukkan ${p.label || p.key}...`}
                            />
                          ) : p.inputType === "select" && validOptions.length > 0 ? (
                            isSearchableSelect ? (
                              <SearchableSelect
                                value={displayValue}
                                onChange={(val) =>
                                  setManualFormData((prev) => ({ ...prev, [p.key]: val }))
                                }
                                options={validOptions.map((opt: string) => ({ value: opt, label: opt }))}
                                placeholder={p.placeholderHint || `Pilih atau cari ${p.label}...`}
                                searchPlaceholder={`Cari opsi ${p.label}...`}
                                size="sm"
                                allowCustomText={true}
                                className="text-xs w-full"
                              />
                            ) : (
                              <Select
                                value={displayValue}
                                onChange={(e) =>
                                  setManualFormData((prev) => ({ ...prev, [p.key]: e.target.value }))
                                }
                                options={validOptions.map((opt: string) => ({ value: opt, label: opt }))}
                                className="text-xs h-9 bg-background text-foreground"
                              />
                            )
                          ) : (
                            <Input
                              type={p.inputType === "number" ? "number" : "text"}
                              value={displayValue}
                              onChange={(e) =>
                                setManualFormData((prev) => ({ ...prev, [p.key]: e.target.value }))
                              }
                              placeholder={
                                p.placeholderHint ||
                                (isKotaKanimField
                                  ? "Otomatis terisi saat memilih Kantor Imigrasi..."
                                  : `Masukkan ${p.label || p.key}...`)
                              }
                              className="text-xs h-9 bg-background text-foreground"
                            />
                          )}

                          {isEndorsementActive && isNamaJamaahField && (
                            <p className="text-[10px] text-amber-700 dark:text-amber-400 flex items-center gap-1 pt-0.5 font-medium">
                              <Sparkles className="h-3 w-3 shrink-0 text-amber-500" />
                              <span>
                                Mode Endorsement: Nama otomatis ditambahkan nama ayah (
                                <strong>
                                  {toTitleCase(
                                    manualFormData["namaAyah"] ||
                                    manualFormData["nama_ayah"] ||
                                    activeJamaah?.namaAyah ||
                                    (activeJamaah as any)?.ayahKandung ||
                                    "Ayah Kandung"
                                  )}
                                </strong>
                                )
                              </span>
                            </p>
                          )}
                        </div>
                      );
                    })
                  )}
                </CardContent>
              </Card>

              {/* ── TOMBOL BUAT SURAT SETELAH BOX KE 3 ── */}
              <div className="pt-2">
                <Button
                  type="button"
                  size="lg"
                  className="w-full h-14 bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-base rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2.5 cursor-pointer group"
                  onClick={handleGenerateSurat}
                  disabled={isGenerating}
                >
                  <Sparkles className="h-5 w-5 text-amber-300 group-hover:rotate-12 transition-transform" />
                  <span>{isGenerating ? "Sedang Membuat Surat..." : "Buat Surat & Buka Riwayat"}</span>
                  <ArrowRight className="h-5 w-5 group-hover:translate-x-1.5 transition-transform" />
                </Button>
                <p className="text-center text-[11px] text-muted-foreground mt-2 font-medium">
                  Surat akan dicatat ke Riwayat dan Anda langsung diarahkan ke laman unduh dokumen (Word, PDF, Cetak).
                </p>
              </div>
            </div>

            {/* ── RIGHT COLUMN (7 COLS): LIVE A4 WYSIWYG PREVIEW ── */}
            <div className="lg:col-span-7 space-y-4">
              {/* Document Switcher, Status & Inline Controls Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 px-1 py-1.5 bg-slate-50/80 dark:bg-slate-900/40 rounded-xl border border-slate-200/80 dark:border-slate-800/80">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 pl-2">
                    <FileText className="h-3.5 w-3.5 text-primary" />
                    Template:
                  </span>
                  <Badge variant="outline" className="text-xs bg-white dark:bg-slate-800 border-primary/20 text-foreground font-mono">
                    {activeAttachedFile?.fileName || activeTemplate.fileNameUploaded || activeTemplate.nama}
                  </Badge>
                  {isFullDocumentTemplate && (
                    <Badge variant="success" size="sm" className="text-[10px]">
                      Full Document DOCX
                    </Badge>
                  )}

                  {/* If multiple documents attached, allow switching preview */}
                  {activeTemplate.attachedFiles && activeTemplate.attachedFiles.length > 1 && (
                    <div className="inline-flex rounded-lg border border-stone-200 dark:border-stone-800 bg-muted/40 p-0.5">
                      {activeTemplate.attachedFiles.map((doc, idx) => (
                        <button
                          key={doc.index || idx}
                          type="button"
                          onClick={() => setSelectedDocIndex(idx)}
                          className={cn(
                            "px-2.5 py-1 text-xs font-medium rounded-md transition-all cursor-pointer",
                            selectedDocIndex === idx
                              ? "bg-primary text-primary-foreground shadow-xs font-semibold"
                              : "text-muted-foreground hover:text-foreground"
                          )}
                        >
                          Dokumen {idx + 1}
                          {doc.fileName ? `: ${doc.fileName.replace(/\.docx$/i, "")}` : ""}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 pr-1">
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
                    className="text-xs text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10 h-8"
                    onClick={handleShareWhatsApp}
                    title="Kirim notifikasi surat ke WhatsApp jamaah"
                  >
                    <Share2 className="mr-1.5 h-3.5 w-3.5" />
                    Kirim WA
                  </Button>
                </div>
              </div>

              {/* ── REALISTIC A4 LETTER SHEET PREVIEW WITH KOP SURAT & STRUCTURED LAYOUT ── */}
              <OfficialLetterPreview
                template={activeTemplate}
                rawText={renderedLetterBody}
                computedNomorSurat={computedNomorSurat}
                computedNomorSurat2={computedNomorSurat2}
                renderedPerihal={renderedPerihal}
                renderedTujuan={renderedTujuan}
                renderedKotaTujuan={renderedKotaTujuan}
                customLampiran={customLampiran}
                todayInfo={todayInfo}
                effectiveShowBarcode={effectiveShowBarcode}
                verificationUrl={verificationUrl}
                selectedDocIndex={selectedDocIndex}
                activeJamaah={activeJamaah}
                activeKeberangkatan={activeKeberangkatan}
              />
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════ */}
      {/* TAB 2: RIWAYAT PEMBUATAN SURAT */}
      {/* ══════════════════════════════════════════════════════════ */}
      {activeMainTab === "history" && (
        <div className="space-y-5">
          {/* ── HEADER: Title + Filter + Refresh ── */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-foreground">
              Riwayat Pembuatan Surat
            </h2>

            <div className="flex items-center gap-2.5">
              {/* Search */}
              <div className="relative hidden sm:block">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Cari nama / nomor surat..."
                  className="pl-8 text-xs h-9 w-52"
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                />
              </div>

              {/* Filter Template */}
              <Select
                value={historyFilterTemplate}
                onChange={(e) => setHistoryFilterTemplate(e.target.value)}
                options={[
                  { value: "all", label: "Semua Jenis Surat" },
                  ...templates.map((t) => ({ value: t.slug, label: t.nama })),
                ]}
                className="text-xs h-9 w-48"
              />

              {/* Refresh Data */}
              <Button
                variant="outline"
                size="sm"
                className="text-xs text-primary border-primary/30 hover:bg-primary/5 h-9"
                onClick={handleRefreshHistory}
                disabled={historyRefreshing}
              >
                <RefreshCw className={cn("mr-1.5 h-3.5 w-3.5", historyRefreshing && "animate-spin")} />
                Refresh Data
              </Button>
            </div>
          </div>

          {/* Mobile Search (shown only on small screens) */}
          <div className="sm:hidden">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Cari nama / nomor surat..."
                className="pl-8 text-xs h-9"
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
              />
            </div>
          </div>

          {/* ── INFO BANNER: Word Template Asli ── */}
          <div className="flex items-start gap-3 p-3.5 rounded-xl border border-blue-200 dark:border-blue-900/50 bg-blue-50/80 dark:bg-blue-950/20 text-xs text-blue-900 dark:text-blue-200 shadow-2xs">
            <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <strong>Format Asli Template Word (.docx):</strong> Gunakan tombol biru <strong>Word (.docx)</strong> untuk mengunduh surat dengan <strong>100% tata letak, margin, kop surat, tabel, dan jenis font asli</strong> sesuai file template yang Anda upload. Tombol PDF menghasilkan berkas PDF standar.
            </div>
          </div>

          {/* ── DATA TABLE: Riwayat Pembuatan Surat ── */}
          <Card className="border-stone-200 dark:border-stone-800 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 uppercase font-bold text-[11px] tracking-wider border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-3.5 px-5 w-40">Tanggal</th>
                    <th className="py-3.5 px-5">Jenis &amp; Nomor Surat</th>
                    <th className="py-3.5 px-5 text-right">Aksi &amp; Download Dokumen</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                  {groupedHistory.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="py-16 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-800/50">
                            <ScrollText className="h-8 w-8 text-slate-400" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-500">Belum ada riwayat pembuatan surat</p>
                            <p className="text-xs text-slate-400 mt-1">Klik &ldquo;Generate Surat Baru&rdquo; untuk memulai membuat surat operasional.</p>
                          </div>
                          <Button
                            size="sm"
                            className="mt-2 text-xs bg-primary text-primary-foreground"
                            onClick={() => setActiveMainTab("generator")}
                          >
                            <Plus className="mr-1.5 h-3.5 w-3.5" />
                            Generate Surat Baru
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    groupedHistory.map((group, gIdx) => (
                      <tr key={`${group.nomorSurat}-${gIdx}`} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors align-top">
                        {/* ── TANGGAL ── */}
                        <td className="py-4 px-5 align-top">
                          <span className="text-sm text-slate-600 dark:text-slate-300 font-medium whitespace-nowrap">
                            {group.date}
                          </span>
                        </td>

                        {/* ── JENIS & NOMOR SURAT ── */}
                        <td className="py-4 px-5 align-top">
                          <div className="flex flex-col gap-3">
                            {/* Template Name & Nomor */}
                            <div className="flex items-start gap-3">
                              <div>
                                <p className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-tight">
                                  {group.jenis}
                                </p>
                                <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                                  {group.nomorSurat}
                                </p>
                              </div>
                            </div>

                            {/* Document File Rows (Displays exact document variants from primary record) */}
                            <div className="flex flex-col gap-2">
                              {(() => {
                                const primaryLog = group.logs[0];
                                if (!primaryLog) return null;
                                const docVariants = getDocumentVariants(primaryLog);
                                return docVariants.map((variant) => (
                                  <div
                                    key={`${primaryLog.id}-${variant.fileIndex}`}
                                    className="flex items-center justify-between gap-3 bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/50 rounded-lg px-3.5 py-2.5 shadow-2xs hover:shadow-sm transition-shadow group"
                                  >
                                    <div className="flex items-center gap-2.5 min-w-0">
                                      <FileText className="h-4 w-4 text-slate-400 shrink-0" />
                                      <div className="flex flex-col min-w-0">
                                        <span className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
                                          {variant.name}
                                        </span>
                                        <span className="text-[11px] text-muted-foreground flex items-center gap-1.5 mt-0.5">
                                          {variant.isTtd ? (
                                            <Badge variant="info" size="sm" className="text-[10px] py-0 px-1.5 bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 font-semibold">
                                              ✓ Ada TTD & Stempel
                                            </Badge>
                                          ) : (
                                            <Badge variant="outline" size="sm" className="text-[10px] py-0 px-1.5 bg-stone-50 text-stone-600 border-stone-300 dark:bg-stone-800 dark:text-stone-400 font-medium">
                                              ✍️ Tanpa TTD (Cap Basah)
                                            </Badge>
                                          )}
                                        </span>
                                      </div>
                                    </div>

                                    {/* Action Buttons: Word (Template Asli), PDF, Cetak */}
                                    <div className="flex items-center gap-1.5 shrink-0">
                                      <button
                                        type="button"
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                                        onClick={() => handleHistoryRedownloadWord(primaryLog, variant.fileIndex)}
                                        title={`Download Word (.docx) - ${variant.label}`}
                                      >
                                        <FileDown className="h-3.5 w-3.5" />
                                        <span>Word (.docx)</span>
                                      </button>

                                      <button
                                        type="button"
                                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-2xs cursor-pointer"
                                        onClick={() => handleHistoryRedownloadPdf(primaryLog, variant.fileIndex)}
                                        title={`Download PDF - ${variant.label}`}
                                      >
                                        <Download className="h-3.5 w-3.5 text-slate-500" />
                                        <span>PDF</span>
                                      </button>

                                      <button
                                        type="button"
                                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-2xs cursor-pointer"
                                        onClick={() => handleHistoryPrint(primaryLog, variant.fileIndex)}
                                        title="Cetak dokumen"
                                      >
                                        <Printer className="h-3.5 w-3.5 text-slate-500" />
                                        <span className="hidden sm:inline">Cetak</span>
                                      </button>
                                    </div>
                                  </div>
                                ));
                              })()}
                            </div>
                          </div>
                        </td>

                        {/* ── AKSI COLUMN (header-only for alignment, actions are inline above) ── */}
                        <td className="py-4 px-5 align-top text-right">
                          <div className="flex items-center justify-end gap-1.5 mt-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                              onClick={() => setPreviewModalLog(group.logs[0]!)}
                              title="Lihat detail surat"
                            >
                              <Eye className="h-3.5 w-3.5 mr-1" />
                              Detail
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-destructive/60 hover:text-destructive hover:bg-destructive/10"
                              title="Hapus riwayat surat ini"
                              onClick={() => handleDeleteGroup(group.logs, group.nomorSurat)}
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

            {/* Footer Stats */}
            {groupedHistory.length > 0 && (
              <div className="px-5 py-3 bg-slate-50/80 dark:bg-slate-900/30 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span>
                  Menampilkan <strong className="text-foreground">{groupedHistory.length}</strong> surat
                  {filteredHistory.length !== historyLogs.length && (
                    <> dari <strong className="text-foreground">{historyLogs.length}</strong> total</>
                  )}
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-xs text-primary hover:text-primary"
                  onClick={() => setActiveMainTab("generator")}
                >
                  <Plus className="mr-1 h-3 w-3" />
                  Generate Surat Baru
                </Button>
              </div>
            )}
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
                    Verifikasi
                  </Button>
                )}

                <Button
                  variant="default"
                  size="sm"
                  className="text-xs bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-xs"
                  onClick={() => {
                    if (previewModalLog) handleHistoryRedownloadWord(previewModalLog);
                  }}
                  title="Download Word (.docx) dengan 100% tata letak dan margin template asli"
                >
                  <FileDown className="mr-1.5 h-3.5 w-3.5" />
                  Word (.docx - Asli)
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs text-slate-700 border-slate-200 hover:bg-slate-50"
                  onClick={() => {
                    if (previewModalLog) handleHistoryRedownloadPdf(previewModalLog);
                  }}
                  title="Download PDF sesuai format template asli"
                >
                  <Download className="mr-1.5 h-3.5 w-3.5" />
                  PDF (.pdf - Asli)
                </Button>

                <Button
                  size="sm"
                  className="text-xs bg-primary text-primary-foreground"
                  onClick={() => {
                    if (previewModalLog) handleHistoryPrint(previewModalLog);
                  }}
                >
                  <Printer className="mr-1.5 h-3.5 w-3.5" />
                  Cetak
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
