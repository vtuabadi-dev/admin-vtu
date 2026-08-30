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

export function getDocumentStatusBadge(doc?: DokumenItem | null): { variant: string; label: string; dotClass: string } {
  if (!doc) {
    return { variant: "pending", label: "Belum", dotClass: "bg-muted-foreground/30" };
  }
  const status = doc.status || "pending";
  return {
    variant: status,
    label: DOC_STATUS_LABELS[status] ?? status,
    dotClass: DOC_STATUS_COLORS[status] ?? "bg-muted-foreground/30",
  };
}

export function getOcrStatusLabel(doc?: DokumenItem | null): string {
  if (!doc) return "Belum Ada";
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

// ============================================================
// DYNAMIC DOCUMENT MAPPING & CONDITIONAL RULES
// ============================================================

export function calculateAge(birthDate: string | Date | null | undefined): number | null {
  if (!birthDate) return null;
  try {
    const d = typeof birthDate === "string" ? new Date(birthDate) : birthDate;
    if (isNaN(d.getTime())) return null;
    const today = new Date();
    let age = today.getFullYear() - d.getFullYear();
    const m = today.getMonth() - d.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < d.getDate())) {
      age--;
    }
    return age >= 0 ? age : null;
  } catch {
    return null;
  }
}

export function isSingleWordName(name: string | null | undefined): boolean {
  if (!name) return false;
  const words = name.trim().split(/\s+/).filter(Boolean);
  return words.length <= 1;
}

export interface DynamicDocRequirement {
  age: number | null;
  isKtpRequired: boolean;
  isLansiaRequired: boolean;
  isDoubleUpgradeRequired: boolean;
  isSingleWordRequired: boolean;
  
  // Status check per category
  pasporValid: boolean;
  pasFotoValid: boolean;
  vaksinValid: boolean;
  ktpValid: boolean;
  lansiaValid: boolean;
  mahramValid: boolean;
  singleWordDocValid: boolean;

  // Counts & percentage
  totalRequired: number;
  totalCompleted: number;
  percentage: number;
  allMandatoryComplete: boolean;
  missingRequirements: string[];
}

export function computeDynamicDocumentRequirements(
  jamaah: {
    namaLengkap?: string;
    tanggalLahir?: string | Date | null;
    dokumen?: Record<string, any> | any[];
  },
  context?: {
    groupPaxCount?: number;
    roomType?: string;
  }
): DynamicDocRequirement {
  // Normalize docs map: mappedDocs[jenis] = DokumenItem
  const mappedDocs: Record<string, any> = {};
  if (Array.isArray(jamaah.dokumen)) {
    jamaah.dokumen.forEach((d: any) => {
      if (d?.jenis) mappedDocs[d.jenis] = d;
    });
  } else if (jamaah.dokumen && typeof jamaah.dokumen === "object") {
    Object.assign(mappedDocs, jamaah.dokumen);
  }

  const isDocValid = (d: any): boolean => {
    return d && (d.status === "verified" || d.status === "lengkap");
  };

  const age = calculateAge(jamaah.tanggalLahir);
  const isKtpRequired = age === null || age >= 17; // Umur >= 17 wajib KTP
  const isLansiaRequired = age !== null && age > 60; // Umur > 60 wajib Surat Lansia
  const isDoubleUpgradeRequired = (context?.groupPaxCount === 2) || (context?.roomType === "double");
  const isSingleWordRequired = isSingleWordName(jamaah.namaLengkap);

  // Status validity
  const pasporValid = isDocValid(mappedDocs.paspor);
  const pasFotoValid = isDocValid(mappedDocs.pas_foto);
  const vaksinValid = isDocValid(mappedDocs.vaksin);
  const ktpValid = !isKtpRequired || isDocValid(mappedDocs.ktp);
  const lansiaValid = !isLansiaRequired || isDocValid(mappedDocs.surat_lansia) || isDocValid(mappedDocs.surat_pernyataan);
  
  // Mahram (KK / Buku Nikah / Akta)
  const hasSupportingDoc = isDocValid(mappedDocs.kk) || isDocValid(mappedDocs.buku_nikah) || isDocValid(mappedDocs.akta);
  const mahramValid = !isDoubleUpgradeRequired || hasSupportingDoc;
  const singleWordDocValid = !isSingleWordRequired || hasSupportingDoc;

  // Build requirements tally
  let totalRequired = 3; // Paspor, Pas Foto, Vaksin selalu wajib
  let totalCompleted = 0;
  const missingRequirements: string[] = [];

  if (pasporValid) totalCompleted++; else missingRequirements.push("Paspor");
  if (pasFotoValid) totalCompleted++; else missingRequirements.push("Pas Foto");
  if (vaksinValid) totalCompleted++; else missingRequirements.push("Sertifikat Vaksin");

  if (isKtpRequired) {
    totalRequired++;
    if (isDocValid(mappedDocs.ktp)) totalCompleted++; else missingRequirements.push("KTP");
  }

  if (isLansiaRequired) {
    totalRequired++;
    if (isDocValid(mappedDocs.surat_lansia) || isDocValid(mappedDocs.surat_pernyataan)) {
      totalCompleted++;
    } else {
      missingRequirements.push("Surat Pernyataan Lansia");
    }
  }

  if (isDoubleUpgradeRequired) {
    totalRequired++;
    if (hasSupportingDoc) {
      totalCompleted++;
    } else {
      missingRequirements.push("Bukti Mahram (KK / Buku Nikah)");
    }
  } else if (isSingleWordRequired) {
    // Jika bukan kamar double tetapi nama 1 suku kata, butuh 1 dokumen tambahan untuk endorsement
    totalRequired++;
    if (hasSupportingDoc) {
      totalCompleted++;
    } else {
      missingRequirements.push("Dokumen Endorsement 1 Kata (KK / Buku Nikah / Akta)");
    }
  }

  const percentage = totalRequired > 0 ? Math.round((totalCompleted / totalRequired) * 100) : 0;
  const allMandatoryComplete = totalCompleted >= totalRequired;

  return {
    age,
    isKtpRequired,
    isLansiaRequired,
    isDoubleUpgradeRequired,
    isSingleWordRequired,
    pasporValid,
    pasFotoValid,
    vaksinValid,
    ktpValid,
    lansiaValid,
    mahramValid,
    singleWordDocValid,
    totalRequired,
    totalCompleted,
    percentage,
    allMandatoryComplete,
    missingRequirements,
  };
}

