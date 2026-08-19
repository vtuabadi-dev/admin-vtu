const MONTH_ENG = [
  "JAN", "FEB", "MAR", "APR", "MAY", "JUN",
  "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"
];

const MONTH_IND_SHORT = [
  "JAN", "FEB", "MAR", "APR", "MEI", "JUN",
  "JUL", "AGT", "SEP", "OKT", "NOV", "DES"
];

const MONTH_IND_TITLE = [
  "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
  "Jul", "Agt", "Sep", "Okt", "Nov", "Des"
];

const MONTH_IND_FULL_NAMES = [
  "JANUARI", "FEBRUARI", "MARET", "APRIL", "MEI", "JUNI",
  "JULI", "AGUSTUS", "SEPTEMBER", "OKTOBER", "NOVEMBER", "DESEMBER"
];

export function buildPackageIdentifier(packageTypeCode: string, startingPointCode: string): string {
  const pCode = (packageTypeCode || "REG").toUpperCase();
  const sCode = (startingPointCode || "JKT").toUpperCase();

  if (pCode === "REG") {
    return sCode;
  }
  return `${pCode}_${sCode}`;
}

export interface GenerateIndividualCodeParams {
  tahun: number;
  durasiHari: number;
  packageTypeCode: string;
  startingPointCode: string;
  maskapaiCode: string;
  tanggalBerangkat: Date;
}

export function generateKodeIndividu(params: GenerateIndividualCodeParams): string {
  const identifier = buildPackageIdentifier(params.packageTypeCode, params.startingPointCode);
  const mCode = (params.maskapaiCode || "AIR").toUpperCase();
  const month = MONTH_ENG[params.tanggalBerangkat.getMonth()];
  const dateNum = String(params.tanggalBerangkat.getDate()).padStart(2, "0");

  return `#${params.tahun}_${params.durasiHari}H_${identifier}_${mCode}_${month}${dateNum}`;
}

export interface GenerateGroupCodeParams {
  tahun: number;
  durasiHari: number;
  packageTypeCode: string;
  startingPointCode: string;
  maskapaiCode: string;
  tanggalList: Date[];
}

export function generateKodeGrup(params: GenerateGroupCodeParams): string {
  const identifier = buildPackageIdentifier(params.packageTypeCode, params.startingPointCode);
  const mCode = (params.maskapaiCode || "AIR").toUpperCase();

  const sortedDates = [...params.tanggalList].sort((a, b) => a.getTime() - b.getTime());
  const dateStamps = sortedDates.map(
    (d) => `${MONTH_ENG[d.getMonth()]}${String(d.getDate()).padStart(2, "0")}`
  );

  return `#${params.tahun}_${params.durasiHari}H_${identifier}_${mCode}_GRP_${dateStamps.join("_")}`;
}

export interface GeneratePackageNameParams {
  packageTypeCode: string;
  packageTypeName?: string;
  durasiHari: number;
  startingPointCode: string;
  routeCode?: string;
  tanggalBerangkat: Date;
  maskapaiCode: string;
  maskapaiName?: string;
}

export function generateNamaPaket(params: GeneratePackageNameParams): string {
  const pCode = (params.packageTypeCode || "REG").toUpperCase();
  const pNameRaw = (params.packageTypeName || "").trim().toUpperCase();

  let prefix = "";
  if (pCode === "REG") {
    prefix = "PAKET UMROH";
  } else if (pNameRaw.startsWith("UMROH PLUS")) {
    prefix = pNameRaw;
  } else if (pNameRaw) {
    prefix = `UMROH PLUS ${pNameRaw.replace(/^PLUS\s+/i, "")}`;
  } else {
    prefix = `UMROH PLUS ${pCode}`;
  }

  const durasi = `${params.durasiHari} H`;
  const sCode = (params.startingPointCode || "JKT").toUpperCase();
  const rCode = (params.routeCode || "JED.C").toUpperCase();

  const day = String(params.tanggalBerangkat.getDate()).padStart(2, "0");
  const month = MONTH_IND_TITLE[params.tanggalBerangkat.getMonth()] || "Jun";
  const year = params.tanggalBerangkat.getFullYear();
  const tglFormatted = `${day} ${month} ${year}`;

  const maskapaiLabel = (params.maskapaiName || params.maskapaiCode || "SV").toUpperCase();

  return `${prefix} ${durasi} ${sCode} ( ${rCode} ) - ${tglFormatted} (${maskapaiLabel})`;
}

export interface GenerateFolderNameParams {
  startingPointCode: string;
  tanggalBerangkat: Date;
  durasiHari: number;
  packageTypeCode: string;
  maskapaiCode: string;
}

export function resolvePackageFolderTypeCode(packageTypeCode: string): string {
  if (!packageTypeCode) return "REG";
  const raw = packageTypeCode.toUpperCase().trim();

  if (raw === "REG" || raw === "REGULER" || raw === "PAKET REGULER") {
    return "REG";
  }

  if (raw.includes("TURKI") || raw.includes("TURKEY") || raw.includes("TURKISH") || raw === "TUR") {
    return "TUR";
  }
  if (raw.includes("DUBAI") || raw === "DUB") {
    return "DUB";
  }
  if (raw.includes("EUROP") || raw.includes("EROPA") || raw === "EUR") {
    return "EUR";
  }
  if (raw.includes("AQSA") || raw.includes("PALESTINE") || raw === "AQS") {
    return "AQS";
  }
  if (raw.includes("MESIR") || raw.includes("EGYPT") || raw.includes("CAIRO") || raw === "CAI") {
    return "CAI";
  }
  if (raw.includes("TAIF") || raw === "TAI") {
    return "TAI";
  }

  const cleaned = raw.replace(/^PLUS\s+/i, "").replace(/^PAKET\s+/i, "").trim();
  if (cleaned.length >= 3) {
    return cleaned.slice(0, 3).toUpperCase();
  }

  return raw.slice(0, 3).toUpperCase();
}

export function generatePackageFolderName(params: GenerateFolderNameParams): string {
  const sCode = (params.startingPointCode || "JKT").toUpperCase();
  const dateNum = String(params.tanggalBerangkat.getDate()).padStart(2, "0");
  const monthInd = MONTH_IND_SHORT[params.tanggalBerangkat.getMonth()];
  const pCode = resolvePackageFolderTypeCode(params.packageTypeCode);
  const mCode = (params.maskapaiCode || "SV").toUpperCase();

  return `${sCode} - ${dateNum} ${monthInd} ${params.durasiHari} H ${pCode} (${mCode})`;
}

export function getMonthFolderName(date: Date): string {
  const mNum = String(date.getMonth() + 1).padStart(2, "0");
  const mName = MONTH_IND_FULL_NAMES[date.getMonth()] || "JANUARI";
  const year = date.getFullYear();
  return `${mNum} - ${mName} ${year}`;
}
