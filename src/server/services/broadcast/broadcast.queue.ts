// ============================================================
// Broadcast Queue Integration
// ============================================================
// Enqueues broadcast jobs into BullMQ for async processing.
// Follows the same pattern as other queue producers in this project.

import type { BroadcastMessage } from "./types";
import type { BroadcastDispatchJob } from "@/services/queue/types";

/**
 * Enqueue a broadcast message for asynchronous dispatch via BullMQ.
 * The message is wrapped as a BroadcastDispatchJob and added to the
 * broadcast-dispatch queue.
 */
export async function enqueueBroadcast(
  message: BroadcastMessage
): Promise<{ jobId: string; status: "queued" }> {
  // Dynamic import — producer uses BullMQ which may not be available
  // in all environments (dev without Docker).
  const { enqueueJob } = await import("@/services/queue");

  const job: BroadcastDispatchJob = {
    id: message.id,
    queue: "broadcast-dispatch",
    createdAt: new Date().toISOString(),
    attempts: 0,
    maxAttempts: message.priority === "high" ? 5 : 3,
    data: {
      channel: message.channel,
      target: message.target,
      templateId: message.templateId,
      templateVars: message.templateVars,
      priority: message.priority,
    },
  };

  return enqueueJob(job);
}

/**
 * Enqueue a batch of broadcast messages.
 * Each message is enqueued individually for independent processing.
 */
export async function enqueueBroadcastBatch(
  messages: BroadcastMessage[]
): Promise<Array<{ jobId: string; status: "queued" }>> {
  return Promise.all(messages.map(enqueueBroadcast));
}
