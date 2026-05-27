"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Shield,
  FileText,
  CheckCircle,
  Save,
  Image,
  AlertTriangle,
  Loader2,
  RefreshCw,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/Card";
import { Badge } from "@/shared/components/ui/Badge";
import { Button } from "@/shared/components/ui/Button";
import { Input } from "@/shared/components/ui/Input";
import { getJamaahList, getDokumenByJamaah } from "@/services/mock/handlers";
import type { Jamaah, DokumenItem } from "@/shared/types";
import { formatDateShort, cn } from "@/shared/lib/utils";

// --- Constants ---

const LABEL_DOKUMEN: Record<string, string> = {
  paspor: "Paspor",
  pas_foto: "Pas Foto",
  vaksin: "Sertifikat Vaksin",
  ktp: "KTP",
  kk: "Kartu Keluarga",
  akta: "Akta Lahir",
};

function labelJenis(jenis: string): string {
  return LABEL_DOKUMEN[jenis] ?? jenis;
}

// --- Helpers: generate mock OCR data ---

interface OcrReviewData {
  confidence: number;
  fields: { label: string; key: string; ocrValue: string; actualValue: string }[];
}

function generateOcrData(jenis: string, jamaah: Jamaah): OcrReviewData {
  const fieldMap: Record<string, { label: string; key: string }[]> = {
    paspor: [
      { label: "Nama Lengkap", key: "namaLengkap" },
      { label: "Nomor Paspor", key: "nomorPaspor" },
      { label: "Tempat Lahir", key: "tempatLahir" },
      { label: "Tanggal Lahir", key: "tanggalLahir" },
      { label: "Masa Berlaku", key: "masaBerlakuPaspor" },
    ],
    ktp: [
      { label: "Nama Lengkap", key: "namaLengkap" },
      { label: "NIK", key: "nik" },
      { label: "Tempat Lahir", key: "tempatLahir" },
      { label: "Tanggal Lahir", key: "tanggalLahir" },
    ],
    kk: [
      { label: "Nama Lengkap", key: "namaLengkap" },
      { label: "NIK", key: "nik" },
    ],
    vaksin: [
      { label: "Nama Lengkap", key: "namaLengkap" },
      { label: "Nomor Paspor", key: "nomorPaspor" },
    ],
    buku_nikah: [
      { label: "Nama Lengkap", key: "namaLengkap" },
      { label: "Nama Ayah", key: "namaAyah" },
    ],
  };

  const fields = fieldMap[jenis] ?? [
    { label: "Nama Lengkap", key: "namaLengkap" },
  ];

  // Generate OCR values — occasionally introduce an error
  const ocrFields = fields.map((f) => {
    const actual = String((jamaah as any)[f.key] ?? "-");
    // ~30% chance of OCR error (wrong character or truncated)
    const hasError = Math.random() < 0.3;
    let ocrValue = actual;
    if (hasError && actual.length > 3) {
      const pos = Math.floor(actual.length / 2);
      ocrValue =
        actual.slice(0, pos) +
        (actual[pos] === "a" ? "e" : "a") +
        actual.slice(pos + 1);
    }
    return { label: f.label, key: f.key, ocrValue, actualValue: actual };
  });

  const confidence =
    ocrFields.filter((f) => f.ocrValue === f.actualValue).length /
    ocrFields.length;

  return { confidence: 0.7 + confidence * 0.25, fields: ocrFields };
}

// --- Confidence helpers ---

function getConfidencePercent(confidence: number): number {
  return Math.round(confidence * 100);
}

function getConfidenceBadgeClass(confidence: number): string {
  const pct = getConfidencePercent(confidence);
  if (pct >= 85) return "bg-success/10 text-success border-success/20";
  if (pct >= 60) return "bg-warning/10 text-warning border-warning/20";
  return "bg-destructive/10 text-destructive border-destructive/20";
}

function getConfidenceLabel(confidence: number): string {
  const pct = getConfidencePercent(confidence);
  if (pct >= 85) return "Tinggi";
  if (pct >= 60) return "Sedang";
  if (pct >= 30) return "Rendah";
  return "Gagal";
}

// --- Types ---

interface OcrDoc {
  jamaah: Jamaah;
  dokumen: DokumenItem;
  ocr: OcrReviewData;
  edited: Record<string, string>;
}

// --- Component ---

export default function OcrReviewPage() {
  const [allDocs, setAllDocs] = useState<OcrDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeIdx, setActiveIdx] = useState(0);
  const [processingOcr, setProcessingOcr] = useState(false);
  const [ocrFailed, setOcrFailed] = useState(false);

  useEffect(() => {
    async function load() {
      const jamaahList = await getJamaahList();
      const results = await Promise.all(
        jamaahList.map(async (j) => {
          const docs = await getDokumenByJamaah(j.id);
          return docs
            .filter(
              (d) => d.status === "pending" || d.status === "kurang" || d.status === "revisi"
            )
            .map((d) => {
              const ocr = generateOcrData(d.jenis, j);
              const edited: Record<string, string> = {};
              ocr.fields.forEach((f) => {
                edited[f.key] = f.ocrValue;
              });
              return { jamaah: j, dokumen: d, ocr, edited };
            });
        })
      );
      setAllDocs(results.flat());
      setLoading(false);
    }
    load();
  }, []);

  const currentDoc = allDocs[activeIdx] ?? null;

  // Check OCR failure whenever current doc changes
  useEffect(() => {
    if (currentDoc) {
      const pct = getConfidencePercent(currentDoc.ocr.confidence);
      setOcrFailed(pct < 30);
    } else {
      setOcrFailed(false);
    }
  }, [currentDoc]);

  function handleFieldChange(key: string, value: string) {
    setAllDocs((prev) => {
      const next = [...prev];
      if (next[activeIdx]) {
        next[activeIdx] = {
          ...next[activeIdx],
          edited: { ...next[activeIdx].edited, [key]: value },
        };
      }
      return next;
    });
  }

  function handleSave() {
    // In a real app this would call the API
    const doc = allDocs[activeIdx];
    if (!doc) return;
    // Move to next
    if (activeIdx < allDocs.length - 1) {
      setActiveIdx(activeIdx + 1);
    }
  }

  function handleSaveAndApprove() {
    const doc = allDocs[activeIdx];
    if (!doc) return;
    // In a real app: update status to verified and save OCR corrections
    if (activeIdx < allDocs.length - 1) {
      setActiveIdx(activeIdx + 1);
    }
  }

  const handleReprocessOcr = useCallback(async () => {
    if (!currentDoc) return;
    setProcessingOcr(true);
    setOcrFailed(false);

    // Simulate OCR processing delay
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Regenerate OCR data
    const newOcr = generateOcrData(currentDoc.dokumen.jenis, currentDoc.jamaah);

    // 5% chance of OCR failure (very low confidence)
    let finalOcr = newOcr;
    if (Math.random() < 0.05) {
      finalOcr = {
        ...newOcr,
        confidence: 0.1 + Math.random() * 0.15, // 10% - 25%
      };
    }

    const newEdited: Record<string, string> = {};
    finalOcr.fields.forEach((f) => {
      newEdited[f.key] = f.ocrValue;
    });

    setAllDocs((prev) => {
      const next = [...prev];
      if (next[activeIdx]) {
        next[activeIdx] = {
          ...next[activeIdx],
          ocr: finalOcr,
          edited: newEdited,
        };
      }
      return next;
    });

    const pct = getConfidencePercent(finalOcr.confidence);
    if (pct < 30) {
      setOcrFailed(true);
    }

    setProcessingOcr(false);
  }, [currentDoc, activeIdx]);

  const remaining = allDocs.length - activeIdx;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Memuat data OCR...</p>
      </div>
    );
  }

  if (allDocs.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">OCR Review</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Review hasil ekstraksi data dokumen
            </p>
          </div>
        </div>
        <div className="flex h-48 items-center justify-center rounded-lg border-2 border-dashed">
          <div className="text-center">
            <Shield className="mx-auto h-10 w-10 text-muted-foreground/50" />
            <p className="mt-3 text-sm font-medium text-muted-foreground">
              Tidak ada dokumen yang perlu direview
            </p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              Semua data OCR sudah terverifikasi
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">OCR Review</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Review dan koreksi hasil ekstraksi data dokumen secara otomatis
          </p>
        </div>
        <Badge variant="warning" size="lg">
          <AlertTriangle className="mr-1.5 h-3.5 w-3.5" />
          {remaining} dokumen perlu review
        </Badge>
      </div>

      {/* Progress indicator */}
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <span className="font-medium text-foreground">
          Dokumen {activeIdx + 1} dari {allDocs.length}
        </span>
        <div className="flex-1 h-1.5 max-w-md rounded-full bg-muted">
          <div
            className="h-1.5 rounded-full bg-primary transition-all"
            style={{
              width: `${((activeIdx + 1) / allDocs.length) * 100}%`,
            }}
          />
        </div>
      </div>

      {currentDoc && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* LEFT: Document Image Placeholder */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                  Dokumen Upload
                </CardTitle>
                {/* Confidence badge on left card */}
                {!processingOcr && (
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold",
                      getConfidenceBadgeClass(currentDoc.ocr.confidence)
                    )}
                  >
                    OCR: {getConfidencePercent(currentDoc.ocr.confidence)}% &middot; {getConfidenceLabel(currentDoc.ocr.confidence)}
                  </span>
                )}
                {processingOcr && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-muted bg-muted/10 px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Memproses...
                  </span>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex aspect-[3/4] items-center justify-center rounded-lg border-2 border-dashed bg-muted/30">
                <div className="text-center">
                  <Image className="mx-auto h-12 w-12 text-muted-foreground/40" aria-hidden="true" />
                  <p className="mt-3 text-sm font-medium text-muted-foreground">
                    {labelJenis(currentDoc.dokumen.jenis)}
                  </p>
                  <p className="text-xs text-muted-foreground/60 mt-1">
                    {currentDoc.jamaah.namaLengkap}
                  </p>
                  {currentDoc.dokumen.uploadedAt && (
                    <p className="text-xs text-muted-foreground/60 mt-0.5">
                      Upload: {formatDateShort(currentDoc.dokumen.uploadedAt)}
                    </p>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-4"
                    disabled
                  >
                    <FileText className="mr-1.5 h-3.5 w-3.5" />
                    Lihat Dokumen
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* RIGHT: OCR Extracted Data */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                  Data Ekstraksi OCR
                </CardTitle>
                {!processingOcr && (
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold",
                      getConfidenceBadgeClass(currentDoc.ocr.confidence)
                    )}
                  >
                    Confidence: {getConfidencePercent(currentDoc.ocr.confidence)}%
                  </span>
                )}
                {processingOcr && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-muted bg-muted/10 px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Memproses...
                  </span>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* OCR Gagal warning */}
              {ocrFailed && !processingOcr && (
                <div className="flex items-start gap-2 rounded-lg border border-destructive/20 bg-destructive/5 p-3">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-destructive">OCR Gagal</p>
                    <p className="text-xs text-destructive/80 mt-0.5">
                      Ekstraksi data tidak dapat dilakukan. Silakan coba lagi atau upload ulang dokumen.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2 border-destructive/30 text-destructive hover:bg-destructive/10"
                      onClick={handleReprocessOcr}
                      disabled={processingOcr}
                    >
                      <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                      Coba Lagi
                    </Button>
                  </div>
                </div>
              )}

              {/* Jamaah info */}
              <div className="rounded-lg bg-muted/30 p-3 text-sm space-y-1">
                <p>
                  <span className="text-muted-foreground">Jamaah: </span>
                  <span className="font-medium">
                    {currentDoc.jamaah.namaLengkap}
                  </span>
                </p>
                <p>
                  <span className="text-muted-foreground">No. Peserta: </span>
                  <span className="font-medium">
                    {currentDoc.jamaah.nomorPeserta}
                  </span>
                </p>
                <p>
                  <span className="text-muted-foreground">Dokumen: </span>
                  <span className="font-medium">
                    {labelJenis(currentDoc.dokumen.jenis)}
                  </span>
                </p>
              </div>

              {/* Processing spinner overlay */}
              {processingOcr ? (
                <div className="flex flex-col items-center justify-center py-8 gap-3">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">Memproses ulang OCR...</p>
                </div>
              ) : (
                <>
                  {/* Fields - only show if not failed */}
                  {!ocrFailed && (
                    <div className="space-y-3">
                      <p className="text-xs font-medium text-muted-foreground">
                        Koreksi data jika diperlukan:
                      </p>
                      {currentDoc.ocr.fields.map((field) => {
                        const isEdited =
                          currentDoc.edited[field.key] !== field.ocrValue;
                        const matchesActual =
                          currentDoc.edited[field.key] === field.actualValue;

                        return (
                          <div key={field.key} className="space-y-1">
                            <label className="text-xs font-medium text-muted-foreground">
                              {field.label}
                            </label>
                            <div className="flex items-center gap-2">
                              <Input
                                value={currentDoc.edited[field.key] ?? ""}
                                onChange={(e) =>
                                  handleFieldChange(field.key, e.target.value)
                                }
                                className={cn(
                                  "text-sm",
                                  isEdited && "border-warning",
                                  matchesActual && isEdited && "border-success"
                                )}
                              />
                              {isEdited && (
                                <CheckCircle
                                  className={cn(
                                    "h-4 w-4 shrink-0",
                                    matchesActual
                                      ? "text-success"
                                      : "text-warning"
                                  )}
                                />
                              )}
                            </div>
                            {currentDoc.edited[field.key] !== field.actualValue && (
                              <p className="text-[11px] text-muted-foreground">
                                Data sistem:{" "}
                                <span className="font-medium text-foreground">
                                  {field.actualValue}
                                </span>
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex flex-wrap gap-2 pt-2 border-t">
                    <Button
                      size="sm"
                      onClick={handleSaveAndApprove}
                      disabled={processingOcr || ocrFailed}
                    >
                      <CheckCircle className="mr-1.5 h-4 w-4" />
                      Simpan & Setujui
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleSave}
                      disabled={processingOcr || ocrFailed}
                    >
                      <Save className="mr-1.5 h-4 w-4" />
                      Simpan Draft
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={handleReprocessOcr}
                      disabled={processingOcr}
                    >
                      <RefreshCw className={cn("mr-1.5 h-3.5 w-3.5", processingOcr && "animate-spin")} />
                      Proses Ulang OCR
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="ml-auto"
                      onClick={() => {
                        if (activeIdx < allDocs.length - 1) {
                          setActiveIdx(activeIdx + 1);
                        }
                      }}
                      disabled={activeIdx >= allDocs.length - 1 || processingOcr}
                    >
                      Skip
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Navigation dots */}
      <div className="flex items-center justify-center gap-1.5">
        {allDocs.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setActiveIdx(idx)}
            className={cn(
              "h-2 w-2 rounded-full transition-all",
              idx === activeIdx
                ? "bg-primary w-4"
                : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
            )}
          />
        ))}
      </div>
    </div>
  );
}
