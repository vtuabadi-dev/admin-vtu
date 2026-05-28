import { Worker } from "bullmq";
import { connectionOptions } from "../connection";
import type { NotificationDispatchJob } from "@/services/queue/types";

const worker = new Worker(
  "notification-dispatch",
  async (job) => {
    const data = job.data as NotificationDispatchJob["data"];
    const targetIds = data.targetJamaahIds;
    const count = targetIds.length;

    await job.updateProgress({ current: 0, total: count, percent: 0, label: `Dispatching "${data.type}" to ${count} recipients...` });

    // Dynamic import — Prisma is server-only
    const { notificationRepo } = await import("@/server/repositories");

    let delivered = 0;
    for (let i = 0; i < count; i++) {
      try {
        await notificationRepo.create({
          userId: targetIds[i]!,
          type: data.type,
          category: mapCategory(data.type),
          title: data.templateVars["title"] ?? data.type,
          message: data.templateVars["message"] ?? `Notification: ${data.type}`,
          link: data.templateVars["link"] ?? undefined,
        });
        delivered++;
      } catch (err) {
        console.warn(`[Notification Worker] Failed to deliver to ${targetIds[i]}:`, (err as Error).message);
      }

      if ((i + 1) % 10 === 0 || i === count - 1) {
        await job.updateProgress({
          current: i + 1,
          total: count,
          percent: Math.round(((i + 1) / count) * 100),
          label: `Delivered ${i + 1}/${count}`,
        });
      }
    }

    return {
      success: true,
      data: { delivered, total: count, failed: count - delivered },
    };
  },
  {
    connection: connectionOptions,
    concurrency: 4,
    autorun: true,
    lockDuration: 30000,
    stalledInterval: 30000,
    removeOnComplete: { count: 1000 },
    removeOnFail: { count: 300 },
  }
);

function mapCategory(type: string): string {
  switch (type) {
    case "revision": return "dokumen";
    case "deadline": return "pembayaran";
    case "payment_confirmed": return "pembayaran";
    case "dokumen_verified": return "dokumen";
    case "reminder": return "sistem";
    default: return "sistem";
  }
}

worker.on("completed", (job) => {
  console.log(`[Notification Worker] Job ${job.id} completed`);
});

worker.on("failed", (job, err) => {
  console.error(`[Notification Worker] Job ${job?.id} failed:`, err.message);
});

export default worker;
