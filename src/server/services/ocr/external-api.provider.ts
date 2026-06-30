// External API OCR Provider
// Configurable via env vars — works with any OCR API endpoint
// Set OCR_PROVIDER=external-api in .env to activate
// Menerima Buffer langsung — tidak membaca filesystem.

import type { DokumenJenis } from "@/shared/types";
import type { OcrProvider, OcrResult, ImageMetaCheck } from "./provider";
import { getExpectedFields } from "./provider";

function getConfig() {
  const rawHeaderPrefix = process.env.OCR_API_HEADER_PREFIX ?? "Bearer";
  const headerPrefix = rawHeaderPrefix && !rawHeaderPrefix.endsWith(" ")
    ? `${rawHeaderPrefix} `
    : rawHeaderPrefix;

  return {
    url: process.env.OCR_API_URL ?? "",
    key: process.env.OCR_API_KEY ?? "",
    headerName: process.env.OCR_API_HEADER_NAME ?? "Authorization",
    headerPrefix,
    timeout: parseInt(process.env.OCR_API_TIMEOUT ?? "30000", 10),
    model: process.env.OCR_API_MODEL ?? undefined,
  };
}

export function createExternalApiProvider(): OcrProvider {
  return {
    name: "external-api",

    async initialize() {
      const cfg = getConfig();
      if (!cfg.url) {
        console.warn("[OCR] OCR_API_URL not set — external API provider will fail");
        return;
      }
      try {
        const res = await fetch(cfg.url.replace(/\/$/, "") + "/health", {
          method: "GET",
          headers: { [cfg.headerName]: cfg.headerPrefix + cfg.key },
          signal: AbortSignal.timeout(5000),
        });
        if (res.ok) {
          console.log(`[OCR] External API connected: ${cfg.url}`);
        }
      } catch {
        console.warn(`[OCR] External API health check failed — will retry on first request`);
      }
    },

    async recognize(imageBuffer: Buffer, jenis: DokumenJenis, retryCount = 0): Promise<OcrResult> {
      const cfg = getConfig();
      if (!cfg.url) {
        return { success: false, fields: [], rawText: "", overallConfidence: 0, processingTimeMs: 0, retryCount };
      }

      const start = Date.now();
      const base64 = imageBuffer.toString("base64");

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        [cfg.headerName]: cfg.headerPrefix + cfg.key,
      };

      const body: Record<string, unknown> = {
        image: base64,
        type: jenis,
        expectedFields: getExpectedFields(jenis),
      };
      if (cfg.model) body.model = cfg.model;

      try {
        const res = await fetch(cfg.url, {
          method: "POST",
          headers,
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(cfg.timeout),
        });

        if (!res.ok) {
          const text = await res.text().catch(() => "");
          return {
            success: false,
            fields: [],
            rawText: text,
            overallConfidence: 0,
            processingTimeMs: Date.now() - start,
            retryCount,
          };
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
      } catch (err) {
        return {
          success: false,
          fields: [],
          rawText: (err as Error).message,
          overallConfidence: 0,
          processingTimeMs: Date.now() - start,
          retryCount,
        };
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
  };
}
