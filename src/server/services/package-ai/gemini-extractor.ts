import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import fs from "fs";
import { masterDataService } from "@/server/services/master-data.service";
import type { PackageExtractionResult } from "./types";

const getGeminiApiKey = () => {
  const key = process.env.GEMINI_API_KEY || process.env.GOOGLE_VISION_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY is not defined in environment variables");
  return key;
};

export async function extractWithGemini(
  imagePath: string,
  rawOcrText: string,
  caption: string
): Promise<Partial<PackageExtractionResult> & { landingRoute?: string }> {
  const apiKey = getGeminiApiKey();
  const genAI = new GoogleGenerativeAI(apiKey);

  // Fetch master data
  const [airlines, cities, packageTypes, routes, hotels] = await Promise.all([
    masterDataService.getAirlines({ isActive: true, limit: 100 }),
    masterDataService.getCities({ isActive: true, limit: 100 }),
    masterDataService.getPackageTypes({ isActive: true, limit: 100 }),
    masterDataService.getRoutes({ isActive: true, limit: 100 }),
    masterDataService.getHotels({ isActive: true, limit: 100 }),
  ]);

  const airlineOptions = airlines.data.map(a => a.name).join(", ");
  const cityOptions = cities.data.map(c => c.name).join(", ");
  const typeOptions = packageTypes.data.map(t => t.name).join(", ");
  const routeOptions = routes.data.map(r => `${r.ruteIn} -> ${r.ruteOut}`).join(", ");
  
  const mekkahCity = cities.data.find(c => c.code === "MEK" || c.name.toLowerCase() === "mekkah");
  const madinahCity = cities.data.find(c => c.code === "MED" || c.name.toLowerCase() === "madinah");
  const mekkahHotels = hotels.data.filter(h => h.cityId === mekkahCity?.id).map(h => h.name).join(", ");
  const madinahHotels = hotels.data.filter(h => h.cityId === madinahCity?.id).map(h => h.name).join(", ");

  const imageBuffer = fs.readFileSync(imagePath);
  const base64Image = imageBuffer.toString("base64");
  const mimeType = "image/jpeg";

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
    `• Maskapai: Ambil Maskapai Internasional utama (Carrier ke Saudi). WAJIB dari -> [${airlineOptions}]\n` +
    `• Hotel Mekkah & Madinah: Cari nama hotel untuk setiap klaster/kelas kamar dari daftar:\n` +
    `  - Hotel Mekkah: [${mekkahHotels}]\n` +
    `  - Hotel Madinah: [${madinahHotels}]\n` +
    `• Harga Base Paket: Ekstrak harga dasar paket (klaster ataupun non-klaster) dari flyer (hanya angka nominal).\n` +
    `• Tanggal Keberangkatan: Cari dan kumpulkan SEMUA tanggal keberangkatan yang ada di flyer utama (bisa 1, 2, 4, 5, 6 atau lebih tanggal). Format wajib YYYY-MM-DD.\n\n` +
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
    `--- DATA UNTUK DIANALISA ---\n` +
    `1. TEKS HASIL SCAN OCR: ${rawOcrText}\n\n` +
    `2. TEKS CAPTION: ${caption}\n\n` +
    `3. GAMBAR FLYER UTAMA (Telah dilampirkan): Analisa visual flyer utama & rute itinerary.`;

  const model = genAI.getGenerativeModel({ 
    model: "gemini-1.5-flash",
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
          isAdaPerlengkapan: { type: SchemaType.STRING, description: "Dari Caption: 'ya' jika termasuk perlengkapan, 'tidak' jika belum/tidak termasuk" },
          hargaBase: { type: SchemaType.STRING, description: "Harga base paket dari Flyer Utama (hanya angka nominal)" },
          upgradeDouble: { type: SchemaType.STRING, description: "Harga upgrade kamar double dari Caption (hanya angka nominal)" },
          upgradeTriple: { type: SchemaType.STRING, description: "Harga upgrade kamar triple dari Caption (hanya angka nominal)" },
          roomUpgrade: { type: SchemaType.STRING, description: "Informasi opsional upgrade kamar" },
          hotelUpgrade: { type: SchemaType.STRING, description: "Informasi opsional upgrade hotel" },
          promoText: { type: SchemaType.STRING, description: "Informasi opsional teks promo" },
          description: { type: SchemaType.STRING, description: "Deskripsi tambahan" },
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

  try {
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

    return parsed;
  } catch (error) {
    console.error("[Gemini Extractor] Error calling Gemini API:", error);
    throw new Error("Gagal memproses dengan Gemini AI. Harap periksa API Key Anda.");
  }
}
