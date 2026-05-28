// ============================================================
// Broadcast Abstraction Layer — Channel-Agnostic Type Definitions
// ============================================================
// Defines the contract for all broadcast channels.
// Adding a new channel only requires implementing BroadcastChannelAdapter.

export type BroadcastChannel = "telegram" | "whatsapp" | "email";

export interface BroadcastMessage {
  id: string;
  channel: BroadcastChannel;
  target: string; // chat ID, phone number, or email
  templateId: string;
  templateVars: Record<string, string>;
  priority: "low" | "normal" | "high";
  scheduledAt?: string;
}

export interface BroadcastResult {
  messageId: string;
  channel: BroadcastChannel;
  status: "sent" | "failed" | "queued";
  sentAt: string;
  error?: string;
  channelMessageId?: string; // external message ID from channel
}

export interface BroadcastChannelAdapter {
  readonly channel: BroadcastChannel;
  send(message: BroadcastMessage): Promise<BroadcastResult>;
  validateTarget(target: string): boolean;
  isConfigured(): boolean;
}
