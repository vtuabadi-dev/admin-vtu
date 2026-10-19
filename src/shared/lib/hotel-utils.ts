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

export interface VariantGroupItem {
  key: string;
  variantName: string;
  isV2: boolean;
  indices: number[];
  items: any[];
  isPublished: boolean;
  hotelMekkah: string;
  hotelMadinah: string;
  minPrice: number;
  clusterSummary: string;
  flyerUrl?: string;
  flyerDriveId?: string;
  caption?: string;
}

/**
 * Groups raw hotelOptions into distinct variant items (Varian Utama vs Varian 2 / Split Variants),
 * preventing clusters (e.g. Silver, Gold, Platinum) within a variant from being split into separate
 * publication switches or individual catalog cards.
 */
export function groupHotelOptionsIntoVariants(
  opts: any[] | string | undefined | null,
  isPkgPublished: boolean = false
): VariantGroupItem[] {
  let parsed = opts;
  if (typeof parsed === "string") {
    try {
      parsed = JSON.parse(parsed);
    } catch {
      parsed = [];
    }
  }
  if (!Array.isArray(parsed) || parsed.length === 0) return [];

  const validWithIndex = parsed
    .map((opt, idx) => ({ opt, idx }))
    .filter(
      ({ opt }) =>
        opt &&
        (opt.hotelMekkah || opt.hotelMadinah || opt.hargaBase || opt.clusterName || opt.variantName)
    );

  if (validWithIndex.length === 0) return [];

  const groups: VariantGroupItem[] = [];
  const v1Items: { opt: any; idx: number }[] = [];
  const v2Map = new Map<string, { opt: any; idx: number }[]>();

  for (const item of validWithIndex) {
    const isV2 =
      item.idx > 0 &&
      Boolean(
        item.opt.isVarian2 ||
          item.opt.variantName ||
          item.opt.clusterName === "Varian 2" ||
          item.opt.clusterName?.toUpperCase().includes("VARIAN 2")
      );

    if (!isV2) {
      v1Items.push(item);
    } else {
      const vName = item.opt.variantName || "Varian 2";
      if (!v2Map.has(vName)) {
        v2Map.set(vName, []);
      }
      v2Map.get(vName)!.push(item);
    }
  }

  // 1. Group Varian Utama
  if (v1Items.length > 0) {
    const indices = v1Items.map((x) => x.idx);
    const items = v1Items.map((x) => x.opt);
    const isPub = items.some((it, i) =>
      indices[i] === 0
        ? it.isPublishedKatalog !== undefined
          ? it.isPublishedKatalog === true
          : isPkgPublished
        : it.isPublishedKatalog === true
    );
    const mekkahList = Array.from(new Set(items.map((it) => it.hotelMekkah).filter(Boolean)));
    const madinahList = Array.from(new Set(items.map((it) => it.hotelMadinah).filter(Boolean)));
    const prices = items.map((it) => Number(it.hargaBase || 0)).filter((p) => p > 0);
    const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
    const clusterNames = items.map((it) => it.clusterName).filter((c) => c && c !== "Reguler");

    groups.push({
      key: "v1",
      variantName: "Varian Utama (V1)",
      isV2: false,
      indices,
      items,
      isPublished: isPub,
      hotelMekkah: mekkahList.join(" / ") || "Mekkah",
      hotelMadinah: madinahList.join(" / ") || "Madinah",
      minPrice,
      clusterSummary: clusterNames.length > 1 ? clusterNames.join(", ") : "",
      flyerUrl: items[0]?.flyerUrl,
      flyerDriveId: items[0]?.flyerDriveId,
      caption: items[0]?.caption,
    });
  }

  // 2. Group Varian 2 / Split Variants
  Array.from(v2Map.entries()).forEach(([vName, vItems]: [string, { opt: any; idx: number }[]]) => {
    const indices = vItems.map((x: { opt: any; idx: number }) => x.idx);
    const items = vItems.map((x: { opt: any; idx: number }) => x.opt);
    const isPub = items.some((it: any) => it.isPublishedKatalog === true);
    const mekkahList = Array.from(new Set(items.map((it: any) => it.hotelMekkah).filter(Boolean)));
    const madinahList = Array.from(new Set(items.map((it: any) => it.hotelMadinah).filter(Boolean)));
    const prices = items.map((it: any) => Number(it.hargaBase || 0)).filter((p: number) => p > 0);
    const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
    const clusterNames = items.map((it: any) => it.clusterName).filter(Boolean);

    groups.push({
      key: `v2_${vName.replace(/\s+/g, "_")}`,
      variantName: vName,
      isV2: true,
      indices,
      items,
      isPublished: isPub,
      hotelMekkah: mekkahList.join(" / ") || "Mekkah",
      hotelMadinah: madinahList.join(" / ") || "Madinah",
      minPrice,
      clusterSummary: clusterNames.length > 0 ? clusterNames.join(", ") : "",
      flyerUrl: items.find((it: any) => it.flyerUrl)?.flyerUrl || items[0]?.flyerUrl,
      flyerDriveId: items.find((it: any) => it.flyerDriveId)?.flyerDriveId || items[0]?.flyerDriveId,
      caption: items.find((it: any) => it.caption)?.caption || items[0]?.caption,
    });
  });

  return groups;
}

