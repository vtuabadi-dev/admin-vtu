// Tesseract.js OCR Provider
// Implementasi konkret OcrProvider menggunakan Tesseract.js

import type { DokumenJenis } from "@/shared/types";
import type { OcrProvider, OcrResult, ImageMetaCheck } from "./provider";
import { getExpectedFields } from "./provider";

export function createTesseractProvider(): OcrProvider {
  let worker: any = null;

  return {
    name: "tesseract",

    async initialize() {
      try {
        const Tesseract = await import("tesseract.js");
        worker = await Tesseract.createWorker("ind");
        console.log("[OCR] Tesseract worker initialized (ind)");
      } catch (err) {
        console.warn("[OCR] Tesseract not available:", (err as Error).message);
      }
    },

    async recognize(imagePath: string, jenis: DokumenJenis, retryCount = 0): Promise<OcrResult> {
      const start = Date.now();
      const expectedFields = getExpectedFields(jenis);

      if (!worker) {
        return {
          success: true,
          fields: expectedFields.map((f) => ({ field: f, value: "", confidence: 0 })),
          rawText: "",
          overallConfidence: 0,
          processingTimeMs: Date.now() - start,
          retryCount,
        };
      }

      try {
        const { data } = await worker.recognize(imagePath);
        const rawText = data.text || "";

        const fields = expectedFields.map((field) => {
          let value = "";
          let confidence = 0;

          const patterns = [
            new RegExp(`${field}\\s*[:=]\\s*(.+?)(?:\\n|$)`, "i"),
            new RegExp(`(?:^|\\n)\\s*${field}\\s+(\\S[^\\n]*)`, "i"),
          ];

          for (const pattern of patterns) {
            const match = rawText.match(pattern);
            if (match?.[1]) { value = match[1].trim(); break; }
          }

          confidence = value ? Math.min(80 + (data.confidence || 0) / 5, 95) : 0;
          return { field, value, confidence };
        });

        return {
          success: true,
          fields,
          rawText,
          overallConfidence: data.confidence || 0,
          processingTimeMs: Date.now() - start,
          retryCount,
        };
      } catch (err) {
        return {
          success: false,
          fields: expectedFields.map((f) => ({ field: f, value: "", confidence: 0 })),
          rawText: "",
          overallConfidence: 0,
          processingTimeMs: Date.now() - start,
          retryCount,
        };
      }
    },

    validateImage(buffer: Buffer): ImageMetaCheck {
      const issues: string[] = [];

      if (buffer.length < 10240) {
        issues.push("File size too small (< 10KB), mungkin bukan gambar valid");
      }
      if (buffer.length > 10 * 1024 * 1024) {
        issues.push("File size terlalu besar (> 10MB)");
      }

      const isJpeg = buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF;
      if (!isJpeg) {
        issues.push("File bukan JPEG valid (magic bytes mismatch)");
      }

      return { valid: issues.length === 0, issues };
    },

    async dispose() {
      if (worker) {
        try { await worker.terminate(); } catch { /* ignore */ }
        worker = null;
      }
    },
  };
}
