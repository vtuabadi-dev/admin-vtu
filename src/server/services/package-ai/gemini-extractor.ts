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

  const prompt = `Kamu adalah sistem data entry travel umroh ahli. Analisa GAMBAR TERLAMPIR, TEKS OCR, dan CAPTION berikut.\n\n` +
    `--- ATURAN MASKAPAI ---\n` +
    `Ambil MASKAPAI INTERNASIONAL utama (Carrier Utama ke Saudi). ABAIKAN maskapai domestik/pengumpan.\n` +
    `Maskapai WAJIB dipilih persis dari daftar ini -> [${airlineOptions}]\n\n` +
    `--- ATURAN KOTA KEBERANGKATAN (STARTING) ---\n` +
    `Kota keberangkatan WAJIB dipilih persis dari daftar ini -> [${cityOptions}]\n\n` +
    `--- ATURAN JENIS PAKET ---\n` +
    `Jenis paket WAJIB dipilih persis dari daftar ini -> [${typeOptions}]\n\n` +
    `--- ATURAN HOTEL ---\n` +
    `Pilih hotel yang paling mendekati dari daftar berikut:\n` +
    `- Hotel Mekkah: [${mekkahHotels}]\n` +
    `- Hotel Madinah: [${madinahHotels}]\n\n` +
    `--- ATURAN EKSTRAKSI RUTE IN-OUT (LANDING) ---\n` +
    `Tentukan rute kedatangan dan kepulangan (Landing Route).\n` +
    `Rute WAJIB dipilih persis dari daftar ini -> [${routeOptions}]\n\n` +
    `Pertama, tentukan Jenis Paket (Umroh Reguler atau Umroh Plus).\n` +
    `A. JIKA JENIS PAKET = UMROH REGULER\n` +
    `- Jika tertulis jelas 'LANDING JEDDAH OUT MADINAH' -> WAJIB pilih rute 'Jeddah -> Madinah'\n` +
    `- Jika rute 'Jeddah - Makkah dulu' -> WAJIB pilih rute 'Jeddah -> Makkah' (out Jeddah/Madinah sesuai flyer)\n` +
    `- Jika tertulis 'Landing Madinah' atau 'Out Jeddah' -> WAJIB pilih rute 'Madinah -> Jeddah'\n\n` +
    `B. JIKA JENIS PAKET = UMROH PLUS (Singgah di Negara Lain)\n` +
    `Petakan data Landing berdasarkan waktu kunjungan ke Arab Saudi & urutan kota suci. Khusus paket plus, WAJIB gunakan prefix 'Tour Dulu' atau 'Umroh Dulu'.\n` +
    `- Umroh Dulu (Arab Saudi dulu), Madinah dulu -> 'Umroh Dulu - Madinah -> [Out]'\n` +
    `- Tour Dulu (Negara lain dulu), Madinah dulu -> 'Tour Dulu -> Madinah -> [Out]'\n` +
    `- Tour Dulu (Negara lain dulu), Makkah dulu -> 'Tour Dulu -> Makkah -> [Out]'\n\n` +
    `--- DATA UNTUK DIANALISA ---\n` +
    `1. TEKS HASIL SCAN OCR: ${rawOcrText}\n\n` +
    `2. TEKS CAPTION: ${caption}\n\n` +
    `3. GAMBAR FLYER (Telah dilampirkan): Gunakan matamu untuk mencari TANGGAL KEBERANGKATAN yang mungkin layoutnya berantakan.`;

  const model = genAI.getGenerativeModel({ 
    model: "gemini-1.5-flash",
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: {
        type: SchemaType.OBJECT,
        properties: {
          title: { type: SchemaType.STRING, description: "Buatkan judul singkat dan menarik untuk paket ini. Format: [Jenis Paket] [Durasi] Hari [Tahun]" },
          packageType: { type: SchemaType.STRING },
          durationDays: { type: SchemaType.INTEGER, description: "Jumlah total durasi hari perjalanan" },
          departureCity: { type: SchemaType.STRING },
          airline: { type: SchemaType.STRING },
          hotelMekkah: { type: SchemaType.STRING },
          hotelMadinah: { type: SchemaType.STRING },
          landingRoute: { type: SchemaType.STRING, description: "Rute In-Out pesawat (Landing dan Takeoff)" },
          roomUpgrade: { type: SchemaType.STRING, description: "Informasi opsional upgrade kamar (cth: Double, Triple)" },
          hotelUpgrade: { type: SchemaType.STRING, description: "Informasi opsional upgrade hotel" },
          promoText: { type: SchemaType.STRING, description: "Informasi opsional teks promo atau diskon khusus" },
          description: { type: SchemaType.STRING, description: "Informasi opsional deskripsi tambahan" },
          departureDates: {
            type: SchemaType.ARRAY,
            items: { type: SchemaType.STRING },
            description: "Gunakan matamu membaca GAMBAR. Ekstrak SEMUA tanggal keberangkatan. Format wajib: YYYY-MM-DD. (Contoh: ['2026-06-27'])"
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
