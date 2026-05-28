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
