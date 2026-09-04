export function generateManifestNumber(prefix: string, seq: number): string {
  return `${prefix}-MNF-${String(seq).padStart(4, "0")}`;
}

export function generateZipExportName(
  packageCode: string,
  docType: string
): string {
  const date = new Date().toISOString().slice(0, 10);
  return `${packageCode}_${docType}_${date}.zip`;
}

export function syncManifestNumber(
  existingNumbers: string[],
  prefix: string
): string {
  let seq = 1;
  const pattern = new RegExp(`^${prefix}-MNF-(\\d{4})$`);
  for (const num of existingNumbers) {
    const match = num.match(pattern);
    if (match) {
      const n = parseInt(match[1]!, 10);
      if (n >= seq) seq = n + 1;
    }
  }
  return generateManifestNumber(prefix, seq);
}

export function generateDocumentFileName(
  jamaahId: string,
  docType: string,
  ext: string
): string {
  return `${jamaahId}_${docType}_${Date.now()}.${ext}`;
}

export function generateReportFileName(
  reportType: string,
  format: string
): string {
  const date = new Date().toISOString().slice(0, 10);
  return `laporan-${reportType}-${date}.${format}`;
}

/**
 * ADR-0014: Extracts the 4-digit generated sequence number from an ID Register code.
 * E.g. "GRP-2026-0004" -> "0004"
 *      "GRP-2026-00004" -> "0004"
 *      "GRP-2026-00004-1" -> "0004"
 *      "8759301" -> "9301"
 */
export function extractFourDigitRegId(code: string): string {
  if (!code) return "0001";
  let clean = code.trim().replace(/-\d+$/, ""); // remove member suffix e.g. "-1"
  
  const grpMatch = clean.match(/^GRP-\d{4}-(\d+)$/i);
  if (grpMatch && grpMatch[1]) {
    const seq = parseInt(grpMatch[1], 10) || 1;
    return String(seq).padStart(4, "0");
  }

  // If number with 4 or more digits at the end
  const numMatch = clean.match(/(\d+)$/);
  if (numMatch && numMatch[1]) {
    const seq = parseInt(numMatch[1], 10) || 1;
    return String(seq).padStart(4, "0");
  }

  return "0001";
}

/**
 * ADR-0014: Standard document file naming format:
 * [no urut manifest]-[4 digit id reg]-[nama manifest].[ext]
 * E.g. "2-0004-MUHAMMAD ATHALLAH RASYID KUSYUDIHYANSYACH.jpg"
 */
export function formatStandardDocumentFileName(
  nomorManifest: number | string,
  baseRegCode: string,
  namaManifest: string,
  ext: string
): string {
  const cleanExt = ext.replace(/^\./, "").toLowerCase() || "jpg";
  const fourDigit = extractFourDigitRegId(baseRegCode);
  const cleanName = (namaManifest || "JAMAAH")
    .toUpperCase()
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[^A-Z0-9 ]/g, "")
    .trim();

  return `${nomorManifest}-${fourDigit}-${cleanName}.${cleanExt}`;
}

/**
 * ADR-0014: Determines if a package has an assigned Tour Leader (TL).
 * If true, manifest jamaah numbering starts from 2 (1 is reserved for TL).
 * If false, manifest jamaah numbering starts from 1.
 */
export function hasPackageTourLeader(keberangkatan: any): boolean {
  if (!keberangkatan) return false;
  const directTl = keberangkatan.tourLeader;
  if (typeof directTl === "string" && directTl.trim() !== "" && directTl.trim() !== "-") return true;
  if (directTl && typeof directTl === "object" && directTl.nama && directTl.nama.trim() !== "" && directTl.nama.trim() !== "-") return true;

  const meta = keberangkatan.driveFolderIds;
  if (meta && typeof meta === "object") {
    const metaTl = meta.tourLeader;
    if (typeof metaTl === "string" && metaTl.trim() !== "" && metaTl.trim() !== "-") return true;
    if (metaTl && typeof metaTl === "object" && metaTl.nama && metaTl.nama.trim() !== "" && metaTl.nama.trim() !== "-") return true;
  }

  const namaTl = keberangkatan.namaTourLeader;
  if (typeof namaTl === "string" && namaTl.trim() !== "" && namaTl.trim() !== "-") return true;

  return false;
}

