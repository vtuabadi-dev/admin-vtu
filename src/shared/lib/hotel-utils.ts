import type { Jamaah, HotelCombinationSummary } from "@/shared/types";

export function generateHotelLabel(hotelMekkah: string, hotelMadinah: string): string {
  return `${hotelMekkah}-${hotelMadinah}`;
}

export function makeHotelKey(hotelMekkah: string, hotelMadinah: string): string {
  return `${hotelMekkah}|${hotelMadinah}`;
}

export function parseHotelKey(key: string): { hotelMekkah: string; hotelMadinah: string } {
  const [mekkah, madinah] = key.split("|") as [string, string];
  return { hotelMekkah: mekkah!, hotelMadinah: madinah! };
}

export function groupJamaahByHotel(
  jamaahList: Jamaah[]
): Map<string, Jamaah[]> {
  const map = new Map<string, Jamaah[]>();
  for (const j of jamaahList) {
    const key = makeHotelKey(j.hotelMekkah, j.hotelMadinah);
    const existing = map.get(key);
    if (existing) {
      existing.push(j);
    } else {
      map.set(key, [j]);
    }
  }
  return map;
}

export function getHotelCombinations(
  jamaahList: Jamaah[]
): HotelCombinationSummary[] {
  const grouped = groupJamaahByHotel(jamaahList);
  const result: HotelCombinationSummary[] = [];
  grouped.forEach((jamaah, key) => {
    const { hotelMekkah, hotelMadinah } = parseHotelKey(key);
    result.push({
      hotelMekkah,
      hotelMadinah,
      label: generateHotelLabel(hotelMekkah, hotelMadinah),
      jumlahJamaah: jamaah.length,
      jamaahIds: jamaah.map((j) => j.id),
    });
  });
  return result;
}

/**
 * Resolves the specific hotel for a given package cluster (e.g. SILVER, BRONZE, GOLD)
 * when a package contains multiple slash-separated hotels (e.g. "GRAND AL MASSA / RAYYANA GRAND PLAZA / SAFWAH TOWER").
 */
export function resolveHotelForKlaster(
  rawHotel: string | undefined | null,
  klasterName: string | undefined | null
): string {
  if (!rawHotel) return "-";
  const rawClean = rawHotel.trim();
  if (!rawClean.includes("/")) return rawClean;

  const parts = rawClean.split("/").map((s) => s.trim()).filter(Boolean);
  if (parts.length <= 1) return rawClean;

  const kUpper = (klasterName || "").toUpperCase();

  // Explicit keyword matching for clusters/variants
  if (kUpper.includes("BRONZE") || kUpper.includes("PROMO") || kUpper.includes("HERO")) {
    return parts[0] || rawClean;
  }
  if (
    kUpper.includes("SILVER") ||
    kUpper.includes("REGULAR") ||
    kUpper.includes("STANDARD") ||
    kUpper.includes("EKONOMI")
  ) {
    return parts[1] || parts[0] || rawClean;
  }
  if (
    kUpper.includes("GOLD") ||
    kUpper.includes("VIP") ||
    kUpper.includes("EXECUTIVE") ||
    kUpper.includes("PLATINUM")
  ) {
    return parts[parts.length - 1] || rawClean;
  }

  // Fallback if klaster is SILVER or unspecified
  return parts[1] || parts[0] || rawClean;
}
