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

const MONTH_IND_FULL = [
  "01-JANUARI", "02-FEBRUARI", "03-MARET", "04-APRIL",
  "05-MEI", "06-JUNI", "07-JULI", "08-AGUSTUS",
  "09-SEPTEMBER", "10-OKTOBER", "11-NOVEMBER", "12-DESEMBER"
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
  const uniqueMonths = Array.from(
    new Set(sortedDates.map((d) => MONTH_ENG[d.getMonth()]))
  );

  return `#${params.tahun}_${params.durasiHari}H_${identifier}_${mCode}_${uniqueMonths.join("_")}`;
}

export interface GeneratePackageNameParams {
  packageTypeCode: string;
  packageTypeName?: string;
  durasiHari: number;
  startingPointCode: string;
  routeCode?: string;
  tanggalBerangkat: Date;
  maskapaiCode: string;
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

  const mCode = (params.maskapaiCode || "SV").toUpperCase();

  return `${prefix} ${durasi} ${sCode} ( ${rCode} ) - ${tglFormatted} (${mCode})`;
}

export interface GenerateFolderNameParams {
  startingPointCode: string;
  tanggalBerangkat: Date;
  durasiHari: number;
  packageTypeCode: string;
  maskapaiCode: string;
}

export function generatePackageFolderName(params: GenerateFolderNameParams): string {
  const sCode = (params.startingPointCode || "JKT").toUpperCase();
  const dateNum = String(params.tanggalBerangkat.getDate()).padStart(2, "0");
  const monthInd = MONTH_IND_SHORT[params.tanggalBerangkat.getMonth()];
  const pCode = (params.packageTypeCode || "REG").toUpperCase();
  const mCode = (params.maskapaiCode || "SV").toUpperCase();

  return `${sCode} - ${dateNum} ${monthInd} ${params.durasiHari} H ${pCode} (${mCode})`;
}

export function getMonthFolderName(date: Date): string {
  return MONTH_IND_FULL[date.getMonth()] || "01-JANUARI";
}
