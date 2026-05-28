import { Queue } from "bullmq";
import { connectionOptions } from "./connection";
import type {
  QueueJob,
  QueueName,
  JobProgress,
  DocumentOcrJob,
  PaymentReminderJob,
  ExportGeneratorJob,
  NotificationDispatchJob,
  CleanupTempJob,
  BackupDatabaseJob,
  ManifestGenerateJob,
  BroadcastDispatchJob,
} from "@/services/queue/types";

// ── Queue instances (lazy — created on first use) ──────────────

const queues = new Map<QueueName, Queue>();

function getQueue(name: QueueName): Queue {
  const existing = queues.get(name);
  if (existing) return existing;
  const q = new Queue(name, { connection: connectionOptions });
  queues.set(name, q);
  return q;
}

// ── Typed enqueue helpers ──────────────────────────────────────

export async function enqueueDocumentOcr(job: DocumentOcrJob): Promise<{ jobId: string; status: "queued" }> {
  const q = getQueue("document-ocr");
  const j = await q.add("ocr", job.data, {
    attempts: job.maxAttempts || 3,
    backoff: { type: "exponential", delay: job.retryPolicy?.backoffMs || 5000 },
    jobId: job.id,
  });
  return { jobId: j.id || job.id, status: "queued" };
}

export async function enqueuePaymentReminder(job: PaymentReminderJob): Promise<{ jobId: string; status: "queued" }> {
  const q = getQueue("payment-reminder");
  const j = await q.add("reminder", job.data, {
    attempts: job.maxAttempts || 2,
    backoff: { type: "fixed", delay: 30000 },
    jobId: job.id,
  });
  return { jobId: j.id || job.id, status: "queued" };
}

export async function enqueueExportGenerator(job: ExportGeneratorJob): Promise<{ jobId: string; status: "queued" }> {
  const q = getQueue("export-generator");
  const j = await q.add("export", job.data, {
    attempts: job.maxAttempts || 2,
    backoff: { type: "exponential", delay: 10000 },
    jobId: job.id,
  });
  return { jobId: j.id || job.id, status: "queued" };
}

export async function enqueueNotificationDispatch(job: NotificationDispatchJob): Promise<{ jobId: string; status: "queued" }> {
  const q = getQueue("notification-dispatch");
  const j = await q.add("notify", job.data, {
    attempts: job.maxAttempts || 2,
    backoff: { type: "fixed", delay: 5000 },
    jobId: job.id,
  });
  return { jobId: j.id || job.id, status: "queued" };
}

export async function enqueueCleanupTemp(job: CleanupTempJob): Promise<{ jobId: string; status: "queued" }> {
  const q = getQueue("cleanup-temp");
  const j = await q.add("cleanup", job.data, {
    attempts: 1,
    jobId: job.id,
  });
  return { jobId: j.id || job.id, status: "queued" };
}

export async function enqueueBackupDatabase(job: BackupDatabaseJob): Promise<{ jobId: string; status: "queued" }> {
  const q = getQueue("backup-database");
  const j = await q.add("backup", job.data, {
    attempts: job.maxAttempts || 2,
    backoff: { type: "exponential", delay: 30000 },
    jobId: job.id,
  });
  return { jobId: j.id || job.id, status: "queued" };
}

export async function enqueueManifestGenerate(job: ManifestGenerateJob): Promise<{ jobId: string; status: "queued" }> {
  const q = getQueue("manifest-generate");
  const j = await q.add("manifest", job.data, {
    attempts: job.maxAttempts || 2,
    backoff: { type: "exponential", delay: 5000 },
    jobId: job.id,
  });
  return { jobId: j.id || job.id, status: "queued" };
}

export async function enqueueBroadcastDispatch(job: BroadcastDispatchJob): Promise<{ jobId: string; status: "queued" }> {
  const q = getQueue("broadcast-dispatch");
  const j = await q.add("broadcast", job.data, {
    attempts: job.maxAttempts || 3,
    backoff: { type: "exponential", delay: 5000 },
    jobId: job.id,
  });
  return { jobId: j.id || job.id, status: "queued" };
}

// ── Generic enqueue (dispatches by job.queue) ──────────────────

export async function enqueueJob(job: QueueJob): Promise<{ jobId: string; status: "queued" }> {
  switch (job.queue) {
    case "document-ocr":          return enqueueDocumentOcr(job as DocumentOcrJob);
    case "payment-reminder":       return enqueuePaymentReminder(job as PaymentReminderJob);
    case "export-generator":       return enqueueExportGenerator(job as ExportGeneratorJob);
    case "notification-dispatch":  return enqueueNotificationDispatch(job as NotificationDispatchJob);
    case "cleanup-temp":           return enqueueCleanupTemp(job as CleanupTempJob);
    case "backup-database":        return enqueueBackupDatabase(job as BackupDatabaseJob);
    case "manifest-generate":      return enqueueManifestGenerate(job as ManifestGenerateJob);
    case "broadcast-dispatch":     return enqueueBroadcastDispatch(job as BroadcastDispatchJob);
    default: throw new Error(`Unknown queue: ${(job as QueueJob).queue}`);
  }
}

// ── Queue management helpers ───────────────────────────────────

export async function getJobStatus(jobId: string): Promise<"waiting" | "active" | "completed" | "failed" | "delayed"> {
  const queueNames: QueueName[] = ["document-ocr", "payment-reminder", "export-generator", "notification-dispatch", "cleanup-temp", "backup-database", "manifest-generate", "broadcast-dispatch"];
  for (const name of queueNames) {
    try {
      const q = getQueue(name);
      const job = await q.getJob(jobId);
      if (job) {
        const state = await job.getState();
        return state as "waiting" | "active" | "completed" | "failed" | "delayed";
      }
    } catch { /* queue may not exist yet */ }
  }
  return "completed";
}

export async function getQueueStats(queueName: QueueName): Promise<{
  waiting: number; active: number; completed: number; failed: number; delayed: number;
}> {
  try {
    const q = getQueue(queueName);
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      q.getWaitingCount(), q.getActiveCount(), q.getCompletedCount(),
      q.getFailedCount(), q.getDelayedCount(),
    ]);
    return { waiting, active, completed, failed, delayed };
  } catch {
    return { waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0 };
  }
}

export async function updateJobProgress(jobId: string, progress: JobProgress): Promise<void> {
  const queueNames: QueueName[] = ["document-ocr", "payment-reminder", "export-generator", "notification-dispatch", "cleanup-temp", "backup-database", "manifest-generate", "broadcast-dispatch"];
  for (const name of queueNames) {
    try {
      const q = getQueue(name);
      const job = await q.getJob(jobId);
      if (job) {
        await job.updateProgress(progress);
        return;
      }
    } catch { /* queue may not exist yet */ }
  }
}

export async function cancelJob(jobId: string): Promise<{ cancelled: boolean }> {
  const queueNames: QueueName[] = ["document-ocr", "payment-reminder", "export-generator", "notification-dispatch", "cleanup-temp", "backup-database", "manifest-generate", "broadcast-dispatch"];
  for (const name of queueNames) {
    try {
      const q = getQueue(name);
      const job = await q.getJob(jobId);
      if (job) {
        await job.remove();
        return { cancelled: true };
      }
    } catch { /* queue may not exist yet */ }
  }
  return { cancelled: false };
}

export async function retryJob(jobId: string): Promise<{ jobId: string; status: "queued" }> {
  const queueNames: QueueName[] = ["document-ocr", "payment-reminder", "export-generator", "notification-dispatch", "cleanup-temp", "backup-database", "manifest-generate", "broadcast-dispatch"];
  for (const name of queueNames) {
    try {
      const q = getQueue(name);
      const job = await q.getJob(jobId);
      if (job) {
        await job.retry();
        return { jobId, status: "queued" };
      }
    } catch { /* queue may not exist yet */ }
  }
  return { jobId, status: "queued" };
}
