import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(date?: string | Date | null): string {
  if (!date) return "-";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(d);
}

export function formatDateShort(date?: string | Date | null): string {
  if (!date) return "-";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(d);
}

export function formatNumberWithDots(val: string | number): string {
  if (val === undefined || val === null || val === "") return "";
  const clean = String(val).replace(/\D/g, "");
  if (!clean) return "";
  return clean.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

export function formatDateDdMmmmTttt(dateStr: string): string {
  if (!dateStr || !dateStr.includes("-")) return "";
  const parts = dateStr.split("-");
  if (parts.length < 3) return "";
  const year = parts[0] ?? "";
  const rawMonth = parts[1] ?? "";
  const rawDay = parts[2] ?? "";
  const monthIdx = parseInt(rawMonth, 10) - 1;
  const day = rawDay.padStart(2, "0");
  const MONTHS_ID = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"
  ];
  if (isNaN(monthIdx) || monthIdx < 0 || monthIdx > 11) return dateStr;
  return `${day}/${MONTHS_ID[monthIdx]}/${year}`;
}

export function formatInvoicePersonName(namaGroup?: string, namaKetua?: string): string {
  if (namaKetua && namaKetua.trim()) {
    return namaKetua.trim();
  }
  if (!namaGroup) return "Bapak/Ibu Jamaah";
  
  // Strip "GRUP ", "Grup ", "GROUP ", "Group ", "KELUARGA ", "Keluarga " prefixes
  const cleaned = namaGroup
    .replace(/^(grup|group|keluarga)\s+/i, "")
    .trim();
    
  return cleaned || namaGroup;
}

export function getManifestAlamat(jamaahOrGroup: any): string {
  if (!jamaahOrGroup) return "DSN KAUMAN, 010/006, KALIPARE, KEC. KALIPARE, KAB. MALANG";

  // If group object with ketuaGroup or anggota
  if (jamaahOrGroup.ketuaGroup) {
    const fromKetua = getManifestAlamat(jamaahOrGroup.ketuaGroup);
    if (fromKetua && fromKetua !== "-" && fromKetua !== "DSN KAUMAN, 010/006, KALIPARE, KEC. KALIPARE, KAB. MALANG") {
      return fromKetua;
    }
  }

  if (Array.isArray(jamaahOrGroup.anggota) && jamaahOrGroup.anggota.length > 0) {
    for (const m of jamaahOrGroup.anggota) {
      const fromMember = getManifestAlamat(m);
      if (fromMember && fromMember !== "-" && fromMember !== "DSN KAUMAN, 010/006, KALIPARE, KEC. KALIPARE, KAB. MALANG") {
        return fromMember;
      }
    }
  }

  const j = jamaahOrGroup;

  // 1. Check KTP document OCR or Manual Data
  let ktpDoc: any = null;
  if (j.dokumen && Array.isArray(j.dokumen)) {
    ktpDoc = j.dokumen.find((d: any) => d.jenis === "ktp");
  }

  const manual = ktpDoc?.manualData;
  const ocr = ktpDoc?.ocrData;

  const docAlamat =
    manual?.alamatLengkap ||
    ocr?.alamatLengkap ||
    manual?.alamat ||
    ocr?.alamat;

  if (docAlamat && docAlamat !== "-" && String(docAlamat).trim()) {
    return String(docAlamat).trim();
  }

  // 2. Check direct fields on Jamaah (alamat, kelurahan, kecamatan, kota, provinsi)
  if (j.alamat && j.alamat !== "-" && String(j.alamat).trim()) {
    const cleanAlamat = String(j.alamat).trim();
    if (/RT|RW|Kel|Kec|Kab|Kota/i.test(cleanAlamat)) return cleanAlamat;
    const parts: string[] = [cleanAlamat];
    if (j.kelurahan && j.kelurahan !== "-") parts.push(`Kel. ${j.kelurahan.replace(/^Kel(?:urahan|\.)?\s*/i, "")}`);
    if (j.kecamatan && j.kecamatan !== "-") parts.push(`Kec. ${j.kecamatan.replace(/^Kec(?:amatan|\.)?\s*/i, "")}`);
    if (j.kota && j.kota !== "-") parts.push(j.kota);
    if (j.provinsi && j.provinsi !== "-") parts.push(j.provinsi);
    return parts.join(", ");
  }

  if (j.kota && j.kota !== "-") {
    const parts = [j.kota];
    if (j.provinsi && j.provinsi !== "-") parts.push(j.provinsi);
    return parts.join(", ");
  }

  return "DSN KAUMAN, 010/006, KALIPARE, KEC. KALIPARE, KAB. MALANG";
}

export function normalizeToIsoDate(dateStr: string): string {
  if (!dateStr) return "";
  const clean = dateStr.trim();
  
  // Pattern 1: ISO YYYY-MM-DD or YYYY/MM/DD
  if (/^\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}$/.test(clean)) {
    const parts = clean.split(/[\/\-]/);
    const y = parts[0] ?? "";
    const m = (parts[1] ?? "").padStart(2, "0");
    const d = (parts[2] ?? "").padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  // Pattern 2: DD/MM/YYYY or DD-MM-YYYY
  if (/^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}$/.test(clean)) {
    const parts = clean.split(/[\/\-]/);
    const d = (parts[0] ?? "").padStart(2, "0");
    const m = (parts[1] ?? "").padStart(2, "0");
    const y = parts[2] ?? "";
    return `${y}-${m}-${d}`;
  }

  // Pattern 3: DD (Kata Bulan) YYYY or DD/Kata Bulan/YYYY (e.g. 12 JULI 2026 or 12/Juli/2026)
  const MONTH_MAP: Record<string, string> = {
    JANUARI: "01", FEBRUARI: "02", MARET: "03", APRIL: "04", MEI: "05", JUNI: "06",
    JULI: "07", AGUSTUS: "08", SEPTEMBER: "09", OKTOBER: "10", NOVEMBER: "11", DESEMBER: "12",
    JAN: "01", FEB: "02", MAR: "03", APR: "04", JUN: "06", JUL: "07", AGS: "08", AGT: "08", SEP: "09", SEPT: "09", OKT: "10", NOV: "11", DES: "12"
  };
  const match = clean.match(/^(\d{1,2})[\/\-\s]+([A-Za-z]+)[\/\-\s]+(\d{4})$/);
  if (match) {
    const d = (match[1] ?? "").padStart(2, "0");
    const mStr = (match[2] ?? "").toUpperCase();
    const y = match[3] ?? "";
    const m = MONTH_MAP[mStr];
    if (d && m && y) {
      return `${y}-${m}-${d}`;
    }
  }

  return clean;
}

/**
 * Generates a WhatsApp dispatch URL tailored for desktop vs mobile environments.
 * On Desktop: Uses direct `https://web.whatsapp.com/send?phone=...&text=...` to bypass intermediate landing pages and directly open/switch chat with pre-filled text.
 * On Mobile: Uses `https://api.whatsapp.com/send?phone=...&text=...` to trigger native app deep-link protocols.
 */
export function getWhatsAppUrl(phone?: string | null, text?: string): string {
  const isMobile =
    typeof navigator !== "undefined" &&
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  let cleanPhone = (phone || "").replace(/[^0-9]/g, "");
  if (cleanPhone.startsWith("0")) {
    cleanPhone = "62" + cleanPhone.slice(1);
  } else if (cleanPhone && !cleanPhone.startsWith("62")) {
    cleanPhone = "62" + cleanPhone;
  }

  const encodedText = text ? encodeURIComponent(text) : "";
  const baseUrl = isMobile ? "https://api.whatsapp.com/send" : "https://web.whatsapp.com/send";

  const params: string[] = [];
  if (cleanPhone) params.push(`phone=${cleanPhone}`);
  if (encodedText) params.push(`text=${encodedText}`);

  return params.length > 0 ? `${baseUrl}?${params.join("&")}` : baseUrl;
}

/**
 * Converts a string into Indonesian Title Case mode.
 * Formats names, addresses, cities, and places properly while preserving
 * uppercase acronyms (RT, RW, DKI, TPI, RI, etc.) and Roman numerals (I, II, III).
 */
export function toTitleCase(str?: string | null): string {
  if (!str) return "";
  const trimmed = str.trim();
  if (!trimmed || trimmed === "-") return trimmed;

  const uppercaseAcronyms = new Set([
    "rt", "rw", "dki", "di", "tpi", "ri", "nik", "kua", "polres", "polda", "pt", "cv", "sub", "cgk", "bpjs",
    "i", "ii", "iii", "iv", "v", "vi", "vii", "viii", "ix", "x"
  ]);

  return trimmed
    .toLowerCase()
    .split(/\s+/)
    .map((word) => {
      // Handle slashes such as RT/RW or 005/002
      if (word.includes("/")) {
        return word
          .split("/")
          .map((sub) => {
            const cleanSub = sub.replace(/[^a-zA-Z0-9]/g, "");
            if (uppercaseAcronyms.has(cleanSub)) return sub.toUpperCase();
            return sub.replace(/(?:^|[\-\(\).])([a-z])/g, (m) => m.toUpperCase());
          })
          .join("/");
      }

      const cleanWord = word.replace(/[^a-zA-Z0-9]/g, "");
      if (uppercaseAcronyms.has(cleanWord)) {
        return word.toUpperCase();
      }

      return word.replace(/(?:^|[\-\/\(\).])([a-z])/g, (m) => m.toUpperCase());
    })
    .join(" ");
}
