import type { DokumenItem, DokumenJenis, ValidationPriority } from "@/shared/types";
import { DOKUMEN_WAJIB, VALIDATION_LEVEL } from "@/shared/types";

export function computeDocumentCompleteness(docs: DokumenItem[]): {
  percentage: number;
  totalMandatory: number;
  completedMandatory: number;
  totalOptional: number;
  completedOptional: number;
  missingMandatory: string[];
  missingOptional: string[];
  allMandatoryComplete: boolean;
} {
  const wajibSet = new Set(DOKUMEN_WAJIB);
  const completedSet = new Set(
    docs
      .filter((d) => d.status === "lengkap" || d.status === "verified")
      .map((d) => d.jenis)
  );

  const missingMandatory = DOKUMEN_WAJIB.filter((j) => !completedSet.has(j));
  const missingOptional: string[] = [];

  for (const d of docs) {
    if (!wajibSet.has(d.jenis)) {
      const ok = d.status === "lengkap" || d.status === "verified";
      if (!ok) missingOptional.push(d.jenis);
    }
  }

  const totalMandatory = DOKUMEN_WAJIB.length;
  const completedMandatory = totalMandatory - missingMandatory.length;
  const totalOptional = docs.filter((d) => !wajibSet.has(d.jenis)).length;
  const completedOptional = totalOptional - missingOptional.length;

  return {
    percentage: totalMandatory > 0 ? Math.round((completedMandatory / totalMandatory) * 100) : 0,
    totalMandatory,
    completedMandatory,
    totalOptional,
    completedOptional,
    missingMandatory,
    missingOptional,
    allMandatoryComplete: missingMandatory.length === 0,
  };
}

const DOKUMEN_LABEL: Record<string, string> = {
  paspor: "Paspor",
  pas_foto: "Pas Foto",
  vaksin: "Vaksin",
  ktp: "KTP",
  kk: "KK",
  akta: "Akta",
};

export function getDocumentStatusLabel(docs: DokumenItem[]): string {
  const { allMandatoryComplete } = computeDocumentCompleteness(docs);
  const hasRevisi = docs.some((d) => d.status === "revisi");
  if (hasRevisi) return "revisi";
  if (allMandatoryComplete) return "lengkap";
  return "kurang";
}

export function getMissingDocLabels(docs: DokumenItem[]): string[] {
  const { missingMandatory } = computeDocumentCompleteness(docs);
  return missingMandatory.map((j) => DOKUMEN_LABEL[j] ?? j);
}

// ============================================================
// VALIDATION PRIORITY & OCR WORKFLOW
// ============================================================

export function getValidationPriority(jenis: DokumenJenis): ValidationPriority {
  return VALIDATION_LEVEL[jenis] ?? "flexible";
}

export function isOcrRetryNeeded(_doc: DokumenItem): boolean {
  // OCR diproses oleh service external — tidak ada retry dari VTU
  return false;
}

export function canEditManualData(jenis: DokumenJenis, dataStatus?: string): boolean {
  // KTP, KK, Akta are flexible — admin can always edit manually
  const priority = getValidationPriority(jenis);
  if (priority === "flexible") return true;
  // Passport, Pas Foto: only if OCR failed
  return dataStatus === "ocr_error" || dataStatus === "pending";
}

export function getCompletionPercentage(docs: DokumenItem[]): number {
  const { percentage } = computeDocumentCompleteness(docs);
  return percentage;
}

const DOC_STATUS_COLORS: Record<string, string> = {
  verified: "bg-success",
  lengkap: "bg-success",
  pending: "bg-muted-foreground/30",
  kurang: "bg-muted-foreground/30",
  revisi: "bg-warning",
  processing: "bg-blue-500",
  rejected: "bg-destructive",
};

const DOC_STATUS_LABELS: Record<string, string> = {
  verified: "Terverifikasi",
  lengkap: "Lengkap",
  pending: "Belum Upload",
  kurang: "Belum Upload",
  revisi: "Revisi",
  processing: "OCR Proses",
  rejected: "Ditolak",
};

export function getDocumentStatusBadge(doc: DokumenItem): { variant: string; label: string; dotClass: string } {
  const status = doc.status;
  return {
    variant: status,
    label: DOC_STATUS_LABELS[status] ?? status,
    dotClass: DOC_STATUS_COLORS[status] ?? "bg-muted-foreground/30",
  };
}

export function getOcrStatusLabel(doc: DokumenItem): string {
  if (doc.dataStatus === "manual_edit") return "Manual";
  if (doc.dataStatus === "pending") return "Pending External";
  if (!doc.ocrData) return "External OCR";
  if (doc.ocrData.confidence >= 0.85) return "Terverifikasi";
  if (doc.ocrData.confidence >= 0.6) return "Confidence Rendah";
  return "Pending";
}

export function getOcrConfidenceVariant(confidence?: number): "success" | "warning" | "destructive" {
  if (!confidence) return "destructive";
  if (confidence >= 0.85) return "success";
  if (confidence >= 0.6) return "warning";
  return "destructive";
}
