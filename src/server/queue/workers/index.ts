// Worker registration — dipanggil dari worker entrypoint (Dockerfile.worker)
// Setiap worker berjalan di thread terpisah dalam satu proses via BullMQ concurrency

import ocrWorker from "./ocr.worker";
import exportWorker from "./export.worker";
import reminderWorker from "./reminder.worker";
import notificationWorker from "./notification.worker";
import manifestWorker from "./manifest.worker";
import cleanupWorker from "./cleanup.worker";
import backupWorker from "./backup.worker";
import broadcastWorker from "./broadcast.worker";

export const workers = {
  ocr: ocrWorker,
  export: exportWorker,
  reminder: reminderWorker,
  notification: notificationWorker,
  manifest: manifestWorker,
  cleanup: cleanupWorker,
  backup: backupWorker,
  broadcast: broadcastWorker,
};

export async function startAllWorkers(): Promise<void> {
  console.log("[Queue] Starting all workers...");
  await Promise.all(Object.values(workers).map(async (w) => {
    await w.waitUntilReady();
    console.log(`[Queue] Worker ready: ${w.name}`);
  }));
  console.log("[Queue] All workers started");
}

export async function stopAllWorkers(): Promise<void> {
  console.log("[Queue] Stopping all workers...");
  await Promise.all(Object.values(workers).map((w) => w.close()));
  console.log("[Queue] All workers stopped");
}
