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
  UploadCloud,
  AlertTriangle,
  Database,
  PenTool,
  Calendar,
  CalendarDays,
  Loader2,
  Clipboard,
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
  saveSuratTemplates,
  loadGeneratedSuratLogs,
  saveGeneratedSuratLog,
  deleteGeneratedSuratLog,
  resolveAutocratFieldValues,
  renderAutocratMergedText,
  getTodayDateInfo,
  isSystemAutoPlaceholder,
  extractPlaceholdersFromText,
  extractPlaceholdersFromDocxFile,
  matchTagToManifestField,
  extractNamaFromAutocratFields,
  generateSuratFileName,
  parseDateToIsoString,
  formatIsoToIndonesianDate,
  formatIsoToIndonesianDateRange,
  parseDateRangeToIsoStrings,
  parseMonthYearToIsoString,
  formatIsoToIndonesianMonthYear,
} from "@/shared/lib/surat-autocrat-engine";
import { downloadMergedDocx } from "@/shared/lib/docx-mail-merge";
import { downloadDocxAsPdf } from "@/shared/lib/docx-to-pdf";
import { compressOcrDocument } from "@/shared/lib/ocr-image-compressor";
import { KantorImigrasiCombobox } from "@/shared/components/ui/KantorImigrasiCombobox";
import { SearchableSelect } from "@/shared/components/ui/SearchableSelect";
import { getKotaFromKanimName } from "@/shared/lib/kantor-imigrasi";
import type {
  SuratTemplate,
  SuratAttachedFile,
  GeneratedSuratLog,
  SuratPlaceholderMapping,
} from "@/shared/types/surat";
import OfficialLetterPreview from "./_components/OfficialLetterPreview";

/**
 * Checks whether a template has an uploaded .docx template binary attached
 */
function checkTemplateHasDocx(tpl: SuratTemplate | null | undefined): boolean {
  if (!tpl) return false;
  if (tpl.templateFileBase64 && tpl.templateFileBase64.trim().length > 0) return true;
  if (tpl.attachedFiles && tpl.attachedFiles.some((f) => f.templateFileBase64 && f.templateFileBase64.trim().length > 0)) return true;
  return false;
}

/**
 * Computes the next sequential letter number from existing logs dynamically (without hardcoding).
 * Handles templates that consume 1 or 2 numbers (e.g. Surat Rekomendasi).
 */
function computeNextNomorUrutFromLogs(
  logs: GeneratedSuratLog[],
  template: SuratTemplate | null
): string {
  let highestNum = 0;

  logs.forEach((log) => {
    // Filter logs for the same template if template is defined
    const isSameTemplate =
      !template ||
      log.templateId === template.id ||
      log.templateSlug === template.slug;

    if (!isSameTemplate) return;

    // 1. Scan log.nomorSurat (e.g. 001/VTA.P/A/IX/2026 or SR-PASPOR/001/VTU/IX/2026)
    if (log.nomorSurat) {
      const match = log.nomorSurat.match(/(?:^|\/)(\d{1,5})(?:\/|$)/);
      if (match?.[1]) {
        const val = parseInt(match[1], 10);
        if (!isNaN(val) && val > highestNum) highestNum = val;
      }
    }

    // 2. Scan fieldsData for all Nomor Surat keys (e.g. "Nomor Surat 1", "Nomor Surat 2")
    if (log.fieldsData) {
      Object.entries(log.fieldsData).forEach(([k, v]) => {
        if (/nomor\s*surat/i.test(k) && typeof v === "string") {
          const match = v.match(/(?:^|\/)(\d{1,5})(?:\/|$)/);
          if (match?.[1]) {
            const val = parseInt(match[1], 10);
            if (!isNaN(val) && val > highestNum) highestNum = val;
          }
        }
      });
    }
  });

  const nextVal = highestNum + 1;
  return String(nextVal).padStart(3, "0");
}

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
  type OcrDocType = "ktp" | "akta" | "kk";

  const [dataSourceMode, setDataSourceMode] = useState<"manifest" | "ocr" | "manual">("manifest");
  const [saveOcrToManifest, setSaveOcrToManifest] = useState<boolean>(false);
  const [isSavingOcrDocsToManifest, setIsSavingOcrDocsToManifest] = useState<boolean>(false);

  // 3 Document Slots for OCR in Surat: KTP, Akta Lahir, KK
  const [ocrFiles, setOcrFiles] = useState<Record<OcrDocType, File | null>>({
    ktp: null,
    akta: null,
    kk: null,
  });
  const [ocrPreviews, setOcrPreviews] = useState<Record<OcrDocType, string | null>>({
    ktp: null,
    akta: null,
    kk: null,
  });
  const [ocrStatuses, setOcrStatuses] = useState<Record<OcrDocType, "idle" | "uploading" | "extracting" | "success" | "error">>({
    ktp: "idle",
    akta: "idle",
    kk: "idle",
  });
  const [ocrResultsData, setOcrResultsData] = useState<Record<OcrDocType, Record<string, any> | null>>({
    ktp: null,
    akta: null,
    kk: null,
  });
  const [ocrErrors, setOcrErrors] = useState<Record<OcrDocType, string | null>>({
    ktp: null,
    akta: null,
    kk: null,
  });
  const [ocrUploadedDocs, setOcrUploadedDocs] = useState<Record<OcrDocType, any | null>>({
    ktp: null,
    akta: null,
    kk: null,
  });
  const [ocrFilledFieldKeys, setOcrFilledFieldKeys] = useState<Set<string>>(new Set());
  const [activeOcrColumn, setActiveOcrColumn] = useState<OcrDocType>("ktp");
  const [hoveredOcrColumn, setHoveredOcrColumn] = useState<OcrDocType | null>(null);

  // Hidden File Input Refs for OCR Uploads
  const ktpInputRef = React.useRef<HTMLInputElement>(null);
  const aktaInputRef = React.useRef<HTMLInputElement>(null);
  const kkInputRef = React.useRef<HTMLInputElement>(null);
  const docInputRefs: Record<OcrDocType, React.RefObject<HTMLInputElement | null>> = {
    ktp: ktpInputRef,
    akta: aktaInputRef,
    kk: kkInputRef,
  };

  // Ref registries for dynamic date and month picker inputs
  const dateInputsRef = React.useRef<Record<string, HTMLInputElement | null>>({});
  const monthInputsRef = React.useRef<Record<string, HTMLInputElement | null>>({});

  const handleSwitchMode = (mode: "manifest" | "ocr" | "manual") => {
    setDataSourceMode(mode);
    if (mode === "manual") {
      setSelectedPackageId("");
      setSelectedJamaahId("");
      setManualFormData({});
    } else if (mode === "ocr") {
      if (!saveOcrToManifest) {
        setSelectedPackageId("");
        setSelectedJamaahId("");
      }
    }
  };

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

  // Upload Template Modal State (Mandatory when template DOCX is missing)
  const [isUploadTemplateModalOpen, setIsUploadTemplateModalOpen] = useState(false);
  const [isUploadingTemplate, setIsUploadingTemplate] = useState(false);
  const [uploadModalTargetTemplate, setUploadModalTargetTemplate] = useState<SuratTemplate | null>(null);

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

  // Dynamic auto-count nomor urut surat from generated history logs
  useEffect(() => {
    if (activeTemplate) {
      const nextNum = computeNextNomorUrutFromLogs(historyLogs, activeTemplate);
      setNomorUrutSurat(nextNum);
    }
  }, [activeTemplate, historyLogs]);

  // Active Selected Keberangkatan Object
  const activeKeberangkatan = useMemo(() => {
    if (dataSourceMode === "manual" || !selectedPackageId) return null;
    return storeKbrList.find((k: any) => k.id === selectedPackageId) || null;
  }, [storeKbrList, selectedPackageId, dataSourceMode]);

  // Filtered Jamaah for selected package
  const availableJamaahList = useMemo(() => {
    if (!storeJamaah || storeJamaah.length === 0) return [];
    if (dataSourceMode === "manual" || !selectedPackageId) return [];
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
    return filtered;
  }, [storeJamaah, selectedPackageId, storeKbrList, dataSourceMode]);

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
    if (dataSourceMode === "manual" || !selectedJamaahId) return null;
    return availableJamaahList.find((j: any) => j.id === selectedJamaahId) || null;
  }, [availableJamaahList, selectedJamaahId, dataSourceMode]);

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

  // Whether active template has an uploaded .docx template file
  const hasTemplateDocx = useMemo(() => {
    return checkTemplateHasDocx(activeTemplate);
  }, [activeTemplate]);

  // Handler to upload a DOCX template file directly from the generator prompt/modal
  const handleUploadTemplateForTarget = async (file: File, targetTpl?: SuratTemplate) => {
    const target = targetTpl || uploadModalTargetTemplate || activeTemplate;
    if (!target) return;
    if (!file.name.toLowerCase().endsWith(".docx")) {
      showToast("Hanya file template Microsoft Word (.docx) yang diperbolehkan.");
      return;
    }
    setIsUploadingTemplate(true);
    try {
      const reader = new FileReader();
      const fileBase64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const scanRes = await extractPlaceholdersFromDocxFile(file);

      const count = Math.max(1, target.jumlahTemplateTerlampir || 1);
      const existingAttached = target.attachedFiles && target.attachedFiles.length > 0 ? [...target.attachedFiles] : [];
      const updatedAttached: SuratAttachedFile[] = Array.from({ length: count }, (_, i) => {
        if (i === 0) {
          return {
            index: 1,
            fileName: file.name,
            content: scanRes.extractedText,
            templateFileBase64: fileBase64,
            formatNamaFile: target.formatNamaFile || `Surat_${target.slug}`,
            opsiNomorSurat: "same_as_template_1",
          };
        }
        return existingAttached[i] || {
          index: i + 1,
          fileName: "",
          formatNamaFile: `${target.formatNamaFile || "Dokumen"}_Lampiran_${i + 1}`,
          opsiNomorSurat: "same_as_template_1",
        };
      });

      // Build clean placeholders strictly from the uploaded docx tags
      const fileTags = (scanRes.tags || []).filter((t) => !isSystemAutoPlaceholder(t));
      const existingPlaceholders = target.placeholders || [];
      const updatedPlaceholders: SuratPlaceholderMapping[] = [];

      fileTags.forEach((tag) => {
        const found = existingPlaceholders.find(
          (p) => p.key.toLowerCase().trim() === tag.toLowerCase().trim()
        );
        if (found) {
          updatedPlaceholders.push({ ...found, key: tag });
        } else {
          const matchRes = matchTagToManifestField(tag);
          updatedPlaceholders.push({
            key: tag,
            label: tag.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
            sourceType: matchRes.sourceType,
            manifestField: matchRes.matchedManifest?.key,
            inputType: matchRes.defaultType,
            defaultValue: matchRes.defaultValue,
            required: true,
          });
        }
      });

      const updatedTemplate: SuratTemplate = {
        ...target,
        fileNameUploaded: file.name,
        templateFileBase64: fileBase64,
        attachedFiles: updatedAttached,
        placeholders: updatedPlaceholders.length > 0 ? updatedPlaceholders : target.placeholders,
        updatedAt: new Date().toISOString(),
      };

      // Sync to API
      const res = await fetch("/api/master/surat-templates", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedTemplate),
      });

      if (!res.ok) {
        throw new Error("Gagal menyimpan template ke server");
      }

      // Update state & storage
      const newTemplates = templates.map((t) => (t.id === updatedTemplate.id ? updatedTemplate : t));
      setTemplates(newTemplates);
      saveSuratTemplates(newTemplates);

      setIsUploadTemplateModalOpen(false);
      setUploadModalTargetTemplate(null);
      showToast(`Template Word (.docx) "${file.name}" berhasil diunggah! Terdeteksi ${scanRes.tags.length} variabel.`);
    } catch (err) {
      console.error("Gagal unggah template:", err);
      showToast("Terjadi kesalahan saat mengunggah template file.");
    } finally {
      setIsUploadingTemplate(false);
    }
  };

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

  // Effective Placeholders list strictly following the template document file
  const effectivePlaceholders = useMemo(() => {
    const normalize = (s: string) =>
      s.toLowerCase().trim().replace(/[\u2018\u2019\u201A\u201B']/g, "'").replace(/[\s_\-\.]/g, "");

    const extractedTags = rawTemplateText
      ? extractPlaceholdersFromText(rawTemplateText).filter((k) => !isSystemAutoPlaceholder(k))
      : [];

    // If template has extracted tags from the template document/text,
    // the document tags MUST BE the single source of truth!
    if (extractedTags.length > 0) {
      const existingMap = new Map<string, any>();
      (activeTemplate?.placeholders || []).forEach((p) => {
        if (!isSystemAutoPlaceholder(p.key)) {
          existingMap.set(normalize(p.key), p);
        }
      });

      const result: any[] = [];
      const seen = new Set<string>();

      extractedTags.forEach((tag) => {
        const norm = normalize(tag);
        if (seen.has(norm)) return;
        seen.add(norm);

        const existing = existingMap.get(norm);
        if (existing) {
          result.push({
            ...existing,
            key: tag,
          });
        } else {
          const matchRes = matchTagToManifestField(tag);
          result.push({
            key: tag,
            label: tag.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
            sourceType: matchRes.sourceType,
            manifestField: matchRes.matchedManifest?.key,
            inputType: matchRes.defaultType,
            defaultValue: matchRes.defaultValue,
            required: true,
          });
        }
      });

      return result;
    }

    // Fallback: If no document text is extracted yet, use template's configured placeholders (excluding system auto tags)
    return (activeTemplate?.placeholders || []).filter((p) => !isSystemAutoPlaceholder(p.key));
  }, [activeTemplate, rawTemplateText]);

  // OCR Document Configuration (KTP, Akta, KK)
  const OCR_DOC_CONFIG: Record<
    OcrDocType,
    {
      title: string;
      subtitle: string;
      badgeText: string;
      sampleFields: string;
    }
  > = {
    ktp: {
      title: "KTP",
      subtitle: "Kartu Tanda Penduduk",
      badgeText: "NIK & Identitas",
      sampleFields: "NIK, Nama Lengkap, Tempat/Tgl Lahir, Jenis Kelamin, Alamat",
    },
    akta: {
      title: "Akta Kelahiran",
      subtitle: "Akta Lahir Resmi",
      badgeText: "Nama & Orang Tua",
      sampleFields: "Nama Lengkap, Tempat/Tgl Lahir, Nama Ayah Kandung",
    },
    kk: {
      title: "Kartu Keluarga",
      subtitle: "KK (Kartu Keluarga)",
      badgeText: "No. KK & Keluarga",
      sampleFields: "Nomor KK, Nama Kepala Keluarga / Ayah, NIK",
    },
  };

  // Helper untuk mencari data baris anggota keluarga jamaah di dokumen KK (tabel 1 & 2 simetris)
  const findTargetInKk = useCallback(
    (kkData?: Record<string, any> | null, targetNama?: string, targetNik?: string) => {
      if (!kkData) return null;
      let anggotaList: any[] = [];
      if (Array.isArray(kkData.anggotaKeluarga)) {
        anggotaList = kkData.anggotaKeluarga;
      } else if (typeof kkData.anggotaKeluarga === "string") {
        try {
          const parsed = JSON.parse(kkData.anggotaKeluarga);
          if (Array.isArray(parsed)) anggotaList = parsed;
        } catch (_) {}
      }

      const clean = (s?: string) =>
        (s || "")
          .toLowerCase()
          .replace(/[\u2018\u2019\u201A\u201B'"`{}[\]()_.\-:\/\\]/g, "")
          .replace(/\s+/g, "");

      const cNama = clean(targetNama);
      const cNik = clean(targetNik);

      if (anggotaList.length > 0) {
        // 1. Cocokkan NIK jika ada
        if (cNik) {
          const matchByNik = anggotaList.find((m) => {
            const mNik = clean(m.nik);
            return mNik && (mNik === cNik || mNik.includes(cNik) || cNik.includes(mNik));
          });
          if (matchByNik) return matchByNik;
        }

        // 2. Cocokkan Nama Lengkap
        if (cNama) {
          const matchByName = anggotaList.find((m) => {
            const mNama = clean(m.namaLengkap || m.nama);
            return (
              mNama &&
              (mNama === cNama ||
                (mNama.length > 4 && cNama.includes(mNama)) ||
                (cNama.length > 4 && mNama.includes(cNama)))
            );
          });
          if (matchByName) return matchByName;
        }
      }
      return null;
    },
    []
  );

  // Map extracted OCR results to Autocrat Form Placeholders
  const applyAllOcrResultsToForm = useCallback(
    (results: Record<OcrDocType, Record<string, any> | null>) => {
      const ktp = results.ktp || {};
      const akta = results.akta || {};
      const kk = results.kk || {};

      // 1. Nama Jamaah: Prioritas UTAMA dari KTP
      const namaFromKtp = ktp.namaLengkap || ktp.nama || ktp.name;
      const namaCandidate =
        namaFromKtp ||
        akta.namaLengkap ||
        akta.nama ||
        kk.namaLengkap ||
        kk.nama;

      // 2. NIK / No Identitas: Prioritas UTAMA dari KTP
      const nikFromKtp = ktp.nik || ktp.noKtp || ktp.nomorKtp;
      const nikCandidate = nikFromKtp || kk.nik;

      // 3. Tempat Lahir: KTP lalu Akta
      const tempatLahirCandidate = ktp.tempatLahir || akta.tempatLahir;

      // 4. Tanggal Lahir: KTP lalu Akta
      const tanggalLahirCandidate = ktp.tanggalLahir || akta.tanggalLahir;

      // 5. Jenis Kelamin: KTP
      const jenisKelaminCandidate = ktp.jenisKelamin;

      // 6. Nama Ayah Kandung:
      // Prioritas 1: Ambil dari baris deret jamaah terkait pada tabel KK (misal deret ke-5)
      const matchedKkMember = findTargetInKk(kk, namaCandidate, nikCandidate);
      const namaAyahFromKkRow = matchedKkMember?.namaAyah;
      // Prioritas 2: Akta kelahiran
      // Prioritas 3: kk.namaAyah (hasil ekstraksi prompt target-aware)
      // Prioritas 4: Fallback kk.namaKepalaKeluarga (hanya jika jamaah adalah kepala keluarga)
      const namaAyahCandidate =
        namaAyahFromKkRow ||
        akta.namaAyah ||
        kk.namaAyah ||
        kk.namaKepalaKeluarga;

      // 7. Nomor KK: KK
      const noKkCandidate = kk.nomorKk || kk.noKk;

      // 8. Alamat: KTP
      let alamatCandidate = ktp.alamatLengkap || ktp.alamat || "";
      if (!alamatCandidate && (ktp.alamat || ktp.kelurahan || ktp.kecamatan || ktp.kota)) {
        const parts = [
          ktp.alamat,
          ktp.rt && `RT ${ktp.rt}`,
          ktp.rw && `RW ${ktp.rw}`,
          ktp.kelurahan && `Kel. ${ktp.kelurahan}`,
          ktp.kecamatan && `Kec. ${ktp.kecamatan}`,
          ktp.kota,
          ktp.provinsi,
        ].filter(Boolean);
        alamatCandidate = parts.join(", ");
      }

      const cleanStr = (s?: string) =>
        (s || "")
          .toLowerCase()
          .replace(/[\u2018\u2019\u201A\u201B'"`{}[\]()_.\-:\/\\]/g, "")
          .replace(/\s+/g, "");

      setManualFormData((prev) => {
        const next = { ...prev };
        const newlyFilled = new Set<string>();

        // Pre-populate standard global keys for direct text merges
        if (namaCandidate) {
          const val = toTitleCase(namaCandidate);
          next["nama"] = val;
          next["nama_lengkap"] = val;
          next["Nama"] = val;
          next["Nama Lengkap"] = val;
          next["Nama Jamaah"] = val;
          next["Nama Jama'ah"] = val;
          next["nama_jamaah"] = val;
        }
        if (nikCandidate) {
          const val = String(nikCandidate).trim();
          next["nik"] = val;
          next["NIK"] = val;
          next["no_identitas"] = val;
          next["No Identitas"] = val;
          next["nomor_identitas"] = val;
        }
        if (alamatCandidate) {
          const val = toTitleCase(alamatCandidate);
          next["alamat"] = val;
          next["Alamat"] = val;
          next["alamat_lengkap"] = val;
          next["Alamat Lengkap"] = val;
        }
        if (tanggalLahirCandidate) {
          const iso = parseDateToIsoString(tanggalLahirCandidate);
          const formattedTgl = (iso ? formatIsoToIndonesianDate(iso) : null) || tanggalLahirCandidate;
          next["tanggal_lahir"] = formattedTgl;
          next["Tanggal Lahir"] = formattedTgl;
          next["tgl_lahir"] = formattedTgl;
          next["Tgl Lahir"] = formattedTgl;
          next["tanggallahir"] = formattedTgl;
        }
        if (tempatLahirCandidate) {
          const val = toTitleCase(tempatLahirCandidate);
          next["tempat_lahir"] = val;
          next["Tempat Lahir"] = val;
          next["tempatlahir"] = val;
        }

        effectivePlaceholders.forEach((p) => {
          const cleanK = cleanStr(p.key);
          const cleanL = cleanStr(p.label);
          const mf = (p.manifestField || "").toLowerCase();

          // 1. Nama Jamaah / Nama Lengkap (Utamakan dari KTP)
          const isNama =
            !cleanK.includes("ayah") &&
            !cleanL.includes("ayah") &&
            !cleanK.includes("orangtua") &&
            !cleanL.includes("orangtua") &&
            !cleanK.includes("perusahaan") &&
            !cleanL.includes("perusahaan") &&
            !cleanK.includes("pimpinan") &&
            !cleanL.includes("pimpinan") &&
            !cleanK.includes("paket") &&
            !cleanL.includes("paket") &&
            (cleanK === "nama" ||
              cleanL === "nama" ||
              cleanK.includes("namajamaah") ||
              cleanL.includes("namajamaah") ||
              cleanK.includes("namalengkap") ||
              cleanL.includes("namalengkap") ||
              cleanK === "namapemohon" ||
              cleanL === "namapemohon" ||
              cleanK === "namapeserta" ||
              cleanL === "namapeserta" ||
              cleanK === "namakaryawan" ||
              cleanL === "namakaryawan" ||
              cleanK === "namatertanggung" ||
              cleanL === "namatertanggung" ||
              cleanK.startsWith("nama") ||
              cleanL.startsWith("nama") ||
              mf === "jamaah.namalengkap" ||
              (mf.includes("nama") && !mf.includes("ayah") && !mf.includes("paket")));

          if (isNama) {
            if (namaCandidate) {
              next[p.key] = toTitleCase(namaCandidate);
              newlyFilled.add(p.key);
            }
            return;
          }

          // 2. NIK / No Identitas
          const isNik =
            cleanK === "nik" ||
            cleanL === "nik" ||
            cleanK.includes("nik") ||
            cleanL.includes("nik") ||
            cleanK.includes("noidentitas") ||
            cleanL.includes("noidentitas") ||
            cleanK.includes("nomoridentitas") ||
            cleanL.includes("nomoridentitas") ||
            cleanK.includes("noktp") ||
            cleanL.includes("noktp") ||
            cleanK.includes("nomorktp") ||
            cleanL.includes("nomorktp") ||
            cleanK === "noid" ||
            cleanL === "noid" ||
            cleanK === "nomorid" ||
            cleanL === "nomorid" ||
            mf === "jamaah.nik" ||
            mf.includes("nik");

          if (isNik) {
            if (nikCandidate) {
              next[p.key] = String(nikCandidate).trim();
              newlyFilled.add(p.key);
            }
            return;
          }

          // 3. TTL (Tempat & Tanggal Lahir digabung)
          const isTtl =
            cleanK === "ttl" ||
            cleanL === "ttl" ||
            cleanK.includes("tempattanggallahir") ||
            cleanL.includes("tempattanggallahir") ||
            cleanK.includes("tempattgllahir") ||
            cleanL.includes("tempattgllahir");

          if (isTtl) {
            const tpt = tempatLahirCandidate ? toTitleCase(tempatLahirCandidate) : "";
            const tglIso = tanggalLahirCandidate ? parseDateToIsoString(tanggalLahirCandidate) : "";
            const tglIndo = tglIso ? formatIsoToIndonesianDate(tglIso) : tanggalLahirCandidate || "";
            const ttlVal = [tpt, tglIndo].filter(Boolean).join(", ");
            if (ttlVal) {
              next[p.key] = ttlVal;
              newlyFilled.add(p.key);
            }
            return;
          }

          // 4. Tempat Lahir
          const isTempatLahir =
            cleanK.includes("tempatlahir") ||
            cleanL.includes("tempatlahir") ||
            (cleanK.includes("tempat") && cleanK.includes("lahir")) ||
            (cleanL.includes("tempat") && cleanL.includes("lahir")) ||
            mf === "jamaah.tempatlahir" ||
            mf.includes("tempatlahir");

          if (isTempatLahir) {
            if (tempatLahirCandidate) {
              next[p.key] = toTitleCase(tempatLahirCandidate);
              newlyFilled.add(p.key);
            }
            return;
          }

          // 5. Tanggal Lahir
          const isTanggalLahir =
            cleanK.includes("tanggallahir") ||
            cleanK.includes("tgllahir") ||
            cleanL.includes("tanggallahir") ||
            cleanL.includes("tgllahir") ||
            (cleanK.includes("tanggal") && cleanK.includes("lahir")) ||
            (cleanL.includes("tanggal") && cleanL.includes("lahir")) ||
            mf === "jamaah.tanggallahir" ||
            mf.includes("tanggallahir");

          if (isTanggalLahir) {
            if (tanggalLahirCandidate) {
              const iso = parseDateToIsoString(tanggalLahirCandidate);
              const formattedTgl = (iso ? formatIsoToIndonesianDate(iso) : null) || tanggalLahirCandidate;
              next[p.key] = formattedTgl;
              newlyFilled.add(p.key);
            }
            return;
          }

          // 6. Jenis Kelamin
          const isJenisKelamin =
            cleanK.includes("jeniskelamin") ||
            cleanL.includes("jeniskelamin") ||
            cleanK.includes("gender") ||
            cleanL.includes("gender") ||
            mf === "jamaah.jeniskelamin" ||
            mf.includes("kelamin");

          if (isJenisKelamin) {
            if (jenisKelaminCandidate) {
              const jkUpper = String(jenisKelaminCandidate).toUpperCase();
              next[p.key] = jkUpper.startsWith("L") ? "LAKI-LAKI" : jkUpper.startsWith("P") ? "PEREMPUAN" : jenisKelaminCandidate;
              newlyFilled.add(p.key);
            }
            return;
          }

          // 7. Nama Ayah Kandung
          const isNamaAyah =
            cleanK.includes("ayah") ||
            cleanL.includes("ayah") ||
            cleanK.includes("orangtua") ||
            cleanL.includes("orangtua") ||
            mf === "jamaah.namaayah" ||
            mf.includes("ayah");

          if (isNamaAyah) {
            if (namaAyahCandidate) {
              next[p.key] = toTitleCase(namaAyahCandidate);
              newlyFilled.add(p.key);
            }
            return;
          }

          // 8. Alamat Domisili
          const isAlamat =
            cleanK.includes("alamat") ||
            cleanL.includes("alamat") ||
            mf === "jamaah.alamat" ||
            mf.includes("alamat");

          if (isAlamat) {
            if (alamatCandidate) {
              next[p.key] = toTitleCase(alamatCandidate);
              newlyFilled.add(p.key);
            }
            return;
          }

          // 9. Nomor KK
          const isNomorKk =
            cleanK.includes("nomorkk") ||
            cleanL.includes("nomorkk") ||
            cleanK.includes("nokk") ||
            cleanL.includes("nokk") ||
            cleanK.includes("kartukeluarga") ||
            cleanL.includes("kartukeluarga") ||
            mf.includes("kk");

          if (isNomorKk) {
            if (noKkCandidate) {
              next[p.key] = String(noKkCandidate).trim();
              newlyFilled.add(p.key);
            }
            return;
          }

          // Otomatisasi konversi jika field bertipe tanggal masih berisi ISO string
          if (p.inputType === "date" && next[p.key] && /^\d{4}-\d{2}-\d{2}$/.test(String(next[p.key]).trim())) {
            next[p.key] = formatIsoToIndonesianDate(String(next[p.key]).trim());
          }
        });

        setOcrFilledFieldKeys((prevSet) => new Set([...Array.from(prevSet), ...Array.from(newlyFilled)]));
        return next;
      });
    },
    [effectivePlaceholders]
  );

  // Automatically apply OCR results to form when entering OCR mode or changing template
  useEffect(() => {
    if (dataSourceMode === "ocr" && (["ktp", "akta", "kk"] as OcrDocType[]).some((j) => ocrResultsData[j])) {
      applyAllOcrResultsToForm(ocrResultsData);
    }
  }, [dataSourceMode, selectedTemplateSlug, effectivePlaceholders, applyAllOcrResultsToForm, ocrResultsData]);

  // Helper to handle pasted file (from event or clipboard API)
  const handlePasteFile = useCallback(
    async (e: React.ClipboardEvent | ClipboardEvent, targetJenis: OcrDocType) => {
      const items = e.clipboardData?.items;
      if (!items || items.length === 0) return;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item?.kind === "file") {
          const rawFile = item.getAsFile();
          if (rawFile) {
            e.preventDefault();
            e.stopPropagation();
            const ext = rawFile.type.includes("pdf") ? ".pdf" : ".jpg";
            const customName = `${targetJenis}_pasted_${Date.now()}${ext}`;
            const validFile = new File(
              [rawFile],
              rawFile.name && rawFile.name !== "image.png" ? rawFile.name : customName,
              { type: rawFile.type || "image/jpeg" }
            );
            handleOcrProcessFile(validFile, targetJenis);
            showToast(`File berhasil di-paste ke ${OCR_DOC_CONFIG[targetJenis]?.title || targetJenis.toUpperCase()}`);
            return;
          }
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [OCR_DOC_CONFIG]
  );

  // Helper to read clipboard directly via navigator.clipboard API
  const handleReadClipboard = useCallback(
    async (targetJenis: OcrDocType) => {
      try {
        if (!navigator.clipboard?.read) {
          showToast("Silakan klik kolom lalu tekan Ctrl+V untuk menempel file.");
          return;
        }
        const clipboardItems = await navigator.clipboard.read();
        for (const item of clipboardItems) {
          const imageType = item.types.find((t) => t.startsWith("image/"));
          if (imageType) {
            const blob = await item.getType(imageType);
            const ext = imageType.includes("png") ? ".png" : ".jpg";
            const file = new File([blob], `${targetJenis}_clipboard_${Date.now()}${ext}`, { type: imageType });
            handleOcrProcessFile(file, targetJenis);
            showToast(`File gambar berhasil di-paste ke ${OCR_DOC_CONFIG[targetJenis]?.title}`);
            return;
          }
        }
        showToast("Tidak ada gambar di clipboard. Silakan salin gambar/screenshot terlebih dahulu.");
      } catch (err) {
        console.warn("Clipboard read error:", err);
        showToast("Klik pada kolom lalu tekan Ctrl+V untuk menempel file gambar.");
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [OCR_DOC_CONFIG]
  );

  // Global window paste listener for OCR section
  useEffect(() => {
    if (dataSourceMode !== "ocr") return;

    const handleWindowPaste = (e: ClipboardEvent) => {
      const activeEl = document.activeElement as HTMLElement | null;
      const tagName = activeEl?.tagName?.toLowerCase();
      if (tagName === "input" || tagName === "textarea" || activeEl?.isContentEditable) {
        return;
      }

      const targetCol = hoveredOcrColumn || activeOcrColumn;
      if (!targetCol) return;

      const items = e.clipboardData?.items;
      if (!items || items.length === 0) return;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item?.kind === "file") {
          const rawFile = item.getAsFile();
          if (rawFile) {
            e.preventDefault();
            e.stopPropagation();
            const ext = rawFile.type.includes("pdf") ? ".pdf" : ".jpg";
            const customName = `${targetCol}_pasted_${Date.now()}${ext}`;
            const validFile = new File(
              [rawFile],
              rawFile.name && rawFile.name !== "image.png" ? rawFile.name : customName,
              { type: rawFile.type || "image/jpeg" }
            );
            handleOcrProcessFile(validFile, targetCol);
            showToast(`File berhasil di-paste ke ${OCR_DOC_CONFIG[targetCol]?.title || targetCol.toUpperCase()}`);
            return;
          }
        }
      }
    };

    window.addEventListener("paste", handleWindowPaste);
    return () => window.removeEventListener("paste", handleWindowPaste);
  }, [dataSourceMode, hoveredOcrColumn, activeOcrColumn, OCR_DOC_CONFIG]);

  // Process OCR for specific file
  const handleOcrProcessFile = async (
    file: File,
    jenis: OcrDocType,
    forceFresh = false
  ) => {
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      setOcrErrors((prev) => ({ ...prev, [jenis]: "Ukuran file melebihi batas maksimal 10MB." }));
      showToast("Ukuran file melebihi batas maksimal 10MB.");
      return;
    }

    // 1. Kompresi otomatis hingga maksimal 200 KB untuk file gambar
    let processedFile = file;
    if (file.type.startsWith("image/") || (!file.type && !file.name.toLowerCase().endsWith(".pdf"))) {
      try {
        processedFile = await compressOcrDocument(file, 200 * 1024);
      } catch (cErr) {
        console.warn("Kompresi file gagal, melanjutkan dengan file asli:", cErr);
      }
    }

    const previewUrl = URL.createObjectURL(processedFile);
    setOcrFiles((prev) => ({ ...prev, [jenis]: processedFile }));
    setOcrPreviews((prev) => ({ ...prev, [jenis]: previewUrl }));
    setOcrErrors((prev) => ({ ...prev, [jenis]: null }));

    try {
      let ocrResultData: any = null;

      // Dapatkan identitas target jamaah untuk membantu resolusi baris KK
      let targetNamaJamaah = "";
      let targetNikJamaah = "";

      if (selectedJamaahId) {
        const jm = availableJamaahList.find((j: any) => j.id === selectedJamaahId) as any;
        if (jm) {
          targetNamaJamaah = jm.namaLengkap || jm.nama || jm.name || "";
          targetNikJamaah = jm.nik || "";
        }
      }
      if (!targetNamaJamaah && ocrResultsData.ktp) {
        targetNamaJamaah = ocrResultsData.ktp.namaLengkap || ocrResultsData.ktp.nama || "";
        targetNikJamaah = ocrResultsData.ktp.nik || "";
      }
      if (!targetNamaJamaah && ocrResultsData.akta) {
        targetNamaJamaah = ocrResultsData.akta.namaLengkap || ocrResultsData.akta.nama || "";
      }
      if (!targetNamaJamaah) {
        targetNamaJamaah = manualFormData["nama"] || manualFormData["nama_lengkap"] || "";
        targetNikJamaah = manualFormData["nik"] || manualFormData["no_identitas"] || "";
      }

      if (saveOcrToManifest && selectedJamaahId) {
        setOcrStatuses((prev) => ({ ...prev, [jenis]: "uploading" }));

        const formData = new FormData();
        formData.append("file", processedFile);
        formData.append("jamaahId", selectedJamaahId);
        formData.append("jenisDokumen", jenis);

        const uploadRes = await fetch("/api/dokumen/upload", {
          method: "POST",
          body: formData,
        });

        const uploadJson = await uploadRes.json();
        if (!uploadRes.ok) {
          throw new Error(uploadJson.message || "Gagal mengunggah file ke penyimpanan manifest");
        }

        const uploadedDoc = uploadJson.data?.dokumen || uploadJson.data;
        const fileUrl = uploadJson.data?.fileUrl || uploadedDoc?.fileUrl;
        const docId = uploadedDoc?.id;

        setOcrUploadedDocs((prev) => ({ ...prev, [jenis]: uploadedDoc }));

        setOcrStatuses((prev) => ({ ...prev, [jenis]: "extracting" }));
        const ocrRes = await fetch("/api/dokumen/ocr", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            dokumenId: docId,
            fileUrl,
            jenis,
            forceFresh,
            namaJamaah: targetNamaJamaah || undefined,
            nikJamaah: targetNikJamaah || undefined,
            mode: jenis === "kk" && targetNamaJamaah ? `kk_target:${targetNamaJamaah}|${targetNikJamaah}` : undefined,
          }),
        });

        const ocrJson = await ocrRes.json();
        if (!ocrRes.ok) {
          throw new Error(ocrJson.message || "Gagal memproses ekstraksi OCR");
        }

        ocrResultData = ocrJson.data;
      } else {
        setOcrStatuses((prev) => ({ ...prev, [jenis]: "extracting" }));

        const formData = new FormData();
        formData.append("file", processedFile);
        formData.append("jenisDokumen", jenis);
        if (forceFresh) formData.append("forceFresh", "true");
        if (targetNamaJamaah) {
          formData.append("namaJamaah", targetNamaJamaah);
          formData.append("nikJamaah", targetNikJamaah);
          if (jenis === "kk") {
            formData.append("mode", `kk_target:${targetNamaJamaah}|${targetNikJamaah}`);
          }
        }

        const ocrRes = await fetch("/api/dokumen/ocr", {
          method: "POST",
          body: formData,
        });

        const ocrJson = await ocrRes.json();
        if (!ocrRes.ok) {
          throw new Error(ocrJson.message || "Gagal memproses ekstraksi OCR dokumen");
        }

        ocrResultData = ocrJson.data;
      }

      setOcrResultsData((prev) => {
        const next = { ...prev, [jenis]: ocrResultData };
        applyAllOcrResultsToForm(next);
        return next;
      });

      setOcrStatuses((prev) => ({ ...prev, [jenis]: "success" }));
      const docLabel = OCR_DOC_CONFIG[jenis]?.title || jenis.toUpperCase();
      const conf = ocrResultData?.confidence ? Math.round(ocrResultData.confidence * 100) : 95;
      const sizeKb = Math.round(processedFile.size / 1024);
      showToast(`Ekstraksi ${docLabel} berhasil (${conf}% • ${sizeKb} KB)! Data variabel telah terisi otomatis.`);
    } catch (err: any) {
      console.error(`Error processing OCR for ${jenis}:`, err);
      setOcrStatuses((prev) => ({ ...prev, [jenis]: "error" }));
      setOcrErrors((prev) => ({ ...prev, [jenis]: err.message || "Terjadi kesalahan saat memproses OCR" }));
      showToast(`Gagal memproses OCR: ${err.message || "Terjadi kesalahan"}`);
    }
  };

  const handleRemoveOcrFile = (jenis: OcrDocType) => {
    if (ocrPreviews[jenis]) {
      URL.revokeObjectURL(ocrPreviews[jenis]!);
    }
    setOcrFiles((prev) => ({ ...prev, [jenis]: null }));
    setOcrPreviews((prev) => ({ ...prev, [jenis]: null }));
    setOcrStatuses((prev) => ({ ...prev, [jenis]: "idle" }));
    setOcrResultsData((prev) => {
      const next = { ...prev, [jenis]: null };
      applyAllOcrResultsToForm(next);
      return next;
    });
    setOcrErrors((prev) => ({ ...prev, [jenis]: null }));
    setOcrUploadedDocs((prev) => ({ ...prev, [jenis]: null }));
  };

  const handleSaveLoadedOcrDocsToManifest = async () => {
    if (!selectedJamaahId) {
      showToast("Pilih jamaah terlebih dahulu sebelum menyimpan dokumen.");
      return;
    }
    const unsavedTypes = (["ktp", "akta", "kk"] as OcrDocType[]).filter(
      (j) => ocrFiles[j] && !ocrUploadedDocs[j]
    );

    if (unsavedTypes.length === 0) {
      showToast("Seluruh berkas terunggah sudah tersimpan di profil jamaah.");
      return;
    }

    setIsSavingOcrDocsToManifest(true);
    try {
      for (const jenis of unsavedTypes) {
        const file = ocrFiles[jenis];
        if (!file) continue;

        const formData = new FormData();
        formData.append("file", file);
        formData.append("jamaahId", selectedJamaahId);
        formData.append("jenisDokumen", jenis);

        const uploadRes = await fetch("/api/dokumen/upload", {
          method: "POST",
          body: formData,
        });

        if (uploadRes.ok) {
          const uploadJson = await uploadRes.json();
          const uploadedDoc = uploadJson.data?.dokumen || uploadJson.data;
          const fileUrl = uploadJson.data?.fileUrl || uploadedDoc?.fileUrl;
          setOcrUploadedDocs((prev) => ({ ...prev, [jenis]: uploadedDoc }));

          const existingOcr = ocrResultsData[jenis];
          if (uploadedDoc?.id && existingOcr) {
            await fetch("/api/dokumen/ocr", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                dokumenId: uploadedDoc.id,
                fileUrl,
                jenis,
              }),
            });
          }
        }
      }
      showToast(`Berhasil menyimpan & menautkan ${unsavedTypes.length} dokumen ke profil jamaah!`);
    } catch (err: any) {
      console.error("Gagal menyimpan dokumen ke manifest:", err);
      showToast(`Gagal menyimpan dokumen: ${err.message || "Terjadi kesalahan"}`);
    } finally {
      setIsSavingOcrDocsToManifest(false);
    }
  };

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
    const effectiveNama =
      extractNamaFromAutocratFields(resolvedFieldValues, manualFormData, effectivePlaceholders) ||
      activeJamaah?.namaLengkap ||
      "Jamaah";
    const jamNama = encodeURIComponent(effectiveNama);
    const pkgNama = encodeURIComponent(activeKeberangkatan?.namaPaket || "");
    return `${baseUrl}/track/surat?no=${encodeURIComponent(computedNomorSurat)}&reg=${regId}&nama=${jamNama}&paket=${pkgNama}`;
  }, [computedNomorSurat, activeJamaah, activeKeberangkatan, resolvedFieldValues, manualFormData, effectivePlaceholders]);

  // ────────────────────────────────────────────────────────────
  // ACTIONS: SAVE TO LOG, PRINT, DOWNLOAD, SHARE WHATSAPP
  // ────────────────────────────────────────────────────────────

  const handleSaveToHistory = useCallback(() => {
    if (!activeTemplate) return;

    const effectiveNama =
      extractNamaFromAutocratFields(resolvedFieldValues, manualFormData, effectivePlaceholders) ||
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
      jamaahPaspor:
        activeJamaah?.nomorPaspor ||
        resolvedFieldValues["Nomor Paspor"] ||
        resolvedFieldValues["nomor_paspor"] ||
        resolvedFieldValues["Paspor"] ||
        resolvedFieldValues["paspor"] ||
        "-",
      jamaahNik:
        activeJamaah?.nik ||
        resolvedFieldValues["NIK"] ||
        resolvedFieldValues["nik"] ||
        "-",
      packageId: activeKeberangkatan?.id,
      packageKode: activeKeberangkatan?.kode,
      packageName:
        activeKeberangkatan?.namaPaket ||
        (dataSourceMode === "manual" ? "Manual / Non-Manifest" : "Paket Umroh"),
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
    activeAttachedFile,
    manualFormData,
    effectivePlaceholders,
    dataSourceMode,
  ]);

  // Action: Share WhatsApp
  const handleShareWhatsApp = () => {
    if (!activeTemplate) return;
    handleSaveToHistory();
    const phone = activeJamaah?.nomorTelepon || "";
    const cleanPhone = phone.replace(/[^0-9]/g, "").replace(/^0/, "62");
    const effectiveNama =
      extractNamaFromAutocratFields(resolvedFieldValues, manualFormData, effectivePlaceholders) ||
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

    if (!hasTemplateDocx) {
      setUploadModalTargetTemplate(activeTemplate);
      setIsUploadTemplateModalOpen(true);
      showToast(`Template Word (.docx) untuk "${activeTemplate.nama}" belum diunggah. Silakan unggah template terlebih dahulu.`);
      return;
    }

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
      const countConsumed = (activeTemplate.kebutuhanNomorPerSurat ?? 1) > 1 ? 2 : 1;
      setNomorUrutSurat((prev) => {
        const nextVal = (parseInt(prev, 10) || 1) + countConsumed;
        return String(nextVal).padStart(3, "0");
      });

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

  // Delete History Group / Session
  const handleDeleteGroup = (logs: GeneratedSuratLog[], nomorSurat: string) => {
    const primaryId = logs[0]?.id || "";
    const targetNama = logs[0]?.jamaahNama || "";
    if (!window.confirm(`Hapus riwayat surat ${nomorSurat} (${targetNama})?`)) return;
    const idsToDelete = new Set(logs.map((l) => l.id));
    
    // Update local storage for all items
    logs.forEach((l) => deleteGeneratedSuratLog(l.id));
    setHistoryLogs((prev) => prev.filter((l) => !idsToDelete.has(l.id)));

    // Purge from Supabase specifically by id
    fetch(`/api/surat/generated?id=${primaryId}`, { method: "DELETE" }).catch(() => {});
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
    const attached = tpl?.attachedFiles || [];
    const hasMultiple = attached.length > 1;
    const isTtd = fileIndex === 0 && hasMultiple;
    const targetFormat = attached[fileIndex]?.formatNamaFile || (fileIndex === 0 ? tpl?.formatNamaFile : "");

    const fileName = generateSuratFileName(log.nomorSurat, log.fieldsData || {}, null, {
      formatNamaFile: targetFormat,
      isTtd,
      ext: "pdf",
      placeholders: tpl?.placeholders,
      fallbackNama: log.jamaahNama,
    });

    const binary =
      attached[fileIndex]?.templateFileBase64 ||
      (fileIndex === 0
        ? log.templateFileBase64 || tpl?.templateFileBase64
        : attached[1]?.templateFileBase64 || log.templateFileBase64 || tpl?.templateFileBase64);

    if (binary && log.fieldsData) {
      try {
        const label = isTtd ? "Dengan TTD & Stempel" : "Tanpa TTD (Cap Basah)";
        showToast(`Sedang membuat PDF (${label}) dari template Word asli...`);
        await downloadDocxAsPdf(binary, log.fieldsData, fileName);
        showToast(`PDF (${label}) berhasil diunduh sesuai template Word asli!`);
        return;
      } catch (err) {
        console.error("Gagal render PDF dari template docx:", err);
        showToast("Gagal mengonversi Word ke PDF.");
        return;
      }
    }

    // Sesuai mandat: Surat TIDAK boleh digenerate dari nol tanpa template
    showToast(`Template Word (.docx) belum diunggah untuk surat ini. Silakan unggah template terlebih dahulu.`);
    if (tpl) {
      setUploadModalTargetTemplate(tpl);
      setIsUploadTemplateModalOpen(true);
    }
  };

  // Re-download Word from history log with file variant support (TTD vs non-TTD)
  const handleHistoryRedownloadWord = async (log: GeneratedSuratLog, fileIndex: number = 0) => {
    const tpl = templates.find((t) => t.id === log.templateId || t.slug === log.templateSlug) || activeTemplate;
    const attached = tpl?.attachedFiles || [];
    const hasMultiple = attached.length > 1;
    const isTtd = fileIndex === 0 && hasMultiple;
    const targetFormat = attached[fileIndex]?.formatNamaFile || (fileIndex === 0 ? tpl?.formatNamaFile : "");

    const fileName = generateSuratFileName(log.nomorSurat, log.fieldsData || {}, null, {
      formatNamaFile: targetFormat,
      isTtd,
      ext: "docx",
      placeholders: tpl?.placeholders,
      fallbackNama: log.jamaahNama,
    });

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
        console.error("Gagal download docx merge:", err);
        showToast("Gagal memproses dokumen Word.");
        return;
      }
    }

    // Sesuai mandat: Surat TIDAK boleh digenerate dari nol tanpa template
    showToast(`Template Word (.docx) belum diunggah untuk surat ini. Silakan unggah template terlebih dahulu.`);
    if (tpl) {
      setUploadModalTargetTemplate(tpl);
      setIsUploadTemplateModalOpen(true);
    }
  };

  // Print from history log with 100% original template Word layout & styling
  const handleHistoryPrint = async (log: GeneratedSuratLog, fileIndex: number = 0) => {
    const tpl = templates.find((t) => t.id === log.templateId || t.slug === log.templateSlug) || activeTemplate;
    const attached = tpl?.attachedFiles || [];
    const hasMultiple = attached.length > 1;
    const isTtd = fileIndex === 0 && hasMultiple;
    const targetFormat = attached[fileIndex]?.formatNamaFile || (fileIndex === 0 ? tpl?.formatNamaFile : "");

    const fileName = generateSuratFileName(log.nomorSurat, log.fieldsData || {}, null, {
      formatNamaFile: targetFormat,
      isTtd,
      ext: "pdf",
      placeholders: tpl?.placeholders,
      fallbackNama: log.jamaahNama,
    });

    const binary =
      attached[fileIndex]?.templateFileBase64 ||
      (fileIndex === 0
        ? log.templateFileBase64 || tpl?.templateFileBase64
        : attached[1]?.templateFileBase64 || log.templateFileBase64 || tpl?.templateFileBase64);

    if (binary && log.fieldsData) {
      try {
        const label = isTtd ? "Dengan TTD & Stempel" : "Tanpa TTD (Cap Basah)";
        showToast(`Menyiapkan cetak (${label}) dari template Word asli...`);
        const { printDocxAsPdf } = await import("@/shared/lib/docx-to-pdf");
        await printDocxAsPdf(binary, log.fieldsData, fileName);
        return;
      } catch (err) {
        console.error("Gagal cetak dari template docx:", err);
        showToast("Gagal memproses cetak dokumen template.");
        return;
      }
    }

    showToast("Template Word (.docx) belum diunggah untuk surat ini. Silakan unggah template terlebih dahulu.");
    if (tpl) {
      setUploadModalTargetTemplate(tpl);
      setIsUploadTemplateModalOpen(true);
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

  // Grouped history: each generated surat log represents a distinct generation session
  const groupedHistory = useMemo(() => {
    // Sort by generatedDate descending
    const sorted = [...filteredHistory].sort(
      (a, b) => new Date(b.generatedDate).getTime() - new Date(a.generatedDate).getTime()
    );

    return sorted.map((log) => {
      const dateStr = formatDate(log.generatedDate);
      const jenis = getShortTemplateName(log);
      return {
        id: log.id,
        date: dateStr,
        jenis,
        nomorSurat: log.nomorSurat,
        jamaahNama: log.jamaahNama,
        logs: [log],
      };
    });
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
                const hasDocx = checkTemplateHasDocx(tpl);
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
                    <div className="mt-2 flex items-center justify-between gap-1">
                      <p className="text-[10px] text-muted-foreground line-clamp-1">
                        {tpl.placeholders.length} Tag
                      </p>
                      {hasDocx ? (
                        <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                          DOCX ✓
                        </span>
                      ) : (
                        <span className="text-[9px] font-medium text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">
                          Upload DOCX
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* TWO COLUMN WORKSPACE: CONFIG & MANIFEST AUTO-FILL (LEFT) + A4 PREVIEW (RIGHT) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* ── LEFT COLUMN (5 COLS): CONTROLS & DYNAMIC AUTOCRAT FORM ── */}
            <div className="lg:col-span-5 space-y-4">
              {/* Mode Selector: Referensi Manifest vs Ekstraksi OCR vs Input Manual */}
              <div className="p-3 bg-stone-50 dark:bg-stone-900/60 rounded-xl border border-stone-200 dark:border-stone-800 shadow-2xs space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Sliders className="h-3.5 w-3.5 text-primary" />
                    Sumber Data Surat
                  </label>
                  <span className="text-[10px] text-muted-foreground font-mono">
                    {dataSourceMode === "manifest"
                      ? "Mode: Manifest"
                      : dataSourceMode === "ocr"
                      ? "Mode: Ekstraksi OCR"
                      : "Mode: Manual"}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => handleSwitchMode("manifest")}
                    className={cn(
                      "flex flex-col items-start gap-1 p-2.5 rounded-lg border text-left transition-all",
                      dataSourceMode === "manifest"
                        ? "border-primary bg-primary/5 text-primary ring-1 ring-primary/20 shadow-xs"
                        : "border-stone-200 dark:border-stone-800 hover:border-stone-300 dark:hover:border-stone-700 bg-background text-muted-foreground"
                    )}
                  >
                    <div className="flex items-center gap-1.5 font-bold text-xs">
                      <Database className="h-3.5 w-3.5 shrink-0" />
                      <span>Referensi Manifest</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground leading-tight">
                      Pilih paket & nama jamaah, otomatis mengisi variabel
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSwitchMode("ocr")}
                    className={cn(
                      "flex flex-col items-start gap-1 p-2.5 rounded-lg border text-left transition-all",
                      dataSourceMode === "ocr"
                        ? "border-primary bg-primary/5 text-primary ring-1 ring-primary/20 shadow-xs"
                        : "border-stone-200 dark:border-stone-800 hover:border-stone-300 dark:hover:border-stone-700 bg-background text-muted-foreground"
                    )}
                  >
                    <div className="flex items-center gap-1.5 font-bold text-xs">
                      <Sparkles className="h-3.5 w-3.5 shrink-0 text-amber-500" />
                      <span>Ekstraksi OCR</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground leading-tight">
                      Upload KTP, Akta & KK, auto-fill via AI OCR
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSwitchMode("manual")}
                    className={cn(
                      "flex flex-col items-start gap-1 p-2.5 rounded-lg border text-left transition-all",
                      dataSourceMode === "manual"
                        ? "border-primary bg-primary/5 text-primary ring-1 ring-primary/20 shadow-xs"
                        : "border-stone-200 dark:border-stone-800 hover:border-stone-300 dark:hover:border-stone-700 bg-background text-muted-foreground"
                    )}
                  >
                    <div className="flex items-center gap-1.5 font-bold text-xs">
                      <PenTool className="h-3.5 w-3.5 shrink-0" />
                      <span>Input Manual</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground leading-tight">
                      Langsung nomor surat & isian variabel mandiri
                    </p>
                  </button>
                </div>
              </div>

              {/* Card 1 (Manifest Mode): Data Source Selector (Manifest & Jamaah) */}
              {dataSourceMode === "manifest" && (
                <Card className="border-stone-200 dark:border-stone-800">
                  <CardHeader className="pb-3 border-b border-stone-200 dark:border-stone-800">
                    <CardTitle className="text-xs font-bold flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-foreground">
                        <Plane className="h-4 w-4 text-primary" />
                        1. Pilih Paket & Jamaah dari Manifest
                      </span>
                      <Badge
                        variant={selectedPackageId && selectedJamaahId && activeJamaah ? "success" : "secondary"}
                        size="sm"
                        className="text-[10px]"
                      >
                        {selectedPackageId && selectedJamaahId && activeJamaah ? "Auto-Fill Active" : "Belum Dipilih"}
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
                          {!selectedPackageId
                            ? "Pilih paket terlebih dahulu"
                            : `${availableJamaahList.length} Jamaah Tersedia`}
                        </span>
                      </label>
                      <SearchableSelect
                        value={selectedJamaahId}
                        onChange={(val) => {
                          setSelectedJamaahId(val);
                        }}
                        placeholder={
                          !selectedPackageId
                            ? "Pilih paket keberangkatan terlebih dahulu..."
                            : availableJamaahList.length === 0
                            ? "Belum ada jamaah pada paket ini"
                            : "Cari nama jamaah, NIK, nomor paspor, kota lahir..."
                        }
                        searchPlaceholder="Ketik nama jamaah, paspor, NIK..."
                        options={jamaahOptions}
                        disabled={!selectedPackageId || availableJamaahList.length === 0}
                        size="sm"
                      />
                    </div>

                    {/* Summary of Active Jamaah Manifest Data */}
                    {selectedPackageId && selectedJamaahId && activeJamaah && (
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
              )}

              {/* Card 1 (OCR Mode): 3 Kolom Upload Dokumen (KTP, Akta Kelahiran, KK) */}
              {dataSourceMode === "ocr" && (
                <Card className="border-stone-200 dark:border-stone-800 shadow-sm">
                  <CardHeader className="pb-3 border-b border-stone-200 dark:border-stone-800">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
                      <div>
                        <CardTitle className="text-xs font-bold flex items-center gap-1.5 text-foreground">
                          <Sparkles className="h-4 w-4 text-amber-500" />
                          1. Ekstraksi Dokumen OCR (KTP, Akta Kelahiran, KK)
                        </CardTitle>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          Ekstraksi data otomatis via backend AI OCR sama seperti di laman Dokumen Jamaah.
                        </p>
                      </div>

                      {/* Toggler: Simpan ke Manifest */}
                      <div className="flex items-center gap-2 bg-stone-100 dark:bg-stone-800/80 px-3 py-1.5 rounded-xl border border-stone-200 dark:border-stone-700/80 shrink-0">
                        <span className="text-[11px] font-semibold text-foreground">
                          Simpan ke Manifest?
                        </span>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={saveOcrToManifest}
                          onClick={() => setSaveOcrToManifest((prev) => !prev)}
                          className={cn(
                            "relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors",
                            saveOcrToManifest ? "bg-primary" : "bg-stone-300 dark:bg-stone-600"
                          )}
                          title="Jika aktif, dokumen akan tersimpan ke Google Drive & tertaut ke profil jamaah terpilih"
                        >
                          <span
                            className={cn(
                              "pointer-events-none block h-4 w-4 rounded-full bg-white shadow-xs transition-transform",
                              saveOcrToManifest ? "translate-x-4" : "translate-x-0.5"
                            )}
                          />
                        </button>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="pt-4 space-y-4">
                    {/* Jika Simpan ke Manifest Aktif: Munculkan Pilihan Paket & Jamaah */}
                    {saveOcrToManifest && (
                      <div className="p-3.5 rounded-xl bg-primary/5 border border-primary/25 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-primary flex items-center gap-1.5">
                            <Plane className="h-3.5 w-3.5" />
                            Pilih Paket & Jamaah Pemilik Dokumen
                          </span>
                          <Badge variant="outline" size="sm" className="text-[10px] border-primary/30 text-primary">
                            Penautan Berkas Aktif
                          </Badge>
                        </div>

                        {/* Dropdown Paket */}
                        <div>
                          <label className="text-xs font-semibold text-foreground mb-1 block">
                            Paket Keberangkatan
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

                        {/* Dropdown Jamaah */}
                        <div>
                          <label className="text-xs font-semibold text-foreground mb-1 block">
                            Pilih Jamaah Penerima Surat & Pemilik Dokumen
                          </label>
                          <SearchableSelect
                            value={selectedJamaahId}
                            onChange={(val) => setSelectedJamaahId(val)}
                            placeholder={
                              !selectedPackageId
                                ? "Pilih paket keberangkatan terlebih dahulu..."
                                : availableJamaahList.length === 0
                                ? "Belum ada jamaah pada paket ini"
                                : "Cari nama jamaah, NIK, paspor..."
                            }
                            searchPlaceholder="Ketik nama jamaah, paspor, NIK..."
                            options={jamaahOptions}
                            disabled={!selectedPackageId || availableJamaahList.length === 0}
                            size="sm"
                          />
                        </div>

                        {/* Jamaah Selected Banner & Link Sync Button */}
                        {selectedPackageId && selectedJamaahId && activeJamaah && (
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs">
                            <div className="flex items-center gap-2 font-bold text-emerald-800 dark:text-emerald-300">
                              <User className="h-3.5 w-3.5 shrink-0" />
                              <span className="truncate">{toTitleCase(activeJamaah.namaLengkap)}</span>
                              <span className="text-[10px] font-mono font-normal">({activeJamaah.registrationId || "Terdaftar"})</span>
                            </div>
                            {(["ktp", "akta", "kk"] as OcrDocType[]).some((j) => ocrFiles[j] && !ocrUploadedDocs[j]) ? (
                              <Button
                                type="button"
                                size="sm"
                                className="h-7 text-[11px] px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white shrink-0"
                                onClick={handleSaveLoadedOcrDocsToManifest}
                                disabled={isSavingOcrDocsToManifest}
                              >
                                {isSavingOcrDocsToManifest ? (
                                  <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                                ) : (
                                  <UploadCloud className="mr-1 h-3 w-3" />
                                )}
                                Simpan Berkas ke Profil
                              </Button>
                            ) : (
                              <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-semibold shrink-0">
                                ✓ Siap Tertaut
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* 3 Kolom Upload Dokumen (KTP, Akta Lahir, KK) dengan Paste & Kompresi <= 200 KB */}
                    <div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {(["ktp", "akta", "kk"] as OcrDocType[]).map((jenis) => {
                          const config = OCR_DOC_CONFIG[jenis];
                          const file = ocrFiles[jenis];
                          const preview = ocrPreviews[jenis];
                          const status = ocrStatuses[jenis];
                          const result = ocrResultsData[jenis];
                          const errorMsg = ocrErrors[jenis];
                          const inputRef = docInputRefs[jenis];
                          const isColActive = activeOcrColumn === jenis;

                          return (
                            <div
                              key={jenis}
                              tabIndex={0}
                              onFocus={() => setActiveOcrColumn(jenis)}
                              onClick={() => setActiveOcrColumn(jenis)}
                              onMouseEnter={() => setHoveredOcrColumn(jenis)}
                              onMouseLeave={() => setHoveredOcrColumn(null)}
                              onPaste={(e) => handlePasteFile(e, jenis)}
                              className={cn(
                                "flex flex-col rounded-xl border p-3 space-y-2.5 shadow-2xs relative transition-all outline-none",
                                isColActive
                                  ? "border-primary ring-2 ring-primary/20 bg-background"
                                  : "border-stone-200 dark:border-stone-800 bg-background/80 hover:border-primary/50"
                              )}
                            >
                              {/* Hidden file input */}
                              <input
                                type="file"
                                ref={inputRef as any}
                                accept="image/*,application/pdf"
                                className="hidden"
                                onChange={(e) => {
                                  const f = e.target.files?.[0];
                                  if (f) {
                                    handleOcrProcessFile(f, jenis);
                                  }
                                  e.target.value = "";
                                }}
                              />

                              {/* Column Header */}
                              <div className="flex items-center justify-between gap-1">
                                <div className="flex items-center gap-1.5 font-bold text-xs text-foreground truncate">
                                  <FileText className="h-3.5 w-3.5 text-primary shrink-0" />
                                  <span className="truncate">{config.title}</span>
                                  {isColActive && (
                                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-semibold shrink-0">
                                      Aktif
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setActiveOcrColumn(jenis);
                                      handleReadClipboard(jenis);
                                    }}
                                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-stone-100 hover:bg-primary/10 hover:text-primary dark:bg-stone-800 transition-colors border border-stone-200 dark:border-stone-700 cursor-pointer"
                                    title={`Paste file gambar dari clipboard ke ${config.title} (Ctrl+V)`}
                                  >
                                    <Clipboard className="h-3 w-3" />
                                    <span>Paste</span>
                                  </button>
                                  <Badge variant="outline" size="sm" className="text-[9px] font-mono">
                                    {config.badgeText}
                                  </Badge>
                                </div>
                              </div>

                              {/* Upload Box / Dropzone / Paste Area */}
                              {!file ? (
                                <div
                                  onClick={() => {
                                    setActiveOcrColumn(jenis);
                                    inputRef.current?.click();
                                  }}
                                  onDragOver={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                  }}
                                  onDrop={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    const f = e.dataTransfer.files?.[0];
                                    if (f) handleOcrProcessFile(f, jenis);
                                  }}
                                  className="border-2 border-dashed border-stone-200 dark:border-stone-800 hover:border-primary/60 dark:hover:border-primary/60 rounded-xl p-3 text-center cursor-pointer transition-all hover:bg-primary/5 flex flex-col items-center justify-center gap-1.5 min-h-[135px] group"
                                >
                                  <div className="p-2 rounded-full bg-primary/10 text-primary group-hover:scale-105 transition-transform">
                                    <UploadCloud className="h-5 w-5" />
                                  </div>
                                  <div className="flex flex-col items-center">
                                    <span className="text-xs font-bold text-foreground">
                                      Pilih, Tarik, atau Paste File
                                    </span>
                                    <span className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                                      <kbd className="px-1 py-0.5 rounded bg-muted border text-[9px] font-mono font-bold">Ctrl + V</kbd>
                                      <span>• Maks. 200 KB (Auto)</span>
                                    </span>
                                  </div>
                                  <div className="pt-1 flex items-center gap-1.5">
                                    <Button
                                      type="button"
                                      variant="secondary"
                                      size="sm"
                                      className="h-6 text-[10px] px-2 font-medium"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setActiveOcrColumn(jenis);
                                        handleReadClipboard(jenis);
                                      }}
                                    >
                                      <Clipboard className="h-3 w-3 mr-1" />
                                      Paste Clipboard
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <div className="space-y-2">
                                  {/* Thumbnail Preview */}
                                  <div className="relative rounded-lg overflow-hidden border border-stone-200 dark:border-stone-700 bg-stone-100 dark:bg-stone-900 h-24 flex items-center justify-center group">
                                    {preview && (file.type.startsWith("image/") || file.type === "") ? (
                                      <img
                                        src={preview}
                                        alt={config.title}
                                        className="h-full w-full object-cover"
                                      />
                                    ) : (
                                      <div className="flex flex-col items-center gap-1 text-muted-foreground">
                                        <FileText className="h-7 w-7 text-primary" />
                                        <span className="text-[10px] font-medium">Dokumen PDF Terunggah</span>
                                      </div>
                                    )}

                                    {/* Quick replacement overlay on hover */}
                                    <div className="absolute inset-0 bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 backdrop-blur-2xs">
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          inputRef.current?.click();
                                        }}
                                        className="px-2 py-1 rounded bg-white/20 hover:bg-white/30 text-[10px] font-semibold flex items-center gap-1"
                                      >
                                        <UploadCloud className="h-3 w-3" />
                                        Ganti
                                      </button>
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setActiveOcrColumn(jenis);
                                          handleReadClipboard(jenis);
                                        }}
                                        className="px-2 py-1 rounded bg-primary text-primary-foreground hover:bg-primary/90 text-[10px] font-semibold flex items-center gap-1"
                                      >
                                        <Clipboard className="h-3 w-3" />
                                        Paste
                                      </button>
                                    </div>
                                  </div>

                                  {/* File Name & Size */}
                                  <div className="flex items-center justify-between text-[10px] text-muted-foreground font-medium px-0.5">
                                    <span className="truncate max-w-[130px]" title={file.name}>
                                      {file.name}
                                    </span>
                                    <span className="font-mono text-[9px] text-emerald-600 dark:text-emerald-400 font-bold" title="Ukuran terkompresi otomatis maksimal 200 KB">
                                      {(file.size / 1024).toFixed(0)} KB (≤200KB)
                                    </span>
                                  </div>

                                  {/* Status Banner */}
                                  {status === "uploading" && (
                                    <div className="flex items-center gap-1.5 text-xs text-primary font-medium p-1.5 rounded-lg bg-primary/10">
                                      <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
                                      <span className="text-[11px]">Mengunggah ke drive...</span>
                                    </div>
                                  )}

                                  {status === "extracting" && (
                                    <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 font-medium p-1.5 rounded-lg bg-amber-500/10">
                                      <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
                                      <span className="text-[11px]">AI OCR sedang mengekstrak...</span>
                                    </div>
                                  )}

                                  {status === "success" && (
                                    <div className="flex items-center justify-between text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-lg">
                                      <span className="flex items-center gap-1">
                                        <CheckCircle2 className="h-3.5 w-3.5" />
                                        Ekstraksi Berhasil
                                      </span>
                                      <span className="text-[10px] font-mono">
                                        {result?.confidence ? Math.round(result.confidence * 100) : 95}%
                                      </span>
                                    </div>
                                  )}

                                  {status === "error" && (
                                    <div className="text-[11px] text-destructive bg-destructive/10 p-1.5 rounded-lg flex items-center justify-between gap-1">
                                      <span className="truncate text-[10px]">{errorMsg || "Gagal ekstraksi"}</span>
                                      <button
                                        type="button"
                                        onClick={() => handleOcrProcessFile(file, jenis, true)}
                                        className="text-[10px] font-bold underline shrink-0 hover:opacity-80"
                                      >
                                        Ulangi
                                      </button>
                                    </div>
                                  )}

                                  {/* Extracted Fields Summary Box */}
                                  {result && (
                                    <div className="p-2 rounded-lg bg-stone-50 dark:bg-stone-900/60 border border-stone-200/60 dark:border-stone-800 text-[10px] space-y-1">
                                      {jenis === "ktp" && (
                                        <>
                                          <div className="flex justify-between gap-1">
                                            <span className="text-muted-foreground shrink-0">NIK:</span>
                                            <span className="font-mono font-bold truncate">{result.nik || "-"}</span>
                                          </div>
                                          <div className="flex justify-between gap-1">
                                            <span className="text-muted-foreground shrink-0">Nama:</span>
                                            <span className="font-semibold truncate">{result.namaLengkap || "-"}</span>
                                          </div>
                                          <div className="flex justify-between gap-1">
                                            <span className="text-muted-foreground shrink-0">Lahir:</span>
                                            <span className="truncate">
                                              {result.tempatLahir || "-"}, {result.tanggalLahir ? (formatIsoToIndonesianDate(parseDateToIsoString(result.tanggalLahir)) || result.tanggalLahir) : "-"}
                                            </span>
                                          </div>
                                        </>
                                      )}
                                      {jenis === "akta" && (
                                        <>
                                          <div className="flex justify-between gap-1">
                                            <span className="text-muted-foreground shrink-0">Nama:</span>
                                            <span className="font-semibold truncate">{result.namaLengkap || "-"}</span>
                                          </div>
                                          <div className="flex justify-between gap-1">
                                            <span className="text-muted-foreground shrink-0">Ayah:</span>
                                            <span className="font-bold truncate text-primary">{result.namaAyah || "-"}</span>
                                          </div>
                                          <div className="flex justify-between gap-1">
                                            <span className="text-muted-foreground shrink-0">Lahir:</span>
                                            <span className="truncate">
                                              {result.tempatLahir || "-"}, {result.tanggalLahir ? (formatIsoToIndonesianDate(parseDateToIsoString(result.tanggalLahir)) || result.tanggalLahir) : "-"}
                                            </span>
                                          </div>
                                        </>
                                      )}
                                      {jenis === "kk" && (() => {
                                        const targetNama =
                                          ocrResultsData.ktp?.namaLengkap ||
                                          ocrResultsData.ktp?.nama ||
                                          manualFormData["nama"] ||
                                          manualFormData["nama_lengkap"];
                                        const targetNik =
                                          ocrResultsData.ktp?.nik ||
                                          manualFormData["nik"] ||
                                          manualFormData["no_identitas"];
                                        const matched = findTargetInKk(result, targetNama, targetNik);
                                        const ayahDisplay =
                                          matched?.namaAyah ||
                                          result.namaAyah ||
                                          result.namaKepalaKeluarga ||
                                          "-";
                                        const nikDisplay = matched?.nik || result.nik || "-";
                                        const rowInfo = matched?.no ? ` (Deret #${matched.no})` : "";

                                        return (
                                          <>
                                            <div className="flex justify-between gap-1">
                                              <span className="text-muted-foreground shrink-0">No. KK:</span>
                                              <span className="font-mono font-bold truncate">{result.nomorKk || result.noKk || "-"}</span>
                                            </div>
                                            <div className="flex justify-between gap-1">
                                              <span className="text-muted-foreground shrink-0">Ayah Jamaah:</span>
                                              <span className="font-semibold text-emerald-700 dark:text-emerald-400 truncate" title={`${ayahDisplay}${rowInfo}`}>
                                                {ayahDisplay}{rowInfo}
                                              </span>
                                            </div>
                                            <div className="flex justify-between gap-1">
                                              <span className="text-muted-foreground shrink-0">NIK Jamaah:</span>
                                              <span className="font-mono truncate">{nikDisplay}</span>
                                            </div>
                                          </>
                                        );
                                      })()}
                                    </div>
                                  )}

                                  {/* Action Buttons */}
                                  <div className="flex items-center gap-1.5 pt-1">
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      className="flex-1 h-7 text-[10px] px-2"
                                      onClick={() => handleOcrProcessFile(file, jenis, true)}
                                      title="Ekstrak ulang dokumen ini via AI OCR"
                                    >
                                      <RefreshCw className="mr-1 h-3 w-3" />
                                      Ekstrak Ulang
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      className="h-7 text-[10px] px-2 text-destructive hover:bg-destructive/10 border-stone-200 dark:border-stone-800"
                                      onClick={() => handleRemoveOcrFile(jenis)}
                                      title="Hapus dokumen"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* Bottom Help / Re-Apply Banner */}
                      <div className="mt-3 p-2.5 rounded-xl bg-stone-100/80 dark:bg-stone-800/50 border border-stone-200/80 dark:border-stone-700/60 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs">
                        <div className="flex items-center gap-2 text-muted-foreground text-[11px]">
                          <Sparkles className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                          <span>
                            {(["ktp", "akta", "kk"] as OcrDocType[]).filter((j) => ocrResultsData[j]).length > 0
                              ? `${(["ktp", "akta", "kk"] as OcrDocType[]).filter((j) => ocrResultsData[j]).length} dokumen berhasil diekstrak via AI OCR. Kolom isian variabel di bawah telah terisi otomatis.`
                              : "Unggah minimal salah satu dari KTP, Akta Kelahiran, atau KK untuk mengisi variabel surat secara otomatis."}
                          </span>
                        </div>
                        {(["ktp", "akta", "kk"] as OcrDocType[]).some((j) => ocrResultsData[j]) && (
                          <button
                            type="button"
                            onClick={() => applyAllOcrResultsToForm(ocrResultsData)}
                            className="text-[11px] font-semibold text-primary hover:underline flex items-center gap-1 shrink-0"
                          >
                            <RefreshCw className="h-3 w-3" />
                            Terapkan Ulang Hasil OCR
                          </button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Card 2: Header & Nomor Surat Configuration */}
              <Card className="border-stone-200 dark:border-stone-800">
                <CardHeader className="pb-3 border-b border-stone-200 dark:border-stone-800">
                  <CardTitle className="text-xs font-bold flex items-center gap-1.5">
                    <FileSignature className="h-4 w-4 text-primary" />
                    {dataSourceMode === "manual" ? "1. Nomor Surat" : "2. Nomor Surat"}
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
                      {dataSourceMode === "manual"
                        ? "2. Kolom Isian Data Surat (Autocrat Tags)"
                        : "3. Kolom Isian Data Surat (Autocrat Tags)"}
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

                      const isDateRangeField =
                        p.inputType === "date_range" ||
                        cleanKey.includes("rentangtanggal") ||
                        cleanKey.includes("periodetanggal") ||
                        cleanLabel.includes("rentang tanggal") ||
                        cleanLabel.includes("periode tanggal");

                      const isBulanField =
                        !isDateRangeField &&
                        (cleanKey.includes("bulankeberangkatan") ||
                        cleanKey.includes("bulanberangkat") ||
                        cleanKey.includes("bulanpaket") ||
                        cleanLabel.includes("bulan keberangkatan") ||
                        p.manifestField === "keberangkatan.bulanKeberangkatan");

                      const isDateField =
                        !isBulanField &&
                        !isDateRangeField &&
                        (p.inputType === "date" ||
                          p.manifestField === "jamaah.tanggalLahir" ||
                          p.manifestField === "keberangkatan.tanggalBerangkat" ||
                          p.manifestField === "keberangkatan.tanggalPulang" ||
                          cleanKey.includes("tanggallahir") ||
                          cleanKey.includes("tgl_lahir") ||
                          cleanKey.includes("tgllahir") ||
                          cleanKey.includes("tanggalberangkat") ||
                          cleanKey.includes("tanggalpulang") ||
                          cleanKey.includes("tanggalkembali") ||
                          cleanLabel.includes("tanggal lahir") ||
                          cleanLabel.includes("tgl lahir") ||
                          cleanLabel.includes("tanggal berangkat") ||
                          cleanLabel.includes("tanggal pulang") ||
                          (cleanKey.includes("tanggal") && !cleanKey.includes("surat")));

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
                      const cleanDisplayLabel = (p.label || p.key).replace(/[{}]/g, "").trim();

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
                            <label className="text-xs font-semibold text-foreground">
                              <span>{cleanDisplayLabel}</span>
                            </label>

                            {isEndorsementActive && isNamaJamaahField ? (
                              <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-300 bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded flex items-center gap-1 shadow-2xs">
                                <Sparkles className="h-3 w-3 text-amber-500" />
                                + Nama Ayah (Endorsement)
                              </span>
                            ) : ocrFilledFieldKeys.has(p.key) || (dataSourceMode === "ocr" && manualVal !== undefined && manualVal !== "") ? (
                              <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded flex items-center gap-1 shadow-2xs">
                                <Sparkles className="h-3 w-3 text-emerald-500" />
                                Auto OCR
                              </span>
                            ) : manualVal !== undefined && manualVal !== resolvedVal ? (
                              <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded flex items-center gap-1">
                                Diedit Manual
                              </span>
                            ) : dataSourceMode === "manual" ? (
                              <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded flex items-center gap-1">
                                {isDateRangeField ? (
                                  <CalendarDays className="h-2.5 w-2.5 text-blue-600 dark:text-blue-400" />
                                ) : isDateField || isBulanField ? (
                                  <Calendar className="h-2.5 w-2.5" />
                                ) : null}
                                {isDateRangeField
                                  ? "Rentang Tanggal"
                                  : isDateField
                                  ? "Pilih Tanggal"
                                  : isBulanField
                                  ? "Pilih Bulan"
                                  : "Input Manual"}
                              </span>
                            ) : isManifest && dataSourceMode === "manifest" ? (
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
                              placeholder={p.placeholderHint || `Masukkan ${cleanDisplayLabel}...`}
                            />
                          ) : p.inputType === "select" && validOptions.length > 0 ? (
                            isSearchableSelect ? (
                              <SearchableSelect
                                value={displayValue}
                                onChange={(val) =>
                                  setManualFormData((prev) => ({ ...prev, [p.key]: val }))
                                }
                                options={validOptions.map((opt: string) => ({ value: opt, label: opt }))}
                                placeholder={p.placeholderHint || `Pilih atau cari ${cleanDisplayLabel}...`}
                                searchPlaceholder={`Cari opsi ${cleanDisplayLabel}...`}
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
                          ) : isDateRangeField ? (
                            <div className="space-y-1.5 p-2.5 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
                              <div className="relative">
                                <Input
                                  type="text"
                                  value={displayValue}
                                  onChange={(e) =>
                                    setManualFormData((prev) => ({ ...prev, [p.key]: e.target.value }))
                                  }
                                  placeholder={p.placeholderHint || "Contoh: 10 s/d 25 Oktober 2026"}
                                  className="text-xs h-9 bg-background text-foreground pr-8 font-medium shadow-xs"
                                />
                                <CalendarDays className="h-4 w-4 text-emerald-600 dark:text-emerald-400 absolute right-2.5 top-2.5 pointer-events-none" />
                              </div>

                              {(() => {
                                const [startIso, endIso] = parseDateRangeToIsoStrings(displayValue);
                                return (
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-0.5">
                                    <div className="space-y-1">
                                      <label className="text-[10px] font-bold text-muted-foreground flex items-center gap-1">
                                        <Calendar className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                                        Tanggal Mulai:
                                      </label>
                                      <input
                                        type="date"
                                        value={startIso}
                                        onChange={(e) => {
                                          const newStart = e.target.value;
                                          const newFormatted = formatIsoToIndonesianDateRange(newStart, endIso);
                                          setManualFormData((prev) => ({ ...prev, [p.key]: newFormatted }));
                                        }}
                                        className="h-8 w-full text-xs px-2.5 rounded-md border border-input bg-background text-foreground cursor-pointer focus:ring-1 focus:ring-emerald-500"
                                      />
                                    </div>
                                    <div className="space-y-1">
                                      <label className="text-[10px] font-bold text-muted-foreground flex items-center gap-1">
                                        <Calendar className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                                        Tanggal Selesai:
                                      </label>
                                      <input
                                        type="date"
                                        value={endIso}
                                        onChange={(e) => {
                                          const newEnd = e.target.value;
                                          const newFormatted = formatIsoToIndonesianDateRange(startIso, newEnd);
                                          setManualFormData((prev) => ({ ...prev, [p.key]: newFormatted }));
                                        }}
                                        className="h-8 w-full text-xs px-2.5 rounded-md border border-input bg-background text-foreground cursor-pointer focus:ring-1 focus:ring-emerald-500"
                                      />
                                    </div>
                                  </div>
                                );
                              })()}

                              {displayValue && (
                                <p className="text-[10px] text-muted-foreground">
                                  Format surat: <strong className="text-foreground">{displayValue}</strong>
                                </p>
                              )}
                            </div>
                          ) : isDateField ? (
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <div className="relative flex-1">
                                  <Input
                                    type="text"
                                    value={displayValue}
                                    onChange={(e) =>
                                      setManualFormData((prev) => ({ ...prev, [p.key]: e.target.value }))
                                    }
                                    placeholder={p.placeholderHint || "Contoh: 10 Juni 1990"}
                                    className="text-xs h-9 bg-background text-foreground pr-8 font-medium"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const el = dateInputsRef.current[p.key];
                                      if (el) {
                                        try {
                                          el.showPicker();
                                        } catch {
                                          el.focus();
                                        }
                                      }
                                    }}
                                    className="h-4 w-4 text-muted-foreground hover:text-primary transition-colors absolute right-2.5 top-2.5 cursor-pointer flex items-center justify-center"
                                    title="Klik untuk memilih tanggal dari kalender"
                                  >
                                    <Calendar className="h-4 w-4" />
                                  </button>
                                </div>
                                <div className="relative shrink-0">
                                  <input
                                    ref={(el) => {
                                      dateInputsRef.current[p.key] = el;
                                    }}
                                    type="date"
                                    value={parseDateToIsoString(displayValue)}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      if (val) {
                                        const formatted = formatIsoToIndonesianDate(val);
                                        setManualFormData((prev) => ({ ...prev, [p.key]: formatted }));
                                      }
                                    }}
                                    className="absolute inset-0 w-full h-full opacity-0 pointer-events-none"
                                    tabIndex={-1}
                                    aria-hidden="true"
                                  />
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      const el = dateInputsRef.current[p.key];
                                      if (el) {
                                        try {
                                          el.showPicker();
                                        } catch {
                                          el.focus();
                                        }
                                      }
                                    }}
                                    className="h-9 px-2.5 flex items-center gap-1.5 text-xs text-primary border-primary/30 hover:bg-primary/5 cursor-pointer shadow-2xs active:scale-95 transition-all"
                                    title="Klik untuk memilih tanggal dari kalender"
                                  >
                                    <Calendar className="h-3.5 w-3.5 text-primary" />
                                    <span>Pilih Tanggal</span>
                                  </Button>
                                </div>
                              </div>
                              {displayValue && (
                                <p className="text-[10px] text-muted-foreground">
                                  Format surat: <strong className="text-foreground">{displayValue}</strong>
                                </p>
                              )}
                            </div>
                          ) : isBulanField ? (
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <div className="relative flex-1">
                                  <Input
                                    type="text"
                                    value={displayValue}
                                    onChange={(e) =>
                                      setManualFormData((prev) => ({ ...prev, [p.key]: e.target.value }))
                                    }
                                    placeholder={p.placeholderHint || "Contoh: September 2026"}
                                    className="text-xs h-9 bg-background text-foreground pr-8 font-medium"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const el = monthInputsRef.current[p.key];
                                      if (el) {
                                        try {
                                          el.showPicker();
                                        } catch {
                                          el.focus();
                                        }
                                      }
                                    }}
                                    className="h-4 w-4 text-muted-foreground hover:text-primary transition-colors absolute right-2.5 top-2.5 cursor-pointer flex items-center justify-center"
                                    title="Klik untuk memilih bulan & tahun"
                                  >
                                    <Calendar className="h-4 w-4" />
                                  </button>
                                </div>
                                <div className="relative shrink-0">
                                  <input
                                    ref={(el) => {
                                      monthInputsRef.current[p.key] = el;
                                    }}
                                    type="month"
                                    value={parseMonthYearToIsoString(displayValue)}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      if (val) {
                                        const formatted = formatIsoToIndonesianMonthYear(val);
                                        setManualFormData((prev) => ({ ...prev, [p.key]: formatted }));
                                      }
                                    }}
                                    className="absolute inset-0 w-full h-full opacity-0 pointer-events-none"
                                    tabIndex={-1}
                                    aria-hidden="true"
                                  />
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      const el = monthInputsRef.current[p.key];
                                      if (el) {
                                        try {
                                          el.showPicker();
                                        } catch {
                                          el.focus();
                                        }
                                      }
                                    }}
                                    className="h-9 px-2.5 flex items-center gap-1.5 text-xs text-primary border-primary/30 hover:bg-primary/5 cursor-pointer shadow-2xs active:scale-95 transition-all"
                                    title="Klik untuk memilih bulan & tahun"
                                  >
                                    <Calendar className="h-3.5 w-3.5 text-primary" />
                                    <span>Pilih Bulan</span>
                                  </Button>
                                </div>
                              </div>
                              {displayValue && (
                                <p className="text-[10px] text-muted-foreground">
                                  Format surat: <strong className="text-foreground">{displayValue}</strong>
                                </p>
                              )}
                            </div>
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
                                  : `Masukkan ${cleanDisplayLabel}...`)
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

              {/* ── PERINGATAN BILA TEMPLATE DOCX BELUM DIUNGGAH ── */}
              {!hasTemplateDocx && (
                <div className="p-4 rounded-xl border border-amber-300 dark:border-amber-700/60 bg-amber-50/80 dark:bg-amber-950/30 text-xs space-y-2.5">
                  <div className="flex items-center gap-2 font-bold text-amber-900 dark:text-amber-200">
                    <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                    <span>Template Word (.docx) Wajib Diunggah</span>
                  </div>
                  <p className="text-amber-800 dark:text-amber-300 text-[11px] leading-relaxed">
                    Surat <strong>{activeTemplate.nama}</strong> belum memiliki template Word. Sesuai standar operasional, surat resmi wajib memakai template input asli (tidak dibuat dari nol) agar hasil Word dan PDF 100% presisi.
                  </p>
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <Button
                      type="button"
                      size="sm"
                      className="text-xs bg-amber-600 hover:bg-amber-700 text-white font-semibold cursor-pointer shadow-xs"
                      onClick={() => {
                        setUploadModalTargetTemplate(activeTemplate);
                        setIsUploadTemplateModalOpen(true);
                      }}
                    >
                      <UploadCloud className="mr-1.5 h-3.5 w-3.5" />
                      Unggah Template Word (.docx)
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="text-xs border-amber-300 hover:bg-amber-100 text-amber-900 dark:text-amber-200"
                      onClick={() => router.push(`/admin/master/surat?id=${activeTemplate.id}`)}
                    >
                      <Sliders className="mr-1.5 h-3.5 w-3.5 text-amber-600" />
                      Buka Master Template Surat
                    </Button>
                  </div>
                </div>
              )}

              {/* ── TOMBOL BUAT SURAT SETELAH BOX KE 3 ── */}
              <div className="pt-2">
                <Button
                  type="button"
                  size="lg"
                  className={cn(
                    "w-full h-14 text-white font-extrabold text-base rounded-xl shadow-md transition-all flex items-center justify-center gap-2.5 cursor-pointer group",
                    hasTemplateDocx
                      ? "bg-emerald-700 hover:bg-emerald-800 hover:shadow-lg"
                      : "bg-amber-600 hover:bg-amber-700"
                  )}
                  onClick={handleGenerateSurat}
                  disabled={isGenerating}
                >
                  {hasTemplateDocx ? (
                    <>
                      <Sparkles className="h-5 w-5 text-amber-300 group-hover:rotate-12 transition-transform" />
                      <span>{isGenerating ? "Sedang Membuat Surat..." : "Buat Surat & Buka Riwayat"}</span>
                      <ArrowRight className="h-5 w-5 group-hover:translate-x-1.5 transition-transform" />
                    </>
                  ) : (
                    <>
                      <UploadCloud className="h-5 w-5 text-white animate-bounce" />
                      <span>Unggah Template Word Dulu</span>
                    </>
                  )}
                </Button>
                <p className="text-center text-[11px] text-muted-foreground mt-2 font-medium">
                  {hasTemplateDocx
                    ? "Surat akan dicatat ke Riwayat dan Anda langsung diarahkan ke laman unduh dokumen (Word, PDF, Cetak)."
                    : "Template Word (.docx) diperlukan sebelum surat dapat dibuat & dikonversi ke PDF."}
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
                    groupedHistory.map((group) => (
                      <tr key={group.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors align-top">
                        {/* ── TANGGAL ── */}
                        <td className="py-4 px-5 align-top">
                          <span className="text-sm text-slate-600 dark:text-slate-300 font-medium whitespace-nowrap">
                            {group.date}
                          </span>
                        </td>

                        {/* ── JENIS & NOMOR SURAT ── */}
                        <td className="py-4 px-5 align-top">
                          <div className="flex flex-col gap-3">
                            {/* Template Name, Nomor & Nama Jamaah */}
                            <div className="flex items-start gap-3">
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-tight">
                                    {group.jenis}
                                  </p>
                                  {group.jamaahNama && (
                                    <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                                      👤 {group.jamaahNama}
                                    </span>
                                  )}
                                </div>
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

      {/* ── MODAL UPLOAD TEMPLATE SURAT WORD (.DOCX) ── */}
      {isUploadTemplateModalOpen && (
        <Modal
          open={isUploadTemplateModalOpen}
          onClose={() => {
            if (!isUploadingTemplate) {
              setIsUploadTemplateModalOpen(false);
              setUploadModalTargetTemplate(null);
            }
          }}
          title={`Unggah Template Word: ${uploadModalTargetTemplate?.nama || activeTemplate?.nama}`}
          size="default"
        >
          <div className="space-y-4">
            <div className="p-3.5 rounded-xl bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/40 text-xs text-blue-900 dark:text-blue-300 leading-relaxed">
              <p className="font-bold flex items-center gap-1.5 mb-1 text-blue-950 dark:text-blue-200">
                <Info className="h-4 w-4 text-blue-600 shrink-0" />
                Template Word (.docx) Sebagai Sumber Kebenaran Dokumen
              </p>
              Surat resmi PT. VTU Abadi wajib menggunakan file template Word (.docx) yang di-input (tidak dibuat dari nol). Dokumen Word dan PDF akan langsung digenerate dari file template ini dengan 100% presisi.
            </div>

            <div
              className={cn(
                "border-2 border-dashed rounded-2xl p-6 text-center transition-all cursor-pointer",
                isUploadingTemplate
                  ? "border-primary bg-primary/5 opacity-70 pointer-events-none"
                  : "border-stone-300 dark:border-stone-700 hover:border-primary hover:bg-primary/5 bg-card/60"
              )}
              onClick={() => {
                const el = document.getElementById("docx-template-file-input");
                el?.click();
              }}
            >
              <input
                id="docx-template-file-input"
                type="file"
                accept=".docx"
                className="hidden"
                disabled={isUploadingTemplate}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleUploadTemplateForTarget(f);
                }}
              />
              <div className="flex flex-col items-center justify-center gap-2">
                <div className="p-3 rounded-full bg-primary/10 text-primary">
                  <UploadCloud className="h-8 w-8 animate-bounce" />
                </div>
                <p className="text-sm font-bold text-foreground">
                  {isUploadingTemplate
                    ? "Sedang Membaca & Menyimpan Template..."
                    : "Klik atau Seret File Template Word (.docx) ke Sini"}
                </p>
                <p className="text-xs text-muted-foreground">
                  Hanya format <strong>.docx</strong> (Microsoft Word)
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between border-t pt-3">
              <Button
                variant="ghost"
                size="sm"
                className="text-xs"
                disabled={isUploadingTemplate}
                onClick={() => {
                  setIsUploadTemplateModalOpen(false);
                  setUploadModalTargetTemplate(null);
                }}
              >
                Batal
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={() => {
                  const targetId = uploadModalTargetTemplate?.id || activeTemplate?.id;
                  setIsUploadTemplateModalOpen(false);
                  router.push(`/admin/master/surat?id=${targetId}`);
                }}
              >
                <Sliders className="mr-1.5 h-3.5 w-3.5 text-primary" />
                Buka Konfigurasi Lengkap di Master Surat
              </Button>
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
