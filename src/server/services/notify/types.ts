// Notification provider abstraction — pluggable gateway support
// Current providers: mock (dev), console (debug), future: whatsapp, telegram, email

export type NotificationChannel = "email" | "whatsapp" | "telegram" | "in_app";

export interface NotificationAttachment {
  filename: string;
  content?: Buffer | string;
  path?: string;
  contentType?: string;
}

export interface NotificationMessage {
  channel: NotificationChannel;
  recipient: string; // email address, phone number, or user ID
  subject?: string;
  body: string;
  templateId?: string;
  templateVars?: Record<string, string>;
  attachments?: NotificationAttachment[];
  metadata?: Record<string, string>;
}

export interface NotificationResult {
  success: boolean;
  messageId?: string;
  channel: NotificationChannel;
  sentAt: string;
  error?: string;
  retryable: boolean;
}

export interface NotificationProvider {
  readonly name: string;
  readonly channels: NotificationChannel[];
  send(message: NotificationMessage): Promise<NotificationResult>;
  healthCheck(): Promise<{ ok: boolean; detail?: string }>;
}
