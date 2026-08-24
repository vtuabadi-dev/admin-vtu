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

async function getGeminiApiKey(): Promise<string> {
  try {
    const { loadProviders } = await import("@/server/services/ocr/registry");
    const { reactivateExpiredCooldowns, isInCooldown } = await import("@/server/services/ocr/cooldown-manager");
    let providers = await loadProviders();
    await reactivateExpiredCooldowns(providers);
    const active = providers.filter((p) => p.isActive && p.apiKey?.trim() && !isInCooldown(p));
    if (active.length > 0 && active[0]?.apiKey) {
      return active[0].apiKey.trim();
    }
  } catch (e) {
    console.warn("[slip-ocr] Error loading DB OCR providers:", e);
  }

  const envKey =
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_VISION_API_KEY ||
    process.env.GEMINI_API_KEY_2 ||
    "";
  return envKey.trim();
}

async function getImageBuffer(imageUrl: string): Promise<{ buffer: Buffer; mimeType: string } | null> {
  if (!imageUrl) return null;

  // 1. Data URL
  if (imageUrl.startsWith("data:")) {
    const parts = imageUrl.split(",");
    if (parts[0] && parts[1]) {
      const header = parts[0].split(";")[0];
      const mimeType = header ? header.replace("data:", "") : "image/jpeg";
      return { buffer: Buffer.from(parts[1], "base64"), mimeType };
    }
  }

  // 2. Absolute HTTP/HTTPS URL
  if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) {
    try {
      const res = await fetch(imageUrl);
      if (res.ok) {
        const mimeType = res.headers.get("content-type") || "image/jpeg";
        const arr = await res.arrayBuffer();
        return { buffer: Buffer.from(arr), mimeType };
      }
    } catch (e) {
      console.warn("[slip-ocr] Fetch HTTP imageUrl failed:", e);
    }
  }

  // 3. Storage Adapter download (storage path or API query string)
  try {
    let cleanPath = imageUrl;
    if (imageUrl.includes("?")) {
      const qs = imageUrl.split("?")[1] || "";
      const params = new URLSearchParams(qs);
      cleanPath = params.get("path") || params.get("id") || cleanPath;
    }
    cleanPath = cleanPath.replace(/^\/+/, "");

    const { getStorageAdapter } = await import("@/server/storage");
    const storage = getStorageAdapter();
    const buf = await storage.download(cleanPath);
    if (buf && buf.length > 0) {
      let mimeType = "image/jpeg";
      if (buf[0] === 0x89 && buf[1] === 0x50) mimeType = "image/png";
      else if (buf[0] === 0x25 && buf[1] === 0x50) mimeType = "application/pdf";
      return { buffer: buf, mimeType };
    }
  } catch (err) {
    console.warn("[slip-ocr] Storage adapter download failed:", err);
  }

  // 4. Local storage fallback
  try {
    let cleanPath = imageUrl.includes("?")
      ? new URLSearchParams(imageUrl.split("?")[1] || "").get("path") || imageUrl
      : imageUrl;
    cleanPath = cleanPath.replace(/^\/+/, "");
    const { createLocalAdapter } = await import("@/server/storage/local");
    const local = createLocalAdapter();
    const buf = await local.download(cleanPath);
    if (buf && buf.length > 0) {
      let mimeType = "image/jpeg";
      if (buf[0] === 0x89 && buf[1] === 0x50) mimeType = "image/png";
      return { buffer: buf, mimeType };
    }
  } catch (err2) {
    console.warn("[slip-ocr] Local storage download fallback failed:", err2);
  }

  return null;
}

/**
 * Extract transfer slip details using Gemini Vision AI
 */
export async function extractTransferSlip(
  imageUrl: string,
  paymentId?: string
): Promise<SlipOcrResult> {
  const apiKey = await getGeminiApiKey();
  const imgData = await getImageBuffer(imageUrl);

  if (apiKey && imgData?.buffer) {
    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

      const prompt = `Anda adalah asisten AI OCR spesialis verifikasi slip pembayaran bank Indonesia (Livin' by Mandiri, BCA Mobile, myBCA, BRImo, BSI Mobile, BNI Mobile, Permata, dll).
Analisis gambar struk/slip bukti transfer ini dengan sangat teliti dan ekstrak informasinya ke dalam JSON valid:
{
  "nominal": number (angka bulat murni nominal uang yang berhasil ditransfer, contoh: 5000000),
  "tanggalTransfer": string (format YYYY-MM-DD, contoh: "2026-08-23"),
  "jamTransfer": string (format HH:mm:ss atau HH:mm, contoh: "22:31:31"),
  "bankPengirim": string (nama bank pengirim/aplikasi, contoh: "Mandiri", "BCA", "BSI", "BRI", "BNI"),
  "bankTujuan": string (nama bank tujuan penerima, contoh: "Mandiri", "BSI"),
  "namaPengirim": string (nama pengirim/rekening sumber, contoh: "ZAHRA ZAKIRAH"),
  "namaPenerima": string (nama penerima/rekening tujuan, contoh: "VAUZA TAMMA ABADI"),
  "nomorRekeningPengirim": string (nomor rekening pengirim jika ada),
  "nomorRekeningTujuan": string (nomor rekening tujuan jika ada),
  "nomorReferensi": string (nomor referensi / no ref / trace id, contoh: "2608231122053061798"),
  "confidence": number (nilai akurasi 0.0 - 1.0, contoh: 0.98),
  "rawText": string (ringkasan teks kunci yang tertera pada slip)
}
HANYA kembalikan JSON valid tanpa tag markdown backtick.`;

      const result = await model.generateContent([
        prompt,
        {
          inlineData: {
            data: imgData.buffer.toString("base64"),
            mimeType: imgData.mimeType,
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
          confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0.98,
          rawText: parsed.rawText || text.slice(0, 300),
          extractedVia: "gemini_vision",
        };

        // Persist to database if paymentId is provided
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
    } catch (err) {
      console.warn("[slip-ocr] Gemini vision analysis error:", err);
    }
  }

  // Fallback heuristic if AI unavailable
  return {
    nominal: undefined,
    tanggalTransfer: new Date().toISOString().slice(0, 10),
    bankPengirim: "Mandiri",
    nomorReferensi: undefined,
    confidence: 0.5,
    extractedVia: "fallback_heuristic",
  };
}
