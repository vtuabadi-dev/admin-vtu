"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import {
  FileText,
  Search,
  Eye,
  CheckCircle,
  XCircle,
  RefreshCw,
  FileImage,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Save,
  Download,
  Send,
  Users,
  Edit3,
} from "lucide-react";
import { Card, CardContent } from "@/shared/components/ui/Card";
import { StatusBadge, Badge } from "@/shared/components/ui/Badge";
import { Button } from "@/shared/components/ui/Button";
import { Input } from "@/shared/components/ui/Input";
import { Select } from "@/shared/components/ui/Select";
import { Modal } from "@/shared/components/ui/Modal";
import { Tabs } from "@/shared/components/ui/Tabs";
import {
  updateDokumenStatus,
  getKeberangkatanList,
  getGroupList,
  getDokumenReviewQueue,
  getDocumentCompletionMatrix,
  simulateZipDownload,
  saveManualOcrData,
} from "@/services/mock/handlers";
import {
  getValidationPriority,
  canEditManualData,
  getDocumentStatusBadge,
  getOcrStatusLabel,
  getOcrConfidenceVariant,
} from "@/shared/lib/document-utils";
import type { DokumenItem, DokumenJenis, Keberangkatan } from "@/shared/types";
import { formatDate, formatDateShort, cn } from "@/shared/lib/utils";

// ============================================================
// CONSTANTS
// ============================================================

const LABEL_DOKUMEN: Record<string, string> = {
  paspor: "Paspor",
  pas_foto: "Pas Foto",
  vaksin: "Sertifikat Vaksin",
  ktp: "KTP",
  kk: "Kartu Keluarga",
  akta: "Akta Lahir",
};

const ALL_DOC_JENIS: DokumenJenis[] = ["paspor", "pas_foto", "vaksin", "ktp", "kk", "akta"];

// ============================================================
// HELPERS
// ============================================================

interface OcrFieldEdit {
  key: string;
  label: string;
  ocrValue: string;
  editedValue: string;
  confidence: number;
}

function generateOcrFields(dokumen: DokumenItem): OcrFieldEdit[] {
  const base = dokumen.ocrData;
  if (!base) return [];

  const fields: { key: string; label: string; ocrValue: string }[] = [];
  if (base.namaLengkap) fields.push({ key: "namaLengkap", label: "Nama Lengkap", ocrValue: base.namaLengkap });
  if (base.nomorPaspor) fields.push({ key: "nomorPaspor", label: "Nomor Paspor", ocrValue: base.nomorPaspor });
  if (base.nik) fields.push({ key: "nik", label: "NIK", ocrValue: base.nik });
  if (base.tanggalLahir) fields.push({ key: "tanggalLahir", label: "Tanggal Lahir", ocrValue: base.tanggalLahir });
  if (base.tempatLahir) fields.push({ key: "tempatLahir", label: "Tempat Lahir", ocrValue: base.tempatLahir });
  if (base.masaBerlaku) fields.push({ key: "masaBerlaku", label: "Masa Berlaku", ocrValue: base.masaBerlaku });

  return fields.map((f) => ({
    ...f,
    editedValue: f.ocrValue,
    confidence: Math.min(1, Math.max(0.5, base.confidence + (Math.random() * 0.3 - 0.15))),
  }));
}

function confidenceIcon(c: number) {
  if (c >= 0.85) return ShieldCheck;
  if (c >= 0.7) return AlertTriangle;
  return ShieldAlert;
}

function getDocCellBadge(docInfo: { status: string } | undefined) {
  if (!docInfo || docInfo.status === "pending" || docInfo.status === "kurang") {
    return { variant: "muted" as const, label: "Belum", dotClass: "bg-muted-foreground/30" };
  }
  if (docInfo.status === "verified" || docInfo.status === "lengkap") {
    return { variant: "success" as const, label: "Lengkap", dotClass: "bg-success" };
  }
  if (docInfo.status === "revisi") {
    return { variant: "warning" as const, label: "Revisi", dotClass: "bg-warning" };
  }
  if (docInfo.status === "rejected") {
    return { variant: "destructive" as const, label: "Ditolak", dotClass: "bg-destructive" };
  }
  if (docInfo.status === "processing") {
    return { variant: "info" as const, label: "OCR Proses", dotClass: "bg-info" };
  }
  return { variant: "muted" as const, label: docInfo.status, dotClass: "bg-muted-foreground/30" };
}

// ============================================================
// MAIN PAGE
// ============================================================

export default function DokumenPage() {
  const [activeTab, setActiveTab] = useState("rekap");
  const [loading, setLoading] = useState(true);

  // Shared data
  const [keberangkatanList, setKeberangkatanList] = useState<Keberangkatan[]>([]);
  const [groups, setGroups] = useState<Record<string, { namaGroup: string; kodeRegistrasi: string; paketId: string }>>({});

  // --- Rekap Tab State ---
  const [selectedPackage, setSelectedPackage] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [completionMatrix, setCompletionMatrix] = useState<Awaited<ReturnType<typeof getDocumentCompletionMatrix>>>([]);
  const [matrixLoading, setMatrixLoading] = useState(false);
  const [zipLoading, setZipLoading] = useState<string | null>(null);
  const [showReminderModal, setShowReminderModal] = useState(false);

  // --- Review Tab State ---
  const [reviewFilter, setReviewFilter] = useState("");
  const [reviewQueue, setReviewQueue] = useState<Awaited<ReturnType<typeof getDokumenReviewQueue>>>([]);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewSearch, setReviewSearch] = useState("");
  const [selectedReview, setSelectedReview] = useState<Awaited<ReturnType<typeof getDokumenReviewQueue>>[number] | null>(null);

  // --- OCR / Action Modal State ---
  const [ocrFields, setOcrFields] = useState<OcrFieldEdit[]>([]);
  const [editMode, setEditMode] = useState(false);
  const [ocrProcessing, setOcrProcessing] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [showRevisiInput, setShowRevisiInput] = useState(false);
  const [revisiNote, setRevisiNote] = useState("");
  const [changesSaved, setChangesSaved] = useState(false);
  const [manualEditMode, setManualEditMode] = useState(false);
  const [manualEditData, setManualEditData] = useState({ namaLengkap: "", nik: "", nomorPaspor: "", tanggalLahir: "" });

  // Load initial data
  useEffect(() => {
    async function load() {
      const [kbrList, groupList] = await Promise.all([
        getKeberangkatanList(),
        getGroupList(),
      ]);
      setKeberangkatanList(kbrList);
      const groupMap: Record<string, { namaGroup: string; kodeRegistrasi: string; paketId: string }> = {};
      groupList.forEach((g) => {
        groupMap[g.id] = { namaGroup: g.namaGroup, kodeRegistrasi: g.kodeRegistrasi, paketId: g.paketKeberangkatanId };
      });
      setGroups(groupMap);

      // Pre-select first package
      if (kbrList.length > 0) {
        setSelectedPackage(kbrList[0]!.id);
      }
      setLoading(false);
    }
    load();
  }, []);

  // Load completion matrix when package changes
  useEffect(() => {
    if (!selectedPackage) return;
    async function load() {
      setMatrixLoading(true);
      const matrix = await getDocumentCompletionMatrix(selectedPackage);
      setCompletionMatrix(matrix);
      setMatrixLoading(false);
    }
    load();
  }, [selectedPackage]);

  // Load review queue
  const loadReviewQueue = useCallback(async (filter?: string) => {
    setReviewLoading(true);
    const queue = await getDokumenReviewQueue(filter);
    setReviewQueue(queue);
    setReviewLoading(false);
  }, []);

  useEffect(() => {
    if (activeTab === "review") {
      loadReviewQueue(reviewFilter);
    }
  }, [activeTab, reviewFilter, loadReviewQueue]);

  // Reset modal state
  useEffect(() => {
    if (selectedReview) {
      setOcrFields(generateOcrFields(selectedReview.dokumen));
      const md = selectedReview.dokumen.manualData;
      setManualEditData({
        namaLengkap: md?.namaLengkap ?? "",
        nik: md?.nik ?? "",
        nomorPaspor: md?.nomorPaspor ?? "",
        tanggalLahir: md?.tanggalLahir ?? "",
      });
    }
    setShowRevisiInput(false);
    setRevisiNote("");
    setEditMode(false);
    setManualEditMode(false);
    setChangesSaved(false);
  }, [selectedReview]);

  // --- Rekap: Filtered matrix ---
  const filteredMatrix = useMemo(() => {
    if (!statusFilter) return completionMatrix;
    if (statusFilter === "lengkap") return completionMatrix.filter((r) => r.allMandatoryComplete);
    if (statusFilter === "belum_lengkap") return completionMatrix.filter((r) => !r.allMandatoryComplete);
    return completionMatrix;
  }, [completionMatrix, statusFilter]);

  // --- Rekap: Stats ---
  const matrixStats = useMemo(() => {
    const total = completionMatrix.length;
    const lengkap = completionMatrix.filter((r) => r.allMandatoryComplete).length;
    const belum = total - lengkap;
    return { total, lengkap, belum };
  }, [completionMatrix]);

  // --- Rekap: Reminder text ---
  const reminderCount = matrixStats.belum;

  // --- ZIP Download ---
  async function handleZipDownload(docJenis?: string) {
    if (!selectedPackage) return;
    const key = docJenis ?? "semua";
    setZipLoading(key);
    const result = await simulateZipDownload(selectedPackage, docJenis);
    setZipLoading(null);
    if (result.success) {
      window.alert(
        `[MOCK] ZIP siap di-download\n\nFile: ${result.fileName}\nJumlah file: ${result.fileCount}\n\nStruktur:\n${result.structure.slice(0, 10).join("\n")}${result.structure.length > 10 ? `\n... dan ${result.structure.length - 10} file lainnya` : ""}`
      );
    } else {
      window.alert("Paket tidak ditemukan atau tidak ada dokumen.");
    }
  }

  // --- Review: Filtered queue ---
  const filteredQueue = useMemo(() => {
    if (!reviewSearch) return reviewQueue;
    const q = reviewSearch.toLowerCase();
    return reviewQueue.filter(
      (item) =>
        item.jamaah.namaLengkap.toLowerCase().includes(q) ||
        LABEL_DOKUMEN[item.dokumen.jenis]?.toLowerCase().includes(q)
    );
  }, [reviewQueue, reviewSearch]);

  // --- Review: Counts ---
  const reviewCounts = useMemo(() => {
    const semua = reviewQueue.length;
    const pending = reviewQueue.filter((d) => d.dokumen.status === "pending" || d.dokumen.status === "processing").length;
    const ocrFailed = reviewQueue.filter((d) => d.dokumen.dataStatus === "ocr_error").length;
    const lowConf = reviewQueue.filter((d) => d.dokumen.ocrData && d.dokumen.ocrData.confidence < 0.6).length;
    const revisi = reviewQueue.filter((d) => d.dokumen.status === "revisi" || d.dokumen.fileStatus === "revisi").length;
    return { semua, pending, ocrFailed, lowConf, revisi };
  }, [reviewQueue]);

  // --- OCR Field Edit ---
  function handleFieldEdit(key: string, value: string) {
    setOcrFields((prev) => prev.map((f) => (f.key === key ? { ...f, editedValue: value } : f)));
  }

  // --- Manual Data Edit ---
  function handleManualFieldEdit(key: string, value: string) {
    setManualEditData((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSaveManualData() {
    if (!selectedReview) return;
    setUpdating(true);
    await saveManualOcrData(selectedReview.dokumen.id, manualEditData);
    setManualEditMode(false);
    setUpdating(false);
    loadReviewQueue(reviewFilter);
  }

  // --- Document Actions ---
  async function handleApprove() {
    if (!selectedReview) return;
    setUpdating(true);
    await updateDokumenStatus(selectedReview.dokumen.id, "verified");
    setUpdating(false);
    setSelectedReview(null);
    loadReviewQueue(reviewFilter);
  }

  async function handleRevisi() {
    if (!selectedReview) return;
    const note = revisiNote.trim() || "Perlu revisi dokumen";
    setUpdating(true);
    await updateDokumenStatus(selectedReview.dokumen.id, "revisi", note);
    setUpdating(false);
    setSelectedReview(null);
    loadReviewQueue(reviewFilter);
  }

  async function handleTolak() {
    if (!selectedReview) return;
    setUpdating(true);
    await updateDokumenStatus(selectedReview.dokumen.id, "rejected");
    setUpdating(false);
    setSelectedReview(null);
    loadReviewQueue(reviewFilter);
  }

  // --- Render: Loading ---
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Memuat data dokumen...</p>
      </div>
    );
  }

  // --- Render ---
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dokumen Jamaah</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Monitoring & review kelengkapan dokumen seluruh jamaah
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs
        tabs={[
          { value: "rekap", label: "Rekap Dokumen" },
          { value: "review", label: "Review Dokumen", count: reviewCounts.semua },
        ]}
        onTabChange={setActiveTab}
      >
        {() => (
          <>
            {/* ================================================================ */}
            {/* TAB: REKAP DOKUMEN                                                */}
            {/* ================================================================ */}
            {activeTab === "rekap" && (
              <div className="space-y-4">
                {/* Package filter + actions */}
                <div className="flex flex-wrap items-center gap-3">
                  <div className="w-56">
                    <Select
                      options={keberangkatanList.map((k) => ({ value: k.id, label: k.namaPaket }))}
                      placeholder="Pilih Paket Keberangkatan"
                      value={selectedPackage}
                      onChange={(e) => setSelectedPackage(e.target.value)}
                    />
                  </div>
                  <div className="w-40">
                    <Select
                      options={[
                        { value: "", label: "Semua Status" },
                        { value: "lengkap", label: "Lengkap" },
                        { value: "belum_lengkap", label: "Belum Lengkap" },
                      ]}
                      placeholder="Semua Status"
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                    />
                  </div>
                  <div className="flex items-center gap-1.5 ml-auto">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={!selectedPackage || zipLoading === "semua"}
                      onClick={() => handleZipDownload()}
                    >
                      <Download className="mr-1 h-3.5 w-3.5" />
                      {zipLoading === "semua" ? "..." : "Download Semua"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={!selectedPackage || zipLoading === "paspor"}
                      onClick={() => handleZipDownload("paspor")}
                    >
                      <Download className="mr-1 h-3.5 w-3.5" />
                      {zipLoading === "paspor" ? "..." : "Download Semua Paspor"}
                    </Button>
                    <Button
                      size="sm"
                      variant="default"
                      disabled={reminderCount === 0}
                      onClick={() => setShowReminderModal(true)}
                    >
                      <Send className="mr-1 h-3.5 w-3.5" />
                      Kirim Reminder
                    </Button>
                  </div>
                </div>

                {/* Summary cards */}
                <div className="grid grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="pt-4 pb-4">
                      <div className="flex items-center gap-3">
                        <Users className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="text-2xl font-bold">{matrixStats.total}</p>
                          <p className="text-xs text-muted-foreground">Total Jamaah</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4 pb-4">
                      <div className="flex items-center gap-3">
                        <CheckCircle className="h-5 w-5 text-success" />
                        <div>
                          <p className="text-2xl font-bold text-success">{matrixStats.lengkap}</p>
                          <p className="text-xs text-muted-foreground">Dokumen Lengkap</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4 pb-4">
                      <div className="flex items-center gap-3">
                        <AlertTriangle className="h-5 w-5 text-warning" />
                        <div>
                          <p className="text-2xl font-bold text-warning">{matrixStats.belum}</p>
                          <p className="text-xs text-muted-foreground">Belum Lengkap</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Completion Matrix Table */}
                <Card>
                  <CardContent className="p-0">
                    {matrixLoading ? (
                      <div className="flex items-center justify-center py-20">
                        <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
                        <span className="ml-2 text-sm text-muted-foreground">Memuat data...</span>
                      </div>
                    ) : filteredMatrix.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                        <FileText className="h-10 w-10 mb-2" />
                        <p className="text-sm">Tidak ada data jamaah untuk paket ini</p>
                      </div>
                    ) : (
                      <div className="relative w-full overflow-x-auto">
                        <table className="w-full caption-bottom text-sm dense-table">
                          <thead>
                            <tr className="border-b">
                              <th className="h-10 px-3 text-left font-medium text-muted-foreground text-xs">Nama Jamaah</th>
                              <th className="h-10 px-3 text-left font-medium text-muted-foreground text-xs">ID Reg Group</th>
                              {ALL_DOC_JENIS.map((jenis) => (
                                <th key={jenis} className="h-10 px-2 text-center font-medium text-muted-foreground text-xs">
                                  {LABEL_DOKUMEN[jenis] ?? jenis}
                                </th>
                              ))}
                              <th className="h-10 px-3 text-center font-medium text-muted-foreground text-xs">Completion</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredMatrix.map((row) => (
                              <tr key={row.jamaahId} className="border-b hover:bg-muted/50">
                                <td className="px-3 py-2.5">
                                  <p className="text-xs font-medium">{row.namaLengkap}</p>
                                </td>
                                <td className="px-3 py-2.5">
                                  <span className="font-mono text-[10px] text-muted-foreground">{row.kodeRegistrasi}</span>
                                </td>
                                {ALL_DOC_JENIS.map((jenis) => {
                                  const doc = row.dokumen[jenis];
                                  const badge = getDocCellBadge(doc);
                                  return (
                                    <td key={jenis} className="px-2 py-2.5 text-center">
                                      <span
                                        className={cn(
                                          "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium",
                                          badge.variant === "success" && "bg-success/10 text-success",
                                          badge.variant === "warning" && "bg-warning/10 text-warning",
                                          badge.variant === "destructive" && "bg-destructive/10 text-destructive",
                                          badge.variant === "info" && "bg-info/10 text-info",
                                          badge.variant === "muted" && "bg-muted text-muted-foreground"
                                        )}
                                      >
                                        <span className={cn("h-1.5 w-1.5 rounded-full", badge.dotClass)} />
                                        {badge.label}
                                      </span>
                                    </td>
                                  );
                                })}
                                <td className="px-3 py-2.5">
                                  <div className="flex items-center gap-2 min-w-[100px]">
                                    <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                                      <div
                                        className={cn(
                                          "h-full rounded-full transition-all",
                                          row.completionPercentage >= 80 ? "bg-success" : row.completionPercentage >= 50 ? "bg-warning" : "bg-destructive"
                                        )}
                                        style={{ width: `${row.completionPercentage}%` }}
                                      />
                                    </div>
                                    <span className="text-[10px] font-medium text-muted-foreground w-8 text-right">
                                      {row.completionPercentage}%
                                    </span>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {/* ================================================================ */}
            {/* TAB: REVIEW DOKUMEN                                              */}
            {/* ================================================================ */}
            {activeTab === "review" && (
              <div className="space-y-4">
                {/* Filter pills */}
                <div className="flex flex-wrap items-center gap-3">
                  <div className="relative max-w-xs flex-1">
                    <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Cari jamaah atau jenis dokumen..."
                      className="pl-9 h-9 text-sm"
                      value={reviewSearch}
                      onChange={(e) => setReviewSearch(e.target.value)}
                    />
                  </div>
                  <div className="flex items-center gap-1.5">
                    {[
                      { value: "", label: "Semua", count: reviewCounts.semua },
                      { value: "pending", label: "Pending", count: reviewCounts.pending },
                      { value: "ocr_failed", label: "OCR Gagal", count: reviewCounts.ocrFailed },
                      { value: "low_confidence", label: "Confidence Rendah", count: reviewCounts.lowConf },
                      { value: "revisi", label: "Perlu Revisi", count: reviewCounts.revisi },
                    ].map((pill) => (
                      <Button
                        key={pill.value}
                        size="sm"
                        variant={reviewFilter === pill.value ? "default" : "outline"}
                        className="h-7 text-xs"
                        onClick={() => setReviewFilter(pill.value)}
                      >
                        {pill.label}
                        {pill.count > 0 && (
                          <span className="ml-1 text-[10px] opacity-70">({pill.count})</span>
                        )}
                      </Button>
                    ))}
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs ml-auto"
                    onClick={() => loadReviewQueue(reviewFilter)}
                    disabled={reviewLoading}
                  >
                    <RefreshCw className={cn("mr-1 h-3 w-3", reviewLoading && "animate-spin")} />
                    Refresh
                  </Button>
                </div>

                {/* Review Table */}
                <Card>
                  <CardContent className="p-0">
                    {reviewLoading ? (
                      <div className="flex items-center justify-center py-20">
                        <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
                        <span className="ml-2 text-sm text-muted-foreground">Memuat data...</span>
                      </div>
                    ) : filteredQueue.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                        <CheckCircle className="h-10 w-10 mb-2 text-success" />
                        <p className="text-sm">Tidak ada dokumen yang perlu ditinjau</p>
                        <p className="text-xs mt-1">Semua dokumen telah diverifikasi</p>
                      </div>
                    ) : (
                      <div className="relative w-full overflow-x-auto">
                        <table className="w-full caption-bottom text-sm dense-table">
                          <thead>
                            <tr className="border-b">
                              <th className="h-10 px-3 text-left font-medium text-muted-foreground text-xs">Jamaah</th>
                              <th className="h-10 px-3 text-left font-medium text-muted-foreground text-xs">Paket</th>
                              <th className="h-10 px-3 text-left font-medium text-muted-foreground text-xs">Jenis Dokumen</th>
                              <th className="h-10 px-3 text-center font-medium text-muted-foreground text-xs">Status</th>
                              <th className="h-10 px-3 text-center font-medium text-muted-foreground text-xs">OCR</th>
                              <th className="h-10 px-3 text-center font-medium text-muted-foreground text-xs">Confidence</th>
                              <th className="h-10 px-3 text-left font-medium text-muted-foreground text-xs">Validasi</th>
                              <th className="h-10 px-3 text-left font-medium text-muted-foreground text-xs">Upload</th>
                              <th className="h-10 px-3 text-center font-medium text-muted-foreground text-xs">Aksi</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredQueue.map((item) => {
                              const doc = item.dokumen;
                              const jamaah = item.jamaah;
                              const groupInfo = groups[jamaah.groupId];
                              const kbr = keberangkatanList.find((k) => k.id === groupInfo?.paketId);
                              const statusBadge = getDocumentStatusBadge(doc);
                              const ocrLabel = getOcrStatusLabel(doc);
                              const confVariant = getOcrConfidenceVariant(doc.ocrData?.confidence);
                              const priority = getValidationPriority(doc.jenis);
                              const canManualEdit = canEditManualData(doc.jenis, doc.dataStatus);

                              return (
                                <tr key={doc.id} className="border-b hover:bg-muted/50">
                                  <td className="px-3 py-2.5">
                                    <p className="text-xs font-medium">{jamaah.namaLengkap}</p>
                                    <p className="text-[10px] text-muted-foreground font-mono">{jamaah.nomorPeserta}</p>
                                  </td>
                                  <td className="px-3 py-2.5">
                                    <span className="text-xs">{kbr?.namaPaket ?? "-"}</span>
                                  </td>
                                  <td className="px-3 py-2.5">
                                    <span className="text-xs font-medium">{LABEL_DOKUMEN[doc.jenis] ?? doc.jenis}</span>
                                  </td>
                                  <td className="px-3 py-2.5 text-center">
                                    <span
                                      className={cn(
                                        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium",
                                        statusBadge.dotClass.replace("bg-", "bg-") + "/10",
                                        statusBadge.dotClass === "bg-success" && "text-success",
                                        statusBadge.dotClass === "bg-warning" && "text-warning",
                                        statusBadge.dotClass === "bg-destructive" && "text-destructive",
                                        statusBadge.dotClass === "bg-info" && "text-info",
                                        !["bg-success", "bg-warning", "bg-destructive", "bg-info"].includes(statusBadge.dotClass) && "text-muted-foreground bg-muted"
                                      )}
                                    >
                                      <span className={cn("h-1.5 w-1.5 rounded-full", statusBadge.dotClass)} />
                                      {statusBadge.label}
                                    </span>
                                  </td>
                                  <td className="px-3 py-2.5 text-center">
                                    <span className={cn(
                                      "text-[10px] font-medium",
                                      ocrLabel === "Berhasil" && "text-success",
                                      ocrLabel === "Confidence Rendah" && "text-warning",
                                      ocrLabel === "Gagal" && "text-destructive",
                                      ocrLabel === "Manual" && "text-info",
                                      !["Berhasil", "Confidence Rendah", "Gagal", "Manual"].includes(ocrLabel) && "text-muted-foreground"
                                    )}>
                                      {ocrLabel}
                                    </span>
                                  </td>
                                  <td className="px-3 py-2.5 text-center">
                                    {doc.ocrData?.confidence ? (
                                      <Badge variant={confVariant} size="sm">
                                        {Math.round(doc.ocrData.confidence * 100)}%
                                      </Badge>
                                    ) : (
                                      <span className="text-[10px] text-muted-foreground">-</span>
                                    )}
                                  </td>
                                  <td className="px-3 py-2.5">
                                    <Badge variant={priority === "strict" ? "destructive" : "muted"} size="sm">
                                      {priority === "strict" ? "Strict" : "Flexible"}
                                    </Badge>
                                  </td>
                                  <td className="px-3 py-2.5">
                                    <span className="text-[10px] text-muted-foreground">
                                      {doc.uploadedAt ? formatDateShort(doc.uploadedAt) : "-"}
                                    </span>
                                  </td>
                                  <td className="px-3 py-2.5 text-center">
                                    <div className="flex items-center justify-center gap-1">
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-7 text-[10px]"
                                        onClick={() => setSelectedReview(item)}
                                      >
                                        <Eye className="mr-1 h-3 w-3" />
                                        Review
                                      </Button>
                                      {canManualEdit && (
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          className="h-7 text-[10px]"
                                          onClick={() => {
                                            setSelectedReview(item);
                                            setManualEditMode(true);
                                          }}
                                        >
                                          <Edit3 className="mr-1 h-3 w-3" />
                                          Edit
                                        </Button>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
          </>
        )}
      </Tabs>

      {/* ================================================================ */}
      {/* DOCUMENT REVIEW + OCR MODAL                                     */}
      {/* ================================================================ */}
      <Modal
        open={!!selectedReview}
        onClose={() => { setSelectedReview(null); setManualEditMode(false); }}
        title={
          selectedReview
            ? `Review ${LABEL_DOKUMEN[selectedReview.dokumen.jenis] ?? selectedReview.dokumen.jenis} — ${selectedReview.jamaah.namaLengkap}`
            : ""
        }
        size="xl"
      >
        {selectedReview && (() => {
          const doc = selectedReview.dokumen;
          const jamaah = selectedReview.jamaah;
          const priority = getValidationPriority(doc.jenis);
          const pasporExpirySoon = doc.jenis === "paspor" && doc.ocrData?.masaBerlaku
            ? (new Date(doc.ocrData.masaBerlaku).getTime() - Date.now()) < 180 * 24 * 60 * 60 * 1000
            : false;

          return (
            <div className="space-y-4">
              {/* Summary bar */}
              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground bg-muted/30 rounded-md px-3 py-2">
                <span>No. Peserta: <strong className="text-foreground">{jamaah.nomorPeserta}</strong></span>
                <span className="text-muted-foreground/50">|</span>
                <span>Status: <StatusBadge status={doc.status} /></span>
                <span className="text-muted-foreground/50">|</span>
                <span>Upload: {doc.uploadedAt ? formatDate(doc.uploadedAt) : "-"}</span>
                <span className="text-muted-foreground/50">|</span>
                <Badge variant={priority === "strict" ? "destructive" : "muted"} size="sm">
                  Validasi {priority === "strict" ? "Strict" : "Flexible"}
                </Badge>
              </div>

              {/* Strict validation — passport expiry warning */}
              {doc.jenis === "paspor" && pasporExpirySoon && (
                <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-destructive">Paspor Hampir Kadaluarsa</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Masa berlaku paspor kurang dari 6 bulan ({doc.ocrData?.masaBerlaku}). Harap verifikasi dengan teliti.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Strict validation — paspor/pas_foto info */}
              {priority === "strict" && doc.jenis === "paspor" && !pasporExpirySoon && (
                <div className="rounded-md border border-success/20 bg-success/5 p-3">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-success" />
                    <p className="text-xs text-muted-foreground">
                      Paspor dalam masa berlaku — verifikasi manual tetap diperlukan untuk dokumen strict.
                    </p>
                  </div>
                </div>
              )}

              {/* Data Status vs File Status */}
              {(doc.dataStatus || doc.fileStatus) && (
                <div className="flex items-center gap-3 text-xs">
                  <span className="text-muted-foreground">Data:</span>
                  <Badge
                    variant={doc.dataStatus === "valid" || doc.dataStatus === "manual_edit" ? "success" : doc.dataStatus === "ocr_error" ? "destructive" : "warning"}
                    size="sm"
                  >
                    {doc.dataStatus === "valid" ? "Valid" : doc.dataStatus === "manual_edit" ? "Manual Edit" : doc.dataStatus === "ocr_error" ? "OCR Error" : "Pending"}
                  </Badge>
                  <span className="text-muted-foreground">File:</span>
                  <Badge
                    variant={doc.fileStatus === "valid" ? "success" : doc.fileStatus === "rejected" ? "destructive" : "warning"}
                    size="sm"
                  >
                    {doc.fileStatus === "valid" ? "Valid" : doc.fileStatus === "blurry" ? "Blur" : doc.fileStatus === "revisi" ? "Revisi" : doc.fileStatus === "rejected" ? "Ditolak" : "-"}
                  </Badge>
                </div>
              )}

              {/* Two-column: Foto | OCR / Manual Edit */}
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {/* LEFT: Document Preview */}
                <div>
                  <h4 className="text-sm font-semibold mb-2">Foto Dokumen</h4>
                  <div className="flex aspect-[3/4] items-center justify-center rounded-lg border-2 border-dashed bg-muted/20">
                    <div className="text-center">
                      <FileImage className="mx-auto h-14 w-14 text-muted-foreground/30" />
                      <p className="mt-2 text-sm font-medium text-muted-foreground">
                        {LABEL_DOKUMEN[doc.jenis] ?? doc.jenis}
                      </p>
                      <p className="text-xs text-muted-foreground/60 mt-1">{jamaah.namaLengkap}</p>
                      <Button variant="outline" size="sm" className="mt-3" disabled>
                        <FileText className="mr-1.5 h-3.5 w-3.5" />
                        Lihat Full
                      </Button>
                    </div>
                  </div>
                </div>

                {/* RIGHT: OCR Results or Manual Edit */}
                <div>
                  {manualEditMode ? (
                    /* --- Manual Data Edit Mode --- */
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-semibold">Edit Data Manual</h4>
                        <Badge variant="info" size="sm">Flexible — Admin Edit</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Data yang diinput admin tidak akan ditimpa oleh OCR otomatis.
                      </p>
                      <div className="space-y-3">
                        <div>
                          <label className="text-xs font-medium">Nama Lengkap</label>
                          <Input
                            value={manualEditData.namaLengkap}
                            onChange={(e) => handleManualFieldEdit("namaLengkap", e.target.value)}
                            placeholder="Nama sesuai dokumen"
                            className="text-sm mt-0.5"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-medium">NIK</label>
                          <Input
                            value={manualEditData.nik}
                            onChange={(e) => handleManualFieldEdit("nik", e.target.value)}
                            placeholder="Nomor Induk Kependudukan"
                            className="text-sm mt-0.5"
                          />
                        </div>
                        {doc.jenis === "paspor" && (
                          <div>
                            <label className="text-xs font-medium">Nomor Paspor</label>
                            <Input
                              value={manualEditData.nomorPaspor}
                              onChange={(e) => handleManualFieldEdit("nomorPaspor", e.target.value)}
                              placeholder="Nomor paspor"
                              className="text-sm mt-0.5"
                            />
                          </div>
                        )}
                        <div>
                          <label className="text-xs font-medium">Tanggal Lahir</label>
                          <Input
                            value={manualEditData.tanggalLahir}
                            onChange={(e) => handleManualFieldEdit("tanggalLahir", e.target.value)}
                            placeholder="YYYY-MM-DD"
                            className="text-sm mt-0.5"
                          />
                        </div>
                      </div>
                      <div className="flex gap-2 pt-2">
                        <Button
                          size="sm"
                          onClick={handleSaveManualData}
                          disabled={updating}
                        >
                          <Save className="mr-1.5 h-3.5 w-3.5" />
                          {updating ? "Menyimpan..." : "Simpan Data Manual"}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setManualEditMode(false)}
                        >
                          Batal
                        </Button>
                      </div>
                    </div>
                  ) : (
                    /* --- OCR Results --- */
                    <>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-semibold">Hasil Ekstraksi OCR</h4>
                        {ocrFields.length > 0 && !editMode && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs"
                            onClick={() => { setEditMode(true); setChangesSaved(false); }}
                          >
                            <RefreshCw className="mr-1 h-3 w-3" />
                            Edit Hasil OCR
                          </Button>
                        )}
                      </div>

                      {ocrFields.length === 0 ? (
                        <div className="flex h-48 flex-col items-center justify-center rounded-lg border border-dashed gap-3">
                          <p className="text-sm text-muted-foreground">Belum ada data OCR untuk dokumen ini</p>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setOcrProcessing(true);
                              setTimeout(() => {
                                if (selectedReview) setOcrFields(generateOcrFields(selectedReview.dokumen));
                                setOcrProcessing(false);
                              }, 1200);
                            }}
                            disabled={ocrProcessing}
                          >
                            {ocrProcessing ? (
                              <>
                                <RefreshCw className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                                Memproses OCR...
                              </>
                            ) : (
                              <>
                                <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                                Proses OCR
                              </>
                            )}
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                          {ocrFields.map((field) => {
                            const Icon = confidenceIcon(field.confidence);
                            const variant = field.confidence >= 0.85 ? "success" : field.confidence >= 0.7 ? "warning" : "destructive";
                            const isEdited = field.editedValue !== field.ocrValue;
                            return (
                              <div key={field.key} className="space-y-1">
                                <div className="flex items-center justify-between">
                                  <label className="text-xs font-medium text-muted-foreground">{field.label}</label>
                                  <span
                                    className={cn(
                                      "inline-flex items-center gap-1 text-[10px] font-medium rounded-full px-1.5 py-0.5",
                                      variant === "success" && "bg-success/10 text-success",
                                      variant === "warning" && "bg-warning/10 text-warning",
                                      variant === "destructive" && "bg-destructive/10 text-destructive"
                                    )}
                                  >
                                    <Icon className="h-3 w-3" />
                                    {Math.round(field.confidence * 100)}%
                                  </span>
                                </div>
                                {editMode ? (
                                  <div>
                                    <Input
                                      value={field.editedValue}
                                      onChange={(e) => handleFieldEdit(field.key, e.target.value)}
                                      className={cn("text-sm", isEdited && "border-warning ring-1 ring-warning/20")}
                                    />
                                    {isEdited && (
                                      <p className="text-[10px] text-warning mt-0.5">
                                        OCR asli: <span className="line-through text-muted-foreground">{field.ocrValue}</span>
                                      </p>
                                    )}
                                  </div>
                                ) : (
                                  <p className={cn(
                                    "text-sm py-1.5 px-3 rounded-md border border-transparent",
                                    changesSaved && isEdited && "bg-warning/5 border-warning/20"
                                  )}>
                                    {field.editedValue}
                                    {changesSaved && isEdited && (
                                      <span className="ml-1.5 text-[10px] text-warning">(dikoreksi)</span>
                                    )}
                                  </p>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {doc.ocrData && (
                        <div className="mt-3 flex items-center gap-2">
                          <Badge
                            variant={doc.ocrData.confidence >= 0.85 ? "success" : doc.ocrData.confidence >= 0.6 ? "warning" : "destructive"}
                            size="sm"
                          >
                            OCR Confidence: {Math.round(doc.ocrData.confidence * 100)}%
                          </Badge>
                          <span className="text-[10px] text-muted-foreground">
                            Admin adalah validator final
                          </span>
                        </div>
                      )}

                      {/* Simpan Perubahan button */}
                      {editMode && (
                        <div className="mt-3">
                          <Button
                            size="sm"
                            onClick={() => { setEditMode(false); setChangesSaved(true); }}
                            className="w-full"
                          >
                            <Save className="mr-1.5 h-4 w-4" />
                            Simpan Perubahan (Stage Lokal)
                          </Button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Revisi note input */}
              {showRevisiInput && (
                <div className="rounded-md border border-warning/30 bg-warning/5 p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-warning" />
                    <p className="text-sm font-medium">Alasan Revisi</p>
                  </div>
                  <textarea
                    value={revisiNote}
                    onChange={(e) => setRevisiNote(e.target.value)}
                    placeholder="Contoh: paspor blur, foto kurang jelas, nama tidak terbaca..."
                    rows={2}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
                  />
                </div>
              )}

              {/* Action Buttons */}
              {!manualEditMode && (
                <div className="flex flex-wrap gap-2 pt-3 border-t">
                  <Button
                    variant="default"
                    size="sm"
                    disabled={updating}
                    onClick={handleApprove}
                  >
                    <CheckCircle className="mr-1.5 h-4 w-4" />
                    Setujui
                  </Button>

                  {!showRevisiInput ? (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={updating}
                      onClick={() => setShowRevisiInput(true)}
                    >
                      <RefreshCw className="mr-1.5 h-4 w-4" />
                      Minta Revisi
                    </Button>
                  ) : (
                    <Button
                      variant="default"
                      size="sm"
                      disabled={updating || !revisiNote.trim()}
                      onClick={handleRevisi}
                    >
                      <Save className="mr-1.5 h-4 w-4" />
                      Kirim Revisi
                    </Button>
                  )}

                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={updating}
                    onClick={handleTolak}
                  >
                    <XCircle className="mr-1.5 h-4 w-4" />
                    Tolak
                  </Button>

                  {canEditManualData(doc.jenis, doc.dataStatus) && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setManualEditMode(true)}
                    >
                      <Edit3 className="mr-1.5 h-4 w-4" />
                      Edit Data Manual
                    </Button>
                  )}

                  {showRevisiInput && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => { setShowRevisiInput(false); setRevisiNote(""); }}
                    >
                      Batal Revisi
                    </Button>
                  )}
                </div>
              )}
            </div>
          );
        })()}
      </Modal>

      {/* ================================================================ */}
      {/* REMINDER MASSAL MODAL                                            */}
      {/* ================================================================ */}
      <Modal
        open={showReminderModal}
        onClose={() => setShowReminderModal(false)}
        title="Kirim Reminder Massal"
        description={`${reminderCount} jamaah dengan dokumen belum lengkap`}
        size="default"
      >
        <div className="space-y-4">
          <div className="rounded-md border bg-muted/20 p-4">
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {`Assalamu'alaikum Wr. Wb.,

Yth. Bapak/Ibu Jamaah yang kami hormati,

Kami mengingatkan bahwa masih terdapat ${reminderCount} jamaah dengan kelengkapan dokumen yang belum memenuhi syarat. Mohon segera melengkapi dokumen berikut:

- Paspor (masa berlaku minimal 6 bulan)
- Pas Foto (background putih, 4x6)
- Sertifikat Vaksin (lengkap)
- KTP

Kelengkapan dokumen paling lambat 14 hari sebelum keberangkatan. Terima kasih atas perhatian dan kerjasamanya.

Jazakumullah khairan katsiran.

Wassalamu'alaikum Wr. Wb.
Tim Operasional`}
            </p>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowReminderModal(false)}>
              Batal
            </Button>
            <Button
              variant="default"
              onClick={() => {
                window.alert(`[MOCK] Reminder terkirim ke ${reminderCount} jamaah`);
                setShowReminderModal(false);
              }}
            >
              <Send className="h-4 w-4 mr-2" />
              Kirim
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
