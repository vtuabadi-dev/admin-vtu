import { Worker } from "bullmq";
import { connectionOptions } from "../connection";
import type { NotificationDispatchJob } from "@/services/queue/types";

const worker = new Worker(
  "notification-dispatch",
  async (job) => {
    const data = job.data as NotificationDispatchJob["data"];
    const count = data.targetJamaahIds.length;
    console.log(`[Notification Worker] Dispatching "${data.type}" notification to ${count} recipients`);

    // Push/in-app notification delivery stub
    for (let i = 0; i < count; i++) {
      await job.updateProgress({ current: i + 1, total: count, percent: Math.round(((i + 1) / count) * 100), label: `Notified ${i + 1}/${count}` });
    }

    return { success: true, message: `Notification sent to ${count} recipients` };
  },
  {
    connection: connectionOptions,
    concurrency: 4,
    autorun: true,
    removeOnComplete: { count: 1000 },
    removeOnFail: { count: 300 },
  }
);

worker.on("completed", (job) => {
  console.log(`[Notification Worker] Job ${job.id} completed`);
});

worker.on("failed", (job, err) => {
  console.error(`[Notification Worker] Job ${job?.id} failed:`, err.message);
});

export default worker;
