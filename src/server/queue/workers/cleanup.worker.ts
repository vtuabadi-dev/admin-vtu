import { Worker } from "bullmq";
import { connectionOptions } from "../connection";
import type { CleanupTempJob } from "@/services/queue/types";
import fs from "fs/promises";
import path from "path";

const worker = new Worker(
  "cleanup-temp",
  async (job) => {
    const data = job.data as CleanupTempJob["data"];
    const storagePath = process.env.STORAGE_PATH || "./storage";
    const targetDir = path.join(storagePath, data.targetPath);
    const cutoff = Date.now() - data.olderThanDays * 86400000;

    console.log(`[Cleanup Worker] Cleaning ${data.targetPath}, older than ${data.olderThanDays} days (dryRun: ${data.dryRun})`);

    try {
      const entries = await fs.readdir(targetDir, { withFileTypes: true });
      let deleted = 0;
      let totalSize = 0;

      for (const entry of entries) {
        if (!entry.isFile()) continue;
        const fullPath = path.join(targetDir, entry.name);
        const stat = await fs.stat(fullPath);

        if (stat.mtimeMs < cutoff) {
          totalSize += stat.size;
          if (!data.dryRun) {
            await fs.unlink(fullPath);
          }
          deleted++;
        }
      }

      await job.updateProgress({ current: deleted, total: entries.length, percent: 100, label: `Cleaned ${deleted} files` });

      return {
        success: true,
        message: `${data.dryRun ? "[DRY RUN] Would delete" : "Deleted"} ${deleted} files (${(totalSize / 1024 / 1024).toFixed(2)} MB)`,
      };
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") {
        return { success: true, message: `Directory ${data.targetPath} does not exist, nothing to clean` };
      }
      throw err;
    }
  },
  {
    connection: connectionOptions,
    concurrency: 1,
    autorun: true,
    removeOnComplete: { count: 200 },
    removeOnFail: { count: 100 },
  }
);

worker.on("completed", (job) => {
  console.log(`[Cleanup Worker] Job ${job.id} completed`);
});

worker.on("failed", (job, err) => {
  console.error(`[Cleanup Worker] Job ${job?.id} failed:`, err.message);
});

export default worker;
