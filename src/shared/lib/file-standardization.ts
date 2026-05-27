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
