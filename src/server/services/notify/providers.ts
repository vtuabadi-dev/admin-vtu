import type { NotificationProvider, NotificationMessage, NotificationResult, NotificationChannel } from "./types";

// Mock provider — logs to console, always returns success
// Used in development and as fallback when no real gateway is configured
export function createMockProvider(): NotificationProvider {
  return {
    name: "mock",
    channels: ["email", "whatsapp", "telegram", "in_app"] as NotificationChannel[],

    async send(message: NotificationMessage): Promise<NotificationResult> {
      const messageId = `mock-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      console.log(`[notify:mock] Sent via ${message.channel} to ${message.recipient}: ${message.subject ?? message.body.slice(0, 80)}`);
      return {
        success: true,
        messageId,
        channel: message.channel,
        sentAt: new Date().toISOString(),
        retryable: false,
      };
    },

    async healthCheck() {
      return { ok: true, detail: "mock provider — always healthy" };
    },
  };
}

// Console provider — logs detailed message info, for debugging
export function createConsoleProvider(): NotificationProvider {
  return {
    name: "console",
    channels: ["email", "whatsapp", "telegram", "in_app"] as NotificationChannel[],

    async send(message: NotificationMessage): Promise<NotificationResult> {
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log(`[notify:console] Channel: ${message.channel}`);
      console.log(`[notify:console] To: ${message.recipient}`);
      console.log(`[notify:console] Subject: ${message.subject ?? "(none)"}`);
      console.log(`[notify:console] Body: ${message.body}`);
      if (message.templateVars) {
        console.log(`[notify:console] Template vars:`, message.templateVars);
      }
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      return {
        success: true,
        messageId: `console-${Date.now()}`,
        channel: message.channel,
        sentAt: new Date().toISOString(),
        retryable: false,
      };
    },

    async healthCheck() {
      return { ok: true, detail: "console provider — always healthy" };
    },
  };
}

// Resend provider — sends real emails via Resend API
export function createResendProvider(apiKey?: string): NotificationProvider {
  const key = apiKey || process.env.RESEND_API_KEY;
  return {
    name: "resend",
    channels: ["email"] as NotificationChannel[],

    async send(message: NotificationMessage): Promise<NotificationResult> {
      if (!key) {
        console.warn("[notify:resend] RESEND_API_KEY missing — fallback to mock provider");
        return createMockProvider().send(message);
      }

      try {
        const { Resend } = await import("resend");
        const resend = new Resend(key);
        const fromEmail = process.env.RESEND_FROM_EMAIL || "VTU Abadi Travel <onboarding@resend.dev>";

        const payload: any = {
          from: fromEmail,
          to: message.recipient,
          subject: message.subject ?? "Konfirmasi Registrasi Jamaah Umroh",
          text: message.body,
        };

        if (message.attachments && message.attachments.length > 0) {
          payload.attachments = message.attachments.map((att) => ({
            filename: att.filename,
            content: att.content,
          }));
        }

        const res = await resend.emails.send(payload);
        if (res.error) {
          throw new Error(res.error.message);
        }

        return {
          success: true,
          messageId: res.data?.id || `resend-${Date.now()}`,
          channel: "email",
          sentAt: new Date().toISOString(),
          retryable: false,
        };
      } catch (err: any) {
        console.error("[notify:resend] Email send failed:", err?.message || err);
        return {
          success: false,
          error: err?.message || "Email dispatch failed",
          channel: "email",
          sentAt: new Date().toISOString(),
          retryable: true,
        };
      }
    },

    async healthCheck() {
      return { ok: !!key, detail: key ? "Resend API key configured" : "RESEND_API_KEY missing" };
    },
  };
}
