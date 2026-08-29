// ============================================================
// Passport Parser — Ekstrak & Normalisasi Data Paspor Indonesia
// ============================================================
// Menangani ekstraksi data paspor dari teks OCR / respon AI:
// 1. Parsing JSON dari Gemini / API dengan resolusi alias key
// 2. Normalisasi tanggal bilingual (ID/EN) ke format ISO YYYY-MM-DD
// 3. Fallback Regex berdasarkan label blangko Paspor RI
// 4. Decoder MRZ (Machine Readable Zone — ICAO Doc 9303 Type 3)
// ============================================================

export interface PassportData {
  namaLengkap: string;
  nomorPaspor: string;
  tempatTerbitPaspor: string;
  tanggalTerbitPaspor: string;
  tanggalKadaluarsa: string;
  tempatLahir: string;
  tanggalLahir: string;
  jenisKelamin: string;
  kewarganegaraan: string;
  nik: string;
  rawOcrText: string;
  confidence: number;
}

// ── Mapping Nama Bulan (Indonesia & Inggris) ──────────────────

const MONTHS: Record<string, string> = {
  // Indonesian
  januari: "01", februari: "02", maret: "03", april: "04",
  mei: "05", juni: "06", juli: "07", agustus: "08",
  september: "09", oktober: "10", november: "11", desember: "12",
  jan: "01", feb: "02", mar: "03", apr: "04",
  jun: "06", jul: "07", ags: "08", agt: "08", agu: "08",
  sep: "09", okt: "10", nov: "11", des: "12",
  // English
  january: "01", february: "02", march: "03",
  may: "05", june: "06", july: "07", august: "08",
  october: "10", december: "12",
  aug: "08", oct: "10", dec: "12",
};

/**
 * Normalisasi format tanggal apapun ke standard YYYY-MM-DD
 * Contoh:
 * - "10 DEC 2024" -> "2024-12-10"
 * - "10 DES 2024" -> "2024-12-10"
 * - "12 AUG 1992" -> "1992-08-12"
 * - "10/12/2024"  -> "2024-12-10"
 * - "2024-12-10"  -> "2024-12-10"
 */
export function normalizePassportDate(raw: string | undefined | null): string {
  if (!raw) return "";
  const trimmed = String(raw).trim();
  if (!trimmed) return "";

  // Already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;

  // DD-MMM-YYYY or DD MMM YYYY (e.g. 10 DEC 2024, 10-DEC-2024, 10 DESEMBER 2024)
  const textMonth = trimmed.match(/^(\d{1,2})[\s\-/]+([a-zA-Z]+)[\s\-/]+(\d{4})$/i);
  if (textMonth?.[1] && textMonth?.[2] && textMonth?.[3]) {
    const monthKey = textMonth[2].toLowerCase();
    const mm = MONTHS[monthKey];
    if (mm) {
      const dd = textMonth[1].padStart(2, "0");
      return `${textMonth[3]}-${mm}-${dd}`;
    }
  }

  // DD/MM/YYYY or DD-MM-YYYY
  const dmy = trimmed.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
  if (dmy?.[1] && dmy?.[2] && dmy?.[3]) {
    const dd = parseInt(dmy[1], 10);
    const mm = parseInt(dmy[2], 10);
    if (dd >= 1 && dd <= 31 && mm >= 1 && mm <= 12) {
      return `${dmy[3]}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
    }
    // Swap if MM/DD/YYYY
    if (mm >= 1 && mm <= 31 && dd >= 1 && dd <= 12) {
      return `${dmy[3]}-${String(dd).padStart(2, "0")}-${String(mm).padStart(2, "0")}`;
    }
  }

  // YYYY/MM/DD or YYYY.MM.DD
  const ymd = trimmed.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (ymd?.[1] && ymd?.[2] && ymd?.[3]) {
    return `${ymd[1]}-${ymd[2].padStart(2, "0")}-${ymd[3].padStart(2, "0")}`;
  }

  return trimmed;
}

// ── MRZ Parser (ICAO Doc 9303 TD3 - 2 lines x 44 chars) ──────

export interface MrzParsed {
  passportNumber?: string;
  surname?: string;
  givenNames?: string;
  fullName?: string;
  nationality?: string;
  dateOfBirth?: string; // YYYY-MM-DD
  sex?: string;
  expiryDate?: string;  // YYYY-MM-DD
  personalNumber?: string; // NIK
}

/**
 * Ekstrak data dari Machine Readable Zone (MRZ) di bagian bawah paspor.
 * Line 1: P<IDNZAMRONI<<MUCHAMAD<<<<<<<<<<<<<<<<<<<<<<
 * Line 2: X4573266<8IDN9208120M34121013573021208000218
 */
export function parseMrzLines(text: string): MrzParsed | null {
  if (!text) return null;

  // Cari baris yang mirip MRZ
  // Line 1 biasanya diawali P<
  // Line 2 biasanya diawali nomor paspor (misal X4573266, C1234567, dll)
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim().replace(/\s+/g, "").toUpperCase())
    .filter((l) => l.includes("<"));

  let line1 = "";
  let line2 = "";

  for (let i = 0; i < lines.length; i++) {
    const l = lines[i]!;
    if (l.startsWith("P<") && l.length >= 30) {
      line1 = l;
      if (i + 1 < lines.length && lines[i + 1]!.length >= 30) {
        line2 = lines[i + 1]!;
      }
      break;
    }
  }

  // Jika tidak ditemukan dengan P<, coba cari pola 2 baris berurutan dengan banyak '<'
  if (!line1 && lines.length >= 2) {
    for (let i = 0; i < lines.length - 1; i++) {
      if (lines[i]!.length >= 30 && lines[i + 1]!.length >= 30) {
        line1 = lines[i]!;
        line2 = lines[i + 1]!;
        break;
      }
    }
  }

  if (!line1 && !line2) return null;

  const parsed: MrzParsed = {};

  // ── Parse Line 1: P<IDNSURNAME<<GIVEN<NAMES<<<<< ─────────
  if (line1) {
    // Bersihkan karakter pembuka
    const docTypeMatch = line1.match(/^P<([A-Z]{3})?(.+)$/);
    if (docTypeMatch?.[2]) {
      const nameSection = docTypeMatch[2];
      const parts = nameSection.split("<<");
      const surname = parts[0]?.replace(/<+/g, " ").trim() || "";
      const given = parts[1]?.replace(/<+/g, " ").trim() || "";
      parsed.surname = surname;
      parsed.givenNames = given;
      parsed.fullName = [given, surname].filter(Boolean).join(" ").trim() || surname;
    }
  }

  // ── Parse Line 2: X4573266<8IDN9208120M34121013573021208000218 ─────────
  if (line2) {
    // Normalisasi panjang line2
    const cleanL2 = line2.padEnd(44, "<");

    // 1. Passport Number: chars 0-9 (sebelum check digit pertama)
    const passMatch = cleanL2.match(/^([A-Z0-9]{7,9})<?(\d)?([A-Z]{3})/);
    if (passMatch) {
      parsed.passportNumber = passMatch[1]?.replace(/<+/g, "");
      parsed.nationality = passMatch[3];
    } else {
      const rawNum = cleanL2.slice(0, 9).replace(/<+/g, "");
      if (rawNum) parsed.passportNumber = rawNum;
    }

    // 2. Tanggal Lahir (DOB): setelah nationality (index 13-19 = YYMMDD)
    const dobMatch = cleanL2.match(/[A-Z]{3}(\d{6})/);
    if (dobMatch?.[1]) {
      const yymmdd = dobMatch[1];
      const yy = parseInt(yymmdd.slice(0, 2), 10);
      const mm = yymmdd.slice(2, 4);
      const dd = yymmdd.slice(4, 6);
      const year = yy > 26 ? 1900 + yy : 2000 + yy;
      parsed.dateOfBirth = `${year}-${mm}-${dd}`;
    }

    // 3. Jenis Kelamin (Sex): setelah check digit DOB (index 20)
    const sexMatch = cleanL2.match(/[A-Z]{3}\d{7}([MF<])/);
    if (sexMatch?.[1]) {
      parsed.sex = sexMatch[1] === "M" ? "Laki-laki" : sexMatch[1] === "F" ? "Perempuan" : "";
    }

    // 4. Tanggal Kadaluarsa (Expiry): YYMMDD setelah sex
    const expiryMatch = cleanL2.match(/[A-Z]{3}\d{7}[MF<](\d{6})/);
    if (expiryMatch?.[1]) {
      const yymmdd = expiryMatch[1];
      const yy = parseInt(yymmdd.slice(0, 2), 10);
      const mm = yymmdd.slice(2, 4);
      const dd = yymmdd.slice(4, 6);
      const year = yy <= 70 ? 2000 + yy : 1900 + yy;
      parsed.expiryDate = `${year}-${mm}-${dd}`;
    }

    // 5. NIK / Personal Number (chars 28-42)
    const nikMatch = cleanL2.match(/[A-Z]{3}\d{7}[MF<]\d{7}([0-9A-Z<]{14,16})/);
    if (nikMatch?.[1]) {
      const cleanNik = nikMatch[1].replace(/<+/g, "").replace(/\D/g, "");
      if (cleanNik.length >= 10) {
        parsed.personalNumber = cleanNik;
      }
    }
  }

  return parsed;
}

// ── Regex Extractors untuk Paspor Indonesia ───────────────────

const PASSPORT_PATTERNS = {
  nomorPaspor: [
    /(?:NO\.?\s*PASPOR(?:\s*\/\s*PASSPORT\s*NO\.?)?|PASSPORT\s*(?:NO|NUMBER)\.?|PASPOR\s*(?:NO|NUMBER)\.?|NOMOR\s*PASPOR|PASSPORT\s*:|PASPOR\s*:)\s*[:=]?\s*([A-Z0-9]+)/i,
    /\b([A-Z]\d{7,8})\b/i,
  ],
  namaLengkap: [
    /(?:NAMA\s*LENGKAP(?:\s*\/\s*FULL\s*NAME)?|FULL\s*NAME|SURNAME|NAMA|NAME)\s*[:=]?\s*([A-Z\s.,'-]+?)(?:\r?\n|Kewarganegaraan|Nationality|IDN|$)/i,
  ],
  tempatTerbitPaspor: [
    /(?:KANTOR\s*(?:YANG\s*)?MENGELUARKAN(?:\s*\/\s*ISSUING\s*AUTHORITY)?|ISSUING\s*AUTHORITY|KANTOR\s*IMIGRASI|ISSUING\s*OFFICE|DITERBITKAN\s*DI(?:\s*\/\s*PLACE\s*OF\s*ISSUE)?|PLACE\s*OF\s*ISSUE)\s*[:=]?\s*([A-Z\s.,'-]+?)(?:\r?\n|$)/i,
    /1A[0-9A-Z]{10,}\s*\r?\n?\s*([A-Z\s]+?)(?:\r?\n|$)/i,
  ],
  tanggalTerbitPaspor: [
    /(?:TGL\.?\s*PENGELUARAN(?:\s*\/\s*DATE\s*OF\s*ISSUE)?|DATE\s*OF\s*ISSUE|TANGGAL\s*PENGELUARAN|TANGGAL\s*TERBIT|TGL\.?\s*TERBIT|ISSUE\s*DATE)\s*[:=]?\s*(\d{1,2}[ \-/]+[A-Za-z]+[ \-/]+\d{4}|\d{1,2}[-/\.]\d{1,2}[-/\.]\d{4}|\d{4}[-/\.]\d{1,2}[-/\.]\d{1,2}|[^\r\n]+)/i,
  ],
  tanggalKadaluarsa: [
    /(?:BERLAKU\s*S\/?D\.?(?:\s*\/\s*DATE\s*OF\s*EXPIRY)?|DATE\s*OF\s*EXPIRY|TANGGAL\s*KADALUARSA|EXPIRY\s*DATE|BERLAKU\s*(?:HINGGA|SAMPAI)|MASA\s*BERLAKU)\s*[:=]?\s*(\d{1,2}[ \-/]+[A-Za-z]+[ \-/]+\d{4}|\d{1,2}[-/\.]\d{1,2}[-/\.]\d{4}|\d{4}[-/\.]\d{1,2}[-/\.]\d{1,2}|[^\r\n]+)/i,
  ],
  tempatLahir: [
    /(?:TEMPAT\s*LAHIR(?:\s*\/\s*PLACE\s*OF\s*BIRTH)?|PLACE\s*OF\s*BIRTH)\s*[:=]?\s*([A-Z\s.,'-]+?)(?:\r?\n|Tgl|Date|Jenis|Sex|$)/i,
    /(?:TEMPAT\s*\/?\s*TGL?\s*\.?\s*LAHIR)\s*[:=]?\s*([^,\r\n]+)/i,
  ],
  tanggalLahir: [
    /(?:TGL\.?\s*LAHIR(?:\s*\/\s*DATE\s*OF\s*BIRTH)?|DATE\s*OF\s*BIRTH|TANGGAL\s*LAHIR)\s*[:=]?\s*(\d{1,2}[ \-/]+[A-Za-z]+[ \-/]+\d{4}|\d{1,2}[-/\.]\d{1,2}[-/\.]\d{4}|\d{4}[-/\.]\d{1,2}[-/\.]\d{1,2}|[^\r\n]+)/i,
    /(?:TEMPAT\s*\/?\s*TGL?\s*\.?\s*LAHIR)\s*[:=]?\s*.+?,\s*([^\r\n]+)/i,
  ],
  jenisKelamin: [
    /(?:JENIS\s*KELAMIN(?:\s*\/\s*SEX)?|SEX)\s*[:=]?\s*([LP]\s*\/\s*[MF]|[LPMF]|Laki-laki|Perempuan|Male|Female)/i,
  ],
  kewarganegaraan: [
    /(?:KEWARGANEGARAAN(?:\s*\/\s*NATIONALITY)?|NATIONALITY)\s*[:=]?\s*([A-Z\s]+)/i,
  ],
};

function extractByRegex(text: string, patterns: RegExp[]): string {
  for (const regex of patterns) {
    const match = text.match(regex);
    if (match?.[1]) {
      const val = match[1].trim();
      if (val && val !== "-" && val !== ":") return val;
    }
  }
  return "";
}

/**
 * Bersihkan nilai tempat terbit paspor (hilangkan label berlebih jika terbawa)
 */
export function cleanTempatTerbit(raw: string): string {
  if (!raw) return "";
  let val = raw.trim().toUpperCase();
  // Hilangkan prefix umum seperti "KANIM KELAS I TPI ", "KANTOR IMIGRASI ", dsb jika ingin nama kota murni
  val = val
    .replace(/^KANIM\s+(?:KELAS\s+[I|V|X\d]+\s+)?(?:TPI\s+)?/i, "")
    .replace(/^KANTOR\s+IMIGRASI\s+(?:KELAS\s+[I|V|X\d]+\s+)?(?:TPI\s+)?/i, "")
    .replace(/^KANTOR\s+YANG\s+MENGELUARKAN\s*[:=]?\s*/i, "")
    .replace(/^ISSUING\s+AUTHORITY\s*[:=]?\s*/i, "")
    .replace(/^[0-9A-Z]{10,}\s+/i, "") // hapus no reg jika ikut terbawa
    .trim();
  return val;
}

// ── Parser Utama Paspor ───────────────────────────────────────

/**
 * Ekstraksi lengkap data paspor dari parsed JSON AI dan/atau raw text OCR.
 */
export function parsePassport(
  rawText: string = "",
  parsedJson: Record<string, any> | null = null,
): PassportData {
  const json = parsedJson || {};
  const mrz = parseMrzLines(rawText);

  // 1. Nomor Paspor
  let nomorPaspor = (
    json.nomorPaspor ||
    json.noPaspor ||
    json.passportNumber ||
    json.passportNo ||
    mrz?.passportNumber ||
    extractByRegex(rawText, PASSPORT_PATTERNS.nomorPaspor) ||
    ""
  ).toString().trim().toUpperCase().replace(/\s+/g, "");

  // 2. Nama Lengkap
  let namaLengkap = (
    json.namaLengkap ||
    json.fullName ||
    json.name ||
    extractByRegex(rawText, PASSPORT_PATTERNS.namaLengkap) ||
    mrz?.fullName ||
    ""
  ).toString().trim().toUpperCase();

  // 3. Tempat Terbit Paspor (Tempat/Kantor yang mengeluarkan)
  let tempatTerbitPaspor = (
    json.tempatTerbitPaspor ||
    json.tempatTerbit ||
    json.issuingAuthority ||
    json.kantorYangMengeluarkan ||
    json.kantorPenerbit ||
    json.kantorImigrasi ||
    json.placeOfIssue ||
    json.issuingOffice ||
    extractByRegex(rawText, PASSPORT_PATTERNS.tempatTerbitPaspor) ||
    ""
  ).toString().trim();
  tempatTerbitPaspor = cleanTempatTerbit(tempatTerbitPaspor);

  // 4. Tanggal Terbit Paspor
  const rawTanggalTerbit = (
    json.tanggalTerbitPaspor ||
    json.tanggalTerbit ||
    json.tanggalPengeluaran ||
    json.tglPengeluaran ||
    json.dateOfIssue ||
    json.tglTerbit ||
    json.issueDate ||
    extractByRegex(rawText, PASSPORT_PATTERNS.tanggalTerbitPaspor) ||
    ""
  ).toString().trim();
  const tanggalTerbitPaspor = normalizePassportDate(rawTanggalTerbit);

  // 5. Tanggal Kadaluarsa Paspor
  const rawTanggalKadaluarsa = (
    json.tanggalKadaluarsa ||
    json.masaBerlaku ||
    json.dateOfExpiry ||
    json.expiryDate ||
    json.berlakuHingga ||
    json.berlakuSampai ||
    json.tglKadaluarsa ||
    mrz?.expiryDate ||
    extractByRegex(rawText, PASSPORT_PATTERNS.tanggalKadaluarsa) ||
    ""
  ).toString().trim();
  let tanggalKadaluarsa = normalizePassportDate(rawTanggalKadaluarsa);
  if (!tanggalKadaluarsa && mrz?.expiryDate) {
    tanggalKadaluarsa = mrz.expiryDate;
  }

  // 6. Tempat Lahir
  let tempatLahir = (
    json.tempatLahir ||
    json.placeOfBirth ||
    extractByRegex(rawText, PASSPORT_PATTERNS.tempatLahir) ||
    ""
  ).toString().trim().toUpperCase();

  // 7. Tanggal Lahir
  const rawTanggalLahir = (
    json.tanggalLahir ||
    json.dateOfBirth ||
    json.tglLahir ||
    mrz?.dateOfBirth ||
    extractByRegex(rawText, PASSPORT_PATTERNS.tanggalLahir) ||
    ""
  ).toString().trim();
  let tanggalLahir = normalizePassportDate(rawTanggalLahir);
  if (!tanggalLahir && mrz?.dateOfBirth) {
    tanggalLahir = mrz.dateOfBirth;
  }

  // 8. Jenis Kelamin
  const jenisKelamin = (
    json.jenisKelamin ||
    json.sex ||
    mrz?.sex ||
    extractByRegex(rawText, PASSPORT_PATTERNS.jenisKelamin) ||
    ""
  ).toString().trim();

  // 9. Kewarganegaraan
  const kewarganegaraan = (
    json.kewarganegaraan ||
    json.nationality ||
    mrz?.nationality ||
    extractByRegex(rawText, PASSPORT_PATTERNS.kewarganegaraan) ||
    "INDONESIA"
  ).toString().trim().toUpperCase();

  // 10. NIK
  const nik = (
    json.nik ||
    mrz?.personalNumber ||
    ""
  ).toString().trim();

  // Hitung confidence
  let confidence = 0.5;
  if (nomorPaspor) confidence += 0.15;
  if (namaLengkap) confidence += 0.15;
  if (tanggalKadaluarsa) confidence += 0.1;
  if (tempatTerbitPaspor) confidence += 0.05;
  if (tanggalTerbitPaspor) confidence += 0.05;
  confidence = Math.min(0.99, confidence);

  return {
    namaLengkap,
    nomorPaspor,
    tempatTerbitPaspor,
    tanggalTerbitPaspor,
    tanggalKadaluarsa,
    tempatLahir,
    tanggalLahir,
    jenisKelamin,
    kewarganegaraan,
    nik,
    rawOcrText: rawText,
    confidence,
  };
}
