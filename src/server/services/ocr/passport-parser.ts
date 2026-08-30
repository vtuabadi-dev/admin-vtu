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
 * Rekonstruksi NIK 16 digit dari 16 digit paling belakang pada baris MRZ paspor Indonesia (Line 2).
 * Sesuai instruksi:
 * 1. Ambil 16 digit paling belakang dari MRZ Line 2 (contoh: 3573021208000218)
 * 2. 8 digit dari belakang (08000218), sisipkan sebelum 8 digit tersebut angka tahun kelahiran format YY (contoh: 92) -> menjadi 18 digit
 * 3. Hapus 2 digit terakhir -> menghasilkan 16 digit NIK yang valid (contoh: 3573021208920002 atau 3573021292080002)
 */
export function reconstructNikFromPassportMrz(mrzLine2OrSuffix: string, birthYearYY?: string): string {
  if (!mrzLine2OrSuffix) return "";
  const cleanStr = mrzLine2OrSuffix.toUpperCase().replace(/<+/g, "").replace(/\s+/g, "");
  
  // Ambil 16 digit terakhir
  const digitsOnly = cleanStr.replace(/\D/g, "");
  let suffix16 = "";
  if (digitsOnly.length >= 16) {
    suffix16 = digitsOnly.slice(-16);
  } else if (digitsOnly.length >= 14) {
    suffix16 = digitsOnly.slice(-14);
  } else {
    return "";
  }

  // Tentukan tahun lahir 2 digit (YY)
  let yy = (birthYearYY || "").replace(/\D/g, "");
  if (yy.length === 4) yy = yy.slice(2, 4);
  if (!yy && cleanStr.length >= 20) {
    // Coba ekstrak dari posisi tanggal lahir di line 2 (chars 13-19 = YYMMDD)
    const dobMatch = cleanStr.match(/[A-Z]{3}(\d{2})\d{4}/);
    if (dobMatch?.[1]) yy = dobMatch[1];
  }

  if (!yy || yy.length !== 2) return "";

  if (suffix16.length === 16) {
    const prefix8 = suffix16.slice(0, 8); // 35730212
    const last8 = suffix16.slice(8, 16);   // 08000218
    const combined18 = `${prefix8}${yy}${last8}`; // 357302129208000218
    return combined18.slice(0, 16); // 3573021292080002 (16 digit)
  }

  if (suffix16.length === 14) {
    const prefix8 = suffix16.slice(0, 8);
    const last6 = suffix16.slice(8, 14);
    return `${prefix8}${yy}${last6}`;
  }

  return "";
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

    // 5. NIK / Personal Number (chars 28-44) - Rekonstruksi NIK 16 digit
    const nikMatch = cleanL2.match(/[A-Z]{3}\d{7}[MF<]\d{7}([0-9A-Z<]{14,16})/);
    const rawSuffix = nikMatch?.[1] ? nikMatch[1].replace(/<+/g, "").replace(/\D/g, "") : cleanL2.slice(-16).replace(/\D/g, "");
    
    if (rawSuffix.length >= 14) {
      const birthYY = parsed.dateOfBirth ? parsed.dateOfBirth.slice(2, 4) : "";
      const reconstructedNik = reconstructNikFromPassportMrz(rawSuffix, birthYY);
      if (reconstructedNik && reconstructedNik.length === 16) {
        parsed.personalNumber = reconstructedNik;
      } else if (rawSuffix.length >= 10) {
        parsed.personalNumber = rawSuffix;
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
    /(?:KANTOR\s*(?:YANG\s*)?MENGELUARKAN(?:\s*\/\s*ISSUING\s*(?:OFFICE|AUTHORITY))?|ISSUING\s*(?:OFFICE|AUTHORITY)|KANTOR\s*IMIGRASI|ISSUING\s*OFFICE|DITERBITKAN\s*DI(?:\s*\/\s*PLACE\s*OF\s*ISSUE)?|PLACE\s*OF\s*ISSUE)\s*[:=]?\s*([A-Z\s.,'-]+?)(?:\r?\n|$)/i,
    /1A[0-9A-Z]{10,}\s*\r?\n?\s*([A-Z\s]+?)(?:\r?\n|$)/i,
  ],
  tanggalTerbitPaspor: [
    /(?:TGL\.?\s*PENGELUARAN(?:\s*\/\s*DATE\s*OF\s*ISSUE)?|DATE\s*OF\s*ISSUE|TANGGAL\s*PENGELUARAN|TANGGAL\s*TERBIT|TGL\.?\s*TERBIT|ISSUE\s*DATE)\s*[:=]?\s*(\d{1,2}[ \-/]+[A-Za-z]+[ \-/]+\d{4}|\d{1,2}[-/\.]\d{1,2}[-/\.]\d{4}|\d{4}[-/\.]\d{1,2}[-/\.]\d{4}|[^\r\n]+)/i,
  ],
  tanggalKadaluarsa: [
    /(?:TGL\.?\s*HABIS\s*BERLAKU(?:\s*\/\s*DATE\s*OF\s*EXPIRY)?|BERLAKU\s*S\/?D\.?(?:\s*\/\s*DATE\s*OF\s*EXPIRY)?|DATE\s*OF\s*EXPIRY|TANGGAL\s*KADALUARSA|TGL\.?\s*KADALUARSA|EXPIRY\s*DATE|HABIS\s*BERLAKU|BERLAKU\s*(?:HINGGA|SAMPAI)|MASA\s*BERLAKU)\s*[:=]?\s*(\d{1,2}[ \-/]+[A-Za-z]+[ \-/]+\d{4}|\d{1,2}[-/\.]\d{1,2}[-/\.]\d{4}|\d{4}[-/\.]\d{1,2}[-/\.]\d{4}|[^\r\n]+)/i,
  ],
  tempatLahir: [
    /(?:TEMPAT\s*LAHIR(?:\s*\/\s*PLACE\s*OF\s*BIRTH)?|PLACE\s*OF\s*BIRTH)\s*[:=]?\s*([A-Z\s.,'-]+?)(?:\r?\n|Tgl|Date|Jenis|Sex|$)/i,
    /(?:TEMPAT\s*\/?\s*TGL?\s*\.?\s*LAHIR)\s*[:=]?\s*([^,\r\n]+)/i,
  ],
  tanggalLahir: [
    /(?:TGL\.?\s*LAHIR(?:\s*\/\s*DATE\s*OF\s*BIRTH)?|DATE\s*OF\s*BIRTH|TANGGAL\s*LAHIR)\s*[:=]?\s*(\d{1,2}[ \-/]+[A-Za-z]+[ \-/]+\d{4}|\d{1,2}[-/\.]\d{1,2}[-/\.]\d{4}|\d{4}[-/\.]\d{1,2}[-/\.]\d{4}|[^\r\n]+)/i,
    /(?:TEMPAT\s*\/?\s*TGL?\s*\.?\s*LAHIR)\s*[:=]?\s*.+?,\s*([^\r\n]+)/i,
  ],
  jenisKelamin: [
    /(?:JENIS\s*KELAMIN(?:\s*\/\s*SEX)?|SEX)\s*[:=]?\s*([LP]\s*\/\s*[MF]|[LPMF]|Laki-laki|Perempuan|Male|Female)/i,
  ],
  kewarganegaraan: [
    /(?:KEWARGANEGARAAN(?:\s*\/\s*NATIONALITY)?|NATIONALITY)\s*[:=]?\s*([A-Z\s]+)/i,
  ],
};

/**
 * Ekstrak nilai field baik pada baris yang sama maupun baris berikutnya (multi-line OCR)
 */
function extractByRegexOrNextLine(text: string, patterns: RegExp[]): string {
  // 1. Same-line match
  for (const regex of patterns) {
    const match = text.match(regex);
    if (match?.[1]) {
      const val = match[1].trim();
      if (val && val !== "-" && val !== ":") return val;
    }
  }

  // 2. Multi-line match: Label on line i, Value on line i+1
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    for (const regex of patterns) {
      if (regex.test(line)) {
        if (i + 1 < lines.length) {
          const nextLine = lines[i + 1]!;
          if (!nextLine.startsWith("P<") && !nextLine.includes("REPUBLIK") && !nextLine.includes("PASPOR")) {
            return nextLine.trim();
          }
        }
      }
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
  val = val
    .replace(/^KANIM\s+(?:KELAS\s+[I|V|X\d]+\s+)?(?:TPI\s+)?/i, "")
    .replace(/^KANTOR\s+IMIGRASI\s+(?:KELAS\s+[I|V|X\d]+\s+)?(?:TPI\s+)?/i, "")
    .replace(/^KANTOR\s+YANG\s+MENGELUARKAN(?:\s*\/\s*ISSUING\s*(?:OFFICE|AUTHORITY))?\s*[:=]?\s*/i, "")
    .replace(/^ISSUING\s+(?:OFFICE|AUTHORITY)\s*[:=]?\s*/i, "")
    .replace(/^[0-9A-Z]{10,}\s+/i, "")
    .replace(/^[:\-\s]+/, "")
    .trim();
  return val;
}

// Daftar kota besar / kantor imigrasi Indonesia untuk pencarian fallback
const INDONESIAN_KANIM_CITIES = [
  "MALANG", "JAKARTA", "JAKARTA PUSAT", "JAKARTA SELATAN", "JAKARTA BARAT", "JAKARTA UTARA", "JAKARTA TIMUR",
  "SURABAYA", "BANDUNG", "MEDAN", "SEMARANG", "MAKASSAR", "DENPASAR", "YOGYAKARTA", "SURAKARTA", "SOLO",
  "TANGERANG", "BEKASI", "BOGOR", "DEPOK", "BATAM", "PEKANBARU", "PALEMBANG", "PONTIANAK", "BANJARMASIN",
  "MANADO", "MATARAM", "KUPANG", "AMBON", "JAYAPURA", "SERANG", "CIREBON", "TASIKMALAYA", "KEDIRI", "JEMBER",
  "MADIUN", "BLITAR", "PROBOLINGGO", "PASURUAN", "BANYUWANGI", "CILACAP", "PATI", "PEMALANG", "PURWOKERTO",
  "MAGELANG", "SALATIGA", "TEGAL", "PEKALONGAN", "SUKABUMI", "KARAWANG", "CIANJUR", "BANDA ACEH", "JAMBI",
  "SAMARINDA", "BALIKPAPAN", "TARAKAN", "PALANGKARAYA", "KENDARI", "PALU", "GORONTALO", "SORONG", "TIMIKA",
];

function findCityNearIssuingOffice(text: string): string {
  const lines = text.split(/\r?\n/).map((l) => l.trim().toUpperCase());
  // Cari baris yang mengandung ISSUING atau MENGELUARKAN atau 1A...
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i]!;
    if (l.includes("ISSUING") || l.includes("MENGELUARKAN") || l.includes("IMIGRASI") || /^1A[0-9A-Z]{8,}/.test(l)) {
      // Cek baris yang sama
      for (const city of INDONESIAN_KANIM_CITIES) {
        if (l.includes(city)) return city;
      }
      // Cek baris berikutnya (i+1, i+2)
      for (let offset = 1; offset <= 2 && i + offset < lines.length; offset++) {
        const nextLine = lines[i + offset]!;
        for (const city of INDONESIAN_KANIM_CITIES) {
          if (nextLine === city || nextLine.includes(city)) return city;
        }
      }
    }
  }
  return "";
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
    extractByRegexOrNextLine(rawText, PASSPORT_PATTERNS.nomorPaspor) ||
    ""
  ).toString().trim().toUpperCase().replace(/\s+/g, "");

  // 2. Nama Lengkap
  let namaLengkap = (
    json.namaLengkap ||
    json.fullName ||
    json.name ||
    extractByRegexOrNextLine(rawText, PASSPORT_PATTERNS.namaLengkap) ||
    mrz?.fullName ||
    ""
  ).toString().trim().toUpperCase();

  // 3. Tempat Terbit Paspor (Tempat/Kantor yang mengeluarkan di kanan bawah)
  let tempatTerbitPaspor = (
    json.tempatTerbitPaspor ||
    json.tempatTerbit ||
    json.issuingAuthority ||
    json.kantorYangMengeluarkan ||
    json.kantorPenerbit ||
    json.kantorImigrasi ||
    json.placeOfIssue ||
    json.issuingOffice ||
    extractByRegexOrNextLine(rawText, PASSPORT_PATTERNS.tempatTerbitPaspor) ||
    findCityNearIssuingOffice(rawText) ||
    ""
  ).toString().trim();
  tempatTerbitPaspor = cleanTempatTerbit(tempatTerbitPaspor);
  if (!tempatTerbitPaspor) {
    tempatTerbitPaspor = findCityNearIssuingOffice(rawText);
  }

  // 4. Tanggal Terbit Paspor (Tgl. Pengeluaran di kiri tgl habis berlaku)
  const rawTanggalTerbit = (
    json.tanggalTerbitPaspor ||
    json.tanggalTerbit ||
    json.tanggalPengeluaran ||
    json.tglPengeluaran ||
    json.dateOfIssue ||
    json.tglTerbit ||
    json.issueDate ||
    extractByRegexOrNextLine(rawText, PASSPORT_PATTERNS.tanggalTerbitPaspor) ||
    ""
  ).toString().trim();
  const tanggalTerbitPaspor = normalizePassportDate(rawTanggalTerbit);

  // 5. Tanggal Kadaluarsa Paspor (Tgl. Habis Berlaku di atas kantor penerbit / MRZ line 2)
  const rawTanggalKadaluarsa = (
    json.tanggalKadaluarsa ||
    json.masaBerlaku ||
    json.dateOfExpiry ||
    json.expiryDate ||
    json.berlakuHingga ||
    json.berlakuSampai ||
    json.tglKadaluarsa ||
    json.tglHabisBerlaku ||
    mrz?.expiryDate ||
    extractByRegexOrNextLine(rawText, PASSPORT_PATTERNS.tanggalKadaluarsa) ||
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
    extractByRegexOrNextLine(rawText, PASSPORT_PATTERNS.tempatLahir) ||
    ""
  ).toString().trim().toUpperCase();

  // 7. Tanggal Lahir
  const rawTanggalLahir = (
    json.tanggalLahir ||
    json.dateOfBirth ||
    json.tglLahir ||
    mrz?.dateOfBirth ||
    extractByRegexOrNextLine(rawText, PASSPORT_PATTERNS.tanggalLahir) ||
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
    extractByRegexOrNextLine(rawText, PASSPORT_PATTERNS.jenisKelamin) ||
    ""
  ).toString().trim();

  // 9. Kewarganegaraan
  const kewarganegaraan = (
    json.kewarganegaraan ||
    json.nationality ||
    mrz?.nationality ||
    extractByRegexOrNextLine(rawText, PASSPORT_PATTERNS.kewarganegaraan) ||
    "INDONESIA"
  ).toString().trim().toUpperCase();

  // 10. NIK
  let nik = (
    json.nik ||
    mrz?.personalNumber ||
    ""
  ).toString().trim();

  if (!nik || nik.length < 16) {
    const birthYY = tanggalLahir ? tanggalLahir.slice(2, 4) : (mrz?.dateOfBirth ? mrz.dateOfBirth.slice(2, 4) : "");
    if (birthYY) {
      const candidateLines = rawText.split(/\r?\n/).map((l) => l.trim().replace(/\s+/g, "").toUpperCase());
      for (const line of candidateLines) {
        if (line.length >= 30 && (line.includes("IDN") || line.startsWith("X") || line.startsWith("C") || line.startsWith("A") || line.startsWith("B"))) {
          const reconstructed = reconstructNikFromPassportMrz(line, birthYY);
          if (reconstructed && reconstructed.length === 16) {
            nik = reconstructed;
            break;
          }
        }
      }
    }
  }

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
