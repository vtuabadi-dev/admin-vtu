// ============================================================
// Broadcast Service
// ============================================================
// Channel-agnostic broadcast dispatcher. Routes messages to the
// correct channel adapter and provides multi-channel broadcasts.
//
// Broadcast flow:
//   PACKAGE APPROVED -> CREATE BROADCAST JOB -> QUEUE ->
//   CHANNEL WORKER -> SEND -> AUDIT LOG

import type { BroadcastChannel, BroadcastMessage, BroadcastResult } from "./types";
import { getChannel, registerChannel, getConfiguredChannels } from "./channel-registry";
import { logger } from "@/server/lib/logger";

// ── Auto-register built-in adapters ───────────────────────────

async function registerBuiltInAdapters(): Promise<void> {
  const { default: telegramAdapter } = await import("./adapters/telegram.adapter");
  const { default: whatsappAdapter } = await import("./adapters/whatsapp.adapter");
  const { default: emailAdapter } = await import("./adapters/email.adapter");

  registerChannel(telegramAdapter);
  registerChannel(whatsappAdapter);
  registerChannel(emailAdapter);

  logger.info(
    { channels: getConfiguredChannels() },
    "[Broadcast] Built-in channel adapters registered"
  );
}

// Lazy init guard
let adaptersRegistered = false;

async function ensureAdapters(): Promise<void> {
  if (!adaptersRegistered) {
    await registerBuiltInAdapters();
    adaptersRegistered = true;
  }
}

// ── Public API ────────────────────────────────────────────────

/**
 * Send a single broadcast message through the appropriate channel adapter.
 * Returns the result from the adapter (sent / failed / queued).
 */
export async function sendBroadcast(message: BroadcastMessage): Promise<BroadcastResult> {
  await ensureAdapters();

  const adapter = getChannel(message.channel);

  if (!adapter) {
    const result: BroadcastResult = {
      messageId: message.id,
      channel: message.channel,
      status: "failed",
      sentAt: new Date().toISOString(),
      error: `No adapter registered for channel: ${message.channel}`,
    };
    await logBroadcastAttempt(result, message);
    return result;
  }

  if (!adapter.isConfigured()) {
    const result: BroadcastResult = {
      messageId: message.id,
      channel: message.channel,
      status: "failed",
      sentAt: new Date().toISOString(),
      error: `Channel ${message.channel} is not configured`,
    };
    await logBroadcastAttempt(result, message);
    return result;
  }

  let result: BroadcastResult;

  try {
    result = await adapter.send(message);
  } catch (err) {
    result = {
      messageId: message.id,
      channel: message.channel,
      status: "failed",
      sentAt: new Date().toISOString(),
      error: (err as Error).message,
    };
  }

  await logBroadcastAttempt(result, message);
  return result;
}

/**
 * Send the same template to multiple targets across different channels.
 * Each channel+target combination is sent independently.
 */
export async function sendMultiChannel(
  targets: Record<BroadcastChannel, string[]>,
  templateId: string,
  templateVars: Record<string, string>
): Promise<BroadcastResult[]> {
  await ensureAdapters();

  const results: BroadcastResult[] = [];
  const channels = Object.keys(targets) as BroadcastChannel[];

  for (const channel of channels) {
    const recipients = targets[channel];

    if (!recipients || recipients.length === 0) continue;

    const channelResults = await Promise.all(
      recipients.map((target) =>
        sendBroadcast({
          id: `broadcast-${channel}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          channel,
          target,
          templateId,
          templateVars,
          priority: "normal",
        })
      )
    );

    results.push(...channelResults);
  }

  return results;
}

/**
 * Check if a specific channel is both registered and configured.
 */
export async function isChannelAvailable(channel: BroadcastChannel): Promise<boolean> {
  await ensureAdapters();

  const adapter = getChannel(channel);
  if (!adapter) return false;

  return adapter.isConfigured();
}

/**
 * Get all channels that are currently configured and ready.
 */
export async function getAvailableChannels(): Promise<BroadcastChannel[]> {
  await ensureAdapters();
  return getConfiguredChannels();
}

// ── Audit Logging ─────────────────────────────────────────────

async function logBroadcastAttempt(
  result: BroadcastResult,
  message: BroadcastMessage
): Promise<void> {
  try {
    const { auditRepo } = await import("@/server/repositories");

    await auditRepo.create({
      userId: "system",
      userName: "Broadcast Service",
      role: "super_admin",
      module: "sistem",
      action: result.status === "sent" ? "broadcast.sent" : "broadcast.failed",
      detail: JSON.stringify({
        messageId: message.id,
        channel: message.channel,
        target: maskTarget(message.target, message.channel),
        templateId: message.templateId,
        priority: message.priority,
        channelMessageId: result.channelMessageId,
        error: result.error,
      }),
      entityId: message.id,
      entityType: "broadcast",
    });
  } catch (err) {
    logger.error({ err }, "[Broadcast] Failed to write audit log");
  }
}

function maskTarget(target: string, channel: BroadcastChannel): string {
  switch (channel) {
    case "email": {
      const [local, domain] = target.split("@");
      if (local && domain) {
        return `${local.slice(0, 2)}***@${domain}`;
      }
      return "***";
    }
    case "whatsapp": {
      const cleaned = target.replace(/[\s\-\(\)\+]/g, "");
      if (cleaned.length >= 6) {
        return `${cleaned.slice(0, 2)}****${cleaned.slice(-2)}`;
      }
      return "***";
    }
    case "telegram": {
      if (target.startsWith("@")) return target;
      if (target.length >= 6) {
        return `${target.slice(0, 2)}****${target.slice(-2)}`;
      }
      return "***";
    }
    default:
      return "***";
  }
}
