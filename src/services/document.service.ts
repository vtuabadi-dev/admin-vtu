import type { DocumentStats, DocumentFilterParams } from "./contracts";

interface DocumentCompletionRow {
  jamaahId: string;
  namaLengkap: string;
  kodeRegistrasi: string;
  allMandatoryComplete: boolean;
  completionPercentage: number;
  dokumen: Record<string, { status?: string }>;
}

export function computeDocumentStats(
  matrix: DocumentCompletionRow[]
): DocumentStats {
  const lengkap = matrix.filter((r) => r.allMandatoryComplete).length;
  return {
    total: matrix.length,
    lengkap,
    belum: matrix.length - lengkap,
    completionRate: matrix.length > 0 ? lengkap / matrix.length : 0,
  };
}

export function filterJamaahByDocumentStatus(
  matrix: DocumentCompletionRow[],
  params: DocumentFilterParams
): DocumentCompletionRow[] {
  let result = matrix;

  if (params.status === "lengkap") {
    result = result.filter((r) => r.allMandatoryComplete);
  } else if (params.status === "belum_lengkap") {
    result = result.filter((r) => !r.allMandatoryComplete);
  }

  if (params.search) {
    const q = params.search.toLowerCase();
    result = result.filter(
      (r) =>
        r.namaLengkap.toLowerCase().includes(q) ||
        r.kodeRegistrasi.toLowerCase().includes(q)
    );
  }

  return result;
}
