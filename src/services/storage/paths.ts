// ── Storage path constants ──────────────────────────────────────
// Organized path helpers untuk Supabase Storage bucket

const BUCKETS = {
  documents: "dokumen-jamaah",
  exports: "exports",
  backups: "backups",
  temp: "temp",
  public: "public",
} as const;

// ── Document storage paths ──────────────────────────────────────

export function dokumenPath(jamaahId: string, jenisDokumen: string, ext: string): string {
  return `dokumen/${jamaahId}/${jenisDokumen}_${Date.now()}.${ext}`;
}

export function dokumenThumbPath(jamaahId: string, jenisDokumen: string): string {
  return `dokumen/${jamaahId}/thumb_${jenisDokumen}.webp`;
}

// ── Export file paths ────────────────────────────────────────────

export function exportFilePath(fileName: string): string {
  return `exports/${fileName}`;
}

export function exportTempPath(fileName: string): string {
  return `temp/exports/${fileName}`;
}

// ── Backup paths ─────────────────────────────────────────────────

export function backupPath(tipe: "full" | "schema" | "data", timestamp: string): string {
  return `backups/${tipe}/${timestamp}.sql.gz`;
}

export function backupLogPath(timestamp: string): string {
  return `backups/logs/${timestamp}.log`;
}

// ── Temp / cleanup paths ─────────────────────────────────────────

export function tempUploadPath(fileName: string): string {
  return `temp/uploads/${fileName}`;
}

export function tempOcrResultPath(dokumenId: string): string {
  return `temp/ocr/${dokumenId}.json`;
}

// ── Public assets ────────────────────────────────────────────────

export function publicAssetPath(asset: string): string {
  return `public/${asset}`;
}

// ── Bucket helpers ───────────────────────────────────────────────

export function getBucketName(kind: keyof typeof BUCKETS): string {
  return BUCKETS[kind];
}

export function buildPublicUrl(bucket: keyof typeof BUCKETS, path: string): string {
  return `/storage/v1/object/public/${BUCKETS[bucket]}/${path}`;
}
