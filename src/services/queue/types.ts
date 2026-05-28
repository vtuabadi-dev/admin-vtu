// ============================================================
// Worker Queue Architecture — Stub untuk implementasi BullMQ
// Queue types & job definitions untuk background processing
// ============================================================

export type QueueName =
  | "document-ocr"
  | "payment-reminder"
  | "export-generator"
  | "notification-dispatch"
  | "cleanup-temp"
  | "backup-database"
  | "manifest-generate"
  | "broadcast-dispatch";

export interface RetryPolicy {
  enabled: boolean;
  maxRetries: number;
  backoffMs: number;
  backoffMultiplier?: number;
}

export interface JobProgress {
  current: number;
  total: number;
  percent: number;
  label?: string;
}

export interface JobResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  completedAt: string;
}

export interface BaseJob {
  id: string;
  queue: QueueName;
  createdAt: string;
  attempts: number;
  maxAttempts: number;
  retryPolicy?: RetryPolicy;
  progress?: JobProgress;
}

// ── OCR Processing ──────────────────────────────────────────

export interface DocumentOcrJob extends BaseJob {
  queue: "document-ocr";
  data: {
    dokumenId: string;
    jamaahId: string;
    fileUrl: string;
    jenisDokumen: string;
    reOcr?: boolean;
  };
}

// ── Payment Reminder ────────────────────────────────────────

export interface PaymentReminderJob extends BaseJob {
  queue: "payment-reminder";
  data: {
    groupId: string;
    invoiceId: string;
    reminderType: "h7" | "h3" | "h1" | "overdue";
    channel: "email" | "whatsapp" | "both";
  };
}

// ── Export Generator ────────────────────────────────────────

export interface ExportGeneratorJob extends BaseJob {
  queue: "export-generator";
  data: {
    exportType: "manifest" | "rooming" | "invoice" | "payment" | "jamaah" | "dokumen";
    format: "csv" | "xlsx" | "pdf";
    packageId?: string;
    filters?: Record<string, string>;
    requestedBy: string;
  };
}

// ── Notification Dispatch ───────────────────────────────────

export interface NotificationDispatchJob extends BaseJob {
  queue: "notification-dispatch";
  data: {
    type: "revision" | "deadline" | "payment_confirmed" | "dokumen_verified" | "reminder";
    targetJamaahIds: string[];
    templateId: string;
    templateVars: Record<string, string>;
  };
}

// ── Cleanup Temp ────────────────────────────────────────────

export interface CleanupTempJob extends BaseJob {
  queue: "cleanup-temp";
  data: {
    targetPath: string;
    olderThanDays: number;
    dryRun: boolean;
  };
}

// ── Backup Database ─────────────────────────────────────────

export interface BackupDatabaseJob extends BaseJob {
  queue: "backup-database";
  data: {
    type: "full" | "schema" | "data";
    targetPath: string;
    compress: boolean;
  };
}

// ── Manifest Generate ───────────────────────────────────────

export interface ManifestGenerateJob extends BaseJob {
  queue: "manifest-generate";
  data: {
    packageId: string;
    format: "siskohat" | "visa" | "blockseat" | "hotel";
    includeUnverified: boolean;
  };
}

// ── Broadcast Dispatch ─────────────────────────────────────

export interface BroadcastDispatchJob extends BaseJob {
  queue: "broadcast-dispatch";
  data: {
    channel: "telegram" | "whatsapp" | "email";
    target: string;
    templateId: string;
    templateVars: Record<string, string>;
    priority: "low" | "normal" | "high";
  };
}

export type QueueJob =
  | DocumentOcrJob
  | PaymentReminderJob
  | ExportGeneratorJob
  | NotificationDispatchJob
  | CleanupTempJob
  | BackupDatabaseJob
  | ManifestGenerateJob
  | BroadcastDispatchJob;

// ── Queue Registration (stub — ganti dengan BullMQ Queue saat production) ──

const QUEUE_NAMES: QueueName[] = [
  "document-ocr",
  "payment-reminder",
  "export-generator",
  "notification-dispatch",
  "cleanup-temp",
  "backup-database",
  "manifest-generate",
  "broadcast-dispatch",
];

export function getRegisteredQueues(): QueueName[] {
  return QUEUE_NAMES;
}

export function getQueueDescription(queue: QueueName): string {
  const map: Record<QueueName, string> = {
    "document-ocr": "OCR processing untuk dokumen jamaah yang diupload",
    "payment-reminder": "Kirim pengingat pembayaran otomatis ke jamaah",
    "export-generator": "Generate file export (CSV/XLSX/PDF) untuk laporan",
    "notification-dispatch": "Dispatch notifikasi via email/WhatsApp ke jamaah",
    "cleanup-temp": "Bersihkan file temporary yang sudah expired",
    "backup-database": "Backup database ke persistent storage",
    "manifest-generate": "Generate manifest SISKOPATUH/Visa/Blockseat/Hotel",
    "broadcast-dispatch": "Dispatch broadcast message via Telegram/WhatsApp/Email",
  };
  return map[queue];
}
