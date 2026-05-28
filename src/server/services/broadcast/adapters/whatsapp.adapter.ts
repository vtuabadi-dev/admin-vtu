// ============================================================
// WhatsApp Channel Adapter (STUB)
// ============================================================
// Implements BroadcastChannelAdapter for WhatsApp Business API.
//
// TODO: Replace stub with real WhatsApp integration:
//   Option A — WABA Cloud API (Meta):
//     1. POST to https://graph.facebook.com/v18.0/<PHONE_ID>/messages
//     2. Authorization: Bearer <WHATSAPP_API_TOKEN>
//     3. JSON body: { messaging_product: "whatsapp", to, type, template {...} }
//   Option B — Twilio WhatsApp Sandbox:
//     1. POST to https://api.twilio.com/2010-04-01/Accounts/<SID>/Messages.json
//     2. Basic Auth with Account SID + Auth Token
//     3. Body: From=whatsapp:+14155238886, To=whatsapp:<target>, Body=...
//
// Environment variables:
//   WHATSAPP_API_TOKEN — access token for WhatsApp Business API
//   WHATSAPP_PHONE_ID  — phone number ID (for WABA Cloud API)

import type { BroadcastChannelAdapter, BroadcastMessage, BroadcastResult } from "../types";

const CHANNEL = "whatsapp" as const;

function getApiToken(): string | undefined {
  return process.env.WHATSAPP_API_TOKEN;
}

/**
 * Validate phone number format for Indonesia (62xxxxxxxx).
 * Accepts:
 *   - 62xxxxxxxx (10-15 digits after 62)
 *   - +62xxxxxxxx (with leading +)
 *   - 08xxxxxxxx (local format — converted internally)
 */
export function validateTarget(target: string): boolean {
  if (!target || target.trim().length === 0) return false;

  const cleaned = target.trim().replace(/[\s\-\(\)]/g, "");

  // 62xxxxxxxx (international format)
  if (/^62\d{8,15}$/.test(cleaned)) return true;

  // +62xxxxxxxx
  if (/^\+62\d{8,15}$/.test(cleaned)) return true;

  // 08xxxxxxxx (local Indonesian format)
  if (/^08\d{8,14}$/.test(cleaned)) return true;

  return false;
}

export function isConfigured(): boolean {
  const token = getApiToken();
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
      error: "WhatsApp channel not configured: WHATSAPP_API_TOKEN is missing",
    };
  }

  if (!validateTarget(message.target)) {
    return {
      messageId,
      channel: CHANNEL,
      status: "failed",
      sentAt,
      error: `Invalid WhatsApp target: ${message.target}`,
    };
  }

  // ── Stub: Actual WhatsApp API call goes here ──────────────
  //
  // const token = getApiToken()!;
  // const phoneId = getPhoneId()!;
  // const url = `https://graph.facebook.com/v18.0/${phoneId}/messages`;
  //
  // const res = await fetch(url, {
  //   method: "POST",
  //   headers: {
  //     Authorization: `Bearer ${token}`,
  //     "Content-Type": "application/json",
  //   },
  //   body: JSON.stringify({
  //     messaging_product: "whatsapp",
  //     to: message.target,
  //     type: "template",
  //     template: {
  //       name: message.templateId,
  //       language: { code: "id" },
  //       components: buildComponents(message.templateVars),
  //     },
  //   }),
  // });
  //
  // if (!res.ok) {
  //   const err = await res.json();
  //   throw new Error(`WhatsApp API error: ${err.error?.message ?? res.statusText}`);
  // }
  //
  // const result = await res.json();
  // return {
  //   messageId,
  //   channel: CHANNEL,
  //   status: "sent",
  //   sentAt: new Date().toISOString(),
  //   channelMessageId: result.messages?.[0]?.id,
  // };
  // ── End Stub ──────────────────────────────────────────────

  console.log(`[WhatsApp Adapter] STUB — Would send message ${messageId} to ${message.target}`);

  return {
    messageId,
    channel: CHANNEL,
    status: "sent",
    sentAt,
    channelMessageId: `stub-${messageId}`,
  };
}

const whatsappAdapter: BroadcastChannelAdapter = {
  channel: CHANNEL,
  send,
  validateTarget,
  isConfigured,
};

export default whatsappAdapter;
