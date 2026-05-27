import { Worker } from "bullmq";
import { connectionOptions } from "../connection";
import type { DocumentOcrJob } from "@/services/queue/types";
import { processDocument } from "@/server/services/ocr.service";
import { getStorageAdapter } from "@/server/storage";
import type { DokumenJenis } from "@/shared/types";

const worker = new Worker(
  "document-ocr",
  async (job) => {
    const data = job.data as DocumentOcrJob["data"];
    console.log(`[OCR Worker] Processing ${data.jenisDokumen} for jamaah ${data.jamaahId}`);

    await job.updateProgress({ current: 1, total: 3, percent: 33, label: "Downloading image..." });

    let imagePath: string;
    try {
      const storage = getStorageAdapter();
      const buffer = await storage.download(data.fileUrl);
      const fs = await import("fs/promises");
      const path = await import("path");
      const tmpPath = `${process.env.STORAGE_PATH || "./storage"}/temp/ocr-${data.dokumenId}.jpg`;
      await fs.mkdir(path.dirname(tmpPath), { recursive: true });
      await fs.writeFile(tmpPath, buffer);
      imagePath = tmpPath;
    } catch {
      imagePath = data.fileUrl;
    }

    await job.updateProgress({ current: 2, total: 3, percent: 66, label: "Running OCR..." });

    const result = await processDocument(imagePath, data.jenisDokumen as DokumenJenis, data.reOcr ? 1 : 0);

    if (result.success && result.overallConfidence > 0) {
      try {
        const { dokumenRepo } = await import("@/server/repositories");
        await dokumenRepo.saveOcrResult(data.dokumenId, {
          fields: result.fields,
          rawText: result.rawText,
          confidence: result.overallConfidence,
          processingTimeMs: result.processingTimeMs,
        } as any);
      } catch (err) {
        console.warn("[OCR Worker] Failed to save OCR result:", (err as Error).message);
      }
    }

    await job.updateProgress({ current: 3, total: 3, percent: 100, label: "OCR complete" });

    return result;
  },
  {
    connection: connectionOptions,
    concurrency: 3,
    autorun: true,
    removeOnComplete: { count: 1000 },
    removeOnFail: { count: 500 },
  }
);

worker.on("completed", (job) => {
  console.log(`[OCR Worker] Job ${job.id} completed`);
});

worker.on("failed", (job, err) => {
  console.error(`[OCR Worker] Job ${job?.id} failed:`, err.message);
});

export default worker;
