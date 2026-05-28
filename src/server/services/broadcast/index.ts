// ============================================================
// Broadcast Abstraction Layer — Barrel Export
// ============================================================

export type { BroadcastChannel, BroadcastMessage, BroadcastResult, BroadcastChannelAdapter } from "./types";
export { registerChannel, getChannel, getConfiguredChannels } from "./channel-registry";
export { sendBroadcast, sendMultiChannel, isChannelAvailable, getAvailableChannels } from "./broadcast.service";
export { enqueueBroadcast, enqueueBroadcastBatch } from "./broadcast.queue";
