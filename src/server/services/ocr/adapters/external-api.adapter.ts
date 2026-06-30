// ============================================================
// External API OCR Adapter
// ============================================================
// Generic adapter for any OCR API endpoint.
// Sends { image: base64, type: jenis, expectedFields: [...] }
// Expects { fields: [...], text: "...", confidence: 0.9 }
// ============================================================

import type { DokumenJenis } from "@/shared/types";
import type { OcrAdapter, OcrAdapterConfig } from "./adapter.interface";
import type { OcrResult, ImageMetaCheck } from "../provider";
import { getExpectedFields } from "../provider";

export const externalApiAdapter: OcrAdapter = {
  type: "external_api",

  async recognize(
    imageBuffer: Buffer,
    jenis: DokumenJenis,
    config: OcrAdapterConfig,
    retryCount = 0,
  ): Promise<OcrResult> {
    const start = Date.now();
    const url = config.apiUrl;
    if (!url) {
      return { success: false, fields: [], rawText: "", overallConfidence: 0, processingTimeMs: 0, retryCount };
    }

    const base64 = imageBuffer.toString("base64");
    const headerName = config.apiHeaderName || "Authorization";
    const headerPrefix = config.apiHeaderPrefix
      ? (config.apiHeaderPrefix.endsWith(" ") ? config.apiHeaderPrefix : `${config.apiHeaderPrefix} `)
      : "Bearer ";

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      [headerName]: headerPrefix + config.apiKey,
    };

    try {
      const res = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify({
          image: base64,
          type: jenis,
          expectedFields: getExpectedFields(jenis),
        }),
        signal: AbortSignal.timeout(config.timeout ?? 30000),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw { statusCode: res.status, message: text.slice(0, 500) };
      }

      const data = await res.json();
      return {
        success: true,
        fields: data.fields ?? data.result?.fields ?? [],
        rawText: data.text ?? data.rawText ?? "",
        overallConfidence: data.confidence ?? data.overallConfidence ?? 0,
        processingTimeMs: Date.now() - start,
        retryCount,
      };
    } catch (err: any) {
      throw err?.statusCode ? err : { statusCode: undefined, message: err?.message || String(err) };
    }
  },

  validateImage(buffer: Buffer): ImageMetaCheck {
    const issues: string[] = [];
    if (buffer.length < 10240) issues.push("File terlalu kecil (< 10KB)");
    if (buffer.length > 10 * 1024 * 1024) issues.push("File terlalu besar (> 10MB)");
    if (buffer[0] !== 0xFF || buffer[1] !== 0xD8 || buffer[2] !== 0xFF) {
      issues.push("Bukan file JPEG valid");
    }
    return { valid: issues.length === 0, issues };
  },

  async testConnection(config: OcrAdapterConfig): Promise<{ ok: boolean; message: string }> {
    const url = config.apiUrl;
    if (!url) return { ok: false, message: "API URL tidak dikonfigurasi" };

    try {
      const res = await fetch(url.replace(/\/$/, "") + "/health", {
        method: "GET",
        headers: {
          [config.apiHeaderName || "Authorization"]:
            (config.apiHeaderPrefix || "Bearer ") + config.apiKey,
        },
        signal: AbortSignal.timeout(5000),
      });
      return res.ok
        ? { ok: true, message: "Connected" }
        : { ok: false, message: `HTTP ${res.status}` };
    } catch (err: any) {
      return { ok: false, message: err?.message || "Connection failed" };
    }
  },
};
