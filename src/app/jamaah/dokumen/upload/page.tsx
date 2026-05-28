"use client";

import { useEffect, useState } from "react";
import {
  Contact as IdCard,
  Fingerprint,
  BookOpen,
  FileText,
  Shield,
  Camera,
  CheckCircle2,
  FileWarning,
  Info,
  AlertTriangle,
} from "lucide-react";
import {
  Card,
  CardContent,
} from "@/shared/components/ui/Card";
import { StatusBadge } from "@/shared/components/ui/Badge";
import { Modal } from "@/shared/components/ui/Modal";
import { formatDate } from "@/shared/lib/utils";
import DocumentUpload from "@/shared/components/DocumentUpload";
import type { DokumenItem, DokumenJenis, UploadResult } from "@/shared/types";

// ============================================================
// Document type metadata
// ============================================================
interface DokumenInfo {
  jenis: DokumenJenis;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  panduan: string;
  format: string;
}

const ALL_DOKUMEN: DokumenInfo[] = [
  {
    jenis: "paspor",
    label: "Paspor",
    icon: IdCard,
    panduan: "Upload scan halaman biodata paspor yang masih berlaku (min. 6 bulan sebelum keberangkatan). Dokumen WAJIB.",
    format: "PDF/JPG/PNG, maks 5MB",
  },
  {
    jenis: "pas_foto",
    label: "Pas Foto",
    icon: Camera,
    panduan: "Upload pas foto terbaru dengan latar putih, ukuran sesuai ketentuan Kemenag (4x6, 3x4, 2x3). Dokumen WAJIB.",
    format: "JPG/PNG, maks 2MB",
  },
  {
    jenis: "vaksin",
    label: "Sertifikat Vaksin",
    icon: Shield,
    panduan: "Upload sertifikat vaksin Meningitis (WAJIB) dan vaksin lain yang direkomendasikan. Dokumen WAJIB.",
    format: "PDF/JPG/PNG, maks 3MB",
  },
  {
    jenis: "ktp",
    label: "KTP",
    icon: Fingerprint,
    panduan: "Upload scan KTP elektronik yang masih berlaku. Dokumen WAJIB.",
    format: "PDF/JPG/PNG, maks 3MB",
  },
  {
    jenis: "kk",
    label: "Kartu Keluarga",
    icon: BookOpen,
    panduan: "Upload scan Kartu Keluarga terbaru. Dokumen OPSIONAL.",
    format: "PDF/JPG/PNG, maks 3MB",
  },
  {
    jenis: "akta",
    label: "Akta Lahir",
    icon: FileText,
    panduan: "Upload scan Akta Kelahiran yang sah. Dokumen OPSIONAL (jika ada).",
    format: "PDF/JPG/PNG, maks 3MB",
  },
];

// ============================================================
// Helper: doc status for display
// ============================================================
function getDocStatus(doc: DokumenItem | undefined): DokumenItem["status"] {
  if (!doc) return "kurang";
  if (doc.status === "lengkap" || doc.status === "verified") return "lengkap";
  return doc.status;
}

function isCompleted(status: string): boolean {
  return status === "lengkap" || status === "verified";
}

// ============================================================
// Upload Page
// ============================================================
export default function DokumenUploadPage() {
  const [dokumenList, setDokumenList] = useState<DokumenItem[]>([]);
  const [showInfoModal, setShowInfoModal] = useState<DokumenInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/jamaah/me/documents");
        if (res.ok) {
          const json = await res.json();
          setDokumenList(json.data ?? []);
        }
      } catch (err) {
        console.error("Failed to load dokumen:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  function getDoc(jenis: DokumenJenis): DokumenItem | undefined {
    return dokumenList.find((d) => d.jenis === jenis);
  }

  function handleUploadComplete(jenis: DokumenJenis, result: UploadResult) {
    setDokumenList((prev) => {
      const idx = prev.findIndex((d) => d.jenis === jenis);
      if (idx >= 0) {
        const updated = [...prev] as DokumenItem[];
        updated[idx] = {
          ...updated[idx],
          status: "lengkap",
          uploadedAt: result.uploadedAt,
        } as DokumenItem;
        return updated;
      }
      const newDoc: DokumenItem = {
        id: `dok-${Date.now()}`,
        jamaahId: "",
        jenis: jenis as DokumenJenis,
        wajib: true,
        status: "lengkap",
        uploadedAt: result.uploadedAt,
      };
      return [...prev, newDoc];
    });
  }

  const completedCount = dokumenList.filter((d) => d.status === "lengkap" || d.status === "verified").length;

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="flex items-center gap-2 text-muted-foreground">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <span className="text-sm">Memuat data...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Upload Dokumen</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Unggah dokumen persyaratan perjalanan umroh/haji Anda
          </p>
        </div>
      </div>

      {/* Progress Bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Progress Dokumen</span>
              <span className="text-muted-foreground">
                {completedCount}/{ALL_DOKUMEN.length} dokumen lengkap
              </span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all duration-500"
                style={{ width: `${(completedCount / ALL_DOKUMEN.length) * 100}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Grid of document cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {ALL_DOKUMEN.map((info) => {
          const doc = getDoc(info.jenis);
          const status = getDocStatus(doc);
          const done = isCompleted(status);
          const DocIcon = info.icon;

          return (
            <Card
              key={info.jenis}
              className={`relative transition-shadow hover:shadow-md ${
                done ? "border-success/30" : status === "revisi" ? "border-destructive/30" : ""
              }`}
            >
              <CardContent className="pt-6">
                {/* Status icon overlay */}
                {done && (
                  <div className="absolute right-3 top-3">
                    <CheckCircle2 className="h-5 w-5 text-success" />
                  </div>
                )}
                {status === "revisi" && (
                  <div className="absolute right-3 top-3">
                    <FileWarning className="h-5 w-5 text-destructive" />
                  </div>
                )}

                {/* Icon & Label */}
                <div className="mb-3 flex items-center gap-3">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                      done
                        ? "bg-success/10 text-success"
                        : status === "revisi"
                          ? "bg-destructive/10 text-destructive"
                          : "bg-muted text-muted-foreground"
                    }`}
                  >
                    <DocIcon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{info.label}</p>
                    <div className="mt-0.5">
                      <StatusBadge status={status} />
                    </div>
                  </div>
                </div>

                {/* Upload info */}
                {doc?.uploadedAt && (
                  <p className="text-xs text-muted-foreground mb-2">
                    Diupload: {formatDate(doc.uploadedAt)}
                  </p>
                )}

                {doc?.catatan && (
                  <div className="mb-2 flex items-start gap-1.5 rounded-md bg-warning/10 p-2">
                    <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0 text-warning" />
                    <p className="text-xs text-warning-foreground">{doc.catatan}</p>
                  </div>
                )}

                {/* Panduan button */}
                <button
                  onClick={() => setShowInfoModal(info)}
                  className="mb-3 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Info className="h-3 w-3" />
                  <span>Lihat panduan upload</span>
                </button>

                {/* DocumentUpload component */}
                <DocumentUpload
                  jenis={info.jenis}
                  label={info.label}
                  existingFile={doc?.fileUrl}
                  onUploadComplete={(result) => handleUploadComplete(info.jenis, result)}
                  maxSizeMB={
                    info.jenis === "pas_foto" ? 2 :
                    info.jenis === "paspor" ? 5 : 3
                  }
                />
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Info Modal */}
      <Modal
        open={!!showInfoModal}
        onClose={() => setShowInfoModal(null)}
        title={showInfoModal ? `Panduan: ${showInfoModal.label}` : ""}
        description="Petunjuk upload dokumen"
        size="sm"
      >
        {showInfoModal && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 rounded-md bg-muted p-3">
              <showInfoModal.icon className="h-6 w-6 text-primary" />
              <div>
                <p className="font-medium text-sm">{showInfoModal.label}</p>
                <p className="text-xs text-muted-foreground">{showInfoModal.format}</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">{showInfoModal.panduan}</p>
            <div className="rounded-md border border-info/20 bg-info/5 p-3">
              <p className="text-xs text-info">
                <strong>Tip:</strong> Pastikan file terbaca dengan jelas, tidak buram, dan seluruh data
                terlihat. Dokumen akan diproses menggunakan teknologi OCR untuk verifikasi otomatis.
              </p>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
