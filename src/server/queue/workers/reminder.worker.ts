import { Worker } from "bullmq";
import { connectionOptions } from "../connection";
import type { PaymentReminderJob } from "@/services/queue/types";

const worker = new Worker(
  "payment-reminder",
  async (job) => {
    const data = job.data as PaymentReminderJob["data"];
    // Email/WhatsApp gateway stub — integrate with external provider here
    await job.updateProgress({ current: 1, total: 1, percent: 100, label: "Reminder dispatched" });

    return { success: true, message: `Reminder ${data.reminderType} sent for invoice ${data.invoiceId}` };
  },
  {
    connection: connectionOptions,
    concurrency: 5,
    autorun: true,
    removeOnComplete: { count: 2000 },
    removeOnFail: { count: 500 },
  }
);

worker.on("completed", (job) => {
  console.log(`[Reminder Worker] Job ${job.id} completed`);
});

worker.on("failed", (job, err) => {
  console.error(`[Reminder Worker] Job ${job?.id} failed:`, err.message);
});

export default worker;
