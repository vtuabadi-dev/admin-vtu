// ============================================================
// Email Channel Adapter (STUB)
// ============================================================
// Implements BroadcastChannelAdapter for email delivery.
//
// TODO: Replace stub with real email provider integration:
//   Option A — SMTP (nodemailer):
//     1. Install nodemailer
//     2. Create transporter via SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASS
//     3. Call transporter.sendMail({ from, to, subject, html, ... })
//   Option B — Resend API:
//     1. POST to https://api.resend.com/emails
//     2. Authorization: Bearer <RESEND_API_KEY>
//     3. JSON body: { from, to, subject, html, ... }
//
// Environment variables:
//   SMTP_HOST       — SMTP server hostname
//   SMTP_PORT       — SMTP server port (default 587)
//   SMTP_USER       — SMTP username
//   SMTP_PASS       — SMTP password
//   RESEND_API_KEY  — Resend API key (alternative to SMTP)

import type { BroadcastChannelAdapter, BroadcastMessage, BroadcastResult } from "../types";

const CHANNEL = "email" as const;

function hasSmtpConfig(): boolean {
  return typeof process.env.SMTP_HOST === "string" && process.env.SMTP_HOST.length > 0;
}

function hasResendConfig(): boolean {
  return typeof process.env.RESEND_API_KEY === "string" && process.env.RESEND_API_KEY.length > 0;
}

/**
 * Validate email address format using a basic RFC 5322 pattern.
 */
export function validateTarget(target: string): boolean {
  if (!target || target.trim().length === 0) return false;

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  return emailRegex.test(target.trim());
}

export function isConfigured(): boolean {
  return hasSmtpConfig() || hasResendConfig();
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
      error: "Email channel not configured: set SMTP_HOST or RESEND_API_KEY",
    };
  }

  if (!validateTarget(message.target)) {
    return {
      messageId,
      channel: CHANNEL,
      status: "failed",
      sentAt,
      error: `Invalid email target: ${message.target}`,
    };
  }

  // ── Stub: Actual email delivery goes here ─────────────────
  //
  // Option A — Nodemailer (SMTP):
  //   const nodemailer = await import("nodemailer");
  //   const transporter = nodemailer.createTransport({
  //     host: process.env.SMTP_HOST,
  //     port: parseInt(process.env.SMTP_PORT || "587", 10),
  //     secure: process.env.SMTP_PORT === "465",
  //     auth: {
  //       user: process.env.SMTP_USER,
  //       pass: process.env.SMTP_PASS,
  //     },
  //   });
  //
  //   const info = await transporter.sendMail({
  //     from: process.env.SMTP_FROM || "noreply@vtu.example.com",
  //     to: message.target,
  //     subject: renderSubject(message.templateId, message.templateVars),
  //     html: renderBody(message.templateId, message.templateVars),
  //   });
  //
  //   return {
  //     messageId,
  //     channel: CHANNEL,
  //     status: "sent",
  //     sentAt: new Date().toISOString(),
  //     channelMessageId: info.messageId,
  //   };
  //
  // Option B — Resend:
  //   const { Resend } = await import("resend");
  //   const resend = new Resend(process.env.RESEND_API_KEY!);
  //
  //   const { data, error } = await resend.emails.send({
  //     from: process.env.SMTP_FROM || "noreply@vtu.example.com",
  //     to: message.target,
  //     subject: renderSubject(message.templateId, message.templateVars),
  //     html: renderBody(message.templateId, message.templateVars),
  //   });
  //
  //   if (error) throw new Error(`Resend error: ${error.message}`);
  //   return {
  //     messageId,
  //     channel: CHANNEL,
  //     status: "sent",
  //     sentAt: new Date().toISOString(),
  //     channelMessageId: data?.id,
  //   };
  // ── End Stub ──────────────────────────────────────────────

  console.log(`[Email Adapter] STUB — Would send message ${messageId} to ${message.target}`);

  return {
    messageId,
    channel: CHANNEL,
    status: "sent",
    sentAt,
    channelMessageId: `stub-${messageId}`,
  };
}

const emailAdapter: BroadcastChannelAdapter = {
  channel: CHANNEL,
  send,
  validateTarget,
  isConfigured,
};

export default emailAdapter;
