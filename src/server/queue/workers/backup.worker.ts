import { Worker } from "bullmq";
import { connectionOptions } from "../connection";
import type { BackupDatabaseJob } from "@/services/queue/types";
import { runDatabaseBackup, runStorageBackup, cleanupOldBackups } from "@/server/services/backup.service";

const worker = new Worker(
  "backup-database",
  async (job) => {
    const data = job.data as BackupDatabaseJob["data"];
    console.log(`[Backup Worker] Starting ${data.type} backup to ${data.targetPath}`);

    await job.updateProgress({ current: 1, total: 3, percent: 33, label: "Running backup..." });

    let result: { id: string; sizeBytes: number };

    if (data.targetPath === "storage") {
      const record = await runStorageBackup();
      result = { id: record.id, sizeBytes: record.sizeBytes };
    } else {
      const record = await runDatabaseBackup(data.type);
      result = { id: record.id, sizeBytes: record.sizeBytes };
    }

    await job.updateProgress({ current: 2, total: 3, percent: 66, label: "Running cleanup..." });

    const { deleted } = await cleanupOldBackups();

    await job.updateProgress({ current: 3, total: 3, percent: 100, label: `Backup complete, ${deleted} old files cleaned` });

    return { success: true, backupId: result.id, sizeBytes: result.sizeBytes, cleanedUp: deleted };
  },
  {
    connection: connectionOptions,
    concurrency: 1,
    autorun: true,
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 50 },
  }
);

worker.on("completed", (job) => {
  console.log(`[Backup Worker] Job ${job.id} completed`);
});

worker.on("failed", (job, err) => {
  console.error(`[Backup Worker] Job ${job?.id} failed:`, err.message);
});

export default worker;
