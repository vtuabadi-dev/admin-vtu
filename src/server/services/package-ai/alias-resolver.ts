// ============================================================
// ALIAS RESOLVER — Resolve operational aliases to canonical names
// Airlines, hotels, cities may be written in various shorthand
// forms in flyer captions.
// ============================================================

// ── Airline Aliases ──────────────────────────────────────────

const AIRLINE_ALIASES: Record<string, string> = {
  // Saudia
  SAUDIA: "Saudia Airlines",
  "SAUDI ARABIAN": "Saudia Airlines",
  "SAUDI ARABIAN AIRLINES": "Saudia Airlines",
  SV: "Saudia Airlines",
  // Garuda
  GARUDA: "Garuda Indonesia",
  "GARUDA INDONESIA": "Garuda Indonesia",
  GA: "Garuda Indonesia",
  // Lion Air
  LION: "Lion Air",
  "LION AIR": "Lion Air",
  JT: "Lion Air",
  // Emirates
  EMIRATES: "Emirates",
  EK: "Emirates",
  // Qatar
  QATAR: "Qatar Airways",
  "QATAR AIRWAYS": "Qatar Airways",
  QR: "Qatar Airways",
  // Turkish
  TURKISH: "Turkish Airlines",
  "TURKISH AIRLINES": "Turkish Airlines",
  TK: "Turkish Airlines",
  // Batik Air
  BATIK: "Batik Air",
  "BATIK AIR": "Batik Air",
  ID: "Batik Air",
  // Citilink
  CITILINK: "Citilink",
  QG: "Citilink",
  // AirAsia
  AIRASIA: "AirAsia",
  "AIR ASIA": "AirAsia",
  AK: "AirAsia",
  QZ: "AirAsia",
  // Super Air Jet
  SUPER: "Super Air Jet",
  "SUPER AIR JET": "Super Air Jet",
  IU: "Super Air Jet",
  // Pelita Air
  PELITA: "Pelita Air",
  "PELITA AIR": "Pelita Air",
  IP: "Pelita Air",
};

// ── City Aliases ─────────────────────────────────────────────

const CITY_ALIASES: Record<string, string> = {
  // Jakarta
  JAKARTA: "Jakarta",
  JKT: "Jakarta",
  CGK: "Jakarta",
  "JAKARTA (CGK)": "Jakarta",
  // Surabaya
  SURABAYA: "Surabaya",
  SUB: "Surabaya",
  JUANDA: "Surabaya",
  "SURABAYA (SUB)": "Surabaya",
  // Medan
  MEDAN: "Medan",
  KNO: "Medan",
  MES: "Medan",
  "MEDAN (KNO)": "Medan",
  // Makassar
  MAKASSAR: "Makassar",
  UPG: "Makassar",
  "MAKASSAR (UPG)": "Makassar",
  // Yogyakarta
  YOGYAKARTA: "Yogyakarta",
  YOGYA: "Yogyakarta",
  JOGJA: "Yogyakarta",
  JOG: "Yogyakarta",
  YIA: "Yogyakarta",
  "YOGYAKARTA (YIA)": "Yogyakarta",
  // Bali / Denpasar
  BALI: "Bali",
  DENPASAR: "Denpasar",
  DPS: "Denpasar",
  "BALI (DPS)": "Denpasar",
  // Bandung
  BANDUNG: "Bandung",
  BDO: "Bandung",
  "BANDUNG (BDO)": "Bandung",
  // Solo / Surakarta
  SOLO: "Solo",
  SURAKARTA: "Solo",
  SOC: "Solo",
  "SOLO (SOC)": "Solo",
  // Palembang
  PALEMBANG: "Palembang",
  PLM: "Palembang",
  "PALEMBANG (PLM)": "Palembang",
  // Balikpapan
  BALIKPAPAN: "Balikpapan",
  BPN: "Balikpapan",
  "BALIKPAPAN (BPN)": "Balikpapan",
  // Lombok
  LOMBOK: "Lombok",
  LOP: "Lombok",
  "LOMBOK (LOP)": "Lombok",
  // Aceh
  ACEH: "Aceh",
  BANDA_ACEH: "Banda Aceh",
  "BANDA ACEH": "Banda Aceh",
  BTJ: "Banda Aceh",
  "BANDA ACEH (BTJ)": "Banda Aceh",
  // Pekanbaru
  PEKANBARU: "Pekanbaru",
  PKU: "Pekanbaru",
  "PEKANBARU (PKU)": "Pekanbaru",
  // Pontianak
  PONTIANAK: "Pontianak",
  PNK: "Pontianak",
  "PONTIANAK (PNK)": "Pontianak",
  // Banjarmasin
  BANJARMASIN: "Banjarmasin",
  BDJ: "Banjarmasin",
  "BANJARMASIN (BDJ)": "Banjarmasin",
  // Manado
  MANADO: "Manado",
  MDC: "Manado",
  "MANADO (MDC)": "Manado",
};

// ── Hotel Name Normalization ─────────────────────────────────

const HOTEL_CLEANUP_PATTERNS = [
  // Remove parenthetical star ratings like "(BINTANG 5)", "(*****)", "(5*)"
  { pattern: /\s*\([^)]*(?:BINTANG|BINTG|BIN|\*)\s*\d*\s*\)\s*/gi, replacement: "" },
  // Remove "HOTEL" prefix for normalization (added back if needed)
  { pattern: /^HOTEL\s+/i, replacement: "" },
  // Collapse multiple spaces
  { pattern: /\s{2,}/g, replacement: " " },
];

// ── Public API ───────────────────────────────────────────────

/**
 * Resolve an airline name from any common alias to canonical form.
 * Returns the input text unchanged if no alias is found.
 */
export function resolveAirline(text: string): string {
  const cleaned = text.trim().toUpperCase();
  if (AIRLINE_ALIASES[cleaned]) return AIRLINE_ALIASES[cleaned];
  
  if (cleaned.length > 20) {
    for (const [alias, canonical] of Object.entries(AIRLINE_ALIASES)) {
      if (cleaned.includes(alias)) return canonical;
    }
  }
  return text.trim();
}

/**
 * Resolve a city name from any common alias (airport code, shorthand)
 * to canonical Indonesian city name.
 * Returns the input text unchanged if no alias is found.
 */
export function resolveCity(text: string): string {
  const cleaned = text.trim().toUpperCase();
  if (CITY_ALIASES[cleaned]) return CITY_ALIASES[cleaned];
  
  if (cleaned.length > 20) {
    for (const [alias, canonical] of Object.entries(CITY_ALIASES)) {
      if (cleaned.includes(alias)) return canonical;
    }
  }
  return text.trim();
}

/**
 * Normalize a hotel name by stripping parenthetical star ratings
 * and standardizing formatting.
 */
export function resolveHotel(text: string): string {
  let normalized = text.trim();

  for (const { pattern, replacement } of HOTEL_CLEANUP_PATTERNS) {
    normalized = normalized.replace(pattern, replacement);
  }

  return normalized.trim();
}
