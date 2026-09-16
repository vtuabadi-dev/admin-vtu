import type { Jamaah, Rooming, ManifestRow, ManifestType } from "@/shared/types";

const MANIFEST_TYPE_LABELS: Record<ManifestType, string> = {
  visa: "Manifest Visa",
  blockseat: "Manifest Blockseat",
  siskopatuh: "Manifest SISKOPATUH",
  hotel: "Manifest Hotel",
  rooming: "Manifest Rooming",
  pembayaran: "Manifest Pembayaran",
};

export function getManifestTypeLabel(type: ManifestType): string {
  return MANIFEST_TYPE_LABELS[type];
}

export function generateManifestRows(
  jamaahList: Jamaah[],
  type: ManifestType,
  roomings?: Rooming[]
): ManifestRow[] {
  const rows: ManifestRow[] = [];
  let sorted: Jamaah[];

  switch (type) {
    case "visa":
      sorted = [...jamaahList].sort((a, b) => a.namaLengkap.localeCompare(b.namaLengkap));
      break;
    case "blockseat":
      sorted = [...jamaahList].sort((a, b) => {
        const g = a.jenisKelamin.localeCompare(b.jenisKelamin);
        if (g !== 0) return g;
        return a.namaLengkap.localeCompare(b.namaLengkap);
      });
      break;
    case "siskopatuh":
      sorted = [...jamaahList].sort((a, b) => {
        const h = a.hotelMekkah.localeCompare(b.hotelMekkah);
        if (h !== 0) return h;
        return a.hotelMadinah.localeCompare(b.hotelMadinah);
      });
      break;
    case "hotel":
      sorted = [...jamaahList].sort((a, b) => {
        const h = a.hotelMekkah.localeCompare(b.hotelMekkah);
        if (h !== 0) return h;
        const hm = a.hotelMadinah.localeCompare(b.hotelMadinah);
        if (hm !== 0) return hm;
        return a.namaLengkap.localeCompare(b.namaLengkap);
      });
      break;
    case "rooming":
      // Build room lookup from roomings
      const kamarMap = new Map<string, { nomorKamar: string; nomorKursi?: string }>();
      if (roomings) {
        roomings.forEach((r) => {
          r.kamar.forEach((k) => {
            k.penghuni.forEach((p, idx) => {
              kamarMap.set(p.jamaahId, {
                nomorKamar: k.nomorKamar,
                nomorKursi: k.tipe === "double" && idx === 0 ? "A" : k.tipe === "double" ? "B" : undefined,
              });
            });
          });
        });
      }
      sorted = [...jamaahList].sort((a, b) => {
        const ka = kamarMap.get(a.id)?.nomorKamar ?? "ZZZ";
        const kb = kamarMap.get(b.id)?.nomorKamar ?? "ZZZ";
        return ka.localeCompare(kb);
      });
      sorted.forEach((j) => {
        const km = kamarMap.get(j.id);
        rows.push({
          id: `row-${j.id}`,
          nomorUrut: rows.length + 1,
          jamaahId: j.id,
          nomorPaspor: j.nomorPaspor,
          namaLengkap: j.namaLengkap,
          tempatLahir: j.tempatLahir,
          tanggalLahir: j.tanggalLahir,
          nomorKamar: km?.nomorKamar,
          nomorKursi: km?.nomorKursi,
        });
      });
      return rows;
    default:
      sorted = [...jamaahList];
  }

  sorted.forEach((j) => {
    rows.push({
      id: `row-${j.id}`,
      nomorUrut: rows.length + 1,
      jamaahId: j.id,
      nomorPaspor: j.nomorPaspor,
      namaLengkap: j.namaLengkap,
      tempatLahir: j.tempatLahir,
      tanggalLahir: j.tanggalLahir,
    });
  });

  return rows;
}

// ────────────────────────────────────────────────────────────
// GENDER TITLE LOGIC FOR BLOCK SEAT (AIRLINES / GDS / IATA)
// ────────────────────────────────────────────────────────────

export type BlockSeatTitle = "MR" | "MRS" | "MSTR" | "MISS";

/**
 * Calculates passenger age accurately relative to flight departure date.
 */
export function calculatePassengerAge(
  birthDate?: string | Date | null,
  referenceDate: string | Date = new Date()
): number {
  if (!birthDate) return 30; // Default adult if birth date is unknown
  const dob = typeof birthDate === "string" ? new Date(birthDate) : birthDate;
  if (isNaN(dob.getTime())) return 30;

  const ref = typeof referenceDate === "string" ? new Date(referenceDate) : referenceDate;
  let age = ref.getFullYear() - dob.getFullYear();
  const m = ref.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && ref.getDate() < dob.getDate())) {
    age--;
  }
  return Math.max(0, age);
}

/**
 * Resolves standard Airline Gender Title for Manifest Block Seat:
 * - Dewasa Laki-laki (>= 12 tahun): MR
 * - Dewasa Perempuan (>= 12 tahun): MRS (seluruh dewasa wanita)
 * - Anak & Bayi Laki-laki (< 12 tahun): MSTR
 * - Anak & Bayi Perempuan (< 12 tahun): MISS
 */
export function getBlockSeatGenderTitle(
  jamaah: {
    jenisKelamin?: string;
    gender?: string;
    tanggalLahir?: string | Date | null;
    dob?: string | Date | null;
  },
  departureDate?: string | Date
): BlockSeatTitle {
  const rawJk = (jamaah.jenisKelamin || jamaah.gender || "").toUpperCase().trim();
  const isMale = rawJk === "L" || rawJk === "LAKI-LAKI" || rawJk === "MALE" || rawJk === "PRIA";
  const birthDate = jamaah.tanggalLahir || jamaah.dob;
  const age = calculatePassengerAge(birthDate, departureDate);

  // 1. Anak-anak dan Bayi (< 12 tahun)
  if (age < 12) {
    return isMale ? "MSTR" : "MISS";
  }

  // 2. Dewasa (>= 12 tahun)
  return isMale ? "MR" : "MRS";
}

/**
 * Formats passenger name for GDS Airline systems:
 * Standard IATA Format: LASTNAME/FIRSTNAME MIDDLENAME TITLE
 * e.g. "Muchamad Zamroni" -> "ZAMRONI/MUCHAMAD MR"
 * e.g. "Nur Laila Safitri" -> "SAFITRI/NUR LAILA MRS"
 * e.g. "Supardi" (Single word name) -> "SUPARDI/SUPARDI MR"
 */
export function formatBlockSeatPassengerName(
  namaLengkap: string,
  genderTitle?: BlockSeatTitle
): {
  fullNameWithTitle: string;
  lastName: string;
  firstName: string;
  middleName: string;
  title: BlockSeatTitle;
  gdsFormat: string;
} {
  const cleaned = (namaLengkap || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z\s]/g, "")
    .replace(/\s+/g, " ");

  const words = cleaned ? cleaned.split(" ") : ["JAMAAH"];
  const title = genderTitle || "MR";

  let lastName = "";
  let firstName = "";
  let middleName = "";

  if (words.length === 1) {
    // Single name duplicate for airline GDS requirements
    lastName = words[0] || "JAMAAH";
    firstName = words[0] || "JAMAAH";
  } else if (words.length === 2) {
    firstName = words[0] || "";
    lastName = words[1] || "";
  } else {
    lastName = words[words.length - 1] || "";
    firstName = words[0] || "";
    middleName = words.slice(1, words.length - 1).join(" ");
  }

  const gdsNamePart = middleName ? `${firstName} ${middleName}` : firstName;
  const gdsFormat = `${lastName}/${gdsNamePart} ${title}`.trim();
  const fullNameWithTitle = `${cleaned} ${title}`.trim();

  return {
    fullNameWithTitle,
    lastName,
    firstName,
    middleName,
    title,
    gdsFormat,
  };
}

// ────────────────────────────────────────────────────────────
// GENDER & NOMENCLATURE LOGIC FOR MANIFEST SISKOPATUH (KEMENAG)
// ────────────────────────────────────────────────────────────

/**
 * Resolves standard SISKOPATUH Kemenag Gender String:
 * Returns strictly "LAKI-LAKI" or "PEREMPUAN"
 */
export function getSiskopatuhGender(jamaah: {
  jenisKelamin?: string;
  gender?: string;
}): "LAKI-LAKI" | "PEREMPUAN" {
  const raw = (jamaah.jenisKelamin || jamaah.gender || "").toUpperCase().trim();
  if (raw === "P" || raw === "PEREMPUAN" || raw === "FEMALE" || raw === "WANITA") {
    return "PEREMPUAN";
  }
  return "LAKI-LAKI";
}

/**
 * Filters father's name for SISKOPATUH:
 * Strips all religious and academic titles (H., Hj., Drs., Dr., K.H., KH., Prof., Ustadz, Ust., Ir.)
 * as mandated by Kemenag Siskopatuh database rules.
 */
export function getSiskopatuhCleanFatherName(rawFatherName?: string | null): string {
  if (!rawFatherName || rawFatherName.trim() === "-" || rawFatherName.trim() === "") {
    return "-";
  }

  const cleaned = rawFatherName
    .trim()
    .replace(/^(?:(?:H\.|Hj\.|Drs\.|Dr\.|K\.H\.|KH\.|Prof\.|Ustadz|Ust\.|Ir\.|Ir|Haji|Hajjah|Kyai)\s*)+/i, "")
    .trim();

  return cleaned || "-";
}

/**
 * Formats standard SISKOPATUH Mahram Relationship according to Kemenag guidelines:
 * - SUAMI / ISTRI
 * - ANAK LAKI-LAKI / ANAK PEREMPUAN
 * - AYAH / IBU
 * - SAUDARA KANDUNG
 * - SENDIRIAN (>= 45 TAHUN)
 * - NON-MAHRAM PEREMPUAN
 */
export function getSiskopatuhMahramRelation(
  rawRelation?: string | null,
  gender?: string,
  age?: number
): string {
  const rel = (rawRelation || "").toLowerCase().trim();
  const isFemale = (gender || "").toUpperCase().startsWith("P") || (gender || "").toUpperCase().startsWith("W");

  if (rel.includes("suami")) return "SUAMI";
  if (rel.includes("istri")) return "ISTRI";
  if (rel.includes("ayah") || rel.includes("bapak")) return "AYAH";
  if (rel.includes("ibu") || rel.includes("mama")) return "IBU";
  if (rel.includes("anak")) {
    return isFemale ? "ANAK PEREMPUAN" : "ANAK LAKI-LAKI";
  }
  if (rel.includes("saudara") || rel.includes("kakak") || rel.includes("adik")) {
    return "SAUDARA KANDUNG";
  }

  // Standar Kemenag untuk wanita tanpa mahram
  if (isFemale) {
    if (age !== undefined && age >= 45) {
      return "SENDIRIAN (>= 45 TAHUN)";
    }
    return "NON-MAHRAM PEREMPUAN";
  }

  return "SENDIRIAN (LAKI-LAKI DEWASA)";
}
