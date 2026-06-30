// ============================================================
// OCR Gateway Types — Adaptive OCR Infrastructure
// ============================================================

import type { DokumenJenis } from "@/shared/types";
import type { OcrResult, OcrField, ImageMetaCheck } from "./provider";

// Re-export existing types for backward compatibility
export type { OcrResult, OcrField, ImageMetaCheck };

// ── Provider Registry ──────────────────────────────────────

export type OcrProviderType = "google_vision" | "external_api";

export type OcrHealthStatus = "active" | "cooldown" | "disabled" | "error";

export interface OcrProviderRecord {
  id: string;
  label: string;
  providerType: OcrProviderType;
  apiKey: string;
  apiUrl: string | null;
  apiHeaderName: string | null;
  apiHeaderPrefix: string | null;
  isActive: boolean;
  rotationOrder: number;
  rotationCount: number;
  requestCounter: number;
  dailyUsage: number;
  dailyLimit: number | null;
  healthStatus: OcrHealthStatus;
  cooldownUntil: string | null; // ISO date
  lastUsedAt: string | null;
  lastErrorAt: string | null;
  lastErrorMsg: string | null;
  consecutiveErrors: number;
  successRate: number;
  totalRequests: number;
  totalErrors: number;
  averageLatencyMs: number;
  totalPages: number;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OcrProviderCreateInput {
  label: string;
  providerType: OcrProviderType;
  apiKey: string;
  apiUrl?: string;
  apiHeaderName?: string;
  apiHeaderPrefix?: string;
  rotationOrder?: number;
  rotationCount?: number;
  dailyLimit?: number | null;
  notes?: string;
}

export interface OcrProviderUpdateInput {
  label?: string;
  providerType?: OcrProviderType;
  apiKey?: string;
  apiUrl?: string | null;
  apiHeaderName?: string | null;
  apiHeaderPrefix?: string | null;
  isActive?: boolean;
  rotationOrder?: number;
  rotationCount?: number;
  dailyLimit?: number | null;
  notes?: string | null;
}

// ── Rotation Engine ────────────────────────────────────────

export interface RotationSlot {
  providerId: string;
  providerIndex: number;
  processedCount: number;
}

// ── Health Monitor ─────────────────────────────────────────

export interface HealthEvent {
  providerId: string;
  statusCode?: number;
  errorMessage?: string;
  isTimeout?: boolean;
  latencyMs: number;
}

export const COOLDOWN_DURATIONS: Record<string, number> = {
  "429": 60_000,    // Rate limit → 60 seconds
  "500": 30_000,    // Server error → 30 seconds
  "502": 30_000,
  "503": 30_000,
  "504": 30_000,
  TIMEOUT: 15_000,  // Timeout → 15 seconds
};

export const PERMANENT_DISABLE_CODES = ["401", "403"];

// ── Retry Engine ───────────────────────────────────────────

export interface RetryContext {
  attemptedProviderIds: Set<string>;
  maxRetries: number;
  currentAttempt: number;
  lastError?: string;
}

// ── Daily Tracker ──────────────────────────────────────────

export interface DailyUsage {
  providerId: string;
  usage: number;
  limit: number | null;
  remaining: number | null; // null = unlimited
}

// ── Statistics ─────────────────────────────────────────────

export interface ProviderStats {
  providerId: string;
  label: string;
  providerType: OcrProviderType;
  healthStatus: OcrHealthStatus;
  cooldownUntil: string | null;
  isActive: boolean;
  totalRequests: number;
  totalErrors: number;
  successRate: number;
  averageLatencyMs: number;
  dailyUsage: number;
  dailyLimit: number | null;
  lastUsedAt: string | null;
  rotationOrder: number;
}

export interface OcrStatsSummary {
  totalProviders: number;
  activeProviders: number;
  totalRequestsToday: number;
  totalErrorsToday: number;
  successRateToday: number;
  averageLatencyToday: number;
  cacheHitRate: number;
}

// ── Cache ──────────────────────────────────────────────────

export interface CacheEntry {
  imageHash: string;
  documentType: DokumenJenis;
  result: OcrResult;
  confidence: number;
  expiresAt: string;
  createdAt: string;
  accessCount: number;
}

export interface CacheStats {
  totalEntries: number;
  activeEntries: number;
  hitRate: number;
  hits: number;
  misses: number;
}

// ── Gateway ────────────────────────────────────────────────

export interface GatewayConfig {
  rotationStrategy: "FIXED_ROUND_ROBIN";
  defaultRotationCount: number;
  cooldownEnabled: boolean;
  retryEnabled: boolean;
  cacheEnabled: boolean;
  cacheTtlHours: number;
  maxRetries: number;
}

export const DEFAULT_GATEWAY_CONFIG: GatewayConfig = {
  rotationStrategy: "FIXED_ROUND_ROBIN",
  defaultRotationCount: 2,
  cooldownEnabled: true,
  retryEnabled: true,
  cacheEnabled: true,
  cacheTtlHours: 24,
  maxRetries: 5, // up to 5 different providers
};

// ── Adapter ────────────────────────────────────────────────

export interface OcrAdapter {
  /** Unique name for this adapter type (e.g. "google-vision") */
  readonly type: string;

  /** Process OCR on an image buffer using the given API key */
  recognize(imageBuffer: Buffer, jenis: DokumenJenis, retryCount?: number): Promise<OcrResult>;

  /** Validate image metadata before OCR */
  validateImage(buffer: Buffer): ImageMetaCheck;
}

// ── Usage Log ──────────────────────────────────────────────

export interface UsageLogEntry {
  id: string;
  providerId: string;
  providerLabel?: string;
  requestType: string;
  documentType: string | null;
  success: boolean;
  confidence: number | null;
  latencyMs: number;
  errorCode: string | null;
  errorMessage: string | null;
  imageHash: string | null;
  createdAt: string;
}

export interface UsageLogFilter {
  providerId?: string;
  success?: boolean;
  documentType?: string;
  fromDate?: string;
  toDate?: string;
  page?: number;
  pageSize?: number;
}
