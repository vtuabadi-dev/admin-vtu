import { GoogleGenerativeAI } from "@google/generative-ai";
import { prisma } from "@/server/db/client";

export interface SlipOcrResult {
  nominal?: number;
  tanggalTransfer?: string; // YYYY-MM-DD
  jamTransfer?: string;
  bankPengirim?: string;
  bankTujuan?: string;
  namaPengirim?: string;
  namaPenerima?: string;
  nomorRekeningPengirim?: string;
  nomorRekeningTujuan?: string;
  nomorReferensi?: string;
  confidence: number;
  rawText?: string;
  extractedVia: "gemini_vision" | "fallback_heuristic";
}

function getGeminiApiKey(): string {
  const envKey =
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_VISION_API_KEY ||
    process.env.GEMINI_API_KEY_2 ||
    "";
  return envKey.trim();
}

/**
 * Heuristic fallback parser when AI API is unavailable
 */
export function parseSlipHeuristic(text: string): Partial<SlipOcrResult> {
  const result: Partial<SlipOcrResult> = {
    confidence: 0.7,
    extractedVia: "fallback_heuristic",
  };

  // Extract nominal (e.g. Rp 25.000.000 or 25,000,000.00 or Total: 25000000)
  const nominalMatch =
    text.match(/(?:rp|idr|nominal|jumlah|total|amount)[\s.:]*([\d.,]+)/i) ||
    text.match(/([\d]{1,3}(?:[.,]\d{3})+(?:[.,]\d{2})?)/);
  if (nominalMatch?.[1]) {
    const cleanNum = nominalMatch[1].replace(/[^\d]/g, "");
    const parsed = parseInt(cleanNum, 10);
    if (!isNaN(parsed) && parsed > 1000) {
      result.nominal = parsed;
    }
  }

  // Extract date (e.g. 24/08/2026 or 2026-08-24 or 24-Aug-2026)
  const dateMatch =
    text.match(/(\d{4}[-/.]\d{2}[-/.]\d{2})/) ||
    text.match(/(\d{2}[-/.]\d{2}[-/.]\d{4})/);
  if (dateMatch?.[1]) {
    const rawDate = dateMatch[1];
    const firstPart = rawDate.split("-")[0];
    if (rawDate.includes("-") && firstPart && firstPart.length === 4) {
      result.tanggalTransfer = rawDate;
    } else {
      const parts = rawDate.split(/[-/.]/);
      if (parts.length === 3 && parts[0] && parts[1] && parts[2]) {
        if (parts[2].length === 4) {
          result.tanggalTransfer = `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
        }
      }
    }
  }

  // Extract Bank
  const banks = ["BCA", "BSI", "MANDIRI", "BRI", "BNI", "PERMATA", "CIMB", "JAGO", "BSI", "MUAMALAT"];
  for (const b of banks) {
    if (new RegExp(`\\b${b}\\b`, "i").test(text)) {
      result.bankPengirim = b;
      break;
    }
  }

  // Extract reference number
  const refMatch = text.match(/(?:ref|referensi|no\s*transaksi|trace|stan)[\s.:]*([A-Z0-9-]{6,})/i);
  if (refMatch?.[1]) {
    result.nomorReferensi = refMatch[1].trim();
  }

  return result;
}

/**
 * Extract transfer slip details using Gemini Vision with fallback
 */
export async function extractTransferSlip(
  imageUrl: string,
  paymentId?: string
): Promise<SlipOcrResult> {
  const apiKey = getGeminiApiKey();

  if (apiKey && imageUrl) {
    try {
      let imageBuffer: Buffer | null = null;
      let mimeType = "image/jpeg";

      if (imageUrl.startsWith("data:")) {
        const parts = imageUrl.split(",");
        if (parts[0] && parts[1]) {
          const header = parts[0].split(";")[0];
          mimeType = header ? header.replace("data:", "") : "image/jpeg";
          imageBuffer = Buffer.from(parts[1], "base64");
        }
      } else if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) {
        const res = await fetch(imageUrl);
        if (res.ok) {
          const contentType = res.headers.get("content-type");
          if (contentType) mimeType = contentType;
          const arr = await res.arrayBuffer();
          imageBuffer = Buffer.from(arr);
        }
      }

      if (imageBuffer) {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

        const prompt = `Anda adalah asisten AI OCR spesialis verifikasi slip pembayaran dan bukti transfer bank Indonesia (BCA, BSI, Mandiri, BRI, BNI, dll).
Analisis gambar slip transfer terlampir dan ekstrak datanya dalam format JSON murni:
{
  "nominal": number (angka bulat integer, contoh: 25000000),
  "tanggalTransfer": string (format YYYY-MM-DD, contoh: "2026-08-24"),
  "jamTransfer": string (format HH:mm:ss atau HH:mm, contoh: "14:32:00"),
  "bankPengirim": string (nama bank pengirim, contoh: "BCA"),
  "bankTujuan": string (nama bank tujuan, contoh: "BSI"),
  "namaPengirim": string (nama pemilik rekening pengirim),
  "namaPenerima": string (nama pemilik rekening penerima / VTU),
  "nomorRekeningPengirim": string (nomor rekening pengirim jika ada),
  "nomorRekeningTujuan": string (nomor rekening tujuan jika ada),
  "nomorReferensi": string (nomor referensi / jurnal / trace),
  "confidence": number (nilai 0.0 - 1.0),
  "rawText": string (ringkasan teks kunci yang terbaca)
}
HANYA kembalikan JSON valid tanpa markdown backtick tambahan.`;

        const result = await model.generateContent([
          prompt,
          {
            inlineData: {
              data: imageBuffer.toString("base64"),
              mimeType,
            },
          },
        ]);

        const text = result.response.text();
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          const finalResult: SlipOcrResult = {
            nominal: typeof parsed.nominal === "number" ? parsed.nominal : parseInt(String(parsed.nominal).replace(/[^\d]/g, ""), 10) || undefined,
            tanggalTransfer: parsed.tanggalTransfer || undefined,
            jamTransfer: parsed.jamTransfer || undefined,
            bankPengirim: parsed.bankPengirim || undefined,
            bankTujuan: parsed.bankTujuan || undefined,
            namaPengirim: parsed.namaPengirim || undefined,
            namaPenerima: parsed.namaPenerima || undefined,
            nomorRekeningPengirim: parsed.nomorRekeningPengirim || undefined,
            nomorRekeningTujuan: parsed.nomorRekeningTujuan || undefined,
            nomorReferensi: parsed.nomorReferensi || undefined,
            confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0.95,
            rawText: parsed.rawText || text.slice(0, 300),
            extractedVia: "gemini_vision",
          };

          // Cache to database if paymentId is given
          if (paymentId) {
            try {
              await prisma.pembayaran.update({
                where: { id: paymentId },
                data: {
                  ocrData: finalResult as any,
                  ...(finalResult.nominal && { jumlah: finalResult.nominal }),
                  ...(finalResult.tanggalTransfer && { tanggal: new Date(finalResult.tanggalTransfer) }),
                  ...(finalResult.bankPengirim && { bankPengirim: finalResult.bankPengirim }),
                  ...(finalResult.nomorReferensi && { nomorRekening: finalResult.nomorReferensi }),
                },
              });
            } catch (e) {
              console.warn("[slip-ocr] Failed to persist OCR result to database:", e);
            }
          }

          return finalResult;
        }
      }
    } catch (err) {
      console.warn("[slip-ocr] Gemini vision error, falling back to heuristic:", err);
    }
  }

  // Fallback heuristic extraction
  const fallback = parseSlipHeuristic(imageUrl);
  const fallbackResult: SlipOcrResult = {
    nominal: fallback.nominal,
    tanggalTransfer: fallback.tanggalTransfer || new Date().toISOString().slice(0, 10),
    bankPengirim: fallback.bankPengirim || "BSI",
    nomorReferensi: fallback.nomorReferensi,
    confidence: fallback.confidence ?? 0.6,
    extractedVia: "fallback_heuristic",
  };

  if (paymentId && fallbackResult.nominal) {
    try {
      await prisma.pembayaran.update({
        where: { id: paymentId },
        data: {
          ocrData: fallbackResult as any,
        },
      });
    } catch (e) {
      console.warn("[slip-ocr] Failed to persist fallback OCR result:", e);
    }
  }

  return fallbackResult;
}
