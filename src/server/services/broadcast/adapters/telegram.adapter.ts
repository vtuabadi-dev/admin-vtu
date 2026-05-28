// ============================================================
// Telegram Channel Adapter (STUB)
// ============================================================
// Implements BroadcastChannelAdapter for Telegram Bot API.
//
// TODO: Replace stub with real Telegram Bot API integration:
//   1. Install `node-telegram-bot-api` or use native fetch
//   2. Construct Bot API URL: https://api.telegram.org/bot<TOKEN>/sendMessage
//   3. POST JSON payload { chat_id, text, parse_mode, ... }
//   4. Handle rate limiting (30 msg/s) and retry logic
//   5. Support media, buttons, and inline keyboards as needed
//
// Environment variables:
//   TELEGRAM_BOT_TOKEN — bot token from @BotFather

import type { BroadcastChannelAdapter, BroadcastMessage, BroadcastResult } from "../types";

const CHANNEL = "telegram" as const;

function getToken(): string | undefined {
  return process.env.TELEGRAM_BOT_TOKEN;
}

/**
 * Validate Telegram chat ID format.
 * Accepts:
 *   - Numeric IDs (e.g. "123456789", "-123456789")
 *   - Username-style @mentions (e.g. "@username")
 */
export function validateTarget(target: string): boolean {
  if (!target || target.trim().length === 0) return false;

  // @mention format
  if (target.startsWith("@")) {
    return /^@[a-zA-Z0-9_]{3,32}$/.test(target);
  }

  // Numeric chat ID (positive = user, negative = group/channel)
  return /^-?\d{5,15}$/.test(target.trim());
}

export function isConfigured(): boolean {
  const token = getToken();
  return typeof token === "string" && token.length > 0;
}

export async function send(message: BroadcastMessage): Promise<BroadcastResult> {
  const messageId = message.id;
  const sentAt = new Date().toISOString();

  if (!isConfigured()) {
    return {
      messageId,
      channel: CHANNEL,
      status: "failed",
      sentAt,
      error: "Telegram channel not configured: TELEGRAM_BOT_TOKEN is missing",
    };
  }

  if (!validateTarget(message.target)) {
    return {
      messageId,
      channel: CHANNEL,
      status: "failed",
      sentAt,
      error: `Invalid Telegram target: ${message.target}`,
    };
  }

  // ── Stub: Actual Telegram Bot API call goes here ──────────
  //
  // const token = getToken()!;
  // const url = `https://api.telegram.org/bot${token}/sendMessage`;
  // const text = renderTemplate(message.templateId, message.templateVars);
  //
  // const res = await fetch(url, {
  //   method: "POST",
  //   headers: { "Content-Type": "application/json" },
  //   body: JSON.stringify({
  //     chat_id: message.target,
  //     text,
  //     parse_mode: "HTML",
  //     disable_web_page_preview: false,
  //   }),
  // });
  //
  // if (!res.ok) {
  //   const errBody = await res.json();
  //   throw new Error(`Telegram API error: ${errBody.description ?? res.statusText}`);
  // }
  //
  // const result = await res.json();
  // return {
  //   messageId,
  //   channel: CHANNEL,
  //   status: "sent",
  //   sentAt: new Date().toISOString(),
  //   channelMessageId: String(result.result?.message_id),
  // };
  // ── End Stub ──────────────────────────────────────────────

  console.log(`[Telegram Adapter] STUB — Would send message ${messageId} to ${message.target}`);

  return {
    messageId,
    channel: CHANNEL,
    status: "sent",
    sentAt,
    channelMessageId: `stub-${messageId}`,
  };
}

const telegramAdapter: BroadcastChannelAdapter = {
  channel: CHANNEL,
  send,
  validateTarget,
  isConfigured,
};

export default telegramAdapter;
