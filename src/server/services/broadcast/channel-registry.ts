// ============================================================
// Broadcast Channel Registry
// ============================================================
// Manages registered channel adapters. Adapters register themselves
// so the broadcast service can route messages without knowing
// the concrete implementation.

import type { BroadcastChannel, BroadcastChannelAdapter } from "./types";

const adapters = new Map<BroadcastChannel, BroadcastChannelAdapter>();

export function registerChannel(adapter: BroadcastChannelAdapter): void {
  adapters.set(adapter.channel, adapter);
}

export function getChannel(channel: BroadcastChannel): BroadcastChannelAdapter | undefined {
  return adapters.get(channel);
}

export function getConfiguredChannels(): BroadcastChannel[] {
  const configured: BroadcastChannel[] = [];
  adapters.forEach((adapter, channel) => {
    if (adapter.isConfigured()) {
      configured.push(channel);
    }
  });
  return configured;
}

export function getAllRegisteredChannels(): BroadcastChannel[] {
  return Array.from(adapters.keys());
}
