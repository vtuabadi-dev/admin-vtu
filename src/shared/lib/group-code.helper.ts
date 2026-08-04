// ============================================================
// VTU GROUP CODE FORMATTER HELPER
// Format: #[JENIS]_[DURASI]_[STARTING]_[TAHUN]_[TANGGAL_LIST]_[MASKAPAI]_[RUTE]_[KLASTER]
// Example: #TURK_15H_SBY_2026_18_29JUL_05_27AGU_05_17_30SEP_04_16_24OKT_05_18_30NOV_SV_TD_C
// ============================================================

const MONTH_SHORT_MAP: Record<string, string> = {
  "01": "JAN", "02": "FEB", "03": "MAR", "04": "APR",
  "05": "MEI", "06": "JUN", "07": "JUL", "08": "AGU",
  "09": "SEP", "10": "OKT", "11": "NOV", "12": "DES",
};

export interface FormatGroupCodeInput {
  packageTypeName?: string; // e.g. "Turkiye", "Umroh Reguler", "Wisata Halal"
  durationDays?: number | string; // e.g. 15
  startingCityCode?: string; // e.g. "SBY", "JKT", "SOC"
  dates?: string[]; // ISO format YYYY-MM-DD or DD/MM/YYYY
  airlineCode?: string; // e.g. "SV", "GA", "JT", "EK"
  routeCode?: string; // e.g. "TD", "UD", "JED.C-M"
  hasClusters?: boolean; // C for cluster, NC for non-cluster
}

/**
  * Format an array of YYYY-MM-DD dates into grouped date string
  * Example: ["2026-07-18", "2026-07-29", "2026-08-05"] => "2026_18_29JUL_05AGU"
  */
export function formatDatesForGroupCode(dates: string[]): { year: string; dateSegment: string } {
  if (!dates || dates.length === 0) {
    const currentYear = new Date().getFullYear().toString();
    return { year: currentYear, dateSegment: "TBD" };
  }

  // Parse YYYY-MM-DD
  const parsed = dates.map(d => {
    const parts = d.split("-");
    if (parts.length === 3) {
      return { year: parts[0]!, month: parts[1]!, day: parts[2]! };
    }
    return { year: "2026", month: "01", day: "01" };
  }).sort((a, b) => (a.year + a.month + a.day).localeCompare(b.year + b.month + b.day));

  const year = parsed[0]?.year || "2026";

  // Group by month
  const byMonth: Record<string, string[]> = {};
  for (const item of parsed) {
    if (!byMonth[item.month]) {
      byMonth[item.month] = [];
    }
    const cleanDay = parseInt(item.day, 10).toString().padStart(2, "0");
    if (!byMonth[item.month]!.includes(cleanDay)) {
      byMonth[item.month]!.push(cleanDay);
    }
  }

  const segments: string[] = [];
  for (const monthStr of Object.keys(byMonth).sort()) {
    const days = byMonth[monthStr]!;
    const monthName = MONTH_SHORT_MAP[monthStr] || monthStr;
    segments.push(`${days.join("_")}${monthName}`);
  }

  return {
    year,
    dateSegment: segments.join("_"),
  };
}

/**
  * Build VTU standardized group code
  */
export function generateVtuGroupCode(input: FormatGroupCodeInput): string {
  // 1. Prefix / Jenis
  const typePrefix = (input.packageTypeName || "UMR")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 4) || "UMR";

  // 2. Durasi
  const duration = `${input.durationDays || 9}H`;

  // 3. Starting City Code
  const starting = (input.startingCityCode || "JKT")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 3);

  // 4. Dates & Year
  const { year, dateSegment } = formatDatesForGroupCode(input.dates || []);

  // 5. Maskapai
  const airline = (input.airlineCode || "AIR")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 3);

  // 6. Rute
  const route = (input.routeCode || "REG")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 3);

  // 7. Klaster Flag
  const clusterFlag = input.hasClusters ? "C" : "NC";

  return `#${typePrefix}_${duration}_${starting}_${year}_${dateSegment}_${airline}_${route}_${clusterFlag}`;
}
