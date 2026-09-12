"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  FileText,
  Plus,
  Search,
  Sparkles,
  UploadCloud,
  FileSignature,
  Building2,
  GraduationCap,
  ScrollText,
  Award,
  ShieldCheck,
  Edit3,
  Trash2,
  Copy,
  Eye,
  CheckCircle2,
  QrCode,
  Tag,
  Save,
  RotateCcw,
  Sliders,
  ExternalLink,
  Layers,
  FileCode,
  ArrowLeft,
  ListFilter,
} from "lucide-react";
import { Card, CardContent } from "@/shared/components/ui/Card";
import { Button } from "@/shared/components/ui/Button";
import { Input } from "@/shared/components/ui/Input";
import { Select } from "@/shared/components/ui/Select";
import { Badge } from "@/shared/components/ui/Badge";
import { Modal } from "@/shared/components/ui/Modal";
import { cn } from "@/shared/lib/utils";
import {
  DEFAULT_SURAT_TEMPLATES,
  MANIFEST_FIELD_OPTIONS,
  extractPlaceholdersFromText,
  extractPlaceholdersFromDocxFile,
  isSystemAutoPlaceholder,
  loadSavedSuratTemplates,
  saveSuratTemplates,
  resolveAutocratFieldValues,
  renderAutocratMergedText,
  getTodayDateInfo,
} from "@/shared/lib/surat-autocrat-engine";
import type {
  SuratTemplate,
  SuratKategori,
  SuratPlaceholderMapping,
  SuratInputType,
  SuratAttachedFile,
} from "@/shared/types/surat";
import { KOP_SURAT_BASE64 } from "@/server/assets/kop-surat";

export default function MasterSuratPage() {
  const router = useRouter();

  // State
  const [templates, setTemplates] = useState<SuratTemplate[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  // Editor Full-Page View State
  const [editingTemplate, setEditingTemplate] = useState<SuratTemplate | null>(null);
  const [editorActiveTab, setEditorActiveTab] = useState<"konfigurasi" | "editor" | "preview">("konfigurasi");
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [showFormatHelper, setShowFormatHelper] = useState(false);

  // Upload Wizard Modal State
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadDragOver, setUploadDragOver] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState("");
  const [uploadedFileContent, setUploadedFileContent] = useState("");
  const [uploadTemplateName, setUploadTemplateName] = useState("");
  const [uploadCategory, setUploadCategory] = useState<SuratKategori>("custom");
  const [uploadKodeNomor, setUploadKodeNomor] = useState("SK-CUSTOM");
  const [uploadPerihal, setUploadPerihal] = useState("");

  // Toast / Notification State
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Load templates on mount
  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch("/api/master/surat-templates");
        if (res.ok) {
          const json = await res.json();
          if (json.data && Array.isArray(json.data) && json.data.length > 0) {
            setTemplates(json.data);
            saveSuratTemplates(json.data);
          } else {
            const local = loadSavedSuratTemplates();
            setTemplates(local);
          }
        } else {
          const local = loadSavedSuratTemplates();
          setTemplates(local);
        }
      } catch {
        const local = loadSavedSuratTemplates();
        setTemplates(local);
      }
    }
    loadData();
  }, []);

  // Filtered Templates
  const filteredTemplates = useMemo(() => {
    return templates.filter((tpl) => {
      const matchSearch =
        tpl.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tpl.deskripsi.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tpl.kodeNomorDefault.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tpl.perihalDefault.toLowerCase().includes(searchQuery.toLowerCase());
      const matchCategory = selectedCategory === "all" || tpl.kategori === selectedCategory;
      return matchSearch && matchCategory;
    });
  }, [templates, searchQuery, selectedCategory]);

  // Categories count
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: templates.length };
    templates.forEach((t) => {
      counts[t.kategori] = (counts[t.kategori] || 0) + 1;
    });
    return counts;
  }, [templates]);

  // Handle create new template
  const handleCreateNew = () => {
    const newId = `tpl-custom-${Date.now()}`;
    const newTpl: SuratTemplate = {
      id: newId,
      slug: `custom-surat-${Date.now().toString(36)}`,
      nama: "Surat Tugas",
      kategori: "internal",
      deskripsi: "Template surat operasional kustom PT. Vauza Trikarsa Utama",
      kodeNomorDefault: "ST",
      formatNomor: "[NOMOR]/ST/[BULAN]/[TAHUN]",
      jumlahTemplateTerlampir: 1,
      kebutuhanNomorPerSurat: 1,
      formatNamaFile: "SK_{{Nama Pegawai}}",
      fileNameUploaded: "",
      attachedFiles: [
        {
          index: 1,
          fileName: "",
          formatNamaFile: "SK_{{Nama Pegawai}}",
        },
      ],
      perihalDefault: "Surat Tugas Pelaksanaan Kegiatan Operasional",
      kopSuratType: "ppiu_vtu",
      lampiranDefault: "-",
      tujuanDefault: "Kepada Pihak yang Berkepentingan",
      kotaTujuanDefault: "Di Tempat",
      penandatangan: {
        nama: "H. Fauzan Adzim, S.E.",
        jabatan: "Direktur Utama PT. Vauza Trikarsa Utama",
        showStempel: true,
        showBarcode: true,
      },
      templateContent: `Yang bertanda tangan di bawah ini menerangkan bahwa:

Nama Pegawai        : {Nama Pegawai}
Nomor Induk Pegawai : {NIP}
Jabatan Pegawai     : {Jabatan Pegawai}
Instansi / Cabang   : {Kantor Cabang}
Kota Penugasan      : {Kota Tujuan}
Tanggal Tugas       : {Tanggal Penugasan}

Untuk melaksanakan tugas operasional pendampingan dan pelayanan jamaah PT. Vauza Trikarsa Utama.

Demikian Surat Tugas ini dibuat dengan sebenarnya agar dapat dipergunakan sebagaimana mestinya.`,
      placeholders: [
        { key: "Nama Pegawai", label: "Nama Pegawai", sourceType: "manual", inputType: "text", defaultValue: "", required: true },
        { key: "NIP", label: "Nomor Induk Pegawai (NIP)", sourceType: "manual", inputType: "text", defaultValue: "", required: false },
        { key: "Jabatan Pegawai", label: "Jabatan Pegawai", sourceType: "manual", inputType: "text", defaultValue: "Staf Operasional Lapangan", required: true },
        { key: "Kantor Cabang", label: "Kantor Cabang", sourceType: "manual", inputType: "city", defaultValue: "Surabaya", required: true },
        { key: "Kota Tujuan", label: "Kota Penugasan", sourceType: "manual", inputType: "city", defaultValue: "Sidoarjo", required: true },
        { key: "Tanggal Penugasan", label: "Tanggal Tugas", sourceType: "manual", inputType: "date", defaultValue: "", required: true },
      ],
      isDefault: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setEditingTemplate(newTpl);
    setEditorActiveTab("konfigurasi");
    setShowFormatHelper(false);
  };

  // Handle edit existing template
  const handleEditTemplate = (tpl: SuratTemplate) => {
    const cloned: SuratTemplate = JSON.parse(JSON.stringify(tpl));
    if (!cloned.formatNomor) {
      cloned.formatNomor = `[NOMOR]/${cloned.kodeNomorDefault}/[BULAN]/[TAHUN]`;
    }
    if (cloned.jumlahTemplateTerlampir === undefined) cloned.jumlahTemplateTerlampir = 1;
    if (cloned.kebutuhanNomorPerSurat === undefined) cloned.kebutuhanNomorPerSurat = 1;
    if (!cloned.formatNamaFile) {
      const firstKey = cloned.placeholders?.[0]?.key || "Nama Pegawai";
      cloned.formatNamaFile = `SK_{{${firstKey}}}`;
    }

    // Initialize attachedFiles array matching jumlahTemplateTerlampir
    const count = Math.max(1, cloned.jumlahTemplateTerlampir || 1);
    if (!cloned.attachedFiles || cloned.attachedFiles.length === 0) {
      cloned.attachedFiles = Array.from({ length: count }, (_, i) => ({
        index: i + 1,
        fileName: i === 0 ? cloned.fileNameUploaded || "" : "",
        formatNamaFile: i === 0 ? cloned.formatNamaFile || "" : `${cloned.formatNamaFile || "Dokumen"}_Lampiran_${i + 1}`,
      }));
    } else if (cloned.attachedFiles.length < count) {
      const current = [...cloned.attachedFiles];
      while (current.length < count) {
        const nextIdx = current.length + 1;
        current.push({
          index: nextIdx,
          fileName: "",
          formatNamaFile: `${cloned.formatNamaFile || "Dokumen"}_Lampiran_${nextIdx}`,
        });
      }
      cloned.attachedFiles = current;
    }

    setEditingTemplate(cloned);
    setEditorActiveTab("konfigurasi");
    setShowFormatHelper(false);
  };

  // Handle Remove Column in Konfigurasi Isian Data
  const handleRemoveColumn = (idx: number) => {
    if (!editingTemplate) return;
    const removed = editingTemplate.placeholders[idx];
    const filtered = editingTemplate.placeholders.filter((_, i) => i !== idx);
    setEditingTemplate({
      ...editingTemplate,
      placeholders: filtered,
    });
    if (removed) {
      showToast(`Kolom "${removed.label || removed.key}" dihapus`);
    }
  };

  // Handle File Upload directly in the Modal Card per Document Index
  const handleModalFileUpload = async (file: File, docIdx: number = 0) => {
    if (!editingTemplate) return;
    const fileName = file.name;
    const isDocx = fileName.endsWith(".docx") || fileName.endsWith(".doc");

    let content = "";
    let detectedTags: string[] = [];

    try {
      if (isDocx) {
        const res = await extractPlaceholdersFromDocxFile(file);
        detectedTags = res.tags;
        content = res.extractedText;
      } else {
        content = await file.text();
        detectedTags = extractPlaceholdersFromText(content);
      }
    } catch (err) {
      console.error("Error reading template file:", err);
      showToast("Gagal membaca berkas template");
      return;
    }

    setEditingTemplate((prev) => {
      if (!prev) return null;
      const count = Math.max(1, prev.jumlahTemplateTerlampir || 1);
      const currentAttached: SuratAttachedFile[] =
        prev.attachedFiles && prev.attachedFiles.length > 0
          ? [...prev.attachedFiles]
          : Array.from({ length: count }, (_, i) => ({
              index: i + 1,
              fileName: i === 0 ? prev.fileNameUploaded || "" : "",
              formatNamaFile:
                i === 0 ? prev.formatNamaFile || "" : `${prev.formatNamaFile || "Dokumen"}_Lampiran_${i + 1}`,
              opsiNomorSurat: "same_as_template_1" as const,
              content: "",
            }));

      while (currentAttached.length < count) {
        const nextIdx = currentAttached.length + 1;
        currentAttached.push({
          index: nextIdx,
          fileName: "",
          formatNamaFile: `${prev.formatNamaFile || "Dokumen"}_Lampiran_${nextIdx}`,
          opsiNomorSurat: "same_as_template_1" as const,
          content: "",
        });
      }

      currentAttached[docIdx] = {
        ...currentAttached[docIdx],
        index: docIdx + 1,
        fileName: fileName,
        content: content,
      };

      // Determine if template has attached files with content/filename
      const hasAttachedDocs = currentAttached.some(
        (f) => (f.content && f.content.trim().length > 0) || (f.fileName && f.fileName.trim().length > 0)
      );

      // Collect all text sources across template body + attached files.
      // CRITICAL: If attached document files exist (e.g. Dokumen 1, Dokumen 2 .docx),
      // they supersede the hardcoded default dummy templateContent!
      // Do NOT include prev.templateContent to prevent dummy variables from bloating the configuration.
      const textSources: string[] = [];
      if (hasAttachedDocs) {
        textSources.push(...currentAttached.map((f: SuratAttachedFile) => f.content || ""));
      } else {
        textSources.push(prev.templateContent);
      }

      textSources.push(
        prev.formatNamaFile || "",
        ...currentAttached.map((f: SuratAttachedFile) => f.formatNamaFile || ""),
        prev.perihalDefault || "",
        prev.tujuanDefault || "",
        prev.kotaTujuanDefault || ""
      );

      const allTags = extractPlaceholdersFromText(textSources.join("\n"));

      // Deduplicate tags and build clean placeholder mappings:
      // 1. Keep existing customized mapping for tags that still exist.
      // 2. Add new mapping for newly detected tags with auto-mapping to manifest.
      // 3. PRUNE old/stale placeholders that are no longer present in any attached template!
      const newMappings: SuratPlaceholderMapping[] = [];
      allTags.forEach((tag) => {
        // Exclude system auto placeholders (e.g. Nomor Surat 1, Tanggal Surat) from manual fields
        if (isSystemAutoPlaceholder(tag)) return;

        const existing = prev.placeholders.find(
          (m) => m.key.toLowerCase().trim() === tag.toLowerCase().trim()
        );
        if (existing) {
          newMappings.push({
            ...existing,
            key: tag,
          });
        } else {
          const matchedManifest = MANIFEST_FIELD_OPTIONS.find(
            (opt) =>
              opt.key.toLowerCase().includes(tag.toLowerCase()) ||
              tag.toLowerCase().includes(opt.key.split(".")[1]?.toLowerCase() || "")
          );

          let detectedType: SuratInputType = "text";
          const tagLower = tag.toLowerCase();

          if (
            tagLower.includes("kanim") ||
            tagLower.includes("imigrasi")
          ) {
            if (tagLower.includes("kota")) {
              detectedType = "city";
            } else {
              detectedType = "kantor_imigrasi";
            }
          } else if (
            tagLower.includes("tanggal") ||
            tagLower.includes("tgl") ||
            tagLower.includes("date") ||
            tagLower.includes("lahir") ||
            tagLower.includes("berangkat") ||
            tagLower.includes("pulang")
          ) {
            detectedType = "date";
          } else if (
            tagLower.includes("kota") ||
            tagLower.includes("tempat") ||
            tagLower.includes("cabang") ||
            tagLower.includes("city") ||
            tagLower.includes("wilayah")
          ) {
            detectedType = "city";
          } else if (
            tagLower.includes("jumlah") ||
            tagLower.includes("hari") ||
            tagLower.includes("nominal") ||
            tagLower.includes("biaya") ||
            tagLower.includes("umur")
          ) {
            detectedType = "number";
          } else if (
            tagLower.includes("deskripsi") ||
            tagLower.includes("keterangan") ||
            tagLower.includes("alamat") ||
            tagLower.includes("kronologi")
          ) {
            detectedType = "textarea";
          }

          newMappings.push({
            key: tag,
            label: tag.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
            sourceType: matchedManifest ? "manifest" : "manual",
            manifestField: matchedManifest ? matchedManifest.key : undefined,
            inputType: detectedType,
            defaultValue: "",
            required: true,
          });
        }
      });

      return {
        ...prev,
        fileNameUploaded: docIdx === 0 ? fileName : prev.fileNameUploaded,
        attachedFiles: currentAttached,
        templateContent:
          docIdx === 0 && (!isDocx || !prev.templateContent)
            ? (content || prev.templateContent)
            : prev.templateContent,
        placeholders: newMappings.length > 0 ? newMappings : prev.placeholders,
      };
    });

    showToast(`File Dokumen Ke-${docIdx + 1} (${fileName}) diunggah! Terdeteksi ${detectedTags.length} variabel.`);
  };

  // Handle opsiNomorSurat change per document index
  const handleOpsiNomorSuratChange = (val: string, docIdx: number) => {
    setEditingTemplate((prev) => {
      if (!prev) return null;
      const count = Math.max(1, prev.jumlahTemplateTerlampir || 1);
      const currentAttached =
        prev.attachedFiles && prev.attachedFiles.length > 0
          ? [...prev.attachedFiles]
          : Array.from({ length: count }, (_, i) => ({
              index: i + 1,
              fileName: i === 0 ? prev.fileNameUploaded || "" : "",
              formatNamaFile:
                i === 0 ? prev.formatNamaFile || "" : `${prev.formatNamaFile || "Dokumen"}_Lampiran_${i + 1}`,
              opsiNomorSurat: "same_as_template_1" as const,
            }));

      while (currentAttached.length < count) {
        const nextIdx = currentAttached.length + 1;
        currentAttached.push({
          index: nextIdx,
          fileName: "",
          formatNamaFile: `${prev.formatNamaFile || "Dokumen"}_Lampiran_${nextIdx}`,
          opsiNomorSurat: "same_as_template_1" as const,
        });
      }

      currentAttached[docIdx] = {
        ...currentAttached[docIdx],
        index: docIdx + 1,
        opsiNomorSurat: val as "same_as_template_1" | "new_number",
      };

      return {
        ...prev,
        attachedFiles: currentAttached,
      };
    });
  };

  // Handle Sync Placeholders explicitly from Template Surat
  const handleSyncPlaceholdersFromTemplate = () => {
    if (!editingTemplate) return;

    const hasAttachedDocs = (editingTemplate.attachedFiles || []).some(
      (f) => (f.content && f.content.trim().length > 0) || (f.fileName && f.fileName.trim().length > 0)
    );

    const textPieces: string[] = [];
    if (hasAttachedDocs) {
      textPieces.push(
        ...(editingTemplate.attachedFiles?.map((f) => f.content || "") || [])
      );
    } else {
      textPieces.push(editingTemplate.templateContent);
    }

    textPieces.push(
      editingTemplate.formatNamaFile || "",
      ...(editingTemplate.attachedFiles?.map((f) => f.formatNamaFile || "") || []),
      editingTemplate.perihalDefault || "",
      editingTemplate.tujuanDefault || "",
      editingTemplate.kotaTujuanDefault || ""
    );

    const allText = textPieces.join("\n");
    const tags = extractPlaceholdersFromText(allText);

    if (tags.length === 0) {
      showToast("Tidak ada tag placeholder terdeteksi di dalam template berkas saat ini");
      return;
    }

    const existing = [...editingTemplate.placeholders];
    const newMappings: SuratPlaceholderMapping[] = [];

    tags.forEach((tag) => {
      // Exclude system auto placeholders (e.g. Nomor Surat 1, Tanggal Surat) from manual fields
      if (isSystemAutoPlaceholder(tag)) return;

      const found = existing.find(
        (m) => m.key.toLowerCase().trim() === tag.toLowerCase().trim()
      );
      if (found) {
        newMappings.push({
          ...found,
          key: tag,
        });
      } else {
        const matchedManifest = MANIFEST_FIELD_OPTIONS.find(
          (opt) =>
            opt.key.toLowerCase().includes(tag.toLowerCase()) ||
            tag.toLowerCase().includes(opt.key.split(".")[1]?.toLowerCase() || "")
        );
        let detectedType: SuratInputType = "text";
        const tagLower = tag.toLowerCase();

        if (
          tagLower.includes("kanim") ||
          tagLower.includes("imigrasi")
        ) {
          if (tagLower.includes("kota")) {
            detectedType = "city";
          } else {
            detectedType = "kantor_imigrasi";
          }
        } else if (
          tagLower.includes("tanggal") ||
          tagLower.includes("tgl") ||
          tagLower.includes("date") ||
          tagLower.includes("lahir") ||
          tagLower.includes("berangkat") ||
          tagLower.includes("pulang")
        ) {
          detectedType = "date";
        } else if (
          tagLower.includes("kota") ||
          tagLower.includes("tempat") ||
          tagLower.includes("cabang") ||
          tagLower.includes("city") ||
          tagLower.includes("wilayah")
        ) {
          detectedType = "city";
        } else if (
          tagLower.includes("jumlah") ||
          tagLower.includes("hari") ||
          tagLower.includes("nominal") ||
          tagLower.includes("biaya") ||
          tagLower.includes("umur")
        ) {
          detectedType = "number";
        } else if (
          tagLower.includes("deskripsi") ||
          tagLower.includes("keterangan") ||
          tagLower.includes("alamat") ||
          tagLower.includes("kronologi")
        ) {
          detectedType = "textarea";
        }

        newMappings.push({
          key: tag,
          label: tag.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
          sourceType: matchedManifest ? "manifest" : "manual",
          manifestField: matchedManifest ? matchedManifest.key : undefined,
          inputType: detectedType,
          defaultValue: "",
          required: true,
        });
      }
    });

    setEditingTemplate({
      ...editingTemplate,
      placeholders: newMappings,
    });
    showToast(`Berhasil menyinkronkan ${newMappings.length} variabel placeholder dari template surat!`);
  };

  // Handle formatNamaFile change per document index
  const handleFormatNamaFileChange = (val: string, docIdx: number) => {
    setEditingTemplate((prev) => {
      if (!prev) return null;
      const count = Math.max(1, prev.jumlahTemplateTerlampir || 1);
      const currentAttached = prev.attachedFiles && prev.attachedFiles.length > 0
        ? [...prev.attachedFiles]
        : Array.from({ length: count }, (_, i) => ({
            index: i + 1,
            fileName: i === 0 ? prev.fileNameUploaded || "" : "",
            formatNamaFile: i === 0 ? prev.formatNamaFile || "" : `${prev.formatNamaFile || "Dokumen"}_Lampiran_${i + 1}`,
          }));

      while (currentAttached.length < count) {
        const nextIdx = currentAttached.length + 1;
        currentAttached.push({
          index: nextIdx,
          fileName: "",
          formatNamaFile: `${prev.formatNamaFile || "Dokumen"}_Lampiran_${nextIdx}`,
        });
      }

      currentAttached[docIdx] = {
        ...currentAttached[docIdx],
        index: docIdx + 1,
        formatNamaFile: val,
      };

      return {
        ...prev,
        formatNamaFile: docIdx === 0 ? val : prev.formatNamaFile,
        attachedFiles: currentAttached,
      };
    });
  };

  // Handle duplicate template
  const handleDuplicateTemplate = (tpl: SuratTemplate) => {
    const duplicated: SuratTemplate = {
      ...JSON.parse(JSON.stringify(tpl)),
      id: `tpl-custom-${Date.now()}`,
      slug: `${tpl.slug}-copy-${Date.now().toString().slice(-4)}`,
      nama: `${tpl.nama} (Salinan)`,
      isDefault: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const updated = [duplicated, ...templates];
    setTemplates(updated);
    saveSuratTemplates(updated);
    fetch("/api/master/surat-templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(duplicated),
    }).catch(() => {});
    showToast(`Template "${tpl.nama}" berhasil diduplikasi`);
  };

  // Handle delete template
  const handleDeleteTemplate = async (tpl: SuratTemplate) => {
    if (!window.confirm(`Apakah Anda yakin ingin menghapus template "${tpl.nama}"?`)) return;
    const updated = templates.filter((t) => t.id !== tpl.id);
    setTemplates(updated);
    saveSuratTemplates(updated);
    try {
      await fetch(`/api/master/surat-templates?id=${tpl.id}`, { method: "DELETE" });
    } catch {}
    showToast(`Template "${tpl.nama}" berhasil dihapus`);
  };

  // Handle toggle QR Code verification per template
  const handleToggleQrCode = async (tpl: SuratTemplate) => {
    const updatedStatus = !tpl.penandatangan.showBarcode;
    const updated = templates.map((t) =>
      t.id === tpl.id
        ? {
            ...t,
            penandatangan: {
              ...t.penandatangan,
              showBarcode: updatedStatus,
            },
            updatedAt: new Date().toISOString(),
          }
        : t
    );
    setTemplates(updated);
    saveSuratTemplates(updated);
    try {
      const updatedTpl = updated.find((t) => t.id === tpl.id);
      if (updatedTpl) {
        await fetch("/api/master/surat-templates", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updatedTpl),
        });
      }
    } catch {}
    showToast(
      `QR Code verifikasi pada "${tpl.nama}" ${updatedStatus ? "diaktifkan [✓]" : "dinonaktifkan [✕]"}`
    );
  };

  // Handle reset to default templates
  const handleResetDefaults = () => {
    if (!window.confirm("Kembalikan seluruh template bawaan PPIU PT. VTU Abadi ke pengaturan awal?")) return;
    setTemplates(DEFAULT_SURAT_TEMPLATES);
    saveSuratTemplates(DEFAULT_SURAT_TEMPLATES);
    showToast("Template bawaan berhasil dipulihkan");
  };

  // Tag Inserter Helper in Editor
  const handleInsertTag = (tagKey: string) => {
    if (!editingTemplate) return;
    const tagFormatted = `{${tagKey}}`;
    setEditingTemplate((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        templateContent: `${prev.templateContent} ${tagFormatted}`,
      };
    });
    showToast(`Tag ${tagFormatted} berhasil disisipkan ke isi surat`);
  };

  // Real-time Placeholder Syncer for Editor & Attached Template Files
  const detectedTagsInEditing = useMemo(() => {
    if (!editingTemplate) return [];
    const hasAttachedDocs = (editingTemplate.attachedFiles || []).some(
      (f) => (f.content && f.content.trim().length > 0) || (f.fileName && f.fileName.trim().length > 0)
    );

    const textPieces: string[] = [];
    if (hasAttachedDocs) {
      textPieces.push(
        ...(editingTemplate.attachedFiles?.map((f) => f.content || "") || [])
      );
    } else {
      textPieces.push(editingTemplate.templateContent);
    }

    textPieces.push(
      editingTemplate.formatNamaFile || "",
      ...(editingTemplate.attachedFiles?.map((f) => f.formatNamaFile || "") || []),
      editingTemplate.perihalDefault || "",
      editingTemplate.tujuanDefault || "",
      editingTemplate.kotaTujuanDefault || ""
    );

    return extractPlaceholdersFromText(textPieces.join("\n"));
  }, [editingTemplate]);

  // System auto-tags extracted from template (e.g. Nomor Surat 1, Tanggal Surat)
  const systemAutoTags = useMemo(() => {
    return detectedTagsInEditing.filter((t) => isSystemAutoPlaceholder(t));
  }, [detectedTagsInEditing]);

  const editableTagsInEditing = useMemo(() => {
    return detectedTagsInEditing.filter((t) => !isSystemAutoPlaceholder(t));
  }, [detectedTagsInEditing]);

  // Synchronize placeholder mappings when tags change in template & prune stale placeholders
  useEffect(() => {
    if (!editingTemplate) return;

    const currentKeys = new Set(editingTemplate.placeholders.map((m) => m.key.toLowerCase().trim()));
    const editableLower = editableTagsInEditing.map((t) => t.toLowerCase().trim());

    // Check if there are missing editable tags or any stale tags (including any system auto tags lingering in placeholders)
    const hasMissingTags = editableLower.some((t) => !currentKeys.has(t));
    const hasStaleTags = editingTemplate.placeholders.some(
      (m) => isSystemAutoPlaceholder(m.key) || !editableLower.includes(m.key.toLowerCase().trim())
    );

    if (!hasMissingTags && !hasStaleTags) return;

    const newMappings: SuratPlaceholderMapping[] = [];

    editableTagsInEditing.forEach((tag) => {
      const found = editingTemplate.placeholders.find(
        (m) => m.key.toLowerCase().trim() === tag.toLowerCase().trim()
      );
      if (found) {
        newMappings.push({ ...found, key: tag });
      } else {
        const matchedManifest = MANIFEST_FIELD_OPTIONS.find(
          (opt) =>
            opt.key.toLowerCase().includes(tag.toLowerCase()) ||
            tag.toLowerCase().includes(opt.key.split(".")[1]?.toLowerCase() || "")
        );

        let detectedType: SuratInputType = "text";
        const tagLower = tag.toLowerCase();

        if (
          tagLower.includes("kanim") ||
          tagLower.includes("imigrasi")
        ) {
          if (tagLower.includes("kota")) {
            detectedType = "city";
          } else {
            detectedType = "kantor_imigrasi";
          }
        } else if (
          tagLower.includes("tanggal") ||
          tagLower.includes("tgl") ||
          tagLower.includes("date") ||
          tagLower.includes("lahir") ||
          tagLower.includes("berangkat") ||
          tagLower.includes("pulang")
        ) {
          detectedType = "date";
        } else if (
          tagLower.includes("kota") ||
          tagLower.includes("tempat") ||
          tagLower.includes("cabang") ||
          tagLower.includes("city") ||
          tagLower.includes("wilayah")
        ) {
          detectedType = "city";
        } else if (
          tagLower.includes("jumlah") ||
          tagLower.includes("hari") ||
          tagLower.includes("nominal") ||
          tagLower.includes("biaya") ||
          tagLower.includes("umur")
        ) {
          detectedType = "number";
        } else if (
          tagLower.includes("deskripsi") ||
          tagLower.includes("keterangan") ||
          tagLower.includes("alamat") ||
          tagLower.includes("kronologi")
        ) {
          detectedType = "textarea";
        }

        newMappings.push({
          key: tag,
          label: tag.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
          sourceType: matchedManifest ? "manifest" : "manual",
          manifestField: matchedManifest ? matchedManifest.key : undefined,
          inputType: detectedType,
          defaultValue: "",
          required: true,
        });
      }
    });

    setEditingTemplate((prev) => (prev ? { ...prev, placeholders: newMappings } : null));
  }, [editableTagsInEditing, editingTemplate]);

  // Save edited template
  const handleSaveEditor = async () => {
    if (!editingTemplate) return;
    if (!editingTemplate.nama.trim()) {
      alert("Nama template tidak boleh kosong");
      return;
    }
    if (!editingTemplate.templateContent.trim()) {
      alert("Konten isi template surat tidak boleh kosong");
      return;
    }

    setSavingTemplate(true);
    try {
      const updatedTemplate: SuratTemplate = {
        ...editingTemplate,
        updatedAt: new Date().toISOString(),
      };

      const existingIndex = templates.findIndex((t) => t.id === updatedTemplate.id);
      let newTemplates: SuratTemplate[];
      if (existingIndex >= 0) {
        newTemplates = [...templates];
        newTemplates[existingIndex] = updatedTemplate;
      } else {
        newTemplates = [updatedTemplate, ...templates];
      }

      setTemplates(newTemplates);
      saveSuratTemplates(newTemplates);

      // Save to server API
      await fetch("/api/master/surat-templates", {
        method: existingIndex >= 0 ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedTemplate),
      });

      showToast(`Template "${updatedTemplate.nama}" berhasil disimpan!`);
      setEditingTemplate(null);
    } catch (err) {
      alert(`Gagal menyimpan template: ${(err as Error).message}`);
    } finally {
      setSavingTemplate(false);
    }
  };

  // Upload Wizard File Parser
  const handleProcessUploadedFile = (file: File) => {
    setUploadedFileName(file.name);
    const cleanName = file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");
    setUploadTemplateName(cleanName.charAt(0).toUpperCase() + cleanName.slice(1));
    setUploadPerihal(`Surat ${cleanName}`);

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = (e.target?.result as string) || "";
      setUploadedFileContent(content);
    };
    reader.readAsText(file);
  };

  const handleSaveUploadedTemplate = () => {
    if (!uploadedFileContent.trim() || !uploadTemplateName.trim()) {
      alert("Nama template dan file konten wajib tersedia");
      return;
    }

    const detectedTags = extractPlaceholdersFromText(uploadedFileContent);
    const placeholders: SuratPlaceholderMapping[] = detectedTags.map((tag) => {
      const matched = MANIFEST_FIELD_OPTIONS.find((opt) =>
        opt.key.toLowerCase().includes(tag) || tag.includes(opt.key.split(".")[1] || "")
      );
      return {
        key: tag,
        label: tag.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
        sourceType: matched ? "manifest" : "manual",
        manifestField: matched ? matched.key : undefined,
        inputType: "text",
        defaultValue: "",
        required: true,
      };
    });

    const newTemplate: SuratTemplate = {
      id: `tpl-upload-${Date.now()}`,
      slug: `tpl-${uploadTemplateName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
      nama: uploadTemplateName,
      kategori: uploadCategory,
      deskripsi: `Template hasil unggahan file: ${uploadedFileName}`,
      kodeNomorDefault: uploadKodeNomor || "SK-CUSTOM",
      perihalDefault: uploadPerihal || uploadTemplateName,
      kopSuratType: "ppiu_vtu",
      lampiranDefault: "-",
      tujuanDefault: "Yth. Pihak yang Berkepentingan",
      kotaTujuanDefault: "Di Tempat",
      penandatangan: {
        nama: "H. Fauzan Adzim, S.E.",
        jabatan: "Direktur Utama PT. Vauza Trikarsa Utama",
        showStempel: true,
        showBarcode: true,
      },
      templateContent: uploadedFileContent,
      placeholders,
      isDefault: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const updated = [newTemplate, ...templates];
    setTemplates(updated);
    saveSuratTemplates(updated);

    fetch("/api/master/surat-templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newTemplate),
    }).catch(() => {});

    setIsUploadModalOpen(false);
    showToast(`Template "${newTemplate.nama}" berhasil dibuat dengan ${detectedTags.length} tag placeholder!`);

    // Open editor immediately to review mappings
    setEditingTemplate(newTemplate);
    setEditorActiveTab("konfigurasi");
  };

  // Category Icon helper
  const getCategoryIcon = (kat: SuratKategori) => {
    switch (kat) {
      case "imigrasi":
        return FileSignature;
      case "instansi":
        return Building2;
      case "sekolah":
        return GraduationCap;
      case "internal":
        return ScrollText;
      case "asuransi":
        return ShieldCheck;
      default:
        return Award;
    }
  };

  if (editingTemplate) {
    return (
      <div className="space-y-6 pb-20">
        {/* Toast Notification */}
        {toastMessage && (
          <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-3 duration-200">
            <div className="flex items-center gap-2.5 bg-emerald-900/90 border border-emerald-500 text-white text-xs font-semibold px-4 py-3 rounded-xl shadow-2xl backdrop-blur-md">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>{toastMessage}</span>
            </div>
          </div>
        )}

        {/* ── BACK BUTTON & TOP HEADER ── */}
        <div className="space-y-4">
          <button
            type="button"
            onClick={() => {
              setEditingTemplate(null);
            }}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 rounded-xl hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors shadow-xs"
          >
            <ArrowLeft className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <span>Kembali ke Master Template Surat</span>
          </button>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-stone-900 p-5 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-sm">
            <div className="flex items-center gap-3.5">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0">
                <Sliders className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2.5">
                  <h1 className="text-xl font-extrabold text-foreground tracking-tight">
                    Konfigurasi Template: {editingTemplate.nama}
                  </h1>
                  <Badge variant="outline" className="font-mono text-xs">
                    {editingTemplate.kodeNomorDefault || "ST"}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Kelola penomoran otomatis, variabel placeholder, jenis kolom isian, QR code keaslian, dan pratinjau lembar A4.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setEditingTemplate(null);
                }}
                className="text-xs font-bold"
              >
                Batal / Kembali
              </Button>
              <Button
                size="sm"
                disabled={savingTemplate}
                onClick={handleSaveEditor}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold gap-1.5 shadow-md px-4"
              >
                <Save className="h-4 w-4" />
                {savingTemplate ? "Menyimpan..." : "Simpan Konfigurasi"}
              </Button>
            </div>
          </div>
        </div>

        {/* ── MAIN CONFIGURATION CONTENT ── */}
        <div className="bg-white dark:bg-stone-900 p-6 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-sm space-y-6">
          {/* Navigation Tabs */}
          <div className="flex items-center justify-between border-b pb-3">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setEditorActiveTab("konfigurasi")}
                className={cn(
                  "px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2",
                  editorActiveTab === "konfigurasi"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-muted"
                )}
              >
                <Sliders className="h-4 w-4" />
                1. Konfigurasi Template
              </button>

              <button
                type="button"
                onClick={() => setEditorActiveTab("editor")}
                className={cn(
                  "px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2",
                  editorActiveTab === "editor"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-muted"
                )}
              >
                <FileText className="h-4 w-4" />
                2. Isi Konten & Editor Teks
              </button>

              <button
                type="button"
                onClick={() => setEditorActiveTab("preview")}
                className={cn(
                  "px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2",
                  editorActiveTab === "preview"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-muted"
                )}
              >
                <Eye className="h-4 w-4" />
                3. Pratinjau Lembar A4
              </button>
            </div>

            <Badge variant="outline" size="sm" className="font-mono text-xs hidden sm:inline-flex">
              {editingTemplate.kodeNomorDefault || "ST"}
            </Badge>
          </div>

          {/* ── TAB 1: KONFIGURASI TEMPLATE ── */}
          {editorActiveTab === "konfigurasi" && (
            <div className="space-y-6">
              {/* Row 1: Nama Jenis Surat & Jumlah Template */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
                <div className="sm:col-span-8 space-y-1.5">
                  <label className="text-xs font-bold text-foreground">Nama Jenis Surat</label>
                  <Input
                    value={editingTemplate.nama}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, nama: e.target.value })}
                    placeholder="Cth: Surat Tugas"
                    className="text-xs h-10 bg-background"
                  />
                </div>

                <div className="sm:col-span-4 space-y-1.5">
                  <label className="text-xs font-bold text-foreground">Jumlah Template Terlampir</label>
                  <Input
                    type="number"
                    min={1}
                    max={10}
                    value={editingTemplate.jumlahTemplateTerlampir ?? 1}
                    onChange={(e) => {
                      const newCount = Math.max(1, parseInt(e.target.value, 10) || 1);
                      setEditingTemplate((prev) => {
                        if (!prev) return null;
                        const currentAttached =
                          prev.attachedFiles && prev.attachedFiles.length > 0
                            ? [...prev.attachedFiles]
                            : Array.from({ length: prev.jumlahTemplateTerlampir || 1 }, (_, i) => ({
                                index: i + 1,
                                fileName: i === 0 ? prev.fileNameUploaded || "" : "",
                                formatNamaFile:
                                  i === 0 ? prev.formatNamaFile || "" : `${prev.formatNamaFile || "Dokumen"}_Lampiran_${i + 1}`,
                              }));

                        const adjusted = Array.from({ length: newCount }, (_, i) => {
                          if (currentAttached[i]) {
                            return { ...currentAttached[i], index: i + 1 };
                          }
                          return {
                            index: i + 1,
                            fileName: "",
                            formatNamaFile: `${prev.formatNamaFile || "Dokumen"}_Lampiran_${i + 1}`,
                          };
                        });

                        return {
                          ...prev,
                          jumlahTemplateTerlampir: newCount,
                          attachedFiles: adjusted,
                        };
                      });
                    }}
                    className="text-xs h-10 bg-background"
                  />
                </div>
              </div>

              {/* Row 2: Konfigurasi Penomoran Otomatis */}
              <div className="p-4 rounded-xl bg-stone-50 dark:bg-stone-900/60 border border-stone-200 dark:border-stone-800 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    Konfigurasi Penomoran Otomatis
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowFormatHelper(!showFormatHelper)}
                    className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 font-extrabold text-[11px] hover:bg-blue-500/20"
                    title="Bantuan Format Nomor"
                  >
                    !
                  </button>
                </div>

                {showFormatHelper && (
                  <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/30 text-xs space-y-1.5 animate-in fade-in">
                    <p className="font-bold text-blue-900 dark:text-blue-300">Variabel Penomoran Yang Didukung:</p>
                    <ul className="list-disc list-inside space-y-0.5 text-[11px] text-blue-800 dark:text-blue-300/90 font-mono">
                      <li><code>[NOMOR]</code> : Nomor Urut Otomatis (Cth: 001)</li>
                      <li><code>[BULAN]</code> : Bulan Romawi (Cth: VIII)</li>
                      <li><code>[TAHUN]</code> : Tahun 4 Digit (Cth: 2026)</li>
                      <li><code>[HARI]</code> : Tanggal Hari Ini (Cth: 31)</li>
                    </ul>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                  <div className="sm:col-span-8 space-y-1">
                    <label className="text-[11px] font-semibold text-muted-foreground">Format Nomor</label>
                    <Input
                      value={editingTemplate.formatNomor || `[NOMOR]/${editingTemplate.kodeNomorDefault}/[BULAN]/[TAHUN]`}
                      onChange={(e) => setEditingTemplate({ ...editingTemplate, formatNomor: e.target.value })}
                      placeholder="[NOMOR]/ST/[BULAN]/[TAHUN]"
                      className="text-xs font-mono bg-background"
                    />
                  </div>

                  <div className="sm:col-span-4 space-y-1">
                    <label className="text-[11px] font-semibold text-muted-foreground">Kebutuhan Nomor per Surat</label>
                    <Input
                      type="number"
                      min={1}
                      value={editingTemplate.kebutuhanNomorPerSurat ?? 1}
                      onChange={(e) =>
                        setEditingTemplate({
                          ...editingTemplate,
                          kebutuhanNomorPerSurat: parseInt(e.target.value, 10) || 1,
                        })
                      }
                      className="text-xs bg-background"
                    />
                  </div>
                </div>
              </div>

              {/* Row 3: Dynamic Upload File Template Dokumen (Sesuai Jumlah Template Terlampir) */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <Layers className="h-4 w-4 text-primary" />
                      Dokumen Template Terlampir ({editingTemplate.jumlahTemplateTerlampir ?? 1} Dokumen)
                    </label>
                    {(editingTemplate.jumlahTemplateTerlampir ?? 1) > 1 && (
                      <Badge variant="outline" size="sm" className="text-[10px] bg-primary/10 text-primary border-primary/20">
                        Multi-Template ({editingTemplate.jumlahTemplateTerlampir} Berkas)
                      </Badge>
                    )}
                  </div>
                  <span className="text-[11px] text-muted-foreground">
                    Unggah file per dokumen template untuk mendeteksi variabel placeholder otomatis
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  {Array.from({ length: Math.max(1, editingTemplate.jumlahTemplateTerlampir || 1) }).map((_, docIdx) => {
                    const docNumber = docIdx + 1;
                    const attached = editingTemplate.attachedFiles?.[docIdx];
                    const fileName = attached?.fileName || (docIdx === 0 ? editingTemplate.fileNameUploaded : "");
                    const formatName = attached?.formatNamaFile || (docIdx === 0 ? editingTemplate.formatNamaFile : "");
                    const isMain = docIdx === 0;

                    return (
                      <div
                        key={`template-doc-card-${docIdx}`}
                        className="p-4 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50/60 dark:bg-stone-900/30 space-y-3"
                      >
                        {/* Header with Title & Instruction */}
                        <div>
                          <label className="text-xs font-bold text-foreground">
                            File Template Dokumen Ke-{docNumber}{" "}
                            <span className="text-blue-600 dark:text-blue-400 font-normal text-xs ml-1">
                              (Abaikan jika tidak ingin mengganti file lama)
                            </span>
                          </label>
                        </div>

                        {/* File Upload Row: [Pilih File] + File Name Status */}
                        <div className="flex items-center gap-3">
                          <label className="cursor-pointer inline-flex items-center justify-center rounded-lg border border-stone-300 dark:border-stone-700 bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted shadow-sm transition-colors">
                            <span>Pilih File</span>
                            <input
                              type="file"
                              accept=".docx,.doc,.txt,.html,.json"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleModalFileUpload(file, docIdx);
                              }}
                              className="sr-only"
                            />
                          </label>
                          <span
                            className={cn(
                              "text-xs font-mono",
                              fileName
                                ? "text-emerald-600 dark:text-emerald-400 font-bold"
                                : "text-muted-foreground"
                            )}
                          >
                            {fileName ? `✓ ${fileName}` : "Tidak ada file yang dipilih"}
                          </span>
                        </div>

                        {/* Opsi Penomoran Surat (For Document 2 and above, exactly matching Image 2!) */}
                        {!isMain && (
                          <div className="space-y-1 pt-1">
                            <label className="text-[11px] font-semibold text-muted-foreground">
                              Opsi Penomoran Surat
                            </label>
                            <Select
                              value={attached?.opsiNomorSurat || "same_as_template_1"}
                              onChange={(e) => handleOpsiNomorSuratChange(e.target.value, docIdx)}
                              options={[
                                { value: "same_as_template_1", label: "Gunakan Nomor yang Sama dengan Template Ke-1" },
                                { value: "new_number", label: "Gunakan Nomor Berikutnya (Nomor Baru)" },
                              ]}
                              className="text-xs h-9 bg-background"
                            />
                          </div>
                        )}

                        {/* Format Nama File Hasil Generate */}
                        <div className="space-y-1 pt-1">
                          <label className="text-[11px] font-semibold text-muted-foreground">
                            Format Nama File Hasil Generate
                          </label>
                          <Input
                            value={
                              formatName ||
                              (isMain
                                ? editingTemplate.formatNamaFile || `Surat_Rekom_TTD_{{${editingTemplate.placeholders[0]?.key || "Nama Jama'ah"}}}`
                                : `Surat_Rekom_{{${editingTemplate.placeholders[0]?.key || "Nama Jama'ah"}}}`)
                            }
                            onChange={(e) => handleFormatNamaFileChange(e.target.value, docIdx)}
                            placeholder={isMain ? "Surat_Rekom_TTD_{{Nama Jama'ah}}" : "Surat_Rekom_{{Nama Jama'ah}}"}
                            className="text-xs font-mono bg-background"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Row 4: Quick Switch Cards (QR & Stempel) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-stone-50 dark:bg-stone-900/60 border border-stone-200 dark:border-stone-800">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={cn(
                        "p-2 rounded-lg transition-colors",
                        editingTemplate.penandatangan.showBarcode
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                          : "bg-stone-200 dark:bg-stone-800 text-muted-foreground"
                      )}
                    >
                      <QrCode className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-foreground">Tampilkan QR Code Verifikasi</p>
                      <p className="text-[10px] text-muted-foreground">Verifikasi keaslian surat otomatis</p>
                    </div>
                  </div>

                  <button
                    type="button"
                    role="switch"
                    aria-checked={editingTemplate.penandatangan.showBarcode}
                    onClick={() =>
                      setEditingTemplate({
                        ...editingTemplate,
                        penandatangan: {
                          ...editingTemplate.penandatangan,
                          showBarcode: !editingTemplate.penandatangan.showBarcode,
                        },
                      })
                    }
                    className={cn(
                      "relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                      editingTemplate.penandatangan.showBarcode ? "bg-emerald-500" : "bg-stone-300 dark:bg-stone-700"
                    )}
                  >
                    <span
                      aria-hidden="true"
                      className={cn(
                        "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                        editingTemplate.penandatangan.showBarcode ? "translate-x-4" : "translate-x-0"
                      )}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between p-3.5 rounded-xl bg-stone-50 dark:bg-stone-900/60 border border-stone-200 dark:border-stone-800">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={cn(
                        "p-2 rounded-lg transition-colors",
                        editingTemplate.penandatangan.showStempel
                          ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                          : "bg-stone-200 dark:bg-stone-800 text-muted-foreground"
                      )}
                    >
                      <ShieldCheck className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-foreground">Tampilkan Stempel Resmi VTU</p>
                      <p className="text-[10px] text-muted-foreground">Stempel basah digital di lembar surat</p>
                    </div>
                  </div>

                  <button
                    type="button"
                    role="switch"
                    aria-checked={editingTemplate.penandatangan.showStempel}
                    onClick={() =>
                      setEditingTemplate({
                        ...editingTemplate,
                        penandatangan: {
                          ...editingTemplate.penandatangan,
                          showStempel: !editingTemplate.penandatangan.showStempel,
                        },
                      })
                    }
                    className={cn(
                      "relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                      editingTemplate.penandatangan.showStempel ? "bg-emerald-500" : "bg-stone-300 dark:bg-stone-700"
                    )}
                  >
                    <span
                      aria-hidden="true"
                      className={cn(
                        "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                        editingTemplate.penandatangan.showStempel ? "translate-x-4" : "translate-x-0"
                      )}
                    />
                  </button>
                </div>
              </div>

              {/* Row 5: Konfigurasi Isian Data (Dynamic Placeholder Columns Following Template) */}
              <div className="space-y-3 pt-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b pb-3 gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-xs font-extrabold text-foreground tracking-wide uppercase">
                        Konfigurasi Isian Data
                      </h3>
                      <Badge
                        variant="outline"
                        className="text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 gap-1"
                      >
                        <CheckCircle2 className="h-3 w-3" />
                        {editingTemplate.placeholders.length} Variabel Terdeteksi dari Template
                      </Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Kolom isian di bawah ini otomatis mengikuti placeholder yang terdeteksi di dalam template surat (&#123;&#123;tag&#125;&#125;, &lt;&lt;tag&gt;&gt;, &#123;tag&#125;).
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={handleSyncPlaceholdersFromTemplate}
                      className="text-xs font-semibold gap-1.5 hover:bg-muted"
                      title="Pindai ulang seluruh placeholder dari isi template & dokumen berkas terlampir"
                    >
                      <RotateCcw className="h-3.5 w-3.5 text-primary" />
                      Sinkronkan dari Template
                    </Button>
                  </div>
                </div>

                {/* System-Generated Placeholders Banner */}
                {systemAutoTags.length > 0 && (
                  <div className="p-3.5 rounded-xl border border-blue-500/20 bg-blue-500/5 dark:bg-blue-950/20 text-xs space-y-1.5">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
                      <span className="font-bold text-blue-900 dark:text-blue-200">
                        {systemAutoTags.length} Variabel Otomatis Sistem (Tidak Memerlukan Input Manual)
                      </span>
                    </div>
                    <p className="text-[11px] text-blue-700/80 dark:text-blue-300/80">
                      Tag berikut otomatis digenerate oleh sistem (Nomor Surat, Tanggal Surat, dll) saat cetak/generate surat:
                    </p>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {systemAutoTags.map((tag) => (
                        <Badge
                          key={tag}
                          variant="secondary"
                          className="font-mono text-[10px] bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-200 border-blue-300 dark:border-blue-700"
                        >
                          &#123;&#123;{tag}&#125;&#125;
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {editingTemplate.placeholders.length === 0 ? (
                  <div className="p-6 text-center border border-dashed rounded-xl text-xs text-muted-foreground space-y-1">
                    <p>Belum ada variabel placeholder terdeteksi di dalam template surat ini.</p>
                    <p className="text-[11px]">
                      Tulis tag seperti <code className="text-primary font-bold">&#123;&#123;nama_lengkap&#125;&#125;</code> atau <code className="text-primary font-bold">&lt;&lt;nik&gt;&gt;</code> di Tab Editor Teks atau unggah file dokumen template Word (.docx).
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {editingTemplate.placeholders.map((mapping, idx) => {
                      const tagSyntax = `{{${mapping.key}}}`;
                      const isTagInTemplate = detectedTagsInEditing.some(
                        (t) => t.toLowerCase() === mapping.key.toLowerCase()
                      );

                      return (
                        <div
                          key={`${mapping.key}-${idx}`}
                          className="p-3.5 rounded-xl border bg-stone-50/70 dark:bg-stone-900/40 space-y-2.5"
                        >
                          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                            {/* Kolom Tag & Label Nama Form */}
                            <div className="sm:col-span-6 space-y-1.5">
                              <div className="flex items-center gap-2">
                                <span className="text-[11px] font-bold text-foreground">
                                  Variabel #{idx + 1}
                                </span>
                                <Badge
                                  variant="outline"
                                  className="font-mono text-[10px] font-bold text-primary bg-primary/10 border-primary/20 px-2 py-0.5"
                                >
                                  Tag Word: {tagSyntax}
                                </Badge>
                                {isTagInTemplate ? (
                                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-0.5">
                                    <CheckCircle2 className="h-3 w-3" />
                                    Di Template
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium italic">
                                    (Tidak ada di template)
                                  </span>
                                )}
                              </div>

                              <Input
                                value={mapping.label || mapping.key}
                                onChange={(e) => {
                                  const newLabel = e.target.value;
                                  setEditingTemplate((prev) => {
                                    if (!prev) return null;
                                    const updated = [...prev.placeholders];
                                    const cur = updated[idx];
                                    if (cur) {
                                      updated[idx] = {
                                        ...cur,
                                        label: newLabel,
                                      };
                                    }
                                    return { ...prev, placeholders: updated };
                                  });
                                }}
                                placeholder="Cth: Nama Lengkap Jamaah"
                                className="text-xs h-9 bg-background font-semibold"
                              />
                            </div>

                            {/* Jenis Kolom Isian Dropdown */}
                            <div className="sm:col-span-5 space-y-1.5">
                              <label className="text-[11px] font-bold text-foreground">
                                Jenis Kolom Isian
                              </label>
                              <Select
                                value={mapping.sourceType === "manifest" ? "manifest" : mapping.inputType || "text"}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setEditingTemplate((prev) => {
                                    if (!prev) return null;
                                    const updated = [...prev.placeholders];
                                    const cur = updated[idx];
                                    if (!cur) return prev;

                                    if (val === "manifest") {
                                      updated[idx] = {
                                        ...cur,
                                        sourceType: "manifest",
                                        manifestField: cur.manifestField || MANIFEST_FIELD_OPTIONS[0]?.key,
                                      };
                                    } else {
                                      updated[idx] = {
                                        ...cur,
                                        sourceType: "manual",
                                        inputType: val as SuratInputType,
                                      };
                                    }
                                    return { ...prev, placeholders: updated };
                                  });
                                }}
                                options={[
                                  { value: "text", label: "Teks Singkat" },
                                  { value: "date", label: "Tanggal" },
                                  { value: "city", label: "Kota / Tempat" },
                                  { value: "number", label: "Angka / Nomor" },
                                  { value: "textarea", label: "Teks Panjang / Paragraf" },
                                  { value: "select", label: "Pilihan (Dropdown)" },
                                  { value: "kantor_imigrasi", label: "Kantor Imigrasi / Layanan Paspor (Searchable)" },
                                  { value: "manifest", label: "Ambil dari Manifest (Otomatis)" },
                                ]}
                                className="text-xs h-9 bg-background"
                              />
                            </div>

                            {/* Hapus if obsolete */}
                            <div className="sm:col-span-1 flex items-center justify-end pt-2 sm:pt-0">
                              <button
                                type="button"
                                onClick={() => handleRemoveColumn(idx)}
                                className="text-[11px] font-bold text-stone-400 hover:text-red-600 dark:hover:text-red-400 hover:underline shrink-0 p-1"
                                title="Hapus kolom variabel ini"
                              >
                                Hapus
                              </button>
                            </div>
                          </div>

                          {/* Sub-row if manifest or select */}
                          {mapping.sourceType === "manifest" && (
                            <div className="w-full flex flex-col sm:flex-row sm:items-center gap-2 p-2 rounded-lg bg-emerald-500/5 border border-emerald-500/20 text-xs">
                              <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 shrink-0 flex items-center gap-1">
                                <Sparkles className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                                Field Manifest:
                              </span>
                              <div className="flex-1 w-full">
                                <Select
                                  value={mapping.manifestField || MANIFEST_FIELD_OPTIONS[0]?.key || ""}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setEditingTemplate((prev) => {
                                      if (!prev) return null;
                                      const updated = [...prev.placeholders];
                                      const cur = updated[idx];
                                      if (cur) updated[idx] = { ...cur, manifestField: val };
                                      return { ...prev, placeholders: updated };
                                    });
                                  }}
                                  options={MANIFEST_FIELD_OPTIONS.map((opt) => ({
                                    value: opt.key,
                                    label: `${opt.label} (${opt.group})`,
                                  }))}
                                  className="text-xs h-8.5 w-full bg-background font-medium"
                                />
                              </div>
                            </div>
                          )}

                          {mapping.inputType === "select" && mapping.sourceType !== "manifest" && (
                            <div className="w-full flex flex-col sm:flex-row sm:items-center gap-2.5 p-2.5 rounded-lg bg-blue-500/5 border border-blue-500/20 text-xs">
                              <span className="text-[11px] font-bold text-blue-700 dark:text-blue-300 shrink-0 flex items-center gap-1.5">
                                <ListFilter className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                                Opsi Pilihan (Koma):
                              </span>
                              <input
                                type="text"
                                value={(mapping.options || []).join(", ")}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  const opts = val
                                    .split(",")
                                    .map((s) => s.trim())
                                    .filter(Boolean);
                                  setEditingTemplate((prev) => {
                                    if (!prev) return null;
                                    const updated = [...prev.placeholders];
                                    const cur = updated[idx];
                                    if (cur) updated[idx] = { ...cur, options: opts };
                                    return { ...prev, placeholders: updated };
                                  });
                                }}
                                placeholder="Cth: Permohonan Baru, Endorsement, Paspor Rusak, Paspor Hilang (pisahkan tiap pilihan dengan koma)"
                                className="w-full flex-1 h-9 px-3 text-xs rounded-md border border-blue-300 dark:border-blue-700 bg-background text-foreground font-semibold focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none transition-all shadow-sm placeholder:text-muted-foreground placeholder:font-normal"
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Bottom Save Button Container */}
              <div className="flex justify-end pt-4 border-t">
                <Button
                  type="button"
                  size="lg"
                  onClick={handleSaveEditor}
                  disabled={savingTemplate}
                  className="text-sm font-bold bg-emerald-600 hover:bg-emerald-700 text-white px-8 shadow-md"
                >
                  <Save className="mr-2 h-4 w-4" />
                  {savingTemplate ? "Menyimpan..." : "Simpan Konfigurasi"}
                </Button>
              </div>
            </div>
          )}

          {/* ── TAB 2: ISI KONTEN & EDITOR TEKS ── */}
          {editorActiveTab === "editor" && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-semibold">Kategori Surat</label>
                  <Select
                    value={editingTemplate.kategori}
                    onChange={(e) =>
                      setEditingTemplate({
                        ...editingTemplate,
                        kategori: e.target.value as SuratKategori,
                      })
                    }
                    options={[
                      { value: "imigrasi", label: "Imigrasi / Kemenag" },
                      { value: "instansi", label: "Instansi / Perusahaan" },
                      { value: "sekolah", label: "Sekolah / Kampus" },
                      { value: "internal", label: "Internal Operasional" },
                      { value: "asuransi", label: "Klaim Asuransi" },
                      { value: "custom", label: "Kustom Lainnya" },
                    ]}
                    className="text-xs mt-1"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold">Kode Prefix Default</label>
                  <Input
                    value={editingTemplate.kodeNomorDefault}
                    onChange={(e) =>
                      setEditingTemplate({
                        ...editingTemplate,
                        kodeNomorDefault: e.target.value,
                      })
                    }
                    placeholder="Contoh: ST"
                    className="text-xs mt-1 font-mono uppercase"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold">Perihal Surat</label>
                  <Input
                    value={editingTemplate.perihalDefault}
                    onChange={(e) =>
                      setEditingTemplate({
                        ...editingTemplate,
                        perihalDefault: e.target.value,
                      })
                    }
                    placeholder="Contoh: Surat Tugas Operasional"
                    className="text-xs mt-1"
                  />
                </div>
              </div>

              {/* Tag Quick Inserter Toolbar */}
              <div className="p-3 rounded-xl bg-primary/5 border border-primary/20 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-primary flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5" />
                    Sisipkan Tag Placeholder ke Kursor
                  </span>
                  <span className="text-[11px] text-muted-foreground">Klik tag untuk menyisipkan ke isi surat</span>
                </div>

                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                  {[
                    ...editingTemplate.placeholders.map((p) => ({ key: p.key, label: `+ {${p.key}}` })),
                    { key: "nama_lengkap", label: "+ {nama_lengkap}" },
                    { key: "nik", label: "+ {nik}" },
                    { key: "nomor_paspor", label: "+ {nomor_paspor}" },
                    { key: "nama_paket", label: "+ {nama_paket}" },
                    { key: "tanggal_berangkat", label: "+ {tanggal_berangkat}" },
                    { key: "tanggal_pulang", label: "+ {tanggal_pulang}" },
                  ]
                    .filter((v, idx, arr) => arr.findIndex((t) => t.key === v.key) === idx)
                    .map((t) => (
                      <button
                        key={t.key}
                        type="button"
                        onClick={() => handleInsertTag(t.key)}
                        className="px-2 py-1 rounded bg-background hover:bg-primary/10 hover:text-primary border text-[10px] font-mono text-foreground transition-all shadow-sm"
                      >
                        {t.label}
                      </button>
                    ))}
                </div>
              </div>

              {/* Textarea Template Body */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold">Isi / Body Konten Surat</label>
                  <span className="text-[11px] text-muted-foreground">
                    Gunakan tanda kurung kurawal &#123;nama_tag&#125; atau &#123;&#123;nama_tag&#125;&#125;
                  </span>
                </div>
                <textarea
                  rows={14}
                  value={editingTemplate.templateContent}
                  onChange={(e) =>
                    setEditingTemplate({ ...editingTemplate, templateContent: e.target.value })
                  }
                  className="w-full p-3 font-mono text-xs rounded-xl border bg-background focus:ring-2 focus:ring-primary focus:outline-none leading-relaxed"
                  placeholder="Tuliskan format isi surat di sini..."
                />
              </div>

              {/* Penandatangan Settings */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-xl border bg-muted/20">
                <div>
                  <label className="text-xs font-semibold">Nama Penandatangan</label>
                  <Input
                    value={editingTemplate.penandatangan.nama}
                    onChange={(e) =>
                      setEditingTemplate({
                        ...editingTemplate,
                        penandatangan: { ...editingTemplate.penandatangan, nama: e.target.value },
                      })
                    }
                    className="text-xs mt-1"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold">Jabatan Penandatangan</label>
                  <Input
                    value={editingTemplate.penandatangan.jabatan}
                    onChange={(e) =>
                      setEditingTemplate({
                        ...editingTemplate,
                        penandatangan: { ...editingTemplate.penandatangan, jabatan: e.target.value },
                      })
                    }
                    className="text-xs mt-1"
                  />
                </div>
              </div>

              {/* Footer in Editor Tab */}
              <div className="flex justify-end pt-3 border-t">
                <Button
                  type="button"
                  size="sm"
                  onClick={handleSaveEditor}
                  disabled={savingTemplate}
                  className="text-xs bg-primary text-primary-foreground font-semibold"
                >
                  <Save className="mr-1.5 h-3.5 w-3.5" />
                  {savingTemplate ? "Menyimpan..." : "Simpan Perubahan Konten"}
                </Button>
              </div>
            </div>
          )}

          {/* ── TAB 3: PRATINJAU LEMBAR A4 ── */}
          {editorActiveTab === "preview" && (
            <div className="space-y-4">
              <div className="p-3 rounded-xl bg-muted/40 border text-xs flex items-center justify-between">
                <span className="font-semibold text-muted-foreground">
                  Pratinjau Lembar Surat A4 (Menggunakan Dummy Data Resolusi Autocrat)
                </span>
                <Badge variant="success" size="sm">
                  Autocrat Live Renderer
                </Badge>
              </div>

              {/* Simulated A4 Letter Sheet */}
              <div className="bg-white text-stone-900 p-8 rounded-xl shadow-md border font-serif text-[13px] leading-relaxed max-w-2xl mx-auto space-y-5">
                {/* Kop Surat */}
                {editingTemplate.kopSuratType === "ppiu_vtu" && (
                  <div className="border-b-2 border-stone-900 pb-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <img
                        src={KOP_SURAT_BASE64}
                        alt="Kop Surat PT VTU Abadi"
                        className="h-16 w-auto object-contain"
                      />
                      <div>
                        <h2 className="text-base font-bold tracking-tight text-stone-950 font-sans">
                          PT. VAUZA TRIKARSA UTAMA
                        </h2>
                        <p className="text-[10px] text-stone-600 font-sans font-medium">
                          Penyelenggara Perjalanan Ibadah Umroh (PPIU) Kemenag RI No. U.400 Tahun 2021
                        </p>
                        <p className="text-[9px] text-stone-500 font-sans">
                          Ruko Gateway Blok C-12, Waru, Sidoarjo &bull; Telp: (031) 854-4455 &bull; info@vtuabadi.com
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Header Meta */}
                <div className="flex items-start justify-between text-xs font-sans">
                  <div className="space-y-0.5">
                    <p>
                      <strong>Nomor</strong> :{" "}
                      {editingTemplate.formatNomor
                        ? editingTemplate.formatNomor
                            .replace(/\[NOMOR\]/gi, "001")
                            .replace(/\[BULAN\]/gi, getTodayDateInfo().romanMonth)
                            .replace(/\[TAHUN\]/gi, String(getTodayDateInfo().year))
                            .replace(/\[HARI\]/gi, "31")
                        : `${editingTemplate.kodeNomorDefault}/001/VTU/${getTodayDateInfo().romanMonth}/${getTodayDateInfo().year}`}
                    </p>
                    <p><strong>Lamp</strong>  : {editingTemplate.lampiranDefault || "-"}</p>
                    <p><strong>Perihal</strong>: <strong>{editingTemplate.perihalDefault}</strong></p>
                  </div>
                  <div className="text-right">
                    <p>Sidoarjo, {getTodayDateInfo().masehi}</p>
                  </div>
                </div>

                {/* Destination */}
                <div className="text-xs font-sans space-y-0.5 pt-1">
                  <p>{editingTemplate.tujuanDefault || "Kepada Pihak yang Berkepentingan"}</p>
                  <p>{editingTemplate.kotaTujuanDefault || "Di Tempat"}</p>
                </div>

                {/* Body Content with Merged Data */}
                <div className="whitespace-pre-line text-xs font-sans pt-2 leading-relaxed text-justify">
                  {renderAutocratMergedText(
                    editingTemplate.templateContent,
                    resolveAutocratFieldValues(
                      editingTemplate,
                      {
                        namaLengkap: "MUCHAMAD ZAMRONI",
                        nik: "3515082103850001",
                        nomorPaspor: "X1234567",
                        tempatLahir: "Sidoarjo",
                        tanggalLahir: "1985-03-21",
                        jenisKelamin: "LAKI-LAKI",
                        namaAyah: "H. AHMAD SOFWAN",
                        alamat: "Jl. Raya Taman No. 45, Sidoarjo, Jawa Timur",
                        nomorTelepon: "081234567890",
                        registrationId: "REG-2026-0814",
                      },
                      {
                        namaPaket: "Paket Umroh Reguler Awal Musim 1448 H",
                        kode: "KBR-2026-08-A",
                        tanggalBerangkat: "2026-09-15",
                        tanggalPulang: "2026-09-24",
                        programHari: 9,
                        maskapai: "Saudia Airlines (SV)",
                        hotelMekkah: "Pullman Zamzam Makkah",
                        hotelMadinah: "Rove Al Madinah",
                      }
                    )
                  )}
                </div>

                {/* Signature Section */}
                <div className="pt-6 flex items-end justify-between font-sans text-xs">
                  {editingTemplate.penandatangan.showBarcode && (
                    <div className="p-2 border rounded-lg flex items-center gap-2 bg-stone-50">
                      <QrCode className="h-10 w-10 text-stone-800" />
                      <div className="text-[9px] text-stone-600">
                        <p className="font-bold">VERIFIKASI RESMI</p>
                        <p>Scan untuk cek keabsahan surat di portal VTU Abadi</p>
                      </div>
                    </div>
                  )}

                  <div className="text-center min-w-[200px] ml-auto space-y-1">
                    <p className="font-semibold">PT. VAUZA TRIKARSA UTAMA</p>
                    <div className="h-16 flex items-center justify-center relative">
                      {editingTemplate.penandatangan.showStempel && (
                        <div className="absolute inset-0 flex items-center justify-center opacity-60 pointer-events-none">
                          <div className="w-16 h-16 rounded-full border-2 border-dashed border-red-600 flex items-center justify-center text-[9px] font-black text-red-600 rotate-[-15deg]">
                            STEMPEL VTU
                          </div>
                        </div>
                      )}
                      <span className="italic text-stone-400 text-[10px]">(Tanda Tangan Digital)</span>
                    </div>
                    <p className="font-bold underline uppercase">{editingTemplate.penandatangan.nama}</p>
                    <p className="text-[11px] text-stone-600">{editingTemplate.penandatangan.jabatan}</p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-3 border-t">
                <Button
                  type="button"
                  size="sm"
                  onClick={handleSaveEditor}
                  disabled={savingTemplate}
                  className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                >
                  <Save className="mr-1.5 h-3.5 w-3.5" />
                  {savingTemplate ? "Menyimpan..." : "Simpan Konfigurasi"}
                </Button>
              </div>
            </div>
          )}

          {/* Bottom Back & Save Row */}
          <div className="flex items-center justify-between pt-4 border-t mt-6">
            <button
              type="button"
              onClick={() => {
                setEditingTemplate(null);
              }}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Batal & Kembali ke Daftar
            </button>
            <Button
              type="button"
              size="sm"
              onClick={handleSaveEditor}
              disabled={savingTemplate}
              className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold gap-1.5 px-5 py-2"
            >
              <Save className="h-4 w-4" />
              {savingTemplate ? "Menyimpan..." : "Simpan Konfigurasi"}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
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
              <Sliders className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                Master Template Surat Operasional
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                Konfigurasi template surat dengan <strong>Autocrat Merge Engine</strong>, pemetaan data manifest otomatis, dan unggah template dokumen.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="text-xs"
            onClick={handleResetDefaults}
          >
            <RotateCcw className="mr-1.5 h-3.5 w-3.5 text-muted-foreground" />
            Reset Default PPIU
          </Button>

          <Button
            variant="secondary"
            size="sm"
            className="text-xs"
            onClick={() => {
              setUploadedFileName("");
              setUploadedFileContent("");
              setUploadTemplateName("");
              setIsUploadModalOpen(true);
            }}
          >
            <UploadCloud className="mr-1.5 h-3.5 w-3.5 text-primary" />
            Upload File Template
          </Button>

          <Button
            size="sm"
            className="text-xs bg-primary text-primary-foreground shadow-sm"
            onClick={handleCreateNew}
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Buat Template Baru
          </Button>
        </div>
      </div>

      {/* ── STATS & HIGHLIGHTS ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="p-4 border-stone-200 dark:border-stone-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">Total Template</p>
              <p className="text-2xl font-extrabold mt-1 text-foreground">{templates.length}</p>
            </div>
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
              <FileCode className="h-5 w-5" />
            </div>
          </div>
        </Card>

        <Card className="p-4 border-stone-200 dark:border-stone-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">Auto-Fill Manifest</p>
              <p className="text-2xl font-extrabold mt-1 text-emerald-600 dark:text-emerald-400">
                {MANIFEST_FIELD_OPTIONS.length} Field
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Sparkles className="h-5 w-5" />
            </div>
          </div>
        </Card>

        <Card className="p-4 border-stone-200 dark:border-stone-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">Verifikasi QR Barcode</p>
              <p className="text-2xl font-extrabold mt-1 text-blue-600 dark:text-blue-400">Aktif</p>
            </div>
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <QrCode className="h-5 w-5" />
            </div>
          </div>
        </Card>

        <Card className="p-4 border-stone-200 dark:border-stone-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">Kategori Tersedia</p>
              <p className="text-2xl font-extrabold mt-1 text-purple-600 dark:text-purple-400">6 Kategori</p>
            </div>
            <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <Layers className="h-5 w-5" />
            </div>
          </div>
        </Card>
      </div>

      {/* ── FILTER & SEARCH BAR ── */}
      <Card className="border-stone-200 dark:border-stone-800">
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari nama template, kode nomor surat, atau tag..."
                className="pl-9 text-xs"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Category Filter Pills */}
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { id: "all", label: "Semua" },
                { id: "imigrasi", label: "Imigrasi" },
                { id: "instansi", label: "Instansi / Kerja" },
                { id: "sekolah", label: "Sekolah" },
                { id: "internal", label: "Internal" },
                { id: "asuransi", label: "Asuransi" },
                { id: "custom", label: "Kustom" },
              ].map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedCategory(c.id)}
                  className={cn(
                    "px-2.5 py-1 text-xs font-medium rounded-lg border transition-all",
                    selectedCategory === c.id
                      ? "bg-primary text-primary-foreground border-primary shadow-sm"
                      : "bg-muted/40 hover:bg-muted text-muted-foreground border-transparent"
                  )}
                >
                  {c.label} ({categoryCounts[c.id] || 0})
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── TEMPLATES GRID ── */}
      {filteredTemplates.length === 0 ? (
        <Card className="border-dashed p-10 text-center">
          <FileText className="mx-auto h-12 w-12 text-muted-foreground/30 mb-3" />
          <h3 className="text-sm font-semibold">Tidak ada template yang cocok</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Ubah kata kunci pencarian atau buat template baru.
          </p>
          <Button size="sm" className="mt-4 text-xs" onClick={handleCreateNew}>
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Buat Template Baru
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTemplates.map((tpl) => {
            const Icon = getCategoryIcon(tpl.kategori);
            const manifestMappedCount = tpl.placeholders.filter((p) => p.sourceType === "manifest").length;
            const manualPromptCount = tpl.placeholders.filter((p) => p.sourceType === "manual").length;

            return (
              <Card
                key={tpl.id}
                className="group relative flex flex-col justify-between border-stone-200 dark:border-stone-800 hover:border-primary/50 hover:shadow-md transition-all rounded-xl overflow-hidden"
              >
                <div className="p-5 space-y-4">
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors line-clamp-1">
                          {tpl.nama}
                        </h3>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <Badge variant="outline" size="sm" className="text-[10px] uppercase font-mono">
                            {tpl.kodeNomorDefault}
                          </Badge>
                          <Badge variant="muted" size="sm" className="text-[10px] capitalize">
                            {tpl.kategori}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    {tpl.isDefault && (
                      <Badge variant="info" size="sm" className="text-[9px]">
                        Default PPIU
                      </Badge>
                    )}
                  </div>

                  {/* Description */}
                  <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                    {tpl.deskripsi}
                  </p>

                  {/* Autocrat Tag Stats */}
                  <div className="p-3 rounded-lg bg-muted/40 border border-stone-200/50 dark:border-stone-800/50 space-y-2">
                    <div className="flex items-center justify-between text-[11px] font-semibold text-foreground">
                      <span className="flex items-center gap-1.5 text-xs">
                        <Tag className="h-3.5 w-3.5 text-primary" />
                        Autocrat Placeholders
                      </span>
                      <span className="text-primary font-mono">{tpl.placeholders.length} Tag</span>
                    </div>

                    <div className="flex items-center gap-2 text-[10px]">
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium">
                        ✓ {manifestMappedCount} Manifest
                      </span>
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 font-medium">
                        ✍️ {manualPromptCount} Form Input
                      </span>
                    </div>

                    {/* Tag chips preview */}
                    <div className="flex flex-wrap gap-1 pt-1">
                      {tpl.placeholders.slice(0, 4).map((p) => (
                        <span
                          key={p.key}
                          className={cn(
                            "text-[9px] font-mono px-1.5 py-0.5 rounded border",
                            p.sourceType === "manifest"
                              ? "bg-emerald-500/5 text-emerald-700 dark:text-emerald-300 border-emerald-500/20"
                              : "bg-blue-500/5 text-blue-700 dark:text-blue-300 border-blue-500/20"
                          )}
                        >
                          &#123;{p.key}&#125;
                        </span>
                      ))}
                      {tpl.placeholders.length > 4 && (
                        <span className="text-[9px] text-muted-foreground px-1 py-0.5">
                          +{tpl.placeholders.length - 4} lainnya
                        </span>
                      )}
                    </div>
                  </div>

                  {/* QR Code Verification Per-Template Switch Row */}
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-stone-50 dark:bg-stone-900/60 border border-stone-200/80 dark:border-stone-800/80">
                    <div className="flex items-center gap-2">
                      <div
                        className={cn(
                          "p-1.5 rounded-md transition-colors",
                          tpl.penandatangan.showBarcode
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                            : "bg-stone-200/60 dark:bg-stone-800 text-muted-foreground"
                        )}
                      >
                        <QrCode className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold text-foreground">QR Code Verifikasi</p>
                        <p className="text-[9px] text-muted-foreground">
                          {tpl.penandatangan.showBarcode ? "Aktif di lembar surat" : "Dinonaktifkan"}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      role="switch"
                      aria-checked={tpl.penandatangan.showBarcode}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleQrCode(tpl);
                      }}
                      className={cn(
                        "relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                        tpl.penandatangan.showBarcode ? "bg-emerald-500" : "bg-stone-300 dark:bg-stone-700"
                      )}
                      title={
                        tpl.penandatangan.showBarcode
                          ? "Klik untuk menonaktifkan QR Code verifikasi"
                          : "Klik untuk mengaktifkan QR Code verifikasi"
                      }
                    >
                      <span
                        aria-hidden="true"
                        className={cn(
                          "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                          tpl.penandatangan.showBarcode ? "translate-x-4" : "translate-x-0"
                        )}
                      />
                    </button>
                  </div>
                </div>

                {/* Card Footer Actions */}
                <div className="px-5 py-3 bg-muted/20 border-t border-stone-200 dark:border-stone-800 flex items-center justify-between gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 text-xs font-semibold text-primary hover:bg-primary/10"
                    onClick={() => router.push(`/admin/surat?template=${tpl.slug}`)}
                  >
                    <ExternalLink className="mr-1.5 h-3 w-3" />
                    Generate Surat
                  </Button>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 px-2.5 text-xs"
                      title="Edit & Konfigurasi Mapping"
                      onClick={() => handleEditTemplate(tpl)}
                    >
                      <Edit3 className="h-3.5 w-3.5 text-stone-600 dark:text-stone-300 mr-1" />
                      Edit
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      title="Duplikasi Template"
                      onClick={() => handleDuplicateTemplate(tpl)}
                    >
                      <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>

                    {!tpl.isDefault && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 hover:text-destructive"
                        title="Hapus Template"
                        onClick={() => handleDeleteTemplate(tpl)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}


      {/* ── UPLOAD TEMPLATE WIZARD MODAL ── */}
      <Modal
        open={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        title="Upload File Template Surat (.txt, .docx, .html)"
        size="lg"
      >
        <div className="space-y-4">
          <p className="text-xs text-muted-foreground leading-relaxed">
            Unggah file template surat Anda. Sistem Autocrat akan otomatis memindai seluruh placeholder dengan format &#123;nama_kolom&#125; dan membuat konfigurasi pemetaan kolom secara instan.
          </p>

          {/* Dropzone */}
          <div
            className={cn(
              "relative border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer",
              uploadDragOver
                ? "border-primary bg-primary/10"
                : "border-stone-300 dark:border-stone-700 bg-muted/20 hover:border-primary/50"
            )}
            onDragOver={(e) => {
              e.preventDefault();
              setUploadDragOver(true);
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              setUploadDragOver(false);
            }}
            onDrop={(e) => {
              e.preventDefault();
              setUploadDragOver(false);
              if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                handleProcessUploadedFile(e.dataTransfer.files[0]);
              }
            }}
          >
            <input
              type="file"
              accept=".txt,.docx,.html,.htm,.json"
              className="absolute inset-0 opacity-0 cursor-pointer"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleProcessUploadedFile(e.target.files[0]);
                }
              }}
            />
            <UploadCloud className="mx-auto h-10 w-10 text-primary mb-2" />
            <p className="text-xs font-bold text-foreground">
              {uploadedFileName ? `File Terpilih: ${uploadedFileName}` : "Klik atau seret file template ke sini"}
            </p>
            <p className="text-[11px] text-muted-foreground mt-1">
              Mendukung format .txt, .html, atau teks template dengan tag &#123;placeholder&#125;
            </p>
          </div>

          {uploadedFileContent && (
            <div className="space-y-3 pt-2">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-semibold">Nama Template</label>
                  <Input
                    value={uploadTemplateName}
                    onChange={(e) => setUploadTemplateName(e.target.value)}
                    className="text-xs mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold">Kategori</label>
                  <Select
                    value={uploadCategory}
                    onChange={(e) => setUploadCategory(e.target.value as SuratKategori)}
                    options={[
                      { value: "imigrasi", label: "Imigrasi" },
                      { value: "instansi", label: "Instansi / Kerja" },
                      { value: "sekolah", label: "Sekolah" },
                      { value: "internal", label: "Internal" },
                      { value: "asuransi", label: "Asuransi" },
                      { value: "custom", label: "Kustom" },
                    ]}
                    className="text-xs mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold">Prefix Nomor Surat</label>
                  <Input
                    value={uploadKodeNomor}
                    onChange={(e) => setUploadKodeNomor(e.target.value)}
                    className="text-xs mt-1 font-mono uppercase"
                  />
                </div>
              </div>

              {/* Tag Detection Summary */}
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs">
                <span className="font-bold text-emerald-800 dark:text-emerald-300">
                  ✓ {extractPlaceholdersFromText(uploadedFileContent).length} Tag Placeholder Terdeteksi:
                </span>
                <div className="flex flex-wrap gap-1 mt-1.5 font-mono text-[10px]">
                  {extractPlaceholdersFromText(uploadedFileContent).map((t) => (
                    <span key={t} className="px-1.5 py-0.5 rounded bg-background border text-emerald-700 dark:text-emerald-300">
                      &#123;{t}&#125;
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 border-t pt-3">
            <Button variant="ghost" size="sm" className="text-xs" onClick={() => setIsUploadModalOpen(false)}>
              Batal
            </Button>
            <Button
              size="sm"
              className="text-xs bg-primary text-primary-foreground"
              disabled={!uploadedFileContent || !uploadTemplateName}
              onClick={handleSaveUploadedTemplate}
            >
              Simpan & Konfigurasi Mapping
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
