// KTP Parser — ekstrak data terstruktur dari hasil OCR KTP Indonesia
// Input: raw OCR text dari Google Vision
// Output: KtpData JSON
// Hardened for real-world OCR errors (v2.1)

export interface KtpData {
  namaLengkap: string;
  tempatLahir: string;
  tanggalLahir: string;       // YYYY-MM-DD
  alamatLengkap: string;      // auto-assembled
  kelurahan: string;
  kecamatan: string;
  kotaKabupaten: string;
  provinsi: string;
  rawOcrText: string;
  confidence: number;
}

// ── Month name mapping (Indonesian → number) ──────────────────

const MONTHS: Record<string, string> = {
  januari: "01", februari: "02", maret: "03", april: "04",
  mei: "05", juni: "06", juli: "07", agustus: "08",
  september: "09", oktober: "10", november: "11", desember: "12",
  jan: "01", feb: "02", mar: "03", apr: "04",
  jun: "06", jul: "07", ags: "08", agt: "08",
  sep: "09", okt: "10", nov: "11", des: "12",
};

// ── OCR error normalization for LABELS only ──────────────────

const LABEL_NORMALIZE: [RegExp, string][] = [
  [/0/gi, "O"],   // K0TA → KOTA  (in label/header only)
  [/I/gi, "l"],   // KeI/Desa → Kel/Desa (case-insensitive)
  [/rn/gi, "m"],  // Kecarnatan → Kecamatan
];

function normalizeLabelText(text: string): string {
  let result = text;
  for (const [pattern, replacement] of LABEL_NORMALIZE) {
    result = result.replace(pattern, replacement);
  }
  return result;
}

// ── Fuzzy label matching ───────────────────────────────────────

const LABEL_ALIASES: Record<string, string> = {
  "nama": "Nama",
  "narna": "Nama",
  "namaa": "Nama",
  "narma": "Nama",
  "tempat": "Tempat",
  "ternpat": "Tempat",
  "ternpat/tgl lahir": "Tempat/Tgl Lahir",
  "tempat/tgl": "Tempat/Tgl Lahir",
  "tempat/tgl lahir": "Tempat/Tgl Lahir",
  "tempat / tgl lahir": "Tempat/Tgl Lahir",
  "tgl lahir": "Tgl Lahir",
  "tanggal lahir": "Tanggal Lahir",
  "kel/desa": "Kel/Desa",
  "kelurahan": "Kelurahan",
  "keidesa": "Kel/Desa",
  "kel idesa": "Kel/Desa",
  "kel": "Kel/Desa",
  "kecamatan": "Kecamatan",
  "kecarnatan": "Kecamatan",
  "kec": "Kecamatan",
  "alamat": "Alamat",
  "alarnat": "Alamat",
  "provinsi": "Provinsi",
  "pr0vinsi": "Provinsi",
  "k0ta": "Kota",
  "kabupaten": "Kabupaten",
};

function matchLabel(lineLabel: string, canonicalLabel: string): boolean {
  const clean = lineLabel
    .replace(/[\s:]+/g, " ")
    .trim()
    .toLowerCase();

  // Direct match
  if (clean === canonicalLabel.toLowerCase()) return true;

  // Normalized match (lowercase after normalization)
  if (normalizeLabelText(clean).toLowerCase() === canonicalLabel.toLowerCase()) return true;

  // Alias match
  if (LABEL_ALIASES[clean] === canonicalLabel) return true;
  const normLower = normalizeLabelText(clean).toLowerCase();
  if (LABEL_ALIASES[normLower] === canonicalLabel) return true;

  return false;
}

// ── Helpers ────────────────────────────────────────────────────

function normalizeDate(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";

  // Already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;

  // DD-MM-YYYY or DD/MM/YYYY
  const dmy = trimmed.match(/^(\d{2})[-/](\d{2})[-/](\d{4})$/);
  if (dmy?.[1] && dmy?.[2] && dmy?.[3]) {
    const dd = parseInt(dmy[1]);
    const mm = parseInt(dmy[2]);
    if (dd >= 1 && dd <= 31 && mm >= 1 && mm <= 12) {
      return `${dmy[3]}-${dmy[2]}-${dmy[1]}`;
    }
    // Could be MM-DD-YYYY — swap check
    if (mm >= 1 && mm <= 31 && dd >= 1 && dd <= 12) {
      return `${dmy[3]}-${dmy[1]}-${dmy[2]}`;
    }
  }

  // D-M-YYYY or D/M/YYYY (single digit)
  const dmyShort = trimmed.match(/^(\d{1,2})[-/\s](\d{1,2})[-/\s](\d{4})$/);
  if (dmyShort?.[1] && dmyShort?.[2] && dmyShort?.[3]) {
    const dd = parseInt(dmyShort[1]);
    const mm = parseInt(dmyShort[2]);
    if (dd >= 1 && dd <= 31 && mm >= 1 && mm <= 12) {
      return `${dmyShort[3]}-${dmyShort[2].padStart(2, "0")}-${dmyShort[1].padStart(2, "0")}`;
    }
  }

  // "17 Agustus 1990" (text month)
  const textMonth = trimmed.match(/^(\d{1,2})\s+([a-zA-Z]+)\s+(\d{4})$/i);
  if (textMonth?.[1] && textMonth?.[2] && textMonth?.[3]) {
    const m = MONTHS[textMonth[2].toLowerCase()];
    if (m) return `${textMonth[3]}-${m}-${textMonth[1].padStart(2, "0")}`;
  }

  return trimmed; // Cannot normalize
}

function upperWords(s: string): string {
  return s
    .split(/[\s]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

function extractLine(text: string, ...labels: string[]): string {
  for (const label of labels) {
    // Try exact regex first
    const exact = new RegExp(`${label}\\s*[:=]?\\s*(.+?)(?:\\n|$)`, "i");
    const match = text.match(exact);
    if (match?.[1]) return match[1].trim();

    // Fuzzy: match label in each line
    for (const line of text.split("\n")) {
      const colonIdx = line.indexOf(":");
      const eqIdx = line.indexOf("=");
      const spaceIdx = line.search(/\s{2,}/); // double space = label/value separator
      const sepIdx = colonIdx > 0 ? colonIdx : eqIdx > 0 ? eqIdx : spaceIdx > 0 ? spaceIdx : -1;

      if (sepIdx > 0) {
        const lineLabel = line.slice(0, sepIdx).trim();
        if (matchLabel(lineLabel, label)) {
          return line.slice(sepIdx + (colonIdx > 0 || eqIdx > 0 ? 1 : 0)).trim();
        }
      }
    }
  }
  return "";
}

// ── Fallback: namaLengkap without colon ───────────────────────

function extractNamaFallback(text: string): string {
  // "Nama" or "NAMA" followed by name (no colon required)
  const match = text.match(/Nama\s+([A-Z][A-Z\s.]+?)(?:\n|$|[A-Z][a-z]+\s*[:=])/im);
  if (match?.[1]) return match[1].trim();
  return "";
}

// ── Fallback: province/city from address text ──────────────────

function extractRegionFromAddress(text: string): { provinsi: string; kotaKabupaten: string } {
  const result = { provinsi: "", kotaKabupaten: "" };

  // Known cities/kabupaten as fallback
  const cityPatterns = [
    /(?:KOTA|KABUPATEN)\s+([A-Z\s]+?)(?:\n|,|$)/gi,
    /(?:Jakarta|Surabaya|Bandung|Medan|Semarang|Makassar|Yogyakarta|Denpasar|Malang|Sidoarjo|Bogor|Depok|Tangerang|Bekasi|Palembang|Padang|Balikpapan|Manado|Banjarmasin|Pekanbaru|Pontianak|Lampung)/gi,
  ];

  for (const pattern of cityPatterns) {
    const match = text.match(pattern);
    if (match) {
      if (!result.kotaKabupaten) {
        const raw = match[0]!.replace(/^(KOTA|KABUPATEN)\s+/i, "");
        const prefix = match[0]!.toUpperCase().startsWith("KOTA") ? "Kota " :
                       match[0]!.toUpperCase().startsWith("KABUPATEN") ? "Kabupaten " : "";
        result.kotaKabupaten = prefix + upperWords(raw);
      }
    }
  }

  // Province fallback
  const provPatterns = [
    /PROVINSI\s+([A-Z\s]+?)(?:\n|$)/i,
    /(?:DKI|DI)\s+([A-Z\s]+?)(?:\n|,|$)/i,
    /(?:Jawa\s+Timur|Jawa\s+Barat|Jawa\s+Tengah|DKI\s+Jakarta|DI\s+Yogyakarta|Banten|Bali|Sumatera\s+Utara|Sumatera\s+Barat|Sumatera\s+Selatan|Sulawesi\s+Selatan|Kalimantan\s+Timur|Aceh|Riau|Lampung)/i,
  ];

  for (const pattern of provPatterns) {
    const match = text.match(pattern);
    if (match?.[0]) {
      result.provinsi = upperWords(match[0].replace(/^(PROVINSI|DKI|DI)\s+/i, ""));
      break;
    }
  }

  return result;
}

// ── Main Parser ─────────────────────────────────────────────────

export function parseKtp(ocrText: string): KtpData {
  const lines = ocrText.split("\n").map((l) => l.trim()).filter(Boolean);

  // --- 1. Nama ---
  let namaLengkap = extractLine(ocrText, "Nama");
  if (!namaLengkap) namaLengkap = extractNamaFallback(ocrText);

  // --- 2. Tempat/Tgl Lahir ---
  const ttlRaw = extractLine(
    ocrText,
    "Tempat\\s*/\\s*Tgl\\s*\\.?\\s*Lahir",
    "Tempat/Tgl Lahir",
    "Tempat / Tgl Lahir",
  );

  let tempatLahir = "";
  let tanggalLahir = "";

  if (ttlRaw) {
    const commaIdx = ttlRaw.indexOf(",");
    if (commaIdx > 0) {
      tempatLahir = upperWords(ttlRaw.slice(0, commaIdx).trim());
      tanggalLahir = normalizeDate(ttlRaw.slice(commaIdx + 1).trim());
    } else {
      // Fallback: split by first digit
      const digitIdx = ttlRaw.search(/\d/);
      if (digitIdx > 0) {
        tempatLahir = upperWords(ttlRaw.slice(0, digitIdx).trim());
        tanggalLahir = normalizeDate(ttlRaw.slice(digitIdx).trim());
      } else {
        tempatLahir = extractLine(ocrText, "Tempat Lahir");
        tanggalLahir = normalizeDate(extractLine(ocrText, "Tanggal Lahir", "Tgl Lahir"));
      }
    }
  } else {
    tempatLahir = extractLine(ocrText, "Tempat Lahir");
    tanggalLahir = normalizeDate(extractLine(ocrText, "Tanggal Lahir", "Tgl Lahir"));
  }

  // --- 3. Province + City from header ---
  let provinsi = "";
  let kotaKabupaten = "";

  for (const line of lines) {
    const upper = line.toUpperCase();

    if (!provinsi && (upper.startsWith("PROVINSI") || matchLabel(line.split(/\s+/)[0] ?? "", "Provinsi"))) {
      const raw = line.replace(/^(PROVINSI|PR0VINSI)\s*/i, "").trim();
      if (raw) provinsi = upperWords(raw);
    }
    if (!kotaKabupaten) {
      const firstWord = line.split(/\s+/)[0] ?? "";
      const isKota = upper.startsWith("KOTA") || matchLabel(firstWord, "Kota");
      const isKab = upper.startsWith("KABUPATEN") || matchLabel(firstWord, "Kabupaten");
      if (isKota || isKab) {
        const raw = line.replace(/^(KOTA|KABUPATEN|K0TA)\s+/i, "").trim();
        kotaKabupaten = (isKota ? "Kota " : "Kabupaten ") + upperWords(raw);
      }
    }
  }

  // Fallback: extract from address body if header not found
  if (!provinsi || !kotaKabupaten) {
    const region = extractRegionFromAddress(ocrText);
    if (!provinsi) provinsi = region.provinsi;
    if (!kotaKabupaten) kotaKabupaten = region.kotaKabupaten;
  }

  // --- 4. Kelurahan ---
  const kelurahan = upperWords(
    extractLine(ocrText, "Kel\\s*/\\s*Desa", "Kel/Desa", "Kelurahan", "Kel"),
  );

  // --- 5. Kecamatan ---
  const kecamatan = upperWords(
    extractLine(ocrText, "Kecamatan", "Kec"),
  );

  // --- 6. Alamat (jalan) ---
  let alamatJalan = extractLine(ocrText, "Alamat");

  // --- 7. RT/RW ---
  let rt = "";
  let rw = "";
  const rtRwMatch = ocrText.match(/RT\s*\/?\s*RW\s*[:=]?\s*(\d+)\s*\/\s*(\d+)/i)
    || ocrText.match(/RT\s*[-.]?\s*RW\s*[:=]?\s*(\d+)\s*[-]\s*(\d+)/i)
    || ocrText.match(/RT\s*[-.]?\s*(\d+)\s+?RW\s*[-.]?\s*(\d+)/i)
    || ocrText.match(/RT\s*[:=]?\s*(\d+).*?RW\s*[:=]?\s*(\d+)/i)
    || ocrText.match(/(\d{3})\s*\/\s*(\d{3})/);
  if (rtRwMatch?.[1] && rtRwMatch?.[2]) {
    rt = rtRwMatch[1].padStart(3, "0");
    rw = rtRwMatch[2].padStart(3, "0");
  }

  // --- 8. Assemble alamatLengkap ---
  const parts: string[] = [];
  if (alamatJalan) parts.push(alamatJalan);
  if (rt || rw) parts.push(`RT.${rt || "000"}/RW.${rw || "000"}`);
  if (kelurahan) parts.push(`Kel. ${kelurahan}`);
  if (kecamatan) parts.push(`Kec. ${kecamatan}`);
  if (kotaKabupaten) parts.push(kotaKabupaten);

  const alamatLengkap = parts.join(", ");

  // --- 9. Confidence ---
  const extractedCount = [
    namaLengkap, tempatLahir, tanggalLahir, alamatJalan,
    kelurahan, kecamatan, kotaKabupaten, provinsi,
  ].filter(Boolean).length;
  const confidence = Math.round((extractedCount / 8) * 100) / 100;

  return {
    namaLengkap,
    tempatLahir,
    tanggalLahir,
    alamatLengkap: alamatLengkap || ocrText.slice(0, 200).replace(/\n/g, " "),
    kelurahan,
    kecamatan,
    kotaKabupaten,
    provinsi,
    rawOcrText: ocrText,
    confidence,
  };
}
