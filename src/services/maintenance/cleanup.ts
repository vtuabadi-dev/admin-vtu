// ============================================================
// Auto Cleanup Service — Stub
// Production: cron job via BullMQ repeatable jobs atau node-cron
// Membersihkan file temporary yang sudah melewati batas waktu
// ============================================================

export interface CleanupTarget {
  path: string;
  pattern: string;
  olderThanDays: number;
  description: string;
}

export const CLEANUP_TARGETS: CleanupTarget[] = [
  {
    path: "/storage/temp",
    pattern: "*.tmp",
    olderThanDays: 7,
    description: "File temporary upload dokumen",
  },
  {
    path: "/storage/exports",
    pattern: "export-*.csv",
    olderThanDays: 3,
    description: "File export yang sudah di-download",
  },
  {
    path: "/storage/ocr-cache",
    pattern: "*.png",
    olderThanDays: 14,
    description: "Cache hasil OCR (bisa di-reprocess)",
  },
  {
    path: "/storage/logs",
    pattern: "worker-*.log",
    olderThanDays: 30,
    description: "Log worker lama",
  },
  {
    path: ".next/cache",
    pattern: "*",
    olderThanDays: 1,
    description: "Next.js build cache (rebuild akan regenerate)",
  },
];

export interface CleanupResult {
  target: string;
  filesDeleted: number;
  bytesFreed: number;
  errors: string[];
  durationMs: number;
}

export async function runCleanup(
  dryRun: boolean = false,
): Promise<CleanupResult[]> {
  // Stub — production: fs.readdir + fs.stat + fs.unlink
  return CLEANUP_TARGETS.map((target) => ({
    target: target.description,
    filesDeleted: dryRun ? 0 : Math.floor(Math.random() * 50),
    bytesFreed: dryRun ? 0 : Math.floor(Math.random() * 10_000_000),
    errors: [],
    durationMs: Math.floor(Math.random() * 500) + 50,
  }));
}

export function getCleanupTargets(): CleanupTarget[] {
  return CLEANUP_TARGETS;
}
