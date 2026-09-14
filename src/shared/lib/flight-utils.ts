import type { FlightSegment } from "@/shared/types";

export type FlightType = "Direct" | "Transit";

const SAUDI_AIRPORTS = new Set(["JED", "MED"]);
const DIRECT_ORIGIN_AIRPORTS = new Set(["SUB", "CGK"]);

/**
 * Aturan Bisnis Deteksi Penerbangan (VTU Abadi):
 * - Jika starting Surabaya (SUB) langsung tujuannya Jeddah/Madinah (JED/MED) -> Direct.
 * - Jika starting Jakarta (CGK) langsung tujuannya Jeddah/Madinah (JED/MED) -> Direct.
 * - Selain itu -> Transit.
 *
 * Deskripsi ringkas: "Direct" atau "Transit".
 */
export function detectFlightType(segments: FlightSegment[]): FlightType | null {
  if (!segments || segments.length === 0) {
    return null;
  }

  // Filter out baris yang belum diisi bandara asal & tujuannya
  const valid = segments.filter(
    (s) => Boolean(s.asal && s.asal.trim()) && Boolean(s.tujuan && s.tujuan.trim())
  );

  if (valid.length === 0) {
    return null;
  }

  // 1. Periksa segmen pertama keberangkatan (Outbound)
  const firstSegment = valid[0];
  if (!firstSegment) return null;

  const origin = (firstSegment.asal || "").trim().toUpperCase();
  const firstDest = (firstSegment.tujuan || "").trim().toUpperCase();

  const isOutboundDirect =
    DIRECT_ORIGIN_AIRPORTS.has(origin) && SAUDI_AIRPORTS.has(firstDest);

  if (!isOutboundDirect) {
    return "Transit";
  }

  // 2. Periksa segmen kepulangan (Inbound), jika ada segmen yang mendarat kembali di Indonesia
  if (valid.length > 1) {
    const lastSegment = valid[valid.length - 1];
    if (lastSegment) {
      const finalDest = (lastSegment.tujuan || "").trim().toUpperCase();
      const finalOrigin = (lastSegment.asal || "").trim().toUpperCase();

      // Jika segmen terakhir mendarat di Surabaya atau Jakarta
      if (DIRECT_ORIGIN_AIRPORTS.has(finalDest)) {
        // Direct hanya jika segmen terakhir tersebut lepas landas langsung dari Jeddah atau Madinah
        if (!SAUDI_AIRPORTS.has(finalOrigin)) {
          return "Transit";
        }
      }
    }
  }

  return "Direct";
}
