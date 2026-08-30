import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import * as fs from "fs";
import { masterDataService } from "../master-data.service";
import type { PackageExtractionResult } from "./types";

const getGeminiApiKeysSequence = async (apiKeyOverride?: string): Promise<{ key: string; providerId?: string }[]> => {
  if (apiKeyOverride) return [{ key: apiKeyOverride }];

  try {
    const { loadProviders } = await import("@/server/services/ocr/registry");
    const { reactivateExpiredCooldowns, isInCooldown } = await import("@/server/services/ocr/cooldown-manager");

    let providers = await loadProviders();
    await reactivateExpiredCooldowns(providers);

    // Active google-ai-studio providers with non-empty API key
    const active = providers.filter((p) => p.isActive && p.apiKey?.trim());

    if (active.length > 0) {
      // Sort: active non-cooldown keys first, then keys with earliest cooldown expiration
      active.sort((a, b) => {
        const inCoolA = isInCooldown(a) ? 1 : 0;
        const inCoolB = isInCooldown(b) ? 1 : 0;
        if (inCoolA !== inCoolB) return inCoolA - inCoolB;
        const tA = a.cooldownUntil ? new Date(a.cooldownUntil).getTime() : 0;
        const tB = b.cooldownUntil ? new Date(b.cooldownUntil).getTime() : 0;
        return tA - tB;
      });

      return active.map((p) => ({ key: p.apiKey!, providerId: p.id }));
    }
  } catch (e) {
    console.warn("[gemini-extractor] Failed to fetch API key sequence from DB:", e);
  }

  const envKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_VISION_API_KEY || "";
  if (!envKey) {
    throw new Error("API Key untuk AI/OCR belum tersedia. Harap aktifkan provider di menu Pengaturan -> Integrasi OCR.");
  }
  return [{ key: envKey }];
};

export async function extractWithGemini(
  imagePath: string,
  rawOcrText: string,
  caption: string,
  apiKeyOverride?: string
): Promise<Partial<PackageExtractionResult> & { landingRoute?: string; rawText?: string }> {
  const startMs = Date.now();
  const keySequence = await getGeminiApiKeysSequence(apiKeyOverride);

  // Fetch master data
  const [airlines, cities, packageTypes, routes, hotels] = await Promise.all([
    masterDataService.getAirlines({ isActive: true, limit: 100 }),
    masterDataService.getCities({ isActive: true, limit: 100 }),
    masterDataService.getPackageTypes({ isActive: true, limit: 100 }),
    masterDataService.getRoutes({ isActive: true, limit: 100 }),
    masterDataService.getHotels({ isActive: true, limit: 100 }),
  ]);

  // Extract master data options
  const airlineOptions = airlines.data.map(a => a.name).join(", ");
  const cityOptions = cities.data.map(c => c.name).join(", ");
  const typeOptions = packageTypes.data.map(t => t.name).join(", ");
  const routeOptions = routes.data.map(r => `${r.ruteIn} -> ${r.ruteOut}`).join(", ");
  
  // Extract all hotel names from Master Hotel table
  const allMasterHotelNames = hotels.data.map(h => h.name);

  // Filter hotels for Mekkah & Madinah
  const mekkahHotelsList = hotels.data.filter(h => {
    const hName = (h.name || "").toLowerCase();
    const cName = (h.city?.name || "").toLowerCase();
    const cCode = (h.city?.code || "").toLowerCase();
    return cCode === "mek" || cCode === "mkh" || cCode === "mak" ||
           cName.includes("mekkah") || cName.includes("makkah") || cName.includes("mecca") ||
           hName.includes("makkah") || hName.includes("mekkah") || hName.includes("mecca");
  });

  const madinahHotelsList = hotels.data.filter(h => {
    const hName = (h.name || "").toLowerCase();
    const cName = (h.city?.name || "").toLowerCase();
    const cCode = (h.city?.code || "").toLowerCase();
    return cCode === "med" || cCode === "mdn" ||
           cName.includes("madinah") || cName.includes("medina") ||
           hName.includes("madinah") || hName.includes("medina") || hName.includes("nabawi") || hName.includes("ohud");
  });

  const mekkahHotelsStr = (mekkahHotelsList.length > 0 ? mekkahHotelsList.map(h => h.name) : allMasterHotelNames).join(", ");
  const madinahHotelsStr = (madinahHotelsList.length > 0 ? madinahHotelsList.map(h => h.name) : allMasterHotelNames).join(", ");
  const allHotelsStr = allMasterHotelNames.join(", ");

  const imageBuffer = fs.readFileSync(imagePath);
  const base64Image = imageBuffer.toString("base64");
  const mimeType = "image/jpeg";

  // Clean hint prefix and OCR error strings
  const cleanCaption = caption.replace(/^\[MODUS KLASTER SEAT:.*\]\s*/gi, "").trim();
  const cleanOcrText = rawOcrText.includes("No OCR providers configured") ? "" : rawOcrText;

  const prompt = `Kamu adalah sistem AI data entry travel umroh yang sangat teliti. Analisa GAMBAR FLYER UTAMA (GAMBAR TERLAMPIR), TEKS OCR, dan TEKS CAPTION dengan mengikuti ATURAN HIRARKI PENGAMBILAN DATA berikut.\n\n` +
    `==========================================================\n` +
    `1. SUMBER DATA: FLYER UTAMA (GAMBAR FLYER #1 & TEKS FLYER)\n` +
    `==========================================================\n` +
    `Bidang berikut WAJIB diekstrak dari GAMBAR FLYER UTAMA / TEKS FLYER:\n` +
    `• Jenis Paket: Pilih persis dari daftar -> [${typeOptions}]\n` +
    `• Durasi (Hari): Jumlah total hari perjalanan (cth: 9, 12, 14 hari)\n` +
    `• Starting Point (Kota Keberangkatan):\n` +
    `  - CARI KATA KUNCI "START" PADA FLYER (cth: "Start Surabaya", "Start Jakarta", "Start Solo", "Start SUB", "Start JKT", "Start SOC").\n` +
    `  - Jika ada kata "Surabaya", "Juanda", atau "SUB", WAJIB isi 'departureCity' dengan "Surabaya".\n` +
    `  - Jika ada kata "Jakarta", "Soekarno Hatta", "CGK", atau "JKT", WAJIB isi 'departureCity' dengan "Jakarta".\n` +
    `  - Jika ada kata "Solo", "Surakarta", "SOC", WAJIB isi 'departureCity' dengan "Solo".\n` +
    `  - Pilihan kota WAJIB dari daftar ini -> [${cityOptions}]\n` +
    `• Maskapai: WAJIB AMBIL MASKAPAI INTERNASIONAL UTAMA (Carrier Penerbangan ke Saudi / Timur Tengah, cth: Saudia Airlines, Garuda Indonesia, Royal Brunei, Emirates, Qatar Airways, Turkish Airlines, Oman Air, Etihad, Flynas, Lion Air). SANGAT DILARANG MENGAMBIL MASKAPAI DOMESTIK / FEEDER FLIGHT (seperti Pelita Air, Super Air Jet, Citilink Domestik). Jika caption/flyer menyebutkan "starting Surabaya by Pelita Airline" dan "starting Jakarta by Saudia Airlines", WAJIB PILIH SAUDIA AIRLINES! Maskapai WAJIB dari -> [${airlineOptions}]\n` +
    `• Hotel Mekkah & Madinah: Cari nama hotel untuk setiap klaster/kelas kamar pada flyer & caption. DILARANG MENUNTUT KECAMATAN 100% PERSIS. BANDINGKAN TEKS HOTEL DI FLYER DENGAN DAFTAR REFERENSI MASTER HOTEL BERIKUT, DAN WAJIB PILIH NAMA HOTEL YANG MEMILIKI KEMIRIPAN (SIMILARITY) TERTINGGI:\n` +
    `  - Referensi Master Hotel Mekkah: [${mekkahHotelsStr}]\n` +
    `  - Referensi Master Hotel Madinah: [${madinahHotelsStr}]\n` +
    `  - Seluruh Master Hotel: [${allHotelsStr}]\n` +
    `  - ATURAN SIMILARITY: Jika di flyer/caption tertulis misal "Anjum Makkah 5*", "Hotel Anjum", "Anjum 5*", atau "Anjum Tower", PILIH PERSIS NAMA "ANJUM HOTEL MAKKAH" dari daftar di atas karena memiliki similarity tertinggi!\n` +
    `• Harga Base Paket: Ekstrak harga dasar paket (klaster ataupun non-klaster) dari flyer (hanya angka nominal).\n` +
    `• Tanggal Keberangkatan: Cari dan kumpulkan SEMUA tanggal keberangkatan yang ada di flyer utama & caption (contoh di flyer: "12 JULI 2026 | 4 AGUSTUS 2026 | 6 SEPTEMBER 2026 | 15 SEPTEMBER 2026 | 4 OKTOBER 2026 | 13 OKTOBER 2026 | 4 NOVEMBER 2026 | 25 NOVEMBER 2026").\n` +
    `  - ATURAN DETEKSI TANGGAL: Satu tanggal adalah yang diawali dengan angka TANGGAL (1-31) + Nama Bulan + diakhiri TAHUN 4-digit (cth: 2026).\n` +
    `  - ABAIKAN TANDA PIPE '|': Tanda '|' adalah pemisah antar tanggal, sehingga setiap tanggal diantara tanda '|' adalah TANGGAL TERPISAH YANG BERBEDABEDA!\n` +
    `  - Ekstrak KESELURUH TANGGAL (bisa 1, 2, 4, 6, 8 atau lebih) ke dalam array 'departureDates' dengan format wajib 'YYYY-MM-DD'.\n\n` +
    `==========================================================\n` +
    `2. SUMBER DATA: CAPTION (TEKS SOSIAL MEDIA / DESKRIPSI)\n` +
    `==========================================================\n` +
    `Bidang berikut WAJIB diekstrak khusus dari TEKS CAPTION:\n` +
    `• Termasuk Perlengkapan ('isAdaPerlengkapan'):\n` +
    `  - Jika caption menyebutkan "Termasuk Perlengkapan", "Free Perlengkapan", "All In Perlengkapan", isi 'isAdaPerlengkapan' = "ya".\n` +
    `  - Jika caption menyebutkan "Belum Termasuk Perlengkapan", "Tanpa Perlengkapan", isi 'isAdaPerlengkapan' = "tidak".\n` +
    `• Harga Upgrade Kamar Double & Triple:\n` +
    `  - 'upgradeDouble': Nominal upgrade kamar berdua (cth: 7500000 dari "Sekamar Berdua + Rp 7.500.000").\n` +
    `  - 'upgradeTriple': Nominal upgrade kamar bertiga (cth: 5000000 dari "Sekamar Bertiga + Rp 5.000.000").\n\n` +
    `==========================================================\n` +
    `3. SUMBER DATA: ITINERARY & FLYER UTAMA (ANALISIS RUTE IN-OUT PESAWAT)\n` +
    `==========================================================\n` +
    `Cara Menentukan Rute In-Out (Landing Route):\n` +
    `a) PERIKSA FLYER UTAMA & TEKS OCR:\n` +
    `   - Cari teks/badge bertuliskan "LANDING [JEDDAH/MADINAH]" dan "OUT [JEDDAH/MADINAH]" pada flyer utama (cth: "FLIGHT BY LANDING JEDDAH OUT MADINAH" atau "LANDING JEDDAH OUT JEDDAH").\n` +
    `   - Ini memberikan informasi pasti Kota Landing (In) dan Kota Kepulangan (Out).\n` +
    `b) PERIKSA ITINERARY PERJALANAN (Untuk Kota Tujuan Pertama Setelah Landing):\n` +
    `   - Untuk menentukan kota tujuan pertama setelah mendarat (apakah langsung ke MAKKAH untuk Umroh (.C) atau ziarah ke MADINAH dulu (.D)), WAJIB periksa urutan itinerary hari pertama/kedua!\n` +
    `c) KODE RUTE SINKRON:\n` +
    `   - 1. PAKET REGULER:\n` +
    `        * JED.D-J: Landing Jeddah, kota tujuan pertama Madinah (.D), selesai Makkah lalu out dari Jeddah (-J).\n` +
    `        * JED.C-M: Landing Jeddah, kota tujuan pertama Makkah (.C) langsung Umroh, selesai ziarah Madinah lalu out dari Madinah (-M).\n` +
    `        * JED.C-J: Landing Jeddah, kota tujuan pertama Makkah (.C) langsung Umroh, ziarah Madinah, lalu out kembali via Jeddah (-J).\n` +
    `        * MED-J / Med-J: Landing di bandara Madinah, ziarah Madinah, lanjut Makkah, lalu out dari Jeddah (-J).\n` +
    `   - 2. PAKET PLUS (Singgah Negara Lain: Istanbul, Dubai, Qatar, Oman, Taif, Jordan, Cairo, dll):\n` +
    `        * Umroh Dulu (UD): Ke Arab Saudi dulu untuk ibadah baru tour ke negara plus (UD.D-J, UD.D-M).\n` +
    `        * Tour Dulu (TD): Tour ke negara plus terlebih dahulu sebelum mendarat di Saudi (TD.D-J, TD.C-J, TD.C-M).\n\n` +
    `Rute WAJIB dipilih persis dari daftar ini -> [${routeOptions}]\n\n` +
    `=============================================================================================================\n` +
    `4. ATURAN EKSTRAKSI KLASTER SEAT / KOTAK PAKET & CAPTION HARGA PER-KLASTER\n` +
    `==========================================================\n` +
    `Bila flyer utama atau caption memiliki data KLASTER PAKET (cth: "SILVER", "GOLD", "PLATINUM", "BRONZE"):\n` +
    `• Setiap klaster mewakili SATU KLASTER SEAT UTUH yang berisi:\n` +
    `  1. Nama Klaster (cth: "Silver Package", "Gold Package", "Platinum Package", "Bronze Package")\n` +
    `  2. Hotel Mekkah untuk klaster tersebut (dari flyer/caption)\n` +
    `  3. Hotel Madinah untuk klaster tersebut (dari flyer/caption)\n` +
    `  4. Harga Base klaster (dari flyer atau dari caption seperti "Silver Rp 38.900.000", "Gold Rp 40.900.000", "Platinum Rp 44.900.000").\n` +
    `  5. Upgrade Double klaster (dari caption rincian per klaster, cth: Sekamar Berdua Platinum: + Rp 7.500.000 -> 7500000).\n` +
    `  6. Upgrade Triple klaster (dari caption rincian per klaster, cth: Sekamar Bertiga Platinum: + Rp 5.000.000 -> 5000000).\n` +
    `• Masukkan SELURUH KLASTER yang ditemukan pada flyer & caption ke dalam array 'clusters'.\n\n` +
    `--- DATA UNTUK DIANALISA ---\n` +
    `1. TEKS HASIL SCAN OCR: ${cleanOcrText}\n\n` +
    `2. TEKS CAPTION: ${cleanCaption}\n\n` +
    `3. GAMBAR FLYER UTAMA (Telah dilampirkan): Analisa visual flyer utama & rute itinerary.`;

  const candidateModels = ["gemini-2.0-flash", "gemini-2.5-flash-lite", "gemini-1.5-flash", "gemini-1.5-pro"];
  let lastError: any = null;

  // Outer Loop: Try API Keys in sequence
  for (const { key: apiKey, providerId } of keySequence) {
    const keySuffix = apiKey.slice(-6);
    console.log(`[Gemini Extractor] ▶ Trying API key ***${keySuffix}`);
    const genAI = new GoogleGenerativeAI(apiKey);

    for (const modelName of candidateModels) {
      try {
        const model = genAI.getGenerativeModel({ 
          model: modelName,
          generationConfig: {
            responseMimeType: "application/json",
            responseSchema: {
              type: SchemaType.OBJECT,
              properties: {
                title: { type: SchemaType.STRING, description: "Judul singkat paket. Format: [Jenis Paket] [Durasi] Hari [Tahun]" },
                packageType: { type: SchemaType.STRING, description: "Jenis Paket dari Flyer Utama" },
                durationDays: { type: SchemaType.INTEGER, description: "Jumlah total durasi hari perjalanan dari Flyer Utama" },
                departureCity: { type: SchemaType.STRING, description: "Starting Point dari kata kunci 'START' di Flyer Utama" },
                airline: { type: SchemaType.STRING, description: "Maskapai penerbangan dari Flyer Utama" },
                hotelMekkah: { type: SchemaType.STRING, description: "Hotel Mekkah dari Flyer Utama" },
                hotelMadinah: { type: SchemaType.STRING, description: "Hotel Madinah dari Flyer Utama" },
                landingRoute: { type: SchemaType.STRING, description: "Rute In-Out pesawat dari analisis alur itinerary" },
                isAdaPerlengkapan: { type: SchemaType.STRING, description: "Dari Caption: 'ya' jika termasuk perlengkapan (cth: Perlengkapan umroh under Termasuk), 'tidak' jika belum/tidak termasuk" },
                hargaBase: { type: SchemaType.STRING, description: "Harga base paket (hanya angka nominal)" },
                upgradeDouble: { type: SchemaType.STRING, description: "Harga upgrade kamar double umum dari Caption (hanya angka nominal)" },
                upgradeTriple: { type: SchemaType.STRING, description: "Harga upgrade kamar triple umum dari Caption (hanya angka nominal)" },
                roomUpgrade: { type: SchemaType.STRING, description: "Informasi opsional upgrade kamar" },
                hotelUpgrade: { type: SchemaType.STRING, description: "Informasi opsional upgrade hotel" },
                promoText: { type: SchemaType.STRING, description: "Informasi opsional teks promo" },
                description: { type: SchemaType.STRING, description: "Deskripsi tambahan" },
                clusters: {
                  type: SchemaType.ARRAY,
                  items: {
                    type: SchemaType.OBJECT,
                    properties: {
                      clusterName: { type: SchemaType.STRING, description: "Nama Klaster (cth: Silver Package, Gold Package, Platinum Package, Bronze Package)" },
                      hotelMekkah: { type: SchemaType.STRING, description: "Nama Hotel Mekkah persis di dalam kotak klaster ini atau caption" },
                      hotelMadinah: { type: SchemaType.STRING, description: "Nama Hotel Madinah persis di dalam kotak klaster ini atau caption" },
                      hargaBase: { type: SchemaType.STRING, description: "Harga Base klaster dari flyer atau caption (hanya angka nominal, cth: 38900000 dari Rp 38.900.000)" },
                      upgradeDouble: { type: SchemaType.STRING, description: "Harga upgrade kamar berdua khusus klaster ini dari caption (hanya angka nominal, cth: 7500000 dari + Rp 7.500.000)" },
                      upgradeTriple: { type: SchemaType.STRING, description: "Harga upgrade kamar bertiga khusus klaster ini dari caption (hanya angka nominal, cth: 5000000 dari + Rp 5.000.000)" },
                    },
                    required: ["clusterName"]
                  },
                  description: "ARRAY SETIAP KLASTER SEAT BESERTA HARGA BASE & UPGRADE KAMAR PER KLASTER (Silver, Gold, Platinum, Bronze)"
                },
                departureDates: {
                  type: SchemaType.ARRAY,
                  items: { type: SchemaType.STRING },
                  description: "ARRAY SEMUA TANGGAL KEBERANGKATAN dari Flyer Utama (Format: YYYY-MM-DD)"
                }
              },
              required: ["title", "packageType", "durationDays", "departureCity", "airline", "departureDates", "landingRoute"]
            }
          }
        });

        const result = await model.generateContent([
          prompt,
          {
            inlineData: {
              data: base64Image,
              mimeType
            }
          }
        ]);

        const responseText = result.response.text();
        const parsed = JSON.parse(responseText);

        if (providerId) {
          try {
            const { ocrProviderRepo } = await import("@/server/repositories/ocr-provider.repository");
            const { logUsage } = await import("@/server/services/ocr/statistics-engine");
            await ocrProviderRepo.updateHealth(providerId, {
              healthStatus: "cooldown",
              cooldownUntil: new Date(Date.now() + 45_000),
            });
            await logUsage({
              providerId,
              requestType: "ocr",
              documentType: "paspor",
              success: true,
              confidence: 0.95,
              latencyMs: Date.now() - startMs,
              imageSize: imageBuffer.length,
            });
            console.log(`[Gemini Extractor] ✅ SUCCESS logged in Usage Log | providerId=${providerId} | key=***${keySuffix} | Cooldown 45s set`);
          } catch (e) {
            // ignore
          }
        }

        return parsed;
      } catch (error: any) {
        lastError = error;
        const errMsg = String(error?.message || error);
        console.warn(`[Gemini Extractor] Key ***${keySuffix} / Model ${modelName} failed: ${errMsg.slice(0, 100)}`);

        const isQuotaOrAuth = errMsg.includes("429") || errMsg.includes("403") || errMsg.includes("RESOURCE_EXHAUSTED") || errMsg.includes("Quota");
        if (isQuotaOrAuth && providerId) {
          try {
            const { ocrProviderRepo } = await import("@/server/repositories/ocr-provider.repository");
            const { logUsage } = await import("@/server/services/ocr/statistics-engine");
            await ocrProviderRepo.updateHealth(providerId, {
              healthStatus: "cooldown",
              cooldownUntil: new Date(Date.now() + 60_000),
            });
            await logUsage({
              providerId,
              requestType: "ocr",
              documentType: "paspor",
              success: false,
              latencyMs: Date.now() - startMs,
              errorCode: "429_QUOTA_EXHAUSTED",
              errorMessage: `API Key ***${keySuffix} quota exhausted. Rotating to next key in sequence.`,
              imageSize: imageBuffer.length,
            });
            console.log(`[Gemini Extractor] ⏸️ Key ***${keySuffix} quota exhausted (429/403). Rotating to NEXT API key in sequence...`);
          } catch (e) {
            // ignore
          }
          // Break model loop to try the NEXT API KEY in sequence!
          break;
        }
      }
    }
  }

  console.error("[Gemini Extractor] All candidate API keys and models failed:", lastError);
  throw new Error(`Semua API Key Gemini sedang habis kuota/cooldown. Terakhir: ${lastError?.message || lastError}`);
}
