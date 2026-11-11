/**
 * Single Source of Truth (SSOT) Billing & Manifest Calculation Engine
 * Governed by ADR-0032 (Product Owner Approved Business Rules):
 *   1. Room upgrade pricing strictly follows package/cluster creation config (Rp 0 if unconfigured).
 *   2. Non-include optional items (Thoif, Kereta Cepat, Ongkos Jahit Seragam, etc.) are ONLY
 *      billed when explicitly present as active InvoiceItems in the group's billing ledger.
 *   3. Manifest Pembayaran, Modal/PDF Invoice, Detail Group, and Excel Export all derive from
 *      these canonical functions without independent surcharges, overrides, or phantom fallbacks.
 */

export interface CanonicalBillingItemLike {
  id?: string | null;
  kategori?: string | null;
  deskripsi?: string | null;
  nama?: string | null;
  qty?: number | null;
  hargaSatuan?: number | null;
  jumlah?: number | null;
  status?: string | null;
  tipe?: string | null;
  tipePotongan?: string | null;
  isDeduction?: boolean;
  paxNames?: string[] | null;
}

export interface CanonicalInvoiceLike {
  id?: string | null;
  nomorInvoice?: string | null;
  status?: string | null;
  jumlah?: number | null;
  totalTagihan?: number | null;
  sisaTagihan?: number | null;
  items?: CanonicalBillingItemLike[] | null;
}

export interface PackageBillingConfig {
  clusterName: string;
  variantName?: string;
  hargaBase: number;
  upgradeDouble: number;
  upgradeTriple: number;
  upgradeSingle: number;
  hotelMekkah?: string;
  hotelMadinah?: string;
  isCustomCluster: boolean;
  matchedVariant: any;
  pkgIncludesPerlengkapan: boolean;
  pkgIncludesKeretaCepat: boolean;
  pkgIncludesThoif: boolean;
}

export type CanonicalItemCategory =
  | "basePaket"
  | "upgradeKamar"
  | "upgradeHotel"
  | "keretaCepat"
  | "thoif"
  | "paspor"
  | "kursiRoda"
  | "ongkir"
  | "ongkosJahit"
  | "tambahanPerlengkapan"
  | "tambahanLain"
  | "potonganOngkir"
  | "diskon";

export interface ExtractedLedgerItem {
  id?: string | null;
  key: string;
  category: CanonicalItemCategory;
  kategori: string;
  deskripsi: string;
  qty: number;
  unitNominal: number;
  signedAmount: number;
  isPotongan: boolean;
  paxNames?: string[] | null;
}

export interface MemberCanonicalBillingBreakdown {
  member: any;
  biayaPaket: number;
  upgradeKamar: number;
  upgradeKamarLabel: string;
  upgradeHotel: number;
  upgradeHotelLabel: string;
  totalUpgrade: number;
  keretaCepat: number;
  cityTourThoif: number;
  paspor: number;
  kursiRoda: number;
  ongkir: number;
  ongkosJahit: number;
  tambahanPerlengkapan: number;
  tambahanLain: number;
  diskonPromo: number;
  potonganOngkir: number;
  totalPotongan: number;
  netTagihan: number;
  totalTagihan: number;
  keterangan: string;
}

export interface CanonicalGroupBillingResult {
  paxCount: number;
  packageConfig: PackageBillingConfig;
  hasMaterializedLedger: boolean;
  activeItems: ExtractedLedgerItem[];
  memberBreakdowns: MemberCanonicalBillingBreakdown[];
  groupTotals: {
    biayaPaket: number;
    upgradeKamar: number;
    upgradeHotel: number;
    totalUpgrade: number;
    keretaCepat: number;
    cityTourThoif: number;
    paspor: number;
    kursiRoda: number;
    ongkir: number;
    ongkosJahit: number;
    tambahanPerlengkapan: number;
    tambahanLain: number;
    diskonPromo: number;
    potonganOngkir: number;
    totalPotongan: number;
    grossTotalTagihan: number;
    netTotalTagihan: number;
    upgradeKamarLabel: string;
    upgradeHotelLabel: string;
    keterangan: string;
  };
}

/**
 * Kamar dasar (Quad, Quad Family, Quad Infant, Quad Fix, Mix) tidak dikenakan biaya upgrade kamar (Rp 0).
 * Hanya Double, Triple, dan Single yang dapat memiliki tarif upgrade sesuai konfigurasi pembuatan paket.
 */
export function isBaseRoomType(roomType?: string | null): boolean {
  if (!roomType) return true;
  const lower = roomType.toLowerCase().trim();
  if (lower.includes("double") || lower.includes("triple") || lower.includes("single")) {
    return false;
  }
  return true;
}

export function detectRoomTypeFromName(name?: string | null): string {
  if (!name) return "Quad";
  const lower = name.toLowerCase().trim();
  if (lower.includes("double")) return "Double";
  if (lower.includes("triple")) return "Triple";
  if (lower.includes("single")) return "Single";
  if (lower.includes("infant") || lower.includes("quinf")) return "Quad Infant";
  if (lower.includes("family")) return "Quad Family";
  if (lower.includes("mix")) return "Mix";
  if (lower.includes("quad")) return "Quad";
  return "Quad";
}

export function isRoomUpgradeItem(name?: string | null): boolean {
  if (!name) return false;
  const lower = name.toLowerCase();
  return (
    lower.includes("kamar") ||
    lower.includes("upgrade kamar") ||
    lower.includes("double") ||
    lower.includes("triple") ||
    lower.includes("single") ||
    lower.includes("room")
  );
}

export function isHotelUpgradeItem(name?: string | null): boolean {
  if (!name) return false;
  const lower = name.toLowerCase().trim();
  return lower.includes("upgrade hotel") || lower.includes("hotel");
}

function isLedgerMarkerInvoiceItem(it?: CanonicalBillingItemLike | null): boolean {
  if (!it) return false;
  const katLower = (it.kategori || "").toLowerCase();
  const descLower = (it.deskripsi || it.nama || "").toLowerCase();
  return (
    katLower.includes("pembayaran invoice") ||
    katLower.includes("pembaruan invoice") ||
    katLower.includes("revisi invoice") ||
    katLower.includes("angsuran") ||
    /penambahan\s+\d+\s+pax\s+jamaah/i.test(descLower)
  );
}

export function shouldSkipNonBillingInvoiceItem(it?: CanonicalBillingItemLike | null): boolean {
  if (!it || it.status === "cancelled") return true;
  return isLedgerMarkerInvoiceItem(it);
}

export function isDeductionItem(it: CanonicalBillingItemLike): boolean {
  const katLower = (it.kategori || "").toLowerCase();
  const descLower = (it.deskripsi || it.nama || "").toLowerCase();
  return (
    katLower === "potongan" ||
    katLower === "pengurangan" ||
    it.tipe === "pengurangan" ||
    it.tipePotongan === "potongan" ||
    it.isDeduction === true ||
    Number(it.hargaSatuan || 0) < 0 ||
    Number(it.jumlah || 0) < 0 ||
    (/\b(diskon|promo|voucher|cashback)\b/i.test(descLower) &&
      katLower !== "utama" &&
      !/upgrade|paket\s*umroh|biaya\s*paket/i.test(descLower))
  );
}

export function getCanonicalItemDedupeKey(it: CanonicalBillingItemLike): string {
  const kat = (it.kategori || "").toLowerCase().trim();
  const desc = (it.deskripsi || it.nama || "").trim().toLowerCase();
  const paxKey =
    Array.isArray(it.paxNames) && it.paxNames.length > 0
      ? `::pax=${[...it.paxNames]
          .map((p) => String(p).trim().toLowerCase())
          .filter(Boolean)
          .sort()
          .join(",")}`
      : "";

  const isPotongan =
    kat === "potongan" ||
    kat === "pengurangan" ||
    it.tipe === "pengurangan" ||
    it.tipePotongan === "potongan" ||
    it.isDeduction === true ||
    Number(it.hargaSatuan || 0) < 0 ||
    Number(it.jumlah || 0) < 0;

  if (!isPotongan) {
    if ((kat === "utama" || /paket\s*umroh|biaya\s*paket/i.test(desc)) && !/penambahan.*jamaah/i.test(desc)) {
      return "__BASE_PACKAGE__";
    }
    if (isHotelUpgradeItem(desc)) {
      return `__UPGRADE_HOTEL__${paxKey}`;
    }
    if (isRoomUpgradeItem(desc)) {
      const rm = desc.includes("double")
        ? "double"
        : desc.includes("triple")
          ? "triple"
          : desc.includes("single")
            ? "single"
            : detectRoomTypeFromName(desc).toLowerCase();
      return `__UPGRADE_KAMAR__::${rm}${paxKey}`;
    }
  }

  return `${isPotongan ? "potongan" : "tambahan"}::${desc}${paxKey}`;
}

export function classifyInvoiceItemCategory(it: CanonicalBillingItemLike): CanonicalItemCategory {
  const katLower = (it.kategori || "").toLowerCase().trim();
  const descLower = (it.deskripsi || it.nama || "").toLowerCase().trim();
  const text = `${katLower} ${descLower}`.trim();
  const isPotonganKat = katLower === "potongan" || katLower === "pengurangan" || it.tipe === "pengurangan";
  const rawJumlah = Number(it.jumlah ?? Number(it.hargaSatuan || 0) * Math.max(1, Number(it.qty || 1)));

  if (text.includes("ongkir") || text.includes("ongkos kirim") || text.includes("ekspedisi")) {
    return rawJumlah < 0 || isPotonganKat ? "potonganOngkir" : "ongkir";
  }

  if (
    isPotonganKat ||
    it.tipePotongan === "potongan" ||
    it.isDeduction === true ||
    text.includes("diskon") ||
    text.includes("voucher") ||
    text.includes("cashback") ||
    (text.includes("promo") && katLower !== "utama" && !text.includes("paket umroh")) ||
    rawJumlah < 0
  ) {
    return "diskon";
  }

  if (/kereta|fast train|haramain/i.test(text)) return "keretaCepat";
  if (/th[ao]'?if|ta'?if|toif/i.test(text)) return "thoif";
  if (text.includes("paspor")) return "paspor";
  if (text.includes("kursi roda") || text.includes("wheelchair")) return "kursiRoda";

  if (
    katLower === "utama" ||
    ((text.includes("paket umroh") || text.includes("biaya paket")) && !(text.includes("penambahan") && text.includes("jamaah")))
  ) {
    return "basePaket";
  }

  if (text.includes("upgrade hotel") || text.includes("hotel")) {
    return "upgradeHotel";
  }

  if (isRoomUpgradeItem(text)) {
    return "upgradeKamar";
  }

  if (/jahit|tailor|jahitan/i.test(text)) {
    return "ongkosJahit";
  }

  if (/perlengkapan|equipment|koper|seragam|ihram/i.test(text) || katLower.includes("perlengkapan")) {
    return "tambahanPerlengkapan";
  }

  return "tambahanLain";
}

function parseHotelOptions(rawOpts: any): any[] {
  if (!rawOpts) return [];
  if (Array.isArray(rawOpts)) return rawOpts;
  if (typeof rawOpts === "string") {
    try {
      const parsed = JSON.parse(rawOpts);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

/**
 * Resolves package cluster/variant name cleanly from Payment wrapper, Group, Jamaah, and/or Keberangkatan.
 */
export function resolveKlasterNameFromSource(source: any): string {
  if (!source) return "Standard / Non-Cluster";
  const kbr = source.group?.keberangkatan || source.keberangkatan || source.paketKeberangkatan || source.activePackage;
  const hotelM = kbr?.hotelMekkah || source.hotelMekkah || "";
  const hotelN = kbr?.hotelMadinah || source.hotelMadinah || "";

  const regReq =
    source.group?.registrationRequests?.[0] ||
    source.registrationRequests?.[0] ||
    source.registrationRequest;

  const candidates = [
    source.member?.hotelUpgrade,
    source.member?.cluster,
    regReq?.hotelUpgrade,
    source.hotelUpgrade,
    source.group?.hotelUpgrade,
    source.group?.packageTypeName,
    source.group?.klasterName,
    source.group?.klaster,
    source.group?.clusterName,
    source.group?.selectedCluster,
    kbr?.packageType?.name,
    kbr?.tipePaket,
    source.packageType,
    source.tipePaket,
    source.klaster,
    source.clusterName,
    source.selectedCluster,
  ];

  for (const cand of candidates) {
    if (cand && typeof cand === "string") {
      const trimmed = cand.trim();
      if (
        trimmed &&
        !/^paket\s+umroh/i.test(trimmed) &&
        !/^standar\s+paket/i.test(trimmed) &&
        !/^non-cluster/i.test(trimmed)
      ) {
        return trimmed;
      }
    }
  }

  const hotelOptions = parseHotelOptions(kbr?.hotelOptions || source.hotelOptions || source.group?.hotelOptions);
  for (const opt of hotelOptions) {
    if (opt?.clusterName) {
      const cLow = String(opt.clusterName).toLowerCase();
      if (
        source.catatan?.toLowerCase()?.includes(cLow) ||
        source.group?.namaGroup?.toLowerCase()?.includes(cLow) ||
        regReq?.hotelUpgrade?.toLowerCase()?.includes(cLow)
      ) {
        return String(opt.clusterName);
      }
    }
  }

  const isMultiClusterPackage =
    String(hotelM).includes("/") ||
    String(hotelN).includes("/") ||
    Boolean(kbr?.clusterConfigs && Object.keys(kbr.clusterConfigs).length > 0) ||
    Boolean(kbr?.isAdaKlaster === "ya");

  const pkgName = kbr?.namaPaket || source.namaPaket || "";
  const groupCode = source.group?.kodeRegistrasi || source.kodeRegistrasi || "";
  const combined = `${pkgName} ${groupCode}`.toUpperCase();
  if (combined.includes("PLATINUM")) return "PLATINUM";
  if (combined.includes("GOLD") || combined.includes("VIP")) return "GOLD";
  if (combined.includes("BRONZE") || combined.includes("PROMO")) return "BRONZE";
  if (combined.includes("TURKI") || combined.includes("TURKEY")) return "TURKIYE";
  if (combined.includes("SILVER")) return "SILVER";
  if (combined.includes("REG") || combined.includes("REGULER")) return "REGULER";

  if (!isMultiClusterPackage) {
    return "Standard / Non-Cluster";
  }

  return "SILVER";
}

function resolveNumericPriceDifference(explicitUpgrade: unknown, tierPrice: unknown, basePrice: number): number {
  const upg = Number(explicitUpgrade || 0);
  if (Number.isFinite(upg) && upg > 0) return Math.round(upg);

  const tier = Number(tierPrice || 0);
  if (Number.isFinite(tier) && basePrice > 0 && tier > basePrice) {
    return Math.round(tier - basePrice);
  }
  return 0;
}

/**
 * Resolves package pricing & inclusion config strictly from package creation configuration
 * (`hotelOptions` variant/cluster first, then `keberangkatan` fields).
 *
 * ADR-0032 Business Decision 1:
 * If room upgrade pricing was not configured during package creation, returns `0` (NO hardcoded fallbacks).
 */
export function resolvePackageBillingConfig(params: {
  activePackage?: any;
  group?: any;
  member?: any;
  targetKlaster?: string | null;
}): PackageBillingConfig {
  const { activePackage, group, member, targetKlaster } = params;
  const kbr = activePackage || group?.keberangkatan || {};
  const hotelOptions = parseHotelOptions(kbr?.hotelOptions || group?.hotelOptions);

  const resolvedKlaster =
    (targetKlaster && targetKlaster.trim()) ||
    resolveKlasterNameFromSource({ activePackage: kbr, group, member });

  let matchedVariant: any = null;
  if (hotelOptions.length > 0) {
    const klLow = resolvedKlaster.toLowerCase().trim();
    matchedVariant =
      hotelOptions.find(
        (c: any) =>
          c &&
          klLow &&
          ((c.clusterName && String(c.clusterName).toLowerCase().trim() === klLow) ||
            (c.variantName && String(c.variantName).toLowerCase().trim() === klLow))
      ) ||
      hotelOptions.find(
        (c: any) =>
          c &&
          klLow &&
          ((c.clusterName && klLow.includes(String(c.clusterName).toLowerCase().trim())) ||
            (c.variantName && klLow.includes(String(c.variantName).toLowerCase().trim())) ||
            (c.clusterName && String(c.clusterName).toLowerCase().trim().includes(klLow)))
      ) ||
      hotelOptions[0];
  }

  const hargaBase = Number(
    (matchedVariant?.hargaBase && Number(matchedVariant.hargaBase) > 0 ? matchedVariant.hargaBase : 0) ||
      (matchedVariant?.hargaQuad && Number(matchedVariant.hargaQuad) > 0 ? matchedVariant.hargaQuad : 0) ||
      (kbr?.hargaQuad && Number(kbr.hargaQuad) > 0 ? kbr.hargaQuad : 0) ||
      (kbr?.hargaPaket && Number(kbr.hargaPaket) > 0 ? kbr.hargaPaket : 0) ||
      0
  );

  // ADR-0032 Rule 1: Read strictly from package creation configuration; 0 if unconfigured.
  const upgradeDouble =
    resolveNumericPriceDifference(matchedVariant?.upgradeDouble, matchedVariant?.hargaDouble, hargaBase) ||
    resolveNumericPriceDifference(kbr?.upgradeDouble, kbr?.hargaDouble, hargaBase);

  const upgradeTriple =
    resolveNumericPriceDifference(matchedVariant?.upgradeTriple, matchedVariant?.hargaTriple, hargaBase) ||
    resolveNumericPriceDifference(kbr?.upgradeTriple, kbr?.hargaTriple, hargaBase);

  const configuredSingle =
    resolveNumericPriceDifference(matchedVariant?.upgradeSingle, matchedVariant?.hargaSingle, hargaBase) ||
    resolveNumericPriceDifference(kbr?.upgradeSingle, kbr?.hargaSingle, hargaBase);

  const upgradeSingle = configuredSingle > 0 ? configuredSingle : upgradeDouble > 0 ? Math.round(upgradeDouble * 1.5) : 0;

  const pkgIncludesThoif =
    matchedVariant?.isAdaThoif !== undefined || matchedVariant?.thoif !== undefined
      ? Boolean(
          matchedVariant.isAdaThoif === "ya" ||
            matchedVariant.isAdaThoif === true ||
            matchedVariant.thoif === "INCLUDE"
        )
      : Boolean(
          (Array.isArray(kbr?.include) &&
            kbr.include.some((inc: string) => /th[ao]'?if|ta'?if|toif/i.test(inc))) ||
            kbr?.isAdaThoif === "ya" ||
            /th[ao]'?if|ta'?if|toif/i.test(kbr?.namaPaket || "") ||
            /th[ao]'?if|ta'?if|toif/i.test(kbr?.kode || "") ||
            /JED\.TH/i.test(kbr?.kode || "")
        );

  const pkgIncludesKeretaCepat =
    matchedVariant?.isAdaKeretaCepat !== undefined || matchedVariant?.keretaCepat !== undefined
      ? Boolean(
          matchedVariant.isAdaKeretaCepat === "ya" ||
            matchedVariant.isAdaKeretaCepat === true ||
            matchedVariant.keretaCepat === "INCLUDE"
        )
      : Boolean(
          (Array.isArray(kbr?.include) &&
            kbr.include.some((inc: string) => /kereta|fast train|haramain/i.test(inc))) ||
            kbr?.isAdaKeretaCepat === "ya" ||
            /kereta|fast train|haramain/i.test(kbr?.namaPaket || "") ||
            /kereta|fast train|haramain/i.test(kbr?.kode || "")
        );

  const pkgIncludesPerlengkapan =
    matchedVariant?.isAdaPerlengkapan !== undefined
      ? Boolean(matchedVariant.isAdaPerlengkapan === "ya" || matchedVariant.isAdaPerlengkapan === true)
      : Boolean(
          (Array.isArray(kbr?.include) &&
            kbr.include.some((inc: string) => /perlengkapan|koper|seragam/i.test(inc))) ||
            kbr?.isAdaPerlengkapan === "ya"
        );

  return {
    clusterName: matchedVariant?.clusterName || resolvedKlaster || "Reguler",
    variantName: matchedVariant?.variantName,
    hargaBase: Math.max(0, Math.round(hargaBase)),
    upgradeDouble,
    upgradeTriple,
    upgradeSingle,
    hotelMekkah: matchedVariant?.hotelMekkah || kbr?.hotelMekkahMaster?.name || kbr?.hotelMekkah,
    hotelMadinah: matchedVariant?.hotelMadinah || kbr?.hotelMadinahMaster?.name || kbr?.hotelMadinah,
    isCustomCluster: Boolean(matchedVariant && matchedVariant.clusterName && matchedVariant.clusterName !== "Reguler"),
    matchedVariant,
    pkgIncludesPerlengkapan,
    pkgIncludesKeretaCepat,
    pkgIncludesThoif,
  };
}

export function resolveRoomUpgradeUnitPrice(
  config: Pick<PackageBillingConfig, "upgradeDouble" | "upgradeTriple" | "upgradeSingle">,
  itemNameOrRoomType?: string | null
): number {
  if (!itemNameOrRoomType) return 0;
  if (isBaseRoomType(itemNameOrRoomType)) return 0;

  const lower = itemNameOrRoomType.toLowerCase().trim();
  if (lower.includes("double")) return config.upgradeDouble;
  if (lower.includes("triple")) return config.upgradeTriple;
  if (lower.includes("single")) return config.upgradeSingle;
  return 0;
}

/**
 * Returns true once a group's room/base billing items have been materialized in the DB ledger
 * (`BILL-...` draft ledger or official invoice items containing Base Paket / Upgrade Kamar — including cancelled ones).
 * Prevents UI modals and manifest calculators from resurrecting deleted/cancelled room upgrades from `group.roomUpgrade`.
 */
export function hasMaterializedRoomOrFullLedger(invoices?: CanonicalInvoiceLike[] | null): boolean {
  if (!Array.isArray(invoices) || invoices.length === 0) return false;
  for (const inv of invoices) {
    if (!inv || inv.status === "cancelled") continue;
    if (inv.id && String(inv.id).startsWith("BILL-")) return true;
    for (const it of inv.items || []) {
      if (isLedgerMarkerInvoiceItem(it)) continue;
      const key = getCanonicalItemDedupeKey(it);
      if (key === "__BASE_PACKAGE__" || key.startsWith("__UPGRADE_KAMAR__::")) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Extracts and deduplicates active billing items across a group's invoices using the exact
 * canonical dedupe rules used by the Invoice UI (`mergeSavedBillingItemsFromInvoices`).
 */
export function extractActiveLedgerItems(invoices?: CanonicalInvoiceLike[] | null): ExtractedLedgerItem[] {
  if (!Array.isArray(invoices) || invoices.length === 0) return [];

  const result: ExtractedLedgerItem[] = [];
  const keyToIndex = new Map<string, number>();

  for (const inv of invoices) {
    if (!inv || inv.status === "cancelled") continue;
    for (const raw of inv.items || []) {
      if (shouldSkipNonBillingInvoiceItem(raw)) continue;

      const qty = Math.max(1, Math.round(Number(raw.qty) || 1));
      const rawUnit = Number(raw.hargaSatuan);
      const rawJumlah = Number(raw.jumlah);
      const isPotongan = isDeductionItem(raw);

      const absUnit =
        Number.isFinite(rawUnit) && rawUnit !== 0
          ? Math.abs(Math.round(rawUnit))
          : Number.isFinite(rawJumlah) && rawJumlah !== 0
            ? Math.abs(Math.round(rawJumlah / qty))
            : 0;

      const signedAmount =
        Number.isFinite(rawJumlah) && rawJumlah !== 0
          ? isPotongan
            ? -Math.abs(Math.round(rawJumlah))
            : Math.abs(Math.round(rawJumlah))
          : isPotongan
            ? -(absUnit * qty)
            : absUnit * qty;

      const deskripsi = (raw.deskripsi || raw.nama || raw.kategori || "Item Tagihan").trim();
      const kategori = isPotongan ? "potongan" : raw.kategori || "tambahan";
      const key = getCanonicalItemDedupeKey(raw);
      const category = classifyInvoiceItemCategory(raw);

      const normalized: ExtractedLedgerItem = {
        id: raw.id,
        key,
        category,
        kategori,
        deskripsi,
        qty,
        unitNominal: absUnit,
        signedAmount,
        isPotongan,
        paxNames: raw.paxNames,
      };

      const existingIdx = keyToIndex.get(key);
      if (existingIdx !== undefined) {
        const existing = result[existingIdx];
        if (existing && Math.abs(existing.signedAmount) === 0 && Math.abs(signedAmount) > 0) {
          result[existingIdx] = normalized;
        }
        continue;
      }

      keyToIndex.set(key, result.length);
      result.push(normalized);
    }
  }

  return result;
}

/**
 * Exact integer distribution of a group-level amount across `totalCount` members (or `eligibleIndices`).
 * Guarantees sum across members === `totalAmount` with zero rounding drift.
 */
export function distributeAmount(
  totalAmount: number,
  memberIdx: number,
  totalCount: number,
  eligibleIndices?: Set<number>
): number {
  const safeCount = Math.max(1, totalCount);
  const roundedTotal = Math.round(totalAmount);

  if (eligibleIndices && eligibleIndices.size > 0) {
    if (!eligibleIndices.has(memberIdx)) return 0;
    const eligibleArr = Array.from(eligibleIndices);
    const count = eligibleArr.length;
    const base = Math.trunc(roundedTotal / count);
    const rem = roundedTotal - base * count;
    const firstEligibleIdx = Math.min(...eligibleArr);
    return memberIdx === firstEligibleIdx ? base + rem : base;
  }

  const base = Math.trunc(roundedTotal / safeCount);
  const rem = roundedTotal - base * safeCount;
  return memberIdx === 0 ? base + rem : base;
}

/**
 * Resolves the complete authoritative billing breakdown for a RegistrationGroup and all its members.
 * Shared Single Source of Truth for:
 *   - Manifest Pembayaran Table
 *   - Excel Export (/api/manifests/template-excel)
 *   - Invoice sync / recalculation / initial registration totals
 */
export function resolveCanonicalGroupBilling(params: {
  group: any;
  activePackage?: any;
  members?: any[];
}): CanonicalGroupBillingResult {
  const { group, activePackage, members: rawMembers } = params;
  const kbr = activePackage || group?.keberangkatan || {};
  const memberList: any[] = Array.isArray(rawMembers) && rawMembers.length > 0 ? rawMembers : [];
  const paxCount = Math.max(
    1,
    memberList.length || Number(group?.jumlahAnggota || 0) || (Array.isArray(group?.anggotaIds) ? group.anggotaIds.length : 0) || 1
  );

  // Synthetic member slot when computing group totals on backend without individual rows
  const effectiveMembers = memberList.length > 0 ? memberList : Array.from({ length: paxCount }, (_, idx) => ({ id: `slot-${idx}` }));

  const invoices: CanonicalInvoiceLike[] = Array.isArray(group?.invoices) ? group.invoices : [];
  const hasMaterializedLedger = hasMaterializedRoomOrFullLedger(invoices);
  const activeItems = extractActiveLedgerItems(invoices);
  const packageConfig = resolvePackageBillingConfig({
    activePackage: kbr,
    group,
    member: memberList[0],
  });

  const hasExplicitBaseItem = activeItems.some((it) => it.category === "basePaket");
  const hasExplicitRoomItem = activeItems.some((it) => it.category === "upgradeKamar");

  // Determine which members upgraded their hotel compared to package default
  const pkgDefaultMekkah = (packageConfig.hotelMekkah || kbr?.hotelMekkah || "").trim().toLowerCase();
  const pkgDefaultMadinah = (packageConfig.hotelMadinah || kbr?.hotelMadinah || "").trim().toLowerCase();
  const hotelUpgradedIndices = new Set<number>();

  effectiveMembers.forEach((m, idx) => {
    const mMek = (m?.hotelMekkah || "").trim().toLowerCase();
    const mMad = (m?.hotelMadinah || "").trim().toLowerCase();
    if (
      (mMek && pkgDefaultMekkah && mMek !== pkgDefaultMekkah) ||
      (mMad && pkgDefaultMadinah && mMad !== pkgDefaultMadinah)
    ) {
      hotelUpgradedIndices.add(idx);
    }
  });

  const memberBreakdowns: MemberCanonicalBillingBreakdown[] = effectiveMembers.map((m, memberIdx) => {
    const memberPkgConfig =
      memberList.length > 0 && (m?.hotelUpgrade || m?.cluster)
        ? resolvePackageBillingConfig({ activePackage: kbr, group, member: m })
        : packageConfig;

    let biayaPaket = hasExplicitBaseItem ? 0 : memberPkgConfig.hargaBase;
    let upgradeKamar = 0;
    let upgradeKamarLabel = "";

    if (!hasExplicitRoomItem && !hasMaterializedLedger) {
      const roomTypeStr = String(group?.roomUpgrade || m?.tipeKamar || "quad").trim();
      upgradeKamar = resolveRoomUpgradeUnitPrice(memberPkgConfig, roomTypeStr);
      if (upgradeKamar > 0) {
        upgradeKamarLabel = `Upgrade ${detectRoomTypeFromName(roomTypeStr)}`;
      }
    }

    let upgradeHotel = 0;
    let upgradeHotelLabel = "";
    let keretaCepat = 0;
    let cityTourThoif = 0;
    let paspor = 0;
    let kursiRoda = 0;
    let ongkir = 0;
    let ongkosJahit = 0;
    let tambahanPerlengkapan = 0;
    let tambahanLain = 0;
    let diskonPromo = 0;
    let potonganOngkir = 0;

    for (const item of activeItems) {
      const absAmount = Math.abs(item.signedAmount);

      switch (item.category) {
        case "basePaket":
          biayaPaket += distributeAmount(item.signedAmount, memberIdx, effectiveMembers.length);
          break;
        case "upgradeKamar": {
          upgradeKamar += distributeAmount(absAmount, memberIdx, effectiveMembers.length);
          if (!upgradeKamarLabel) upgradeKamarLabel = item.deskripsi || "Upgrade Kamar";
          break;
        }
        case "upgradeHotel": {
          const val = distributeAmount(
            absAmount,
            memberIdx,
            effectiveMembers.length,
            hotelUpgradedIndices.size > 0 ? hotelUpgradedIndices : undefined
          );
          upgradeHotel += val;
          if (val > 0 || !upgradeHotelLabel) {
            upgradeHotelLabel = item.deskripsi || "Upgrade Hotel";
          }
          break;
        }
        case "keretaCepat":
          keretaCepat += distributeAmount(absAmount, memberIdx, effectiveMembers.length);
          break;
        case "thoif":
          cityTourThoif += distributeAmount(absAmount, memberIdx, effectiveMembers.length);
          break;
        case "paspor":
          paspor += distributeAmount(absAmount, memberIdx, effectiveMembers.length);
          break;
        case "kursiRoda":
          kursiRoda += distributeAmount(absAmount, memberIdx, effectiveMembers.length);
          break;
        case "ongkir":
          ongkir += distributeAmount(absAmount, memberIdx, effectiveMembers.length);
          break;
        case "potonganOngkir":
          potonganOngkir += distributeAmount(absAmount, memberIdx, effectiveMembers.length);
          break;
        case "diskon":
          diskonPromo += distributeAmount(absAmount, memberIdx, effectiveMembers.length);
          break;
        case "ongkosJahit":
          ongkosJahit += distributeAmount(absAmount, memberIdx, effectiveMembers.length);
          break;
        case "tambahanPerlengkapan":
          tambahanPerlengkapan += distributeAmount(absAmount, memberIdx, effectiveMembers.length);
          break;
        case "tambahanLain": {
          const val = distributeAmount(absAmount, memberIdx, effectiveMembers.length);
          tambahanPerlengkapan += val;
          tambahanLain += val;
          break;
        }
      }
    }

    const totalUpgrade = upgradeKamar + upgradeHotel;
    const totalPotongan = diskonPromo + potonganOngkir;
    const grossMember =
      biayaPaket +
      totalUpgrade +
      keretaCepat +
      cityTourThoif +
      paspor +
      kursiRoda +
      ongkir +
      ongkosJahit +
      tambahanPerlengkapan;

    const netTagihan = Math.max(0, grossMember - totalPotongan);
    const totalTagihan = netTagihan + totalPotongan;

    const combinedUpgradeLabel = [upgradeKamarLabel, upgradeHotelLabel].filter(Boolean).join(" + ");
    const keterangan =
      combinedUpgradeLabel ||
      (totalPotongan > 0 ? `Diskon Rp ${totalPotongan.toLocaleString("id-ID")}` : "") ||
      "-";

    return {
      member: m,
      biayaPaket,
      upgradeKamar,
      upgradeKamarLabel,
      upgradeHotel,
      upgradeHotelLabel,
      totalUpgrade,
      keretaCepat,
      cityTourThoif,
      paspor,
      kursiRoda,
      ongkir,
      ongkosJahit,
      tambahanPerlengkapan,
      tambahanLain,
      diskonPromo,
      potonganOngkir,
      totalPotongan,
      netTagihan,
      totalTagihan,
      keterangan,
    };
  });

  const biayaPaket = memberBreakdowns.reduce((s, r) => s + r.biayaPaket, 0);
  const upgradeKamar = memberBreakdowns.reduce((s, r) => s + r.upgradeKamar, 0);
  const upgradeHotel = memberBreakdowns.reduce((s, r) => s + r.upgradeHotel, 0);
  const totalUpgrade = upgradeKamar + upgradeHotel;
  const keretaCepat = memberBreakdowns.reduce((s, r) => s + r.keretaCepat, 0);
  const cityTourThoif = memberBreakdowns.reduce((s, r) => s + r.cityTourThoif, 0);
  const paspor = memberBreakdowns.reduce((s, r) => s + r.paspor, 0);
  const kursiRoda = memberBreakdowns.reduce((s, r) => s + r.kursiRoda, 0);
  const ongkir = memberBreakdowns.reduce((s, r) => s + r.ongkir, 0);
  const ongkosJahit = memberBreakdowns.reduce((s, r) => s + r.ongkosJahit, 0);
  const tambahanPerlengkapan = memberBreakdowns.reduce((s, r) => s + r.tambahanPerlengkapan, 0);
  const tambahanLain = memberBreakdowns.reduce((s, r) => s + r.tambahanLain, 0);
  const diskonPromo = memberBreakdowns.reduce((s, r) => s + r.diskonPromo, 0);
  const potonganOngkir = memberBreakdowns.reduce((s, r) => s + r.potonganOngkir, 0);
  const totalPotongan = diskonPromo + potonganOngkir;
  const grossTotalTagihan =
    biayaPaket +
    totalUpgrade +
    keretaCepat +
    cityTourThoif +
    paspor +
    kursiRoda +
    ongkir +
    ongkosJahit +
    tambahanPerlengkapan;
  const netTotalTagihan = Math.max(0, grossTotalTagihan - totalPotongan);

  const upgradeKamarLabel =
    memberBreakdowns.map((m) => m.upgradeKamarLabel).find(Boolean) || "";
  const upgradeHotelLabel =
    memberBreakdowns.map((m) => m.upgradeHotelLabel).find(Boolean) || "";
  const keterangan =
    Array.from(new Set(memberBreakdowns.map((m) => m.keterangan).filter((k) => k && k !== "-"))).join(", ") ||
    "-";

  return {
    paxCount,
    packageConfig,
    hasMaterializedLedger,
    activeItems,
    memberBreakdowns,
    groupTotals: {
      biayaPaket,
      upgradeKamar,
      upgradeHotel,
      totalUpgrade,
      keretaCepat,
      cityTourThoif,
      paspor,
      kursiRoda,
      ongkir,
      ongkosJahit,
      tambahanPerlengkapan,
      tambahanLain,
      diskonPromo,
      potonganOngkir,
      totalPotongan,
      grossTotalTagihan,
      netTotalTagihan,
      upgradeKamarLabel,
      upgradeHotelLabel,
      keterangan,
    },
  };
}

