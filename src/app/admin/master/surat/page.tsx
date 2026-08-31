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
} from "@/shared/types/surat";
import { KOP_SURAT_BASE64 } from "@/server/assets/kop-surat";

export default function MasterSuratPage() {
  const router = useRouter();

  // State
  const [templates, setTemplates] = useState<SuratTemplate[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  // Editor Modal State
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<SuratTemplate | null>(null);
  const [editorActiveTab, setEditorActiveTab] = useState<"desain" | "mapping" | "preview">("desain");
  const [savingTemplate, setSavingTemplate] = useState(false);

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
    const newTpl: SuratTemplate = {
      id: `tpl-custom-${Date.now()}`,
      slug: `custom-surat-${Date.now()}`,
      nama: "Template Surat Baru",
      kategori: "custom",
      deskripsi: "Template surat kustom dengan format placeholder {tag}",
      kodeNomorDefault: "SK-CUSTOM",
      perihalDefault: "Perihal Surat Resmi",
      kopSuratType: "ppiu_vtu",
      lampiranDefault: "-",
      tujuanDefault: "Yth. Pimpinan Instansi / Bapak/Ibu",
      kotaTujuanDefault: "Di Tempat",
      penandatangan: {
        nama: "H. Fauzan Adzim, S.E.",
        jabatan: "Direktur Utama PT. Vauza Trikarsa Utama",
        showStempel: true,
        showBarcode: true,
      },
      templateContent: `Assalamu'alaikum Warahmatullahi Wabarakatuh,

Yang bertanda tangan di bawah ini menerangkan bahwa:

Nama Lengkap      : {nama_lengkap}
Nomor NIK / KTP   : {nik}
Nomor Paspor      : {nomor_paspor}
Tempat/Tgl Lahir  : {tempat_lahir}, {tanggal_lahir}
Alamat Lengkap    : {alamat}

Adalah benar-benar calon jamaah Umroh PT. Vauza Trikarsa Utama pada program keberangkatan:

Paket Umroh       : {nama_paket}
Tanggal Berangkat : {tanggal_berangkat}
Tanggal Kembali   : {tanggal_pulang}

Demikian surat ini kami buat dengan sebenarnya agar dapat dipergunakan sebagaimana mestinya.

Wassalamu'alaikum Warahmatullahi Wabarakatuh.`,
      placeholders: [
        { key: "nama_lengkap", label: "Nama Lengkap", sourceType: "manifest", manifestField: "jamaah.namaLengkap", required: true },
        { key: "nik", label: "NIK (KTP)", sourceType: "manifest", manifestField: "jamaah.nik", required: true },
        { key: "nomor_paspor", label: "Nomor Paspor", sourceType: "manifest", manifestField: "jamaah.nomorPaspor" },
        { key: "tempat_lahir", label: "Tempat Lahir", sourceType: "manifest", manifestField: "jamaah.tempatLahir" },
        { key: "tanggal_lahir", label: "Tanggal Lahir", sourceType: "manifest", manifestField: "jamaah.tanggalLahir" },
        { key: "alamat", label: "Alamat Lengkap", sourceType: "manifest", manifestField: "jamaah.alamat" },
        { key: "nama_paket", label: "Nama Paket", sourceType: "manifest", manifestField: "keberangkatan.namaPaket" },
        { key: "tanggal_berangkat", label: "Tanggal Berangkat", sourceType: "manifest", manifestField: "keberangkatan.tanggalBerangkat" },
        { key: "tanggal_pulang", label: "Tanggal Pulang", sourceType: "manifest", manifestField: "keberangkatan.tanggalPulang" },
      ],
      isDefault: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setEditingTemplate(newTpl);
    setEditorActiveTab("desain");
    setIsEditorOpen(true);
  };

  // Handle edit existing template
  const handleEditTemplate = (tpl: SuratTemplate) => {
    setEditingTemplate(JSON.parse(JSON.stringify(tpl)));
    setEditorActiveTab("desain");
    setIsEditorOpen(true);
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

  // Real-time Placeholder Syncer for Editor
  const detectedTagsInEditing = useMemo(() => {
    if (!editingTemplate) return [];
    const raw = `${editingTemplate.templateContent} ${editingTemplate.perihalDefault} ${editingTemplate.tujuanDefault || ""} ${editingTemplate.kotaTujuanDefault || ""}`;
    return extractPlaceholdersFromText(raw);
  }, [editingTemplate]);

  // Synchronize placeholder mappings when tags change in template
  useEffect(() => {
    if (!editingTemplate) return;
    const currentMappings = [...editingTemplate.placeholders];
    let hasChanges = false;

    detectedTagsInEditing.forEach((tag) => {
      const exists = currentMappings.some((m) => m.key.toLowerCase() === tag.toLowerCase());
      if (!exists) {
        hasChanges = true;
        // Check if there is a matching manifest option
        const matchedManifest = MANIFEST_FIELD_OPTIONS.find((opt) =>
          opt.key.toLowerCase().includes(tag) || tag.includes(opt.key.split(".")[1] || "")
        );

        const newMapping: SuratPlaceholderMapping = {
          key: tag,
          label: tag.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
          sourceType: matchedManifest ? "manifest" : "manual",
          manifestField: matchedManifest ? matchedManifest.key : undefined,
          inputType: "text",
          defaultValue: "",
          required: true,
        };
        currentMappings.push(newMapping);
      }
    });

    if (hasChanges) {
      setEditingTemplate((prev) => (prev ? { ...prev, placeholders: currentMappings } : null));
    }
  }, [detectedTagsInEditing, editingTemplate]);

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
      setIsEditorOpen(false);
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
    setEditorActiveTab("mapping");
    setIsEditorOpen(true);
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

      {/* ── AUTOCRAT TEMPLATE CONFIGURATOR & EDITOR MODAL ── */}
      {editingTemplate && (
        <Modal
          open={isEditorOpen}
          onClose={() => setIsEditorOpen(false)}
          title={`Konfigurasi Template: ${editingTemplate.nama}`}
          size="xl"
        >
          <div className="space-y-4">
            {/* Tab Navigation */}
            <div className="flex items-center justify-between border-b pb-2">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setEditorActiveTab("desain")}
                  className={cn(
                    "px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5",
                    editorActiveTab === "desain"
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-muted"
                  )}
                >
                  <FileText className="h-3.5 w-3.5" />
                  1. Desain & Konten Surat
                </button>

                <button
                  onClick={() => setEditorActiveTab("mapping")}
                  className={cn(
                    "px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5",
                    editorActiveTab === "mapping"
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-muted"
                  )}
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  2. Pemetaan Tag (Autocrat Mapping)
                  <Badge variant="warning" size="sm" className="ml-1 text-[10px]">
                    {editingTemplate.placeholders.length}
                  </Badge>
                </button>

                <button
                  onClick={() => setEditorActiveTab("preview")}
                  className={cn(
                    "px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5",
                    editorActiveTab === "preview"
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-muted"
                  )}
                >
                  <Eye className="h-3.5 w-3.5" />
                  3. Uji Coba Pratinjau A4
                </button>
              </div>

              <Badge variant="outline" size="sm" className="font-mono text-xs">
                {editingTemplate.kodeNomorDefault}
              </Badge>
            </div>

            {/* TAB 1: DESAIN & KONTEN SURAT */}
            {editorActiveTab === "desain" && (
              <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-1">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-semibold">Nama Template Surat</label>
                    <Input
                      value={editingTemplate.nama}
                      onChange={(e) => setEditingTemplate({ ...editingTemplate, nama: e.target.value })}
                      placeholder="Contoh: Surat Rekomendasi Paspor"
                      className="text-xs mt-1"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold">Kategori Surat</label>
                    <Select
                      value={editingTemplate.kategori}
                      onChange={(e) => setEditingTemplate({ ...editingTemplate, kategori: e.target.value as SuratKategori })}
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
                    <label className="text-xs font-semibold">Kode Prefix Nomor Surat</label>
                    <Input
                      value={editingTemplate.kodeNomorDefault}
                      onChange={(e) => setEditingTemplate({ ...editingTemplate, kodeNomorDefault: e.target.value })}
                      placeholder="Contoh: SR-PASPOR"
                      className="text-xs mt-1 font-mono uppercase"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold">Perihal Surat Default</label>
                    <Input
                      value={editingTemplate.perihalDefault}
                      onChange={(e) => setEditingTemplate({ ...editingTemplate, perihalDefault: e.target.value })}
                      placeholder="Contoh: Rekomendasi Pembuatan Paspor"
                      className="text-xs mt-1"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold">Tujuan Surat Default</label>
                    <Input
                      value={editingTemplate.tujuanDefault || ""}
                      onChange={(e) => setEditingTemplate({ ...editingTemplate, tujuanDefault: e.target.value })}
                      placeholder="Contoh: Yth. Kepala Kantor Imigrasi"
                      className="text-xs mt-1"
                    />
                  </div>
                </div>

                {/* Tag Quick Inserter Toolbar */}
                <div className="p-3 rounded-xl bg-primary/5 border border-primary/20 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-primary flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5" />
                      Sisipkan Tag Placeholder Otomatis ke Isi Surat
                    </span>
                    <span className="text-[11px] text-muted-foreground">Klik tag untuk menyisipkan ke kursor</span>
                  </div>

                  <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                    {[
                      { key: "nama_lengkap", label: "+ {nama_lengkap}" },
                      { key: "nik", label: "+ {nik}" },
                      { key: "nomor_paspor", label: "+ {nomor_paspor}" },
                      { key: "tempat_lahir", label: "+ {tempat_lahir}" },
                      { key: "tanggal_lahir", label: "+ {tanggal_lahir}" },
                      { key: "jenis_kelamin", label: "+ {jenis_kelamin}" },
                      { key: "alamat", label: "+ {alamat}" },
                      { key: "nomor_telepon", label: "+ {nomor_telepon}" },
                      { key: "nama_paket", label: "+ {nama_paket}" },
                      { key: "kode_paket", label: "+ {kode_paket}" },
                      { key: "tanggal_berangkat", label: "+ {tanggal_berangkat}" },
                      { key: "tanggal_pulang", label: "+ {tanggal_pulang}" },
                      { key: "maskapai", label: "+ {maskapai}" },
                      { key: "hotel_mekkah", label: "+ {hotel_mekkah}" },
                      { key: "hotel_madinah", label: "+ {hotel_madinah}" },
                      { key: "program_hari", label: "+ {program_hari}" },
                    ].map((t) => (
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
                      Gunakan tanda kurung kurawal &#123;nama_tag&#125; untuk data dinamis
                    </span>
                  </div>
                  <textarea
                    rows={12}
                    value={editingTemplate.templateContent}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, templateContent: e.target.value })}
                    className="w-full p-3 font-mono text-xs rounded-xl border bg-background focus:ring-2 focus:ring-primary focus:outline-none leading-relaxed"
                    placeholder="Tuliskan format isi surat di sini..."
                  />
                </div>

                {/* Penandatangan & Kop Surat Settings */}
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

                  {/* Modern Toggle Switch: QR Code Verifikasi Keaslian Surat */}
                  <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-950/20 sm:col-span-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div
                        className={cn(
                          "p-2 rounded-lg mt-0.5 transition-colors",
                          editingTemplate.penandatangan.showBarcode
                            ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                            : "bg-stone-200 dark:bg-stone-800 text-muted-foreground"
                        )}
                      >
                        <QrCode className="h-5 w-5" />
                      </div>
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-foreground">
                            Tampilkan QR Code Verifikasi Keaslian Surat
                          </span>
                          <Badge
                            variant={editingTemplate.penandatangan.showBarcode ? "success" : "muted"}
                            size="sm"
                            className="text-[9px]"
                          >
                            {editingTemplate.penandatangan.showBarcode ? "AKTIF [✓]" : "NONAKTIF [✕]"}
                          </Badge>
                        </div>
                        <p className="text-[11px] text-muted-foreground leading-relaxed">
                          Mencetak barcode digital QR Code di bagian bawah surat yang dapat discan oleh instansi (Imigrasi, Maskapai, Perusahaan) untuk memverifikasi keaslian dokumen secara online di portal <span className="font-mono text-emerald-600 dark:text-emerald-400">/track/surat</span>.
                        </p>
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
                        "relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none self-end sm:self-center",
                        editingTemplate.penandatangan.showBarcode ? "bg-emerald-500" : "bg-stone-300 dark:bg-stone-700"
                      )}
                      title="Klik untuk mengaktifkan / menonaktifkan QR Code"
                    >
                      <span
                        aria-hidden="true"
                        className={cn(
                          "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                          editingTemplate.penandatangan.showBarcode ? "translate-x-5" : "translate-x-0"
                        )}
                      />
                    </button>
                  </div>

                  {/* Modern Toggle Switch: Stempel Resmi */}
                  <div className="p-4 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/40 sm:col-span-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-primary/10 text-primary mt-0.5">
                        <Building2 className="h-5 w-5" />
                      </div>
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-foreground">
                            Tampilkan Stempel Resmi VTU Abadi
                          </span>
                          <Badge
                            variant={editingTemplate.penandatangan.showStempel ? "info" : "muted"}
                            size="sm"
                            className="text-[9px]"
                          >
                            {editingTemplate.penandatangan.showStempel ? "AKTIF [✓]" : "NONAKTIF [✕]"}
                          </Badge>
                        </div>
                        <p className="text-[11px] text-muted-foreground leading-relaxed">
                          Mencantumkan stempel digital resmi PPIU PT Vauza Trikarsa Utama di atas tanda tangan pimpinan.
                        </p>
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
                        "relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none self-end sm:self-center",
                        editingTemplate.penandatangan.showStempel ? "bg-primary" : "bg-stone-300 dark:bg-stone-700"
                      )}
                      title="Klik untuk mengaktifkan / menonaktifkan Stempel Resmi"
                    >
                      <span
                        aria-hidden="true"
                        className={cn(
                          "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                          editingTemplate.penandatangan.showStempel ? "translate-x-5" : "translate-x-0"
                        )}
                      />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: AUTOCRAT FIELD MAPPING */}
            {editorActiveTab === "mapping" && (
              <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-1">
                <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/30 text-xs text-blue-900 dark:text-blue-200">
                  <strong>Cara Kerja Autocrat Mapping:</strong> Sistem mendeteksi seluruh tag dalam kurung kurawal &#123;...&#125; dari template. Tentukan apakah tag tersebut diambil <strong>otomatis dari data Manifest</strong> jamaah atau dijadikan <strong>kolom isian form manual</strong> saat generate surat.
                </div>

                <div className="space-y-3">
                  {editingTemplate.placeholders.map((mapping, idx) => (
                    <Card key={mapping.key} className="p-3.5 border-stone-200 dark:border-stone-800">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <span className="font-mono text-xs font-bold text-primary px-2 py-1 rounded bg-primary/10">
                            &#123;{mapping.key}&#125;
                          </span>
                          <div>
                            <Input
                              value={mapping.label}
                              onChange={(e) => {
                                const val = e.target.value;
                                setEditingTemplate((prev) => {
                                  if (!prev) return null;
                                  const updated = [...prev.placeholders];
                                  const cur = updated[idx];
                                  if (cur) updated[idx] = { ...cur, label: val };
                                  return { ...prev, placeholders: updated };
                                });
                              }}
                              className="text-xs h-7 w-48 font-semibold"
                              placeholder="Label Field Form"
                            />
                          </div>
                        </div>

                        {/* Source Type Selector */}
                        <div className="flex items-center gap-2">
                          <Select
                            value={mapping.sourceType}
                            onChange={(e) => {
                              const val = e.target.value as "manifest" | "manual";
                              setEditingTemplate((prev) => {
                                if (!prev) return null;
                                const updated = [...prev.placeholders];
                                const cur = updated[idx];
                                if (cur) {
                                  updated[idx] = {
                                    ...cur,
                                    sourceType: val,
                                    manifestField: val === "manifest" ? MANIFEST_FIELD_OPTIONS[0]?.key : undefined,
                                  };
                                }
                                return { ...prev, placeholders: updated };
                              });
                            }}
                            options={[
                              { value: "manifest", label: "✓ Otomatis Manifest" },
                              { value: "manual", label: "✍️ Form Input Manual" },
                            ]}
                            className="text-xs h-8 w-44 font-medium"
                          />

                          {/* Detail Mapping */}
                          {mapping.sourceType === "manifest" ? (
                            <Select
                              value={mapping.manifestField || ""}
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
                              className="text-xs h-8 w-60"
                            />
                          ) : (
                            <div className="flex items-center gap-2">
                              <Select
                                value={mapping.inputType || "text"}
                                onChange={(e) => {
                                  const val = e.target.value as any;
                                  setEditingTemplate((prev) => {
                                    if (!prev) return null;
                                    const updated = [...prev.placeholders];
                                    const cur = updated[idx];
                                    if (cur) updated[idx] = { ...cur, inputType: val };
                                    return { ...prev, placeholders: updated };
                                  });
                                }}
                                options={[
                                  { value: "text", label: "Teks Singkat" },
                                  { value: "date", label: "Tanggal" },
                                  { value: "number", label: "Angka" },
                                  { value: "textarea", label: "Paragraf" },
                                ]}
                                className="text-xs h-8 w-32"
                              />
                              <Input
                                value={mapping.defaultValue || ""}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setEditingTemplate((prev) => {
                                    if (!prev) return null;
                                    const updated = [...prev.placeholders];
                                    const cur = updated[idx];
                                    if (cur) updated[idx] = { ...cur, defaultValue: val };
                                    return { ...prev, placeholders: updated };
                                  });
                                }}
                                className="text-xs h-8 w-36"
                                placeholder="Nilai default..."
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 3: LIVE PREVIEW */}
            {editorActiveTab === "preview" && (
              <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-1">
                <div className="p-3 rounded-xl bg-muted/40 border text-xs flex items-center justify-between">
                  <span className="font-semibold text-muted-foreground">
                    Pratinjau Lembar Surat A4 (Menggunakan Dummy Data Manifest)
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
                      <p><strong>Nomor</strong> : {editingTemplate.kodeNomorDefault}/001/VTU/VIII/2026</p>
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
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center justify-between border-t pt-3">
              <Button
                variant="ghost"
                size="sm"
                className="text-xs"
                onClick={() => setIsEditorOpen(false)}
                disabled={savingTemplate}
              >
                Tutup
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  className="text-xs bg-primary text-primary-foreground"
                  onClick={handleSaveEditor}
                  disabled={savingTemplate}
                >
                  <Save className="mr-1.5 h-3.5 w-3.5" />
                  {savingTemplate ? "Menyimpan..." : "Simpan Template Surat"}
                </Button>
              </div>
            </div>
          </div>
        </Modal>
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
