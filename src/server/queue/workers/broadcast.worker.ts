// ============================================================
// Broadcast Dispatch Worker
// ============================================================
// BullMQ worker that picks up BroadcastDispatchJob messages from
// the broadcast-dispatch queue and dispatches them via the
// appropriate channel adapter.
//
// Flow: JOB -> broadcast.service.sendBroadcast() -> ADAPTER -> AUDIT LOG

import { Worker } from "bullmq";
import { connectionOptions } from "../connection";
import type { BroadcastDispatchJob } from "@/services/queue/types";

const worker = new Worker(
  "broadcast-dispatch",
  async (job) => {
    const data = job.data as BroadcastDispatchJob["data"];

    console.log(`[Broadcast Worker] Dispatching ${data.channel} message to ${data.target}`);

    await job.updateProgress({
      current: 1,
      total: 3,
      percent: 33,
      label: `Resolving adapter for ${data.channel}...`,
    });

    // Dynamic import — broadcast.service depends on Prisma (audit repo)
    const { sendBroadcast } = await import("@/server/services/broadcast/broadcast.service");

    const result = await sendBroadcast({
      id: job.id!,
      channel: data.channel,
      target: data.target,
      templateId: data.templateId,
      templateVars: data.templateVars,
      priority: data.priority,
    });

    await job.updateProgress({
      current: 2,
      total: 3,
      percent: 66,
      label: `Message ${result.status} — logging...`,
    });

    if (result.status === "failed") {
      throw new Error(result.error ?? `Failed to send via ${data.channel}`);
    }

    await job.updateProgress({
      current: 3,
      total: 3,
      percent: 100,
      label: `Sent to ${data.target} via ${data.channel}`,
    });

    return {
      success: result.status === "sent",
      channel: data.channel,
      target: data.target,
      templateId: data.templateId,
      channelMessageId: result.channelMessageId,
      sentAt: result.sentAt,
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

worker.on("completed", (job) => {
  console.log(`[Broadcast Worker] Job ${job.id} completed — ${job.returnvalue?.channel} -> ${job.returnvalue?.target}`);
});

worker.on("failed", (job, err) => {
  console.error(`[Broadcast Worker] Job ${job?.id} failed:`, err.message);
});

export default worker;
