import type { NotificationProvider, NotificationMessage, NotificationResult } from "./types";
import { createMockProvider, createConsoleProvider } from "./providers";

let _provider: NotificationProvider | null = null;

export function getNotificationProvider(): NotificationProvider {
  if (_provider) return _provider;

  const configured = process.env.NOTIFICATION_PROVIDER ?? "mock";

  switch (configured) {
    case "console":
      _provider = createConsoleProvider();
      break;
    case "mock":
    default:
      _provider = createMockProvider();
      break;
  }

  return _provider;
}

// Allow overriding the provider (e.g., for testing or runtime switching)
export function setNotificationProvider(provider: NotificationProvider): void {
  _provider = provider;
}

// Convenience: send notification through the configured provider
export async function sendNotification(message: NotificationMessage): Promise<NotificationResult> {
  const provider = getNotificationProvider();
  return provider.send(message);
}

// Convenience: send to multiple channels for same recipient
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
