import JSZip from "jszip";
import type {
  SuratTemplate,
  GeneratedSuratLog,
  ManifestFieldOption,
  SuratInputType,
  SuratPlaceholderMapping,
} from "@/shared/types/surat";
import { formatDate, toTitleCase } from "@/shared/lib/utils";
import { DAFTAR_KANTOR_IMIGRASI, getKotaFromKanimName } from "@/shared/lib/kantor-imigrasi";

export { toTitleCase };

// ────────────────────────────────────────────────────────────
// ROMAN MONTHS & DATE UTILITIES
// ────────────────────────────────────────────────────────────

export const ROMAN_MONTHS = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];

export function getTodayDateInfo(dateObj: Date = new Date()) {
  const options: Intl.DateTimeFormatOptions = { day: "numeric", month: "long", year: "numeric" };
  const masehi = dateObj.toLocaleDateString("id-ID", options);
  const romanMonth = ROMAN_MONTHS[dateObj.getMonth()] ?? "VIII";
  const year = dateObj.getFullYear();
  return {
    masehi,
    hijriyah: "Safar 1448 H",
    romanMonth,
    bulanRomawi: romanMonth,
    year,
  };
}

export const BULAN_INDONESIA = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

/**
 * Formats a date or date string into 'MMMM YYYY' in Indonesian (e.g. 'September 2026', 'November 2026').
 */
export function formatMonthYear(dateVal?: string | Date | null): string {
  if (!dateVal) return "";
  if (typeof dateVal === "string") {
    const trimmed = dateVal.trim();
    // Check if already contains an Indonesian month name and year (e.g. 'September 2026')
    const matchIndo = BULAN_INDONESIA.find((b) =>
      new RegExp(`\\b${b}\\b`, "i").test(trimmed)
    );
    const yearMatch = trimmed.match(/\b(20\d\d)\b/);
    if (matchIndo && yearMatch) {
      return `${matchIndo} ${yearMatch[1]}`;
    }

    // Check if format starts with YYYY-MM or YYYY-MM-DD
    const match = trimmed.match(/^(\d{4})-(\d{1,2})/);
    if (match && match[1] && match[2]) {
      const year = match[1];
      const monthIdx = parseInt(match[2], 10) - 1;
      if (monthIdx >= 0 && monthIdx < 12) {
        return `${BULAN_INDONESIA[monthIdx]} ${year}`;
      }
    }
  }
  const d = typeof dateVal === "string" ? new Date(dateVal) : dateVal;
  if (d instanceof Date && !isNaN(d.getTime())) {
    return `${BULAN_INDONESIA[d.getMonth()]} ${d.getFullYear()}`;
  }
  return String(dateVal);
}

// ────────────────────────────────────────────────────────────
// AVAILABLE MANIFEST FIELDS CATALOG FOR AUTOCRAT MAPPING
// ────────────────────────────────────────────────────────────

export const MANIFEST_FIELD_OPTIONS: ManifestFieldOption[] = [
  // Jamaah personal
  { key: "jamaah.namaLengkap", label: "Nama Lengkap Jamaah", group: "Jamaah", sampleValue: "Muchamad Zamroni" },
  { key: "jamaah.nik", label: "Nomor Induk Kependudukan (NIK)", group: "Jamaah", sampleValue: "3515082103850001" },
  { key: "jamaah.nomorPaspor", label: "Nomor Paspor", group: "Jamaah", sampleValue: "X1234567" },
  { key: "jamaah.tempatLahir", label: "Tempat Lahir", group: "Jamaah", sampleValue: "Sidoarjo" },
  { key: "jamaah.tanggalLahir", label: "Tanggal Lahir (DD MMMM YYYY)", group: "Jamaah", sampleValue: "21 Maret 1985" },
  { key: "jamaah.jenisKelamin", label: "Jenis Kelamin (Laki-laki / Perempuan)", group: "Jamaah", sampleValue: "LAKI-LAKI" },
  { key: "jamaah.namaAyah", label: "Nama Ayah Kandung", group: "Jamaah", sampleValue: "H. Ahmad Sofwan" },
  { key: "jamaah.alamat", label: "Alamat Domisili Lengkap", group: "Jamaah", sampleValue: "Jl. Raya Taman No. 45, Sidoarjo, Jawa Timur" },
  { key: "jamaah.nomorTelepon", label: "Nomor Telepon / WhatsApp", group: "Jamaah", sampleValue: "081234567890" },
  { key: "jamaah.pekerjaan", label: "Pekerjaan Jamaah", group: "Jamaah", sampleValue: "Karyawan Swasta" },
  { key: "jamaah.registrationId", label: "Nomor Registrasi / Pendaftaran", group: "Jamaah", sampleValue: "REG-2026-0814" },

  // Keberangkatan & Paket
  { key: "keberangkatan.namaPaket", label: "Nama Paket Umroh", group: "Keberangkatan / Paket", sampleValue: "Paket Umroh Reguler Awal Musim 1448 H" },
  { key: "keberangkatan.kode", label: "Kode Keberangkatan / Manifest", group: "Keberangkatan / Paket", sampleValue: "KBR-2026-08-A" },
  { key: "keberangkatan.tanggalBerangkat", label: "Tanggal Keberangkatan", group: "Keberangkatan / Paket", sampleValue: "15 September 2026" },
  { key: "keberangkatan.bulanKeberangkatan", label: "Bulan Keberangkatan (MMMM YYYY)", group: "Keberangkatan / Paket", sampleValue: "September 2026" },
  { key: "keberangkatan.tanggalPulang", label: "Tanggal Kepulangan", group: "Keberangkatan / Paket", sampleValue: "24 September 2026" },
  { key: "keberangkatan.programHari", label: "Durasi Program (Hari)", group: "Keberangkatan / Paket", sampleValue: "9 Hari" },
  { key: "keberangkatan.maskapai", label: "Maskapai Penerbangan", group: "Keberangkatan / Paket", sampleValue: "Saudia Airlines (SV 819)" },
  { key: "keberangkatan.hotelMekkah", label: "Hotel Mekkah", group: "Keberangkatan / Paket", sampleValue: "Pullman Zamzam Makkah (Bintang 5)" },
  { key: "keberangkatan.hotelMadinah", label: "Hotel Madinah", group: "Keberangkatan / Paket", sampleValue: "Rove Al Madinah (Bintang 4)" },
  { key: "keberangkatan.startingPoint", label: "Starting Point Keberangkatan", group: "Keberangkatan / Paket", sampleValue: "Bandara Juanda Surabaya (SUB)" },

  // Sistem & Perusahaan
  { key: "today.masehi", label: "Tanggal Hari Ini (Masehi)", group: "Tanggal & Sistem", sampleValue: "12 September 2026" },
  { key: "today.hijriyah", label: "Tanggal Hari Ini (Hijriyah)", group: "Tanggal & Sistem", sampleValue: "29 Safar 1448 H" },
  { key: "today.bulanRomawi", label: "Bulan Romawi Saat Ini", group: "Tanggal & Sistem", sampleValue: "IX" },
  { key: "today.tahun", label: "Tahun Saat Ini", group: "Tanggal & Sistem", sampleValue: "2026" },
  { key: "vtu.pimpinan", label: "Nama Direktur / Pimpinan PPIU", group: "Tanggal & Sistem", sampleValue: "H. Faisal Wahyudi" },
  { key: "vtu.jabatan", label: "Jabatan Penandatangan", group: "Tanggal & Sistem", sampleValue: "Direktur Utama" },
  { key: "vtu.noIzin", label: "Nomor Izin PPIU Resmi", group: "Tanggal & Sistem", sampleValue: "Izin Kemenag RI No. U.400 Tahun 2021 / No. 805 Tahun 2019" },

  // Dokumen Keimigrasian & Layanan Paspor
  { key: "imigrasi.kanim", label: "Kantor Imigrasi / Layanan Paspor", group: "Dokumen & Paspor", sampleValue: "Kantor Imigrasi Kelas I Khusus TPI Surabaya" },
  { key: "imigrasi.kotaKanim", label: "Kota Kantor Imigrasi", group: "Dokumen & Paspor", sampleValue: "Surabaya" },
];

/**
 * Intelligently matches any raw template tag to a suitable manifest field or manual form input type.
 * Ensures consistent behavior across both admin/master/surat and admin/surat generator.
 */
export function matchTagToManifestField(tag: string): {
  matchedManifest?: ManifestFieldOption;
  defaultType: SuratInputType;
  defaultValue: string;
  sourceType: "manifest" | "manual";
} {
  const cleanTag = tag.toLowerCase().replace(/[\s_\-\.]/g, "");
  const tagLower = tag.toLowerCase();

  // 1. Direct semantic mappings to Manifest
  if (
    cleanTag === "nama" ||
    cleanTag.includes("namajamaah") ||
    cleanTag.includes("namalengkap") ||
    cleanTag.includes("namakaryawan") ||
    cleanTag.includes("namasiswa") ||
    cleanTag.includes("namapeserta") ||
    cleanTag.includes("namatertanggung")
  ) {
    const opt = MANIFEST_FIELD_OPTIONS.find((o) => o.key === "jamaah.namaLengkap");
    return { matchedManifest: opt, defaultType: "text", defaultValue: "", sourceType: "manifest" };
  }

  // Jenis No ID special case
  if (cleanTag.includes("jenisnoid") || cleanTag.includes("jenisid") || cleanTag.includes("tipeid")) {
    return { defaultType: "text", defaultValue: "NIK", sourceType: "manual" };
  }

  if (
    cleanTag === "nik" ||
    cleanTag.includes("ktp") ||
    cleanTag.includes("noidentitas") ||
    cleanTag.includes("nomoridentitas") ||
    cleanTag.includes("nikkaryawan") ||
    cleanTag === "noid" ||
    cleanTag === "nomorid"
  ) {
    const opt = MANIFEST_FIELD_OPTIONS.find((o) => o.key === "jamaah.nik");
    return { matchedManifest: opt, defaultType: "text", defaultValue: "", sourceType: "manifest" };
  }

  if (cleanTag.includes("paspor")) {
    const opt = MANIFEST_FIELD_OPTIONS.find((o) => o.key === "jamaah.nomorPaspor");
    return { matchedManifest: opt, defaultType: "text", defaultValue: "", sourceType: "manifest" };
  }

  if (cleanTag.includes("tempatlahir") || (cleanTag.includes("tempat") && cleanTag.includes("lahir"))) {
    const opt = MANIFEST_FIELD_OPTIONS.find((o) => o.key === "jamaah.tempatLahir");
    return { matchedManifest: opt, defaultType: "city", defaultValue: "", sourceType: "manifest" };
  }

  if (cleanTag.includes("tanggallahir") || (cleanTag.includes("tgl") && cleanTag.includes("lahir"))) {
    const opt = MANIFEST_FIELD_OPTIONS.find((o) => o.key === "jamaah.tanggalLahir");
    return { matchedManifest: opt, defaultType: "date", defaultValue: "", sourceType: "manifest" };
  }

  if (cleanTag.includes("jeniskelamin") || cleanTag.includes("gender")) {
    const opt = MANIFEST_FIELD_OPTIONS.find((o) => o.key === "jamaah.jenisKelamin");
    return { matchedManifest: opt, defaultType: "select", defaultValue: "LAKI-LAKI", sourceType: "manifest" };
  }

  if (cleanTag.includes("ayah") || cleanTag.includes("orangtua")) {
    const opt = MANIFEST_FIELD_OPTIONS.find((o) => o.key === "jamaah.namaAyah");
    return { matchedManifest: opt, defaultType: "text", defaultValue: "", sourceType: "manifest" };
  }

  if (cleanTag.includes("alamat")) {
    const opt = MANIFEST_FIELD_OPTIONS.find((o) => o.key === "jamaah.alamat");
    return { matchedManifest: opt, defaultType: "textarea", defaultValue: "", sourceType: "manifest" };
  }

  if (
    cleanTag.includes("telepon") ||
    cleanTag.includes("nohp") ||
    cleanTag.includes("phone") ||
    cleanTag.includes("whatsapp") ||
    cleanTag === "wa" ||
    cleanTag.startsWith("wa_") ||
    cleanTag.endsWith("_wa")
  ) {
    const opt = MANIFEST_FIELD_OPTIONS.find((o) => o.key === "jamaah.nomorTelepon");
    return { matchedManifest: opt, defaultType: "text", defaultValue: "", sourceType: "manifest" };
  }

  if (cleanTag.includes("pekerjaan") || cleanTag.includes("profesi")) {
    const opt = MANIFEST_FIELD_OPTIONS.find((o) => o.key === "jamaah.pekerjaan");
    return { matchedManifest: opt, defaultType: "text", defaultValue: "Karyawan Swasta", sourceType: "manifest" };
  }

  if (
    cleanTag.includes("tanggalberangkat") ||
    cleanTag.includes("tglberangkat") ||
    cleanTag.includes("tanggalawal") ||
    cleanTag.includes("tglawal") ||
    cleanTag.includes("tanggalmulai") ||
    cleanTag.includes("tglmulai")
  ) {
    const opt = MANIFEST_FIELD_OPTIONS.find((o) => o.key === "keberangkatan.tanggalBerangkat");
    return { matchedManifest: opt, defaultType: "date", defaultValue: "", sourceType: "manifest" };
  }

  if (
    cleanTag.includes("tanggalpulang") ||
    cleanTag.includes("tglpulang") ||
    cleanTag.includes("tanggalkembali") ||
    cleanTag.includes("tanggalakhir") ||
    cleanTag.includes("tglakhir") ||
    cleanTag.includes("tanggalselesai") ||
    cleanTag.includes("tglselesai")
  ) {
    const opt = MANIFEST_FIELD_OPTIONS.find((o) => o.key === "keberangkatan.tanggalPulang");
    return { matchedManifest: opt, defaultType: "date", defaultValue: "", sourceType: "manifest" };
  }

  if (
    cleanTag.includes("bulankeberangkatan") ||
    cleanTag.includes("bulanberangkat") ||
    cleanTag.includes("bulanawal") ||
    cleanTag.includes("bulanmulai") ||
    cleanTag === "bulanpaket" ||
    cleanTag === "bulan"
  ) {
    const opt = MANIFEST_FIELD_OPTIONS.find((o) => o.key === "keberangkatan.bulanKeberangkatan");
    return { matchedManifest: opt, defaultType: "text", defaultValue: "", sourceType: "manifest" };
  }

  if (cleanTag.includes("bulanakhir") || cleanTag.includes("bulanselesai")) {
    const opt = MANIFEST_FIELD_OPTIONS.find((o) => o.key === "keberangkatan.bulanKeberangkatan");
    return { matchedManifest: opt, defaultType: "text", defaultValue: "", sourceType: "manifest" };
  }

  if (cleanTag.includes("namapaket") || cleanTag === "paket") {
    const opt = MANIFEST_FIELD_OPTIONS.find((o) => o.key === "keberangkatan.namaPaket");
    return { matchedManifest: opt, defaultType: "text", defaultValue: "", sourceType: "manifest" };
  }

  if (cleanTag.includes("kodepaket") || cleanTag.includes("kodemanifest")) {
    const opt = MANIFEST_FIELD_OPTIONS.find((o) => o.key === "keberangkatan.kode");
    return { matchedManifest: opt, defaultType: "text", defaultValue: "", sourceType: "manifest" };
  }

  if (cleanTag.includes("programhari") || cleanTag === "durasi" || cleanTag.includes("lamacuti")) {
    const opt = MANIFEST_FIELD_OPTIONS.find((o) => o.key === "keberangkatan.programHari");
    return { matchedManifest: opt, defaultType: "text", defaultValue: "9 Hari", sourceType: "manifest" };
  }

  if (cleanTag.includes("maskapai")) {
    const opt = MANIFEST_FIELD_OPTIONS.find((o) => o.key === "keberangkatan.maskapai");
    return { matchedManifest: opt, defaultType: "text", defaultValue: "", sourceType: "manifest" };
  }

  if (cleanTag.includes("hotelmekkah") || cleanTag.includes("hotelmakkah")) {
    const opt = MANIFEST_FIELD_OPTIONS.find((o) => o.key === "keberangkatan.hotelMekkah");
    return { matchedManifest: opt, defaultType: "text", defaultValue: "", sourceType: "manifest" };
  }

  if (cleanTag.includes("hotelmadinah")) {
    const opt = MANIFEST_FIELD_OPTIONS.find((o) => o.key === "keberangkatan.hotelMadinah");
    return { matchedManifest: opt, defaultType: "text", defaultValue: "", sourceType: "manifest" };
  }

  if (cleanTag.includes("kanim") || cleanTag.includes("imigrasi")) {
    if (cleanTag.includes("kota")) {
      const opt = MANIFEST_FIELD_OPTIONS.find((o) => o.key === "imigrasi.kotaKanim");
      return { matchedManifest: opt, defaultType: "city", defaultValue: "Surabaya", sourceType: "manifest" };
    }
    const opt = MANIFEST_FIELD_OPTIONS.find((o) => o.key === "imigrasi.kanim");
    return { matchedManifest: opt, defaultType: "kantor_imigrasi", defaultValue: "", sourceType: "manifest" };
  }

  // 2. Jenis No ID special case
  if (cleanTag.includes("jenisnoid") || cleanTag.includes("jenisid") || cleanTag.includes("tipeid")) {
    return { defaultType: "text", defaultValue: "NIK", sourceType: "manual" };
  }

  // 3. Fallback generic type detection
  let detectedType: SuratInputType = "text";
  if (
    tagLower.includes("rentang") ||
    tagLower.includes("periode") ||
    (tagLower.includes("cuti") && tagLower.includes("tanggal")) ||
    (tagLower.includes("tanggal") && (tagLower.includes("mulai") || tagLower.includes("sampai") || tagLower.includes("sd")))
  ) {
    detectedType = "date_range";
  } else if (
    (tagLower.includes("tanggal") ||
      tagLower.includes("tgl") ||
      tagLower.includes("date") ||
      tagLower.includes("lahir") ||
      tagLower.includes("berangkat") ||
      tagLower.includes("pulang")) &&
    !tagLower.includes("bulan")
  ) {
    detectedType = "date";
  } else if (
    tagLower.includes("kota") ||
    tagLower.includes("tempat") ||
    tagLower.includes("cabang") ||
    tagLower.includes("city") ||
    tagLower.includes("wilayah")
  ) {
    detectedType = "city";
  } else if (
    tagLower.includes("jumlah") ||
    tagLower.includes("hari") ||
    tagLower.includes("nominal") ||
    tagLower.includes("biaya") ||
    tagLower.includes("umur")
  ) {
    detectedType = "number";
  } else if (
    tagLower.includes("deskripsi") ||
    tagLower.includes("keterangan") ||
    tagLower.includes("alamat") ||
    tagLower.includes("kronologi")
  ) {
    detectedType = "textarea";
  }

  return { defaultType: detectedType, defaultValue: "", sourceType: "manual" };
}

// ────────────────────────────────────────────────────────────
// SCANNER FOR EXTRACTING {TAG}, {{TAG}}, <<TAG>>, «TAG» FROM TEMPLATE TEXT
// ────────────────────────────────────────────────────────────

/**
 * Decodes standard XML entities and characters commonly present in Word XML.
 */
export function decodeWordXmlEntities(str: string): string {
  if (!str) return "";
  return str
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;|&#39;/g, "'")
    .replace(/&laquo;|&#171;/g, "«")
    .replace(/&raquo;|&#187;/g, "»")
    .replace(/&nbsp;|&#160;/g, " ")
    .replace(/&amp;/g, "&");
}

/**
 * Parses raw Word XML (from document.xml, headers, footers) into clean text.
 * Paragraphs (<w:p>) contain runs (<w:r>) with text (<w:t>).
 * Word often splits a placeholder tag across multiple <w:r> runs.
 * Joining all <w:t> nodes within each paragraph seamlessly repairs split tags like:
 * <w:t>&lt;&lt;Nama</w:t><w:t> Jama'ah&gt;&gt;</w:t> -> "<<Nama Jama'ah>>".
 */
export function extractDocxTextFromXml(rawXml: string): string {
  if (!rawXml) return "";

  // 1. Extract by paragraph <w:p>
  const pMatches = rawXml.match(/<w:p[\s>][\s\S]*?<\/w:p>/g);
  if (pMatches && pMatches.length > 0) {
    const paragraphs: string[] = [];
    for (const p of pMatches) {
      // Find all text tags <w:t> or <w:t xml:space="preserve">
      const tMatches = p.match(/<w:t[\s>][\s\S]*?<\/w:t>/g);
      if (tMatches && tMatches.length > 0) {
        const paragraphText = tMatches
          .map((t) => t.replace(/<[^>]+>/g, ""))
          .join("");
        paragraphs.push(decodeWordXmlEntities(paragraphText));
      }
    }
    if (paragraphs.length > 0) {
      return paragraphs.join("\n");
    }
  }

  // Fallback: extract all <w:t> directly
  const allT = rawXml.match(/<w:t[\s>][\s\S]*?<\/w:t>/g);
  if (allT && allT.length > 0) {
    const fallbackText = allT.map((t) => t.replace(/<[^>]+>/g, "")).join(" ");
    return decodeWordXmlEntities(fallbackText);
  }

  // Last fallback: strip all tags and decode entities
  return decodeWordXmlEntities(rawXml.replace(/<[^>]+>/g, " "));
}

export function extractPlaceholdersFromText(text: string): string[] {
  if (!text) return [];

  // Map canonical lowercased tag -> display tag to guarantee 100% deduplication
  const tagMap = new Map<string, string>();

  const registerTag = (raw: string) => {
    const cleaned = raw.trim();
    if (
      !cleaned ||
      cleaned.length === 0 ||
      cleaned.startsWith("/*") ||
      cleaned.startsWith("http://") ||
      cleaned.startsWith("https://")
    ) {
      return;
    }
    const lower = cleaned.toLowerCase();
    if (!tagMap.has(lower)) {
      tagMap.set(lower, cleaned);
    }
  };

  // 1. Double/single curly braces: {tag}, {{tag}}, {{{tag}}}
  const curlyRegex = /\{+([a-zA-Z0-9_\-\.\s\'\’\:\/]+?)\}+/g;
  let match: RegExpExecArray | null;
  while ((match = curlyRegex.exec(text)) !== null) {
    if (match[1]) registerTag(match[1]);
  }

  // 2. Double angle brackets / Guillemets / Autocrat tags: <<tag>>, «tag»
  const angleRegex = /(?:<<|«)+([a-zA-Z0-9_\-\.\s\'\’\:\/]+?)(?:>>|»)+/g;
  while ((match = angleRegex.exec(text)) !== null) {
    if (match[1]) registerTag(match[1]);
  }

  // 3. Double square brackets: [[tag]]
  const bracketRegex = /\[\[([a-zA-Z0-9_\-\.\s\'\’\:\/]+?)\]\]/g;
  while ((match = bracketRegex.exec(text)) !== null) {
    if (match[1]) registerTag(match[1]);
  }

  return Array.from(tagMap.values());
}

/**
 * Asynchronously extracts all placeholders from a DOCX Word file using JSZip.
 * Reads word/document.xml and headers/footers, stripping XML tags to parse tags cleanly.
 */
export async function extractPlaceholdersFromDocxFile(
  fileData: File | Blob | ArrayBuffer | Uint8Array
): Promise<{ tags: string[]; extractedText: string }> {
  try {
    const zip = await JSZip.loadAsync(fileData);

    // Find all XML files inside the word/ directory (document, headers, footers, footnotes, endnotes)
    const xmlFilePaths = Object.keys(zip.files).filter(
      (path) => path.startsWith("word/") && path.endsWith(".xml") && !path.includes("[Content_Types]")
    );

    // Ensure word/document.xml is processed first
    xmlFilePaths.sort((a, b) => {
      if (a === "word/document.xml") return -1;
      if (b === "word/document.xml") return 1;
      return a.localeCompare(b);
    });

    const textPieces: string[] = [];

    for (const xmlPath of xmlFilePaths) {
      const xmlFile = zip.file(xmlPath);
      if (xmlFile) {
        const rawXml = await xmlFile.async("string");
        const parsed = extractDocxTextFromXml(rawXml);
        if (parsed.trim()) {
          textPieces.push(parsed);
        }
      }
    }

    const combinedText = textPieces.join("\n\n");
    const tags = extractPlaceholdersFromText(combinedText);

    return {
      tags,
      extractedText: combinedText,
    };
  } catch (err) {
    console.error("[extractPlaceholdersFromDocxFile] Error parsing docx file:", err);
    return { tags: [], extractedText: "" };
  }
}

// ────────────────────────────────────────────────────────────
// DEFAULT BUILT-IN TEMPLATES
// ────────────────────────────────────────────────────────────

export const DEFAULT_SURAT_TEMPLATES: SuratTemplate[] = [
  {
    id: "tpl-rekom-paspor",
    slug: "rekom-paspor",
    nama: "Surat Rekomendasi Paspor",
    kategori: "imigrasi",
    deskripsi: "Rekomendasi resmi penerbitan / penggantian paspor umroh ke Kantor Imigrasi / Kemenag",
    kodeNomorDefault: "SR-PASPOR",
    formatNomor: "[NOMOR]/SR-PASPOR/VTU/[BULAN]/[TAHUN]",
    jumlahTemplateTerlampir: 1,
    kebutuhanNomorPerSurat: 1,
    formatNamaFile: "Surat_Rekomendasi_{{nama_lengkap}}",
    fileNameUploaded: "Template_Surat_Rekomendasi_Paspor.docx",
    perihalDefault: "Rekomendasi Pembuatan / Penggantian Paspor Umroh",
    kopSuratType: "ppiu_vtu",
    lampiranDefault: "1 (Satu) Berkas",
    tujuanDefault: "Yth. Kepala Kantor Imigrasi",
    kotaTujuanDefault: "Di Tempat",
    penandatangan: {
      nama: "H. Faisal Wahyudi",
      jabatan: "Direktur Utama PT. Vauza Tamma Abadi",
      showStempel: true,
      showBarcode: true,
    },
    templateContent: `Assalamu'alaikum Warahmatullahi Wabarakatuh,

Yang bertanda tangan di bawah ini, Pimpinan Penyelenggara Perjalanan Ibadah Umroh (PPIU) PT. Vauza Tamma Abadi (Izin Kemenag No. U.400 Tahun 2021 / No. 805 Tahun 2019), menerangkan dengan sebenarnya bahwa:

Nama Lengkap      : {nama_lengkap}
Nomor NIK / KTP   : {nik}
Tempat/Tgl Lahir  : {tempat_lahir}, {tanggal_lahir}
Jenis Kelamin     : {jenis_kelamin}
Alamat Lengkap    : {alamat}
Nomor Telepon/HP  : {nomor_telepon}

Adalah benar-benar calon jamaah Umroh PT. Vauza Tamma Abadi yang telah terdaftar resmi dan dijadwalkan berangkat ibadah Umroh dengan rincian jadwal sebagai berikut:

Paket Umroh       : {nama_paket} ({program_hari})
Tanggal Berangkat : {tanggal_berangkat}
Tanggal Kembali   : {tanggal_pulang}
Maskapai          : {maskapai}
Hotel Mekkah      : {hotel_mekkah}
Hotel Madinah     : {hotel_madinah}

Sehubungan dengan hal tersebut, kami mohon kepada pihak Kantor Imigrasi kiranya dapat memberikan kemudahan dan bantuan dalam proses penerbitan / perpanjangan Paspor Republik Indonesia atas nama jamaah yang bersangkutan.

Demikian surat rekomendasi ini kami buat dengan sebenarnya agar dapat dipergunakan sebagaimana mestinya. Atas perhatian dan kerjasamanya kami ucapkan terima kasih.

Wassalamu'alaikum Warahmatullahi Wabarakatuh.`,
    placeholders: [
      { key: "nama_lengkap", label: "Nama Lengkap Jamaah", sourceType: "manifest", manifestField: "jamaah.namaLengkap", inputType: "text", required: true },
      { key: "nik", label: "NIK (KTP)", sourceType: "manifest", manifestField: "jamaah.nik", inputType: "text", required: true },
      { key: "tempat_lahir", label: "Tempat Lahir", sourceType: "manifest", manifestField: "jamaah.tempatLahir", inputType: "city", required: true },
      { key: "tanggal_lahir", label: "Tanggal Lahir", sourceType: "manifest", manifestField: "jamaah.tanggalLahir", inputType: "date", required: true },
      { key: "jenis_kelamin", label: "Jenis Kelamin", sourceType: "manifest", manifestField: "jamaah.jenisKelamin", inputType: "select", options: ["LAKI-LAKI", "PEREMPUAN"], required: true },
      { key: "alamat", label: "Alamat Lengkap", sourceType: "manifest", manifestField: "jamaah.alamat", inputType: "textarea", required: true },
      { key: "nomor_telepon", label: "Nomor Telepon", sourceType: "manifest", manifestField: "jamaah.nomorTelepon", inputType: "text", required: true },
      { key: "nama_paket", label: "Nama Paket", sourceType: "manifest", manifestField: "keberangkatan.namaPaket", inputType: "text", required: true },
      { key: "program_hari", label: "Program Hari", sourceType: "manifest", manifestField: "keberangkatan.programHari", inputType: "text", defaultValue: "9 Hari" },
      { key: "tanggal_berangkat", label: "Tanggal Berangkat", sourceType: "manifest", manifestField: "keberangkatan.tanggalBerangkat", inputType: "date", required: true },
      { key: "tanggal_pulang", label: "Tanggal Pulang", sourceType: "manifest", manifestField: "keberangkatan.tanggalPulang", inputType: "date", required: true },
      { key: "maskapai", label: "Maskapai Penerbangan", sourceType: "manifest", manifestField: "keberangkatan.maskapai", inputType: "text" },
      { key: "hotel_mekkah", label: "Hotel Mekkah", sourceType: "manifest", manifestField: "keberangkatan.hotelMekkah", inputType: "text" },
      { key: "hotel_madinah", label: "Hotel Madinah", sourceType: "manifest", manifestField: "keberangkatan.hotelMadinah", inputType: "text" },
    ],
    isDefault: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "tpl-cuti-pekerja",
    slug: "cuti-pekerja",
    nama: "Surat Permohonan Cuti Pekerja",
    kategori: "instansi",
    deskripsi: "Permohonan dispensasi izin dan cuti kerja karyawan untuk menunaikan ibadah umroh",
    kodeNomorDefault: "SC-KERJA",
    formatNomor: "[NOMOR]/SC-KERJA/VTU/[BULAN]/[TAHUN]",
    jumlahTemplateTerlampir: 1,
    kebutuhanNomorPerSurat: 1,
    formatNamaFile: "Surat_Cuti_Kerja_{{nama_lengkap}}",
    fileNameUploaded: "Template_Surat_Cuti_Pekerja.docx",
    perihalDefault: "Permohonan Izin / Cuti Ibadah Umroh",
    kopSuratType: "ppiu_vtu",
    lampiranDefault: "1 (Satu) Lembar Itinerary",
    tujuanDefault: "Yth. Pimpinan / HRD {nama_perusahaan}",
    kotaTujuanDefault: "{kota_kantor}",
    penandatangan: {
      nama: "H. Faisal Wahyudi",
      jabatan: "Direktur Utama PT. Vauza Tamma Abadi",
      showStempel: true,
      showBarcode: true,
    },
    templateContent: `Dengan hormat,

Sehubungan dengan rencana keberangkatan Ibadah Umroh jamaah PT. Vauza Tamma Abadi, dengan ini kami sampaikan bahwa karyawan/karyawati Bapak/Ibu di bawah ini:

Nama Karyawan     : {nama_lengkap}
Nomor NIK / KTP   : {nik}
Nomor Paspor      : {nomor_paspor}
Jabatan / Posisi  : {jabatan_karyawan}
Departemen / Div  : {departemen}
Nama Perusahaan   : {nama_perusahaan}

Telah terdaftar resmi sebagai jamaah umroh PT. Vauza Tamma Abadi dan dijadwalkan menunaikan ibadah Umroh ke Tanah Suci pada:

Paket Umroh       : {nama_paket}
Tanggal Berangkat : {tanggal_berangkat}
Tanggal Kepulangan: {tanggal_pulang}
Lama Pelaksanaan : {lama_cuti_hari} Hari

Mengingat pentingnya rangkaian ibadah tersebut, kami memohon kesediaan Bapak/Ibu Pimpinan kiranya dapat memberikan izin cuti / dispensasi kerja kepada yang bersangkutan selama periode keberangkatan tersebut di atas.

Demikian surat permohonan ini kami sampaikan. Atas perhatian, kebijaksanaan, dan kerjasama Bapak/Ibu, kami ucapkan terima kasih.`,
    placeholders: [
      { key: "nama_lengkap", label: "Nama Lengkap", sourceType: "manifest", manifestField: "jamaah.namaLengkap", inputType: "text", required: true },
      { key: "nik", label: "NIK Karyawan", sourceType: "manifest", manifestField: "jamaah.nik", inputType: "text", required: true },
      { key: "nomor_paspor", label: "Nomor Paspor", sourceType: "manifest", manifestField: "jamaah.nomorPaspor", inputType: "text" },
      { key: "nama_perusahaan", label: "Nama Perusahaan / Instansi", sourceType: "manual", inputType: "text", defaultValue: "PT. Maju Bersama", placeholderHint: "Nama kantor/perusahaan" },
      { key: "kota_kantor", label: "Kota Kantor / Instansi", sourceType: "manual", inputType: "city", defaultValue: "Jakarta", placeholderHint: "Kota tempat bekerja" },
      { key: "jabatan_karyawan", label: "Jabatan Karyawan", sourceType: "manual", inputType: "text", defaultValue: "Staff Operasional", placeholderHint: "Jabatan/posisi" },
      { key: "departemen", label: "Departemen / Divisi", sourceType: "manual", inputType: "text", defaultValue: "Divisi Operasional" },
      { key: "nama_paket", label: "Nama Paket", sourceType: "manifest", manifestField: "keberangkatan.namaPaket", inputType: "text" },
      { key: "tanggal_berangkat", label: "Tanggal Berangkat", sourceType: "manifest", manifestField: "keberangkatan.tanggalBerangkat", inputType: "date" },
      { key: "tanggal_pulang", label: "Tanggal Pulang", sourceType: "manifest", manifestField: "keberangkatan.tanggalPulang", inputType: "date" },
      { key: "lama_cuti_hari", label: "Lama Cuti (Hari)", sourceType: "manual", inputType: "number", defaultValue: "10", placeholderHint: "Jumlah hari cuti" },
    ],
    isDefault: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "tpl-cuti-sekolah",
    slug: "cuti-sekolah",
    nama: "Surat Cuti / Dispensasi Sekolah / Kuliah",
    kategori: "sekolah",
    deskripsi: "Permohonan dispensasi izin tidak masuk sekolah / kampus selama menunaikan ibadah umroh",
    kodeNomorDefault: "SC-SEKOLAH",
    formatNomor: "[NOMOR]/SC-SEKOLAH/VTU/[BULAN]/[TAHUN]",
    jumlahTemplateTerlampir: 1,
    kebutuhanNomorPerSurat: 1,
    formatNamaFile: "Surat_Izin_Sekolah_{{nama_lengkap}}",
    fileNameUploaded: "Template_Surat_Izin_Sekolah.docx",
    perihalDefault: "Permohonan Dispensasi Izin Tidak Masuk Sekolah / Kuliah",
    kopSuratType: "ppiu_vtu",
    lampiranDefault: "1 (Satu) Berkas",
    tujuanDefault: "Yth. Kepala Sekolah / Dekan {nama_sekolah}",
    kotaTujuanDefault: "{kota_sekolah}",
    penandatangan: {
      nama: "H. Faisal Wahyudi",
      jabatan: "Direktur Utama PT. Vauza Tamma Abadi",
      showStempel: true,
      showBarcode: true,
    },
    templateContent: `Dengan hormat,

Bersama surat ini kami dari Penyelenggara Ibadah Umroh PT. Vauza Tamma Abadi memberitahukan bahwa siswa / siswi / mahasiswa di bawah ini:

Nama Siswa/i      : {nama_lengkap}
NISN / NIM        : {nisn_nim}
Kelas / Jurusan   : {kelas_jurusan}
Nama Sekolah/Univ : {nama_sekolah}
Nama Orang Tua    : {nama_orang_tua}

Telah terdaftar resmi dan akan menunaikan Ibadah Umroh ke Tanah Suci bersama keluarga melalui travel kami pada:

Paket Umroh       : {nama_paket}
Tanggal Berangkat : {tanggal_berangkat}
Tanggal Kepulangan: {tanggal_pulang}
Rencana Masuk Kbm : {tanggal_masuk_kembali}

Sehubungan dengan hal tersebut, kami memohon kiranya Bapak/Ibu Kepala Sekolah / Dosen dapat memberikan izin dispensasi tidak mengikuti kegiatan belajar mengajar selama periode keberangkatan tersebut.

Demikian permohonan ini kami ajukan. Atas perhatian, dukungan, dan izin yang diberikan, kami haturkan terima kasih.`,
    placeholders: [
      { key: "nama_lengkap", label: "Nama Lengkap Siswa", sourceType: "manifest", manifestField: "jamaah.namaLengkap", inputType: "text", required: true },
      { key: "nisn_nim", label: "NISN / NIM / No. Induk", sourceType: "manual", inputType: "text", defaultValue: "20241001", placeholderHint: "Nomor Induk Siswa/Mahasiswa" },
      { key: "kelas_jurusan", label: "Kelas / Jurusan", sourceType: "manual", inputType: "text", defaultValue: "Kelas XI IPA 2", placeholderHint: "Tingkat kelas atau jurusan" },
      { key: "nama_sekolah", label: "Nama Sekolah / Universitas", sourceType: "manual", inputType: "text", defaultValue: "SMA Negeri 1", placeholderHint: "Nama institusi pendidikan" },
      { key: "kota_sekolah", label: "Kota Sekolah", sourceType: "manual", inputType: "city", defaultValue: "Sidoarjo" },
      { key: "nama_orang_tua", label: "Nama Orang Tua / Ayah", sourceType: "manifest", manifestField: "jamaah.namaAyah", inputType: "text" },
      { key: "nama_paket", label: "Nama Paket", sourceType: "manifest", manifestField: "keberangkatan.namaPaket", inputType: "text" },
      { key: "tanggal_berangkat", label: "Tanggal Berangkat", sourceType: "manifest", manifestField: "keberangkatan.tanggalBerangkat", inputType: "date" },
      { key: "tanggal_pulang", label: "Tanggal Pulang", sourceType: "manifest", manifestField: "keberangkatan.tanggalPulang", inputType: "date" },
      { key: "tanggal_masuk_kembali", label: "Tanggal Kembali Masuk Sekolah", sourceType: "manual", inputType: "date", defaultValue: "" },
    ],
    isDefault: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "tpl-surat-keterangan",
    slug: "keterangan",
    nama: "Surat Keterangan Terdaftar Jamaah",
    kategori: "internal",
    deskripsi: "Keterangan resmi status calon jamaah umroh aktif terdaftar di sistem PT. VTU Abadi",
    kodeNomorDefault: "SK-JAMAAH",
    formatNomor: "[NOMOR]/SK-JAMAAH/VTU/[BULAN]/[TAHUN]",
    jumlahTemplateTerlampir: 1,
    kebutuhanNomorPerSurat: 1,
    formatNamaFile: "Surat_Keterangan_{{nama_lengkap}}",
    fileNameUploaded: "Template_Surat_Keterangan_Jamaah.docx",
    perihalDefault: "Surat Keterangan Terdaftar Calon Jamaah Umroh",
    kopSuratType: "ppiu_vtu",
    lampiranDefault: "-",
    tujuanDefault: "Kepada Pihak yang Berkepentingan",
    kotaTujuanDefault: "Di Tempat",
    penandatangan: {
      nama: "H. Faisal Wahyudi",
      jabatan: "Direktur Utama PT. Vauza Tamma Abadi",
      showStempel: true,
      showBarcode: true,
    },
    templateContent: `Yang bertanda tangan di bawah ini menerangkan bahwa:

Nama Lengkap      : {nama_lengkap}
Nomor NIK / KTP   : {nik}
Nomor Paspor      : {nomor_paspor}
Tempat/Tgl Lahir  : {tempat_lahir}, {tanggal_lahir}
Alamat Lengkap    : {alamat}
Nomor Registrasi  : {nomor_registrasi}

Adalah benar calon jamaah Umroh PT. Vauza Tamma Abadi (Izin PPIU Kemenag RI No. U.400/2021) yang telah menyelesaikan proses administrasi pendaftaran untuk program keberangkatan:

Paket Umroh       : {nama_paket}
Kode Manifest     : {kode_paket}
Tanggal Berangkat : {tanggal_berangkat}
Status Registrasi : {status_registrasi}

Surat keterangan ini diterbitkan atas permintaan yang bersangkutan untuk keperluan: {keperluan_surat}.

Demikian surat keterangan ini kami berikan untuk dapat dipergunakan sebagaimana mestinya.`,
    placeholders: [
      { key: "nama_lengkap", label: "Nama Lengkap", sourceType: "manifest", manifestField: "jamaah.namaLengkap", inputType: "text", required: true },
      { key: "nik", label: "NIK", sourceType: "manifest", manifestField: "jamaah.nik", inputType: "text", required: true },
      { key: "nomor_paspor", label: "Nomor Paspor", sourceType: "manifest", manifestField: "jamaah.nomorPaspor", inputType: "text" },
      { key: "tempat_lahir", label: "Tempat Lahir", sourceType: "manifest", manifestField: "jamaah.tempatLahir", inputType: "city" },
      { key: "tanggal_lahir", label: "Tanggal Lahir", sourceType: "manifest", manifestField: "jamaah.tanggalLahir", inputType: "date" },
      { key: "alamat", label: "Alamat", sourceType: "manifest", manifestField: "jamaah.alamat", inputType: "textarea" },
      { key: "nomor_registrasi", label: "No Registrasi", sourceType: "manifest", manifestField: "jamaah.registrationId", inputType: "text" },
      { key: "nama_paket", label: "Nama Paket", sourceType: "manifest", manifestField: "keberangkatan.namaPaket", inputType: "text" },
      { key: "kode_paket", label: "Kode Manifest", sourceType: "manifest", manifestField: "keberangkatan.kode", inputType: "text" },
      { key: "tanggal_berangkat", label: "Tanggal Berangkat", sourceType: "manifest", manifestField: "keberangkatan.tanggalBerangkat", inputType: "date" },
      { key: "status_registrasi", label: "Status Jamaah", sourceType: "manual", inputType: "text", defaultValue: "Terdaftar Resmi (Lengkap)" },
      { key: "keperluan_surat", label: "Keperluan Pembuatan Surat", sourceType: "manual", inputType: "text", defaultValue: "Kelengkapan Administrasi & Verifikasi Keberangkatan" },
    ],
    isDefault: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "tpl-surat-tugas",
    slug: "tugas",
    nama: "Surat Perintah Tugas Petugas / Muthawwif",
    kategori: "internal",
    deskripsi: "Surat penugasan operasional resmi Tour Leader, Muthawwif, Medis, & Tim Handling",
    kodeNomorDefault: "ST-PETUGAS",
    formatNomor: "[NOMOR]/ST/[BULAN]/[TAHUN]",
    jumlahTemplateTerlampir: 1,
    kebutuhanNomorPerSurat: 1,
    formatNamaFile: "SK_{{Nama Pegawai}}",
    fileNameUploaded: "Template_Surat_Tugas.docx",
    perihalDefault: "Surat Perintah Tugas Operasional Ibadah Umroh",
    kopSuratType: "ppiu_vtu",
    lampiranDefault: "1 (Satu) Lembar Manifest",
    tujuanDefault: "Kepada Petugas yang Ditugaskan",
    kotaTujuanDefault: "Di Tempat",
    penandatangan: {
      nama: "H. Faisal Wahyudi",
      jabatan: "Direktur Utama PT. Vauza Tamma Abadi",
      showStempel: true,
      showBarcode: true,
    },
    templateContent: `SURAT PERINTAH TUGAS OPERASIONAL

Pimpinan PT. Vauza Tamma Abadi dengan ini memberikan tugas dan tanggung jawab kepada:

Nama Petugas      : {Nama Pegawai}
ID / NIP Petugas  : {NIP}
Jabatan Tugas     : {peran_tugas}
Nomor Kontak      : {kontak_petugas}

Untuk melaksanakan tugas pembimbingan dan pengawalan rombongan jamaah umroh pada program:

Paket Keberangkatan : {nama_paket}
Kode Rombongan      : {kode_paket}
Tanggal Berangkat   : {tanggal_berangkat}
Tanggal Kepulangan  : {tanggal_pulang}
Jumlah Jamaah       : {jumlah_jamaah} Orang

Rincian Tanggung Jawab Operasional:
1. Memimpin dan membimbing jalannya ibadah umroh sesuai sunnah Nabi SAW.
2. Memastikan kelancaran proses handling bandara, hotel, transportasi, dan ziarah.
3. Melakukan koordinasi berkala dengan tim kantor pusat dan perwakilan di Arab Saudi.

Demikian surat tugas ini diterbitkan untuk dilaksanakan dengan penuh amanah dan tanggung jawab.`,
    placeholders: [
      { key: "Nama Pegawai", label: "Nama Pegawai", sourceType: "manual", inputType: "text", defaultValue: "Ust. Ahmad Zaki, Lc.", placeholderHint: "Nama lengkap petugas" },
      { key: "NIP", label: "Nomor Induk Pegawai (NIP)", sourceType: "manual", inputType: "text", defaultValue: "PTG-2026-004" },
      { key: "peran_tugas", label: "Peran / Jabatan Tugas", sourceType: "manual", inputType: "select", options: ["Tour Leader (TL)", "Muthawwif Utama", "Pembimbing Ibadah", "Petugas Medis", "Handling Bandara"], defaultValue: "Tour Leader (TL)" },
      { key: "kontak_petugas", label: "Nomor Kontak Petugas", sourceType: "manual", inputType: "text", defaultValue: "081122334455" },
      { key: "nama_paket", label: "Nama Paket", sourceType: "manifest", manifestField: "keberangkatan.namaPaket", inputType: "text" },
      { key: "kode_paket", label: "Kode Manifest", sourceType: "manifest", manifestField: "keberangkatan.kode", inputType: "text" },
      { key: "tanggal_berangkat", label: "Tanggal Berangkat", sourceType: "manifest", manifestField: "keberangkatan.tanggalBerangkat", inputType: "date" },
      { key: "tanggal_pulang", label: "Tanggal Pulang", sourceType: "manifest", manifestField: "keberangkatan.tanggalPulang", inputType: "date" },
      { key: "jumlah_jamaah", label: "Jumlah Jamaah Rombongan", sourceType: "manual", inputType: "number", defaultValue: "45" },
    ],
    isDefault: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "tpl-klaim-asuransi",
    slug: "klaim-asuransi",
    nama: "Surat Pengantar Klaim Asuransi",
    kategori: "asuransi",
    deskripsi: "Pengantar klaim penggantian biaya medis, pembatalan, atau penanganan darurat asuransi",
    kodeNomorDefault: "SKA-ASURANSI",
    formatNomor: "[NOMOR]/SKA-ASURANSI/VTU/[BULAN]/[TAHUN]",
    jumlahTemplateTerlampir: 1,
    kebutuhanNomorPerSurat: 1,
    formatNamaFile: "Surat_Klaim_Asuransi_{{nama_lengkap}}",
    fileNameUploaded: "Template_Klaim_Asuransi.docx",
    perihalDefault: "Permohonan Pengajuan Klaim Asuransi Perjalanan Umroh",
    kopSuratType: "ppiu_vtu",
    lampiranDefault: "1 (Satu) Berkas Medis & Tagihan",
    tujuanDefault: "Yth. Bagian Klaim {nama_perusahaan_asuransi}",
    kotaTujuanDefault: "Di Tempat",
    penandatangan: {
      nama: "H. Faisal Wahyudi",
      jabatan: "Direktur Utama PT. Vauza Tamma Abadi",
      showStempel: true,
      showBarcode: true,
    },
    templateContent: `Dengan hormat,

Sehubungan dengan kepesertaan asuransi perjalanan ibadah umroh jamaah PT. Vauza Tamma Abadi, bersama ini kami mengajukan permohonan klaim asuransi atas nama tertanggung:

Nama Jamaah / Tertanggung : {nama_lengkap}
Nomor Paspor              : {nomor_paspor}
Nomor NIK                 : {nik}
Nomor Polis / Sertifikat  : {nomor_polis}
Paket & Keberangkatan     : {nama_paket} ({tanggal_berangkat})

Rincian Kejadian Klaim:
Jenis Klaim               : {jenis_klaim}
Tanggal & Waktu Kejadian  : {tanggal_kejadian}
Lokasi Kejadian           : {lokasi_kejadian}
Estimasi Nominal Klaim    : Rp {nominal_klaim}
Keterangan Medis/Kronologi: {kronologi_singkat}

Bersama surat ini kami lampirkan dokumen pendukung berupa tagihan rumah sakit, resep obat, laporan medis, dan tiket perjalanan.

Besar harapan kami kiranya permohonan klaim ini dapat segera diproses sesuai ketentuan polis yang berlaku. Atas perhatian dan kerjasamanya kami ucapkan terima kasih.`,
    placeholders: [
      { key: "nama_perusahaan_asuransi", label: "Nama Asuransi", sourceType: "manual", inputType: "text", defaultValue: "Asuransi Syariah Al-Amin / Zurich" },
      { key: "nama_lengkap", label: "Nama Jamaah", sourceType: "manifest", manifestField: "jamaah.namaLengkap", inputType: "text", required: true },
      { key: "nomor_paspor", label: "Nomor Paspor", sourceType: "manifest", manifestField: "jamaah.nomorPaspor", inputType: "text" },
      { key: "nik", label: "NIK", sourceType: "manifest", manifestField: "jamaah.nik", inputType: "text" },
      { key: "nomor_polis", label: "Nomor Polis Asuransi", sourceType: "manual", inputType: "text", defaultValue: "POLIS-UMR-2026-8821" },
      { key: "nama_paket", label: "Nama Paket", sourceType: "manifest", manifestField: "keberangkatan.namaPaket", inputType: "text" },
      { key: "tanggal_berangkat", label: "Tanggal Berangkat", sourceType: "manifest", manifestField: "keberangkatan.tanggalBerangkat", inputType: "date" },
      { key: "jenis_klaim", label: "Jenis Klaim", sourceType: "manual", inputType: "select", options: ["Biaya Pengobatan / Rawat Inap", "Keterlambatan Penerbangan", "Kehilangan Bagasi", "Pembatalan Akibat Sakit Kritis"], defaultValue: "Biaya Pengobatan / Rawat Inap" },
      { key: "tanggal_kejadian", label: "Tanggal Kejadian", sourceType: "manual", inputType: "date", defaultValue: "" },
      { key: "lokasi_kejadian", label: "Lokasi Kejadian", sourceType: "manual", inputType: "city", defaultValue: "Mekkah Al-Mukarramah" },
      { key: "nominal_klaim", label: "Nominal Estimasi Klaim", sourceType: "manual", inputType: "number", defaultValue: "5000000" },
      { key: "kronologi_singkat", label: "Kronologi Singkat Kejadian", sourceType: "manual", inputType: "textarea", defaultValue: "Jamaah mengalami kelelahan dan dehidrasi saat pelaksanaan ibadah sehingga dirawat di RS Jiad Makkah." },
    ],
    isDefault: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

// ────────────────────────────────────────────────────────────
// AUTOCRAT ENGINE: RESOLVE VALUES FROM MANIFEST & FORM DATA
// ────────────────────────────────────────────────────────────

/**
 * Detects whether a placeholder tag is managed automatically by the system
 * (e.g. Nomor Surat, Nomor Surat 1, Tanggal Surat, Tanggal Hari Ini, Today, Hijriyah).
 * These tags should NOT be displayed in manual form inputs.
 */
export function isSystemAutoPlaceholder(rawKey: string): boolean {
  if (!rawKey) return false;
  const k = rawKey.toLowerCase().trim().replace(/[\s_\-\.]/g, "");

  // Nomor surat variants
  if (
    k.startsWith("nomorsurat") ||
    k.startsWith("nosurat") ||
    k === "nomor" ||
    k === "no" ||
    k.startsWith("nomorsurattugas") ||
    k.startsWith("nosurattugas")
  ) {
    return true;
  }

  // Tanggal surat / tanggal hari ini variants
  if (
    k === "tanggalsurat" ||
    k === "tglsurat" ||
    k === "tanggalhariini" ||
    k === "tglhariini" ||
    k === "tanggal" ||
    k === "tgl" ||
    k === "today" ||
    k === "tanggalhijriyah" ||
    k === "tglhijriyah" ||
    k === "bulanromawi" ||
    k === "tahun"
  ) {
    return true;
  }

  return false;
}

export function resolveAutocratFieldValues(
  template: SuratTemplate,
  jamaah: any | null,
  keberangkatan: any | null,
  manualFormData: Record<string, any> = {},
  systemOverrides: {
    nomorSurat?: string;
    nomorSurat2?: string;
    tanggalSurat?: string;
    tanggalHijriyah?: string;
  } = {}
): Record<string, string> {
  const today = getTodayDateInfo();
  const values: Record<string, string> = {};

  // Extract all placeholders across template sources
  const textSources = [
    template.templateContent,
    template.perihalDefault,
    template.tujuanDefault || "",
    template.kotaTujuanDefault || "",
    ...(template.attachedFiles?.map((f) => f.content || "") || []),
    ...(template.attachedFiles?.map((f) => f.formatNamaFile || "") || []),
    template.formatNamaFile || "",
    ...template.placeholders.map((p) => `{${p.key}}`),
  ].join("\n");

  const detectedKeys = extractPlaceholdersFromText(textSources);

  const normalizeKey = (s: string) =>
    s.toLowerCase().trim().replace(/[\u2018\u2019\u201A\u201B']/g, "'").replace(/[\s_\-\.]/g, "");

  const getManualOverride = (k: string): string | undefined => {
    if (manualFormData[k] !== undefined) return manualFormData[k];
    const target = normalizeKey(k);
    for (const [mk, mv] of Object.entries(manualFormData)) {
      if (normalizeKey(mk) === target && mv !== undefined) return mv;
    }
    return undefined;
  };

  // Detect whether the current letter is for Endorsement
  const currentHal =
    getManualOverride("Hal") ||
    getManualOverride("hal") ||
    getManualOverride("perihal") ||
    getManualOverride("Perihal") ||
    manualFormData["Hal"] ||
    manualFormData["hal"] ||
    manualFormData["Perihal"] ||
    manualFormData["perihal"] ||
    template.perihalDefault ||
    "";
  const isEndorsement = currentHal.toLowerCase().includes("endorse");
  const namaAyahCandidate =
    getManualOverride("namaAyah") ||
    getManualOverride("nama_ayah") ||
    getManualOverride("Nama Ayah") ||
    getManualOverride("nama_ayah_kandung") ||
    jamaah?.namaAyah ||
    jamaah?.ayahKandung ||
    jamaah?.fatherName ||
    jamaah?.dokumen?.find?.((d: any) => d.jenis === "kk" || d.jenis === "buku_nikah")?.manualData?.namaAyah ||
    jamaah?.dokumen?.find?.((d: any) => d.jenis === "kk" || d.jenis === "buku_nikah")?.ocrData?.namaAyah ||
    "";

  detectedKeys.forEach((key) => {
    const cleanK = normalizeKey(key);

    // 1. System auto-resolved variables
    if (cleanK === "nomorsurat2" || cleanK === "nosurat2") {
      values[key] =
        systemOverrides.nomorSurat2 ||
        systemOverrides.nomorSurat ||
        `002/${template.kodeNomorDefault || "SR-PASPOR"}/VTU/${today.romanMonth}/${today.year}`;
      return;
    }
    if (
      cleanK.startsWith("nomorsurat") ||
      cleanK.startsWith("nosurat") ||
      cleanK === "nomor" ||
      cleanK === "no" ||
      cleanK.startsWith("nomorsurattugas") ||
      cleanK.startsWith("nosurattugas")
    ) {
      values[key] =
        systemOverrides.nomorSurat ||
        `001/${template.kodeNomorDefault || "SR-PASPOR"}/VTU/${today.romanMonth}/${today.year}`;
      return;
    }
    if (
      cleanK === "tanggalsurat" ||
      cleanK === "tglsurat" ||
      cleanK === "tanggalhariini" ||
      cleanK === "tglhariini" ||
      cleanK === "tanggal" ||
      cleanK === "tgl" ||
      cleanK === "today"
    ) {
      values[key] = systemOverrides.tanggalSurat || today.masehi;
      return;
    }
    if (cleanK === "tanggalhijriyah" || cleanK === "tglhijriyah") {
      values[key] = systemOverrides.tanggalHijriyah || today.hijriyah;
      return;
    }
    if (cleanK === "bulanromawi") {
      values[key] = today.bulanRomawi;
      return;
    }
    if (cleanK === "tahun") {
      values[key] = String(today.year);
      return;
    }

    // Check direct manual form override first
    const directManualVal = getManualOverride(key);
    if (directManualVal !== undefined) {
      const isNamaJamaahKey =
        cleanK === "nama" ||
        cleanK === "namajamaah" ||
        cleanK === "namalengkap" ||
        cleanK.includes("namajama") ||
        cleanK.includes("namalengkap");

      if (isEndorsement && isNamaJamaahKey && namaAyahCandidate) {
        values[key] = formatJamaahNameWithEndorsement(directManualVal, namaAyahCandidate, true);
      } else {
        values[key] = directManualVal;
      }
      return;
    }

    // Departure Month Special Match
    if (cleanK.includes("bulankeberangkatan") || cleanK.includes("bulanberangkat")) {
      const depDate =
        keberangkatan?.tanggalBerangkat ||
        keberangkatan?.departureDate ||
        keberangkatan?.bulan ||
        keberangkatan?.bulanKeberangkatan;
      values[key] = depDate ? formatMonthYear(depDate) : "Juni 2026";
      return;
    }

    // Hal / Perihal Special Match
    if (cleanK === "hal" || cleanK === "perihal") {
      const manualHal = getManualOverride("Hal") || getManualOverride("hal") || getManualOverride("perihal") || getManualOverride(key);
      values[key] = manualHal || "Permohonan Baru";
      return;
    }

    // 2. Check if mapping exists in template.placeholders
    const mapping = template.placeholders.find(
      (p) => normalizeKey(p.key) === cleanK
    );

    if (mapping) {
      if (mapping.sourceType === "manifest" && mapping.manifestField) {
        if (
          mapping.manifestField === "imigrasi.kotaKanim" ||
          cleanK.includes("kotakanim") ||
          cleanK.includes("kotaimigrasi") ||
          (cleanK.includes("kota") && (cleanK.includes("kanim") || cleanK.includes("imigrasi")))
        ) {
          // VLOOKUP city from chosen kanim in manualFormData or default
          let parentKanim = "";
          for (const [mk, mv] of Object.entries(manualFormData)) {
            const cleanMk = mk.toLowerCase().replace(/[\s_\-\.]/g, "");
            if ((cleanMk.includes("kanim") || cleanMk.includes("imigrasi") || cleanMk.includes("kantor")) && !cleanMk.includes("kota")) {
              if (typeof mv === "string" && mv.trim()) {
                parentKanim = mv;
                break;
              }
            }
          }
          const rawCity = getManualOverride(key);
          const resolvedKota = (rawCity ? (getKotaFromKanimName(rawCity) || rawCity) : "") || (parentKanim ? getKotaFromKanimName(parentKanim) : "") || "Surabaya";
          values[key] = toTitleCase(resolvedKota);
        } else if (mapping.manifestField === "imigrasi.kanim") {
          values[key] = getManualOverride(key) || DAFTAR_KANTOR_IMIGRASI[0]?.nama || "Kantor Imigrasi Kelas I Khusus TPI Surabaya";
        } else {
          // Intelligent auto-correction for misconfigured manifestField
          let effectiveField = mapping.manifestField;
          const cleanKKey = key.toLowerCase().replace(/[\s_\-\.]/g, "");
          const cleanLKey = (mapping.label || "").toLowerCase().replace(/[\s_\-\.]/g, "");
          if ((cleanKKey.includes("bulan") || cleanLKey.includes("bulan")) && !effectiveField.startsWith("keberangkatan.")) {
            effectiveField = "keberangkatan.bulanKeberangkatan";
          } else if ((cleanKKey.includes("tanggallahir") || cleanLKey.includes("tanggallahir")) && effectiveField !== "jamaah.tanggalLahir") {
            effectiveField = "jamaah.tanggalLahir";
          } else if ((cleanKKey.includes("tempatlahir") || cleanLKey.includes("tempatlahir")) && effectiveField !== "jamaah.tempatLahir") {
            effectiveField = "jamaah.tempatLahir";
          } else if ((cleanKKey.includes("alamat") || cleanLKey.includes("alamat")) && effectiveField !== "jamaah.alamat") {
            effectiveField = "jamaah.alamat";
          }

          values[key] = resolveManifestFieldValue(effectiveField, jamaah, keberangkatan, today, {
            isEndorsement,
            namaAyah: namaAyahCandidate,
          });
        }
      } else {
        // Manual form data priority -> auto-lookup kota if empty -> defaultValue -> empty string
        let val = getManualOverride(key);
        const cleanKey = key.toLowerCase().replace(/[\s_\-\.]/g, "");
        if (
          (!val || !String(val).trim()) &&
          (cleanKey.includes("kotakanim") ||
            cleanKey.includes("kotaimigrasi") ||
            cleanKey.includes("kotakantor") ||
            (cleanKey.includes("kota") && !cleanKey.includes("lahir") && !cleanKey.includes("tujuan")))
        ) {
          let parentKanim = "";
          for (const [mk, mv] of Object.entries(manualFormData)) {
            const cleanMk = mk.toLowerCase().replace(/[\s_\-\.]/g, "");
            if ((cleanMk.includes("kanim") || cleanMk.includes("imigrasi") || cleanMk.includes("kantor")) && !cleanMk.includes("kota")) {
              if (typeof mv === "string" && mv.trim()) {
                parentKanim = mv;
                break;
              }
            }
          }
          if (parentKanim) {
            val = toTitleCase(getKotaFromKanimName(parentKanim));
          }
        }

        values[key] = val !== undefined ? String(val) : (mapping.defaultValue ?? "");
      }
    } else {
      // Smart Auto-detection based on key name if not explicitly configured in mapping
      values[key] = autoDetectManifestValue(key, jamaah, keberangkatan, today, manualFormData, {
        isEndorsement,
        namaAyah: namaAyahCandidate,
      });
    }
  });

  // Cross-populate all aliases for template placeholders so keys like 'alamat', 'Alamat', 'Alamat Lengkap' match seamlessly
  template.placeholders.forEach((p) => {
    if (values[p.key] === undefined) {
      const normPKey = normalizeKey(p.key);
      const normLabel = normalizeKey(p.label || "");
      for (const [vk, vv] of Object.entries(values)) {
        const normVk = normalizeKey(vk);
        if (normVk === normPKey || normVk === normLabel) {
          values[p.key] = vv;
          break;
        }
      }
    }
  });

  return values;
}

// ────────────────────────────────────────────────────────────
// EXTRACT JAMA'AH / APPLICANT NAME FROM FORM COLUMN (GAMBAR 3)
// ────────────────────────────────────────────────────────────

/**
 * Extracts the person's name directly from Autocrat form fields (Gambar 3 column).
 * Takes absolute priority over the selected manifest card (Gambar 2).
 */
export function extractNamaFromAutocratFields(
  fieldsData?: Record<string, any> | null,
  manualData?: Record<string, any> | null,
  placeholders?: SuratPlaceholderMapping[] | null
): string {
  const dataSources = [manualData, fieldsData].filter(Boolean) as Record<string, any>[];

  // 1. Check placeholders specifically designated for the person's name
  if (placeholders && placeholders.length > 0) {
    for (const p of placeholders) {
      const cleanK = (p.key || "").toLowerCase().replace(/[\u2018\u2019\u201A\u201B']/g, "").replace(/[\s_\-\.]/g, "");
      const cleanL = (p.label || "").toLowerCase().replace(/[\u2018\u2019\u201A\u201B']/g, "").replace(/[\s_\-\.]/g, "");

      const isNameField =
        cleanK === "namajamaah" ||
        cleanK === "namalengkap" ||
        cleanK === "nama" ||
        cleanK === "namapemohon" ||
        cleanK === "namapegawai" ||
        cleanK === "namapetugas" ||
        cleanK === "namatertanggung" ||
        cleanK === "namakaryawan" ||
        cleanK === "namasiswa" ||
        cleanK === "namasantri" ||
        cleanL.includes("nama jama") ||
        cleanL.includes("nama lengkap") ||
        cleanL.includes("nama pemohon") ||
        cleanL.includes("nama pegawai") ||
        cleanL === "nama";

      if (isNameField) {
        for (const ds of dataSources) {
          const val = ds[p.key];
          if (val && typeof val === "string" && val.trim() && val.trim() !== "-") {
            return val.trim();
          }
        }
      }
    }
  }

  // 2. Scan all keys in manualData and fieldsData for name tags
  const targetPatterns = [
    /nama[_\s-]*jama['`’]?ah/i,
    /nama[_\s-]*lengkap/i,
    /^nama$/i,
    /nama[_\s-]*pemohon/i,
    /nama[_\s-]*pegawai/i,
    /nama[_\s-]*petugas/i,
    /nama[_\s-]*tertanggung/i,
    /nama[_\s-]*karyawan/i,
    /nama[_\s-]*siswa/i,
    /nama[_\s-]*santri/i,
  ];

  for (const ds of dataSources) {
    for (const pat of targetPatterns) {
      for (const [k, v] of Object.entries(ds)) {
        if (pat.test(k) && v && typeof v === "string" && v.trim() && v.trim() !== "-") {
          return v.trim();
        }
      }
    }
  }

  // 3. Fallback: Any key containing 'nama' (excluding irrelevant fields like ayah, paket, perusahaan, etc.)
  for (const ds of dataSources) {
    for (const [k, v] of Object.entries(ds)) {
      const lk = k.toLowerCase().replace(/[\s_\-\.]/g, "");
      if (
        lk.includes("nama") &&
        !lk.includes("ayah") &&
        !lk.includes("perusahaan") &&
        !lk.includes("paket") &&
        !lk.includes("hotel") &&
        !lk.includes("kantor") &&
        !lk.includes("instansi") &&
        !lk.includes("bank") &&
        !lk.includes("rs") &&
        !lk.includes("asuransi")
      ) {
        if (v && typeof v === "string" && v.trim() && v.trim() !== "-") {
          return v.trim();
        }
      }
    }
  }

  return "";
}

/**
 * Generates the clean file name for an exported or downloaded Surat (.pdf or .docx).
 * Crucially adheres to the user rule: The name in the filename is sourced directly from
 * the name column/tag in the Autocrat form (Gambar 3), NOT from the manifest card (Gambar 2).
 */
export function generateSuratFileName(
  nomorSurat: string,
  fieldsData: Record<string, any>,
  manualData?: Record<string, any> | null,
  options?: {
    formatNamaFile?: string;
    isTtd?: boolean;
    ext?: "pdf" | "docx";
    placeholders?: SuratPlaceholderMapping[];
    fallbackNama?: string;
  }
): string {
  const cleanNomor = (nomorSurat || "").replace(/[/\\?%*:|"<>]/g, "-").trim();
  const nameFromColumn =
    extractNamaFromAutocratFields(fieldsData, manualData, options?.placeholders) ||
    options?.fallbackNama ||
    "Jamaah";
  const cleanName = nameFromColumn.trim().replace(/[/\\?%*:|"<>]/g, "").replace(/\s+/g, "_");
  const ext = options?.ext || "pdf";

  const targetFormat = options?.formatNamaFile?.trim();
  if (targetFormat && (targetFormat.includes("{{") || targetFormat.includes("{"))) {
    // Populate standard person name aliases in mergedData so placeholders always resolve
    const rawName = cleanName.replace(/_/g, " ");
    const mergedData: Record<string, any> = {
      nama_lengkap: rawName,
      nama: rawName,
      nama_jamaah: rawName,
      "Nama Lengkap": rawName,
      "Nama Jamaah": rawName,
      "Nama Jama'ah": rawName,
      "Nama": rawName,
      "Nama Pegawai": rawName,
      nama_pegawai: rawName,
      "Nama Karyawan": rawName,
      nama_karyawan: rawName,
      ...fieldsData,
      ...(manualData || {}),
    };

    // Ensure aliases take effect if fieldsData had empty/undefined values for them
    if (!mergedData["nama_lengkap"]) mergedData["nama_lengkap"] = rawName;
    if (!mergedData["Nama Lengkap"]) mergedData["Nama Lengkap"] = rawName;
    if (!mergedData["Nama Jamaah"]) mergedData["Nama Jamaah"] = rawName;

    let mergedName = renderAutocratMergedText(targetFormat, mergedData);
    // Strip any unresolved bracketed placeholders (e.g. {{tag}} or {tag})
    mergedName = mergedName.replace(/(?:\{+|<<|«|\[\[)[^}\]>»]+(?:\}+|>>|»|\]\])/g, "");
    let sanitized = mergedName.replace(/[/\\?%*:|"<>]/g, "").replace(/\s+/g, "_").replace(/^_+|_+$/g, "");

    // If for any reason the sanitized filename does not contain the person's name, append it!
    const cleanLower = cleanName.toLowerCase();
    if (cleanName && cleanName !== "Jamaah" && !sanitized.toLowerCase().includes(cleanLower)) {
      sanitized = sanitized ? `${sanitized}_${cleanName}` : cleanName;
    }

    if (options?.isTtd && !sanitized.toUpperCase().includes("TTD")) {
      sanitized = sanitized.replace(/^([^_]+)/, `$1_TTD`);
    }

    if (sanitized && sanitized !== "_") {
      return `${sanitized}.${ext}`;
    }
  }

  const suffix = options?.isTtd ? "TTD_" : "";
  return `${cleanNomor}_${suffix}${cleanName}.${ext}`;
}

// ────────────────────────────────────────────────────────────
// DATE & MONTH FORMATTING & PARSING HELPERS (AUTOCRAT FORMS)
// ────────────────────────────────────────────────────────────

/**
 * Parses an Indonesian date string (e.g. '10 Juni 1990', '10-06-1990', '1990-06-10') into 'YYYY-MM-DD' for date inputs.
 */
export function parseDateToIsoString(dateStr?: string | null): string {
  if (!dateStr || typeof dateStr !== "string") return "";
  const trimmed = dateStr.trim();
  if (!trimmed || trimmed === "-") return "";

  // 1. Direct match YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  // 2. Match DD-MM-YYYY or DD/MM/YYYY
  const dmyMatch = trimmed.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (dmyMatch && dmyMatch[1] && dmyMatch[2] && dmyMatch[3]) {
    const day = dmyMatch[1].padStart(2, "0");
    const month = dmyMatch[2].padStart(2, "0");
    const year = dmyMatch[3];
    return `${year}-${month}-${day}`;
  }

  // 3. Match DD MonthName YYYY (e.g. '10 Juni 1990' or '10 Jun 1990')
  const MONTHS_MAP: Record<string, string> = {
    januari: "01", jan: "01",
    februari: "02", feb: "02",
    maret: "03", mar: "03",
    april: "04", apr: "04",
    mei: "05", may: "05",
    juni: "06", jun: "06",
    juli: "07", jul: "07",
    agustus: "08", agu: "08", ags: "08", aug: "08",
    september: "09", sep: "09", sept: "09",
    oktober: "10", okt: "10", oct: "10",
    november: "11", nov: "11",
    desember: "12", des: "12", dec: "12",
  };

  const textMatch = trimmed.match(/^(\d{1,2})\s+([a-zA-Z]+)\s+(\d{4})$/);
  if (textMatch && textMatch[1] && textMatch[2] && textMatch[3]) {
    const day = textMatch[1].padStart(2, "0");
    const monthName = textMatch[2].toLowerCase();
    const year = textMatch[3];
    const monthNum = MONTHS_MAP[monthName];
    if (monthNum) {
      return `${year}-${monthNum}-${day}`;
    }
  }

  // 4. Try JS Date parse
  const d = new Date(trimmed);
  if (!isNaN(d.getTime())) {
    return d.toISOString().split("T")[0] || "";
  }

  return "";
}

/**
 * Formats a YYYY-MM-DD string or Date into standard Indonesian official letter format 'DD MMMM YYYY' (e.g. '10 Juni 1990').
 */
export function formatIsoToIndonesianDate(isoStr?: string | null): string {
  if (!isoStr || typeof isoStr !== "string") return "";
  const trimmed = isoStr.trim();
  if (!trimmed) return "";

  const match = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match && match[1] && match[2] && match[3]) {
    const year = match[1];
    const monthIdx = parseInt(match[2], 10) - 1;
    const day = parseInt(match[3], 10);
    const BULAN = [
      "Januari", "Februari", "Maret", "April", "Mei", "Juni",
      "Juli", "Agustus", "September", "Oktober", "November", "Desember"
    ];
    if (monthIdx >= 0 && monthIdx < 12) {
      return `${day} ${BULAN[monthIdx]} ${year}`;
    }
  }

  return trimmed;
}

/**
 * Formats a date range into standard Indonesian official letter format:
 * - Same start & end date: "10 Oktober 2026"
 * - Same month & year: "10 s/d 25 Oktober 2026"
 * - Different month, same year: "28 Oktober s/d 10 November 2026"
 * - Different year: "28 Desember 2026 s/d 10 Januari 2027"
 */
export function formatIsoToIndonesianDateRange(startDateIso?: string | null, endDateIso?: string | null): string {
  if (!startDateIso && !endDateIso) return "";
  if (startDateIso && !endDateIso) return formatIsoToIndonesianDate(startDateIso);
  if (!startDateIso && endDateIso) return formatIsoToIndonesianDate(endDateIso);

  const startFormatted = formatIsoToIndonesianDate(startDateIso);
  const endFormatted = formatIsoToIndonesianDate(endDateIso);

  if (startDateIso === endDateIso) return startFormatted;

  const startMatch = (startDateIso || "").trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const endMatch = (endDateIso || "").trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (startMatch && endMatch) {
    const BULAN = [
      "Januari", "Februari", "Maret", "April", "Mei", "Juni",
      "Juli", "Agustus", "September", "Oktober", "November", "Desember"
    ];
    const sYear = startMatch[1] || "";
    const sMonthIdx = parseInt(startMatch[2] || "1", 10) - 1;
    const sDay = parseInt(startMatch[3] || "1", 10);

    const eYear = endMatch[1] || "";
    const eMonthIdx = parseInt(endMatch[2] || "1", 10) - 1;
    const eDay = parseInt(endMatch[3] || "1", 10);

    if (sYear === eYear && sMonthIdx === eMonthIdx) {
      return `${sDay} s/d ${eDay} ${BULAN[sMonthIdx]} ${sYear}`;
    } else if (sYear === eYear) {
      return `${sDay} ${BULAN[sMonthIdx]} s/d ${eDay} ${BULAN[eMonthIdx]} ${sYear}`;
    } else {
      return `${sDay} ${BULAN[sMonthIdx]} ${sYear} s/d ${eDay} ${BULAN[eMonthIdx]} ${eYear}`;
    }
  }

  return `${startFormatted} s/d ${endFormatted}`;
}

/**
 * Parses an Indonesian date range string into [startDateIso, endDateIso]
 */
export function parseDateRangeToIsoStrings(rangeStr?: string | null): [string, string] {
  if (!rangeStr || typeof rangeStr !== "string") return ["", ""];
  const trimmed = rangeStr.trim();
  if (!trimmed) return ["", ""];

  const parts = trimmed.split(/\s+(?:s\/d|-|sampai dengan|sd)\s+/i);
  if (parts.length >= 2 && parts[0] !== undefined && parts[1] !== undefined) {
    const rawStart = parts[0].trim();
    const rawEnd = parts[1].trim();

    const endIso = parseDateToIsoString(rawEnd);
    if (/^\d{1,2}$/.test(rawStart) && endIso) {
      const [year, month] = endIso.split("-");
      const startDay = rawStart.padStart(2, "0");
      return [`${year}-${month}-${startDay}`, endIso];
    }

    if (endIso && !/\d{4}/.test(rawStart)) {
      const [year] = endIso.split("-");
      const startIso = parseDateToIsoString(`${rawStart} ${year}`);
      if (startIso) return [startIso, endIso];
    }

    const startIso = parseDateToIsoString(rawStart);
    return [startIso || "", endIso || ""];
  }

  const singleIso = parseDateToIsoString(trimmed);
  return [singleIso || "", ""];
}

/**
 * Parses Month-Year string (e.g. 'September 2026' or '2026-09') into 'YYYY-MM'.
 */
export function parseMonthYearToIsoString(str?: string | null): string {
  if (!str || typeof str !== "string") return "";
  const trimmed = str.trim();
  if (/^\d{4}-\d{2}$/.test(trimmed)) return trimmed;

  const MONTHS_MAP: Record<string, string> = {
    januari: "01", jan: "01",
    februari: "02", feb: "02",
    maret: "03", mar: "03",
    april: "04", apr: "04",
    mei: "05",
    juni: "06", jun: "06",
    juli: "07", jul: "07",
    agustus: "08", agu: "08", ags: "08",
    september: "09", sep: "09",
    oktober: "10", okt: "10",
    november: "11", nov: "11",
    desember: "12", des: "12",
  };

  const match = trimmed.match(/([a-zA-Z]+)\s+(\d{4})/);
  if (match && match[1] && match[2]) {
    const m = MONTHS_MAP[match[1].toLowerCase()];
    if (m) return `${match[2]}-${m}`;
  }
  return "";
}

/**
 * Formats YYYY-MM into 'MMMM YYYY' in Indonesian (e.g. 'September 2026').
 */
export function formatIsoToIndonesianMonthYear(isoMonth?: string | null): string {
  if (!isoMonth || typeof isoMonth !== "string") return "";
  const trimmed = isoMonth.trim();
  const match = trimmed.match(/^(\d{4})-(\d{2})$/);
  if (match && match[1] && match[2]) {
    const year = match[1];
    const monthIdx = parseInt(match[2], 10) - 1;
    const BULAN = [
      "Januari", "Februari", "Maret", "April", "Mei", "Juni",
      "Juli", "Agustus", "September", "Oktober", "November", "Desember"
    ];
    if (monthIdx >= 0 && monthIdx < 12) {
      return `${BULAN[monthIdx]} ${year}`;
    }
  }
  return trimmed;
}

// ────────────────────────────────────────────────────────────
// RESOLVE SPECIFIC MANIFEST FIELD
// ────────────────────────────────────────────────────────────

export interface ManifestResolveOptions {
  isEndorsement?: boolean;
  namaAyah?: string | null;
}

export function formatJamaahNameWithEndorsement(
  baseName: string,
  rawAyah?: string | null,
  isEndorsement = true
): string {
  if (!baseName) return "";
  const trimmedBase = baseName.trim();
  if (!isEndorsement) return toTitleCase(trimmedBase);

  if (!rawAyah || rawAyah.trim() === "-" || rawAyah.trim() === "") {
    return toTitleCase(trimmedBase);
  }

  // Saring gelar ayah seperti H., Hj., Drs., Dr., K.H., KH., Prof., Ustadz, Ust., Ir., Ir, Kyai, Hajjah, Haji
  const cleanAyah = rawAyah
    .trim()
    .replace(/^(?:(?:H\.|Hj\.|Drs\.|Dr\.|K\.H\.|KH\.|Prof\.|Ustadz|Ust\.|Ir\.|Ir|Haji|Hajjah|Kyai)\s*)+/i, "")
    .trim();

  if (!cleanAyah || cleanAyah === "-") return toTitleCase(trimmedBase);

  // Periksa apakah nama jamaah memiliki gelar setelah koma (cth: "Shofani, ST")
  let nameWithoutTitle = trimmedBase;
  let titleSuffix = "";
  const commaIdx = trimmedBase.indexOf(",");
  if (commaIdx !== -1) {
    nameWithoutTitle = trimmedBase.slice(0, commaIdx).trim();
    titleSuffix = trimmedBase.slice(commaIdx).trim(); // cth: ", ST"
  }

  // Periksa apakah nama jamaah sudah berakhiran nama ayah tersebut
  const lowerBase = nameWithoutTitle.toLowerCase();
  const lowerAyah = cleanAyah.toLowerCase();

  if (lowerBase.endsWith(lowerAyah)) {
    return toTitleCase(trimmedBase);
  }

  // Jika kata pertama ayah sudah sama dengan kata terakhir nama jamaah, cegah duplikasi
  const baseWords = nameWithoutTitle.split(/\s+/);
  const ayahWords = cleanAyah.split(/\s+/);
  const lastBaseWord = baseWords[baseWords.length - 1]?.toLowerCase();
  const firstAyahWord = ayahWords[0]?.toLowerCase();

  let mergedBase = "";
  if (lastBaseWord && firstAyahWord && lastBaseWord === firstAyahWord) {
    const remainingAyah = ayahWords.slice(1).join(" ");
    if (!remainingAyah) return toTitleCase(trimmedBase);
    mergedBase = `${nameWithoutTitle} ${remainingAyah}`;
  } else {
    mergedBase = `${nameWithoutTitle} ${cleanAyah}`;
  }

  if (titleSuffix) {
    return `${toTitleCase(mergedBase)}, ${toTitleCase(titleSuffix.replace(/^,\s*/, ""))}`;
  }
  return toTitleCase(mergedBase);
}

export function resolveManifestFieldValue(
  fieldKey: string,
  jamaah: any | null,
  keberangkatan: any | null,
  today = getTodayDateInfo(),
  options?: ManifestResolveOptions
): string {
  if (!fieldKey) return "";

  // Jamaah fields
  if (fieldKey.startsWith("jamaah.")) {
    if (!jamaah) return "";
    const subKey = fieldKey.replace("jamaah.", "");
    switch (subKey) {
      case "namaLengkap": {
        const baseName = jamaah.namaLengkap || jamaah.name || "";
        if (options?.isEndorsement) {
          const ayah = options.namaAyah || jamaah.namaAyah || jamaah.ayahKandung || jamaah.fatherName || "";
          return formatJamaahNameWithEndorsement(baseName, ayah, true);
        }
        return toTitleCase(baseName);
      }
      case "nik":
        return (
          jamaah.nik ||
          jamaah.dokumen?.find?.((d: any) => d.jenis === "ktp")?.manualData?.nik ||
          jamaah.dokumen?.find?.((d: any) => d.jenis === "ktp")?.ocrData?.nik ||
          "-"
        );
      case "nomorPaspor":
        return (
          jamaah.nomorPaspor ||
          jamaah.passportNumber ||
          jamaah.dokumen?.find?.((d: any) => d.jenis === "paspor")?.ocrData?.nomorPaspor ||
          jamaah.dokumen?.find?.((d: any) => d.jenis === "paspor")?.manualData?.nomorPaspor ||
          "-"
        );
      case "tempatLahir": {
        const direct = jamaah.tempatLahir && jamaah.tempatLahir.trim() !== "-" ? jamaah.tempatLahir : "";
        const pob = jamaah.pob && jamaah.pob.trim() !== "-" ? jamaah.pob : "";
        const docKtp = jamaah.dokumen?.find?.((d: any) => d.jenis === "ktp" || d.jenis === "paspor");
        const docTempat = docKtp?.manualData?.tempatLahir || docKtp?.ocrData?.tempatLahir || "";
        const finalTempat = direct || pob || docTempat || "-";
        return finalTempat === "-" ? "-" : toTitleCase(finalTempat);
      }
      case "tanggalLahir": {
        const direct = jamaah.tanggalLahir && jamaah.tanggalLahir !== "-" ? jamaah.tanggalLahir : null;
        const dob = jamaah.dob && jamaah.dob !== "-" ? jamaah.dob : null;
        const docKtp = jamaah.dokumen?.find?.((d: any) => d.jenis === "ktp" || d.jenis === "paspor");
        const docTgl = docKtp?.manualData?.tanggalLahir || docKtp?.ocrData?.tanggalLahir;
        const effectiveDate = direct || dob || docTgl;
        return effectiveDate ? formatDate(effectiveDate) : "-";
      }
      case "jenisKelamin": {
        const rawJk =
          jamaah.jenisKelamin ||
          jamaah.gender ||
          jamaah.dokumen?.find?.((d: any) => d.jenis === "ktp")?.manualData?.jenisKelamin ||
          jamaah.dokumen?.find?.((d: any) => d.jenis === "ktp")?.ocrData?.jenisKelamin;
        return rawJk === "L" || rawJk === "LAKI-LAKI"
          ? "LAKI-LAKI"
          : rawJk === "P" || rawJk === "PEREMPUAN"
          ? "PEREMPUAN"
          : "-";
      }
      case "namaAyah":
        return toTitleCase(jamaah.namaAyah || jamaah.ayahKandung || jamaah.fatherName || "-");
      case "alamat": {
        const directAlamat =
          jamaah.alamat && jamaah.alamat.trim() !== "-" && jamaah.alamat.trim() !== ""
            ? jamaah.alamat
            : "";
        const alamatLengkap =
          jamaah.alamatLengkap && jamaah.alamatLengkap.trim() !== "-"
            ? jamaah.alamatLengkap
            : "";
        const address =
          jamaah.address && jamaah.address.trim() !== "-" ? jamaah.address : "";

        // Check KTP document manualData and ocrData
        const ktpDoc = jamaah.dokumen?.find?.((d: any) => d.jenis === "ktp");
        const ktpAlamatLengkap =
          ktpDoc?.manualData?.alamatLengkap || ktpDoc?.ocrData?.alamatLengkap;
        const ktpAlamat =
          ktpDoc?.manualData?.alamat || ktpDoc?.ocrData?.alamat;

        // Check any document with address
        const anyDocAlamat = jamaah.dokumen?.reduce?.((found: string, d: any) => {
          if (found) return found;
          return (
            d.manualData?.alamatLengkap ||
            d.manualData?.alamat ||
            d.ocrData?.alamatLengkap ||
            d.ocrData?.alamat ||
            ""
          );
        }, "");

        const rawResult =
          directAlamat ||
          alamatLengkap ||
          ktpAlamatLengkap ||
          ktpAlamat ||
          address ||
          anyDocAlamat ||
          (jamaah.kota && jamaah.kota !== "-" ? `${jamaah.kota}, ${jamaah.provinsi || ""}`.trim() : "-");

        return rawResult === "-" ? "-" : toTitleCase(rawResult);
      }
      case "nomorTelepon":
        return jamaah.nomorTelepon || jamaah.noHp || jamaah.phone || "-";
      case "pekerjaan": {
        const direct = jamaah.pekerjaan && jamaah.pekerjaan.trim() !== "-" ? jamaah.pekerjaan : "";
        const occ = jamaah.occupation && jamaah.occupation.trim() !== "-" ? jamaah.occupation : "";
        const ktpDoc = jamaah.dokumen?.find?.((d: any) => d.jenis === "ktp");
        const docPekerjaan = ktpDoc?.manualData?.pekerjaan || ktpDoc?.ocrData?.pekerjaan || "";
        const res = direct || occ || docPekerjaan || "Karyawan Swasta";
        return toTitleCase(res);
      }
      case "registrationId":
        return jamaah.registrationId || jamaah.nomorPeserta || jamaah.id || "-";
      default:
        return jamaah[subKey] ? String(jamaah[subKey]) : "";
    }
  }

  // Keberangkatan fields
  if (fieldKey.startsWith("keberangkatan.")) {
    if (!keberangkatan && !jamaah?.group?.keberangkatan && !jamaah?.keberangkatan) return "";
    const effectiveKeb = keberangkatan || jamaah?.group?.keberangkatan || jamaah?.keberangkatan;
    const subKey = fieldKey.replace("keberangkatan.", "");
    switch (subKey) {
      case "namaPaket":
        return effectiveKeb.namaPaket || effectiveKeb.paketUmroh?.namaPaket || effectiveKeb.name || "-";
      case "kode":
        return effectiveKeb.kode || effectiveKeb.kodePaket || "-";
      case "tanggalBerangkat":
        return effectiveKeb.tanggalBerangkat
          ? formatDate(effectiveKeb.tanggalBerangkat)
          : effectiveKeb.departureDate
          ? formatDate(effectiveKeb.departureDate)
          : "-";
      case "bulanKeberangkatan":
      case "bulan": {
        const tgl =
          effectiveKeb.tanggalBerangkat ||
          effectiveKeb.departureDate ||
          effectiveKeb.bulan ||
          effectiveKeb.bulanKeberangkatan;
        return tgl ? formatMonthYear(tgl) : "-";
      }
      case "tanggalPulang":
        return keberangkatan.tanggalPulang
          ? formatDate(keberangkatan.tanggalPulang)
          : keberangkatan.returnDate
          ? formatDate(keberangkatan.returnDate)
          : "-";
      case "programHari":
        return keberangkatan.programHari
          ? `${keberangkatan.programHari} Hari`
          : keberangkatan.durationDays
          ? `${keberangkatan.durationDays} Hari`
          : "9 Hari";
      case "maskapai":
        return keberangkatan.maskapai || keberangkatan.airline || "Saudia Airlines";
      case "hotelMekkah":
        return keberangkatan.hotelMekkah || keberangkatan.hotelMakkah || "Pullman Zamzam Makkah (Bintang 5)";
      case "hotelMadinah":
        return keberangkatan.hotelMadinah || "Rove Al Madinah (Bintang 4)";
      case "startingPoint":
        return keberangkatan.startingPoint || "Bandara Juanda Surabaya (SUB)";
      default:
        return keberangkatan[subKey] ? String(keberangkatan[subKey]) : "";
    }
  }

  // System & Today fields
  if (fieldKey === "today.masehi") return today.masehi;
  if (fieldKey === "today.hijriyah") return today.hijriyah;
  if (fieldKey === "today.bulanRomawi") return today.bulanRomawi;
  if (fieldKey === "today.tahun") return String(today.year);
  if (fieldKey === "vtu.pimpinan") return "H. Faisal Wahyudi";
  if (fieldKey === "vtu.jabatan") return "Direktur Utama";
  if (fieldKey === "vtu.noIzin") return "Izin Kemenag RI No. U.400 Tahun 2021 / No. 805 Tahun 2019";

  // Imigrasi fields
  if (fieldKey === "imigrasi.kanim") {
    return DAFTAR_KANTOR_IMIGRASI[0]?.nama || "Kantor Imigrasi Kelas I Khusus TPI Surabaya";
  }
  if (fieldKey === "imigrasi.kotaKanim") {
    return "Surabaya";
  }

  return "";
}

// ────────────────────────────────────────────────────────────
// SMART AUTO-DETECTION FOR UNMAPPED TAGS
// ────────────────────────────────────────────────────────────

function autoDetectManifestValue(
  key: string,
  jamaah: any | null,
  keberangkatan: any | null,
  today = getTodayDateInfo(),
  manualFormData: Record<string, any> = {},
  options?: ManifestResolveOptions
): string {
  const k = key.toLowerCase();
  const cleanK = k.replace(/[\u2018\u2019\u201A\u201B']/g, "'").replace(/[\s_\-\.]/g, "");

  // If user provided manual value
  if (manualFormData[key] !== undefined) {
    return String(manualFormData[key]);
  }

  // Common keywords matching
  if (
    cleanK.includes("namajamaah") ||
    cleanK.includes("namalengkap") ||
    cleanK.includes("namapeserta") ||
    cleanK === "nama" ||
    cleanK === "namakaryawan" ||
    cleanK === "namatertanggung" ||
    cleanK === "namapetugas"
  ) {
    return resolveManifestFieldValue("jamaah.namaLengkap", jamaah, keberangkatan, today, options);
  }
  if (cleanK.includes("ayah") || cleanK.includes("orangtua")) {
    return resolveManifestFieldValue("jamaah.namaAyah", jamaah, keberangkatan, today, options);
  }
  if (cleanK.includes("jenisnoid") || cleanK.includes("jenisid") || cleanK.includes("tipeid")) {
    return manualFormData[key] || "NIK";
  }
  if (
    cleanK === "nik" ||
    cleanK.includes("ktp") ||
    cleanK.includes("nikkaryawan") ||
    cleanK.includes("noidentitas") ||
    cleanK.includes("nomoridentitas") ||
    cleanK === "noid" ||
    cleanK === "nomorid"
  ) {
    return resolveManifestFieldValue("jamaah.nik", jamaah, keberangkatan, today, options);
  }
  if (cleanK.includes("paspor")) {
    return resolveManifestFieldValue("jamaah.nomorPaspor", jamaah, keberangkatan, today, options);
  }
  if (cleanK.includes("tempatlahir") || (cleanK.includes("tempat") && cleanK.includes("lahir"))) {
    return resolveManifestFieldValue("jamaah.tempatLahir", jamaah, keberangkatan, today, options);
  }
  if (cleanK.includes("tanggallahir") || cleanK.includes("tgllahir") || (cleanK.includes("tgl") && cleanK.includes("lahir"))) {
    return resolveManifestFieldValue("jamaah.tanggalLahir", jamaah, keberangkatan, today, options);
  }
  if (cleanK.includes("jeniskelamin") || cleanK.includes("gender")) {
    return resolveManifestFieldValue("jamaah.jenisKelamin", jamaah, keberangkatan, today, options);
  }
  if (cleanK.includes("alamat")) {
    return resolveManifestFieldValue("jamaah.alamat", jamaah, keberangkatan, today, options);
  }
  if (
    cleanK.includes("telepon") ||
    cleanK.includes("nohp") ||
    cleanK.includes("phone") ||
    cleanK.includes("whatsapp") ||
    cleanK === "wa" ||
    cleanK.startsWith("wa_") ||
    cleanK.endsWith("_wa") ||
    cleanK.includes("kontak")
  ) {
    return resolveManifestFieldValue("jamaah.nomorTelepon", jamaah, keberangkatan, today, options);
  }
  if (cleanK.includes("pekerjaan") || cleanK.includes("profesi") || cleanK.includes("occupation")) {
    return resolveManifestFieldValue("jamaah.pekerjaan", jamaah, keberangkatan, today, options);
  }
  if (cleanK.includes("namapaket") || cleanK === "paket") {
    return resolveManifestFieldValue("keberangkatan.namaPaket", jamaah, keberangkatan, today, options);
  }
  if (cleanK.includes("kodepaket") || cleanK.includes("kodekeberangkatan") || cleanK.includes("kodemanifest") || cleanK.includes("koderombongan")) {
    return resolveManifestFieldValue("keberangkatan.kode", jamaah, keberangkatan, today, options);
  }
  if (
    cleanK.includes("tanggalberangkat") ||
    cleanK.includes("tglberangkat") ||
    cleanK.includes("tanggalawal") ||
    cleanK.includes("tglawal") ||
    cleanK.includes("tanggalmulai") ||
    cleanK.includes("tglmulai")
  ) {
    return resolveManifestFieldValue("keberangkatan.tanggalBerangkat", jamaah, keberangkatan, today, options);
  }
  if (
    cleanK.includes("bulankeberangkatan") ||
    cleanK.includes("bulanberangkat") ||
    cleanK.includes("bulanawal") ||
    cleanK.includes("bulanmulai") ||
    cleanK === "bulanpaket" ||
    cleanK === "bulan" ||
    (cleanK.includes("bulan") && (cleanK.includes("berangkat") || cleanK.includes("paket")))
  ) {
    return resolveManifestFieldValue("keberangkatan.bulanKeberangkatan", jamaah, keberangkatan, today, options);
  }
  if (cleanK.includes("bulanakhir") || cleanK.includes("bulanselesai")) {
    const pulangDate = keberangkatan?.tanggalPulang || keberangkatan?.returnDate;
    return pulangDate ? formatMonthYear(pulangDate) : resolveManifestFieldValue("keberangkatan.bulanKeberangkatan", jamaah, keberangkatan, today, options);
  }
  if (
    cleanK.includes("tanggalpulang") ||
    cleanK.includes("tglpulang") ||
    cleanK.includes("tanggalkembali") ||
    cleanK.includes("tanggalakhir") ||
    cleanK.includes("tglakhir") ||
    cleanK.includes("tanggalselesai") ||
    cleanK.includes("tglselesai")
  ) {
    return resolveManifestFieldValue("keberangkatan.tanggalPulang", jamaah, keberangkatan, today, options);
  }
  if (cleanK.includes("maskapai")) {
    return resolveManifestFieldValue("keberangkatan.maskapai", jamaah, keberangkatan, today, options);
  }
  if (cleanK.includes("hotelmekkah") || cleanK.includes("hotelmakkah")) {
    return resolveManifestFieldValue("keberangkatan.hotelMekkah", jamaah, keberangkatan, today, options);
  }
  if (cleanK.includes("hotelmadinah")) {
    return resolveManifestFieldValue("keberangkatan.hotelMadinah", jamaah, keberangkatan, today, options);
  }
  if (cleanK.includes("programhari") || cleanK === "durasi" || cleanK.includes("lamacuti")) {
    return resolveManifestFieldValue("keberangkatan.programHari", jamaah, keberangkatan, today, options);
  }
  if (cleanK.includes("tanggalhariini") || cleanK.includes("today")) {
    return today.masehi;
  }
  if (cleanK.includes("kanim") || cleanK.includes("imigrasi")) {
    if (cleanK.includes("kota")) {
      let parentKanim = "";
      for (const [mk, mv] of Object.entries(manualFormData)) {
        const cleanMk = mk.toLowerCase().replace(/[\s_\-\.]/g, "");
        if ((cleanMk.includes("kanim") || cleanMk.includes("imigrasi") || cleanMk.includes("kantor")) && !cleanMk.includes("kota")) {
          if (typeof mv === "string" && mv.trim()) {
            parentKanim = mv;
            break;
          }
        }
      }
      const rawVal = manualFormData[key];
      const resolvedKota = (rawVal ? (getKotaFromKanimName(rawVal) || rawVal) : "") || (parentKanim ? getKotaFromKanimName(parentKanim) : "") || "Surabaya";
      return toTitleCase(resolvedKota);
    }
    return manualFormData[key] || DAFTAR_KANTOR_IMIGRASI[0]?.nama || "Kantor Imigrasi Kelas I Khusus TPI Surabaya";
  }

  return manualFormData[key] || "";
}

// ────────────────────────────────────────────────────────────
// MERGE TEMPLATE TEXT WITH RESOLVED VALUES
// ────────────────────────────────────────────────────────────

function escapeRegExp(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function renderAutocratMergedText(templateText: string, resolvedValues: Record<string, string>): string {
  if (!templateText) return "";

  let result = templateText;
  Object.keys(resolvedValues).forEach((key) => {
    const val = resolvedValues[key] !== undefined ? String(resolvedValues[key]) : "";
    const escapedKey = escapeRegExp(key).replace(/['\u2019\u2018]/g, "['\\u2019\\u2018]");
    // Replace {key}, {{key}}, <<key>>, «key», [[key]] (case-insensitive with optional surrounding spaces)
    const pattern = new RegExp(`(?:\\{+|<<|«|\\[\\[)\\s*${escapedKey}\\s*(?:\\}+|>>|»|\\]\\])`, "gi");
    result = result.replace(pattern, val);
  });

  return result;
}

// ────────────────────────────────────────────────────────────
// LOCAL STORAGE PERSISTENCE REPOSITORY FOR GENERATED LOGS
// ────────────────────────────────────────────────────────────

const STORAGE_KEY_TEMPLATES = "vtu_surat_templates_v2";
const STORAGE_KEY_GENERATED_LOGS = "vtu_surat_generated_logs_v2";

export function loadSavedSuratTemplates(): SuratTemplate[] {
  if (typeof window === "undefined") return DEFAULT_SURAT_TEMPLATES;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_TEMPLATES);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY_TEMPLATES, JSON.stringify(DEFAULT_SURAT_TEMPLATES));
      return DEFAULT_SURAT_TEMPLATES;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_SURAT_TEMPLATES;
  } catch {
    return DEFAULT_SURAT_TEMPLATES;
  }
}

export function saveSuratTemplates(templates: SuratTemplate[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY_TEMPLATES, JSON.stringify(templates));
  } catch (err) {
    console.error("Failed to persist templates to localStorage", err);
  }
}

export function loadGeneratedSuratLogs(): GeneratedSuratLog[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_GENERATED_LOGS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveGeneratedSuratLog(log: GeneratedSuratLog, existingLogs?: GeneratedSuratLog[]): GeneratedSuratLog[] {
  if (typeof window === "undefined") return [];
  try {
    const current = loadGeneratedSuratLogs();
    // Combine current with existing in-memory logs from React state
    const baseList = existingLogs && existingLogs.length > 0
      ? [...existingLogs, ...current.filter((c) => !existingLogs.some((e) => e.id === c.id))]
      : current;
    // Filter out if duplicate ID exists
    const updated = [log, ...baseList.filter((item) => item.id !== log.id)];
    localStorage.setItem(STORAGE_KEY_GENERATED_LOGS, JSON.stringify(updated.slice(0, 500))); // Keep last 500
    return updated;
  } catch (err) {
    console.error("Failed to persist generated surat log", err);
    return [];
  }
}

export function syncGeneratedLogsToStorage(logs: GeneratedSuratLog[]): void {
  if (typeof window === "undefined" || !Array.isArray(logs)) return;
  try {
    localStorage.setItem(STORAGE_KEY_GENERATED_LOGS, JSON.stringify(logs.slice(0, 500)));
  } catch (err) {
    console.error("Failed to sync generated surat logs to localStorage", err);
  }
}

export function deleteGeneratedSuratLog(id: string): GeneratedSuratLog[] {
  if (typeof window === "undefined") return [];
  try {
    const current = loadGeneratedSuratLogs();
    const updated = current.filter((item) => item.id !== id);
    localStorage.setItem(STORAGE_KEY_GENERATED_LOGS, JSON.stringify(updated));
    return updated;
  } catch (err) {
    console.error("Failed to delete generated surat log", err);
    return [];
  }
}
