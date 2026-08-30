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
  Loader2,
} from "lucide-react";
import { Card, CardContent } from "@/shared/components/ui/Card";
import { StatusBadge, Badge } from "@/shared/components/ui/Badge";
import { Button } from "@/shared/components/ui/Button";
import { Input } from "@/shared/components/ui/Input";
import { Select } from "@/shared/components/ui/Select";
import { SearchableSelect } from "@/shared/components/ui/SearchableSelect";
import { Modal } from "@/shared/components/ui/Modal";
import { Tabs } from "@/shared/components/ui/Tabs";
import {
  getValidationPriority,
  canEditManualData,
  getDocumentStatusBadge,
  getOcrStatusLabel,
  getOcrConfidenceVariant,
  computeDynamicDocumentRequirements,
  type DynamicDocRequirement,
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
  kk: "KK / Buku Nikah",
  akta: "Akta Lahir",
  surat_lansia: "Surat Lansia",
};

const ALL_DOC_JENIS: DokumenJenis[] = ["paspor", "pas_foto", "vaksin", "ktp", "kk", "akta", "surat_lansia"];

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
  if (base.tempatTerbitPaspor) fields.push({ key: "tempatTerbitPaspor", label: "Tempat Terbit", ocrValue: base.tempatTerbitPaspor });
  if (base.tanggalTerbitPaspor) fields.push({ key: "tanggalTerbitPaspor", label: "Tgl. Terbit", ocrValue: base.tanggalTerbitPaspor });
  if (base.tanggalKadaluarsa) fields.push({ key: "tanggalKadaluarsa", label: "Tanggal Kadaluarsa", ocrValue: base.tanggalKadaluarsa });
  else if (base.masaBerlaku) fields.push({ key: "masaBerlaku", label: "Masa Berlaku", ocrValue: base.masaBerlaku });

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

function getDocCellBadge(
  docInfo: { status: string } | undefined,
  jenis: string,
  dynamicReq?: DynamicDocRequirement
) {
  // If doc is verified / lengkap
  if (docInfo && (docInfo.status === "verified" || docInfo.status === "lengkap")) {
    return { variant: "success" as const, label: "Lengkap", dotClass: "bg-success" };
  }
  if (docInfo && docInfo.status === "revisi") {
    return { variant: "warning" as const, label: "Revisi", dotClass: "bg-warning" };
  }
  if (docInfo && docInfo.status === "rejected") {
    return { variant: "destructive" as const, label: "Ditolak", dotClass: "bg-destructive" };
  }
  if (docInfo && docInfo.status === "processing") {
    return { variant: "info" as const, label: "OCR Proses", dotClass: "bg-info" };
  }

  // If not uploaded yet, determine contextual requirement
  if (jenis === "ktp") {
    if (dynamicReq && !dynamicReq.isKtpRequired) {
      return { variant: "muted" as const, label: "N/A (<17 Thn)", dotClass: "bg-muted-foreground/30" };
    }
    return { variant: "muted" as const, label: "Belum", dotClass: "bg-muted-foreground/30" };
  }

  if (jenis === "surat_lansia") {
    if (dynamicReq && !dynamicReq.isLansiaRequired) {
      return { variant: "muted" as const, label: "N/A (≤60 Thn)", dotClass: "bg-muted-foreground/30" };
    }
    return { variant: "warning" as const, label: "Wajib (>60)", dotClass: "bg-warning" };
  }

  if (jenis === "kk") {
    if (dynamicReq?.isDoubleUpgradeRequired) {
      return { variant: "warning" as const, label: "Wajib (Double)", dotClass: "bg-warning" };
    }
    if (dynamicReq?.isSingleWordRequired) {
      return { variant: "warning" as const, label: "Wajib (1 Kata)", dotClass: "bg-warning" };
    }
    return { variant: "muted" as const, label: "Opsional", dotClass: "bg-muted-foreground/30" };
  }

  if (jenis === "akta") {
    if (dynamicReq?.isSingleWordRequired && !dynamicReq?.singleWordDocValid) {
      return { variant: "warning" as const, label: "Pilihan 1 Kata", dotClass: "bg-warning" };
    }
    return { variant: "muted" as const, label: "Opsional", dotClass: "bg-muted-foreground/30" };
  }

  return { variant: "muted" as const, label: "Belum", dotClass: "bg-muted-foreground/30" };
}

import { useOperationalStore } from "@/stores/operational-store";

// ============================================================
// MAIN PAGE
// ============================================================

export default function DokumenPage() {
  const storeKbrList = useOperationalStore((s) => s.keberangkatanList);
  const storeGroupList = useOperationalStore((s) => s.groupList);
  const storeIsLoaded = useOperationalStore((s) => s.isLoaded);

  const [activeTab, setActiveTab] = useState("rekap");
  const [loading, setLoading] = useState(!storeIsLoaded && storeKbrList.length === 0);

  // Shared data - initialized from store if available for 0ms instant display
  const [keberangkatanList, setKeberangkatanList] = useState<Keberangkatan[]>(storeKbrList);
  const [groups, setGroups] = useState<Record<string, { namaGroup: string; kodeRegistrasi: string; paketId: string; createdAt?: string; updatedAt?: string }>>(() => {
    const groupMap: Record<string, { namaGroup: string; kodeRegistrasi: string; paketId: string; createdAt?: string; updatedAt?: string }> = {};
    (storeGroupList ?? []).forEach((g: any) => {
      groupMap[g.id] = {
        namaGroup: g.namaGroup,
        kodeRegistrasi: g.kodeRegistrasi,
        paketId: g.paketKeberangkatanId,
        createdAt: g.createdAt,
        updatedAt: g.updatedAt,
      };
    });
    return groupMap;
  });

  // --- Rekap Tab State ---
  const [selectedPackage, setSelectedPackage] = useState(storeKbrList?.[0]?.id ?? "");
  const [statusFilter, setStatusFilter] = useState("");
  const [completionMatrix, setCompletionMatrix] = useState<any[]>([]);
  const [matrixLoading, setMatrixLoading] = useState(false);
  const [zipLoading, setZipLoading] = useState<string | null>(null);
  const [showReminderModal, setShowReminderModal] = useState(false);

  // --- Review Tab State ---
  const [reviewFilter, setReviewFilter] = useState("");
  const [reviewQueue, setReviewQueue] = useState<any[]>([]);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewSearch, setReviewSearch] = useState("");
  const [selectedReview, setSelectedReview] = useState<any>(null);

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

  // --- Upload Dokumen Tab State ---
  const [uploadSearchId, setUploadSearchId] = useState("");
  const [uploadSearching, setUploadSearching] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [selectedJamaah, setSelectedJamaah] = useState<any>(null);
  const [foundMembers, setFoundMembers] = useState<any[]>([]);
  const [uploadDocuments, setUploadDocuments] = useState<any[]>([]);
  const [uploadPreviews, setUploadPreviews] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState(false);
  const [extractingOcr, setExtractingOcr] = useState<string | null>(null);
  const [ocrResults, setOcrResults] = useState<Record<string, any>>({});
  const [submitting, setSubmitting] = useState(false);
  const [activeDocType, setActiveDocType] = useState<DokumenJenis>("paspor");
  const [savedOcrDocs, setSavedOcrDocs] = useState<Record<string, boolean>>({});
  const [editingOcrDocs, setEditingOcrDocs] = useState<Record<string, boolean>>({});

  // --- Passport Endorsement State ---
  const [pasporHasEndorsement, setPasporHasEndorsement] = useState<boolean | null>(null);
  const [endorsementPreview, setEndorsementPreview] = useState<string>("");
  const [endorsementDoc, setEndorsementDoc] = useState<{ id: string; fileUrl: string } | null>(null);
  const [uploadingEndorsement, setUploadingEndorsement] = useState(false);
  const [extractingEndorsement, setExtractingEndorsement] = useState(false);
  const [endorsementOcrResult, setEndorsementOcrResult] = useState<any>(null);
  const [pasporPageTab, setPasporPageTab] = useState<"hal1" | "hal2">("hal1");

  const storeJamaah = useOperationalStore((s) => s.jamaahList);
  const setStoreJamaah = useOperationalStore((s) => s.setJamaahList);
  const setStoreKbrList = useOperationalStore((s) => s.setKeberangkatanList);
  const setStoreGroupList = useOperationalStore((s) => s.setGroupList);

  // Sync with store if store updates
  useEffect(() => {
    if (storeKbrList && storeKbrList.length > 0 && keberangkatanList.length === 0) {
      setKeberangkatanList(storeKbrList);
      if (!selectedPackage && storeKbrList[0]?.id) setSelectedPackage(storeKbrList[0].id);
    }
  }, [storeKbrList, keberangkatanList.length, selectedPackage]);

  // Load initial data ONLY IF store is not loaded yet
  useEffect(() => {
    if (storeIsLoaded && storeKbrList.length > 0) {
      setLoading(false);
      return; // Sudah ada di memori, tidak perlu unduh ulang ke database!
    }

    async function load() {
      try {
        const [kbrRes, groupsRes] = await Promise.all([
          fetch("/api/keberangkatan"),
          fetch("/api/groups"),
        ]);
        if (kbrRes.ok) {
          const json = await kbrRes.json();
          const kbrList = json.data ?? [];
          setKeberangkatanList(kbrList);
          setStoreKbrList(kbrList);
          if (kbrList.length > 0 && !selectedPackage && kbrList[0]?.id) {
            setSelectedPackage(kbrList[0].id);
          }
        }
        if (groupsRes.ok) {
          const json = await groupsRes.json();
          const groupList = json.data ?? [];
          setStoreGroupList(groupList);
          const groupMap: Record<string, { namaGroup: string; kodeRegistrasi: string; paketId: string; createdAt?: string; updatedAt?: string }> = {};
          groupList.forEach((g: any) => {
            groupMap[g.id] = {
              namaGroup: g.namaGroup,
              kodeRegistrasi: g.kodeRegistrasi,
              paketId: g.paketKeberangkatanId,
              createdAt: g.createdAt,
              updatedAt: g.updatedAt,
            };
          });
          setGroups(groupMap);
        }
      } catch { /* graceful */ }
      setLoading(false);
    }
    load();
  }, [storeIsLoaded, storeKbrList.length, setStoreGroupList, setStoreKbrList]);

  // Build matrix: use memory store when available, only fetch if store is empty
  const buildMatrixFromJamaah = useCallback((allJamaah: any[], pkgId: string, currentGroups: Record<string, any>) => {
    const pkgJamaah = allJamaah.filter((j: any) => {
      const g = currentGroups[j.groupId];
      return g?.paketId === pkgId;
    });

    const groupPaxCounts: Record<string, number> = {};
    pkgJamaah.forEach((j: any) => {
      groupPaxCounts[j.groupId] = (groupPaxCounts[j.groupId] || 0) + 1;
    });

    const sortedJamaah = [...pkgJamaah].sort((a: any, b: any) => {
      const groupA = currentGroups[a.groupId];
      const groupB = currentGroups[b.groupId];

      const timeA = groupA ? new Date(groupA.updatedAt || groupA.createdAt || 0).getTime() : new Date(a.createdAt).getTime();
      const timeB = groupB ? new Date(groupB.updatedAt || groupB.createdAt || 0).getTime() : new Date(b.createdAt).getTime();

      if (timeA !== timeB) return timeA - timeB;

      const numA = parseInt((a.nomorPeserta || a.registrationId || "0").replace(/\D/g, ""), 10) || 0;
      const numB = parseInt((b.nomorPeserta || b.registrationId || "0").replace(/\D/g, ""), 10) || 0;
      if (numA !== numB) return numA - numB;

      const regA = a.registrationId || "";
      const regB = b.registrationId || "";
      if (regA !== regB) return regA.localeCompare(regB);

      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });

    return sortedJamaah.map((j: any) => {
      const g = currentGroups[j.groupId];
      const mappedDocs: Record<string, any> = {};
      (j.dokumen ?? []).forEach((d: any) => {
        mappedDocs[d.jenis] = d;
      });

      const groupPaxCount = groupPaxCounts[j.groupId] || 1;
      const dynamicReq = computeDynamicDocumentRequirements(j, {
        groupPaxCount,
        roomType: j.roomType || j.tipeKamar,
      });

      return {
        jamaahId: j.id,
        namaLengkap: j.namaLengkap,
        nomorPeserta: j.nomorPeserta,
        registrationId: j.registrationId,
        groupId: j.groupId,
        groupName: g?.namaGroup || "-",
        kodeRegistrasi: g?.kodeRegistrasi || "-",
        gender: j.gender,
        tanggalLahir: j.tanggalLahir,
        dokumen: mappedDocs,
        dynamicReq,
        completionPercentage: dynamicReq.percentage,
        progressPercent: dynamicReq.percentage,
        completeCount: dynamicReq.totalCompleted,
        totalCount: dynamicReq.totalRequired,
        allMandatoryComplete: dynamicReq.allMandatoryComplete,
        statusKeseluruhan: dynamicReq.allMandatoryComplete
          ? "lengkap"
          : dynamicReq.totalCompleted > 0
          ? "sebagian"
          : "kosong",
      };
    });
  }, []);

  // Load completion matrix when package changes
  useEffect(() => {
    if (!selectedPackage) return;

    // Jika data jamaah sudah ada di memory store, render matriks langsung 0ms!
    if (storeJamaah && storeJamaah.length > 0) {
      const matrix = buildMatrixFromJamaah(storeJamaah, selectedPackage, groups);
      setCompletionMatrix(matrix);
      setMatrixLoading(false);
      return;
    }

    // Hanya unduh jika store belum memiliki data
    async function load() {
      setMatrixLoading(true);
      try {
        const res = await fetch(`/api/jamaah?groupId=&limit=200`);
        if (res.ok) {
          const json = await res.json();
          const allJamaah = json.data ?? [];
          setStoreJamaah(allJamaah);
          const matrix = buildMatrixFromJamaah(allJamaah, selectedPackage, groups);
          setCompletionMatrix(matrix);
        }
      } catch { /* graceful */ }
      setMatrixLoading(false);
    }
    load();
  }, [selectedPackage, storeJamaah, groups, buildMatrixFromJamaah, setStoreJamaah]);

  // Load review queue
  const loadReviewQueue = useCallback(async (_filter?: string) => {
    setReviewLoading(true);
    try {
      const res = await fetch("/api/dokumen/review");
      if (res.ok) {
        const json = await res.json();
        setReviewQueue(json.data ?? []);
      }
    } catch { /* graceful */ }
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

  // --- Rekap: Package Searchable Options ---
  const packageOptions = useMemo(() => {
    return keberangkatanList.map((k: any) => {
      const kode = k.kode || "";
      const nama = k.namaPaket || k.paketUmroh?.namaPaket || "Paket Keberangkatan";
      const tgl = k.tanggalBerangkat ? formatDate(k.tanggalBerangkat) : "";
      const maskapai = k.maskapai ? `(${k.maskapai})` : "";
      const sPoint = k.startingPoint ? `• ${k.startingPoint}` : "";
      return {
        value: k.id,
        label: kode ? `[${kode}] ${nama}` : nama,
        sublabel: [tgl, maskapai, sPoint].filter(Boolean).join(" "),
      };
    });
  }, [keberangkatanList]);

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
    try {
      const res = await fetch("/api/exports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ exportType: "dokumen", format: "csv", packageId: selectedPackage, filters: docJenis ? { jenis: docJenis } : undefined }),
      });
      if (res.ok) {
        const json = await res.json();
        window.alert(`Export berhasil diantrikan.\n\nJob ID: ${json.data.jobId}\n\nCek status di: /api/exports/${json.data.jobId}`);
      } else {
        window.alert("Gagal membuat export. Silakan coba lagi.");
      }
    } catch {
      window.alert("Gagal membuat export.");
    }
    setZipLoading(null);
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
    try {
      await fetch("/api/dokumen/review", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dokumenId: selectedReview.dokumen.id, manualData: manualEditData, dataStatus: "manual_edit" }),
      });
    } catch { /* graceful */ }
    setManualEditMode(false);
    setUpdating(false);
    loadReviewQueue(reviewFilter);
  }

  // --- Upload Dokumen Tab Functions ---
  async function selectJamaahMember(member: any) {
    setSelectedJamaah(member);
    setUploadDocuments([]);
    setUploadPreviews({});
    setOcrResults({});
    setSavedOcrDocs({});
    setEditingOcrDocs({});
    setActiveDocType("paspor");

    try {
      const docRes = await fetch(`/api/jamaah/${member.id}/dokumen`);
      if (docRes.ok) {
        const docJson = await docRes.json();
        const docs = docJson.data ?? [];
        setUploadDocuments(docs);
        const initialOcr: Record<string, any> = {};
        const savedStatus: Record<string, boolean> = {};
        docs.forEach((d: any) => {
          if (d.manualData || d.ocrData) {
            initialOcr[d.jenis] = d.manualData || d.ocrData;
          }
          if (d.manualData || d.dataStatus === "valid" || d.status === "verified") {
            savedStatus[d.jenis] = true;
          }
        });
        setOcrResults(initialOcr);
        setSavedOcrDocs(savedStatus);
      }
    } catch { /* graceful */ }
  }

  async function handleSearchJamaah() {
    const q = uploadSearchId.trim();
    if (!q) return;
    setUploadSearching(true);
    setUploadError("");
    setSelectedJamaah(null);
    setFoundMembers([]);
    setUploadDocuments([]);
    setUploadPreviews({});
    setOcrResults({});
    setSavedOcrDocs({});
    setEditingOcrDocs({});
    setActiveDocType("paspor");

    try {
      const res = await fetch(`/api/jamaah?search=${encodeURIComponent(q)}&limit=50`);
      if (!res.ok) throw new Error("Gagal mencari data jamaah");
      
      const json = await res.json();
      let jamaahList = json.data ?? [];

      // Fallback search if needed (e.g. without trailing member suffix or with 7-digit ID)
      if (jamaahList.length === 0) {
        const cleanQ = q.replace(/-\d+$/, "");
        const fallbackRes = await fetch(`/api/jamaah?search=${encodeURIComponent(cleanQ)}&limit=50`);
        if (fallbackRes.ok) {
          const fbJson = await fallbackRes.json();
          jamaahList = fbJson.data ?? [];
        }
      }
      
      if (jamaahList.length === 0) {
        setUploadError(`Jamaah atau grup tidak ditemukan dengan kata kunci "${q}"`);
        return;
      }

      // Sort matched members chronologically by registrationId / nomorPeserta (1: Ketua, 2: Istri, 3: Anak)
      const sortedMatches = [...jamaahList].sort((a: any, b: any) => {
        const numA = parseInt((a.nomorPeserta || a.registrationId || "0").replace(/\D/g, ""), 10) || 0;
        const numB = parseInt((b.nomorPeserta || b.registrationId || "0").replace(/\D/g, ""), 10) || 0;
        if (numA !== numB) return numA - numB;
        return (a.registrationId || "").localeCompare(b.registrationId || "");
      });

      setFoundMembers(sortedMatches);
      // Automatically select the first member (Ketua)
      await selectJamaahMember(sortedMatches[0]);
    } catch (err) {
      setUploadError((err as Error).message);
    } finally {
      setUploadSearching(false);
    }
  }

  function handleClearJamaah() {
    setSelectedJamaah(null);
    setFoundMembers([]);
    setUploadDocuments([]);
    setUploadPreviews({});
    setOcrResults({});
    setSavedOcrDocs({});
    setEditingOcrDocs({});
    setUploadSearchId("");
    setUploadError("");
    setActiveDocType("paspor");
    // Reset endorsement state
    setPasporHasEndorsement(null);
    setEndorsementPreview("");
    setEndorsementDoc(null);
    setEndorsementOcrResult(null);
  }

  function handleOcrFieldChange(jenis: string, fieldKey: string, val: string) {
    setOcrResults((prev) => ({
      ...prev,
      [jenis]: {
        ...(prev[jenis] ?? {}),
        [fieldKey]: val,
      },
    }));
  }

  async function handleSaveSingleOcr(jenis: string) {
    if (!selectedJamaah) return;
    const doc = uploadDocuments.find((d) => d.jenis === jenis);
    const ocrData = ocrResults[jenis];
    if (!ocrData) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/dokumen/review", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dokumenId: doc?.id,
          manualData: ocrData,
          dataStatus: "valid",
        }),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.message || "Gagal menyimpan data ke manifest");
      }

      setSavedOcrDocs((prev) => ({ ...prev, [jenis]: true }));
      setEditingOcrDocs((prev) => ({ ...prev, [jenis]: false }));

      // Update store jamaah state
      if (storeJamaah) {
        const updated = storeJamaah.map((j: any) => {
          if (j.id === selectedJamaah.id) {
            return {
              ...j,
              ...(ocrData.namaLengkap ? { namaLengkap: ocrData.namaLengkap } : {}),
              ...(ocrData.nik ? { nik: ocrData.nik } : {}),
              ...(ocrData.nomorPaspor ? { nomorPaspor: ocrData.nomorPaspor } : {}),
              ...(ocrData.tanggalLahir ? { tanggalLahir: ocrData.tanggalLahir } : {}),
              ...(ocrData.tempatLahir ? { tempatLahir: ocrData.tempatLahir } : {}),
            };
          }
          return j;
        });
        setStoreJamaah(updated);
      }

      alert(`Data ${LABEL_DOKUMEN[jenis as DokumenJenis] ?? jenis} berhasil disimpan dan disinkronkan ke Manifest Jamaah!`);
    } catch (err) {
      console.error("Save single OCR error:", err);
      alert((err as Error).message || "Gagal menyimpan data");
    } finally {
      setSubmitting(false);
    }
  }

  function handleCancelEditOcr(jenis: string) {
    setEditingOcrDocs((prev) => ({ ...prev, [jenis]: false }));
    const doc = uploadDocuments.find((d) => d.jenis === jenis);
    if (doc?.manualData || doc?.ocrData) {
      setOcrResults((prev) => ({
        ...prev,
        [jenis]: doc.manualData || doc.ocrData,
      }));
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>, jenis: string) {
    const file = e.target.files?.[0];
    if (!file) return;

    setActiveDocType(jenis as DokumenJenis);

    // Create preview URL
    const previewUrl = URL.createObjectURL(file);
    setUploadPreviews((prev) => ({ ...prev, [jenis]: previewUrl }));

    // Upload file
    uploadFile(file, jenis);
  }

  async function uploadFile(file: File, jenis: string) {
    if (!selectedJamaah) return;
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("jamaahId", selectedJamaah.id);
      formData.append("jenisDokumen", jenis);

      const res = await fetch("/api/dokumen/upload", {
        method: "POST",
        body: formData,
      });

      const json = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(json?.message || "Gagal mengupload file");
      }

      // Update documents list
      const uploadedDoc = json.data.dokumen;
      setUploadDocuments((prev) => {
        const existing = prev.find((d) => d.jenis === jenis);
        if (existing) {
          return prev.map((d) => d.jenis === jenis ? { ...d, fileUrl: json.data.fileUrl, status: "processing" } : d);
        } else {
          return [...prev, uploadedDoc];
        }
      });

      // ── Auto-OCR setelah upload berhasil ──────────────────
      // Trigger ekstraksi otomatis tanpa harus klik tombol
      const fileUrl: string = json.data.fileUrl ?? uploadedDoc?.fileUrl ?? "";
      const dokumenId: string = uploadedDoc?.id ?? "";
      if (fileUrl && dokumenId) {
        // Jalankan OCR di background tanpa block UI upload
        // Jika endorsement mode: gunakan prompt tanpa nama untuk hal.1
        const ocrMode = (jenis === "paspor" && pasporHasEndorsement === true)
          ? "paspor_tanpa_nama"
          : undefined;
        handleExtractOcr(jenis, { fileUrl, id: dokumenId }, ocrMode);
      }
    } catch (err) {
      console.error("Upload error:", err);
      alert(`Gagal mengupload file: ${(err as Error).message}`);
    } finally {
      setUploading(false);
    }
  }

  /**
   * Ekstrak data OCR untuk dokumen tertentu.
   * @param jenis       - Jenis dokumen
   * @param overrideDoc - Opsional: pass dokumen langsung (digunakan saat auto-OCR setelah upload)
   * @param mode        - Opsional: OCR mode khusus (misal paspor_tanpa_nama)
   */
  async function handleExtractOcr(
    jenis: string,
    overrideDoc?: { id: string; fileUrl: string },
    mode?: string,
  ) {
    const doc = overrideDoc ?? uploadDocuments.find((d) => d.jenis === jenis);
    if (!doc?.fileUrl) return;

    setExtractingOcr(jenis);
    try {
      const res = await fetch("/api/dokumen/ocr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dokumenId: doc.id,
          fileUrl: doc.fileUrl,
          jenis,
          mode,
          forceFresh: !overrideDoc, // User manual click "Ekstrak Ulang" always forces fresh OCR
        }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.message || "Gagal mengekstrak data");

      // Jika mode endorsement halaman 1 — simpan di ocrResults[jenis] tanpa nama
      // Nama akan digabung dari endorsementOcrResult saat submit
      setOcrResults((prev) => ({ ...prev, [jenis]: json.data }));
    } catch (err) {
      console.error("OCR error:", err);
      // Tidak alert saat auto-OCR, hanya log — user bisa klik manual jika gagal
      if (!overrideDoc) {
        alert(`Gagal mengekstrak data: ${(err as Error).message}`);
      }
    } finally {
      setExtractingOcr(null);
    }
  }

  /**
   * Upload halaman kedua paspor endorsement nama.
   * File diupload menggunakan endpoint yang sama, kemudian OCR dijalankan
   * dengan mode paspor_endorsement_nama untuk mengambil hanya namaLengkap.
   */
  async function handleEndorsementFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !selectedJamaah) return;

    const previewUrl = URL.createObjectURL(file);
    setEndorsementPreview(previewUrl);
    setUploadingEndorsement(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("jamaahId", selectedJamaah.id);
      // Upload sebagai jenis paspor juga (hanya 1 dokumen paspor per jamaah)
      // Namun di sini kita gunakan API terpisah dengan suffix _endorsement jika perlu
      // Untuk sederhananya, upload dengan jenis paspor (file yang sudah upload tidak di-overwrite karena endpoint check)
      formData.append("jenisDokumen", "paspor");

      const res = await fetch("/api/dokumen/upload", {
        method: "POST",
        body: formData,
      });

      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.message || "Gagal mengupload halaman endorsement");

      const uploadedDoc = json.data.dokumen ?? { id: json.data.id, fileUrl: json.data.fileUrl };
      const fileUrl: string = json.data.fileUrl ?? uploadedDoc?.fileUrl ?? "";
      const dokumenId: string = uploadedDoc?.id ?? "";

      setEndorsementDoc({ id: dokumenId, fileUrl });

      // Auto-OCR halaman endorsement — hanya ekstrak nama
      if (fileUrl && dokumenId) {
        await handleExtractEndorsementOcr({ id: dokumenId, fileUrl });
      }
    } catch (err) {
      console.error("Endorsement upload error:", err);
      alert(`Gagal mengupload halaman endorsement: ${(err as Error).message}`);
    } finally {
      setUploadingEndorsement(false);
    }
  }

  /**
   * OCR khusus halaman endorsement nama (halaman 2).
   * Menggunakan mode paspor_endorsement_nama → ekstrak hanya namaLengkap.
   */
  async function handleExtractEndorsementOcr(overrideDoc?: { id: string; fileUrl: string }) {
    const doc = overrideDoc ?? endorsementDoc;
    if (!doc?.fileUrl) return;

    setExtractingEndorsement(true);
    try {
      const res = await fetch("/api/dokumen/ocr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dokumenId: doc.id,
          fileUrl: doc.fileUrl,
          jenis: "paspor",
          mode: "paspor_endorsement_nama",
        }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.message || "Gagal mengekstrak nama endorsement");

      setEndorsementOcrResult(json.data);

      // Gabungkan nama dari endorsement ke ocrResults paspor
      setOcrResults((prev) => ({
        ...prev,
        paspor: {
          ...(prev.paspor ?? {}),
          namaLengkap: json.data?.namaLengkap ?? prev.paspor?.namaLengkap ?? "",
        },
      }));
    } catch (err) {
      console.error("Endorsement OCR error:", err);
      if (!overrideDoc) {
        alert(`Gagal mengekstrak nama endorsement: ${(err as Error).message}`);
      }
    } finally {
      setExtractingEndorsement(false);
    }
  }

  async function handleSubmitOcrResults() {
    if (!selectedJamaah || Object.keys(ocrResults).length === 0) return;
    setSubmitting(true);

    try {
      // Submit each OCR result
      for (const [jenis, ocrData] of Object.entries(ocrResults)) {
        const doc = uploadDocuments.find((d) => d.jenis === jenis);
        if (!doc) continue;

        await fetch("/api/dokumen/review", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            dokumenId: doc.id,
            manualData: ocrData,
            dataStatus: "valid",
          }),
        });
      }

      alert("Data berhasil disimpan ke manifest jamaah");
      handleClearJamaah();
    } catch (err) {
      console.error("Submit error:", err);
      alert("Gagal menyimpan data");
    } finally {
      setSubmitting(false);
    }
  }

  // --- Document Actions ---
  async function handleApprove() {
    if (!selectedReview) return;
    setUpdating(true);
    try {
      await fetch(`/api/dokumen/${selectedReview.dokumen.id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "verified" }),
      });
    } catch { /* graceful */ }
    setUpdating(false);
    setSelectedReview(null);
    loadReviewQueue(reviewFilter);
  }

  async function handleRevisi() {
    if (!selectedReview) return;
    const note = revisiNote.trim() || "Perlu revisi dokumen";
    setUpdating(true);
    try {
      await fetch(`/api/dokumen/${selectedReview.dokumen.id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "revisi", catatan: note }),
      });
    } catch { /* graceful */ }
    setUpdating(false);
    setSelectedReview(null);
    loadReviewQueue(reviewFilter);
  }

  async function handleTolak() {
    if (!selectedReview) return;
    setUpdating(true);
    try {
      await fetch(`/api/dokumen/${selectedReview.dokumen.id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "rejected" }),
      });
    } catch { /* graceful */ }
    setUpdating(false);
    setSelectedReview(null);
    loadReviewQueue(reviewFilter);
  }

  async function handleGoToUpload(row: any) {
    setUploadSearching(true);
    setUploadError("");
    setSelectedJamaah(null);
    setFoundMembers([]);
    setUploadPreviews({});
    setOcrResults({});

    try {
      const res = await fetch(`/api/jamaah?groupId=${row.groupId}&limit=50`);
      if (!res.ok) throw new Error("Gagal mencari data jamaah");

      const json = await res.json();
      const jamaahList = json.data ?? [];

      if (jamaahList.length === 0) {
        setUploadError("Jamaah tidak ditemukan");
        return;
      }

      const sortedMatches = [...jamaahList].sort((a: any, b: any) => {
        const numA = parseInt((a.nomorPeserta || a.registrationId || "0").replace(/\D/g, ""), 10) || 0;
        const numB = parseInt((b.nomorPeserta || b.registrationId || "0").replace(/\D/g, ""), 10) || 0;
        if (numA !== numB) return numA - numB;
        return (a.registrationId || "").localeCompare(b.registrationId || "");
      });

      setFoundMembers(sortedMatches);
      const targetMember = sortedMatches.find((m: any) => m.id === row.jamaahId) || sortedMatches[0];
      await selectJamaahMember(targetMember);
      
      setActiveTab("upload");
      setUploadSearchId(row.nomorPeserta || row.kodeRegistrasi);
    } catch (err) {
      setUploadError((err as Error).message);
    } finally {
      setUploadSearching(false);
    }
  }

  // --- Render ---
  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dokumen Jamaah</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Monitoring & review kelengkapan dokumen seluruh jamaah
          </p>
        </div>
        {loading && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/40 px-3 py-1.5 rounded-lg border border-border/40">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
            <span>Sinkronisasi data paket...</span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <Tabs
        tabs={[
          { value: "rekap", label: "Rekap Dokumen" },
          { value: "review", label: "Review Dokumen", count: reviewCounts.semua },
          { value: "upload", label: "Upload Dokumen" },
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
                  <div className="w-80 sm:w-96">
                    <SearchableSelect
                      options={packageOptions}
                      placeholder="Pilih Paket Keberangkatan"
                      searchPlaceholder="Cari nama paket, kode, tanggal..."
                      value={selectedPackage}
                      onChange={(val) => setSelectedPackage(val)}
                      size="sm"
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
                              <th className="h-10 px-3 text-center font-medium text-muted-foreground text-xs">Aksi</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredMatrix.map((row) => (
                              <tr key={row.jamaahId} className="border-b hover:bg-muted/50 transition-colors">
                                <td className="px-3 py-2.5">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <p className="text-xs font-semibold text-foreground">{row.namaLengkap}</p>
                                    {row.dynamicReq?.isSingleWordRequired && (
                                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                                        1 Kata
                                      </span>
                                    )}
                                    {row.dynamicReq?.isDoubleUpgradeRequired && (
                                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30">
                                        Double (2 Pax)
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
                                    {row.dynamicReq?.age !== null ? (
                                      row.dynamicReq?.isLansiaRequired ? (
                                        <span className="text-amber-600 dark:text-amber-400 font-medium">Usia: {row.dynamicReq.age} thn (Lansia)</span>
                                      ) : row.dynamicReq?.age < 17 ? (
                                        <span className="text-blue-600 dark:text-blue-400 font-medium">Usia: {row.dynamicReq.age} thn (Anak)</span>
                                      ) : (
                                        <span>Usia: {row.dynamicReq.age} thn</span>
                                      )
                                    ) : null}
                                    <span>• {row.groupName}</span>
                                  </div>
                                </td>
                                <td className="px-3 py-2.5">
                                  <span className="font-mono text-[10px] text-muted-foreground">{row.kodeRegistrasi}</span>
                                </td>
                                {ALL_DOC_JENIS.map((jenis) => {
                                  const doc = row.dokumen[jenis];
                                  const badge = getDocCellBadge(doc, jenis, row.dynamicReq);
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
                                  <div className="flex flex-col gap-1 min-w-[110px]">
                                    <div className="flex items-center justify-between text-[10px]">
                                      <span className="font-semibold text-foreground">{row.completionPercentage}%</span>
                                      <span className="text-muted-foreground font-mono">({row.completeCount}/{row.totalCount})</span>
                                    </div>
                                    <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                                      <div
                                        className={cn(
                                          "h-full rounded-full transition-all",
                                          row.completionPercentage >= 100 ? "bg-success" : row.completionPercentage >= 50 ? "bg-warning" : "bg-destructive"
                                        )}
                                        style={{ width: `${row.completionPercentage}%` }}
                                      />
                                    </div>
                                  </div>
                                </td>
                                <td className="px-3 py-2.5 text-center">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 text-[10px] font-bold gap-1 border-stone-300 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-850"
                                    onClick={() => handleGoToUpload(row)}
                                  >
                                    <Edit3 className="h-3.5 w-3.5" />
                                    Lengkapi Data
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
                                    <span className="text-xs font-medium">
                                      {kbr?.namaPaket || (kbr as any)?.paketUmroh?.namaPaket || (kbr?.kode ? `[${kbr.kode}]` : "-")}
                                    </span>
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

            {/* ================================================================ */}
            {/* TAB: UPLOAD DOKUMEN                                              */}
            {/* ================================================================ */}
            {activeTab === "upload" && (
              <div className="space-y-4">
                {/* Jamaah Search */}
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-3">
                      <div className="flex-1">
                        <label className="text-sm font-medium">Cari Jamaah berdasarkan ID Registrasi</label>
                        <div className="flex gap-2 mt-2">
                          <Input
                            placeholder="Masukkan Kode Grup (GRP-2026-00003), No. Peserta, ID Registrasi, atau Nama Jamaah"
                            value={uploadSearchId}
                            onChange={(e) => setUploadSearchId(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                handleSearchJamaah();
                              }
                            }}
                            className="flex-1"
                          />
                          <Button
                            onClick={handleSearchJamaah}
                            disabled={!uploadSearchId.trim() || uploadSearching}
                          >
                            {uploadSearching ? (
                              <RefreshCw className="h-4 w-4 animate-spin" />
                            ) : (
                              <Search className="h-4 w-4" />
                            )}
                            Cari
                          </Button>
                        </div>
                      </div>
                    </div>
                    {uploadError && (
                      <div className="mt-2 rounded-md bg-destructive/10 p-2 text-sm text-destructive">
                        {uploadError}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Selected Jamaah Info & Rombongan Switcher */}
                {selectedJamaah && (
                  <Card>
                    <CardContent className="pt-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-lg font-bold text-stone-900 dark:text-white">{selectedJamaah.namaLengkap}</h3>
                            <span className="inline-block px-2 py-0.5 text-[10px] font-bold rounded bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300">
                              {selectedJamaah.jenisKelamin === "P" ? "Perempuan" : "Laki-laki"}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            No. Peserta: <span className="font-mono font-semibold">{selectedJamaah.nomorPeserta}</span> | ID Registrasi: <span className="font-mono font-semibold">{selectedJamaah.registrationId}</span>
                          </p>
                        </div>
                        <Button variant="outline" size="sm" onClick={handleClearJamaah}>
                          Ganti Jamaah / Clear
                        </Button>
                      </div>

                      {/* Multi-member switcher for family/group */}
                      {foundMembers.length > 1 && (
                        <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-stone-200 dark:border-stone-800">
                          <span className="text-xs font-bold text-stone-600 dark:text-stone-400 mr-1">Anggota Rombongan ({foundMembers.length} Pax):</span>
                          {foundMembers.map((m: any, idx: number) => {
                            const isCurrent = selectedJamaah.id === m.id;
                            return (
                              <Button
                                key={m.id}
                                type="button"
                                size="sm"
                                variant={isCurrent ? "default" : "outline"}
                                className={cn(
                                  "h-7 text-xs font-semibold rounded-lg transition-all",
                                  isCurrent ? "shadow-sm bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900" : "text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800"
                                )}
                                onClick={() => selectJamaahMember(m)}
                              >
                                {idx + 1}. {m.namaLengkap} {idx === 0 ? "(Ketua)" : ""}
                              </Button>
                            );
                          })}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Document Upload & OCR Master-Detail Side-by-Side (2 Columns Main, 2 Sub-Columns Right) */}
                {selectedJamaah && (
                  <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                    {/* ── LEFT COLUMN (lg:col-span-4): Narrow Document List & Dropzones ── */}
                    <div className="lg:col-span-4 space-y-3">
                      <div className="flex items-center justify-between px-1">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-stone-600 dark:text-stone-400">
                          Daftar Dokumen ({ALL_DOC_JENIS.length})
                        </h4>
                        <span className="text-[11px] text-muted-foreground">Klik 👁️ / baris</span>
                      </div>

                      {ALL_DOC_JENIS.map((jenis) => {
                        const existingDoc = uploadDocuments.find((d) => d.jenis === jenis);
                        const isUploaded = !!existingDoc?.fileUrl;
                        const isSelected = activeDocType === jenis;
                        const isSaved = savedOcrDocs[jenis];

                        return (
                          <div
                            key={jenis}
                            onClick={() => setActiveDocType(jenis)}
                            className={cn(
                              "p-2.5 rounded-xl border transition-all cursor-pointer space-y-2",
                              isSelected
                                ? "border-primary bg-primary/5 shadow-sm ring-1 ring-primary"
                                : "border-stone-200 dark:border-stone-800 bg-card hover:border-stone-400 dark:hover:border-stone-700"
                            )}
                          >
                            {/* Header Item */}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <FileText className={cn("h-4 w-4", isSelected ? "text-primary" : "text-stone-500")} />
                                <span className="text-xs font-bold text-stone-900 dark:text-white">
                                  {LABEL_DOKUMEN[jenis]}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                {extractingOcr === jenis ? (
                                  <Badge variant="info" size="sm" className="text-[10px] h-5">
                                    <RefreshCw className="h-2.5 w-2.5 mr-1 animate-spin" />
                                    OCR...
                                  </Badge>
                                ) : isSaved ? (
                                  <Badge variant="success" size="sm" className="text-[10px] h-5">
                                    <CheckCircle className="h-2.5 w-2.5 mr-1" />
                                    Tersimpan
                                  </Badge>
                                ) : isUploaded ? (
                                  <Badge variant="warning" size="sm" className="text-[10px] h-5">
                                    Terupload
                                  </Badge>
                                ) : (
                                  <Badge variant="muted" size="sm" className="text-[10px] h-5">Belum</Badge>
                                )}
                                <Button
                                  type="button"
                                  size="sm"
                                  variant={isSelected ? "default" : "ghost"}
                                  className="h-6 w-6 p-0 rounded-full"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveDocType(jenis);
                                  }}
                                  title="Lihat Detail & Form OCR"
                                >
                                  <Eye className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </div>

                            {/* Option Endorsement khusus Paspor (Jika Belum Terupload) */}
                            {jenis === "paspor" && !isUploaded && (
                              <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 space-y-1.5" onClick={(e) => e.stopPropagation()}>
                                <p className="text-[11px] font-semibold text-amber-900 dark:text-amber-300">
                                  Endorsement Nama?
                                </p>
                                <div className="flex gap-1.5">
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant={pasporHasEndorsement === false ? "default" : "outline"}
                                    className="h-6 text-[10px] flex-1"
                                    onClick={() => setPasporHasEndorsement(false)}
                                  >
                                    Tidak
                                  </Button>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant={pasporHasEndorsement === true ? "default" : "outline"}
                                    className={cn("h-6 text-[10px] flex-1", pasporHasEndorsement === true && "bg-amber-600 hover:bg-amber-700")}
                                    onClick={() => setPasporHasEndorsement(true)}
                                  >
                                    Ada (2 Hal)
                                  </Button>
                                </div>
                              </div>
                            )}

                            {/* Dropzone Upload Input */}
                            {jenis === "paspor" && pasporHasEndorsement === true ? (
                              <div className="grid grid-cols-2 gap-2" onClick={(e) => e.stopPropagation()}>
                                <div className="relative border border-dashed rounded-lg p-2 text-center hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors">
                                  <input
                                    type="file"
                                    accept="image/jpeg,image/jpg"
                                    className="absolute inset-0 cursor-pointer opacity-0"
                                    onChange={(e) => {
                                      setActiveDocType("paspor");
                                      handleFileSelect(e, "paspor");
                                    }}
                                    disabled={uploading}
                                  />
                                  <p className="text-[10px] font-semibold text-stone-700 dark:text-stone-300">Hal.1 (Data)</p>
                                  <p className="text-[9px] text-muted-foreground">{isUploaded ? "Ganti" : "Upload"}</p>
                                </div>
                                <div className="relative border border-dashed rounded-lg p-2 text-center hover:bg-amber-100/50 dark:hover:bg-amber-950/40 transition-colors border-amber-300">
                                  <input
                                    type="file"
                                    accept="image/jpeg,image/jpg"
                                    className="absolute inset-0 cursor-pointer opacity-0"
                                    onChange={(e) => {
                                      setActiveDocType("paspor");
                                      handleEndorsementFileSelect(e);
                                    }}
                                    disabled={uploadingEndorsement}
                                  />
                                  <p className="text-[10px] font-semibold text-amber-800 dark:text-amber-300">Hal.2 (Nama)</p>
                                  <p className="text-[9px] text-muted-foreground">{endorsementDoc ? "Ganti" : "Upload"}</p>
                                </div>
                              </div>
                            ) : (
                              <div className="relative border border-dashed border-stone-300 dark:border-stone-700 rounded-lg p-2 text-center hover:border-primary hover:bg-primary/5 transition-all">
                                <input
                                  type="file"
                                  accept="image/jpeg,image/jpg"
                                  className="absolute inset-0 cursor-pointer opacity-0 z-10"
                                  onChange={(e) => {
                                    setActiveDocType(jenis);
                                    handleFileSelect(e, jenis);
                                  }}
                                  disabled={uploading}
                                />
                                <div className="flex items-center justify-center gap-1.5 text-stone-600 dark:text-stone-400">
                                  <FileImage className="h-3.5 w-3.5 text-stone-400" />
                                  <span className="text-[11px] font-medium">
                                    {isUploaded ? "Klik / Drag file baru" : `Upload ${LABEL_DOKUMEN[jenis]}`}
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* ── RIGHT COLUMN (lg:col-span-8): Wide Detail Master Card ── */}
                    <div className="lg:col-span-8">
                      <Card className="sticky top-6 shadow-sm border-stone-200 dark:border-stone-800">
                        <CardContent className="pt-4 space-y-4">
                          {/* Card Header */}
                          <div className="flex items-center justify-between pb-3 border-b border-stone-200 dark:border-stone-800">
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="text-base font-bold text-stone-900 dark:text-white">
                                  Detail & Form: {LABEL_DOKUMEN[activeDocType]}
                                </h3>
                                {savedOcrDocs[activeDocType] ? (
                                  <Badge variant="success" size="sm">✓ Tersimpan di Manifest</Badge>
                                ) : uploadDocuments.some((d) => d.jenis === activeDocType) ? (
                                  <Badge variant="warning" size="sm">Belum Disimpan</Badge>
                                ) : (
                                  <Badge variant="muted" size="sm">Belum Upload</Badge>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                Pemeriksaan foto dokumen bersandingan dengan formulir data manifest
                              </p>
                            </div>
                            {uploadDocuments.some((d) => d.jenis === activeDocType) && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 text-xs"
                                onClick={() => handleExtractOcr(activeDocType)}
                                disabled={extractingOcr === activeDocType}
                              >
                                <RefreshCw className={cn("mr-1.5 h-3.5 w-3.5", extractingOcr === activeDocType && "animate-spin")} />
                                {extractingOcr === activeDocType ? "Mengekstrak..." : "Ekstrak Ulang"}
                              </Button>
                            )}
                          </div>

                          {/* ── Side-by-Side Grid (Preview Left, Form Right) ── */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-start">
                            {/* ── SUB-COLUMN 1 (LEFT): Document Image Preview ── */}
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <h4 className="text-xs font-bold text-stone-700 dark:text-stone-300">Foto Dokumen:</h4>
                                {activeDocType === "paspor" && pasporHasEndorsement === true && (
                                  <div className="flex gap-1">
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant={pasporPageTab === "hal1" ? "default" : "outline"}
                                      className="h-6 text-[10px] px-2"
                                      onClick={() => setPasporPageTab("hal1")}
                                    >
                                      Hal.1 (Data)
                                    </Button>
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant={pasporPageTab === "hal2" ? "default" : "outline"}
                                      className="h-6 text-[10px] px-2"
                                      onClick={() => setPasporPageTab("hal2")}
                                    >
                                      Hal.2 (Nama)
                                    </Button>
                                  </div>
                                )}
                              </div>

                              <div className="relative aspect-[3/4] rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-100/50 dark:bg-stone-900 flex items-center justify-center overflow-hidden">
                                {(activeDocType === "paspor" && pasporHasEndorsement === true && pasporPageTab === "hal2" ? (endorsementPreview || endorsementDoc?.fileUrl) : (uploadPreviews[activeDocType] || uploadDocuments.find((d) => d.jenis === activeDocType)?.fileUrl)) ? (
                                  <img
                                    src={(activeDocType === "paspor" && pasporHasEndorsement === true && pasporPageTab === "hal2" ? (endorsementPreview || endorsementDoc?.fileUrl) : (uploadPreviews[activeDocType] || uploadDocuments.find((d) => d.jenis === activeDocType)?.fileUrl)) || ""}
                                    alt={LABEL_DOKUMEN[activeDocType]}
                                    className="max-h-full max-w-full object-contain rounded-md"
                                  />
                                ) : (
                                  <div className="text-center p-6 space-y-2">
                                    <FileImage className="mx-auto h-16 w-16 text-stone-300 dark:text-stone-700" />
                                    <p className="text-xs text-muted-foreground">
                                      Belum ada foto <strong>{LABEL_DOKUMEN[activeDocType]}</strong>.
                                    </p>
                                    <p className="text-[11px] text-stone-400">
                                      Upload file pada daftar di sebelah kiri untuk menampilkan preview.
                                    </p>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* ── SUB-COLUMN 2 (RIGHT): Interactive OCR Form ── */}
                            <div className="space-y-4 rounded-xl border border-stone-200 dark:border-stone-800 p-4 bg-stone-50/50 dark:bg-stone-900/50">
                              <div className="flex items-center justify-between pb-2 border-b border-stone-200 dark:border-stone-800">
                                <h4 className="text-xs font-bold text-stone-800 dark:text-stone-200">
                                  Form Hasil Ekstraksi OCR
                                </h4>
                                {ocrResults[activeDocType]?.confidence && (
                                  <Badge variant={ocrResults[activeDocType].confidence >= 0.7 ? "success" : "warning"} size="sm">
                                    {Math.round(ocrResults[activeDocType].confidence * 100)}% Confidence
                                  </Badge>
                                )}
                              </div>

                              {extractingOcr === activeDocType || (extractingEndorsement && activeDocType === "paspor") ? (
                                <div className="p-6 text-center space-y-3">
                                  <RefreshCw className="mx-auto h-6 w-6 animate-spin text-primary" />
                                  <p className="text-xs text-muted-foreground font-medium">
                                    {extractingEndorsement ? "Mengekstrak nama dari halaman endorsement..." : "Mengekstrak data otomatis menggunakan Gemini AI Studio..."}
                                  </p>
                                </div>
                              ) : ocrResults[activeDocType] || endorsementOcrResult ? (
                                <div className="space-y-3">
                                  {/* Info Endorsement jika ada */}
                                  {endorsementOcrResult?.namaLengkap && activeDocType === "paspor" && (
                                    <div className="p-2 rounded bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-xs">
                                      <span className="font-semibold text-amber-900 dark:text-amber-300">Nama (Endorsement Hal.2): </span>
                                      <span className="font-bold text-amber-950 dark:text-amber-200">{endorsementOcrResult.namaLengkap}</span>
                                    </div>
                                  )}

                                  {/* Field: Nama Lengkap */}
                                  <div className="space-y-1">
                                    <label className="text-[11px] font-semibold text-stone-600 dark:text-stone-400">
                                      Nama Lengkap:
                                    </label>
                                    <Input
                                      value={ocrResults[activeDocType]?.namaLengkap || ""}
                                      onChange={(e) => handleOcrFieldChange(activeDocType, "namaLengkap", e.target.value)}
                                      disabled={savedOcrDocs[activeDocType] && !editingOcrDocs[activeDocType]}
                                      placeholder="NAMA LENGKAP PADA DOKUMEN"
                                      className="h-8 text-xs font-semibold"
                                    />
                                  </div>

                                  {/* Paspor Fields */}
                                  {activeDocType === "paspor" && (
                                    <>
                                      <div className="space-y-1">
                                        <label className="text-[11px] font-semibold text-stone-600 dark:text-stone-400">
                                          Nomor Paspor:
                                        </label>
                                        <Input
                                          value={ocrResults[activeDocType]?.nomorPaspor || ""}
                                          onChange={(e) => handleOcrFieldChange(activeDocType, "nomorPaspor", e.target.value.toUpperCase())}
                                          disabled={savedOcrDocs[activeDocType] && !editingOcrDocs[activeDocType]}
                                          placeholder="X1234567"
                                          className="h-8 text-xs font-mono font-bold text-primary"
                                        />
                                      </div>

                                      <div className="grid grid-cols-2 gap-2">
                                        <div className="space-y-1">
                                          <label className="text-[11px] font-semibold text-stone-600 dark:text-stone-400">
                                            Tempat Terbit:
                                          </label>
                                          <Input
                                            value={ocrResults[activeDocType]?.tempatTerbitPaspor || ""}
                                            onChange={(e) => handleOcrFieldChange(activeDocType, "tempatTerbitPaspor", e.target.value)}
                                            disabled={savedOcrDocs[activeDocType] && !editingOcrDocs[activeDocType]}
                                            placeholder="Kota / Kantor Penerbit"
                                            className="h-8 text-xs"
                                          />
                                        </div>
                                        <div className="space-y-1">
                                          <label className="text-[11px] font-semibold text-stone-600 dark:text-stone-400">
                                            Tgl. Terbit:
                                          </label>
                                          <Input
                                            type="text"
                                            value={ocrResults[activeDocType]?.tanggalTerbitPaspor || ""}
                                            onChange={(e) => handleOcrFieldChange(activeDocType, "tanggalTerbitPaspor", e.target.value)}
                                            disabled={savedOcrDocs[activeDocType] && !editingOcrDocs[activeDocType]}
                                            placeholder="YYYY-MM-DD"
                                            className="h-8 text-xs font-mono"
                                          />
                                        </div>
                                      </div>

                                      <div className="space-y-1">
                                        <div className="flex items-center justify-between">
                                          <label className="text-[11px] font-semibold text-stone-600 dark:text-stone-400">
                                            NIK (Hasil Ekstraksi Paspor / MRZ):
                                          </label>
                                          {ocrResults[activeDocType]?.nik && (
                                            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                                              ✓ Otomatis dari MRZ
                                            </span>
                                          )}
                                        </div>
                                        <Input
                                          value={ocrResults[activeDocType]?.nik || ""}
                                          onChange={(e) => handleOcrFieldChange(activeDocType, "nik", e.target.value)}
                                          disabled={savedOcrDocs[activeDocType] && !editingOcrDocs[activeDocType]}
                                          placeholder="16 digit NIK hasil rekonstruksi paspor"
                                          className="h-8 text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400"
                                        />
                                      </div>

                                      <div className="space-y-1">
                                        <label className="text-[11px] font-semibold text-stone-600 dark:text-stone-400">
                                          Tanggal Kadaluarsa:
                                        </label>
                                        <Input
                                          type="text"
                                          value={ocrResults[activeDocType]?.tanggalKadaluarsa || ""}
                                          onChange={(e) => handleOcrFieldChange(activeDocType, "tanggalKadaluarsa", e.target.value)}
                                          disabled={savedOcrDocs[activeDocType] && !editingOcrDocs[activeDocType]}
                                          placeholder="YYYY-MM-DD"
                                          className={cn(
                                            "h-8 text-xs font-mono font-semibold",
                                            ocrResults[activeDocType]?.tanggalKadaluarsa && (new Date(ocrResults[activeDocType].tanggalKadaluarsa).getTime() - Date.now()) < 180 * 24 * 60 * 60 * 1000 && "text-destructive border-destructive"
                                          )}
                                        />
                                        {ocrResults[activeDocType]?.tanggalKadaluarsa && (new Date(ocrResults[activeDocType].tanggalKadaluarsa).getTime() - Date.now()) < 180 * 24 * 60 * 60 * 1000 && (
                                          <p className="text-[10px] text-destructive font-medium flex items-center gap-1">
                                            <AlertTriangle className="h-3 w-3" /> Paspor kadaluarsa dalam &lt; 6 bulan
                                          </p>
                                        )}
                                      </div>

                                      <div className="grid grid-cols-2 gap-2">
                                        <div className="space-y-1">
                                          <label className="text-[11px] font-semibold text-stone-600 dark:text-stone-400">
                                            Tempat Lahir:
                                          </label>
                                          <Input
                                            value={ocrResults[activeDocType]?.tempatLahir || ""}
                                            onChange={(e) => handleOcrFieldChange(activeDocType, "tempatLahir", e.target.value)}
                                            disabled={savedOcrDocs[activeDocType] && !editingOcrDocs[activeDocType]}
                                            placeholder="Tempat Lahir"
                                            className="h-8 text-xs"
                                          />
                                        </div>
                                        <div className="space-y-1">
                                          <label className="text-[11px] font-semibold text-stone-600 dark:text-stone-400">
                                            Tanggal Lahir:
                                          </label>
                                          <Input
                                            type="text"
                                            value={ocrResults[activeDocType]?.tanggalLahir || ""}
                                            onChange={(e) => handleOcrFieldChange(activeDocType, "tanggalLahir", e.target.value)}
                                            disabled={savedOcrDocs[activeDocType] && !editingOcrDocs[activeDocType]}
                                            placeholder="YYYY-MM-DD"
                                            className="h-8 text-xs font-mono"
                                          />
                                        </div>
                                      </div>
                                    </>
                                  )}

                                  {/* KTP / KK / Akta Fields */}
                                  {(activeDocType === "ktp" || activeDocType === "kk" || activeDocType === "akta") && (
                                    <>
                                      <div className="space-y-1">
                                        <label className="text-[11px] font-semibold text-stone-600 dark:text-stone-400">
                                          NIK (Nomor Induk Kependudukan):
                                        </label>
                                        <Input
                                          value={ocrResults[activeDocType]?.nik || ""}
                                          onChange={(e) => handleOcrFieldChange(activeDocType, "nik", e.target.value)}
                                          disabled={savedOcrDocs[activeDocType] && !editingOcrDocs[activeDocType]}
                                          placeholder="16 digit NIK"
                                          className="h-8 text-xs font-mono font-medium"
                                        />
                                      </div>
                                      <div className="grid grid-cols-2 gap-2">
                                        <div className="space-y-1">
                                          <label className="text-[11px] font-semibold text-stone-600 dark:text-stone-400">
                                            Tempat Lahir:
                                          </label>
                                          <Input
                                            value={ocrResults[activeDocType]?.tempatLahir || ""}
                                            onChange={(e) => handleOcrFieldChange(activeDocType, "tempatLahir", e.target.value)}
                                            disabled={savedOcrDocs[activeDocType] && !editingOcrDocs[activeDocType]}
                                            placeholder="Kota Lahir"
                                            className="h-8 text-xs"
                                          />
                                        </div>
                                        <div className="space-y-1">
                                          <label className="text-[11px] font-semibold text-stone-600 dark:text-stone-400">
                                            Tanggal Lahir:
                                          </label>
                                          <Input
                                            value={ocrResults[activeDocType]?.tanggalLahir || ""}
                                            onChange={(e) => handleOcrFieldChange(activeDocType, "tanggalLahir", e.target.value)}
                                            disabled={savedOcrDocs[activeDocType] && !editingOcrDocs[activeDocType]}
                                            placeholder="YYYY-MM-DD"
                                            className="h-8 text-xs font-mono"
                                          />
                                        </div>
                                      </div>
                                    </>
                                  )}

                                  {/* Action Buttons Section */}
                                  <div className="pt-3 border-t border-stone-200 dark:border-stone-800">
                                    {!savedOcrDocs[activeDocType] ? (
                                      /* Kondisi A: Unsaved Baru Terekstrak */
                                      <Button
                                        type="button"
                                        size="sm"
                                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-9"
                                        onClick={() => handleSaveSingleOcr(activeDocType)}
                                        disabled={submitting}
                                      >
                                        {submitting ? (
                                          <>
                                            <RefreshCw className="mr-1.5 h-4 w-4 animate-spin" />
                                            Menyimpan ke Manifest...
                                          </>
                                        ) : (
                                          <>
                                            <CheckCircle className="mr-1.5 h-4 w-4" />
                                            Simpan Data ke Manifest
                                          </>
                                        )}
                                      </Button>
                                    ) : !editingOcrDocs[activeDocType] ? (
                                      /* Kondisi B: Saved Read-only View */
                                      <div className="flex items-center justify-between gap-2">
                                        <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                                          <CheckCircle className="h-3.5 w-3.5" /> Tersimpan di Manifest
                                        </span>
                                        <Button
                                          type="button"
                                          size="sm"
                                          variant="outline"
                                          className="h-8 text-xs font-semibold"
                                          onClick={() => setEditingOcrDocs((prev) => ({ ...prev, [activeDocType]: true }))}
                                        >
                                          <Edit3 className="mr-1.5 h-3.5 w-3.5 text-primary" />
                                          Edit / Koreksi Data
                                        </Button>
                                      </div>
                                    ) : (
                                      /* Kondisi C: Editing Mode */
                                      <div className="flex items-center gap-2">
                                        <Button
                                          type="button"
                                          size="sm"
                                          className="flex-1 bg-primary text-primary-foreground font-bold h-8 text-xs"
                                          onClick={() => handleSaveSingleOcr(activeDocType)}
                                          disabled={submitting}
                                        >
                                          {submitting ? (
                                            <>
                                              <RefreshCw className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                                              Menyimpan...
                                            </>
                                          ) : (
                                            <>
                                              <Save className="mr-1.5 h-3.5 w-3.5" />
                                              Simpan Perubahan
                                            </>
                                          )}
                                        </Button>
                                        <Button
                                          type="button"
                                          size="sm"
                                          variant="outline"
                                          className="h-8 text-xs"
                                          onClick={() => handleCancelEditOcr(activeDocType)}
                                          disabled={submitting}
                                        >
                                          <XCircle className="mr-1 h-3.5 w-3.5 text-stone-500" />
                                          Batal
                                        </Button>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ) : (
                                <div className="p-6 text-center space-y-2">
                                  <FileText className="mx-auto h-12 w-12 text-stone-300 dark:text-stone-700" />
                                  <p className="text-xs text-muted-foreground italic">
                                    Belum ada data OCR untuk <strong>{LABEL_DOKUMEN[activeDocType]}</strong>.
                                  </p>
                                  <p className="text-[11px] text-stone-400">
                                    Upload file pada daftar di sebelah kiri untuk memulai ekstraksi otomatis.
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                )}

                {/* Submit Button */}
                {selectedJamaah && Object.keys(ocrResults).length > 0 && (
                  <Card>
                    <CardContent className="pt-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-sm font-medium">Simpan Hasil Ekstraksi</h4>
                          <p className="text-xs text-muted-foreground">
                            Data yang diekstrak akan disimpan ke dalam data manifest jamaah.
                          </p>
                        </div>
                        <Button
                          onClick={handleSubmitOcrResults}
                          disabled={submitting}
                        >
                          {submitting ? (
                            <>
                              <RefreshCw className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                              Menyimpan...
                            </>
                          ) : (
                            <>
                              <Save className="mr-1.5 h-3.5 w-3.5" />
                              Simpan ke Manifest
                            </>
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}
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
