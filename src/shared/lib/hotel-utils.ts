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
