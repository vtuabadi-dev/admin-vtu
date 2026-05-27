// Worker Queue — Real BullMQ implementation with stub fallback
// Mencoba koneksi Redis & BullMQ. Jika Redis tidak tersedia (dev tanpa Docker),
// fallback ke stub implementation.

export * from "./types";

// ── Lazy import real producer ──────────────────────────────────

let realProducer: typeof import("@/server/queue") | null = null;
let initAttempted = false;

async function getProducer() {
  if (realProducer) return realProducer;
  if (initAttempted) return null;
  initAttempted = true;
  try {
    realProducer = await import("@/server/queue");
    return realProducer;
  } catch {
    console.warn("[Queue] BullMQ producer not available, using stub");
    return null;
  }
}

// ── Public API (same signatures as before) ─────────────────────

export async function enqueueJob(job: import("./types").QueueJob): Promise<{ jobId: string; status: "queued" }> {
  const prod = await getProducer();
  if (prod) {
    try { return await prod.enqueueJob(job); } catch { /* fall through */ }
  }
  return { jobId: `job-${Date.now()}`, status: "queued" };
}

export async function getJobStatus(jobId: string): Promise<"waiting" | "active" | "completed" | "failed" | "delayed"> {
  const prod = await getProducer();
  if (prod) {
    try { return await prod.getJobStatus(jobId); } catch { /* fall through */ }
  }
  return "completed";
}

export async function getQueueStats(queueName: import("./types").QueueName): Promise<{
  waiting: number; active: number; completed: number; failed: number; delayed: number;
}> {
  const prod = await getProducer();
  if (prod) {
    try { return await prod.getQueueStats(queueName); } catch { /* fall through */ }
  }
  return { waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0 };
}

export async function updateJobProgress(
  jobId: string,
  progress: import("./types").JobProgress
): Promise<void> {
  const prod = await getProducer();
  if (prod) {
    try { await prod.updateJobProgress(jobId, progress); } catch { /* fall through */ }
  }
}

export async function cancelJob(jobId: string): Promise<{ cancelled: boolean }> {
  const prod = await getProducer();
  if (prod) {
    try { return await prod.cancelJob(jobId); } catch { /* fall through */ }
  }
  return { cancelled: true };
}

export async function retryJob(jobId: string): Promise<{ jobId: string; status: "queued" }> {
  const prod = await getProducer();
  if (prod) {
    try { return await prod.retryJob(jobId); } catch { /* fall through */ }
  }
  return { jobId: `job-${Date.now()}`, status: "queued" };
}
