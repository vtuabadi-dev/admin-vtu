import { Worker } from "bullmq";
import { connectionOptions } from "../connection";
import type { ManifestGenerateJob } from "@/services/queue/types";

const worker = new Worker(
  "manifest-generate",
  async (job) => {
    const data = job.data as ManifestGenerateJob["data"];
    console.log(`[Manifest Worker] Generating ${data.format} manifest for package ${data.packageId}`);

    await job.updateProgress({
      current: 1, total: 4, percent: 25,
      label: `Format: ${data.format}, includeUnverified: ${data.includeUnverified}`,
    });

    // TODO: Real manifest generation — panggil ManifestService
    // const result = await manifestService.generate(data.packageId, data.format);

    return { success: true, message: `Manifest ${data.format} generated for ${data.packageId}` };
  },
  {
    connection: connectionOptions,
    concurrency: 2,
    autorun: true,
    removeOnComplete: { count: 500 },
    removeOnFail: { count: 200 },
  }
);

worker.on("completed", (job) => {
  console.log(`[Manifest Worker] Job ${job.id} completed`);
});

worker.on("failed", (job, err) => {
  console.error(`[Manifest Worker] Job ${job?.id} failed:`, err.message);
});

export default worker;
