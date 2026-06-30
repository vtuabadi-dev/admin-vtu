// ============================================================
// Statistics Engine — EMA-based success rate & latency
// ============================================================
// Computes per-provider statistics after each OCR call.
// Uses Exponential Moving Average for smooth metrics.
// ============================================================

import { ocrProviderRepo } from "@/server/repositories/ocr-provider.repository";
import type { OcrProviderRecord } from "./types";
import { logger } from "@/server/lib/logger";

/**
 * Record a successful OCR call.
 * Updates success rate, latency, counters in DB.
 */
export async function recordSuccess(
  provider: OcrProviderRecord,
  latencyMs: number,
): Promise<void> {
  try {
    await ocrProviderRepo.recordSuccess(
      provider.id,
      latencyMs,
      provider.successRate,
      provider.averageLatencyMs,
      provider.totalRequests,
    );
  } catch (err) {
    logger.error({ err, providerId: provider.id }, "[Stats] Failed to record success");
  }
}

/**
 * Record a failed OCR call.
 * Updates success rate, latency, error counters in DB.
 */
export async function recordError(
  provider: OcrProviderRecord,
  latencyMs: number,
  errorCode?: string,
  errorMessage?: string,
): Promise<void> {
  try {
    await ocrProviderRepo.recordError(
      provider.id,
      latencyMs,
      provider.successRate,
      provider.averageLatencyMs,
      provider.totalRequests,
      errorCode,
      errorMessage,
    );
  } catch (err) {
    logger.error({ err, providerId: provider.id }, "[Stats] Failed to record error");
  }
}

/**
 * Log usage to the immutable audit trail.
 */
export async function logUsage(params: {
  providerId: string;
  requestType?: string;
  documentType?: string;
  success: boolean;
  confidence?: number;
  latencyMs: number;
  errorCode?: string;
  errorMessage?: string;
  imageHash?: string;
  imageSize?: number;
}): Promise<void> {
  try {
    await ocrProviderRepo.createUsageLog(params);
  } catch (err) {
    logger.error({ err }, "[Stats] Failed to create usage log");
  }
}
