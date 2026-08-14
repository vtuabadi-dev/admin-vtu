import type { NotificationProvider, NotificationMessage, NotificationResult } from "./types";
import { createMockProvider, createConsoleProvider, createResendProvider, createNodemailerProvider } from "./providers";

let _provider: NotificationProvider | null = null;

export function getNotificationProvider(): NotificationProvider {
  if (_provider) return _provider;

  if (process.env.GMAIL_USER || process.env.SMTP_USER) {
    _provider = createNodemailerProvider();
  } else if (process.env.RESEND_API_KEY) {
    _provider = createResendProvider();
  } else {
    const configured = process.env.NOTIFICATION_PROVIDER ?? "nodemailer";
    switch (configured) {
      case "nodemailer":
      case "smtp":
      case "gmail":
        _provider = createNodemailerProvider();
        break;
      case "console":
        _provider = createConsoleProvider();
        break;
      case "resend":
        _provider = createResendProvider();
        break;
      case "mock":
      default:
        _provider = createMockProvider();
        break;
    }
  }

  return _provider;
}

export function setNotificationProvider(provider: NotificationProvider): void {
  _provider = provider;
}

export async function sendNotification(message: NotificationMessage): Promise<NotificationResult> {
  const provider = getNotificationProvider();
  return provider.send(message);
}

export async function sendMultiChannel(
  recipient: string,
  channels: NotificationMessage["channel"][],
  body: string,
  subject?: string,
): Promise<NotificationResult[]> {
  const provider = getNotificationProvider();
  return Promise.all(
    channels.map((channel) =>
      provider.send({ channel, recipient, body, subject }),
    ),
  );
}

export type { NotificationProvider, NotificationMessage, NotificationResult };
export type { NotificationChannel } from "./types";
